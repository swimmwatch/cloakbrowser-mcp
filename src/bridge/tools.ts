import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { getCurrentCloakBinaryInfo, type BridgeRuntime } from './config.js';
import {
  CLOAKBROWSER_TOOL_COUNT,
  PLAYWRIGHT_MCP_BROWSER_TOOL_COUNT,
  PLAYWRIGHT_MCP_PACKAGE,
  PLAYWRIGHT_MCP_VERSION,
  PROJECT_METADATA,
} from '../project/metadata.js';

export const localToolNames = ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'] as const;
const localToolNameSet = new Set<string>(localToolNames);

export type LocalToolName = (typeof localToolNames)[number];

const emptyInputSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} as const;

const localTools: Tool[] = [
  {
    name: 'cloakbrowser_binary_info',
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
    name: 'cloakbrowser_bridge_info',
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
  if (name === 'cloakbrowser_binary_info') {
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
