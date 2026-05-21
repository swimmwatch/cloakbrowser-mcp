import { z } from 'zod';
import { jsonResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const snapshotInput = z.object({
  pageId: z.string().optional(),
  target: z.string().optional(),
  filename: z.string().optional(),
  depth: z.number().int().positive().optional(),
  boxes: z.boolean().optional(),
  maxNodes: z.number().int().positive().max(5_000).optional(),
});

interface FlatNode {
  selector?: string;
  role: string;
  name?: string;
  value?: string;
  depth: number;
}

import type { AccessibilityNode } from '@/browser/adapter.js';

function flatten(node: AccessibilityNode, depth: number, out: FlatNode[], limit: number): void {
  if (out.length >= limit) return;
  const entry: FlatNode = { role: node.role, depth };
  if (node.name) entry.name = node.name;
  if (node.value) entry.value = node.value;
  if (node.selector) entry.selector = node.selector;
  out.push(entry);
  if (node.children) {
    for (const c of node.children) {
      if (out.length >= limit) break;
      flatten(c, depth + 1, out, limit);
    }
  }
}

export const snapshotTool: ToolDefinition<typeof snapshotInput> = {
  name: 'browser_snapshot',
  description: 'Capture accessibility snapshot of the current page, this is better than screenshot',
  inputSchema: snapshotInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    if (input.target) await page.waitFor({ selector: input.target, timeoutMs: ctx.config.defaultTimeoutMs });
    const limit = input.maxNodes ?? 500;
    const root = await page.accessibilitySnapshot();
    const flat: FlatNode[] = [];
    flatten(root, 0, flat, limit);
    const value = {
      pageId: page.id,
      url: page.url(),
      title: await page.title(),
      target: input.target ?? null,
      boxesRequested: input.boxes ?? false,
      truncated: flat.length >= limit,
      nodes: input.depth ? flat.filter((n) => n.depth <= input.depth!) : flat,
    };
    if (input.filename) {
      const ref = await ctx.artifacts.write(
        input.filename,
        new TextEncoder().encode(JSON.stringify(value, null, 2)),
        'application/json',
      );
      return jsonResult({ pageId: page.id, artifact: ref });
    }
    return jsonResult(value);
  },
};

const consoleInput = z.object({
  pageId: z.string().optional(),
  clear: z.boolean().optional(),
  level: z.enum(['error', 'warning', 'info', 'debug']).default('info'),
  all: z.boolean().optional(),
  filename: z.string().optional(),
});

export const consoleMessagesTool: ToolDefinition<typeof consoleInput> = {
  name: 'browser_console_messages',
  description: 'Returns all console messages',
  inputSchema: consoleInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const messages = filterConsoleMessages(page.consoleMessages(input.clear ?? false), input.level);
    if (input.filename) {
      const text = messages.map((m) => `[${new Date(m.ts).toISOString()}] ${m.type}: ${m.text}`).join('\n');
      const ref = await ctx.artifacts.write(input.filename, new TextEncoder().encode(text), 'text/plain');
      return jsonResult({ pageId: page.id, artifact: ref, count: messages.length });
    }
    return jsonResult({ pageId: page.id, messages });
  },
};

function filterConsoleMessages(
  messages: { type: string; text: string; ts: number }[],
  level: 'error' | 'warning' | 'info' | 'debug',
) {
  const severity: Record<string, number> = {
    error: 0,
    warning: 1,
    warn: 1,
    info: 2,
    log: 2,
    debug: 3,
    verbose: 3,
  };
  const max = severity[level];
  return messages.filter((m) => (severity[m.type] ?? 2) <= max);
}
