import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockBrowserAdapter } from '@/browser/mockAdapter.js';
import { configSchema } from '@/config/schema.js';
import { createLogger } from '@/logging/logger.js';
import { MCP_SERVER_INSTRUCTIONS, PROJECT_METADATA } from '@/project/metadata.js';
import { createServer } from '@/server.js';
import { FORBIDDEN_TOOL_NAMES } from '@/tools/types.js';
import { sampleFixtures } from '../fixtures/mockPages.js';

function build(opts: { capabilities?: Record<string, boolean>; logLevel?: 'silent' | 'debug' } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-contract-'));
  const config = configSchema.parse({
    outputDir: dir,
    logLevel: opts.logLevel ?? 'silent',
    capabilities: opts.capabilities ?? { allowScreenshots: true },
  });
  const adapter = new MockBrowserAdapter(sampleFixtures);
  const server = createServer({ config, adapter, logger: createLogger(config.logLevel) });
  return { dir, server };
}

describe('MCP contract: tool registration boundary', () => {
  let dir: string;
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    const out = build();
    dir = out.dir;
    server = out.server;
  });

  afterEach(async () => {
    await server.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  it('every registered tool exposes a valid registry entry shape', () => {
    const entries = server.registry.list();
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.description).toBe('string');
      expect(e.inputSchema).toBeDefined();
      expect(Array.isArray(e.capabilities)).toBe(true);
    }
  });

  it('forbidden tool names are never registered', () => {
    const names = new Set(server.registry.list().map((t) => t.name));
    for (const forbidden of FORBIDDEN_TOOL_NAMES) {
      expect(names.has(forbidden)).toBe(false);
    }
  });

  it('disabling allowScreenshots removes browser_take_screenshot', async () => {
    await server.dispose();
    rmSync(dir, { recursive: true, force: true });
    const out = build({ capabilities: { allowScreenshots: false } });
    dir = out.dir;
    server = out.server;
    const names = server.registry.list().map((t) => t.name);
    expect(names).not.toContain('browser_take_screenshot');
  });

  it('advertises complete MCP implementation metadata during initialization', async () => {
    const client = new Client({ name: 'contract-test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    try {
      await Promise.all([server.start(serverTransport), client.connect(clientTransport)]);

      expect(client.getServerVersion()).toMatchObject({
        name: PROJECT_METADATA.mcpName,
        title: PROJECT_METADATA.title,
        version: PROJECT_METADATA.version,
        description: PROJECT_METADATA.description,
        websiteUrl: PROJECT_METADATA.websiteUrl,
        icons: PROJECT_METADATA.icons,
      });
      expect(client.getInstructions()).toBe(MCP_SERVER_INSTRUCTIONS);
      expect(client.getServerCapabilities()?.tools?.listChanged).toBe(true);
    } finally {
      await client.close();
    }
  });
});

describe('MCP contract: error responses', () => {
  let dir: string;
  let server: ReturnType<typeof createServer>;

  beforeEach(() => {
    const out = build();
    dir = out.dir;
    server = out.server;
  });

  afterEach(async () => {
    await server.dispose();
    rmSync(dir, { recursive: true, force: true });
  });

  it('unknown tool returns NOT_FOUND error result (does not throw)', async () => {
    const res = await server.registry.call('definitely_not_a_tool', {});
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('NOT_FOUND');
  });

  it('invalid input returns INVALID_INPUT error result', async () => {
    const res = await server.registry.call('browser_navigate', { url: 12345 });
    expect(res.isError).toBe(true);
    expect(res.content[0]!.text).toContain('INVALID_INPUT');
  });

  it('every result conforms to MCP content shape', async () => {
    const cases = [
      await server.registry.call('browser_get_config', {}),
      await server.registry.call('definitely_not_a_tool', {}),
      await server.registry.call('browser_navigate', { url: 12345 }),
    ];
    for (const r of cases) {
      expect(Array.isArray(r.content)).toBe(true);
      expect(r.content.length).toBeGreaterThan(0);
      for (const c of r.content) {
        expect(c.type).toBe('text');
        expect(typeof c.text).toBe('string');
      }
    }
  });
});

describe('MCP contract: stdio cleanliness', () => {
  it('logger writes never reach process.stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const logger = createLogger('debug');
      logger.info('contract test info');
      logger.warn('contract test warn');
      logger.error('contract test error');
      logger.debug('contract test debug');
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
