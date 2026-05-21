/**
 * Domain error hierarchy. Mapped to MCP tool responses by the registry.
 */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'CAPABILITY_DENIED'
  | 'ORIGIN_DENIED'
  | 'PATH_DENIED'
  | 'TIMEOUT'
  | 'ASSERTION_FAILED'
  | 'NOT_FOUND'
  | 'BROWSER_UNAVAILABLE'
  | 'BROWSER_CRASHED'
  | 'LIMIT_EXCEEDED'
  | 'UNSUPPORTED'
  | 'INTERNAL';

export class CloakMcpError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CloakMcpError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export const fail = (code: ErrorCode, message: string, details?: Record<string, unknown>): never => {
  throw new CloakMcpError(code, message, details);
};

export const isCloakMcpError = (e: unknown): e is CloakMcpError => e instanceof CloakMcpError;
