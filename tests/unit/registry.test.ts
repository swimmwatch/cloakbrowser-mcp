import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ArtifactManager } from '@/artifacts/manager.js';
import { MockBrowserAdapter } from '@/browser/mockAdapter.js';
import { SessionManager } from '@/browser/sessionManager.js';
import { configSchema } from '@/config/schema.js';
import { createLogger } from '@/logging/logger.js';
import { ToolRegistry } from '@/tools/registry.js';
import type { ToolContext, ToolDefinition } from '@/tools/types.js';

function buildCtx(overrides: Partial<ReturnType<typeof configSchema.parse>> = {}): {
  ctx: ToolContext;
  cleanup: () => void;
} {
  const dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-reg-'));
  const config = configSchema.parse({ outputDir: dir, logLevel: 'silent', ...overrides });
  const adapter = new MockBrowserAdapter();
  const session = new SessionManager(adapter, config);
  const artifacts = new ArtifactManager(dir);
  const logger = createLogger('silent');
  return {
    ctx: { config, session, artifacts, logger },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

describe('ToolRegistry', () => {
  let cleanup: () => void;
  afterEach(() => cleanup?.());
  beforeEach(() => {
    cleanup = () => {};
  });

  it('refuses to register forbidden tool names', () => {
    const { ctx, cleanup: c } = buildCtx();
    cleanup = c;
    const reg = new ToolRegistry(ctx);
    const def: ToolDefinition = {
      name: 'browser_eval',
      description: 'should be rejected',
      inputSchema: z.object({}),
      handler: async () => ({ content: [{ type: 'text', text: 'no' }] }),
    };
    expect(() => reg.register(def)).toThrow(/permanently disabled/);
  });

  it('skips registration when required capability is off', () => {
    const { ctx, cleanup: c } = buildCtx();
    cleanup = c;
    const reg = new ToolRegistry(ctx);
    reg.register({
      name: 'needs_pdf',
      description: '',
      inputSchema: z.object({}),
      capabilities: ['allowPdf'],
      handler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    expect(reg.has('needs_pdf')).toBe(false);
  });

  it('registers and dispatches when capability is on', async () => {
    const { ctx, cleanup: c } = buildCtx({ capabilities: { allowPdf: true } } as never);
    cleanup = c;
    const reg = new ToolRegistry(ctx);
    reg.register({
      name: 'needs_pdf',
      description: '',
      inputSchema: z.object({ n: z.number() }),
      capabilities: ['allowPdf'],
      handler: async ({ n }) => ({ content: [{ type: 'text', text: `n=${n}` }] }),
    });
    const res = await reg.call('needs_pdf', { n: 7 });
    expect(res.isError).toBeFalsy();
    expect(res.content[0]?.text).toBe('n=7');
  });

  it('returns structured INVALID_INPUT on bad input', async () => {
    const { ctx, cleanup: c } = buildCtx();
    cleanup = c;
    const reg = new ToolRegistry(ctx);
    reg.register({
      name: 'echo',
      description: '',
      inputSchema: z.object({ msg: z.string() }),
      handler: async ({ msg }) => ({ content: [{ type: 'text', text: msg }] }),
    });
    const res = await reg.call('echo', { msg: 123 });
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('INVALID_INPUT');
  });

  it('unknown tool returns NOT_FOUND', async () => {
    const { ctx, cleanup: c } = buildCtx();
    cleanup = c;
    const reg = new ToolRegistry(ctx);
    const res = await reg.call('nope', {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toContain('NOT_FOUND');
  });
});
