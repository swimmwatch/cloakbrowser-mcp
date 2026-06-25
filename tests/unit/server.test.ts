import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult, ListToolsResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BridgeRuntime } from '@/bridge/config.js';
import { LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { createBridgeServer, startBridge, type BridgeServer } from '@/server.js';

const clients: Client[] = [];
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.allSettled(clients.splice(0).map((client) => client.close()));
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('bridge server', () => {
  it('starts a bridge on a provided transport', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-start-bridge-test-'));
    tempRoots.push(root);
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

    const client = new Client({ name: 'start-bridge-unit-test-client', version: '1.0.0' });
    clients.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    let bridge: BridgeServer | undefined;

    try {
      const bridgePromise = startBridge({ transport: serverTransport });
      await client.connect(clientTransport);
      bridge = await bridgePromise;

      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('browser_snapshot');
    } finally {
      restoreEnv('PLAYWRIGHT_MCP_CLI_PATH', previous.cli);
      restoreEnv('PLAYWRIGHT_MCP_BROWSER_ENGINE', previous.engine);
      restoreEnv('PLAYWRIGHT_MCP_OUTPUT_DIR', previous.outputDir);
      restoreEnv('CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', previous.fallback);
      await bridge?.dispose();
    }
  });

  it('lists upstream tools plus local tools on the first page', async () => {
    const bridge = await createTestBridge();
    try {
      const client = await connectBridge(bridge);
      const result = await client.listTools();

      expect(result.tools.map((tool) => tool.name)).toEqual([
        'browser_snapshot',
        'browser_navigate',
        'cloakbrowser_binary_info',
        'cloakbrowser_bridge_info',
      ]);
    } finally {
      await bridge.dispose();
    }
  });

  it('returns cursor-based upstream tool pages unchanged', async () => {
    const bridge = await createTestBridge({
      listTools: async (params) => ({
        nextCursor: params?.cursor === undefined ? 'page-2' : undefined,
        tools: params?.cursor === 'page-2' ? [createTool('browser_click')] : [createTool('browser_snapshot')],
      }),
    });
    try {
      const client = await connectBridge(bridge);

      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
        'browser_snapshot',
        'cloakbrowser_binary_info',
        'cloakbrowser_bridge_info',
      ]);
      expect((await client.listTools({ cursor: 'page-2' })).tools.map((tool) => tool.name)).toEqual([
        'browser_click',
      ]);
    } finally {
      await bridge.dispose();
    }
  });

  it('handles local tool calls without forwarding them upstream', async () => {
    const callTool = vi.fn(async (): Promise<CallToolResult> => ({ content: [] }));
    const bridge = await createTestBridge({ callTool });
    try {
      const client = await connectBridge(bridge);
      await client.listTools();

      const result = await client.callTool({ name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} });

      expect(callTool).not.toHaveBeenCalled();
      expect(result.structuredContent).toMatchObject({
        name: 'io.github.swimmwatch/cloakbrowser-mcp',
        localTools: {
          names: ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'],
        },
      });
    } finally {
      await bridge.dispose();
    }
  });

  it('forwards upstream tool calls unchanged', async () => {
    const callTool = vi.fn(async (params): Promise<CallToolResult> => jsonToolResult(params));
    const bridge = await createTestBridge({ callTool });
    try {
      const client = await connectBridge(bridge);

      const params = {
        name: 'browser_navigate',
        arguments: { url: 'https://example.com' },
      };
      const result = await client.callTool(params);

      expect(callTool).toHaveBeenCalledWith(params);
      expect(result.structuredContent).toEqual(params);
    } finally {
      await bridge.dispose();
    }
  });

  it('does not cache failed upstream tool list requests', async () => {
    let calls = 0;
    const bridge = await createTestBridge({
      listTools: async () => {
        calls += 1;
        if (calls === 1) throw new Error('temporary upstream failure');
        return {
          tools: [createTool('browser_snapshot')],
        };
      },
    });
    try {
      const client = await connectBridge(bridge);

      await expect(client.listTools()).rejects.toThrow('temporary upstream failure');
      await expect(client.listTools()).resolves.toMatchObject({
        tools: expect.arrayContaining([expect.objectContaining({ name: 'browser_snapshot' })]),
      });
      expect(calls).toBe(2);
    } finally {
      await bridge.dispose();
    }
  });

  it('disposes the upstream client, server, and runtime', async () => {
    const close = vi.fn(async () => {});
    const disposeRuntime = vi.fn();
    const bridge = await createTestBridge({
      close,
      runtime: createRuntime(disposeRuntime),
    });
    const serverClose = vi.spyOn(bridge.server, 'close');

    await bridge.dispose();

    expect(close).toHaveBeenCalledTimes(1);
    expect(disposeRuntime).toHaveBeenCalledTimes(1);
    expect(serverClose).toHaveBeenCalledTimes(1);
  });
});

async function createTestBridge(
  overrides: {
    listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
    callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
    close?: () => Promise<void>;
    runtime?: BridgeRuntime;
  } = {},
): Promise<BridgeServer> {
  const upstreamClient = {
    listTools:
      overrides.listTools ??
      (async () => ({
        tools: [createTool('browser_snapshot'), createTool('browser_navigate')],
      })),
    callTool: overrides.callTool ?? (async (params) => jsonToolResult(params)),
    close: overrides.close ?? (async () => {}),
  } as unknown as Client;
  return createBridgeServer({
    runtime: overrides.runtime ?? createRuntime(),
    upstreamClient,
  });
}

async function connectBridge(bridge: BridgeServer): Promise<Client> {
  const client = new Client({ name: 'bridge-unit-test-client', version: '1.0.0' });
  clients.push(client);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([bridge.start(serverTransport), client.connect(clientTransport)]);
  return client;
}

function createRuntime(dispose: () => void = () => {}): BridgeRuntime {
  return {
    browserEngine: 'cloak',
    configPath: '/tmp/playwright-mcp.config.json',
    tempDir: '/tmp/cloakbrowser-mcp-test',
    childEnv: {},
    outputDir: '/tmp/cloakbrowser-mcp-output',
    cloakBinaryPath: '/tmp/cloakbrowser',
    config: {},
    dispose,
  };
}

function createTool(name: string): ListToolsResult['tools'][number] {
  return {
    name,
    title: name,
    description: name,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  };
}

function jsonToolResult(value: unknown): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value as Record<string, unknown>,
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
