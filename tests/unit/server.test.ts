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
  const mappedValues = clients.splice(0).map((client) => client.close());
  await Promise.allSettled(mappedValues);
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
describe('bridge server', () => {
  it('starts a bridge on a provided transport', async () => {
    const tmpdirResult = tmpdir();
    const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-start-bridge-test-');
    const root = mkdtempSync(joinedPath);
    tempRoots.push(root);
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
    const clientOptions = { name: 'start-bridge-unit-test-client', version: '1.0.0' } as const;
    const client = new Client(clientOptions);
    clients.push(client);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    let bridge: BridgeServer | undefined;
    try {
      const startBridgeOptions = { transport: serverTransport } as const;
      const bridgePromise = startBridge(startBridgeOptions);
      await client.connect(clientTransport);
      bridge = await bridgePromise;
      const mappedValues2 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues2).toContain('browser_snapshot');
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
      const mappedValues3 = result.tools.map((tool) => tool.name);
      const receiverActual = mappedValues3;
      const values: string[] = [
        'browser_snapshot',
        'browser_navigate',
        'cloakbrowser_binary_info',
        'cloakbrowser_bridge_info',
      ];
      expect(receiverActual).toEqual(values);
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
    const createTestBridgeOptions:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      listTools: async () => ({ tools: [upstreamTool] }),
    };
    const bridge = await createTestBridge(createTestBridgeOptions);
    try {
      const client = await connectBridge(bridge);
      const argumentValue = (await client.listTools()).tools[0];
      expect(argumentValue).toEqual(upstreamTool);
    } finally {
      await bridge.dispose();
    }
  });
  it('returns cursor-based upstream tool pages unchanged', async () => {
    const createTestBridgeOptions2:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      listTools: async (params) => ({
        nextCursor: params?.cursor === undefined ? 'page-2' : undefined,
        tools: params?.cursor === 'page-2' ? [createTool('browser_click')] : [createTool('browser_snapshot')],
      }),
    };
    const bridge = await createTestBridge(createTestBridgeOptions2);
    try {
      const client = await connectBridge(bridge);
      const mappedValues4 = (await client.listTools()).tools.map((tool) => tool.name);
      const receiver2Actual = mappedValues4;
      const values2: string[] = ['browser_snapshot', 'cloakbrowser_binary_info', 'cloakbrowser_bridge_info'];
      expect(receiver2Actual).toEqual(values2);
      const listToolsOptions = { cursor: 'page-2' } as const;
      const mappedValues5 = (await client.listTools(listToolsOptions)).tools.map((tool) => tool.name);
      const receiver3Actual = mappedValues5;
      const values3: string[] = ['browser_click'];
      expect(receiver3Actual).toEqual(values3);
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
          ? (() => {
              const message = `webmcp_second_${String(generation)}`;
              const toolResult = createTool(message);
              return [toolResult];
            })()
          : (() => {
              const message2 = `webmcp_first_${String(generation)}`;
              const toolResult2 = createTool(message2);
              return [toolResult2];
            })(),
    }));
    const createTestBridgeOptions3:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      captureToolListChanged: (emit) => {
        emitToolListChanged = emit;
      },
      listTools,
    };
    const bridge = await createTestBridge(createTestBridgeOptions3);
    try {
      const client = await connectBridge(bridge);
      const notifications = vi.fn();
      client.setNotificationHandler(ToolListChangedNotificationSchema, notifications);
      await client.listTools();
      const listToolsOptions2 = { cursor: 'page-2' } as const;
      await client.listTools(listToolsOptions2);
      await client.listTools();
      const listToolsOptions3 = { cursor: 'page-2' } as const;
      await client.listTools(listToolsOptions3);
      expect(listTools).toHaveBeenCalledTimes(2);
      generation = 2;
      await emitToolListChanged?.();
      expect(notifications).toHaveBeenCalledTimes(1);
      const mappedValues6 = (await client.listTools()).tools.map((tool) => tool.name);
      const receiver4Actual = mappedValues6;
      const values4: string[] = ['webmcp_first_2', 'cloakbrowser_binary_info', 'cloakbrowser_bridge_info'];
      expect(receiver4Actual).toEqual(values4);
      const listToolsOptions4 = { cursor: 'page-2' } as const;
      const mappedValues7 = (await client.listTools(listToolsOptions4)).tools.map((tool) => tool.name);
      const receiver5Actual = mappedValues7;
      const values5: string[] = ['webmcp_second_2'];
      expect(receiver5Actual).toEqual(values5);
      expect(listTools).toHaveBeenCalledTimes(4);
    } finally {
      await bridge.dispose();
    }
  });
  it('handles local tool calls without forwarding them upstream', async () => {
    const callTool = vi.fn(async (): Promise<CallToolResult> => ({ content: [] }));
    const createTestBridgeOptions4 = { callTool } as const;
    const bridge = await createTestBridge(createTestBridgeOptions4);
    try {
      const client = await connectBridge(bridge);
      await client.listTools();
      const callToolOptions = { name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} } as const;
      const result = await client.callTool(callToolOptions);
      expect(callTool).not.toHaveBeenCalled();
      const receiver6Actual = result.structuredContent;
      const toMatchObjectOptions: {
        name: string;
        localTools: {
          names: string[];
        };
      } = {
        name: 'io.github.swimmwatch/cloakbrowser-mcp',
        localTools: {
          names: ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'],
        },
      };
      expect(receiver6Actual).toMatchObject(toMatchObjectOptions);
    } finally {
      await bridge.dispose();
    }
  });
  it('forwards upstream tool calls unchanged', async () => {
    const callTool = vi.fn(async (params): Promise<CallToolResult> => jsonToolResult(params));
    const createTestBridgeOptions5 = { callTool } as const;
    const bridge = await createTestBridge(createTestBridgeOptions5);
    try {
      const client = await connectBridge(bridge);
      const params = {
        name: 'browser_find',
        arguments: { text: 'Release marker', filename: 'find-results.md' },
      };
      const result = await client.callTool(params);
      expect(callTool).toHaveBeenCalledWith(params);
      expect(result.structuredContent).toEqual(params);
    } finally {
      await bridge.dispose();
    }
  });
  it('does not forward a browser tool when managed CDP replacement fails', async () => {
    const createManagedCdpSessionMockOptions = { state: 'unavailable' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions);
    const receiver7 = vi.mocked(managed.runBrowserTool);
    const error = new Error('Managed CDP browser replacement failed');
    receiver7.mockRejectedValueOnce(error);
    const onCdpRecoveryError = vi.fn(() => {
      throw new Error('diagnostic callback failed');
    });
    const callTool = vi.fn(async () => {
      const jsonToolResultOptions = { exact: 'upstream-result' } as const;
      return jsonToolResult(jsonToolResultOptions);
    });
    const createTestBridgeOptions6 = {
      callTool,
      managedCdpSession: managed,
      onCdpRecoveryError,
    } as const;
    const bridge = await createTestBridge(createTestBridgeOptions6);
    try {
      const client = await connectBridge(bridge);
      const callToolOptions2 = { name: 'browser_navigate', arguments: {} } as const;
      const toolResult3 = client.callTool(callToolOptions2);
      await expect(toolResult3).rejects.toThrow('Managed CDP browser replacement failed');
      expect(callTool).not.toHaveBeenCalled();
      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(onCdpRecoveryError).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });
  it('surfaces managed CDP cleanup failure after closing the MCP server', async () => {
    const createManagedCdpSessionMockOptions2 = { state: 'ready' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions2);
    const receiver8 = vi.mocked(managed.dispose);
    const error2 = new Error('managed cleanup incomplete');
    receiver8.mockRejectedValueOnce(error2);
    const createTestBridgeOptions7 = { managedCdpSession: managed } as const;
    const bridge = await createTestBridge(createTestBridgeOptions7);
    const disposeResult = bridge.dispose();
    await expect(disposeResult).rejects.toThrow('managed bridge cleanup was incomplete');
    expect(managed.dispose).toHaveBeenCalledTimes(1);
  });
  it('returns an upstream browser tool error unchanged after readiness', async () => {
    const expected: CallToolResult = {
      content: [{ type: 'text', text: 'upstream failed' }],
      isError: true,
    };
    const createManagedCdpSessionMockOptions3 = { state: 'ready' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions3);
    const callTool = vi.fn(async () => expected);
    const createTestBridgeOptions8 = {
      callTool,
      managedCdpSession: managed,
    } as const;
    const bridge = await createTestBridge(createTestBridgeOptions8);
    try {
      const client = await connectBridge(bridge);
      const callToolOptions3 = { name: 'browser_navigate', arguments: {} } as const;
      const result = await client.callTool(callToolOptions3);
      expect(result).toEqual(expected);
      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(managed.invalidateGeneration).not.toHaveBeenCalled();
      expect(callTool).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });
  it('routes dynamic WebMCP tools through managed CDP recovery', async () => {
    const createManagedCdpSessionMockOptions4 = { state: 'ready' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions4);
    const callTool = vi.fn(async (params) => jsonToolResult(params));
    const createTestBridgeOptions9 = { callTool, managedCdpSession: managed } as const;
    const bridge = await createTestBridge(createTestBridgeOptions9);
    try {
      const client = await connectBridge(bridge);
      const callToolOptions4 = { name: 'webmcp_checkout', arguments: { item: 'book' } } as const;
      await client.callTool(callToolOptions4);
      expect(managed.runBrowserTool).toHaveBeenCalledTimes(1);
      expect(managed.runWithCurrentUpstream).not.toHaveBeenCalled();
      const receiver9Actual = callTool;
      const toHaveBeenCalledWithOptions = {
        name: 'webmcp_checkout',
        arguments: { item: 'book' },
      } as const;
      expect(receiver9Actual).toHaveBeenCalledWith(toHaveBeenCalledWithOptions);
    } finally {
      await bridge.dispose();
    }
  });
  it('invalidates managed tool caches when the generation state changes', async () => {
    const createManagedCdpSessionMockOptions5 = { state: 'ready' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions5);
    let notifyStateChanged: (() => Promise<void>) | undefined;
    let generation = 1;
    const listTools = vi.fn(async () => {
      const message3 = `webmcp_generation_${String(generation)}`;
      const toolResult4 = createTool(message3);
      const values6: {
        inputSchema: {
          [x: string]: unknown;
          type: 'object';
          properties?: Record<string, object> | undefined;
          required?: string[] | undefined;
        };
        name: string;
        description?: string | undefined;
        outputSchema?:
          | {
              [x: string]: unknown;
              type: 'object';
              properties?: Record<string, object> | undefined;
              required?: string[] | undefined;
            }
          | undefined;
        annotations?:
          | {
              title?: string | undefined;
              readOnlyHint?: boolean | undefined;
              destructiveHint?: boolean | undefined;
              idempotentHint?: boolean | undefined;
              openWorldHint?: boolean | undefined;
            }
          | undefined;
        execution?:
          | {
              taskSupport?: 'optional' | 'required' | 'forbidden' | undefined;
            }
          | undefined;
        _meta?: Record<string, unknown> | undefined;
        icons?:
          | {
              src: string;
              mimeType?: string | undefined;
              sizes?: string[] | undefined;
              theme?: 'light' | 'dark' | undefined;
            }[]
          | undefined;
        title?: string | undefined;
      }[] = [toolResult4];
      return {
        tools: values6,
      };
    });
    const createTestBridgeOptions10:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      listTools,
      managedCdpSession: managed,
      subscribeManagedToolListChanges: (handler) => {
        notifyStateChanged = handler;
        return () => undefined;
      },
    };
    const bridge = await createTestBridge(createTestBridgeOptions10);
    try {
      const client = await connectBridge(bridge);
      const mappedValues8 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues8).toContain('webmcp_generation_1');
      await client.listTools();
      expect(listTools).toHaveBeenCalledTimes(1);
      generation = 2;
      await notifyStateChanged?.();
      const mappedValues9 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues9).toContain('webmcp_generation_2');
      expect(listTools).toHaveBeenCalledTimes(2);
    } finally {
      await bridge.dispose();
    }
  });
  it('hides stale dynamic tools while a managed generation is unavailable', async () => {
    const managedState: {
      state: 'ready' | 'unavailable';
    } = { state: 'ready' };
    const managed = createManagedCdpSessionMock(managedState);
    let notifyStateChanged: (() => Promise<void>) | undefined;
    const listTools = vi.fn(async () => ({
      tools: [createTool('browser_snapshot'), createTool('webmcp_stale_checkout')],
    }));
    const createTestBridgeOptions11:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      listTools,
      managedCdpSession: managed,
      subscribeManagedToolListChanges: (handler) => {
        notifyStateChanged = handler;
        return () => undefined;
      },
    };
    const bridge = await createTestBridge(createTestBridgeOptions11);
    try {
      const client = await connectBridge(bridge);
      const mappedValues10 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues10).toContain('webmcp_stale_checkout');
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
    const createManagedCdpSessionMockOptions6 = { state: 'ready' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions6);
    const callTool = vi.fn(async (params) => jsonToolResult(params));
    const createTestBridgeOptions12 = { callTool, managedCdpSession: managed } as const;
    const bridge = await createTestBridge(createTestBridgeOptions12);
    try {
      const client = await connectBridge(bridge);
      const callToolOptions5 = { name: 'browser_close', arguments: {} } as const;
      await client.callTool(callToolOptions5);
      expect(managed.invalidateGeneration).toHaveBeenCalledTimes(1);
      expect(managed.bootstrapGeneration).not.toHaveBeenCalled();
      expect(callTool).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });
  it('probes managed CDP metadata and lists tools without starting replacement', async () => {
    const createManagedCdpSessionMockOptions7 = { state: 'unavailable' } as const;
    const managed = createManagedCdpSessionMock(createManagedCdpSessionMockOptions7);
    const createTestBridgeOptions13:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      cdpInfo: () => ({ enabled: false }),
      managedCdpSession: managed,
    };
    const bridge = await createTestBridge(createTestBridgeOptions13);
    try {
      const client = await connectBridge(bridge);
      await client.listTools();
      const callToolOptions6 = { name: LOCAL_TOOL_BRIDGE_INFO, arguments: {} } as const;
      await client.callTool(callToolOptions6);
      expect(managed.probeGeneration).toHaveBeenCalledTimes(1);
      expect(managed.runBrowserTool).not.toHaveBeenCalled();
      expect(managed.runWithCurrentUpstream).toHaveBeenCalledTimes(1);
    } finally {
      await bridge.dispose();
    }
  });
  it('does not cache failed upstream tool list requests', async () => {
    let calls = 0;
    const createTestBridgeOptions14:
      | {
          listTools?: (params?: { cursor?: string }) => Promise<ListToolsResult>;
          callTool?: (params: { name: string; arguments?: unknown }) => Promise<CallToolResult>;
          close?: () => Promise<void>;
          cdpInfo?: () => {
            enabled: false;
          };
          managedCdpSession?: ManagedCdpSession;
          onCdpRecoveryError?: () => void;
          runtime?: BridgeRuntime;
          captureToolListChanged?: (emit: () => Promise<void>) => void;
          subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
        }
      | undefined = {
      listTools: async () => {
        calls += 1;
        if (calls === 1) throw new Error('temporary upstream failure');
        return {
          tools: [createTool('browser_snapshot')],
        };
      },
    };
    const bridge = await createTestBridge(createTestBridgeOptions14);
    try {
      const client = await connectBridge(bridge);
      const listToolsResult = client.listTools();
      await expect(listToolsResult).rejects.toThrow('temporary upstream failure');
      const listToolsResult2 = client.listTools();
      const receiver10Actual = listToolsResult2;
      const objectContainingOptions = { name: 'browser_snapshot' } as const;
      const objectContainingResult = expect.objectContaining(objectContainingOptions);
      const values7 = [objectContainingResult];
      const arrayContainingResult = expect.arrayContaining(values7);
      const toMatchObjectOptions2 = {
        tools: arrayContainingResult,
      };
      await expect(receiver10Actual).resolves.toMatchObject(toMatchObjectOptions2);
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
    const createBridgeServerOptions = { runtime: createRuntime(), upstreamClient } as const;
    const bridge = await createBridgeServer(createBridgeServerOptions);
    try {
      const client = await connectBridge(bridge);
      const notifications: unknown[] = [];
      client.setNotificationHandler(ToolListChangedNotificationSchema, (notification) => {
        notifications.push(notification);
      });
      const mappedValues11 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues11).not.toContain('webmcp_echo');
      dynamicToolAvailable = true;
      const notification = { method: 'notifications/tools/list_changed' } as const;
      upstreamToolListChangedHandler?.(notification);
      await vi.waitFor(() => expect(notifications).toHaveLength(1));
      const mappedValues12 = (await client.listTools()).tools.map((tool) => tool.name);
      expect(mappedValues12).toContain('webmcp_echo');
      expect(listToolCalls).toBe(2);
    } finally {
      await bridge.dispose();
    }
  });
  it('disposes the upstream client, server, and runtime', async () => {
    const close = vi.fn(async () => {});
    const disposeRuntime = vi.fn();
    const createTestBridgeOptions15 = {
      close,
      runtime: createRuntime(disposeRuntime),
    } as const;
    const bridge = await createTestBridge(createTestBridgeOptions15);
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
    cdpInfo?: () => {
      enabled: false;
    };
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
        overrides.captureToolListChanged?.(async () => {
          const handlerOptions = { method: 'notifications/tools/list_changed' } as const;
          return await handler(handlerOptions);
        });
      },
    ),
  } as unknown as Client;
  if (overrides.managedCdpSession !== undefined) {
    const setOptions: ManagedCdpUpstreamOwner = {
      callTool: async (name, arguments_) => {
        const callToolOptions7 = { name, arguments: arguments_ } as const;
        return await upstreamClient.callTool(callToolOptions7);
      },
      dispose: async () => undefined,
      listTools: async (params) =>
        await upstreamClient.listTools(params as Parameters<Client['listTools']>[0]),
    };
    managedOwners.set(overrides.managedCdpSession, setOptions);
  }
  const createBridgeServerOptions2 = {
    cdpInfo: overrides.cdpInfo,
    managedCdpSession: overrides.managedCdpSession,
    onCdpRecoveryError: overrides.onCdpRecoveryError,
    runtime: overrides.runtime ?? createRuntime(),
    subscribeManagedToolListChanges: overrides.subscribeManagedToolListChanges,
    upstreamClient,
  } as const;
  return createBridgeServer(createBridgeServerOptions2);
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
  const clientOptions2 = { name: 'bridge-unit-test-client', version: '1.0.0' } as const;
  const client = new Client(clientOptions2);
  clients.push(client);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const values8: [Promise<void>, Promise<void>] = [
    bridge.start(serverTransport),
    client.connect(clientTransport),
  ];
  await Promise.all(values8);
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
