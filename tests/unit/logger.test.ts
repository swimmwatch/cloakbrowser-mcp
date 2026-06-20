import { describe, expect, it } from 'vitest';
import {
  createBridgeLogger,
  createHumanLogStream,
  formatLogLine,
  formatLogRecord,
  parseLogLevel,
} from '../../src/logging/logger.js';

describe('bridge logger', () => {
  it('defaults to info when no log level is configured', () => {
    expect(parseLogLevel(undefined)).toBe('info');
  });

  it('accepts pino standard log levels', () => {
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
      expect(parseLogLevel(level)).toBe(level);
      expect(parseLogLevel(level.toUpperCase())).toBe(level);
      expect(parseLogLevel(` ${level} `)).toBe(level);
    }
  });

  it('rejects invalid log levels with a clear error', () => {
    expect(() => parseLogLevel('verbose')).toThrow(
      'CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL must be one of trace, debug, info, warn, error, fatal, silent, got "verbose"',
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

  it('uses fallback fields when pino records are incomplete', () => {
    expect(
      formatLogRecord({
        level: 40,
        name: true,
        message: null,
        trace_id: 123n,
        ok: false,
        empty: null,
      }),
    ).toMatch(/^\d{4}-\d{2}-\d{2}T.* 40 true empty=null ok=false trace_id=123$/u);
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

  it('returns raw log lines when input is not a JSON object log record', () => {
    expect(formatLogLine('plain text')).toBe('plain text');
    expect(formatLogLine('["not","record"]')).toBe('["not","record"]');
  });

  it('formats complete lines from a human log stream and flushes buffered final data', async () => {
    const chunks: string[] = [];
    const sink = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    };
    const stream = createHumanLogStream(sink as NodeJS.WritableStream);

    stream.write(
      '{"time":"2026-06-20T15:26:47.001Z","level":"info","name":"cloakbrowser-mcp","message":"first"}\n\n{"time":"2026-06-20T15:26:48.001Z"',
    );
    stream.end(',"level":"error","name":"cloakbrowser-mcp","message":"second","reason":"has spaces"}');
    await new Promise<void>((resolve) => stream.on('finish', resolve));

    expect(chunks).toEqual([
      '2026-06-20T15:26:47.001Z INFO cloakbrowser-mcp first\n',
      '2026-06-20T15:26:48.001Z ERROR cloakbrowser-mcp second reason="has spaces"\n',
    ]);
  });

  it('creates pino-backed loggers that write formatted lines to the configured sink', async () => {
    const chunks: string[] = [];
    const sink = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    };
    const logger = createBridgeLogger({
      env: { CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL: 'debug' },
      name: 'test-logger',
      sink: sink as NodeJS.WritableStream,
    });

    logger.info({ path: '/healthz', status: 200 }, 'http request');
    await new Promise((resolve) => setImmediate(resolve));

    expect(chunks.join('')).toMatch(
      /^\d{4}-\d{2}-\d{2}T.* INFO test-logger http request path=\/healthz status=200\n$/u,
    );
  });

  it('reads the process log level environment by default', async () => {
    const previous = process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL;
    const chunks: string[] = [];
    const sink = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    };

    try {
      process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL = 'error';
      const logger = createBridgeLogger({
        name: 'test-logger',
        sink: sink as NodeJS.WritableStream,
      });

      logger.warn('hidden warning');
      logger.error('visible error');
      await new Promise((resolve) => setImmediate(resolve));

      expect(chunks.join('')).not.toContain('hidden warning');
      expect(chunks.join('')).toMatch(/ ERROR test-logger visible error\n$/u);
    } finally {
      if (previous === undefined) {
        delete process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL;
      } else {
        process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL = previous;
      }
    }
  });
});
