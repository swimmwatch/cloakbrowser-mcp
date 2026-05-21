import { z } from 'zod';
import { fail } from '@/errors/index.js';
import { assertOriginAllowed } from '@/security/policies.js';
import { jsonResult, textResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const empty = z.object({});

export const getConfigTool: ToolDefinition<typeof empty> = {
  name: 'browser_get_config',
  description: 'Return the effective server configuration (secrets redacted).',
  inputSchema: empty,
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async (_input, ctx) => {
    const cfg = ctx.config;
    return jsonResult({
      headless: cfg.headless,
      outputDir: ctx.artifacts.rootDir,
      defaultTimeoutMs: cfg.defaultTimeoutMs,
      navigationTimeoutMs: cfg.navigationTimeoutMs,
      maxPages: cfg.maxPages,
      maxContexts: cfg.maxContexts,
      logLevel: cfg.logLevel,
      allowedOrigins: cfg.allowedOrigins ?? null,
      blockedOrigins: cfg.blockedOrigins,
      capabilities: cfg.capabilities,
      hasUserDataDir: Boolean(cfg.userDataDir),
      hasBrowserExecutablePath: Boolean(cfg.browserExecutablePath),
    });
  },
};

export const cloakBinaryInfoTool: ToolDefinition<typeof empty> = {
  name: 'cloakbrowser_binary_info',
  description: 'Report CloakBrowser package presence, version, and binary status.',
  inputSchema: empty,
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async (_input, ctx) => {
    const info = await ctx.session.backend.binaryInfo();
    return jsonResult(info);
  },
};

const tabsInput = z.object({
  action: z.enum(['list', 'new', 'select', 'close']).default('list'),
  pageId: z.string().optional(),
  index: z.number().int().nonnegative().optional(),
  url: z.string().url().optional(),
});

export const tabsTool: ToolDefinition<typeof tabsInput> = {
  name: 'browser_tabs',
  description: 'List, create, close, or select a browser tab.',
  inputSchema: tabsInput,
  handler: async (input, ctx) => {
    switch (input.action) {
      case 'list': {
        return jsonResult({ pages: ctx.session.listPages() });
      }
      case 'new': {
        const p = await ctx.session.newPage();
        if (input.url) {
          assertOriginAllowed(input.url, ctx.config);
          await p.goto(input.url, { timeoutMs: ctx.config.navigationTimeoutMs });
        }
        return textResult(`opened page ${p.id}`, { pageId: p.id });
      }
      case 'select': {
        const pageId = input.pageId ?? ctx.session.listPages()[input.index ?? -1]?.id;
        if (!pageId) fail('INVALID_INPUT', 'pageId or index is required for action=select');
        const p = ctx.session.selectPage(pageId);
        return textResult(`selected page ${p.id}`, { pageId: p.id });
      }
      case 'close': {
        const pageId =
          input.pageId ?? ctx.session.listPages()[input.index ?? -1]?.id ?? ctx.session.getPage().id;
        await ctx.session.closePage(pageId);
        return textResult(`closed page ${pageId}`, { pageId });
      }
    }
  },
};

const closeInput = z.object({
  scope: z.enum(['page', 'browser']).default('browser'),
  pageId: z.string().optional(),
});

export const closeTool: ToolDefinition<typeof closeInput> = {
  name: 'browser_close',
  description: 'Close the page',
  inputSchema: closeInput,
  annotations: { destructiveHint: true },
  handler: async (input, ctx) => {
    if (input.scope === 'browser') {
      await ctx.session.shutdown();
      return textResult('browser closed');
    }
    const p = ctx.session.getPage(input.pageId);
    await ctx.session.closePage(p.id);
    return textResult(`page ${p.id} closed`, { pageId: p.id });
  },
};
