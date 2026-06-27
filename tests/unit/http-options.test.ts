import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cliOptionDefinitions,
  createCliCommand,
  parseCliOptions,
  renderCliReferenceMarkdown,
} from '@/cli/options.js';
import {
  BRIDGE_TRANSPORT_STDIO,
  BRIDGE_TRANSPORT_STREAMABLE_HTTP,
  HEALTHZ_PATH,
  HTTP_PROTOCOL_HTTP,
  HTTP_PROTOCOL_HTTPS,
  HTTP_SESSION_BACKEND_MEMORY,
  READYZ_PATH,
  defaultStreamableHttpOptions,
} from '@/http/options.js';

const cliEnvNames = cliOptionDefinitions.map((definition) => definition.env);

describe('Commander CLI options', () => {
  it('uses stdio and loopback HTTP defaults', () => {
    withCliEnv({}, () => {
      const options = parseCliOptions([]);

      expect(options.transport).toBe(BRIDGE_TRANSPORT_STDIO);
      expect(options.bridge.geoipProxyMatch).toBe(false);
      expect(options.bridge.humanize).toBe(false);
      expect(options.bridge.humanPreset).toBe('default');
      expect(options.http).toMatchObject({
        protocol: HTTP_PROTOCOL_HTTP,
        host: defaultStreamableHttpOptions.host,
        port: defaultStreamableHttpOptions.port,
        endpoint: defaultStreamableHttpOptions.endpoint,
        tls: {},
        sessionBackend: HTTP_SESSION_BACKEND_MEMORY,
        sessionIdleTtlMs: defaultStreamableHttpOptions.sessionIdleTtlMs,
        sessionMax: defaultStreamableHttpOptions.sessionMax,
      });
    });
  });

  it('reads the GeoIP proxy match bridge option from env and CLI flags', () => {
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true' }, () => {
      expect(parseCliOptions([]).bridge.geoipProxyMatch).toBe(true);
      expect(parseCliOptions(['--geoip-proxy-match']).bridge.geoipProxyMatch).toBe(true);
    });
  });

  it('reads the humanize bridge option from env and CLI flags', () => {
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true' }, () => {
      expect(parseCliOptions([]).bridge.humanize).toBe(true);
      expect(parseCliOptions(['--humanize']).bridge.humanize).toBe(true);
    });
  });

  it('reads the human preset bridge option from env and CLI flags', () => {
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'careful' }, () => {
      expect(parseCliOptions([]).bridge.humanPreset).toBe('careful');
      expect(parseCliOptions(['--human-preset', 'default']).bridge.humanPreset).toBe('default');
    });
  });

  it('reads Streamable HTTP options from env and lets CLI flags override them', () => {
    withCliEnv(
      {
        CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'streamable-http',
        CLOAK_PLAYWRIGHT_MCP_HTTP_HOST: '0.0.0.0',
        CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL: 'https',
        CLOAK_PLAYWRIGHT_MCP_HTTP_PORT: '1234',
        CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT: '/mcp',
        CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN: 'secret',
        CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT: './cert.pem',
        CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY: './key.pem',
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
          transport: BRIDGE_TRANSPORT_STREAMABLE_HTTP,
          http: {
            protocol: HTTP_PROTOCOL_HTTPS,
            host: '0.0.0.0',
            port: 4321,
            endpoint: '/rpc',
            authToken: 'secret',
            tls: {
              cert: './cert.pem',
              key: './key.pem',
            },
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
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL: 'ftp' }, () => {
      expect(() => parseCliOptions([])).toThrow('Allowed choices are http, https');
    });
    withCliEnv({ CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'fast' }, () => {
      expect(() => parseCliOptions([])).toThrow('Allowed choices are default, careful');
    });
  });

  it('validates HTTP bounds and HTTPS TLS option combinations', () => {
    withCliEnv({}, () => {
      expect(() => parseCliOptions(['--http-port', 'abc'])).toThrow('HTTP port must be an integer');
      expect(() => parseCliOptions(['--http-port', '9007199254740992'])).toThrow(
        'HTTP port must be a safe integer',
      );
      expect(() =>
        parseCliOptions(['--transport', BRIDGE_TRANSPORT_STREAMABLE_HTTP, '--http-port', '70000']),
      ).toThrow('HTTP port');
      expect(() => parseCliOptions(['--http-endpoint', 'mcp'])).toThrow('HTTP endpoint');
      expect(() => parseCliOptions(['--http-endpoint', '/mcp?debug=1'])).toThrow('HTTP endpoint');
      expect(() => parseCliOptions(['--http-endpoint', '/mcp#debug'])).toThrow('HTTP endpoint');
      expect(() => parseCliOptions(['--http-endpoint', '/mcp/'])).toThrow('must not end with "/"');
      expect(() => parseCliOptions(['--http-endpoint', HEALTHZ_PATH])).toThrow('reserved probe paths');
      expect(() => parseCliOptions(['--http-endpoint', READYZ_PATH])).toThrow('reserved probe paths');
      expect(() => parseCliOptions(['--http-auth-token', '   '])).toThrow(
        'HTTP auth token must not be empty',
      );
      expect(() => parseCliOptions(['--http-session-idle-ttl-ms', '0'])).toThrow('idle TTL');
      expect(() => parseCliOptions(['--http-session-max', '0'])).toThrow('session max');
      expect(() => parseCliOptions(['--https-cert', './cert.pem', '--https-key', './key.pem'])).toThrow(
        'HTTPS certificate options require --http-protocol https',
      );
      expect(() => parseCliOptions(['--http-protocol', 'https'])).toThrow(
        'HTTPS requires either --https-cert and --https-key, or --https-pfx',
      );
      expect(() => parseCliOptions(['--http-protocol', 'https', '--https-cert', './cert.pem'])).toThrow(
        'HTTPS requires either --https-cert and --https-key, or --https-pfx',
      );
      expect(() =>
        parseCliOptions([
          '--http-protocol',
          'https',
          '--https-pfx',
          './cert.pfx',
          '--https-cert',
          './cert.pem',
          '--https-key',
          './key.pem',
        ]),
      ).toThrow('HTTPS must use either --https-pfx or --https-cert with --https-key');
    });
  });

  it('accepts HTTPS certificate/key and PFX configurations', () => {
    withCliEnv({}, () => {
      expect(
        parseCliOptions([
          '--http-protocol',
          'https',
          '--https-cert',
          './cert.pem',
          '--https-key',
          './key.pem',
        ]).http.tls,
      ).toEqual({ cert: './cert.pem', key: './key.pem', pfx: undefined, passphrase: undefined });

      expect(
        parseCliOptions([
          '--http-protocol',
          'https',
          '--https-pfx',
          './cert.pfx',
          '--https-passphrase',
          'secret',
        ]).http.tls,
      ).toEqual({ cert: undefined, key: undefined, pfx: './cert.pfx', passphrase: 'secret' });
    });
  });

  it('accepts valid HTTP ports from CLI flags across the full port range', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 65_535 }), (port) => {
        withCliEnv({}, () => {
          expect(parseCliOptions(['--http-port', String(port)]).http.port).toBe(port);
        });
      }),
    );
  });

  it('accepts valid absolute HTTP endpoint paths', () => {
    const segment = fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-'), {
        minLength: 1,
        maxLength: 12,
      })
      .map((chars) => chars.join(''));
    const endpoint = fc
      .array(segment, { minLength: 1, maxLength: 4 })
      .map((segments) => `/${segments.join('/')}`)
      .filter((value) => value !== HEALTHZ_PATH && value !== READYZ_PATH);

    fc.assert(
      fc.property(endpoint, (value) => {
        withCliEnv({}, () => {
          expect(parseCliOptions(['--http-endpoint', value]).http.endpoint).toBe(value);
        });
      }),
    );
  });

  it('wires the doctor subcommand and JSON flag', async () => {
    let doctorJson = false;
    const command = createCliCommand('1.2.3', {
      doctorAction: (options) => {
        doctorJson = options.json === true;
      },
    });
    command.exitOverride();
    command.configureOutput({
      writeOut: () => undefined,
      writeErr: () => undefined,
    });

    await command.parseAsync(['doctor', '--json'], { from: 'user' });

    expect(doctorJson).toBe(true);
    expect(command.helpInformation()).toContain('doctor');
    expect(
      command.commands.find((subcommand) => subcommand.name() === 'doctor')?.helpInformation(),
    ).toContain('--json');
  });

  it('generates Commander help and Markdown reference from the option metadata', () => {
    const help = createCliCommand('1.2.3').helpInformation();
    const reference = renderCliReferenceMarkdown('1.2.3');

    expect(help).toContain('Playwright MCP bridge backed by CloakBrowser');
    expect(help).toContain('--transport <mode>');
    expect(help).toContain('--geoip-proxy-match');
    expect(help).toContain('doctor');
    expect(help).toContain('--http-protocol <protocol>');
    expect(help).toContain('--https-cert <path>');
    expect(help).toContain('--http-session-max <count>');
    expect(help).toContain('CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX');
    expect(reference).toContain('# CLI Reference');
    expect(reference).toContain('### `doctor`');
    expect(reference).toContain('CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH');
    expect(reference).toContain('--json');
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
