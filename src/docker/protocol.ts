export const dockerDisplayEnsureRequestType = 'cloakbrowser-mcp:ensure-display';
export const dockerDisplayEnsureResultType = 'cloakbrowser-mcp:display-result';
export const dockerHealthProbeRequestType = 'cloakbrowser-mcp:health-probe';
export const dockerHealthProbeResultType = 'cloakbrowser-mcp:health-result';

export interface DockerDisplayEnsureRequest {
  readonly requestId: string;
  readonly type: typeof dockerDisplayEnsureRequestType;
}

export interface DockerDisplayEnsureResult {
  readonly display?: string;
  readonly error?: string;
  readonly ok: boolean;
  readonly requestId: string;
  readonly type: typeof dockerDisplayEnsureResultType;
}

export interface DockerHealthProbeRequest {
  readonly nonce: string;
  readonly requestId: string;
  readonly type: typeof dockerHealthProbeRequestType;
}

export interface DockerHealthProbeResult {
  readonly nonce: string;
  readonly processId: number;
  readonly requestId: string;
  readonly type: typeof dockerHealthProbeResultType;
}

export function isDockerDisplayEnsureRequest(value: unknown): value is DockerDisplayEnsureRequest {
  if (!isRecord(value)) return false;
  return value.type === dockerDisplayEnsureRequestType && typeof value.requestId === 'string';
}

export function isDockerDisplayEnsureResult(value: unknown): value is DockerDisplayEnsureResult {
  if (!isRecord(value)) return false;
  if (value.type !== dockerDisplayEnsureResultType || typeof value.requestId !== 'string') return false;
  if (typeof value.ok !== 'boolean') return false;
  if (value.display !== undefined && typeof value.display !== 'string') return false;
  return value.error === undefined || typeof value.error === 'string';
}

export function isDockerHealthProbeRequest(value: unknown): value is DockerHealthProbeRequest {
  if (!isRecord(value)) return false;
  return (
    value.type === dockerHealthProbeRequestType &&
    typeof value.requestId === 'string' &&
    typeof value.nonce === 'string'
  );
}

export function isDockerHealthProbeResult(value: unknown): value is DockerHealthProbeResult {
  if (!isRecord(value)) return false;
  return (
    value.type === dockerHealthProbeResultType &&
    typeof value.requestId === 'string' &&
    typeof value.nonce === 'string' &&
    typeof value.processId === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
