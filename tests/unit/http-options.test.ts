import { describe, expect, it } from 'vitest';
import { parseCliOptions } from '../../src/http/options.js';

describe('HTTP CLI options', () => {
  it('uses stdio and loopback HTTP defaults', () => {
    const options = parseCliOptions([], {});

    expect(options.transport).toBe('stdio');
    expect(options.http).toMatchObject({
      host: '127.0.0.1',
      port: 3000,
      endpoint: '/mcp',
      sessionBackend: 'memory',
      sessionIdleTtlMs: 3_600_000,
      sessionMax: 32,
    });
  });

  it('reads Streamable HTTP options from env and lets CLI flags override them', () => {
    const options = parseCliOptions(
      ['--http-port', '4321', '--http-endpoint=/rpc', '--http-session-max', '7'],
      {
        CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'streamable-http',
        CLOAK_PLAYWRIGHT_MCP_HTTP_HOST: '0.0.0.0',
        CLOAK_PLAYWRIGHT_MCP_HTTP_PORT: '1234',
        CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT: '/mcp',
        CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN: 'secret',
        CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS: '5000',
        CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX: '3',
      },
    );

    expect(options).toMatchObject({
      transport: 'streamable-http',
      http: {
        host: '0.0.0.0',
        port: 4321,
        endpoint: '/rpc',
        authToken: 'secret',
        sessionIdleTtlMs: 5000,
        sessionMax: 7,
      },
    });
  });

  it('rejects unsupported transports and session backends', () => {
    expect(() => parseCliOptions([], { CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'websocket' })).toThrow(
      'CLOAK_PLAYWRIGHT_MCP_TRANSPORT',
    );
    expect(() => parseCliOptions([], { CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND: 'redis' })).toThrow(
      'external session backends are not implemented yet',
    );
  });

  it('validates HTTP bounds', () => {
    expect(() => parseCliOptions(['--transport', 'streamable-http', '--http-port', '70000'], {})).toThrow(
      'HTTP port',
    );
    expect(() => parseCliOptions(['--http-endpoint', 'mcp'], {})).toThrow('HTTP endpoint');
    expect(() => parseCliOptions(['--http-session-idle-ttl-ms', '0'], {})).toThrow('idle TTL');
    expect(() => parseCliOptions(['--http-session-max', '0'], {})).toThrow('session max');
  });
});
