import type { z } from 'zod';
import type { ArtifactManager } from '@/artifacts/manager.js';
import type { SessionManager } from '@/browser/sessionManager.js';
import type { ResolvedConfig } from '@/config/schema.js';
import type { CapabilityKey } from '@/config/schema.js';
import type { Logger } from '@/logging/logger.js';

export interface ToolContext {
  config: ResolvedConfig;
  session: SessionManager;
  artifacts: ArtifactManager;
  logger: Logger;
}

export interface ToolContent {
  type: 'text';
  text: string;
}

export interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: S;
  /**
   * Capabilities that MUST be enabled for this tool to be registered.
   * If empty, the tool is always available.
   */
  capabilities?: readonly CapabilityKey[];
  annotations?: ToolAnnotations;
  handler: (input: z.output<S>, ctx: ToolContext) => Promise<ToolResult>;
}

/**
 * Names that are permanently forbidden — registry refuses to register them
 * regardless of config. Keep this list limited to non-Playwright aliases or
 * project-specific names that should never become part of the supported API.
 */
export const FORBIDDEN_TOOL_NAMES: readonly string[] = Object.freeze([
  'browser_eval',
  'cloakbrowser_evaluate',
]);
