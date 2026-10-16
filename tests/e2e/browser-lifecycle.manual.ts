import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createConnection, createServer } from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it, type TestContext } from 'vitest';
import { LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { profileSeedFileName } from '@/bridge/profile-seed.js';
import { BRIDGE_INITIALIZE_META_KEY, JSON_RPC_VERSION, MCP_SESSION_ID_HEADER } from '@/protocol/constants.js';
import {
  cleanupDistributionE2e,
  createTempRoot,
  packAndInstallCurrentPackage,
} from '@tests/e2e/distributionHarness.js';
import { startNpmBrowserFixture } from '@tests/e2e/npm-browser-fixture.js';
import {
  createFreeBrowserRuntime,
  type FreeBrowserRuntime,
  resolveFreeBrowserExecutable,
} from '@tests/helpers/browser-test-runtime.js';

const disposalTimeout = 10000;
const cycles = 5;
const diagnosticsUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
const diagnostics = (await import(diagnosticsUrl.href)) as { sanitizeDiagnostic: (value: unknown) => string };
let runtime: FreeBrowserRuntime;
let cli: string;
interface CdpInfo {
  state: string;
  generation: number;
  port: number;
  discoveryUrl?: string;
}
interface Session {
  id: string;
  browser: Browser;
  pid: number;
  upstreamPid: number;
  cdp: CdpInfo;
}
interface ToolResult {
  isError?: boolean;
  content: unknown[];
  structuredContent?: Record<string, unknown>;
}

beforeAll(async () => {
  const command = packAndInstallCurrentPackage();
  const downloadRoot = createTempRoot('cloak-browser-download-');
  const binary = await resolveFreeBrowserExecutable(downloadRoot);
  const executable = binary.executable;
  const root = createTempRoot('cloak-lifecycle-');
  const parentEnv = { ...command.env };
  for (const key of Object.keys(parentEnv)) {
    if (key.startsWith('PLAYWRIGHT_MCP_') || key.startsWith('CLOAK_PLAYWRIGHT_MCP_')) delete parentEnv[key];
  }
  const options = { root, freeExecutable: executable, parentEnv };
  runtime = await createFreeBrowserRuntime(options);
  cli = command.cliPath;
});
afterAll(async () => {
  try {
    await runtime?.dispose();
  } finally {
    cleanupDistributionE2e();
  }
});

/** Deadline includes the whole disposal operation and all absence assertions. */
async function bounded<T>(operation: Promise<T>, message: string, timeout = disposalTimeout): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(message);
      reject(error);
    }, timeout);
  });
  const contenders = [operation, expired];
  try {
    return await Promise.race(contenders);
  } finally {
    clearTimeout(timer);
  }
}
function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    throw error;
  }
}
function portOpen(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    const options = { host: '127.0.0.1', port };
    const socket = createConnection(options);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', (error: NodeJS.ErrnoException) => {
      socket.destroy();
      if (error.code === 'ECONNREFUSED') resolve(false);
      else reject(error);
    });
  });
}
async function stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
  child.kill();
  try {
    await bounded(closed, 'Owned HTTP process exceeded disposal deadline');
  } catch (error) {
    child.kill('SIGKILL');
    await closed;
    throw error;
  }
}

async function startServer(context: TestContext): Promise<{
  url: URL;
  child: ChildProcessWithoutNullStreams;
  close: () => Promise<void>;
  upstreamPidFile: string;
  cdpPort: number;
  rpc: (
    method: string,
    params: Record<string, unknown>,
    id?: string,
  ) => Promise<{ response: Response; result?: ToolResult; error?: { message: string } }>;
}> {
  const reservation = createServer();
  await new Promise<void>((resolve, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolve);
  });
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('Missing reserved CDP port');
  await new Promise<void>((resolve, reject) =>
    reservation.close((error) => {
      if (error) reject(error);
      else resolve();
    }),
  );
  const range = String(address.port);
  const ownerId = randomUUID();
  const upstreamPidFile = path.join(runtime.root, `${ownerId}.pid`);
  const launcher = path.join(runtime.root, `${ownerId}.mjs`);
  const dist = path.dirname(cli);
  const packageRoot = path.dirname(dist);
  const modules = path.dirname(packageRoot);
  const upstreamCli = path.join(modules, '@playwright', 'mcp', 'cli.js');
  const upstreamUrl = pathToFileURL(upstreamCli);
  const pidLiteral = JSON.stringify(upstreamPidFile);
  const urlLiteral = JSON.stringify(upstreamUrl.href);
  const script = `import { writeFileSync } from 'node:fs';\nconst filename = ${pidLiteral};\nconst pid = String(process.pid);\nwriteFileSync(filename, pid);\nawait import(${urlLiteral});\n`;
  await writeFile(launcher, script);
  const env = {
    ...runtime.env,
    PLAYWRIGHT_MCP_CLI_PATH: launcher,
    PLAYWRIGHT_MCP_HEADLESS: 'true',
    PLAYWRIGHT_MCP_CAPS: 'unsafe',
    DEBUG: 'pw:browser',
    CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'true',
    CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: range,
  };
  const args = [cli, '--transport', 'streamable-http', '--http-host', '127.0.0.1', '--http-port', '0'];
  const options = { env };
  const child = spawn(process.execPath, args, options);
  runtime.ownChild(child);
  let stderr = '';
  let stdout = '';
  child.stdout.on('data', (bytes: Buffer) => {
    stdout = (stdout + bytes.toString()).slice(-32768);
  });
  const ready = new Promise<URL>((resolve, reject) => {
    const onData = (bytes: Buffer): void => {
      stderr = (stderr + bytes.toString()).slice(-32768);
      const match = /streamable-http listening[^\n]*url=(\S+)/u.exec(stderr);
      if (match?.[1]) {
        const url = new URL(match[1]);
        resolve(url);
      }
    };
    child.stderr.on('data', onData);
    child.once('error', reject);
    child.once('close', () => {
      const safe = diagnostics.sanitizeDiagnostic(stderr);
      const message = `HTTP process exited before readiness: ${safe}`;
      const error = new Error(message);
      reject(error);
    });
  });
  let closing: Promise<void> | undefined;
  const dispose = async (): Promise<void> => {
    try {
      await stopChild(child);
      expect(stdout).toBe('');
    } finally {
      const evidence = { pid: child.pid, exit: child.exitCode, signal: child.signalCode, stderr };
      const safe = diagnostics.sanitizeDiagnostic(evidence);
      await context.annotate(safe, 'cloak:process-diagnostics');
    }
  };
  const close = (): Promise<void> => {
    closing ??= dispose();
    return closing;
  };
  runtime.ownCleanup(close);
  let url: URL;
  try {
    url = await bounded(ready, 'HTTP process readiness deadline', 75000);
  } catch (error) {
    await close();
    throw error;
  }
  const rpc = async (method: string, params: Record<string, unknown>, id?: string) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (id) headers[MCP_SESSION_ID_HEADER] = id;
    const envelope = { jsonrpc: JSON_RPC_VERSION, id: randomUUID(), method, params };
    const body = JSON.stringify(envelope);
    const signal = AbortSignal.timeout(30000);
    const request = { method: 'POST', headers, body, signal };
    const response = await fetch(url, request);
    const text = await response.text();
    const data =
      text.startsWith('event:') || text.startsWith('data:')
        ? text
            .split('\n')
            .find((line) => line.startsWith('data: '))
            ?.slice(6)
        : text;
    if (!data) throw new Error('HTTP RPC returned no envelope');
    const value = JSON.parse(data) as { result?: ToolResult; error?: { message: string } };
    return { response, ...value };
  };
  return { url, child, close, rpc, upstreamPidFile, cdpPort: address.port };
}
type HttpServer = Awaited<ReturnType<typeof startServer>>;

async function initialize(server: HttpServer, profile: string): Promise<string> {
  const meta = { [BRIDGE_INITIALIZE_META_KEY]: { userDataDir: profile } };
  const params = {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'lifecycle-e2e', version: '1' },
    _meta: meta,
  };
  const reply = await server.rpc('initialize', params);
  if (reply.error) throw new Error(reply.error.message);
  expect(reply.response.status).toBe(200);
  const id = reply.response.headers.get(MCP_SESSION_ID_HEADER);
  if (!id) throw new Error('Initialize did not return a session ID');
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    [MCP_SESSION_ID_HEADER]: id,
  };
  const notification = { jsonrpc: JSON_RPC_VERSION, method: 'notifications/initialized' };
  const body = JSON.stringify(notification);
  const request = { method: 'POST', headers, body };
  const response = await fetch(server.url, request);
  await response.arrayBuffer();
  expect(response.status).toBe(202);
  return id;
}
async function tool(
  server: HttpServer,
  id: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResult> {
  const params = { name, arguments: args };
  const reply = await server.rpc('tools/call', params, id);
  if (reply.error || !reply.result || reply.result.isError) {
    const serialized = JSON.stringify(reply);
    const safe = diagnostics.sanitizeDiagnostic(serialized);
    throw new Error(safe);
  }
  return reply.result;
}
async function cdpInfo(server: HttpServer, id: string): Promise<CdpInfo> {
  const result = await tool(server, id, LOCAL_TOOL_BRIDGE_INFO);
  const content = result.structuredContent as Record<string, unknown> | undefined;
  return content?.cdp as CdpInfo;
}
async function startSession(server: HttpServer, profile: string, url: string): Promise<Session> {
  const id = await initialize(server, profile);
  const args = { url };
  await tool(server, id, 'browser_navigate', args);
  const snapshot = await tool(server, id, 'browser_snapshot');
  const text = JSON.stringify(snapshot);
  expect(text).toContain('Release marker');
  const cdp = await cdpInfo(server, id);
  if (!cdp.discoveryUrl) throw new Error('Missing CDP discovery URL');
  const browser = await chromium.connectOverCDP(cdp.discoveryUrl);
  runtime.ownCleanup(() => browser.close());
  const session = await browser.newBrowserCDPSession();
  let pid: number;
  try {
    const result = await session.send('SystemInfo.getProcessInfo');
    const process = result.processInfo.find((entry) => entry.type === 'browser');
    if (!process) throw new Error('Missing owned browser PID');
    pid = process.id;
  } finally {
    await session.detach();
  }
  const pidText = await readFile(server.upstreamPidFile, 'utf8');
  const upstreamPid = Number(pidText);
  if (!Number.isSafeInteger(upstreamPid) || upstreamPid <= 0) throw new Error('Missing owned upstream PID');
  return { id, browser, pid, upstreamPid, cdp };
}
async function deleteSession(server: HttpServer, id: string): Promise<void> {
  const headers = { [MCP_SESSION_ID_HEADER]: id };
  const options = { method: 'DELETE', headers };
  const response = await fetch(server.url, options);
  await response.arrayBuffer();
  expect([200, 404]).toContain(response.status);
}
async function assertReleased(session: Session, profile: string): Promise<void> {
  const polling = { timeout: disposalTimeout };
  await expect.poll(() => processExists(session.pid), polling).toBe(false);
  await expect.poll(() => processExists(session.upstreamPid), polling).toBe(false);
  await expect.poll(() => portOpen(session.cdp.port), polling).toBe(false);
  await expect
    .poll(async () => {
      const entries = await readdir(profile);
      return entries.filter((entry) => entry.includes('cloakbrowser-mcp-profile.lock'));
    }, polling)
    .toEqual([]);
}
async function disposeSession(server: HttpServer, session: Session, profile: string): Promise<void> {
  const operation = (async () => {
    await deleteSession(server, session.id);
    await session.browser.close();
    await assertReleased(session, profile);
  })();
  await bounded(operation, 'HTTP/CDP/profile disposal exceeded 10 seconds');
}

async function stopUpstream(session: Session): Promise<void> {
  process.kill(session.upstreamPid, 'SIGTERM');
  const polling = { timeout: disposalTimeout };
  await expect.poll(() => processExists(session.upstreamPid), polling).toBe(false);
}
async function rotateBrowser(server: HttpServer, session: Session, url: string): Promise<void> {
  const raw = await session.browser.newBrowserCDPSession();
  const disconnected = new Promise<void>((resolve) => session.browser.once('disconnected', () => resolve()));
  void raw.send('Browser.close').catch(() => undefined);
  await bounded(disconnected, 'Raw browser close failed');
  const polling = { timeout: disposalTimeout };
  await expect.poll(() => processExists(session.pid), polling).toBe(false);
  await expect.poll(async () => (await cdpInfo(server, session.id)).state, polling).toBe('unavailable');
  const staleUrl = `${session.cdp.discoveryUrl}/json/version`;
  const stale = await fetch(staleUrl);
  await stale.arrayBuffer();
  expect(stale.status).toBe(404);
  const args = { url };
  await tool(server, session.id, 'browser_navigate', args);
  const replacement = await cdpInfo(server, session.id);
  expect(replacement.generation).toBeGreaterThan(session.cdp.generation);
  expect(replacement.discoveryUrl).not.toBe(session.cdp.discoveryUrl);
  const replacementUrl = replacement.discoveryUrl;
  if (!replacementUrl) throw new Error('Missing replacement URL');
  const browser = await chromium.connectOverCDP(replacementUrl);
  runtime.ownCleanup(() => browser.close());
  const rawReplacement = await browser.newBrowserCDPSession();
  try {
    const info = await rawReplacement.send('SystemInfo.getProcessInfo');
    const process = info.processInfo.find((entry) => entry.type === 'browser');
    if (!process) throw new Error('Missing replacement PID');
    session.pid = process.id;
  } finally {
    await rawReplacement.detach();
  }
  session.browser = browser;
  session.cdp = replacement;
}

describe('real Free browser repeated lifecycle', () => {
  const modes = ['successful shutdown', 'browser failure', 'upstream failure'] as const;
  it.for(modes)('releases HTTP/CDP/profile resources after five cycles of %s', async (mode, context) => {
    const server = await startServer(context);
    const fixture = await startNpmBrowserFixture();
    const profile = path.join(runtime.root, mode);
    try {
      for (let cycle = 0; cycle < cycles; cycle += 1) {
        const session = await startSession(server, profile, fixture.url);
        try {
          if (mode === 'browser failure') {
            await rotateBrowser(server, session, fixture.url);
          } else if (mode === 'upstream failure') {
            await stopUpstream(session);
          }
        } finally {
          const evidence = {
            cycle,
            mode,
            browserPid: session.pid,
            upstreamPid: session.upstreamPid,
            cdpPort: session.cdp.port,
            generation: session.cdp.generation,
          };
          const safe = diagnostics.sanitizeDiagnostic(evidence);
          await context.annotate(safe, 'cloak:process-diagnostics');
          await disposeSession(server, session, profile);
        }
      }
    } finally {
      try {
        await server.close();
      } finally {
        await fixture.close();
      }
    }
    const port = Number(server.url.port);
    const alive = await portOpen(port);
    expect(alive).toBe(false);
  });
  it('rolls back five partial profile setup failures and reacquires the same profile', async (context) => {
    const server = await startServer(context);
    const fixture = await startNpmBrowserFixture();
    const profile = path.join(runtime.root, 'partial-startup');
    const seed = path.join(profile, profileSeedFileName);
    const directories = { recursive: true };
    const removal = { recursive: true, force: true };
    try {
      for (let cycle = 0; cycle < cycles; cycle += 1) {
        await rm(seed, removal);
        await mkdir(seed, directories);
        const failed = initialize(server, profile);
        await expect(failed).rejects.toThrow(/persistent profile fingerprint seed|EISDIR/iu);
        const entries = await readdir(profile);
        const locks = entries.filter((entry) => entry.includes('cloakbrowser-mcp-profile.lock'));
        expect(locks).toEqual([]);
        const portBusy = await portOpen(server.cdpPort);
        expect(portBusy).toBe(false);
        await rm(seed, removal);
        const recovered = await startSession(server, profile, fixture.url);
        await disposeSession(server, recovered, profile);
      }
    } finally {
      try {
        await server.close();
      } finally {
        await fixture.close();
      }
    }
  });
});
