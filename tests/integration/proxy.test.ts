import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { createBridgeServer, type BridgeServer } from '@/server.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';

const tempRoots: string[] = [];
const bridges: BridgeServer[] = [];
const clients: Client[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  await Promise.allSettled(bridges.splice(0).map((bridge) => bridge.dispose()));
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-proxy-test-'));
  tempRoots.push(root);
  return root;
}

describe('bridge proxy', () => {
  it('can connect to an upstream child from environment configuration', async () => {
    const root = createTempRoot();
    const previous = {
      cli: process.env.PLAYWRIGHT_MCP_CLI_PATH,
      engine: process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE,
      outputDir: process.env.PLAYWRIGHT_MCP_OUTPUT_DIR,
      fallback: process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK,
    };

    process.env.PLAYWRIGHT_MCP_CLI_PATH = fileURLToPath(
      new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url),
    );
    process.env.PLAYWRIGHT_MCP_BROWSER_ENGINE = 'playwright';
    process.env.PLAYWRIGHT_MCP_OUTPUT_DIR = path.join(root, 'out');
    process.env.CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK = 'false';

    try {
      const bridge = await createBridgeServer();
      bridges.push(bridge);
      expect(bridge.runtime.browserEngine).toBe('playwright');
    } finally {
      restoreEnv('PLAYWRIGHT_MCP_CLI_PATH', previous.cli);
      restoreEnv('PLAYWRIGHT_MCP_BROWSER_ENGINE', previous.engine);
      restoreEnv('PLAYWRIGHT_MCP_OUTPUT_DIR', previous.outputDir);
      restoreEnv('CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', previous.fallback);
    }
  });

  it('adds local tools and forwards upstream tool calls unchanged', async () => {
    const root = createTempRoot();
    const upstreamClient = new Client({ name: 'proxy-test-upstream', version: '1.0.0' });
    clients.push(upstreamClient);
    await upstreamClient.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [fileURLToPath(new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url))],
        stderr: 'pipe',
      }),
    );

    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });
    const bridge = await createBridgeServer({ runtime, upstreamClient });
    bridges.push(bridge);

    const outerClient = new Client({ name: 'proxy-test-client', version: '1.0.0' });
    clients.push(outerClient);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([bridge.start(serverTransport), outerClient.connect(clientTransport)]);

    const tools = await outerClient.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      'browser_snapshot',
      'browser_navigate',
      LOCAL_TOOL_BINARY_INFO,
      LOCAL_TOOL_BRIDGE_INFO,
    ]);

    const result = await outerClient.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });
    expect(result.structuredContent).toEqual({
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });
  });

  it('caches upstream tool lists', async () => {
    const root = createTempRoot();
    const runtime = await prepareBridgeRuntime({
      tempRoot: root,
      ensureCloakBinary: async () => fakeCloakBinaryPath,
      env: {
        PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      },
    });
    let listToolCalls = 0;
    const upstreamClient = {
      async listTools() {
        listToolCalls += 1;
        return {
          tools: [
            {
              name: 'browser_snapshot',
              title: 'Page snapshot',
              description: 'Capture accessibility snapshot.',
              inputSchema: { type: 'object', properties: {}, additionalProperties: false },
            },
          ],
        };
      },
      async callTool() {
        return { content: [] };
      },
      async close() {},
    } as unknown as Client;

    const bridge = await createBridgeServer({ runtime, upstreamClient });
    bridges.push(bridge);

    const outerClient = new Client({ name: 'proxy-cache-test-client', version: '1.0.0' });
    clients.push(outerClient);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([bridge.start(serverTransport), outerClient.connect(clientTransport)]);

    await outerClient.listTools();
    await outerClient.listTools();

    expect(listToolCalls).toBe(1);
  });
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
