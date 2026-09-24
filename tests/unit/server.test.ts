import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  type CallToolResult,
  type ListToolsResult,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BridgeRuntime } from '@/bridge/config.js';
import { LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import type { ManagedCdpSession } from '@/cdp/session.js';
import type { ManagedCdpUpstreamOwner } from '@/cdp/types.js';
import { type BridgeServer, createBridgeServer, startBridge } from '@/server.js';

const clients: Client[] = [];
const tempRoots: string[] = [];
const managedOwners = new WeakMap<ManagedCdpSession, ManagedCdpUpstreamOwner>();

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

  it('preserves browser_emulate_media schema and annotations unchanged', async () => {
    const upstreamTool = {
      ...createTool('browser_emulate_media'),
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
        readOnlyHint: false,
      },
      inputSchema: {
        type: 'object' as const,
        properties: {
          colorScheme: { type: 'string', enum: ['dark', 'light', 'no-preference'] },
          media: { type: 'string', enum: ['print', 'screen', 'null'] },
        },
        additionalProperties: false,
      },
    };
    const bridge = await createTestBridge({
      listTools: async () => ({ tools: [upstreamTool] }),
    });
    try {
      const client = await connectBridge(bridge);

      expect((await client.listTools()).tools[0]).toEqual(upstreamTool);
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

  it('invalidates every cached tool page and forwards upstream list-changed notifications', async () => {
    let emitToolListChanged: (() => Promise<void>) | undefined;
    let generation = 1;
    const listTools = vi.fn(async (params?: { cursor?: string }): Promise<ListToolsResult> => ({
      nextCursor: params?.cursor === undefined ? 'page-2' : undefined,
      tools:
        params?.cursor === 'page-2'
          ? [createTool(`webmcp_second_${String(generation)}`)]
          : [createTool(`webmcp_first_${String(generation)}`)],
    }));
    const bridge = await createTestBridge({
      captureToolListChanged: (emit) => {
        emitToolListChanged = emit;
      },
      listTools,
    });
    try {
      const client = await connectBridge(bridge);
      const notifications = vi.fn();
      client.setNotificationHandler(ToolListChangedNotificationSchema, notifications);

      await client.listTools();
      await client.listTools({ cursor: 'page-2' });
      await client.listTools();
      await client.listTools({ cursor: 'page-2' });
      expect(listTools).toHaveBeenCalledTimes(2);

      generation = 2;
      await emitToolListChanged?.();

      expect(notifications).toHaveBeenCalledTimes(1);
      expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
        'webmcp_first_2',
        'cloakbrowser_binary_info',
        'cloakbrowser_bridge_info',
      ]);
      expect((await client.listTools({ cursor: 'page-2' })).tools.map((tool) => tool.name)).toEqual([
        'webmcp_second_2',
      ]);
      expect(listTools).toHaveBeenCalledTimes(4);
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

  it('does not forward a browser tool when managed CDP replacement fails', async () => {
    const managed = createManagedCdpSessionMock({ state: 'unavailable' });
    vi.mocked(managed.runBrowserTool).mockRejectedValueOnce(
      new Error('Managed CDP browser replacement failed'),
    );
    const onCdpRecoveryError = vi.fn(() => {
      throw new Error('diagnostic callback failed');
    });
    const callTool = vi.fn(async () => jsonToolResult({ exact: 'upstream-result' }));
    const bridge = await createTestBridge({
      callTool,
      managedCdpSession: managed,
      onCdpRecoveryError,
    });
    try {
      const client = await connectBridge(bridge);

      await expect(client.callTool({ name: 'browser_navigate', arguments: {} })).rejects.toThrow(
        'Managed CDP browser replacement failed',
      );

      expect(callTool).not.toHaveBeenCalled();
      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(onCdpRecoveryError).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });

  it('surfaces managed CDP cleanup failure after closing the MCP server', async () => {
    const managed = createManagedCdpSessionMock({ state: 'ready' });
    vi.mocked(managed.dispose).mockRejectedValueOnce(new Error('managed cleanup incomplete'));
    const bridge = await createTestBridge({ managedCdpSession: managed });

    await expect(bridge.dispose()).rejects.toThrow('managed bridge cleanup was incomplete');
    expect(managed.dispose).toHaveBeenCalledTimes(1);
  });

  it('returns an upstream browser tool error unchanged after readiness', async () => {
    const expected: CallToolResult = {
      content: [{ type: 'text', text: 'upstream failed' }],
      isError: true,
    };
    const managed = createManagedCdpSessionMock({ state: 'ready' });
    const callTool = vi.fn(async () => expected);
    const bridge = await createTestBridge({
      callTool,
      managedCdpSession: managed,
    });
    try {
      const client = await connectBridge(bridge);

      const result = await client.callTool({ name: 'browser_navigate', arguments: {} });

      expect(result).toEqual(expected);
      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(managed.invalidateGeneration).not.toHaveBeenCalled();
      expect(callTool).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });

  it('routes dynamic WebMCP tools through managed CDP recovery', async () => {
    const managed = createManagedCdpSessionMock({ state: 'ready' });
    const callTool = vi.fn(async (params) => jsonToolResult(params));
    const bridge = await createTestBridge({ callTool, managedCdpSession: managed });
    try {
      const client = await connectBridge(bridge);

      await client.callTool({ name: 'webmcp_checkout', arguments: { item: 'book' } });

      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(managed.runWithCurrentUpstream).not.toHaveBeenCalled();
      expect(callTool).toHaveBeenCalledWith({
        name: 'webmcp_checkout',
        arguments: { item: 'book' },
      });
    } finally {
      await bridge.dispose();
    }
  });

  it('invalidates managed tool caches when the generation state changes', async () => {
    const managed = createManagedCdpSessionMock({ state: 'ready' });
    let notifyStateChanged: (() => Promise<void>) | undefined;
    let generation = 1;
    const listTools = vi.fn(async () => ({
      tools: [createTool(`webmcp_generation_${String(generation)}`)],
    }));
    const bridge = await createTestBridge({
      listTools,
      managedCdpSession: managed,
      subscribeManagedToolListChanges: (handler) => {
        notifyStateChanged = handler;
        return () => undefined;
      },
    });
    try {
      const client = await connectBridge(bridge);
      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('webmcp_generation_1');
      await client.listTools();
      expect(listTools).toHaveBeenCalledTimes(1);

      generation = 2;
      await notifyStateChanged?.();

      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('webmcp_generation_2');
      expect(listTools).toHaveBeenCalledTimes(2);
    } finally {
      await bridge.dispose();
    }
  });

  it('hides stale dynamic tools while a managed generation is unavailable', async () => {
    const managedState: { state: 'ready' | 'unavailable' } = { state: 'ready' };
    const managed = createManagedCdpSessionMock(managedState);
    let notifyStateChanged: (() => Promise<void>) | undefined;
    const listTools = vi.fn(async () => ({
      tools: [createTool('browser_snapshot'), createTool('webmcp_stale_checkout')],
    }));
    const bridge = await createTestBridge({
      listTools,
      managedCdpSession: managed,
      subscribeManagedToolListChanges: (handler) => {
        notifyStateChanged = handler;
        return () => undefined;
      },
    });
    try {
      const client = await connectBridge(bridge);
      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('webmcp_stale_checkout');

      managedState.state = 'unavailable';
      await notifyStateChanged?.();

      const names = (await client.listTools()).tools.map((tool) => tool.name);
      expect(names).toContain('browser_snapshot');
      expect(names).not.toContain('webmcp_stale_checkout');
      expect(listTools).toHaveBeenCalledTimes(2);
    } finally {
      await bridge.dispose();
    }
  });

  it('invalidates managed CDP after a successful browser_close without reopening it', async () => {
    const managed = createManagedCdpSessionMock({ state: 'ready' });
    const callTool = vi.fn(async (params) => jsonToolResult(params));
    const bridge = await createTestBridge({ callTool, managedCdpSession: managed });
    try {
      const client = await connectBridge(bridge);

      await client.callTool({ name: 'browser_close', arguments: {} });

      expect(managed.invalidateGeneration).toHaveBeenCalledTimes(1);
      expect(managed.bootstrapGeneration).not.toHaveBeenCalled();
      expect(callTool).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });

  it('probes managed CDP metadata and lists tools without starting replacement', async () => {
    const managed = createManagedCdpSessionMock({ state: 'unavailable' });
    const bridge = await createTestBridge({
      cdpInfo: () => ({ enabled: false }),
      managedCdpSession: managed,
    });
    try {
      const client = await connectBridge(bridge);
      await client.listTools();

      await client.callTool({ name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} });

      expect(managed.probeGeneration).toHaveBeenCalledTimes(1);
      expect(managed.runBrowserTool).not.toHaveBeenCalled();
      expect(managed.runWithCurrentUpstream).toHaveBeenCalledTimes(1);
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

  it('refreshes the cached upstream tools after an upstream list change notification', async () => {
    let dynamicToolAvailable = false;
    let listToolCalls = 0;
    let upstreamToolListChangedHandler: ((notification: unknown) => void) | undefined;
    const upstreamClient = {
      async listTools() {
        listToolCalls += 1;
        return {
          tools: [
            createTool('browser_snapshot'),
            ...(dynamicToolAvailable ? [createTool('webmcp_echo')] : []),
          ],
        };
      },
      async callTool() {
        return { content: [] };
      },
      async close() {},
      removeNotificationHandler() {},
      setNotificationHandler(_schema: unknown, handler: (notification: unknown) => void) {
        upstreamToolListChangedHandler = handler;
      },
    } as unknown as Client;
    const bridge = await createBridgeServer({ runtime: createRuntime(), upstreamClient });
    try {
      const client = await connectBridge(bridge);
      const notifications: unknown[] = [];
      client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
        notifications.push(notification);
      });

      expect((await client.listTools()).tools.map((tool) => tool.name)).not.toContain('webmcp_echo');
      dynamicToolAvailable = true;
      upstreamToolListChangedHandler?.({ method: 'notifications/tools/list_changed' });

      await vi.waitFor(() => expect(notifications).toHaveLength(1));
      expect((await client.listTools()).tools.map((tool) => tool.name)).toContain('webmcp_echo');
      expect(listToolCalls).toBe(2);
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
    cdpInfo?: () => { enabled: false };
    managedCdpSession?: ManagedCdpSession;
    onCdpRecoveryError?: () => void;
    runtime?: BridgeRuntime;
    captureToolListChanged?: (emit: () => Promise<void>) => void;
    subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
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
    removeNotificationHandler: vi.fn(),
    setNotificationHandler: vi.fn(
      (
        _schema: unknown,
        handler: (notification: { method: 'notifications/tools/list_changed' }) => Promise<void> | void,
      ) => {
        overrides.captureToolListChanged?.(
          async () => await handler({ method: 'notifications/tools/list_changed' }),
        );
      },
    ),
  } as unknown as Client;
  if (overrides.managedCdpSession !== undefined) {
    managedOwners.set(overrides.managedCdpSession, {
      callTool: async (name, arguments_) => await upstreamClient.callTool({ name, arguments: arguments_ }),
      dispose: async () => undefined,
      listTools: async (params) =>
        await upstreamClient.listTools(params as Parameters<Client['listTools']>[0]),
    });
  }
  return createBridgeServer({
    cdpInfo: overrides.cdpInfo,
    managedCdpSession: overrides.managedCdpSession,
    onCdpRecoveryError: overrides.onCdpRecoveryError,
    runtime: overrides.runtime ?? createRuntime(),
    subscribeManagedToolListChanges: overrides.subscribeManagedToolListChanges,
    upstreamClient,
  });
}

function createManagedCdpSessionMock(initial: { state: 'ready' | 'unavailable' }) {
  const managed = {
    activeConnections: 0,
    bootstrapGeneration: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
    externalPort: 9222,
    invalidateGeneration: vi.fn(),
    probeGeneration: vi.fn(async () => initial.state === 'ready'),
    runBrowserTool: vi.fn(async (operation: (owner: ManagedCdpUpstreamOwner) => Promise<unknown>) => {
      const owner = managedOwners.get(managed);
      if (owner === undefined) throw new Error('managed owner missing');
      return await operation(owner);
    }),
    runWithCurrentUpstream: vi.fn(async (operation: (owner: ManagedCdpUpstreamOwner) => Promise<unknown>) => {
      const owner = managedOwners.get(managed);
      if (owner === undefined) throw new Error('managed owner missing');
      return await operation(owner);
    }),
    snapshot: vi.fn((): ReturnType<ManagedCdpSession['snapshot']> =>
      initial.state === 'ready'
        ? {
            browserWebSocketUrl: 'ws://127.0.0.1:43123/devtools/browser/browser-1',
            capability: 'capability-1',
            discoveryUrl: 'http://127.0.0.1:9222/cdp/capability-1',
            generation: 1,
            state: 'ready',
            upstreamHost: '127.0.0.1',
            upstreamPort: 43123,
          }
        : { generation: 1, state: 'unavailable' },
    ),
  } satisfies ManagedCdpSession;
  return managed;
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
