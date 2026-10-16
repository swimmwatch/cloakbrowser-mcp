import { isLoopbackCdpHost, isWildcardCdpHost, validateCdpHost } from '#src/cdp/urls';
export type CdpAdvertisedScheme = 'http' | 'https';
export interface CdpPortRange {
  end: number;
  start: number;
}
export interface CdpEndpointConfig {
  allowRemote: boolean;
  advertisedHost?: string;
  advertisedScheme: CdpAdvertisedScheme;
  bindHost: string;
  portRange?: CdpPortRange;
  processEnabled: boolean;
}
export interface CreateCdpEndpointConfigOptions {
  allowRemote?: boolean;
  advertisedHost?: string;
  advertisedScheme?: string;
  bindHost?: string;
  portRange?: string;
  processEnabled?: boolean;
}
export interface ResolveCdpSettingOptions<T> {
  cliValue?: string;
  defaultValue: T;
  environmentValue?: string;
  parse: (value: string) => T;
}
export interface ResolveCdpBooleanSettingOptions {
  defaultValue: boolean;
  environmentValue?: string;
  label: string;
  negativeCli?: boolean;
  positiveCli?: boolean;
}
export class CdpConfigurationError extends Error {}
const defaultBindHost = '127.0.0.1';
const conflictingRawArguments = [
  '--remote-debugging-port',
  '--remote-debugging-address',
  '--remote-debugging-pipe',
] as const;
export function parseCdpPortRange(value: string): CdpPortRange {
  const match = /^(\d+)(?:-(\d+))?$/u.exec(value);
  if (match === null) throw new CdpConfigurationError('CDP port range is invalid');
  const start = Number(match[1]);
  const computedValue = match[2] ?? match[1];
  const end = Number(computedValue);
  if (!isValidPort(start) || !isValidPort(end) || start > end) {
    throw new CdpConfigurationError('CDP port range must be between 1 and 65535');
  }
  return { end, start };
}
export function parseCdpAdvertisedScheme(value: string): CdpAdvertisedScheme {
  if (value !== 'http' && value !== 'https') {
    throw new CdpConfigurationError('CDP advertised scheme must be "http" or "https"');
  }
  return value;
}
export function resolveCdpSetting<T>(options: ResolveCdpSettingOptions<T>): T {
  const selected = options.cliValue ?? options.environmentValue;
  return selected === undefined ? options.defaultValue : options.parse(selected);
}
export function resolveCdpBooleanSetting(options: ResolveCdpBooleanSettingOptions): boolean {
  if (options.positiveCli === true && options.negativeCli === true) {
    const message = `${options.label} cannot use both positive and negative CLI forms`;
    throw new CdpConfigurationError(message);
  }
  if (options.positiveCli === true) return true;
  if (options.negativeCli === true) return false;
  if (options.environmentValue === undefined) return options.defaultValue;
  const normalized = options.environmentValue.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  const message2 = `${options.label} environment value must be "true" or "false"`;
  throw new CdpConfigurationError(message2);
}
export function resolveCdpSessionEnabled(processEnabled: boolean, sessionOverride?: boolean): boolean {
  return sessionOverride ?? processEnabled;
}
/** Builds and validates the transport-independent managed CDP endpoint settings. */
export function createCdpEndpointConfig(options: CreateCdpEndpointConfigOptions): CdpEndpointConfig {
  const processEnabled = options.processEnabled ?? false;
  const computedValue2 = options.bindHost ?? defaultBindHost;
  const bindHost = validateHost(computedValue2, 'CDP bind host');
  const allowRemote = options.allowRemote ?? false;
  const advertisedHost =
    options.advertisedHost === undefined
      ? undefined
      : validateHost(options.advertisedHost, 'CDP advertised host');
  const computedValue3 = options.advertisedScheme ?? 'http';
  const advertisedScheme = parseCdpAdvertisedScheme(computedValue3);
  const portRange = options.portRange === undefined ? undefined : parseCdpPortRange(options.portRange);
  if (advertisedHost !== undefined && isWildcardCdpHost(advertisedHost)) {
    throw new CdpConfigurationError('CDP advertised host must be concrete');
  }
  if (isWildcardCdpHost(bindHost) && advertisedHost === undefined) {
    throw new CdpConfigurationError('CDP wildcard bind host requires an advertised host');
  }
  if (!isLoopbackCdpHost(bindHost) && !allowRemote) {
    throw new CdpConfigurationError('CDP bind host requires remote access opt-in');
  }
  if (processEnabled && portRange === undefined) {
    throw new CdpConfigurationError('CDP port range is required when managed CDP is enabled');
  }
  const compactEndpointConfigOptions = {
    allowRemote,
    advertisedHost,
    advertisedScheme,
    bindHost,
    portRange,
    processEnabled,
  } as const;
  return compactEndpointConfig(compactEndpointConfigOptions);
}
export function validateManagedCdpLaunchArgs(args: readonly string[], enabled: boolean): void {
  if (!enabled) return;
  for (const argument of args) {
    const conflict = conflictingRawArguments.find(
      (flag) =>
        argument === flag ||
        (() => {
          const message3 = `${flag}=`;
          return argument.startsWith(message3);
        })(),
    );
    if (conflict !== undefined) {
      const message4 = `Managed CDP conflicts with ${conflict}`;
      throw new CdpConfigurationError(message4);
    }
  }
}
function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}
function validateHost(host: string, label: string): string {
  try {
    return validateCdpHost(host, label);
  } catch {
    const message5 = `${label} is invalid`;
    throw new CdpConfigurationError(message5);
  }
}
function compactEndpointConfig(config: {
  allowRemote: boolean;
  advertisedHost: string | undefined;
  advertisedScheme: CdpAdvertisedScheme;
  bindHost: string;
  portRange: CdpPortRange | undefined;
  processEnabled: boolean;
}): CdpEndpointConfig {
  return {
    allowRemote: config.allowRemote,
    ...(config.advertisedHost === undefined ? {} : { advertisedHost: config.advertisedHost }),
    advertisedScheme: config.advertisedScheme,
    bindHost: config.bindHost,
    ...(config.portRange === undefined ? {} : { portRange: config.portRange }),
    processEnabled: config.processEnabled,
  };
}
