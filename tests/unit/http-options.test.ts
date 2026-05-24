import { describe, expect, it } from 'vitest';
import {
  cliOptionDefinitions,
  createCliCommand,
  parseCliOptions,
  renderCliReferenceMarkdown,
} from '../../src/cli/options.js';

const cliEnvNames = cliOptionDefinitions.map((definition) => definition.env);

describe('Commander CLI options', () => {
  it('uses stdio and loopback HTTP defaults', () => {
    withCliEnv({}, () => {
      const options = parseCliOptions([]);

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
  });

  it('reads Streamable HTTP options from env and lets CLI flags override them', () => {
    withCliEnv(
      {
        CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'streamable-http',
        CLOAK_PLAYWRIGHT_MCP_HTTP_HOST: '0.0.0.0',
        CLOAK_PLAYWRIGHT_MCP_HTTP_PORT: '1234',
        CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT: '/mcp',
        CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN: 'secret',
        CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS: '5000',
        CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX: '3',
      },
      () => {
        const options = parseCliOptions([
          '--http-port',
          '4321',
          '--http-endpoint=/rpc',
          '--http-session-max',
          '7',
        ]);

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
      },
    );
  });

  it('rejects unsupported transports and session backends through Commander choices', () => {
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'websocket' }, () => {
      expect(() => parseCliOptions([])).toThrow('Allowed choices are stdio, streamable-http');
    });
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND: 'redis' }, () => {
      expect(() => parseCliOptions([])).toThrow('Allowed choices are memory');
    });
  });

  it('validates HTTP bounds', () => {
    withCliEnv({}, () => {
      expect(() => parseCliOptions(['--transport', 'streamable-http', '--http-port', '70000'])).toThrow(
        'HTTP port',
      );
      expect(() => parseCliOptions(['--http-endpoint', 'mcp'])).toThrow('HTTP endpoint');
      expect(() => parseCliOptions(['--http-session-idle-ttl-ms', '0'])).toThrow('idle TTL');
      expect(() => parseCliOptions(['--http-session-max', '0'])).toThrow('session max');
    });
  });

  it('generates Commander help and Markdown reference from the option metadata', () => {
    const help = createCliCommand('1.2.3').helpInformation();
    const reference = renderCliReferenceMarkdown('1.2.3');

    expect(help).toContain('Playwright MCP bridge backed by CloakBrowser');
    expect(help).toContain('--transport <mode>');
    expect(help).toContain('--http-session-max <count>');
    expect(help).toContain('CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX');
    expect(reference).toContain('# CLI Reference');
    expect(reference).toContain('| `--http-auth-token <token>` |');
    expect(reference).toContain('`streamable-http`');
  });
});

function withCliEnv(env: Record<string, string>, fn: () => void): void {
  const previous = new Map<string, string | undefined>();
  for (const name of cliEnvNames) {
    previous.set(name, process.env[name]);
    delete process.env[name];
  }
  for (const [name, value] of Object.entries(env)) {
    previous.set(name, process.env[name]);
    process.env[name] = value;
  }

  try {
    fn();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}
