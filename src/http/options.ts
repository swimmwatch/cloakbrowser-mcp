export const BRIDGE_TRANSPORT_STDIO = 'stdio' as const;
export const BRIDGE_TRANSPORT_STREAMABLE_HTTP = 'streamable-http' as const;
export const HTTP_PROTOCOL_HTTP = 'http' as const;
export const HTTP_PROTOCOL_HTTPS = 'https' as const;
export const HTTP_SESSION_BACKEND_MEMORY = 'memory' as const;
export const HEALTHZ_PATH = '/healthz' as const;
export const READYZ_PATH = '/readyz' as const;

export type BridgeTransportMode = typeof BRIDGE_TRANSPORT_STDIO | typeof BRIDGE_TRANSPORT_STREAMABLE_HTTP;
export type HttpProtocol = typeof HTTP_PROTOCOL_HTTP | typeof HTTP_PROTOCOL_HTTPS;
export type HttpSessionBackend = typeof HTTP_SESSION_BACKEND_MEMORY;

export const bridgeTransportModes = [
  BRIDGE_TRANSPORT_STDIO,
  BRIDGE_TRANSPORT_STREAMABLE_HTTP,
] as const satisfies readonly BridgeTransportMode[];
export const httpProtocols = [
  HTTP_PROTOCOL_HTTP,
  HTTP_PROTOCOL_HTTPS,
] as const satisfies readonly HttpProtocol[];
export const httpSessionBackends = [
  HTTP_SESSION_BACKEND_MEMORY,
] as const satisfies readonly HttpSessionBackend[];
export const streamableHttpProbePaths = [HEALTHZ_PATH, READYZ_PATH] as const;

export interface StreamableHttpTlsOptions {
  cert?: string;
  key?: string;
  pfx?: string;
  passphrase?: string;
}

export interface StreamableHttpOptions {
  protocol: HttpProtocol;
  host: string;
  port: number;
  endpoint: string;
  authToken?: string;
  tls: StreamableHttpTlsOptions;
  sessionBackend: HttpSessionBackend;
  sessionIdleTtlMs: number;
  sessionMax: number;
  bodyLimitBytes: number;
}

export interface BridgeOptions {
  geoipProxyMatch: boolean;
}

export interface CliOptions {
  transport: BridgeTransportMode;
  bridge: BridgeOptions;
  http: StreamableHttpOptions;
}

export const defaultBridgeOptions: BridgeOptions = {
  geoipProxyMatch: false,
};

export const defaultStreamableHttpOptions: StreamableHttpOptions = {
  protocol: HTTP_PROTOCOL_HTTP,
  host: '127.0.0.1',
  port: 3000,
  endpoint: '/mcp',
  tls: {},
  sessionBackend: HTTP_SESSION_BACKEND_MEMORY,
  sessionIdleTtlMs: 3_600_000,
  sessionMax: 32,
  bodyLimitBytes: 1_048_576,
};
