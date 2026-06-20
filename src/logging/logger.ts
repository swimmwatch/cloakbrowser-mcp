import { Writable } from 'node:stream';
import pino, { type Logger as PinoLogger } from 'pino';

export const logLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

export type LogLevel = (typeof logLevels)[number];
export type LogFields = Record<string, unknown>;
export type BridgeLogger = Pick<PinoLogger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'>;

export interface CreateBridgeLoggerOptions {
  env?: Record<string, string | undefined>;
  name?: string;
  sink?: NodeJS.WritableStream;
}

const logLevelEnvName = 'CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL';
const defaultLoggerName = 'cloakbrowser-mcp';
const reservedLogKeys = new Set(['level', 'time', 'name', 'message', 'msg']);

export function createBridgeLogger(options: CreateBridgeLoggerOptions = {}): BridgeLogger {
  const level = parseLogLevel(options.env?.[logLevelEnvName]);
  return pino(
    {
      base: undefined,
      level,
      messageKey: 'message',
      name: options.name ?? defaultLoggerName,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label }),
      },
    },
    createHumanLogStream(options.sink ?? process.stdout),
  );
}

export function parseLogLevel(value: string | undefined): LogLevel {
  if (value === undefined) return 'info';
  const normalized = value.trim().toLowerCase();
  if (isLogLevel(normalized)) return normalized;
  throw new Error(`${logLevelEnvName} must be one of ${logLevels.join(', ')}, got "${value}"`);
}

export function createHumanLogStream(sink: NodeJS.WritableStream): Writable {
  let buffered = '';
  return new Writable({
    write(chunk, _encoding, callback) {
      buffered += String(chunk);
      const lines = buffered.split(/\r?\n/u);
      buffered = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length === 0) continue;
        sink.write(`${formatLogLine(line)}\n`);
      }
      callback();
    },
    final(callback) {
      if (buffered.length > 0) sink.write(`${formatLogLine(buffered)}\n`);
      callback();
    },
  });
}

export function formatLogLine(line: string): string {
  try {
    const parsed = JSON.parse(line) as unknown;
    if (isLogRecord(parsed)) return formatLogRecord(parsed);
  } catch {
    return line;
  }
  return line;
}

export function formatLogRecord(record: LogFields): string {
  const time = formatRequiredField(record.time, new Date().toISOString());
  const level = formatRequiredField(record.level, 'info').toUpperCase();
  const name = formatRequiredField(record.name, defaultLoggerName);
  const message = formatRequiredField(record.message ?? record.msg, '');
  const fields = Object.keys(record)
    .filter((key) => !reservedLogKeys.has(key) && record[key] !== undefined)
    .sort()
    .map((key) => `${key}=${formatLogValue(record[key])}`);
  return [time, level, name, message, ...fields].filter((part) => part.length > 0).join(' ');
}

function isLogLevel(value: string): value is LogLevel {
  return (logLevels as readonly string[]).includes(value);
}

function isLogRecord(value: unknown): value is LogFields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatRequiredField(value: unknown, fallback: string): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  return fallback;
}

function formatLogValue(value: unknown): string {
  if (typeof value === 'string') return formatStringValue(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value === null) return 'null';
  try {
    const serialized = JSON.stringify(value);
    return serialized === undefined ? '[unserializable]' : formatStringValue(serialized);
  } catch {
    return '[unserializable]';
  }
}

function formatStringValue(value: string): string {
  return /^[^\s=]+$/u.test(value) ? value : JSON.stringify(value);
}
