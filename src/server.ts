import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { request as createHttpRequest } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  type Implementation,
  type ListToolsRequest,
  ListToolsRequestSchema,
  type ListToolsResult,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  type BridgeRuntime,
  prepareBridgeRuntime,
  type PrepareBridgeRuntimeOptions,
} from '#src/bridge/config';
import { resolvePlaywrightMcpCliPath } from '#src/bridge/paths';
import {
  type BridgeCdpInfo,
  callLocalTool,
  createLocalTools,
  isLocalTool,
  LOCAL_TOOL_BRIDGE_INFO,
} from '#src/bridge/tools';
import { CdpPortAllocator } from '#src/cdp/allocator';
import { createChromiumCdpClient, reserveInternalCdpPort } from '#src/cdp/chromium';
import type { CdpEndpointConfig } from '#src/cdp/config';
import { startCdpHttpProxy } from '#src/cdp/httpProxy';
import { type ManagedCdpSession, startManagedCdpSession } from '#src/cdp/session';
import type { CdpSecurityRejectionSummary } from '#src/cdp/security';
import type { ManagedCdpUpstreamOwner } from '#src/cdp/types';
import {
  createCdpDiscoveryUrl,
  effectiveUrlPort,
  formatCdpAuthority,
  websocketSchemeFor,
} from '#src/cdp/urls';
import { MCP_SERVER_INSTRUCTIONS, PROJECT_METADATA } from '#src/project/metadata';

export interface StartBridgeOptions {
  beforeConnect?: (runtime: BridgeRuntime) => Promise<void>;
  cdp?: CdpEndpointConfig;
  cdpAllocator?: CdpPortAllocator;
  onCdpActivity?: () => void;
  onCdpCleanupError?: () => void;
  onCdpRecoveryError?: () => void;
  onCdpSecurityRejections?: (summary: CdpSecurityRejectionSummary) => void;
  serverInfo?: Partial<Implementation>;
  runtimeOptions?: Pick<
    PrepareBridgeRuntimeOptions,
    | 'binaryPath'
    | 'browserIsolated'
    | 'contextOptions'
    | 'extensionMode'
    | 'extensionPaths'
    | 'geoipProxyMatch'
    | 'headless'
    | 'humanize'
    | 'humanPreset'
    | 'proxy'
    | 'profileDirName'
    | 'userDataDir'
  >;
  transport?: Transport;
}

export interface BridgeServerOptions extends StartBridgeOptions {
  cdpInfo?: () => BridgeCdpInfo;
  managedCdpSession?: ManagedCdpSession;
  runtime?: BridgeRuntime;
  subscribeManagedToolListChanges?: (handler: () => Promise<void>) => () => void;
  upstreamClient?: Client;
}

export interface BridgeServer {
  server: Server;
  runtime: BridgeRuntime;
  start(transport?: Transport): Promise<void>;
  dispose(): Promise<void>;
}

export async function startBridge(options: StartBridgeOptions = {}): Promise<BridgeServer> {
  if (options.cdp?.processEnabled) {
    const bridge = await startManagedCdpBridge(options, options.cdp, options.cdpAllocator);
    await bridge.start(options.transport);
    return bridge;
  }
  const runtime = await prepareBridgeRuntime(options.runtimeOptions);
  await options.beforeConnect?.(runtime);
  const bridge = await createBridgeServer({ ...options, runtime });
  await bridge.start(options.transport);
  return bridge;
}

/**
 * Creates the outer MCP server that forwards upstream Playwright tools and exposes local introspection tools.
 */
export async function createBridgeServer(options: BridgeServerOptions = {}): Promise<BridgeServer> {
  const runtime = options.runtime ?? (await prepareBridgeRuntime(options.runtimeOptions));
  const upstreamClient = options.upstreamClient ?? (await connectUpstream(runtime));
  const localTools = createLocalTools();
  const upstreamToolCache = new Map<string, Promise<ListToolsResult>>();
  let upstreamToolCount = 0;

  const server = new Server(createServerInfo(options.serverInfo), {
    capabilities: { tools: { listChanged: true } },
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  const handleUpstreamToolListChanged = async (): Promise<void> => {
    upstreamToolCache.clear();
    upstreamToolCount = 0;
    try {
      await server.sendToolListChanged();
    } catch {
      // Cache invalidation remains authoritative when no notification stream is open.
    }
  };
  const unsubscribeManagedToolListChanges = options.subscribeManagedToolListChanges?.(
    handleUpstreamToolListChanged,
  );
  if (options.managedCdpSession === undefined) {
    upstreamClient.setNotificationHandler(ToolListChangedNotificationSchema, handleUpstreamToolListChanged);
  }

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const managedGenerationBeforeList = options.managedCdpSession?.snapshot();
    const upstream = await listUpstreamTools(upstreamToolCache, request.params, async () =>
      options.managedCdpSession === undefined
        ? await upstreamClient.listTools(request.params)
        : ((await options.managedCdpSession.runWithCurrentUpstream(
            async (owner) => await owner.listTools(request.params),
          )) as ListToolsResult),
    );
    const visibleUpstream = filterManagedDynamicTools(
      upstream,
      managedGenerationBeforeList,
      options.managedCdpSession?.snapshot(),
    );
    upstreamToolCount = Math.max(upstreamToolCount, visibleUpstream.tools.length);
    if (request.params?.cursor) return visibleUpstream;
    return {
      ...visibleUpstream,
      tools: [...visibleUpstream.tools, ...localTools],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (isLocalTool(request.params.name)) {
      if (request.params.name === LOCAL_TOOL_BRIDGE_INFO && options.managedCdpSession) {
        await options.managedCdpSession.probeGeneration();
      }
      return callLocalTool(request.params.name, runtime, upstreamToolCount, options.cdpInfo?.());
    }
    const managed = options.managedCdpSession;
    let result: CallToolResult;
    if (managed !== undefined) {
      const callCurrent = async (owner: ManagedCdpUpstreamOwner) =>
        (await owner.callTool(request.params.name, request.params.arguments ?? {})) as CallToolResult;
      try {
        result = (
          isBrowserTool(request.params.name)
            ? await managed.runBrowserTool(callCurrent)
            : await managed.runWithCurrentUpstream(callCurrent)
        ) as CallToolResult;
      } catch (error) {
        if (isBrowserTool(request.params.name) && managed.snapshot().state === 'unavailable') {
          safelyReportCdpRecoveryError(options.onCdpRecoveryError);
        }
        throw error;
      }
    } else {
      result = (await upstreamClient.callTool(request.params)) as CallToolResult;
    }
    if (managed !== undefined && request.params.name === 'browser_close' && result.isError !== true) {
      managed.invalidateGeneration();
    }
    return result;
  });

  return {
    server,
    runtime,
    async start(transport) {
      await server.connect(transport ?? new StdioServerTransport());
    },
    async dispose() {
      unsubscribeManagedToolListChanges?.();
      if (options.managedCdpSession === undefined) {
        upstreamClient.removeNotificationHandler('notifications/tools/list_changed');
      }
      if (options.managedCdpSession) {
        const results = await Promise.allSettled([options.managedCdpSession.dispose(), server.close()]);
        const errors = results.flatMap((result) =>
          result.status === 'rejected' ? [new Error('Managed bridge resource cleanup failed')] : [],
        );
        if (errors.length > 0) {
          throw new AggregateError(errors, 'managed bridge cleanup was incomplete');
        }
      } else {
        await Promise.allSettled([upstreamClient.close(), server.close()]);
        runtime.dispose();
      }
    },
  };
}

function safelyReportCdpRecoveryError(callback: StartBridgeOptions['onCdpRecoveryError']): void {
  try {
    callback?.();
  } catch {
    // Diagnostic callbacks never alter upstream MCP results.
  }
}

function safelyReportCdpCleanupError(callback: StartBridgeOptions['onCdpCleanupError']): void {
  try {
    callback?.();
  } catch {
    // Diagnostic callbacks never alter cleanup outcomes.
  }
}

/** Creates an unconnected bridge server whose browser and CDP proxy share one session owner. */
export async function startManagedCdpBridge(
  options: StartBridgeOptions,
  cdp: CdpEndpointConfig,
  allocator = createCdpAllocator(cdp),
): Promise<BridgeServer> {
  let runtime: BridgeRuntime | undefined;
  const sessionOwner: { current: ManagedCdpSession | undefined } = { current: undefined };
  let upstreamClient: Client | undefined;
  let toolListChangedHandler: (() => Promise<void>) | undefined;

  const notifyToolListChanged = (): void => {
    void toolListChangedHandler?.().catch(() => undefined);
  };

  const session = await startManagedCdpSession({
    createProxy: async () =>
      await startCdpHttpProxy({
        advertisedHost: cdp.advertisedHost,
        advertisedScheme: cdp.advertisedScheme,
        allocator,
        beforeForward: async (signal) =>
          sessionOwner.current === undefined ? false : await sessionOwner.current.probeGeneration(signal),
        bindHost: cdp.bindHost,
        onActivity: () => options.onCdpActivity?.(),
        onBrowserLoss: () => sessionOwner.current?.invalidateGeneration(),
        onSecurityRejections: options.onCdpSecurityRejections,
      }),
    reserveInternalPort: async () => await reserveInternalCdpPort(),
    prepareRuntime: async ({ internalPort }) => {
      const prepared = await prepareBridgeRuntime({
        ...options.runtimeOptions,
        managedCdpInternalPort: internalPort,
      });
      try {
        await options.beforeConnect?.(prepared);
      } catch (error) {
        prepared.dispose();
        throw error;
      }
      runtime ??= prepared;
      return prepared;
    },
    connectUpstream: async (prepared, signal) => {
      const owner = await connectManagedUpstream(
        prepared as BridgeRuntime,
        signal,
        () => sessionOwner.current?.invalidateGeneration(),
        async (sourceOwner) => {
          const currentSession = sessionOwner.current;
          if (currentSession === undefined) return;
          const isCurrent = await currentSession.runWithCurrentUpstream(
            async (currentOwner) => currentOwner === sourceOwner,
          );
          if (isCurrent) notifyToolListChanged();
        },
      );
      upstreamClient ??= owner.client;
      return owner;
    },
    createChromiumClient: ({ host, port }) => createChromiumCdpClient(host, port),
    onCleanupError: () => safelyReportCdpCleanupError(options.onCdpCleanupError),
    onStateChange: notifyToolListChanged,
    verifyExternal: async ({ capability, headers, proxy, signal }) =>
      await verifyManagedCdpReadiness(cdp, capability, headers, proxy.port, signal),
  });
  sessionOwner.current = session;

  if (!runtime || !upstreamClient) {
    await session.dispose();
    throw new Error('Managed CDP bridge bootstrap did not retain runtime ownership');
  }

  try {
    return await createBridgeServer({
      ...options,
      cdpInfo: () => createBridgeCdpInfo(cdp, session),
      managedCdpSession: session,
      runtime,
      subscribeManagedToolListChanges: (handler) => {
        toolListChangedHandler = handler;
        return () => {
          if (toolListChangedHandler === handler) toolListChangedHandler = undefined;
        };
      },
      upstreamClient,
    });
  } catch (error) {
    await session.dispose();
    throw error;
  }
}

function createCdpAllocator(cdp: CdpEndpointConfig): CdpPortAllocator {
  if (!cdp.portRange) throw new Error('Managed CDP port range is required');
  return new CdpPortAllocator(cdp.portRange);
}

function createBridgeCdpInfo(cdp: CdpEndpointConfig, session: ManagedCdpSession): BridgeCdpInfo {
  const snapshot = session.snapshot();
  const shared = {
    advertisedHost: cdp.advertisedHost ?? null,
    bindHost: cdp.bindHost,
    enabled: true as const,
    generation: snapshot.generation,
    port: session.externalPort,
  };
  return snapshot.state === 'ready'
    ? {
        ...shared,
        activeConnections: session.activeConnections,
        discoveryUrl: snapshot.discoveryUrl,
        state: 'ready',
      }
    : {
        ...shared,
        activeConnections: 0,
        discoveryUrl: null,
        state: 'unavailable',
      };
}

async function verifyManagedCdpReadiness(
  cdp: CdpEndpointConfig,
  capability: string,
  headers: Readonly<Record<string, string>>,
  port: number,
  signal: AbortSignal,
): Promise<string> {
  const directHost = cdp.bindHost === '0.0.0.0' ? '127.0.0.1' : cdp.bindHost === '::' ? '::1' : cdp.bindHost;
  const advertisedHost = cdp.advertisedHost ?? cdp.bindHost;
  const payload = await requestManagedCdpDiscovery({
    capability,
    connectHost: directHost,
    headers,
    hostHeader: formatCdpAuthority(advertisedHost, port),
    port,
    signal,
  });
  if (typeof payload.webSocketDebuggerUrl !== 'string') {
    throw new Error('Managed CDP external readiness returned no browser WebSocket URL');
  }
  const parsed = new URL(payload.webSocketDebuggerUrl);
  const discoveryUrl = createCdpDiscoveryUrl({
    capability,
    host: advertisedHost,
    port,
    scheme: cdp.advertisedScheme,
  });
  const expectedAuthority = new URL(discoveryUrl);
  if (
    parsed.protocol !== `${websocketSchemeFor(cdp.advertisedScheme)}:` ||
    parsed.hostname !== expectedAuthority.hostname ||
    effectiveUrlPort(parsed) !== port ||
    !parsed.pathname.startsWith(`/cdp/${capability}/devtools/browser/`)
  ) {
    throw new Error('Managed CDP external readiness returned unusable discovery');
  }
  return discoveryUrl;
}

async function requestManagedCdpDiscovery(options: {
  capability: string;
  connectHost: string;
  headers: Readonly<Record<string, string>>;
  hostHeader: string;
  port: number;
  signal: AbortSignal;
}): Promise<{ webSocketDebuggerUrl?: unknown }> {
  return await new Promise((resolve, reject) => {
    const request = createHttpRequest(
      {
        host: options.connectHost,
        port: options.port,
        method: 'GET',
        path: `/cdp/${options.capability}/json/version/`,
        headers: { ...options.headers, Host: options.hostHeader },
        signal: options.signal,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.once('error', reject);
        response.once('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error('Managed CDP external readiness failed'));
            return;
          }
          try {
            resolve(
              JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
                webSocketDebuggerUrl?: unknown;
              },
            );
          } catch {
            reject(new Error('Managed CDP external readiness returned invalid JSON'));
          }
        });
      },
    );
    request.once('error', reject);
    request.end();
  });
}

function listUpstreamTools(
  cache: Map<string, Promise<ListToolsResult>>,
  params: ListToolsRequest['params'],
  fetchTools: () => Promise<ListToolsResult>,
): Promise<ListToolsResult> {
  const cacheKey = params?.cursor ?? '';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pending = fetchTools().then(
    (result) => result as ListToolsResult,
    (error: unknown) => {
      cache.delete(cacheKey);
      throw error;
    },
  );
  cache.set(cacheKey, pending);
  return pending;
}

interface ManagedConnectedUpstream extends ManagedCdpUpstreamOwner {
  readonly client: Client;
  readonly transport: StdioClientTransport;
}

async function connectManagedUpstream(
  runtime: BridgeRuntime,
  signal: AbortSignal,
  onClose?: () => void,
  onToolListChanged?: (owner: ManagedCdpUpstreamOwner) => Promise<void>,
): Promise<ManagedConnectedUpstream> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolvePlaywrightMcpCliPath(), '--config', runtime.configPath],
    env: runtime.childEnv,
    stderr: 'inherit',
  });
  const client = new Client({
    name: `${PROJECT_METADATA.mcpName}-upstream-client`,
    version: PROJECT_METADATA.version,
  });
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closePromise ??= closeManagedUpstream(client, transport);
    return closePromise;
  };
  const onAbort = (): void => {
    void close().catch(() => undefined);
  };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal.aborted) throw new Error('Managed CDP upstream connection cancelled');
    await client.connect(transport, { signal });
    const clientOnClose = transport.onclose;
    transport.onclose = () => {
      clientOnClose?.();
      try {
        onClose?.();
      } catch {
        // Lifecycle observers cannot alter transport shutdown.
      }
    };
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Managed upstream connection cleanup failed', {
        cause: cleanupError,
      });
    }
    throw error;
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
  const owner: ManagedConnectedUpstream = {
    callTool: async (name: string, arguments_: Record<string, unknown>) =>
      await client.callTool({ name, arguments: arguments_ }),
    client,
    dispose: close,
    listTools: async (params?: unknown) => await client.listTools(params as ListToolsRequest['params']),
    transport,
  };
  client.setNotificationHandler(ToolListChangedNotificationSchema, async () => {
    try {
      await onToolListChanged?.(owner);
    } catch {
      // Upstream notification observers never alter the originating tool call.
    }
  });
  return owner;
}

function isBrowserTool(name: string): boolean {
  return name.startsWith('browser_') || name.startsWith('webmcp_');
}

function filterManagedDynamicTools(
  result: ListToolsResult,
  before: ReturnType<ManagedCdpSession['snapshot']> | undefined,
  after: ReturnType<ManagedCdpSession['snapshot']> | undefined,
): ListToolsResult {
  if (
    before === undefined ||
    after === undefined ||
    (before.state === 'ready' && after.state === 'ready' && before.generation === after.generation)
  ) {
    return result;
  }
  return {
    ...result,
    tools: result.tools.filter((tool) => !tool.name.startsWith('webmcp_')),
  };
}

async function closeManagedUpstream(client: Client, transport: StdioClientTransport): Promise<void> {
  try {
    await client.close();
  } catch (clientError) {
    try {
      await transport.close();
    } catch (transportError) {
      throw new AggregateError([clientError, transportError], 'Managed upstream transport cleanup failed', {
        cause: transportError,
      });
    }
  }
}

async function connectUpstream(runtime: BridgeRuntime): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolvePlaywrightMcpCliPath(), '--config', runtime.configPath],
    env: runtime.childEnv,
    stderr: 'inherit',
  });
  const client = new Client({
    name: `${PROJECT_METADATA.mcpName}-upstream-client`,
    version: PROJECT_METADATA.version,
  });
  await client.connect(transport);
  return client;
}

function createServerInfo(serverInfo?: Partial<Implementation>): Implementation {
  return {
    name: PROJECT_METADATA.mcpName,
    title: PROJECT_METADATA.title,
    version: PROJECT_METADATA.version,
    description: PROJECT_METADATA.description,
    websiteUrl: PROJECT_METADATA.websiteUrl,
    icons: PROJECT_METADATA.icons,
    ...serverInfo,
  };
}
