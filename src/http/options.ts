import { envString, type EnvReader } from '../bridge/env.js';

export type BridgeTransportMode = 'stdio' | 'streamable-http';
export type HttpSessionBackend = 'memory';

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

export function parseCliOptions(args: readonly string[], env: EnvReader = process.env): CliOptions {
  const options: CliOptions = {
    transport: parseTransportMode(
      envString(env, 'CLOAK_PLAYWRIGHT_MCP_TRANSPORT', 'stdio'),
      'CLOAK_PLAYWRIGHT_MCP_TRANSPORT',
    ),
    http: {
      host: envString(env, 'CLOAK_PLAYWRIGHT_MCP_HTTP_HOST', defaultStreamableHttpOptions.host),
      port: parseIntegerValue(
        'CLOAK_PLAYWRIGHT_MCP_HTTP_PORT',
        envString(env, 'CLOAK_PLAYWRIGHT_MCP_HTTP_PORT', String(defaultStreamableHttpOptions.port)),
      ),
      endpoint: envString(env, 'CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT', defaultStreamableHttpOptions.endpoint),
      authToken: optionalString(env.CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN),
      sessionBackend: parseSessionBackend(
        envString(
          env,
          'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND',
          defaultStreamableHttpOptions.sessionBackend,
        ),
        'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND',
      ),
      sessionIdleTtlMs: parseIntegerValue(
        'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS',
        envString(
          env,
          'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS',
          String(defaultStreamableHttpOptions.sessionIdleTtlMs),
        ),
      ),
      sessionMax: parseIntegerValue(
        'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX',
        envString(
          env,
          'CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX',
          String(defaultStreamableHttpOptions.sessionMax),
        ),
      ),
      bodyLimitBytes: defaultStreamableHttpOptions.bodyLimitBytes,
    },
  };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index]!;
    const [flag, inlineValue] = splitFlag(current);
    if (!flag.startsWith('--')) throw new Error(`Unsupported argument "${current}"`);

    switch (flag) {
      case '--transport':
        options.transport = parseTransportMode(readFlagValue(flag, inlineValue, args, index), flag);
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-host':
        options.http.host = readFlagValue(flag, inlineValue, args, index);
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-port':
        options.http.port = parseIntegerFlag(flag, readFlagValue(flag, inlineValue, args, index));
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-endpoint':
        options.http.endpoint = readFlagValue(flag, inlineValue, args, index);
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-auth-token':
        options.http.authToken = readFlagValue(flag, inlineValue, args, index);
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-session-backend':
        options.http.sessionBackend = parseSessionBackend(
          readFlagValue(flag, inlineValue, args, index),
          flag,
        );
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-session-idle-ttl-ms':
        options.http.sessionIdleTtlMs = parseIntegerFlag(flag, readFlagValue(flag, inlineValue, args, index));
        if (inlineValue === undefined) index += 1;
        break;
      case '--http-session-max':
        options.http.sessionMax = parseIntegerFlag(flag, readFlagValue(flag, inlineValue, args, index));
        if (inlineValue === undefined) index += 1;
        break;
      default:
        throw new Error(`Unsupported argument "${flag}"`);
    }
  }

  return validateCliOptions(options);
}

function validateCliOptions(options: CliOptions): CliOptions {
  if (!options.http.host.trim()) throw new Error('HTTP host must not be empty');
  if (!Number.isInteger(options.http.port) || options.http.port < 0 || options.http.port > 65_535) {
    throw new Error('HTTP port must be an integer between 0 and 65535');
  }
  if (
    !options.http.endpoint.startsWith('/') ||
    options.http.endpoint.includes('?') ||
    options.http.endpoint.includes('#')
  ) {
    throw new Error('HTTP endpoint must be an absolute path such as "/mcp"');
  }
  if (options.http.endpoint.length > 1 && options.http.endpoint.endsWith('/')) {
    throw new Error('HTTP endpoint must not end with "/"');
  }
  if (options.http.authToken !== undefined && !options.http.authToken.trim()) {
    throw new Error('HTTP auth token must not be empty');
  }
  if (options.http.sessionIdleTtlMs <= 0) {
    throw new Error('HTTP session idle TTL must be greater than 0');
  }
  if (options.http.sessionMax <= 0) {
    throw new Error('HTTP session max must be greater than 0');
  }
  return options;
}

function parseTransportMode(value: string, source: string): BridgeTransportMode {
  if (value === 'stdio' || value === 'streamable-http') return value;
  throw new Error(`${source} must be "stdio" or "streamable-http", got "${value}"`);
}

function parseSessionBackend(value: string, source: string): HttpSessionBackend {
  if (value === 'memory') return value;
  throw new Error(`${source} must be "memory"; external session backends are not implemented yet`);
}

function splitFlag(value: string): [string, string | undefined] {
  const separator = value.indexOf('=');
  if (separator === -1) return [value, undefined];
  return [value.slice(0, separator), value.slice(separator + 1)];
}

function readFlagValue(
  flag: string,
  inlineValue: string | undefined,
  args: readonly string[],
  index: number,
): string {
  if (inlineValue !== undefined) return inlineValue;
  const next = args[index + 1];
  if (next === undefined || next.startsWith('--')) throw new Error(`${flag} requires a value`);
  return next;
}

function parseIntegerFlag(flag: string, value: string): number {
  return parseIntegerValue(flag, value);
}

function parseIntegerValue(source: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== value) {
    throw new Error(`${source} must be an integer, got "${value}"`);
  }
  return parsed;
}

function optionalString(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value;
}
