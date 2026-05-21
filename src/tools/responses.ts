import type { ToolContent, ToolResult } from './types.js';

export function textResult(text: string, structured?: Record<string, unknown>): ToolResult {
  const r: ToolResult = { content: [{ type: 'text', text }] };
  if (structured) r.structuredContent = structured;
  return r;
}

export function jsonResult(value: unknown): ToolResult {
  const text = JSON.stringify(value, null, 2);
  return { content: [{ type: 'text', text }], structuredContent: { value } as Record<string, unknown> };
}

export function errorResult(message: string, code: string, details?: Record<string, unknown>): ToolResult {
  const payload = { error: { code, message, ...(details ? { details } : {}) } };
  const content: ToolContent[] = [{ type: 'text', text: JSON.stringify(payload, null, 2) }];
  return { content, isError: true, structuredContent: payload };
}
