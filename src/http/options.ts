import type { HumanPreset } from '#src/bridge/config';
import { type LoggingOptions } from '#src/logging/options';

export const BRIDGE_TRANSPORT_STDIO = 'stdio' as const;
export const BRIDGE_TRANSPORT_STREAMABLE_HTTP = 'streamable-http' as const;
export const HTTP_PROTOCOL_HTTP = 'http' as const;
export const HTTP_PROTOCOL_HTTPS = 'https' as const;
export const HTTP_SESSION_BACKEND_MEMORY = 'memory' as const;
export const HTTP_SESSION_BACKEND_REDIS = 'redis' as const;
export const HEALTHZ_PATH = '/healthz' as const;
export const READYZ_PATH = '/readyz' as const;

export type BridgeTransportMode = typeof BRIDGE_TRANSPORT_STDIO | typeof BRIDGE_TRANSPORT_STREAMABLE_HTTP;
export type HttpProtocol = typeof HTTP_PROTOCOL_HTTP | typeof HTTP_PROTOCOL_HTTPS;
export type HttpSessionBackend =
  | typeof HTTP_SESSION_BACKEND_MEMORY
  | typeof HTTP_SESSION_BACKEND_REDIS;

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
  HTTP_SESSION_BACKEND_REDIS,
] as const satisfies readonly HttpSessionBackend[];
export const streamableHttpProbePaths = [HEALTHZ_PATH, READYZ_PATH] as const;

export interface StreamableHttpTlsOptions {
  cert?: string;
  key?: string;
  pfx?: string;
  passphrase?: string;
}

export interface StreamableHttpRedisOptions {
  url?: string;
  keyPrefix?: string;
  connectTimeoutMs: number;
  operationTimeoutMs: number;
  caFile?: string;
  certFile?: string;
  keyFile?: string;
}

export interface StreamableHttpPeerOptions {
  host: string;
  port: number;
  advertiseHost?: string;
  routingToken?: string;
}

export interface StreamableHttpMetricsOptions {
  enabled: boolean;
  host: string;
  port: number;
  endpoint: string;
  authToken?: string;
}

export interface StreamableHttpArtifactOptions {
  root?: string;
  profilesRoot?: string;
  extensionsRoot?: string;
  maxFiles: number;
  retentionMs: number;
  cleanupIntervalMs: number;
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
  sessionDrainTimeoutMs: number;
  sessionInstanceId?: string;
  sessionOwnerName?: string;
  redis: StreamableHttpRedisOptions;
  peer: StreamableHttpPeerOptions;
  metrics: StreamableHttpMetricsOptions;
  artifacts: StreamableHttpArtifactOptions;
  bodyLimitBytes: number;
}

export interface BridgeOptions {
  geoipProxyMatch: boolean;
  humanize: boolean;
  humanPreset: HumanPreset;
}

export interface CliOptions {
  transport: BridgeTransportMode;
  bridge: BridgeOptions;
  http: StreamableHttpOptions;
  logging: LoggingOptions;
}

export const defaultBridgeOptions: BridgeOptions = {
  geoipProxyMatch: false,
  humanize: false,
  humanPreset: 'default',
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
  sessionDrainTimeoutMs: 300_000,
  redis: {
    connectTimeoutMs: 5_000,
    operationTimeoutMs: 2_000,
  },
  peer: {
    host: '127.0.0.1',
    port: 3001,
  },
  metrics: {
    enabled: false,
    host: '127.0.0.1',
    port: 9090,
    endpoint: '/metrics',
  },
  artifacts: {
    maxFiles: 1_000,
    retentionMs: 86_400_000,
    cleanupIntervalMs: 300_000,
  },
  bodyLimitBytes: 1_048_576,
};
