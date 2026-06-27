import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  CallToolRequestSchema,
  type CallToolResult,
  type Implementation,
  type ListToolsResult,
  type ListToolsRequest,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  prepareBridgeRuntime,
  type BridgeRuntime,
  type PrepareBridgeRuntimeOptions,
} from '#src/bridge/config';
import { resolvePlaywrightMcpCliPath } from '#src/bridge/paths';
import { callLocalTool, createLocalTools, isLocalTool } from '#src/bridge/tools';
import { MCP_SERVER_INSTRUCTIONS, PROJECT_METADATA } from '#src/project/metadata';

export interface StartBridgeOptions {
  serverInfo?: Partial<Implementation>;
  runtimeOptions?: Pick<
    PrepareBridgeRuntimeOptions,
    'browserIsolated' | 'geoipProxyMatch' | 'headless' | 'humanize' | 'humanPreset' | 'proxy'
  >;
  transport?: Transport;
}

export interface BridgeServerOptions extends StartBridgeOptions {
  runtime?: BridgeRuntime;
  upstreamClient?: Client;
}

export interface BridgeServer {
  server: Server;
  runtime: BridgeRuntime;
  start(transport?: Transport): Promise<void>;
  dispose(): Promise<void>;
}

export async function startBridge(options: StartBridgeOptions = {}): Promise<BridgeServer> {
  const bridge = await createBridgeServer(options);
  await bridge.start(options.transport);
  return bridge;
}

export async function createBridgeServer(options: BridgeServerOptions = {}): Promise<BridgeServer> {
  const runtime = options.runtime ?? (await prepareBridgeRuntime(options.runtimeOptions));
  const upstreamClient = options.upstreamClient ?? (await connectUpstream(runtime));
  const localTools = createLocalTools();
  const upstreamToolCache = new Map<string, Promise<ListToolsResult>>();
  let upstreamToolCount = 0;

  const server = new Server(createServerInfo(options.serverInfo), {
    capabilities: { tools: {} },
    instructions: MCP_SERVER_INSTRUCTIONS,
  });

  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const upstream = await listUpstreamTools(upstreamClient, upstreamToolCache, request.params);
    upstreamToolCount = Math.max(upstreamToolCount, upstream.tools.length);
    if (request.params?.cursor) return upstream;
    return {
      ...upstream,
      tools: [...upstream.tools, ...localTools],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (isLocalTool(request.params.name)) {
      return callLocalTool(request.params.name, runtime, upstreamToolCount);
    }
    return (await upstreamClient.callTool(request.params)) as CallToolResult;
  });

  return {
    server,
    runtime,
    async start(transport) {
      await server.connect(transport ?? new StdioServerTransport());
    },
    async dispose() {
      await Promise.allSettled([upstreamClient.close(), server.close()]);
      runtime.dispose();
    },
  };
}

function listUpstreamTools(
  upstreamClient: Client,
  cache: Map<string, Promise<ListToolsResult>>,
  params: ListToolsRequest['params'],
): Promise<ListToolsResult> {
  const cacheKey = params?.cursor ?? '';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pending = upstreamClient.listTools(params).then(
    (result) => result as ListToolsResult,
    (error: unknown) => {
      cache.delete(cacheKey);
      throw error;
    },
  );
  cache.set(cacheKey, pending);
  return pending;
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
