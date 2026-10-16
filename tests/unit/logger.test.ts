import { describe, expect, it } from 'vitest';
import {
  createBridgeLogger,
  createHumanLogStream,
  formatLogLine,
  formatLogRecord,
  parseLogLevel,
} from '@/logging/logger.js';
describe('bridge logger', () => {
  it('defaults to info when no log level is configured', () => {
    const parseLogLevelResult = parseLogLevel(undefined);
    expect(parseLogLevelResult).toBe('info');
  });
  it('accepts pino standard log levels', () => {
    for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
      const parseLogLevelResult2 = parseLogLevel(level);
      expect(parseLogLevelResult2).toBe(level);
      const toUpperCaseResult = level.toUpperCase();
      const parseLogLevelResult3 = parseLogLevel(toUpperCaseResult);
      expect(parseLogLevelResult3).toBe(level);
      const message2 = ` ${level} `;
      const parseLogLevelResult4 = parseLogLevel(message2);
      expect(parseLogLevelResult4).toBe(level);
    }
  });
  it('rejects invalid log levels with a clear error', () => {
    expect(() => parseLogLevel('verbose')).toThrow(
      'CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL must be one of trace, debug, info, warn, error, fatal, silent, got "verbose"',
    );
  });
  it('formats human-readable log records with timestamp, level, name, message, and fields', () => {
    const formatLogRecordOptions = {
      time: '2026-06-20T15:26:44.123Z',
      level: 'info',
      name: 'cloakbrowser-mcp',
      message: 'streamable-http listening',
      url: 'http://127.0.0.1:3000/mcp',
    } as const;
    const formatLogRecordResult = formatLogRecord(formatLogRecordOptions);
    expect(formatLogRecordResult).toBe(
      '2026-06-20T15:26:44.123Z INFO cloakbrowser-mcp streamable-http listening url=http://127.0.0.1:3000/mcp',
    );
  });
  it('uses fallback fields when pino records are incomplete', () => {
    const formatLogRecordOptions2 = {
      level: 40,
      name: true,
      message: null,
      trace_id: 123n,
      ok: false,
      empty: null,
    } as const;
    const formatLogRecordResult2 = formatLogRecord(formatLogRecordOptions2);
    expect(formatLogRecordResult2).toMatch(
      /^\d{4}-\d{2}-\d{2}T.* 40 true empty=null ok=false trace_id=123$/u,
    );
  });
  it('quotes whitespace values, omits undefined fields, and stringifies structured values', () => {
    const formatLogRecordOptions3: import('@/logging/logger.js').LogFields = {
      time: '2026-06-20T15:26:45.001Z',
      level: 'warn',
      name: 'cloakbrowser-mcp',
      message: 'http request',
      duration_ms: 12,
      method: 'GET',
      path: '/health check',
      skipped: undefined,
      tags: ['probe'],
    };
    const formatLogRecordResult3 = formatLogRecord(formatLogRecordOptions3);
    expect(formatLogRecordResult3).toBe(
      '2026-06-20T15:26:45.001Z WARN cloakbrowser-mcp http request duration_ms=12 method=GET path="/health check" tags=["probe"]',
    );
  });
  it('safely formats unsupported field values', () => {
    const formatLogRecordOptions4: import('@/logging/logger.js').LogFields = {
      time: '2026-06-20T15:26:46.001Z',
      level: 'info',
      name: 'cloakbrowser-mcp',
      message: 'unsupported field',
      callback: () => undefined,
    };
    const formatLogRecordResult4 = formatLogRecord(formatLogRecordOptions4);
    expect(formatLogRecordResult4).toBe(
      '2026-06-20T15:26:46.001Z INFO cloakbrowser-mcp unsupported field callback=[unserializable]',
    );
  });
  it('returns raw log lines when input is not a JSON object log record', () => {
    const formatLogLineResult = formatLogLine('plain text');
    expect(formatLogLineResult).toBe('plain text');
    const formatLogLineResult2 = formatLogLine('["not","record"]');
    expect(formatLogLineResult2).toBe('["not","record"]');
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
    const receiverActual = chunks;
    const values: string[] = [
      '2026-06-20T15:26:47.001Z INFO cloakbrowser-mcp first\n',
      '2026-06-20T15:26:48.001Z ERROR cloakbrowser-mcp second reason="has spaces"\n',
    ];
    expect(receiverActual).toEqual(values);
  });
  it('creates pino-backed loggers that write formatted lines to the configured sink', async () => {
    const chunks: string[] = [];
    const sink = {
      write(chunk: string) {
        chunks.push(chunk);
        return true;
      },
    };
    const createBridgeLoggerOptions = {
      env: { CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL: 'debug' },
      name: 'test-logger',
      sink: sink as NodeJS.WritableStream,
    } as const;
    const logger = createBridgeLogger(createBridgeLoggerOptions);
    const infoOptions = { path: '/healthz', status: 200 } as const;
    logger.info(infoOptions, 'http request');
    await new Promise((resolve) => setImmediate(resolve));
    const joinedPath = chunks.join('');
    expect(joinedPath).toMatch(
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
      const createBridgeLoggerOptions2 = {
        name: 'test-logger',
        sink: sink as NodeJS.WritableStream,
      } as const;
      const logger = createBridgeLogger(createBridgeLoggerOptions2);
      logger.warn('hidden warning');
      logger.error('visible error');
      await new Promise((resolve) => setImmediate(resolve));
      const joinedPath2 = chunks.join('');
      expect(joinedPath2).not.toContain('hidden warning');
      const joinedPath3 = chunks.join('');
      expect(joinedPath3).toMatch(/ ERROR test-logger visible error\n$/u);
    } finally {
      if (previous === undefined) {
        delete process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL;
      } else {
        process.env.CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL = previous;
      }
    }
  });
});
