import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Reader } from 'mmdb-lib';
import { chromium } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it, type TestContext } from 'vitest';
import {
  createFreeBrowserRuntime,
  type FreeBrowserRuntime,
  resolveFreeBrowserExecutable,
} from '@tests/helpers/browser-test-runtime.js';
import {
  cleanupDistributionE2e,
  createTempRoot,
  packAndInstallCurrentPackage,
} from '@tests/e2e/distributionHarness.js';
import { startBrowserProxy } from '@tests/helpers/browser-proxy.js';

describe('controlled proxy routing', () => {
  it('rejects an authority outside the fixture allowlist', async () => {
    const proxy = await startBrowserProxy();
    try {
      const options = { proxy: proxy.url, authority: 'outside.invalid:443' };
      const status = await proxy.probeConnect(options);
      expect(status).toBe(403);
      expect(proxy.requests).toEqual(emptyEntries);
    } finally {
      await proxy.close();
    }
    expect(proxy.socketCount).toBe(0);
  });
});

const diagnosticUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
const diagnostics = (await import(diagnosticUrl.href)) as {
  sanitizeDiagnostic: (value: unknown, secrets?: string[]) => string;
};
const dbUrl = new URL('../fixtures/geoip/GeoIP2-City-Test.mmdb', import.meta.url);
let runtime: FreeBrowserRuntime;
let command: ReturnType<typeof packAndInstallCurrentPackage>;
let databasePath: string;
let installedVersions: { cloakbrowser: string; playwrightMcp: string; freeChromium: string };
let freeChromium = '';
const syntheticCredentials = { username: 'fixture-user-canary', password: 'fixture-password-canary' };
const secrets = [syntheticCredentials.username, syntheticCredentials.password];
const emptyEntries: unknown[] = [];
const proxyModes = ['http', 'authenticated-http', 'socks'] as const;
const geoipFaults = ['no-record', 'corrupt-db', 'missing-db', 'timeout'] as const;
// Free macOS Chromium 145 does not apply the requested Intl locale: https://github.com/CloakHQ/CloakBrowser/issues/82
// Remove these temporary skips after a keyless Free build passes on both Intel and Apple Silicon.
const skipMacOsLocale = process.platform === 'darwin';

beforeAll(async () => {
  const downloadRoot = createTempRoot('cloak-proxy-download-');
  const binary = await resolveFreeBrowserExecutable(downloadRoot);
  const executable = binary.executable;
  freeChromium = binary.version;
  command = packAndInstallCurrentPackage();
  const packageDirectory = path.join(command.installRoot, 'node_modules');
  const cloakManifestPath = path.join(packageDirectory, 'cloakbrowser', 'package.json');
  const mcpManifestPath = path.join(packageDirectory, '@playwright', 'mcp', 'package.json');
  const cloakManifestText = await readFile(cloakManifestPath, 'utf8');
  const mcpManifestText = await readFile(mcpManifestPath, 'utf8');
  const cloakManifest = JSON.parse(cloakManifestText) as { version: string };
  const mcpManifest = JSON.parse(mcpManifestText) as { version: string };
  installedVersions = {
    cloakbrowser: cloakManifest.version,
    playwrightMcp: mcpManifest.version,
    freeChromium,
  };
  const root = createTempRoot('cloak-proxy-runtime-');
  const parentEnv = { ...process.env };
  for (const key of Object.keys(parentEnv)) {
    if (key.startsWith('PLAYWRIGHT_MCP_') || key.startsWith('CLOAK_PLAYWRIGHT_MCP_')) delete parentEnv[key];
  }
  const options = { root, freeExecutable: executable, parentEnv };
  runtime = await createFreeBrowserRuntime(options);
  const runtimeCache = runtime.env.CLOAKBROWSER_CACHE_DIR ?? '';
  const directory = path.join(runtimeCache, 'geoip');
  await mkdir(directory);
  databasePath = path.join(directory, 'GeoLite2-City.mmdb');
  await copyFile(dbUrl, databasePath);
});
afterAll(async () => {
  try {
    if (runtime) await runtime.dispose();
  } finally {
    cleanupDistributionE2e();
  }
});

function valueOf(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const parts = result.content as Array<{ type: string; text?: string }>;
  const text = parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n');
  const pattern = /### Result\n([\s\S]*?)(?:\n###|$)/u;
  const match = pattern.exec(text);
  const json = match?.[1]?.trim();
  if (!json) throw new Error('Missing observed browser value');
  return JSON.parse(json) as unknown;
}

async function withSession(
  context: TestContext,
  overrides: Record<string, string>,
  action: (client: Client) => Promise<void>,
): Promise<void> {
  const env = {
    ...runtime.env,
    PLAYWRIGHT_MCP_BROWSER_ENGINE: 'cloak',
    PLAYWRIGHT_MCP_ISOLATED: 'true',
    PLAYWRIGHT_MCP_HEADLESS: 'true',
    PLAYWRIGHT_MCP_CAPS: 'unsafe',
    PLAYWRIGHT_MCP_OUTPUT_DIR: runtime.root,
    DEBUG: 'pw:browser',
    ...overrides,
  };
  const transportOptions = { command: command.command, args: command.args, env, stderr: 'pipe' } as const;
  const transport = new StdioClientTransport(transportOptions);
  const clientOptions = { name: 'controlled proxy e2e', version: '1' };
  const client = new Client(clientOptions);
  let stderr = '';
  transport.stderr?.on('data', (bytes: Buffer | string) => {
    const combined = stderr + bytes.toString();
    stderr = combined.slice(-32768);
  });
  let cleanupObservedBrowserPid: number | undefined;
  let connected = false;
  try {
    try {
      await client.connect(transport);
      connected = true;
    } catch (cause) {
      const message = diagnostics.sanitizeDiagnostic(stderr, secrets);
      const options = { cause };
      const diagnostic = message || 'Packaged bridge did not initialize';
      throw new Error(diagnostic, options);
    }
    await action(client);
  } finally {
    // This tool may lazily start a replacement browser. Its PID verifies cleanup,
    // not the identity or survival of the browser that handled a failed action.
    const observation = {
      name: 'browser_run_code_unsafe',
      arguments: {
        code: `async (page) => {
      const browser = page.context().browser();
      if (!browser) throw new Error('Missing owned browser');
      const cdp = await browser.newBrowserCDPSession();
      try { const result = await cdp.send('SystemInfo.getProcessInfo');
        return result.processInfo.find((entry) => entry.type === 'browser').id;
      } finally { await cdp.detach(); }
    }`,
      },
    };
    if (connected) {
      try {
        const result = await client.callTool(observation);
        if (!result.isError) cleanupObservedBrowserPid = valueOf(result) as number;
      } catch {
        /* The cleanup observation may fail if no browser can be started or reached. */
      }
    }
    const pid = transport.pid;
    try {
      const close = { name: 'browser_close', arguments: {} };
      await client.callTool(close);
    } catch {
      /* Failed startup may have no connected upstream. */
    }
    await client.close();
    const evidence = {
      bridgePid: pid,
      cleanupObservedBrowserPid: cleanupObservedBrowserPid ?? null,
      versions: installedVersions,
      stderr,
    };
    const encoded = JSON.stringify(evidence);
    const safe = diagnostics.sanitizeDiagnostic(encoded, secrets);
    await context.annotate(safe, 'cloak:process-diagnostics');
    const owned = cleanupObservedBrowserPid ? [pid, cleanupObservedBrowserPid] : [pid];
    for (const ownedPid of owned) {
      if (!ownedPid) continue;
      const pollOptions = { timeout: 10000 };
      await expect
        .poll(() => {
          try {
            process.kill(ownedPid, 0);
            return true;
          } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
            throw error;
          }
        }, pollOptions)
        .toBe(false);
    }
  }
}
async function navigate(client: Client, url: string): Promise<void> {
  const request = { name: 'browser_navigate', arguments: { url } };
  const result = await client.callTool(request);
  if (result.isError) {
    const encoded = JSON.stringify(result);
    const safe = diagnostics.sanitizeDiagnostic(encoded, secrets);
    const message = `Proxy fixture navigation failed: ${safe}`;
    throw new Error(message);
  }
  expect(result.isError).not.toBe(true);
  const observation = {
    name: 'browser_evaluate',
    arguments: {
      function: '() => ({ marker: document.querySelector("h1")?.textContent, url: location.href })',
    },
  };
  const rendered = await client.callTool(observation);
  const value = valueOf(rendered);
  const expected = { marker: 'Proxy fixture marker', url };
  expect(value).toEqual(expected);
}
async function fingerprint(client: Client): Promise<unknown> {
  const request = {
    name: 'browser_evaluate',
    arguments: {
      function:
        '() => ({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale: Intl.DateTimeFormat().resolvedOptions().locale, language: navigator.language })',
    },
  };
  const result = await client.callTool(request);
  expect(result.isError).not.toBe(true);
  return valueOf(result);
}
async function assertFingerprint(
  client: Client,
  context: Pick<TestContext, 'annotate'>,
  expected: { timezone: string; locale: string; language: string },
): Promise<void> {
  const observed = await fingerprint(client);
  try {
    expect(observed).toEqual(expected);
  } catch (cause) {
    // Distinguish the browser's native flags from bridge/upstream behavior on the same Free executable.
    const args = [
      '--fingerprint=12345',
      `--fingerprint-timezone=${expected.timezone}`,
      `--lang=${expected.language}`,
      `--fingerprint-locale=${expected.locale}`,
    ];
    const native = await directFingerprint(args);
    // Upstream discussion #376 documents this native workaround for macOS Free 145.
    const acceptLanguageArg = `--accept-lang=${expected.language}`;
    const compatibilityArgs = [...args, acceptLanguageArg];
    const acceptLanguage = await directFingerprint(compatibilityArgs);
    const evidence = {
      expected,
      bridge: observed,
      directPlaywright: native,
      withAcceptLanguage: acceptLanguage,
      args,
      versions: installedVersions,
    };
    const encoded = JSON.stringify(evidence);
    const safe = diagnostics.sanitizeDiagnostic(encoded, secrets);
    await context.annotate(safe, 'cloak:process-diagnostics');
    throw cause;
  }
}
async function directFingerprint(args: string[]): Promise<unknown> {
  const options = {
    executablePath: runtime.env.CLOAKBROWSER_BINARY_PATH,
    env: runtime.env,
    headless: true,
    timeout: 15000,
    ignoreDefaultArgs: ['--enable-automation'],
    args,
  };
  try {
    const browser = await chromium.launch(options);
    runtime.ownCleanup(() => browser.close());
    try {
      const page = await browser.newPage();
      const observed = await page.evaluate(() => ({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        language: navigator.language,
      }));
      return { version: browser.version(), observed, args };
    } finally {
      await browser.close();
    }
  } catch (error) {
    return { error: String(error), args };
  }
}
async function withProxy(
  options: Parameters<typeof startBrowserProxy>[0],
  action: (proxy: Awaited<ReturnType<typeof startBrowserProxy>>) => Promise<void>,
): Promise<void> {
  const proxy = await startBrowserProxy(options);
  try {
    await action(proxy);
  } finally {
    await proxy.close();
  }
  expect(proxy.socketCount).toBe(0);
}

describe('packaged Free proxy and GeoIP', () => {
  it('retains a fingerprint mismatch while collecting native comparison evidence', async (context) => {
    const options = {};
    await withProxy(options, async (proxy) => {
      const env = { PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url, CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false' };
      await withSession(context, env, async (client) => {
        await navigate(client, proxy.fixtureUrl);
        const observed = await fingerprint(client);
        if (!observed || typeof observed !== 'object' || !('language' in observed)) {
          throw new Error('Missing observed fingerprint language');
        }
        const locale = observed.language === 'ja-JP' ? 'en-GB' : 'ja-JP';
        const expected = { timezone: 'Asia/Tokyo', locale, language: locale };
        const annotations: string[] = [];
        const annotate: TestContext['annotate'] = async (message) => {
          annotations.push(message);
          return context.annotate(message);
        };
        const diagnosticContext = { annotate };
        const assertion = assertFingerprint(client, diagnosticContext, expected);
        await expect(assertion).rejects.toThrow();
        expect(annotations).toHaveLength(1);
        const evidence = JSON.parse(annotations[0]) as Record<string, unknown>;
        const version = freeChromium.split('.').slice(0, 4).join('.');
        const native = { version, observed: { timezone: 'Asia/Tokyo' } };
        const expectedEvidence = {
          expected,
          bridge: observed,
          directPlaywright: native,
          withAcceptLanguage: native,
        };
        expect(evidence).toMatchObject(expectedEvidence);
      });
    });
  });
  it('verifies the pinned database and real MMDB lookup', async () => {
    const bytes = await readFile(dbUrl);
    expect(bytes.length).toBe(22569);
    const hash = createHash('sha1');
    const header = `blob ${bytes.length}\0`;
    hash.update(header);
    hash.update(bytes);
    const blob = hash.digest('hex');
    expect(blob).toBe('e20846ac1757a3745ae41411757ed3817536e3be');
    const reader = new Reader(bytes);
    const record = reader.get('81.2.69.160');
    const expected = { country: { iso_code: 'GB' }, location: { time_zone: 'Europe/London' } };
    expect(record).toMatchObject(expected);
  });

  it.for(proxyModes)('routes %s navigation and in-page fetch through the fixture', async (mode, context) => {
    const options = mode === 'authenticated-http' ? { authentication: syntheticCredentials } : {};
    await withProxy(options, async (proxy) => {
      const authenticated = proxy.url.replace(
        'http://',
        `http://${syntheticCredentials.username}:${syntheticCredentials.password}@`,
      );
      const selected =
        mode === 'socks' ? proxy.socksUrl : mode === 'authenticated-http' ? authenticated : proxy.url;
      const env = {
        PLAYWRIGHT_MCP_PROXY_SERVER: selected,
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false',
      };
      await withSession(context, env, async (client) => {
        await navigate(client, proxy.fixtureUrl);
        const request = {
          name: 'browser_evaluate',
          arguments: { function: 'async () => (await fetch("/fetch-proof")).text()' },
        };
        const result = await client.callTool(request);
        const value = valueOf(result);
        expect(value).toContain('Proxy fixture marker');
      });
      const matching = proxy.requests.filter((entry) => entry.authority === proxy.fixtureAuthority);
      const count = matching.length;
      expect(count).toBeGreaterThan(0);
      expect(proxy.originRequests).toContain('/');
      expect(proxy.originRequests).toContain('/fetch-proof');
      const modes = matching.map((entry) => entry.mode);
      const expectedMode = mode === 'socks' ? 'socks' : 'http';
      expect(modes).toContain(expectedMode);
      const serialized = JSON.stringify(proxy.requests);
      for (const secret of secrets) expect(serialized).not.toContain(secret);
    });
  });

  it('bypasses only the explicitly mapped hostname', async (context) => {
    const proxyOptions = {};
    await withProxy(proxyOptions, async (proxy) => {
      const args = ['--host-resolver-rules=MAP bypass.test 127.0.0.1'];
      const encoded = JSON.stringify(args);
      const env = {
        PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
        PLAYWRIGHT_MCP_PROXY_BYPASS: 'bypass.test',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false',
      };
      await withSession(context, env, async (client) => {
        await navigate(client, proxy.bypassUrl);
        expect(proxy.requests).toEqual(emptyEntries);
        await navigate(client, proxy.fixtureUrl);
        const matching = proxy.requests.filter((entry) => entry.authority === proxy.fixtureAuthority);
        expect(matching.length).toBeGreaterThan(0);
      });
    });
  });

  it.skipIf(skipMacOsLocale)(
    'observes real exit-IP discovery and timezone, locale and language matching',
    async (context) => {
      const proxyOptions = {};
      await withProxy(proxyOptions, async (proxy) => {
        const cert = fileURLToPath(proxy.certUrl);
        const env = {
          PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
          CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
          NODE_EXTRA_CA_CERTS: cert,
        };
        await withSession(context, env, async (client) => {
          await navigate(client, proxy.fixtureUrl);
          const expected = { timezone: 'Europe/London', locale: 'en-GB', language: 'en-GB' };
          await assertFingerprint(client, context, expected);
        });
        const echoes = proxy.requests.filter((entry) => entry.mode === 'connect');
        expect(echoes.length).toBeGreaterThan(0);
      });
    },
  );

  it.skipIf(skipMacOsLocale)(
    'keeps explicit fingerprint overrides and does not query echo when matching is disabled',
    async (context) => {
      const proxyOptions = {};
      await withProxy(proxyOptions, async (proxy) => {
        const args = ['--fingerprint-timezone=Asia/Tokyo', '--lang=ja-JP', '--fingerprint-locale=ja-JP'];
        const encoded = JSON.stringify(args);
        const cert = fileURLToPath(proxy.certUrl);
        const env = {
          PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
          CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false',
          CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
          NODE_EXTRA_CA_CERTS: cert,
        };
        await withSession(context, env, async (client) => {
          await navigate(client, proxy.fixtureUrl);
          const expected = { timezone: 'Asia/Tokyo', locale: 'ja-JP', language: 'ja-JP' };
          await assertFingerprint(client, context, expected);
        });
        const echoes = proxy.requests.filter((entry) => entry.mode === 'connect');
        expect(echoes).toEqual(emptyEntries);
      });
    },
  );

  it.for(geoipFaults)('fails closed for %s and permits a clean valid restart', async (fault, context) => {
    const options =
      fault === 'no-record' ? { echo: '192.0.2.1' } : fault === 'timeout' ? { hangEcho: true } : {};
    if (fault === 'corrupt-db') await writeFile(databasePath, 'not-a-database');
    const preloadPath = path.join(runtime.root, 'offline.cjs');
    if (fault === 'missing-db') {
      await rm(databasePath);
      const preload = `const original = globalThis.fetch; globalThis.fetch = (input, ...rest) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === 'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb')
          return Promise.reject(new Error('Controlled offline GeoIP database download'));
        return original(input, ...rest);
      };`;
      await writeFile(preloadPath, preload);
    }
    try {
      await withProxy(options, async (proxy) => {
        const cert = fileURLToPath(proxy.certUrl);
        const env: Record<string, string> = {
          PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
          CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
          NODE_EXTRA_CA_CERTS: cert,
          CLOAKBROWSER_GEOIP_TIMEOUT_SECONDS: '0.3',
        };
        const profile = path.join(runtime.root, `profile-${fault}`);
        env.PLAYWRIGHT_MCP_USER_DATA_DIR = profile;
        if (fault === 'missing-db') env.NODE_OPTIONS = `--require=${JSON.stringify(preloadPath)}`;
        const startup = withSession(context, env, async () => {
          throw new Error('GeoIP failure unexpectedly reached an initialized session');
        });
        await expect(startup).rejects.toThrow(/GeoIP|timezone|locale|timed out/i);
      });
    } finally {
      await copyFile(dbUrl, databasePath);
    }
    const proxyOptions = {};
    await withProxy(proxyOptions, async (proxy) => {
      const cert = fileURLToPath(proxy.certUrl);
      const profile = path.join(runtime.root, `profile-${fault}`);
      const env = {
        PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
        NODE_EXTRA_CA_CERTS: cert,
        PLAYWRIGHT_MCP_USER_DATA_DIR: profile,
      };
      await withSession(context, env, async (client) => {
        await navigate(client, proxy.fixtureUrl);
      });
    });
  });
  it.skipIf(skipMacOsLocale)(
    'preserves explicit values with matching enabled while querying the proxy exit IP',
    async (context) => {
      const proxyOptions = {};
      await withProxy(proxyOptions, async (proxy) => {
        const cert = fileURLToPath(proxy.certUrl);
        const args = ['--fingerprint-timezone=Asia/Tokyo', '--lang=ja-JP', '--fingerprint-locale=ja-JP'];
        const encoded = JSON.stringify(args);
        const env = {
          PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
          CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
          CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
          NODE_EXTRA_CA_CERTS: cert,
        };
        await withSession(context, env, async (client) => {
          await navigate(client, proxy.fixtureUrl);
          const expected = { timezone: 'Asia/Tokyo', locale: 'ja-JP', language: 'ja-JP' };
          await assertFingerprint(client, context, expected);
        });
        const echoes = proxy.requests.filter((entry) => entry.mode === 'connect');
        expect(echoes.length).toBeGreaterThan(0);
      });
    },
  );

  it('reports unavailable proxy navigation and recovers using a fresh valid runtime', async (context) => {
    const unavailable = await startBrowserProxy();
    await unavailable.close();
    const env = {
      PLAYWRIGHT_MCP_PROXY_SERVER: unavailable.url,
      CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false',
    };
    await withSession(context, env, async (client) => {
      const request = { name: 'browser_navigate', arguments: { url: unavailable.fixtureUrl } };
      const result = await client.callTool(request);
      expect(result.isError).toBe(true);
      const serialized = JSON.stringify(result);
      expect(serialized).toMatch(/ERR_PROXY_CONNECTION_FAILED|proxy.*connection/i);
    });
    expect(unavailable.socketCount).toBe(0);
    const proxyOptions = {};
    await withProxy(proxyOptions, async (proxy) => {
      const valid = {
        PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'false',
      };
      await withSession(context, valid, async (client) => {
        await navigate(client, proxy.fixtureUrl);
      });
    });
  });
  it('fails closed when explicit overrides cannot discover the exit IP', async (context) => {
    const proxyOptions = { hangEcho: true };
    await withProxy(proxyOptions, async (proxy) => {
      const cert = fileURLToPath(proxy.certUrl);
      const args = ['--fingerprint-timezone=Asia/Tokyo', '--lang=ja-JP', '--fingerprint-locale=ja-JP'];
      const encoded = JSON.stringify(args);
      const env = {
        PLAYWRIGHT_MCP_PROXY_SERVER: proxy.url,
        CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH: 'true',
        CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: encoded,
        NODE_EXTRA_CA_CERTS: cert,
        CLOAKBROWSER_GEOIP_TIMEOUT_SECONDS: '0.3',
      };
      const startup = withSession(context, env, async (client) => {
        await navigate(client, proxy.fixtureUrl);
      });
      await expect(startup).rejects.toThrow(/GeoIP|timed out/i);
    });
  });
});
