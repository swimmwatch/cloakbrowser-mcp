import { z } from 'zod';
import { fail } from '@/errors/index.js';
import { assertOriginAllowed } from '@/security/policies.js';
import { secondsToMilliseconds } from '@/tools/compat.js';
import { textResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const navigateInput = z.object({
  url: z.string().url(),
  pageId: z.string().optional(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const navigateTool: ToolDefinition<typeof navigateInput> = {
  name: 'browser_navigate',
  description: 'Navigate to a URL',
  inputSchema: navigateInput,
  handler: async (input, ctx) => {
    assertOriginAllowed(input.url, ctx.config);
    const page = input.pageId ? ctx.session.getPage(input.pageId) : await ctx.session.currentOrNewPage();
    const opts: { timeoutMs?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' } = {};
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    if (input.waitUntil !== undefined) opts.waitUntil = input.waitUntil;
    await page.goto(input.url, opts);
    return textResult(`navigated ${page.id} to ${page.url()}`, { pageId: page.id, url: page.url() });
  },
};

const backInput = z.object({
  pageId: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const navigateBackTool: ToolDefinition<typeof backInput> = {
  name: 'browser_navigate_back',
  description: 'Go back to the previous page in the history',
  inputSchema: backInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const opts: { timeoutMs?: number } = {};
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    await page.goBack(opts);
    return textResult(`navigated back to ${page.url()}`, { pageId: page.id, url: page.url() });
  },
};

const waitInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  textGone: z.string().optional(),
  time: z.number().positive().optional(),
  state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const waitForTool: ToolDefinition<typeof waitInput> = {
  name: 'browser_wait_for',
  description: 'Wait for text to appear or disappear or a specified time to pass',
  inputSchema: waitInput,
  annotations: { readOnlyHint: true },
  handler: async (input, ctx) => {
    if (!input.selector && !input.text && !input.textGone && !input.timeoutMs && !input.time) {
      fail('INVALID_INPUT', 'one of selector, text, textGone, time, or timeoutMs is required');
    }
    const page = ctx.session.getPage(input.pageId);
    const opts: {
      selector?: string;
      text?: string;
      textGone?: string;
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeoutMs?: number;
    } = {};
    if (input.selector !== undefined) opts.selector = input.selector;
    if (input.text !== undefined) opts.text = input.text;
    if (input.textGone !== undefined) opts.textGone = input.textGone;
    if (input.state !== undefined) opts.state = input.state;
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    else if (input.time !== undefined) opts.timeoutMs = secondsToMilliseconds(input.time);
    await page.waitFor(opts);
    return textResult('wait condition met', { pageId: page.id });
  },
};
