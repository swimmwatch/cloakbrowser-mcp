import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ArtifactManager } from './artifacts/manager.js';
import type { BrowserAdapter } from './browser/adapter.js';
import { CloakBrowserAdapter } from './browser/cloakAdapter.js';
import { SessionManager } from './browser/sessionManager.js';
import { DEFAULT_CONFIG, type ResolvedConfig } from './config/schema.js';
import { createLogger, type Logger } from './logging/logger.js';
import { MCP_SERVER_INSTRUCTIONS, PROJECT_METADATA } from './project/metadata.js';
import { ToolRegistry } from './tools/registry.js';
import { registerMvpTools } from './tools/index.js';
import type { ToolContext } from './tools/types.js';

export interface CreateServerOptions {
  config?: ResolvedConfig;
  /** Inject a custom adapter (mock for tests, custom backend, etc). */
  adapter?: BrowserAdapter;
  logger?: Logger;
  serverInfo?: Partial<Implementation>;
  instructions?: string;
}

export interface CreatedServer {
  server: McpServer;
  registry: ToolRegistry;
  session: SessionManager;
  context: ToolContext;
  start(transport?: Transport): Promise<void>;
  dispose(): Promise<void>;
}

/**
 * Build a configured MCP server with the MVP tool surface registered.
 * Does not start any transport — call `.start()` for stdio or wire a custom one.
 */
export function createServer(opts: CreateServerOptions = {}): CreatedServer {
  const config: ResolvedConfig = opts.config ?? DEFAULT_CONFIG;
  const logger = opts.logger ?? createLogger(config.logLevel);
  const adapter: BrowserAdapter = opts.adapter ?? new CloakBrowserAdapter(config);
  const session = new SessionManager(adapter, config);
  const artifacts = new ArtifactManager(config.outputDir);

  const ctx: ToolContext = { config, session, artifacts, logger };
  const registry = new ToolRegistry(ctx);
  registerMvpTools(registry);

  const serverInfo: Implementation = {
    name: PROJECT_METADATA.mcpName,
    title: PROJECT_METADATA.title,
    version: PROJECT_METADATA.version,
    description: PROJECT_METADATA.description,
    websiteUrl: PROJECT_METADATA.websiteUrl,
    icons: PROJECT_METADATA.icons,
    ...opts.serverInfo,
  };

  const server = new McpServer(serverInfo, {
    instructions: opts.instructions ?? MCP_SERVER_INSTRUCTIONS,
  });

  for (const entry of registry.list()) {
    const shape =
      entry.inputSchema instanceof z.ZodObject
        ? (entry.inputSchema._def.shape() as Record<string, z.ZodTypeAny>)
        : {};
    server.registerTool(
      entry.name,
      {
        description: entry.description,
        inputSchema: shape,
        annotations: {
          title: entry.annotations?.title ?? toolTitle(entry.name),
          ...(entry.annotations ?? {}),
        },
      },
      async (input: unknown) => {
        const result = await registry.call(entry.name, input);
        const out: {
          content: { type: 'text'; text: string }[];
          isError?: boolean;
          structuredContent?: Record<string, unknown>;
        } = {
          content: result.content,
        };
        if (result.isError) out.isError = true;
        if (result.structuredContent) out.structuredContent = result.structuredContent;
        return out;
      },
    );
  }

  logger.info('mcp server prepared', {
    name: serverInfo.name,
    version: serverInfo.version,
    tools: registry.size(),
  });

  return {
    server,
    registry,
    session,
    context: ctx,
    async start(transport) {
      const t = transport ?? new StdioServerTransport();
      await server.connect(t);
      logger.info('mcp server connected', { transport: t.constructor.name });
    },
    async dispose() {
      try {
        await session.shutdown();
      } catch (e) {
        logger.warn('session shutdown error', { error: (e as Error).message });
      }
      try {
        await server.close();
      } catch (e) {
        logger.warn('mcp server close error', { error: (e as Error).message });
      }
    },
  };
}

function toolTitle(name: string): string {
  return name
    .split('_')
    .map((part) => (part === 'mcp' ? 'MCP' : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}
