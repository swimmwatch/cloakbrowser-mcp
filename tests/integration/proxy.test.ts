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
import { type BridgeServer, createBridgeServer } from '@/server.js';
import { fakeUpstreamToolNames } from '@tests/fixtures/fake-upstream-tools.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';
const tempRoots: string[] = [];
const bridges: BridgeServer[] = [];
const clients: Client[] = [];
afterEach(async () => {
  const mappedValues = clients.splice(0).map((client) => client.close());
  await Promise.allSettled(mappedValues);
  const mappedValues2 = bridges.splice(0).map((bridge) => bridge.dispose());
  await Promise.allSettled(mappedValues2);
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-proxy-test-');
  const root = mkdtempSync(joinedPath);
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
    const uRL = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
    process.env.PLAYWRIGHT_MCP_CLI_PATH = fileURLToPath(uRL);
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
    const clientOptions = { name: 'proxy-test-upstream', version: '1.0.0' } as const;
    const upstreamClient = new Client(clientOptions);
    clients.push(upstreamClient);
    const propertyValue = process.execPath;
    const uRL2 = new URL('../fixtures/fake-upstream-mcp.mjs', import.meta.url);
    const fileURLToPathResult = fileURLToPath(uRL2);
    const values: string[] | undefined = [fileURLToPathResult];
    const propertyValue2 = 'pipe';
    const stdioClientTransportOptions: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
      {
        command: propertyValue,
        args: values,
        stderr: propertyValue2,
      };
    const stdioClientTransport = new StdioClientTransport(stdioClientTransportOptions);
    await upstreamClient.connect(stdioClientTransport);
    const prepareBridgeRuntimeOptions: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions);
    const createBridgeServerOptions = { runtime, upstreamClient } as const;
    const bridge = await createBridgeServer(createBridgeServerOptions);
    bridges.push(bridge);
    const clientOptions2 = { name: 'proxy-test-client', version: '1.0.0' } as const;
    const outerClient = new Client(clientOptions2);
    clients.push(outerClient);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const values2: [Promise<void>, Promise<void>] = [
      bridge.start(serverTransport),
      outerClient.connect(clientTransport),
    ];
    await Promise.all(values2);
    const tools = await outerClient.listTools();
    const mappedValues3 = tools.tools.map((tool) => tool.name);
    const receiverActual = mappedValues3;
    const values3: string[] = [...fakeUpstreamToolNames, LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
    expect(receiverActual).toEqual(values3);
    const callToolOptions = {
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    const result = await outerClient.callTool(callToolOptions);
    const receiver2Actual = result.structuredContent;
    const toEqualOptions = {
      forwarded: true,
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions);
  });
  it('caches upstream tool lists', async () => {
    const root = createTempRoot();
    const prepareBridgeRuntimeOptions2: import('@/bridge/config.js').PrepareBridgeRuntimeOptions | undefined =
      {
        tempRoot: root,
        ensureCloakBinary: async () => fakeCloakBinaryPath,
        env: {
          PLAYWRIGHT_MCP_OUTPUT_DIR: path.join(root, 'out'),
          CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
        },
      };
    const runtime = await prepareBridgeRuntime(prepareBridgeRuntimeOptions2);
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
      removeNotificationHandler() {},
      setNotificationHandler() {},
    } as unknown as Client;
    const createBridgeServerOptions2 = { runtime, upstreamClient } as const;
    const bridge = await createBridgeServer(createBridgeServerOptions2);
    bridges.push(bridge);
    const clientOptions3 = { name: 'proxy-cache-test-client', version: '1.0.0' } as const;
    const outerClient = new Client(clientOptions3);
    clients.push(outerClient);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const values4: [Promise<void>, Promise<void>] = [
      bridge.start(serverTransport),
      outerClient.connect(clientTransport),
    ];
    await Promise.all(values4);
    await outerClient.listTools();
    await outerClient.listTools();
    expect(listToolCalls).toBe(1);
  });
});
function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
