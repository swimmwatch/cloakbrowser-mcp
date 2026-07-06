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

const emptyInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

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
  });
}

function jsonResult(value: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}
