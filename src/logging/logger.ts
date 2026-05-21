import { pino, destination, type DestinationStream, type Logger as PinoLogger } from 'pino';

/**
 * Structured JSON logger backed by pino.
 *
 * IMPORTANT: writes to stderr (fd 2) only. Stdout is reserved for the MCP
 * stdio transport — any log line on stdout would corrupt the JSON-RPC stream.
 */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  readonly level: LogLevel;
  error(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  debug(message: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'password',
  'passwd',
  'pwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'secret',
  'clientsecret',
  'apikey',
  'xapikey',
]);

// Single shared stderr destination. pino.destination(2) is a fast, sync-on-exit
// stream that uses the raw fd, avoiding stdout entirely.
const stderrDestination: DestinationStream = destination(2);

function wrap(p: PinoLogger, level: LogLevel): Logger {
  return {
    level,
    error: (msg, fields) => p.error(redactLogFields(fields), msg),
    warn: (msg, fields) => p.warn(redactLogFields(fields), msg),
    info: (msg, fields) => p.info(redactLogFields(fields), msg),
    debug: (msg, fields) => p.debug(redactLogFields(fields), msg),
    child: (bindings) => wrap(p.child(redactLogFields(bindings)), level),
  };
}

export function createLogger(level: LogLevel = 'info', bindings: Record<string, unknown> = {}): Logger {
  const p = pino(
    {
      level,
      base: redactLogFields(bindings),
      // ISO timestamps (default pino is epoch ms); easier for humans tailing logs.
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      // Rename for consistency with our previous wire format.
      messageKey: 'msg',
      formatters: {
        // Emit the textual level name rather than the numeric one.
        level: (label) => ({ level: label }),
      },
    },
    stderrDestination,
  );
  return wrap(p, level);
}

export function redactLogFields(fields: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!fields) return {};
  return redactValue(fields, new WeakSet()) as Record<string, unknown>;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redactValue(item, seen));

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactValue(nested, seen);
  }
  return out;
}

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return SENSITIVE_KEYS.has(normalised);
}

function redactString(value: string): string {
  return value
    .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
    .replace(/((?:api[_-]?key|token|password|secret)=)[^&\s]+/gi, `$1${REDACTED}`);
}
