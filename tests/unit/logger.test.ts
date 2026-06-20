import { describe, expect, it } from 'vitest';
import { formatLogRecord, parseLogLevel } from '../../src/logging/logger.js';

describe('bridge logger', () => {
  it('defaults to info when no log level is configured', () => {
    expect(parseLogLevel(undefined)).toBe('info');
  });

  it('accepts pino standard log levels', () => {
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
      expect(parseLogLevel(level)).toBe(level);
      expect(parseLogLevel(level.toUpperCase())).toBe(level);
    }
  });

  it('rejects invalid log levels with a clear error', () => {
    expect(() => parseLogLevel('verbose')).toThrow(
      'CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL must be one of trace, debug, info, warn, error, fatal, silent',
    );
  });

  it('formats human-readable log records with timestamp, level, name, message, and fields', () => {
    expect(
      formatLogRecord({
        time: '2026-06-20T15:26:44.123Z',
        level: 'info',
        name: 'cloakbrowser-mcp',
        message: 'streamable-http listening',
        url: 'http://127.0.0.1:3000/mcp',
      }),
    ).toBe(
      '2026-06-20T15:26:44.123Z INFO cloakbrowser-mcp streamable-http listening url=http://127.0.0.1:3000/mcp',
    );
  });

  it('quotes whitespace values, omits undefined fields, and stringifies structured values', () => {
    expect(
      formatLogRecord({
        time: '2026-06-20T15:26:45.001Z',
        level: 'warn',
        name: 'cloakbrowser-mcp',
        message: 'http request',
        duration_ms: 12,
        method: 'GET',
        path: '/health check',
        skipped: undefined,
        tags: ['probe'],
      }),
    ).toBe(
      '2026-06-20T15:26:45.001Z WARN cloakbrowser-mcp http request duration_ms=12 method=GET path="/health check" tags=["probe"]',
    );
  });

  it('safely formats unsupported field values', () => {
    expect(
      formatLogRecord({
        time: '2026-06-20T15:26:46.001Z',
        level: 'info',
        name: 'cloakbrowser-mcp',
        message: 'unsupported field',
        callback: () => undefined,
      }),
    ).toBe('2026-06-20T15:26:46.001Z INFO cloakbrowser-mcp unsupported field callback=[unserializable]');
  });
});
