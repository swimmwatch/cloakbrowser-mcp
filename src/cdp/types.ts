import type { CdpHttpProxy } from '#src/cdp/httpProxy';

export interface InternalCdpPortReservation {
  readonly host: '127.0.0.1';
  readonly port: number;
  close(): Promise<void>;
}

export interface ChromiumCdpDiscovery {
  browserWebSocketUrl: string;
  pageWebSocketUrl: string;
}

export interface ChromiumCdpClient {
  discover(signal: AbortSignal): Promise<ChromiumCdpDiscovery>;
  probe(signal: AbortSignal): Promise<ChromiumCdpDiscovery>;
  readAndDeleteChallenge(
    pageWebSocketUrl: string,
    propertyName: string,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export interface ManagedCdpRuntimeOwner {
  dispose(): void | Promise<void>;
}

export interface ManagedCdpUpstreamOwner {
  callTool(name: string, arguments_: Record<string, unknown>): Promise<unknown>;
  dispose(): void | Promise<void>;
  listTools(params?: unknown): Promise<unknown>;
}

export interface ManagedCdpReadyGeneration {
  browserWebSocketUrl: string;
  capability: string;
  discoveryUrl: string;
  generation: number;
  state: 'ready';
  upstreamHost: string;
  upstreamPort: number;
}

export type ManagedCdpSessionSnapshot =
  ManagedCdpReadyGeneration | { generation: number; state: 'unavailable' };

export interface ManagedCdpSessionDependencies {
  connectUpstream(runtime: ManagedCdpRuntimeOwner, signal: AbortSignal): Promise<ManagedCdpUpstreamOwner>;
  createCapability?: () => string;
  createChallenge?: () => { propertyName: string; value: string };
  createChromiumClient(input: { host: string; port: number }): ChromiumCdpClient;
  createProxy(signal: AbortSignal): Promise<CdpHttpProxy>;
  initialTimeoutMs?: number;
  onCleanupError?: (error: Error) => void;
  onStateChange?: (snapshot: ManagedCdpSessionSnapshot) => void;
  prepareRuntime(input: { internalPort: number }, signal: AbortSignal): Promise<ManagedCdpRuntimeOwner>;
  reserveInternalPort(signal: AbortSignal): Promise<InternalCdpPortReservation>;
  verifyExternal(input: {
    capability: string;
    headers: Readonly<Record<string, string>>;
    proxy: CdpHttpProxy;
    signal: AbortSignal;
  }): Promise<string>;
}
