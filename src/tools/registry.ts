import { z } from 'zod';
import { CloakMcpError, isCloakMcpError } from '@/errors/index.js';
import { requireCapabilities } from '@/security/capabilities.js';
import { errorResult } from './responses.js';
import {
  FORBIDDEN_TOOL_NAMES,
  type ToolAnnotations,
  type ToolContext,
  type ToolDefinition,
  type ToolResult,
} from './types.js';

export interface RegistryEntry {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  annotations: ToolAnnotations | undefined;
  capabilities: readonly string[];
}

/**
 * Tool registry. Validates input via Zod, enforces capability gates, and maps
 * thrown errors into structured tool error responses.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  constructor(private readonly ctx: ToolContext) {}

  register<S extends z.ZodTypeAny>(def: ToolDefinition<S>): void {
    if (FORBIDDEN_TOOL_NAMES.includes(def.name)) {
      throw new CloakMcpError('UNSUPPORTED', `tool "${def.name}" is permanently disabled`);
    }
    if (this.tools.has(def.name)) {
      throw new CloakMcpError('INVALID_INPUT', `duplicate tool name: ${def.name}`);
    }
    // Skip registration if a required capability is disabled.
    if (def.capabilities && def.capabilities.length > 0) {
      const missing = def.capabilities.filter((c) => !this.ctx.config.capabilities[c]);
      if (missing.length > 0) {
        this.ctx.logger.debug('tool skipped: capability disabled', { tool: def.name, missing });
        return;
      }
    }
    this.tools.set(def.name, def as unknown as ToolDefinition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
  size(): number {
    return this.tools.size;
  }
  list(): RegistryEntry[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
      capabilities: (t.capabilities ?? []) as readonly string[],
    }));
  }

  async call(name: string, rawInput: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return errorResult(`unknown tool: ${name}`, 'NOT_FOUND');
    }
    try {
      if (tool.capabilities && tool.capabilities.length > 0) {
        requireCapabilities(this.ctx.config.capabilities, tool.capabilities);
      }
      const parsed = tool.inputSchema.safeParse(rawInput ?? {});
      if (!parsed.success) {
        return errorResult('invalid input', 'INVALID_INPUT', {
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        });
      }
      return await tool.handler(parsed.data, this.ctx);
    } catch (e: unknown) {
      if (isCloakMcpError(e)) {
        return errorResult(e.message, e.code, e.details);
      }
      this.ctx.logger.error('tool handler threw', { tool: name, error: (e as Error).message });
      return errorResult((e as Error).message || 'internal error', 'INTERNAL');
    }
  }
}
