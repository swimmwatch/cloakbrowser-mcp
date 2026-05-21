import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { fail } from '@/errors/index.js';
import type { DropFilePayload, NetworkPart, NetworkRequestRecord } from '@/browser/adapter.js';
import { targetSelector } from '@/tools/compat.js';
import { jsonResult, textResult } from '@/tools/responses.js';
import type { ToolContext, ToolDefinition } from '@/tools/types.js';

const artifactTextType = 'text/plain; charset=utf-8';
const networkRequestParts = ['request-headers', 'request-body', 'response-headers', 'response-body'] as const;

const evaluateInput = z.object({
  pageId: z.string().optional(),
  element: z.string().optional(),
  target: z.string().min(1).optional(),
  function: z.string().min(1),
  filename: z.string().min(1).optional(),
});

export const evaluateTool: ToolDefinition<typeof evaluateInput> = {
  name: 'browser_evaluate',
  description: 'Evaluate JavaScript expression on page or element',
  inputSchema: evaluateInput,
  handler: async (input, ctx) => {
    const page = input.pageId ? ctx.session.getPage(input.pageId) : await ctx.session.currentOrNewPage();
    const result = await page.evaluate(input.function, input.target);
    return resultOrArtifact(ctx, page.id, result, input.filename);
  },
};

const fileUploadInput = z.object({
  pageId: z.string().optional(),
  paths: z.array(z.string().min(1)).optional(),
});

export const fileUploadTool: ToolDefinition<typeof fileUploadInput> = {
  name: 'browser_file_upload',
  description: 'Upload one or multiple files',
  inputSchema: fileUploadInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.uploadFiles(input.paths);
    return textResult(input.paths ? `uploaded ${input.paths.length} file(s)` : 'file chooser cancelled', {
      pageId: page.id,
      count: input.paths?.length ?? 0,
    });
  },
};

const dropInput = z.object({
  pageId: z.string().optional(),
  element: z.string().optional(),
  selector: z.string().min(1).optional(),
  target: z.string().min(1),
  paths: z.array(z.string().min(1)).optional(),
  data: z.record(z.string()).optional(),
});

export const dropTool: ToolDefinition<typeof dropInput> = {
  name: 'browser_drop',
  description:
    'Drop files or MIME-typed data onto an element, as if dragged from outside the page. At least one of "paths" or "data" must be provided.',
  inputSchema: dropInput,
  handler: async (input, ctx) => {
    if ((input.paths?.length ?? 0) === 0 && Object.keys(input.data ?? {}).length === 0) {
      fail('INVALID_INPUT', 'one of paths or data is required');
    }
    const page = ctx.session.getPage(input.pageId);
    const files = input.paths ? await readDropFiles(input.paths) : undefined;
    const selector = targetSelector(input);
    await page.drop(selector, { data: input.data, files });
    return textResult(`dropped onto ${selector}`, {
      pageId: page.id,
      files: files?.length ?? 0,
      data: Object.keys(input.data ?? {}).length,
    });
  },
};

const networkRequestsInput = z.object({
  pageId: z.string().optional(),
  static: z.boolean().default(false),
  filter: z.string().optional(),
  filename: z.string().min(1).optional(),
});

export const networkRequestsTool: ToolDefinition<typeof networkRequestsInput> = {
  name: 'browser_network_requests',
  description:
    'Returns a numbered list of network requests since loading the page. Use browser_network_request with the number to get full details.',
  inputSchema: networkRequestsInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const pattern = compileRegexFilter(input.filter);
    const requests = (await page.networkRequests()).filter((request) => {
      if (!input.static && isStaticRequest(request)) return false;
      if (pattern && !pattern.test(request.url)) return false;
      return true;
    });
    const text = formatNetworkRequestList(requests);
    if (input.filename) {
      const ref = await writeTextArtifact(ctx, input.filename, text);
      return jsonResult({ pageId: page.id, artifact: ref, count: requests.length });
    }
    return textResult(text, { pageId: page.id, count: requests.length });
  },
};

const networkRequestInput = z.object({
  pageId: z.string().optional(),
  index: z.number().int().positive(),
  part: z.enum(networkRequestParts).optional(),
  filename: z.string().min(1).optional(),
});

export const networkRequestTool: ToolDefinition<typeof networkRequestInput> = {
  name: 'browser_network_request',
  description:
    'Returns full details (headers and body) of a single network request, or a single part if `part` is set. Use the number from browser_network_requests.',
  inputSchema: networkRequestInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const request = await page.networkRequest(input.index);
    const text = formatNetworkRequest(request, input.part);
    if (input.filename) {
      const ref = await writeTextArtifact(ctx, input.filename, text);
      return jsonResult({ pageId: page.id, artifact: ref, index: input.index });
    }
    return textResult(text, { pageId: page.id, index: input.index });
  },
};

const runCodeUnsafeInput = z.object({
  pageId: z.string().optional(),
  code: z.string().optional(),
  filename: z.string().min(1).optional(),
});

export const runCodeUnsafeTool: ToolDefinition<typeof runCodeUnsafeInput> = {
  name: 'browser_run_code_unsafe',
  description:
    'Run a Playwright code snippet. Unsafe: executes arbitrary JavaScript in the Playwright server process and is RCE-equivalent.',
  inputSchema: runCodeUnsafeInput,
  handler: async (input, ctx) => {
    let source: string;
    if (input.filename) source = await readFile(input.filename, 'utf8');
    else if (input.code) source = input.code;
    else source = fail('INVALID_INPUT', 'code or filename is required');
    const page = input.pageId ? ctx.session.getPage(input.pageId) : await ctx.session.currentOrNewPage();
    const result = await page.runCodeUnsafe(source);
    return resultOrArtifact(ctx, page.id, result);
  },
};

async function resultOrArtifact(ctx: ToolContext, pageId: string, value: unknown, filename?: string) {
  const text = stringifyResult(value);
  if (filename) {
    const ref = await writeTextArtifact(ctx, filename, text);
    return jsonResult({ pageId, artifact: ref });
  }
  return textResult(text, { pageId, result: value as Record<string, unknown> });
}

async function writeTextArtifact(ctx: ToolContext, filename: string, text: string) {
  return await ctx.artifacts.write(filename, new TextEncoder().encode(text), artifactTextType);
}

async function readDropFiles(paths: string[]): Promise<DropFilePayload[]> {
  return await Promise.all(
    paths.map(async (filePath) => {
      const bytes = await readFile(filePath);
      return {
        name: path.basename(filePath),
        mimeType: guessMimeType(filePath),
        base64: bytes.toString('base64'),
      };
    }),
  );
}

function compileRegexFilter(filter: string | undefined): RegExp | undefined {
  if (!filter) return undefined;
  try {
    return new RegExp(filter);
  } catch (e) {
    fail('INVALID_INPUT', `invalid network request filter: ${(e as Error).message}`);
  }
}

function guessMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt' || ext === '.md') return 'text/plain';
  if (ext === '.json') return 'application/json';
  if (ext === '.html' || ext === '.htm') return 'text/html';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function stringifyResult(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function isStaticRequest(request: NetworkRequestRecord): boolean {
  if (request.status && request.status >= 400) return false;
  return ['font', 'image', 'media', 'manifest', 'script', 'stylesheet'].includes(request.resourceType ?? '');
}

function formatNetworkRequestList(requests: NetworkRequestRecord[]): string {
  if (requests.length === 0) return 'No network requests';
  return requests
    .map((request) => {
      const status = request.status ?? request.failureText ?? 'pending';
      return `[${request.index}] ${request.method} ${status} ${request.url}`;
    })
    .join('\n');
}

function formatNetworkRequest(request: NetworkRequestRecord, part?: NetworkPart): string {
  if (part === 'request-headers') return JSON.stringify(request.requestHeaders ?? {}, null, 2);
  if (part === 'request-body') return request.requestBody ?? '';
  if (part === 'response-headers') return JSON.stringify(request.responseHeaders ?? {}, null, 2);
  if (part === 'response-body') return request.responseBody ?? '';
  return JSON.stringify(request, null, 2);
}
