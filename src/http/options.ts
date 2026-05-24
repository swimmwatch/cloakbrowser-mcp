export type BridgeTransportMode = 'stdio' | 'streamable-http';
export type HttpSessionBackend = 'memory';

export const bridgeTransportModes = [
  'stdio',
  'streamable-http',
] as const satisfies readonly BridgeTransportMode[];
export const httpSessionBackends = ['memory'] as const satisfies readonly HttpSessionBackend[];

export interface StreamableHttpOptions {
  host: string;
  port: number;
  endpoint: string;
  authToken?: string;
  sessionBackend: HttpSessionBackend;
  sessionIdleTtlMs: number;
  sessionMax: number;
  bodyLimitBytes: number;
}

export interface CliOptions {
  transport: BridgeTransportMode;
  http: StreamableHttpOptions;
}

export const defaultStreamableHttpOptions: StreamableHttpOptions = {
  host: '127.0.0.1',
  port: 3000,
  endpoint: '/mcp',
  sessionBackend: 'memory',
  sessionIdleTtlMs: 3_600_000,
  sessionMax: 32,
  bodyLimitBytes: 1_048_576,
};
