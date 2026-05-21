import { z } from 'zod';
import { fail } from '@/errors/index.js';
import { jsonResult, textResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const pageInput = {
  pageId: z.string().optional(),
};

const pdfInput = z.object({
  ...pageInput,
  filename: z.string().min(1).optional(),
  format: z.string().min(1).default('A4'),
  landscape: z.boolean().default(false),
  printBackground: z.boolean().default(true),
});

export const pdfSaveTool: ToolDefinition<typeof pdfInput> = {
  name: 'browser_pdf_save',
  description: 'Save the current page as a PDF artifact',
  inputSchema: pdfInput,
  capabilities: ['allowPdf'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const bytes = await page.pdf(input);
    const ref = await ctx.artifacts.write(
      input.filename ?? ctx.artifacts.uniqueName('page', 'pdf'),
      bytes,
      'application/pdf',
    );
    return jsonResult({ pageId: page.id, artifact: ref });
  },
};

const cookieInput = z.object({
  ...pageInput,
  cookies: z
    .array(
      z
        .object({
          name: z.string().min(1),
          value: z.string(),
          url: z.string().url().optional(),
          domain: z.string().min(1).optional(),
          path: z.string().min(1).optional(),
          expires: z.number().optional(),
          httpOnly: z.boolean().optional(),
          secure: z.boolean().optional(),
          sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
        })
        .refine((cookie) => cookie.url !== undefined || cookie.domain !== undefined, {
          message: 'cookie requires either url or domain',
        }),
    )
    .min(1),
});

export const setCookiesTool: ToolDefinition<typeof cookieInput> = {
  name: 'browser_set_cookies',
  description: 'Set one or more browser-context cookies',
  inputSchema: cookieInput,
  capabilities: ['allowStorageMutation'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.setCookies(input.cookies);
    return textResult(`set ${input.cookies.length} cookie(s)`, {
      pageId: page.id,
      count: input.cookies.length,
    });
  },
};

const clearStorageInput = z.object({
  ...pageInput,
  cookies: z.boolean().default(true),
  localStorage: z.boolean().default(true),
  sessionStorage: z.boolean().default(true),
});

export const clearStorageTool: ToolDefinition<typeof clearStorageInput> = {
  name: 'browser_clear_storage',
  description: 'Clear cookies, localStorage, and/or sessionStorage for the current page context',
  inputSchema: clearStorageInput,
  capabilities: ['allowStorageMutation'],
  annotations: { destructiveHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.clearStorage(input);
    return textResult('storage cleared', {
      pageId: page.id,
      cookies: input.cookies,
      localStorage: input.localStorage,
      sessionStorage: input.sessionStorage,
    });
  },
};

const networkRouteInput = z
  .object({
    ...pageInput,
    action: z.enum(['block', 'continue', 'fulfill', 'clear']),
    url: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    status: z.number().int().min(100).max(599).optional(),
    contentType: z.string().min(1).optional(),
    body: z.string().optional(),
    headers: z.record(z.string()).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.action !== 'clear' && !input.url) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['url'], message: 'url is required' });
    }
  });

export const networkRouteTool: ToolDefinition<typeof networkRouteInput> = {
  name: 'browser_network_route',
  description: 'Add or clear a network route that blocks, continues, or fulfills matching requests',
  inputSchema: networkRouteInput,
  capabilities: ['allowNetworkInterception'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    if (input.action === 'clear') {
      const cleared = await page.clearNetworkRoutes(input.id);
      return textResult(`cleared ${cleared} route(s)`, { pageId: page.id, cleared });
    }
    const route = await page.routeNetwork({
      url: input.url!,
      action: input.action,
      status: input.status,
      contentType: input.contentType,
      body: input.body,
      headers: input.headers,
    });
    return jsonResult({ pageId: page.id, route });
  },
};

const verifyTextInput = z.object({
  ...pageInput,
  text: z.string().min(1),
  present: z.boolean().default(true),
  timeoutMs: z.number().int().positive().optional(),
});

export const verifyTextTool: ToolDefinition<typeof verifyTextInput> = {
  name: 'browser_verify_text',
  description: 'Verify that page text is present or absent',
  inputSchema: verifyTextInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.waitFor({
      text: input.present ? input.text : undefined,
      textGone: input.present ? undefined : input.text,
      timeoutMs: input.timeoutMs,
    });
    return textResult('text verified', { pageId: page.id, text: input.text, present: input.present });
  },
};

const verifySelectorCountInput = z.object({
  ...pageInput,
  selector: z.string().min(1),
  count: z.number().int().nonnegative().optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().nonnegative().optional(),
});

export const verifySelectorCountTool: ToolDefinition<typeof verifySelectorCountInput> = {
  name: 'browser_verify_selector_count',
  description: 'Verify the number of elements matching a selector',
  inputSchema: verifySelectorCountInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    if (input.count === undefined && input.min === undefined && input.max === undefined) {
      fail('INVALID_INPUT', 'one of count, min, or max is required');
    }
    const page = ctx.session.getPage(input.pageId);
    const actual = await page.selectorCount(input.selector);
    const ok =
      (input.count === undefined || actual === input.count) &&
      (input.min === undefined || actual >= input.min) &&
      (input.max === undefined || actual <= input.max);
    if (!ok) {
      fail('ASSERTION_FAILED', `selector count assertion failed for ${input.selector}`, {
        selector: input.selector,
        actual,
        expected: input.count,
        min: input.min,
        max: input.max,
      });
    }
    return jsonResult({ pageId: page.id, selector: input.selector, count: actual });
  },
};

const verifyUrlInput = z
  .object({
    ...pageInput,
    url: z.string().optional(),
    contains: z.string().optional(),
    regex: z.string().optional(),
  })
  .refine((input) => input.url !== undefined || input.contains !== undefined || input.regex !== undefined, {
    message: 'one of url, contains, or regex is required',
  });

export const verifyUrlTool: ToolDefinition<typeof verifyUrlInput> = {
  name: 'browser_verify_url',
  description: 'Verify the current page URL by exact match, substring, or regex',
  inputSchema: verifyUrlInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const actual = page.url();
    const pattern = input.regex ? compileRegex(input.regex) : undefined;
    const ok =
      (input.url === undefined || actual === input.url) &&
      (input.contains === undefined || actual.includes(input.contains)) &&
      (pattern === undefined || pattern.test(actual));
    if (!ok) {
      fail('ASSERTION_FAILED', 'URL assertion failed', {
        actual,
        expected: input.url,
        contains: input.contains,
        regex: input.regex,
      });
    }
    return jsonResult({ pageId: page.id, url: actual });
  },
};

const traceStartInput = z.object({
  screenshots: z.boolean().default(true),
  snapshots: z.boolean().default(true),
  sources: z.boolean().default(false),
});

export const traceStartTool: ToolDefinition<typeof traceStartInput> = {
  name: 'browser_trace_start',
  description: 'Start browser-context tracing',
  inputSchema: traceStartInput,
  capabilities: ['allowDevtoolsExperimental'],
  handler: async (input, ctx) => {
    await ctx.session.backend.startTrace(input);
    return textResult('trace started');
  },
};

const traceStopInput = z.object({
  filename: z.string().min(1).optional(),
});

export const traceStopTool: ToolDefinition<typeof traceStopInput> = {
  name: 'browser_trace_stop',
  description: 'Stop browser-context tracing and save a trace artifact',
  inputSchema: traceStopInput,
  capabilities: ['allowDevtoolsExperimental'],
  handler: async (input, ctx) => {
    const bytes = await ctx.session.backend.stopTrace();
    const ref = await ctx.artifacts.write(
      input.filename ?? ctx.artifacts.uniqueName('trace', 'zip'),
      bytes,
      'application/zip',
    );
    return jsonResult({ artifact: ref });
  },
};

const harSaveInput = z.object({
  ...pageInput,
  filename: z.string().min(1).optional(),
});

export const harSaveTool: ToolDefinition<typeof harSaveInput> = {
  name: 'browser_har_save',
  description: 'Save captured page network traffic as a HAR artifact',
  inputSchema: harSaveInput,
  capabilities: ['allowDevtoolsExperimental'],
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const ref = await ctx.artifacts.write(
      input.filename ?? ctx.artifacts.uniqueName('network', 'har'),
      await page.saveHar(),
      'application/json',
    );
    return jsonResult({ pageId: page.id, artifact: ref });
  },
};

const videoSaveInput = z.object({
  ...pageInput,
  filename: z.string().min(1).optional(),
});

export const videoSaveTool: ToolDefinition<typeof videoSaveInput> = {
  name: 'browser_video_save',
  description: 'Save the backend page video artifact when video recording is available',
  inputSchema: videoSaveInput,
  capabilities: ['allowDevtoolsExperimental'],
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const ref = await ctx.artifacts.write(
      input.filename ?? ctx.artifacts.uniqueName('video', 'webm'),
      await page.saveVideo(),
      'video/webm',
    );
    return jsonResult({ pageId: page.id, artifact: ref });
  },
};

const mouseClickInput = z.object({
  ...pageInput,
  x: z.number(),
  y: z.number(),
  button: z.enum(['left', 'right', 'middle']).default('left'),
  clickCount: z.number().int().positive().max(3).default(1),
});

export const mouseClickTool: ToolDefinition<typeof mouseClickInput> = {
  name: 'browser_mouse_click',
  description: 'Click at page coordinates',
  inputSchema: mouseClickInput,
  capabilities: ['allowCoordinateInput'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.mouseClick(input);
    return textResult('mouse clicked', { pageId: page.id, x: input.x, y: input.y });
  },
};

const mouseMoveInput = z.object({
  ...pageInput,
  x: z.number(),
  y: z.number(),
  steps: z.number().int().positive().default(1),
});

export const mouseMoveTool: ToolDefinition<typeof mouseMoveInput> = {
  name: 'browser_mouse_move',
  description: 'Move the mouse to page coordinates',
  inputSchema: mouseMoveInput,
  capabilities: ['allowCoordinateInput'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.mouseMove(input);
    return textResult('mouse moved', { pageId: page.id, x: input.x, y: input.y });
  },
};

const mouseDragInput = z.object({
  ...pageInput,
  startX: z.number(),
  startY: z.number(),
  endX: z.number(),
  endY: z.number(),
  steps: z.number().int().positive().default(10),
});

export const mouseDragTool: ToolDefinition<typeof mouseDragInput> = {
  name: 'browser_mouse_drag',
  description: 'Drag between page coordinates',
  inputSchema: mouseDragInput,
  capabilities: ['allowCoordinateInput'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.mouseDrag(input);
    return textResult('mouse dragged', {
      pageId: page.id,
      startX: input.startX,
      startY: input.startY,
      endX: input.endX,
      endY: input.endY,
    });
  },
};

const mouseWheelInput = z.object({
  ...pageInput,
  deltaX: z.number().default(0),
  deltaY: z.number().default(0),
});

export const mouseWheelTool: ToolDefinition<typeof mouseWheelInput> = {
  name: 'browser_mouse_wheel',
  description: 'Scroll using page mouse wheel coordinates',
  inputSchema: mouseWheelInput,
  capabilities: ['allowCoordinateInput'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.mouseWheel(input);
    return textResult('mouse wheel scrolled', {
      pageId: page.id,
      deltaX: input.deltaX,
      deltaY: input.deltaY,
    });
  },
};

const installBinaryInput = z.object({});

export const installBinaryTool: ToolDefinition<typeof installBinaryInput> = {
  name: 'cloakbrowser_install_binary',
  description: 'Install or repair the CloakBrowser browser binary',
  inputSchema: installBinaryInput,
  capabilities: ['allowBinaryInstall'],
  handler: async (_input, ctx) => {
    return jsonResult(await ctx.session.backend.installBinary());
  },
};

function compileRegex(source: string): RegExp {
  try {
    return new RegExp(source);
  } catch (e) {
    return fail('INVALID_INPUT', `invalid URL regex: ${(e as Error).message}`);
  }
}
