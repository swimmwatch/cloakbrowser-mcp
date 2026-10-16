import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  cdpRemoteWarning,
  cliOptionDefinitions,
  createCliCommand,
  parseCliOptions,
  renderCliReferenceMarkdown,
} from '@/cli/options.js';
import {
  BRIDGE_TRANSPORT_STDIO,
  BRIDGE_TRANSPORT_STREAMABLE_HTTP,
  defaultStreamableHttpOptions,
  HEALTHZ_PATH,
  HTTP_PROTOCOL_HTTP,
  HTTP_PROTOCOL_HTTPS,
  HTTP_SESSION_BACKEND_MEMORY,
  READYZ_PATH,
} from '@/http/options.js';
const cliEnvNames = cliOptionDefinitions.map((definition) => definition.env);
describe('Commander CLI options', () => {
  it('parses managed CDP settings with CLI precedence and explicit negative overrides', () => {
    const withCliEnvOptions = {
      CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_HOST: '0.0.0.0',
      CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: '9800-9802',
      CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST: 'env.example.test',
      CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME: 'https',
    } as const;
    withCliEnv(withCliEnvOptions, () => {
      const values: readonly string[] = [
        '--no-cdp-enabled',
        '--no-cdp-allow-remote',
        '--cdp-host',
        '127.0.0.1',
        '--cdp-port-range',
        '9900',
        '--cdp-advertised-host',
        'cli.example.test',
        '--cdp-advertised-scheme',
        'http',
      ];
      const argumentValue = parseCliOptions(values).cdp;
      const receiverActual = argumentValue;
      const toEqualOptions = {
        allowRemote: false,
        advertisedHost: 'cli.example.test',
        advertisedScheme: 'http',
        bindHost: '127.0.0.1',
        portRange: { start: 9900, end: 9900 },
        processEnabled: false,
      } as const;
      expect(receiverActual).toEqual(toEqualOptions);
    });
  });
  it('rejects conflicting managed CDP boolean flags', () => {
    const withCliEnvOptions2 = {} as const;
    withCliEnv(withCliEnvOptions2, () => {
      expect(() => {
        const values2: readonly string[] = ['--cdp-enabled', '--no-cdp-enabled'];
        return parseCliOptions(values2);
      }).toThrow('CDP enabled CLI flags conflict');
      expect(() => {
        const values3: readonly string[] = ['--cdp-allow-remote', '--no-cdp-allow-remote'];
        return parseCliOptions(values3);
      }).toThrow('CDP allow remote CLI flags conflict');
    });
  });
  it('validates managed CDP CLI prerequisites before runtime startup', () => {
    const withCliEnvOptions3 = {} as const;
    withCliEnv(withCliEnvOptions3, () => {
      expect(() => {
        const values4: readonly string[] = ['--cdp-enabled'];
        return parseCliOptions(values4);
      }).toThrow('CDP port range is required when managed CDP is enabled');
      expect(() => {
        const values5: readonly string[] = ['--cdp-port-range', '9900', '--cdp-host', '0.0.0.0'];
        return parseCliOptions(values5);
      }).toThrow('CDP wildcard bind host requires an advertised host');
      expect(() => {
        const values6: readonly string[] = ['--cdp-port-range', '9900', '--cdp-host', '192.0.2.10'];
        return parseCliOptions(values6);
      }).toThrow('CDP bind host requires remote access opt-in');
      expect(() => {
        const values7: readonly string[] = ['--cdp-advertised-scheme', 'HTTP'];
        return parseCliOptions(values7);
      }).toThrow('Allowed choices are http, https');
    });
  });
  it('renders all public managed CDP flags in generated CLI help', () => {
    const reference = renderCliReferenceMarkdown('0.0.0');
    for (const flag of [
      '--cdp-enabled',
      '--no-cdp-enabled',
      '--cdp-port-range',
      '--cdp-host',
      '--cdp-allow-remote',
      '--no-cdp-allow-remote',
      '--cdp-advertised-host',
      '--cdp-advertised-scheme',
    ]) {
      expect(reference).toContain(flag);
    }
  });
  it('renders a redacted operator warning for remote managed CDP', () => {
    expect(cdpRemoteWarning).toContain('unencrypted privileged browser-control surface');
    expect(cdpRemoteWarning).toContain('TLS reverse proxy or an isolated network');
    expect(cdpRemoteWarning).not.toMatch(/\/cdp\/|webSocketDebuggerUrl|cookie|profile/iu);
  });
  it('uses stdio and loopback HTTP defaults', () => {
    const withCliEnvOptions4 = {} as const;
    withCliEnv(withCliEnvOptions4, () => {
      const values8: readonly string[] = [];
      const options = parseCliOptions(values8);
      expect(options.transport).toBe(BRIDGE_TRANSPORT_STDIO);
      expect(options.bridge.geoipProxyMatch).toBe(false);
      expect(options.bridge.binaryPath).toBeUndefined();
      expect(options.bridge.humanize).toBe(false);
      expect(options.bridge.humanPreset).toBe('default');
      expect(options.bridge.releaseChannel).toBe('stable');
      const receiver2Actual = options.http;
      const toMatchObjectOptions = {
        protocol: HTTP_PROTOCOL_HTTP,
        host: defaultStreamableHttpOptions.host,
        port: defaultStreamableHttpOptions.port,
        endpoint: defaultStreamableHttpOptions.endpoint,
        tls: {},
        sessionBackend: HTTP_SESSION_BACKEND_MEMORY,
        sessionIdleTtlMs: defaultStreamableHttpOptions.sessionIdleTtlMs,
        sessionMax: defaultStreamableHttpOptions.sessionMax,
      } as const;
      expect(receiver2Actual).toMatchObject(toMatchObjectOptions);
    });
  });
  it('reads the GeoIP proxy match bridge option from env and CLI flags', () => {
    const withCliEnvOptions5 = { CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true' } as const;
    withCliEnv(withCliEnvOptions5, () => {
      const values9: readonly string[] = [];
      const argumentValue2 = parseCliOptions(values9).bridge.geoipProxyMatch;
      expect(argumentValue2).toBe(true);
      const values10: readonly string[] = ['--geoip-proxy-match'];
      const argumentValue3 = parseCliOptions(values10).bridge.geoipProxyMatch;
      expect(argumentValue3).toBe(true);
    });
  });
  it('reads the humanize bridge option from env and CLI flags', () => {
    const withCliEnvOptions6 = { CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'true' } as const;
    withCliEnv(withCliEnvOptions6, () => {
      const values11: readonly string[] = [];
      const argumentValue4 = parseCliOptions(values11).bridge.humanize;
      expect(argumentValue4).toBe(true);
      const values12: readonly string[] = ['--humanize'];
      const argumentValue5 = parseCliOptions(values12).bridge.humanize;
      expect(argumentValue5).toBe(true);
    });
  });
  it('requires explicit true or false boolean env values', () => {
    const withCliEnvOptions7 = {
      CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: ' false ',
      CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'TRUE',
    } as const;
    withCliEnv(withCliEnvOptions7, () => {
      const values13: readonly string[] = [];
      const argumentValue6 = parseCliOptions(values13).bridge.geoipProxyMatch;
      expect(argumentValue6).toBe(false);
      const values14: readonly string[] = [];
      const argumentValue7 = parseCliOptions(values14).bridge.humanize;
      expect(argumentValue7).toBe(true);
    });
    for (const value of ['treu', 'tru', 'enabled', 'yes', 'on', '1', '']) {
      const withCliEnvOptions8 = { CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: value } as const;
      withCliEnv(withCliEnvOptions8, () => {
        expect(() => {
          const values15: readonly string[] = [];
          return parseCliOptions(values15);
        }).toThrow('Boolean environment values must be "true" or "false"');
      });
    }
  });
  it('reads the human preset bridge option from env and CLI flags', () => {
    const withCliEnvOptions9 = { CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'careful' } as const;
    withCliEnv(withCliEnvOptions9, () => {
      const values16: readonly string[] = [];
      const argumentValue8 = parseCliOptions(values16).bridge.humanPreset;
      expect(argumentValue8).toBe('careful');
      const values17: readonly string[] = ['--human-preset', 'default'];
      const argumentValue9 = parseCliOptions(values17).bridge.humanPreset;
      expect(argumentValue9).toBe('default');
    });
  });
  it('reads the release channel from env and CLI flags', () => {
    const withCliEnvOptions10 = { CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL: 'preview' } as const;
    withCliEnv(withCliEnvOptions10, () => {
      const values18: readonly string[] = [];
      const argumentValue10 = parseCliOptions(values18).bridge.releaseChannel;
      expect(argumentValue10).toBe('preview');
      const values19: readonly string[] = ['--release-channel', 'stable'];
      const argumentValue11 = parseCliOptions(values19).bridge.releaseChannel;
      expect(argumentValue11).toBe('stable');
    });
  });
  it('reads the custom binary path from env and lets the CLI flag override it', () => {
    const withCliEnvOptions11 = { CLOAKBROWSER_BINARY_PATH: '/opt/cloakbrowser/env-chrome' } as const;
    withCliEnv(withCliEnvOptions11, () => {
      const values20: readonly string[] = [];
      const argumentValue12 = parseCliOptions(values20).bridge.binaryPath;
      expect(argumentValue12).toBe('/opt/cloakbrowser/env-chrome');
      const values21: readonly string[] = ['--binary-path', '/opt/cloakbrowser/cli-chrome'];
      const argumentValue13 = parseCliOptions(values21).bridge.binaryPath;
      expect(argumentValue13).toBe('/opt/cloakbrowser/cli-chrome');
    });
  });
  it('reads Streamable HTTP options from env and lets CLI flags override them', () => {
    const withCliEnvOptions12 = {
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
    } as const;
    withCliEnv(withCliEnvOptions12, () => {
      const values22: readonly string[] = [
        '--http-port',
        '4321',
        '--http-endpoint=/rpc',
        '--http-session-max',
        '7',
      ];
      const options = parseCliOptions(values22);
      const receiver3Actual = options;
      const toMatchObjectOptions2 = {
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
      } as const;
      expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    });
  });
  it('rejects unsupported transports and session backends through Commander choices', () => {
    const withCliEnvOptions13 = { CLOAK_PLAYWRIGHT_MCP_TRANSPORT: 'websocket' } as const;
    withCliEnv(withCliEnvOptions13, () => {
      expect(() => {
        const values23: readonly string[] = [];
        return parseCliOptions(values23);
      }).toThrow('Allowed choices are stdio, streamable-http');
    });
    const withCliEnvOptions14 = { CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND: 'redis' } as const;
    withCliEnv(withCliEnvOptions14, () => {
      expect(() => {
        const values24: readonly string[] = [];
        return parseCliOptions(values24);
      }).toThrow('Allowed choices are memory');
    });
    const withCliEnvOptions15 = { CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL: 'ftp' } as const;
    withCliEnv(withCliEnvOptions15, () => {
      expect(() => {
        const values25: readonly string[] = [];
        return parseCliOptions(values25);
      }).toThrow('Allowed choices are http, https');
    });
    const withCliEnvOptions16 = { CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: 'fast' } as const;
    withCliEnv(withCliEnvOptions16, () => {
      expect(() => {
        const values26: readonly string[] = [];
        return parseCliOptions(values26);
      }).toThrow('Allowed choices are default, careful');
    });
    const withCliEnvOptions17 = { CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL: 'canary' } as const;
    withCliEnv(withCliEnvOptions17, () => {
      expect(() => {
        const values27: readonly string[] = [];
        return parseCliOptions(values27);
      }).toThrow('Allowed choices are stable, preview');
    });
    const withCliEnvOptions18 = {} as const;
    withCliEnv(withCliEnvOptions18, () => {
      expect(() => {
        const values28: readonly string[] = ['--release-channel', 'canary'];
        return parseCliOptions(values28);
      }).toThrow('Allowed choices are stable, preview');
    });
  });
  it('validates HTTP bounds and HTTPS TLS option combinations', () => {
    const withCliEnvOptions19 = {} as const;
    withCliEnv(withCliEnvOptions19, () => {
      expect(() => {
        const values29: readonly string[] = ['--http-port', 'abc'];
        return parseCliOptions(values29);
      }).toThrow('HTTP port must be an integer');
      expect(() => {
        const values30: readonly string[] = ['--http-port', '9007199254740992'];
        return parseCliOptions(values30);
      }).toThrow('HTTP port must be a safe integer');
      expect(() => {
        const values31: readonly string[] = [
          '--transport',
          BRIDGE_TRANSPORT_STREAMABLE_HTTP,
          '--http-port',
          '70000',
        ];
        return parseCliOptions(values31);
      }).toThrow('HTTP port');
      expect(() => {
        const values32: readonly string[] = ['--http-endpoint', 'mcp'];
        return parseCliOptions(values32);
      }).toThrow('HTTP endpoint');
      expect(() => {
        const values33: readonly string[] = ['--http-endpoint', '/mcp?debug=1'];
        return parseCliOptions(values33);
      }).toThrow('HTTP endpoint');
      expect(() => {
        const values34: readonly string[] = ['--http-endpoint', '/mcp#debug'];
        return parseCliOptions(values34);
      }).toThrow('HTTP endpoint');
      expect(() => {
        const values35: readonly string[] = ['--http-endpoint', '/mcp/'];
        return parseCliOptions(values35);
      }).toThrow('must not end with "/"');
      expect(() => {
        const values36: readonly string[] = ['--http-endpoint', HEALTHZ_PATH];
        return parseCliOptions(values36);
      }).toThrow('reserved probe paths');
      expect(() => {
        const values37: readonly string[] = ['--http-endpoint', READYZ_PATH];
        return parseCliOptions(values37);
      }).toThrow('reserved probe paths');
      expect(() => {
        const values38: readonly string[] = ['--http-auth-token', '   '];
        return parseCliOptions(values38);
      }).toThrow('HTTP auth token must not be empty');
      expect(() => {
        const values39: readonly string[] = ['--http-session-idle-ttl-ms', '0'];
        return parseCliOptions(values39);
      }).toThrow('idle TTL');
      expect(() => {
        const values40: readonly string[] = ['--http-session-max', '0'];
        return parseCliOptions(values40);
      }).toThrow('session max');
      expect(() => {
        const values41: readonly string[] = ['--https-cert', './cert.pem', '--https-key', './key.pem'];
        return parseCliOptions(values41);
      }).toThrow('HTTPS certificate options require --http-protocol https');
      expect(() => {
        const values42: readonly string[] = ['--http-protocol', 'https'];
        return parseCliOptions(values42);
      }).toThrow('HTTPS requires either --https-cert and --https-key, or --https-pfx');
      expect(() => {
        const values43: readonly string[] = ['--http-protocol', 'https', '--https-cert', './cert.pem'];
        return parseCliOptions(values43);
      }).toThrow('HTTPS requires either --https-cert and --https-key, or --https-pfx');
      expect(() => {
        const values44: readonly string[] = [
          '--http-protocol',
          'https',
          '--https-pfx',
          './cert.pfx',
          '--https-cert',
          './cert.pem',
          '--https-key',
          './key.pem',
        ];
        return parseCliOptions(values44);
      }).toThrow('HTTPS must use either --https-pfx or --https-cert with --https-key');
    });
  });
  it('accepts HTTPS certificate/key and PFX configurations', () => {
    const withCliEnvOptions20 = {} as const;
    withCliEnv(withCliEnvOptions20, () => {
      const values45: readonly string[] = [
        '--http-protocol',
        'https',
        '--https-cert',
        './cert.pem',
        '--https-key',
        './key.pem',
      ];
      const argumentValue14 = parseCliOptions(values45).http.tls;
      const receiver4Actual = argumentValue14;
      const toEqualOptions2 = {
        cert: './cert.pem',
        key: './key.pem',
        pfx: undefined,
        passphrase: undefined,
      } as const;
      expect(receiver4Actual).toEqual(toEqualOptions2);
      const values46: readonly string[] = [
        '--http-protocol',
        'https',
        '--https-pfx',
        './cert.pfx',
        '--https-passphrase',
        'secret',
      ];
      const argumentValue15 = parseCliOptions(values46).http.tls;
      const receiver5Actual = argumentValue15;
      const toEqualOptions3 = {
        cert: undefined,
        key: undefined,
        pfx: './cert.pfx',
        passphrase: 'secret',
      } as const;
      expect(receiver5Actual).toEqual(toEqualOptions3);
    });
  });
  it('accepts valid HTTP ports from CLI flags across the full port range', () => {
    const integerOptions = { min: 0, max: 65535 } as const;
    const integerResult = fc.integer(integerOptions);
    const propertyResult = fc.property(integerResult, (port) => {
      const withCliEnvOptions21 = {} as const;
      withCliEnv(withCliEnvOptions21, () => {
        const values47: readonly string[] = ['--http-port', String(port)];
        const argumentValue16 = parseCliOptions(values47).http.port;
        expect(argumentValue16).toBe(port);
      });
    });
    fc.assert(propertyResult);
  });
  it('accepts valid absolute HTTP endpoint paths', () => {
    const constantFromResult = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._~-',
    );
    const arrayOptions = {
      minLength: 1,
      maxLength: 12,
    } as const;
    const segment = fc.array(constantFromResult, arrayOptions).map((chars) => chars.join(''));
    const arrayOptions2 = { minLength: 1, maxLength: 4 } as const;
    const endpoint = fc
      .array(segment, arrayOptions2)
      .map((segments) => `/${segments.join('/')}`)
      .filter((value) => value !== HEALTHZ_PATH && value !== READYZ_PATH);
    const propertyResult2 = fc.property(endpoint, (value) => {
      const withCliEnvOptions22 = {} as const;
      withCliEnv(withCliEnvOptions22, () => {
        const values48: readonly string[] = ['--http-endpoint', value];
        const argumentValue17 = parseCliOptions(values48).http.endpoint;
        expect(argumentValue17).toBe(value);
      });
    });
    fc.assert(propertyResult2);
  });
  it('wires the doctor subcommand and JSON flag', async () => {
    let doctorJson = false;
    const createCliCommandOptions: Parameters<typeof createCliCommand>[1] = {
      doctorAction: (options) => {
        doctorJson = options.json === true;
      },
    };
    const command = createCliCommand('1.2.3', createCliCommandOptions);
    command.exitOverride();
    const configureOutputOptions: import('commander').OutputConfiguration = {
      writeOut: () => undefined,
      writeErr: () => undefined,
    };
    command.configureOutput(configureOutputOptions);
    const values49: readonly string[] | undefined = ['doctor', '--json'];
    const parseAsyncOptions = { from: 'user' } as const;
    await command.parseAsync(values49, parseAsyncOptions);
    expect(doctorJson).toBe(true);
    const helpInformationResult = command.helpInformation();
    expect(helpInformationResult).toContain('doctor');
    const helpInformationResult2 = command.commands
      .find((subcommand) => subcommand.name() === 'doctor')
      ?.helpInformation();
    expect(helpInformationResult2).toContain('--json');
  });
  it('generates Commander help and Markdown reference from the option metadata', () => {
    const help = createCliCommand('1.2.3').helpInformation();
    const reference = renderCliReferenceMarkdown('1.2.3');
    expect(help).toContain('Playwright MCP bridge backed by CloakBrowser');
    expect(help).toContain('--transport <mode>');
    expect(help).toContain('--geoip-proxy-match');
    expect(help).toContain('--release-channel <channel>');
    expect(help).toContain('doctor');
    expect(help).toContain('--http-protocol <protocol>');
    expect(help).toContain('--https-cert <path>');
    expect(help).toContain('--http-session-max <count>');
    expect(help).toContain('CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX');
    expect(reference).toContain('# CLI Reference');
    expect(reference).toContain('### `doctor`');
    expect(reference).toContain('CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH');
    expect(reference).toContain('CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL');
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
