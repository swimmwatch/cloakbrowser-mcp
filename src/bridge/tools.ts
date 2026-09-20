import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { type BridgeRuntime, getCurrentCloakBinaryInfo } from '#src/bridge/config';
import {
  CLOAKBROWSER_TOOL_COUNT,
  PLAYWRIGHT_MCP_BROWSER_TOOL_COUNT,
  PLAYWRIGHT_MCP_PACKAGE,
  PLAYWRIGHT_MCP_VERSION,
  PROJECT_METADATA,
} from '#src/project/metadata';

export const LOCAL_TOOL_BINARY_INFO = 'cloakbrowser_binary_info' as const;
export const LOCAL_TOOL_BRIDGE_INFO = 'cloakbrowser_bridge_info' as const;
export const localToolNames = [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO] as const;
const localToolNameSet = new Set<string>(localToolNames);

export type LocalToolName = (typeof localToolNames)[number];

export type BridgeCdpInfo =
  | { enabled: false }
  | {
      activeConnections: number;
      advertisedHost: string | null;
      bindHost: string;
      discoveryUrl: string;
      enabled: true;
      generation: number;
      port: number;
      state: 'ready';
    }
  | {
      activeConnections: 0;
      advertisedHost: string | null;
      bindHost: string;
      discoveryUrl: null;
      enabled: true;
      generation: number;
      port: number;
      state: 'unavailable';
    };

const emptyInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

const bridgeInfoOutputSchema: NonNullable<Tool['outputSchema']> = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    title: { type: 'string' },
    version: { type: 'string' },
    runtime: { type: 'string' },
    browserEngine: { enum: ['cloak', 'playwright'] },
    upstream: {
      type: 'object',
      properties: {
        package: { type: 'string' },
        version: { type: 'string' },
        toolCount: { type: 'integer', minimum: 0 },
      },
      required: ['package', 'version', 'toolCount'],
      additionalProperties: false,
    },
    localTools: {
      type: 'object',
      properties: {
        toolCount: { type: 'integer', minimum: 0 },
        names: { type: 'array', items: { type: 'string' } },
      },
      required: ['toolCount', 'names'],
      additionalProperties: false,
    },
    cdp: {
      anyOf: [
        {
          type: 'object',
          properties: { enabled: { const: false } },
          required: ['enabled'],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: {
            enabled: { const: true },
            state: { const: 'ready' },
            generation: { type: 'integer', minimum: 1 },
            bindHost: { type: 'string' },
            port: { type: 'integer', minimum: 1, maximum: 65_535 },
            advertisedHost: { type: ['string', 'null'] },
            discoveryUrl: { type: 'string' },
            activeConnections: { type: 'integer', minimum: 0 },
          },
          required: [
            'enabled',
            'state',
            'generation',
            'bindHost',
            'port',
            'advertisedHost',
            'discoveryUrl',
            'activeConnections',
          ],
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: {
            enabled: { const: true },
            state: { const: 'unavailable' },
            generation: { type: 'integer', minimum: 1 },
            bindHost: { type: 'string' },
            port: { type: 'integer', minimum: 1, maximum: 65_535 },
            advertisedHost: { type: ['string', 'null'] },
            discoveryUrl: { type: 'null' },
            activeConnections: { const: 0 },
          },
          required: [
            'enabled',
            'state',
            'generation',
            'bindHost',
            'port',
            'advertisedHost',
            'discoveryUrl',
            'activeConnections',
          ],
          additionalProperties: false,
        },
      ],
    },
  },
  required: ['name', 'title', 'version', 'runtime', 'browserEngine', 'upstream', 'localTools', 'cdp'],
  additionalProperties: false,
};

const localTools: Tool[] = [
  {
    name: LOCAL_TOOL_BINARY_INFO,
    title: 'CloakBrowser binary info',
    description: 'Return CloakBrowser package, cache, platform, and resolved browser binary information.',
    inputSchema: emptyInputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: LOCAL_TOOL_BRIDGE_INFO,
    title: 'CloakBrowser bridge info',
    description: 'Return runtime metadata for the CloakBrowser bridge over upstream Playwright MCP.',
    inputSchema: emptyInputSchema,
    outputSchema: bridgeInfoOutputSchema,
    annotations: {
      readOnlyHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

export function createLocalTools(): Tool[] {
  return localTools;
}

export function isLocalTool(name: string): name is LocalToolName {
  return localToolNameSet.has(name);
}

export function callLocalTool(
  name: LocalToolName,
  runtime: BridgeRuntime,
  upstreamToolCount: number,
  cdp: BridgeCdpInfo = { enabled: false },
): CallToolResult {
  if (name === LOCAL_TOOL_BINARY_INFO) {
    return jsonResult({
      browserEngine: runtime.browserEngine,
      executablePath: runtime.cloakBinaryPath ?? null,
      outputDir: runtime.outputDir,
      binary: getCurrentCloakBinaryInfo(),
    });
  }

  return jsonResult({
    name: PROJECT_METADATA.mcpName,
    title: PROJECT_METADATA.title,
    version: PROJECT_METADATA.version,
    runtime: 'playwright-mcp-bridge',
    browserEngine: runtime.browserEngine,
    upstream: {
      package: PLAYWRIGHT_MCP_PACKAGE,
      version: PLAYWRIGHT_MCP_VERSION,
      toolCount: upstreamToolCount || PLAYWRIGHT_MCP_BROWSER_TOOL_COUNT,
    },
    localTools: {
      toolCount: CLOAKBROWSER_TOOL_COUNT,
      names: localToolNames,
    },
    cdp,
  });
}

function jsonResult(value: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}
