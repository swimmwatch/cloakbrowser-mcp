import { spawn, type SpawnOptions } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { type BrowserContext, chromium } from 'playwright';
import { expect, type TestContext } from 'vitest';
import { ModuleKind, transpileModule } from 'typescript';
import {
  type FreeBrowserRuntime,
  killOwnedProcess,
  withCleanupDeadline,
} from '@tests/helpers/browser-test-runtime.js';
import type { DistributionCommand } from '@tests/e2e/distributionHarness.js';

const diagnosticsUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
const diagnostics = (await import(diagnosticsUrl.href)) as {
  sanitizeDiagnostic: (value: unknown, secrets?: string[]) => string;
};
const commit = 'e8149b8257d32dcf8f72573ecc43e72439da7080';
const source = `https://codeload.github.com/microsoft/playwright/tar.gz/${commit}`;
const sourceSha256 = '096dcce4c691e12afa4946819187a5aaa7f5d93da7387222b5220c7a9cb089d4';
const sourceLimit = 64 * 1024 * 1024;
const removal = { recursive: true, force: true };
const directoryOptions = { recursive: true };
export interface OfficialExtension {
  directory: string;
  id: string;
  version: string;
}

export async function prepareControlledExtension(runtime: FreeBrowserRuntime): Promise<URL> {
  const sourceUrl = new URL('../fixtures/extensions/content/content.ts', import.meta.url);
  const manifestUrl = new URL('../fixtures/extensions/content/manifest.json', import.meta.url);
  const directory = path.join(runtime.root, 'controlled-extension');
  await mkdir(directory);
  const text = await readFile(sourceUrl, 'utf8');
  const options = { compilerOptions: { module: ModuleKind.None } };
  const output = transpileModule(text, options);
  const script = path.join(directory, 'content.js');
  const manifest = path.join(directory, 'manifest.json');
  await writeFile(script, output.outputText);
  await copyFile(manifestUrl, manifest);
  return pathToFileURL(directory);
}

/** Build the exact official extension source against its original lockfile in an owned checkout. */
export async function prepareOfficialExtension(runtime: FreeBrowserRuntime): Promise<OfficialExtension> {
  const downloadStarted = Date.now();
  process.stderr.write('Extension preparation: downloading pinned source\n');
  const checkout = path.join(runtime.root, 'playwright');
  await mkdir(checkout);
  const signal = AbortSignal.timeout(120000);
  const fetchOptions = { signal, redirect: 'error' } as const;
  const response = await fetch(source, fetchOptions);
  if (!response.ok || !response.body) {
    await response.body?.cancel();
    const message = `Official extension source download failed: HTTP ${response.status}`;
    throw new Error(message);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const read = await reader.read();
      const { done } = read;
      if (done) break;
      const value: unknown = read.value;
      if (!(value instanceof Uint8Array)) throw new Error('Official extension source contains non-byte data');
      size += value.length;
      if (size > sourceLimit) throw new Error('Official extension source archive exceeds size limit');
      chunks.push(value);
    }
  } finally {
    try {
      await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = Buffer.concat(chunks, size);
  const checksum = createHash('sha256');
  checksum.update(bytes);
  const actual = checksum.digest('hex');
  if (actual !== sourceSha256) throw new Error('Official extension source archive checksum mismatch');
  const downloadedIn = Date.now() - downloadStarted;
  const verified = `Extension preparation: verified ${size} source bytes in ${downloadedIn}ms\n`;
  process.stderr.write(verified);
  const archiveName = 'playwright-source.tar.gz';
  const archive = path.join(runtime.root, archiveName);
  await writeFile(archive, bytes);
  // GNU tar treats a drive-letter archive path as a remote host; relative names work on BSD tar too.
  // Keep the original root manifests and the extension's complete build inputs, without unrelated browser sources.
  const archiveRoot = `playwright-${commit}`;
  const inputs = ['package.json', 'package-lock.json', 'LICENSE', 'NOTICE', 'packages/extension'];
  const members = inputs.map((input) => `${archiveRoot}/${input}`);
  const extract = ['-xzf', archiveName, '-C', 'playwright', '--strip-components=1', ...members];
  try {
    await runTool(runtime, 'tar', extract, runtime.root, 'extract verified official source');
  } finally {
    await rm(archive);
  }
  // These packages are imported by the pinned Vite config and extension UI. Other root
  // dependencies build unrelated Playwright components; keep the official lockfile intact.
  const packagePath = path.join(checkout, 'package.json');
  const packageText = await readFile(packagePath, 'utf8');
  const packageManifest = JSON.parse(packageText) as { devDependencies: Record<string, string> };
  const buildPackages = ['vite', '@vitejs/plugin-react', 'vite-plugin-static-copy', 'react', 'react-dom'];
  const buildDependencies: Record<string, string> = {};
  for (const name of buildPackages) {
    const version = packageManifest.devDependencies[name];
    if (typeof version !== 'string') {
      const message = `Official extension build dependency is missing: ${name}`;
      throw new Error(message);
    }
    buildDependencies[name] = version;
  }
  packageManifest.devDependencies = buildDependencies;
  const buildManifest = JSON.stringify(packageManifest);
  await writeFile(packagePath, buildManifest);
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error('Run extension E2E through npm to provide npm_execpath');
  const install = [
    npm,
    'ci',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--workspaces=false',
    '--prefer-offline',
    '--loglevel=verbose',
  ];
  await runTool(runtime, process.execPath, install, checkout, 'install official build dependencies');
  const packageDirectory = path.join(checkout, 'packages', 'extension');
  const vite = path.join(checkout, 'node_modules', 'vite', 'bin', 'vite.js');
  const build = [vite, 'build', '--clearScreen=false'];
  await runTool(runtime, process.execPath, build, packageDirectory, 'build official extension');
  const directory = path.join(packageDirectory, 'dist');
  const manifestPath = path.join(directory, 'manifest.json');
  const text = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(text) as { key: string; version: string };
  const publicKey = Buffer.from(manifest.key, 'base64');
  const hash = createHash('sha256');
  hash.update(publicKey);
  const hex = hash.digest('hex').slice(0, 32);
  const id = hex.replace(/[\da-f]/gu, (digit) => {
    const value = Number.parseInt(digit, 16);
    const code = 97 + value;
    return String.fromCharCode(code);
  });
  return { directory, id, version: manifest.version };
}

async function runTool(
  runtime: FreeBrowserRuntime,
  command: string,
  args: string[],
  cwd: string,
  step: string,
): Promise<void> {
  const started = Date.now();
  const starting = `Extension preparation: ${step} started\n`;
  process.stderr.write(starting);
  const options: SpawnOptions = { cwd, env: runtime.env, stdio: ['ignore', 'pipe', 'pipe'] };
  const child = spawn(command, args, options);
  runtime.ownChild(child);
  let output = '';
  for (const stream of [child.stdout, child.stderr])
    stream?.on('data', (bytes: Buffer) => {
      output = (output + bytes.toString()).slice(-16384);
    });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
    }, 120000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        const elapsed = Date.now() - started;
        const completed = `Extension preparation: ${step} completed in ${elapsed}ms\n`;
        process.stderr.write(completed);
        resolve();
      } else {
        const safe = diagnostics.sanitizeDiagnostic(output);
        const elapsed = Date.now() - started;
        const message = `Extension preparation failed (${step}, ${command}, ${elapsed}ms, exit ${String(code)}, signal ${String(signal)}): ${safe}`;
        const error = new Error(message);
        reject(error);
      }
    });
  });
}

export function observedValue(result: Awaited<ReturnType<Client['callTool']>>): unknown {
  const parts = result.content as Array<{ type: string; text?: string }>;
  const text = parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text ?? '')
    .join('\n');
  const match = /### Result\n([\s\S]*?)(?:\n###|$)/u.exec(text);
  if (!match?.[1]) throw new Error('Missing observed extension browser value');
  return JSON.parse(match[1]) as unknown;
}

export async function withExtensionClient(
  options: {
    runtime: FreeBrowserRuntime;
    command: DistributionCommand;
    context: TestContext;
    profile: string;
    token?: string;
    unpacked?: URL;
    secrets?: string[];
  },
  action: (client: Client) => Promise<void>,
): Promise<void> {
  const { runtime, profile } = options;
  const unpacked = options.unpacked ? fileURLToPath(options.unpacked) : undefined;
  const env: Record<string, string> = {
    ...runtime.env,
    PLAYWRIGHT_MCP_USER_DATA_DIR: profile,
    PLAYWRIGHT_MCP_OUTPUT_DIR: runtime.root,
    PLAYWRIGHT_MCP_CAPS: 'unsafe',
    PLAYWRIGHT_MCP_HEADLESS: unpacked ? 'true' : 'false',
    CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
  };
  if (unpacked) {
    env.PLAYWRIGHT_MCP_BROWSER_ENGINE = 'cloak';
    env.CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS = unpacked;
    env.DEBUG = 'pw:browser';
  } else {
    env.PLAYWRIGHT_MCP_EXTENSION = 'true';
    env.PLAYWRIGHT_MCP_BROWSER = 'chromium';
    env.PLAYWRIGHT_MCP_EXECUTABLE_PATH = runtime.env.CLOAKBROWSER_BINARY_PATH ?? '';
    if (options.token) env.PLAYWRIGHT_MCP_EXTENSION_TOKEN = options.token;
  }
  const secrets = [...(options.secrets ?? []), ...(options.token ? [options.token] : [])];
  const transportOptions = {
    command: options.command.command,
    args: options.command.args,
    env,
    stderr: 'pipe',
  } as const;
  const transport = new StdioClientTransport(transportOptions);
  const clientOptions = { name: 'controlled extension E2E', version: '1' };
  const client = new Client(clientOptions);
  let stderr = '';
  let connected = false;
  let bridgePid: number | null = null;
  let observedBrowserPid: number | undefined;
  transport.stderr?.on('data', (bytes: Buffer | string) => {
    stderr = (stderr + bytes.toString()).slice(-32768);
  });
  const disposeClient = async (): Promise<void> => {
    try {
      await client.close();
    } finally {
      await transport.close();
    }
  };
  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= withCleanupDeadline(disposeClient, 'Extension client cleanup', () =>
      killOwnedProcess(bridgePid),
    );
    return closing;
  };
  runtime.ownCleanup(close);
  try {
    const connection = client.connect(transport);
    bridgePid = transport.pid;
    await connection;
    connected = true;
    await action(client);
  } catch (cause) {
    const combined = `${String(cause)}\n${stderr}`;
    const safe = diagnostics.sanitizeDiagnostic(combined, secrets);
    const safeError = new Error(safe);
    const originalStack = cause instanceof Error ? (cause.stack ?? safe) : safe;
    safeError.stack = diagnostics.sanitizeDiagnostic(originalStack, secrets);
    const errorOptions = { cause: safeError };
    throw new Error(safe, errorOptions);
  } finally {
    const cleanup = async (): Promise<void> => {
      if (connected && unpacked) {
        const request = {
          name: 'browser_run_code_unsafe',
          arguments: {
            code: 'async (page) => { const session = await page.context().browser().newBrowserCDPSession(); try { const result = await session.send("SystemInfo.getProcessInfo"); return result.processInfo.find(entry => entry.type === "browser").id; } finally { await session.detach(); } }',
          },
        };
        try {
          const result = await client.callTool(request);
          if (!result.isError) {
            const value = observedValue(result);
            if (typeof value === 'number') observedBrowserPid = value;
          }
        } catch {
          /* Failed browser startup may not expose a process. */
        }
      }
      const pid = bridgePid;
      const browserPidMatch = /<launched> pid=(\d+)/u.exec(stderr);
      const browserPid =
        observedBrowserPid ?? (browserPidMatch?.[1] ? Number(browserPidMatch[1]) : undefined);
      observedBrowserPid = browserPid;
      await close();
      const details = {
        bridgePid: pid,
        browserPid,
        stderr,
        extension: unpacked ? 'controlled content script' : 'official 0.4.0',
        executable: env.PLAYWRIGHT_MCP_EXECUTABLE_PATH || runtime.env.CLOAKBROWSER_BINARY_PATH,
      };
      const evidence = JSON.stringify(details);
      const safe = diagnostics.sanitizeDiagnostic(evidence, secrets);
      await options.context.annotate(safe, 'cloak:process-diagnostics');
      for (const ownedPid of [pid, browserPid]) if (ownedPid) await expectProcessClosed(ownedPid);
    };
    await withCleanupDeadline(cleanup, 'Extension session cleanup', () => {
      killOwnedProcess(bridgePid);
      killOwnedProcess(observedBrowserPid);
    });
  }
}

async function expectProcessClosed(pid: number): Promise<void> {
  const options = { timeout: 10000 };
  await expect
    .poll(() => {
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
        throw error;
      }
    }, options)
    .toBe(false);
}

export async function startExtensionBrowser(options: {
  runtime: FreeBrowserRuntime;
  official: OfficialExtension;
  profile: string;
  readinessTimeout?: number;
  loadExtension?: boolean;
}) {
  const { runtime, official, profile } = options;
  const installed = path.join(profile, 'Default', 'Extensions', official.id);
  await mkdir(installed, directoryOptions);
  const launchOptions = {
    executablePath: runtime.env.CLOAKBROWSER_BINARY_PATH,
    headless: false,
    ignoreDefaultArgs: ['--enable-automation'],
    args:
      options.loadExtension === false
        ? []
        : [`--disable-extensions-except=${official.directory}`, `--load-extension=${official.directory}`],
    env: runtime.env,
    timeout: 15000,
  };
  let context: BrowserContext | undefined;
  let pid: number | undefined;
  let disposal: Promise<void> | undefined;
  const relayPorts = new Set<number>();
  const close = (): Promise<void> => {
    disposal ??= withCleanupDeadline(
      async () => {
        try {
          if (context) await context.close();
        } finally {
          await rm(profile, removal);
        }
        if (pid) await expectProcessClosed(pid);
        for (const port of relayPorts) {
          const pollOptions = { timeout: 10000 };
          await expect.poll(() => portOpen(port), pollOptions).toBe(false);
        }
      },
      'Extension browser cleanup',
      () => killOwnedProcess(pid),
    );
    return disposal;
  };
  runtime.ownCleanup(close);
  let token = '';
  try {
    context = await chromium.launchPersistentContext(profile, launchOptions);
    const session = await context.browser()?.newBrowserCDPSession();
    if (!session) throw new Error('Owned extension browser does not expose process information');
    try {
      const processes = await session.send('SystemInfo.getProcessInfo');
      pid = processes.processInfo.find((entry) => entry.type === 'browser')?.id;
      if (!pid) throw new Error('Missing owned extension browser PID');
    } finally {
      await session.detach();
    }
    const trackRelay = (value: string): void => {
      if (!value.startsWith(`chrome-extension://${official.id}/connect.html`)) return;
      const url = new URL(value);
      const relay = url.searchParams.get('mcpRelayUrl');
      if (relay) {
        const parsed = new URL(relay);
        const port = Number(parsed.port);
        relayPorts.add(port);
      }
    };
    context.on('page', (page) => {
      const value = page.url();
      trackRelay(value);
      page.on('framenavigated', (frame) => {
        const value = frame.url();
        trackRelay(value);
      });
    });
    const eventOptions = { timeout: options.readinessTimeout ?? 15000 };
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', eventOptions));
    const workerUrl = worker.url();
    const expectedWorkerPrefix = `chrome-extension://${official.id}/`;
    expect(workerUrl).toContain(expectedWorkerPrefix);
    const status = await context.newPage();
    const statusUrl = `chrome-extension://${official.id}/status.html`;
    await status.goto(statusUrl);
    const locator = status.locator('.auth-token-code');
    const raw = await locator.textContent(eventOptions);
    token = raw?.split('=')[1] ?? '';
    if (!token) throw new Error('Official extension UI did not provide a token');
    await status.close();
    const ownedContext = context;
    const observedPages = (url: string) =>
      ownedContext.pages().filter((page) => page.url().replace(/\/$/u, '') === url);
    const expectClicked = async (url: string): Promise<void> => {
      const ports = relayPorts.size;
      expect(ports).toBeGreaterThan(0);
      const pollOptions = { timeout: 5000 };
      await expect
        .poll(async () => {
          const pages = observedPages(url);
          const observations = pages.map(async (page) => {
            const locator = page.locator('#result');
            return await locator.textContent();
          });
          const values = await Promise.all(observations);
          return values.includes('Clicked');
        }, pollOptions)
        .toBe(true);
    };
    const expectUsable = async (url: string): Promise<void> => {
      const page = await ownedContext.newPage();
      try {
        await page.goto(url);
        const locator = page.locator('h1');
        const text = await locator.textContent();
        expect(text).toBe('Release marker');
      } finally {
        await page.close();
      }
    };
    const expectPending = async (url: string): Promise<void> => {
      const pollOptions = { timeout: 5000 };
      await expect
        .poll(async () => {
          const pages = observedPages(url);
          const observations = pages.map((page) => page.evaluate('document.body.dataset.pending'));
          const values = await Promise.all(observations);
          return values.includes('true');
        }, pollOptions)
        .toBe(true);
    };
    const disconnect = async (): Promise<void> => {
      const page = await ownedContext.newPage();
      try {
        await page.goto(statusUrl);
        const buttonOptions = { name: 'Disconnect', exact: true };
        const button = page.getByRole('button', buttonOptions);
        await button.click();
      } finally {
        await page.close();
      }
    };
    const expectRejectedToken = async (): Promise<void> => {
      const page = ownedContext
        .pages()
        .find((page) => page.url().startsWith(`chrome-extension://${official.id}/connect.html`));
      if (!page) throw new Error('Missing official rejection UI');
      const textOptions = { exact: true };
      const message = page.getByText('Invalid token provided.', textOptions);
      await expect.poll(() => message.isVisible()).toBe(true);
    };
    const expectSameProcess = async (): Promise<void> => {
      const session = await ownedContext.browser()?.newBrowserCDPSession();
      if (!session) throw new Error('Owned browser disconnected');
      try {
        const result = await session.send('SystemInfo.getProcessInfo');
        const current = result.processInfo.find((entry) => entry.type === 'browser')?.id;
        expect(current).toBe(pid);
      } finally {
        await session.detach();
      }
    };
    const safeResult = (result: unknown): string => {
      const encoded = JSON.stringify(result);
      const values = [token];
      return diagnostics.sanitizeDiagnostic(encoded, values);
    };
    return {
      context: ownedContext,
      token,
      close,
      expectClicked,
      expectUsable,
      expectPending,
      disconnect,
      expectRejectedToken,
      expectSameProcess,
      safeResult,
    };
  } catch (cause) {
    await close();
    const values = token ? [token] : [];
    const message = String(cause);
    const safe = diagnostics.sanitizeDiagnostic(message, values);
    const safeError = new Error(safe);
    const originalStack = cause instanceof Error ? (cause.stack ?? safe) : safe;
    safeError.stack = diagnostics.sanitizeDiagnostic(originalStack, values);
    const errorOptions = { cause: safeError };
    throw new Error(safe, errorOptions);
  }
}

function portOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const options = { host: '127.0.0.1', port };
    const socket = createConnection(options);
    let done = false;
    const finish = (open: boolean): void => {
      if (done) return;
      done = true;
      socket.once('close', () => resolve(open));
      socket.destroy();
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(true));
  });
}
