import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { request as createHttpsRequest } from 'node:https';
import type { Readable } from 'node:stream';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { type Browser, chromium, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type RawData, WebSocket } from 'ws';

import { LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { BRIDGE_INITIALIZE_META_KEY, JSON_RPC_VERSION, MCP_SESSION_ID_HEADER } from '@/protocol/constants.js';
import {
  cleanupDistributionE2e,
  type DistributionCommand,
  packAndInstallCurrentPackage,
} from '@tests/e2e/distributionHarness.js';
import { startTestTlsTerminator } from '@tests/helpers/tls-terminator.js';

type BrowserEngine = 'cloak' | 'playwright';
const nodeBrowserEngines = ['cloak', 'playwright'] as const satisfies readonly BrowserEngine[];

interface ReadyCdpInfo {
  activeConnections: number;
  discoveryUrl: string;
  enabled: true;
  generation: number;
  port: number;
  state: 'ready';
}

interface UnavailableCdpInfo {
  activeConnections: 0;
  discoveryUrl: null;
  enabled: true;
  generation: number;
  port: number;
  state: 'unavailable';
}

interface RunningHttpBridge {
  child: ChildProcessWithoutNullStreams;
  stderr: { text: string };
  stdout: { text: string };
  url: URL;
}

interface RawHttpSession {
  id: string;
  server: RunningHttpBridge;
}

interface RunningTlsBridge {
  cdp: ReadyCdpInfo;
  client: Client;
  stderr: { text: string };
}

interface RunningBridge {
  baselineBrowserPids: Set<number>;
  browser: Browser;
  browserProcess: { arguments: string[]; pid: number };
  client: Client;
  cdp: ReadyCdpInfo;
  stderr: { text: string };
}

let packagedCommand: DistributionCommand;

beforeAll(() => {
  packagedCommand = packAndInstallCurrentPackage();
});

afterAll(() => cleanupDistributionE2e());

it('redacts managed CDP capabilities from E2E diagnostics', () => {
  const capability = 'A'.repeat(43);
  const diagnostic = `connection failed for ws://127.0.0.1:9222/cdp/${capability}/devtools/browser/id`;
  const redacted = redactCdpCapabilities(diagnostic);

  expect(redacted.includes(capability)).toBe(false);
  expect(redacted).toContain('/cdp/<redacted>/devtools/browser/id');
});

it('declares the complete packaged Node browser-engine matrix', () => {
  expect(nodeBrowserEngines).toEqual(['cloak', 'playwright']);
});

it('matches the declared native architecture evidence', () => {
  const expected = process.env.CLOAKBROWSER_MCP_CDP_EXPECTED_ARCHITECTURE;
  if (expected === undefined) return;
  expect(readNativeArchitecture()).toBe(expected);
});

describe.each<BrowserEngine>(nodeBrowserEngines)('packaged Node managed CDP with %s', (engine) => {
  it('shares browser state across MCP and multiple CDP clients without global read blocking', async () => {
    const fixture = await startFixtureServer();
    let bridge: RunningBridge | undefined;
    let secondBrowser: Browser | undefined;

    try {
      bridge = await startPackagedBridge(engine);
      await expectToolSuccess(bridge.client, 'browser_navigate', { url: fixture.url });
      const page = await findPage(bridge.browser, fixture.url);
      await expect(page.title()).resolves.toBe('MCP to CDP');
      expect(
        bridge.browserProcess.arguments.some((argument) => argument.includes('--remote-debugging-pipe')),
      ).toBe(true);
      await expect(fetch(`${bridge.cdp.discoveryUrl}/json/version`)).resolves.toMatchObject({
        status: 200,
      });

      await expectToolSuccess(bridge.client, 'browser_evaluate', {
        function:
          "() => { localStorage.setItem('mcp-shared', 'visible-through-cdp'); document.body.dataset.owner = 'mcp'; }",
      });
      await expect(page.evaluate("localStorage.getItem('mcp-shared')")).resolves.toBe('visible-through-cdp');

      await page.evaluate(
        "localStorage.setItem('cdp-shared', 'visible-through-mcp'); document.body.dataset.controller = 'cdp'",
      );
      const evaluation = await callTool(bridge.client, 'browser_evaluate', {
        function:
          "() => ({ storage: localStorage.getItem('cdp-shared'), controller: document.body.dataset.controller })",
      });
      expect(JSON.stringify(evaluation.content)).toContain('visible-through-mcp');

      secondBrowser = await connectOverManagedCdp(bridge.cdp.discoveryUrl);
      const secondPage = await findPage(secondBrowser, fixture.url);
      await expect(secondPage.evaluate('document.body.dataset.owner')).resolves.toBe('mcp');

      const active = await readCdpInfo(bridge.client);
      expect(active.activeConnections).toBe(2);
      await Promise.all([
        callTool(bridge.client, 'browser_snapshot'),
        page.title(),
        secondPage.evaluate('document.body.dataset.controller'),
      ]);

      await secondBrowser.close();
      secondBrowser = undefined;
      await expectToolSuccess(bridge.client, 'browser_snapshot');
      const bridgeClient = bridge.client;
      await expect.poll(async () => (await readCdpInfo(bridgeClient)).activeConnections).toBe(1);
      const afterDisconnect = await readCdpInfo(bridge.client);
      expect(afterDisconnect.generation).toBe(bridge.cdp.generation);
      expect(afterDisconnect.state).toBe('ready');
    } finally {
      await secondBrowser?.close().catch(() => undefined);
      if (bridge !== undefined) await closePackagedBridge(bridge);
      await fixture.close();
    }
  });

  it('rotates generation after raw Browser.close while keeping the MCP session usable', async () => {
    const bridge = await startPackagedBridge(engine);

    try {
      const initialBrowserProcess = bridge.browserProcess;
      const cdpSession = await bridge.browser.newBrowserCDPSession();
      const disconnected = new Promise<void>((resolve) =>
        bridge.browser.once('disconnected', () => resolve()),
      );
      void cdpSession.send('Browser.close').catch(() => undefined);
      await withTimeout(disconnected, 10_000, `Raw Browser.close did not disconnect ${engine}`);
      await expect.poll(async () => (await readBridgeCdpInfo(bridge.client)).state).toBe('unavailable');
      await expect.poll(async () => await processExists(initialBrowserProcess.pid)).toBe(false);
      expect(
        (await findManagedBrowserProcesses()).filter(
          (processInfo) => !bridge.baselineBrowserPids.has(processInfo.pid),
        ),
      ).toHaveLength(0);

      const tabs = (await bridge.client.callTool({
        name: 'browser_tabs',
        arguments: { action: 'list' },
      })) as CallToolResult;
      expect(tabs.isError).not.toBe(true);

      const navigation = (await bridge.client.callTool({
        name: 'browser_navigate',
        arguments: { url: 'data:text/html,<title>replacement-ready</title>' },
      })) as CallToolResult;
      expect(navigation.isError).not.toBe(true);
      const replacement = await readCdpInfo(bridge.client);
      expect(replacement.generation).toBeGreaterThan(bridge.cdp.generation);
      expect(replacement.discoveryUrl === bridge.cdp.discoveryUrl).toBe(false);
      const replacementProcess = await findManagedBrowserProcess(
        new Set([...bridge.baselineBrowserPids, initialBrowserProcess.pid]),
      );
      expect(replacementProcess.pid).not.toBe(initialBrowserProcess.pid);

      const replacementBrowser = await connectOverManagedCdp(replacement.discoveryUrl);
      try {
        await expect(findPage(replacementBrowser, 'data:text/html')).resolves.toBeDefined();
      } finally {
        await replacementBrowser.close();
      }
    } finally {
      await closePackagedBridge(bridge);
    }
  });

  it('isolates two Streamable HTTP sessions with explicit CDP enablement', async () => {
    const fixture = await startFixtureServer();
    const range = await findFreePortRange(3);
    const server = await startPackagedHttpBridge(engine, false, range);
    const sessions: RawHttpSession[] = [];
    const browsers: Browser[] = [];

    try {
      const first = await initializeRawHttpSession(server, { cdpEnabled: true });
      const second = await initializeRawHttpSession(server, { cdpEnabled: true });
      const disabled = await initializeRawHttpSession(server, { cdpEnabled: false });
      sessions.push(first, second, disabled);

      const firstInfo = await readHttpCdpInfo(first);
      const secondInfo = await readHttpCdpInfo(second);
      expect(firstInfo.port).not.toBe(secondInfo.port);
      expect(firstInfo.discoveryUrl).not.toBe(secondInfo.discoveryUrl);
      expect(await readHttpCdpState(disabled)).toEqual({ enabled: false });

      await Promise.all([
        callHttpTool(first, 'browser_navigate', { url: `${fixture.url}?session=first` }),
        callHttpTool(second, 'browser_navigate', { url: `${fixture.url}?session=second` }),
      ]);

      const firstBrowser = await connectOverManagedCdp(firstInfo.discoveryUrl);
      const secondBrowser = await connectOverManagedCdp(secondInfo.discoveryUrl);
      browsers.push(firstBrowser, secondBrowser);
      const firstPage = await findPage(firstBrowser, fixture.url);
      const secondPage = await findPage(secondBrowser, fixture.url);

      await firstPage.evaluate("localStorage.setItem('session-owner', 'first')");
      await secondPage.evaluate("localStorage.setItem('session-owner', 'second')");
      await firstPage.context().addCookies([{ name: 'session-owner', value: 'first', url: fixture.url }]);
      await secondPage.context().addCookies([{ name: 'session-owner', value: 'second', url: fixture.url }]);

      await expect(firstPage.evaluate("localStorage.getItem('session-owner')")).resolves.toBe('first');
      await expect(secondPage.evaluate("localStorage.getItem('session-owner')")).resolves.toBe('second');
      await expect(firstPage.context().cookies(fixture.url)).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'session-owner', value: 'first' })]),
      );
      await expect(secondPage.context().cookies(fixture.url)).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ name: 'session-owner', value: 'second' })]),
      );

      const firstContext = firstBrowser.contexts()[0];
      const secondContext = secondBrowser.contexts()[0];
      if (firstContext === undefined || secondContext === undefined) {
        throw new Error('Expected default browser contexts for both HTTP sessions');
      }
      const secondTargetCount = secondContext.pages().length;
      const targetCreated = firstContext.waitForEvent('page');
      const newTarget = await firstContext.newPage();
      await expect(targetCreated).resolves.toBe(newTarget);
      await newTarget.goto(`${fixture.url}?target=first`);
      expect(secondContext.pages()).toHaveLength(secondTargetCount);
    } finally {
      await Promise.allSettled(browsers.map((browser) => browser.close()));
      await Promise.allSettled(sessions.map((session) => closeRawHttpSession(session)));
      await closePackagedHttpBridge(server);
      await fixture.close();
    }
  });

  it('honors the HTTP process default and an explicit disabled session', async () => {
    const range = await findFreePortRange(2);
    const server = await startPackagedHttpBridge(engine, true, range);
    const sessions: RawHttpSession[] = [];
    const browsers: Browser[] = [];

    try {
      const inherited = await initializeRawHttpSession(server);
      const disabled = await initializeRawHttpSession(server, { cdpEnabled: false });
      sessions.push(inherited, disabled);
      const inheritedInfo = await readHttpCdpInfo(inherited);
      expect(await readHttpCdpState(disabled)).toEqual({ enabled: false });
      browsers.push(await connectOverManagedCdp(inheritedInfo.discoveryUrl));
    } finally {
      await Promise.allSettled(browsers.map((browser) => browser.close()));
      await Promise.allSettled(sessions.map((session) => closeRawHttpSession(session)));
      await closePackagedHttpBridge(server);
    }
  });

  it('routes advertised HTTPS and WSS through an operator TLS terminator', async () => {
    const port = await findFreePort();
    const bridge = await startPackagedTlsBridge(engine, port);
    const terminator = await startTestTlsTerminator(port, { host: '127.0.0.2', port });
    let socket: WebSocket | undefined;

    try {
      const discovery = (await requestHttpsJson(new URL(`${bridge.cdp.discoveryUrl}/json/version`))) as {
        webSocketDebuggerUrl: string;
      };
      expect(discovery.webSocketDebuggerUrl).toMatch(
        new RegExp(`^wss://127\\.0\\.0\\.2:${String(port)}/cdp/`, 'u'),
      );
      socket = await openTlsWebSocket(discovery.webSocketDebuggerUrl);
      const version = await sendCdpCommand(socket, 'Browser.getVersion');
      expect(version).toMatchObject({ product: expect.any(String) });
      expect(terminator.port).toBe(bridge.cdp.port);
      expect(terminator.requests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            headers: expect.objectContaining({ host: `127.0.0.2:${String(port)}` }),
          }),
        ]),
      );
      expect(terminator.upgrades).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            headers: expect.objectContaining({ host: `127.0.0.2:${String(port)}` }),
          }),
        ]),
      );
    } finally {
      await closeWebSocket(socket);
      await terminator.close();
      await bridge.client.close().catch(() => undefined);
      expect(bridge.stderr.text).not.toMatch(/fatal:|Unhandled|Error:/iu);
    }
  });
});

async function startPackagedTlsBridge(engine: BrowserEngine, port: number): Promise<RunningTlsBridge> {
  const { PLAYWRIGHT_MCP_CLI_PATH: _fakeUpstream, ...baseEnv } = packagedCommand.env;
  const transport = new StdioClientTransport({
    command: packagedCommand.command,
    args: packagedCommand.args,
    env: {
      ...baseEnv,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: engine,
      PLAYWRIGHT_MCP_HEADLESS: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST: '127.0.0.2',
      CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME: 'https',
      CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: String(port),
    },
    stderr: 'pipe',
  });
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const client = new Client({ name: `managed-cdp-tls-${engine}-e2e`, version: '1.0.0' });
  try {
    await withTimeout(client.connect(transport), 75_000, `Packaged ${engine} TLS MCP timed out`);
    const cdp = await readCdpInfo(client);
    expect(cdp.discoveryUrl).toMatch(/^https:\/\/127\.0\.0\.2:/u);
    return { cdp, client, stderr };
  } catch (error) {
    await client.close().catch(() => undefined);
    throwManagedCdpStartupError(engine, stderr.text, error);
  }
}

async function requestHttpsJson(url: URL): Promise<unknown> {
  return await new Promise((resolve, reject) => {
    const request = createHttpsRequest(
      url,
      {
        headers: { Host: url.host, Origin: `${url.protocol}//${url.host}` },
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.once('error', reject);
        response.once('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error(`TLS discovery returned ${String(response.statusCode)}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });
      },
    );
    request.once('error', reject);
    request.end();
  });
}

async function openTlsWebSocket(url: string): Promise<WebSocket> {
  const parsed = new URL(url);
  const socket = new WebSocket(url, {
    headers: { Host: parsed.host, Origin: `https://${parsed.host}` },
    rejectUnauthorized: false,
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  return socket;
}

async function sendCdpCommand(socket: WebSocket, method: string): Promise<Record<string, unknown>> {
  const id = 1;
  const response = new Promise<Record<string, unknown>>((resolve, reject) => {
    const onMessage = (data: RawData): void => {
      const envelope = JSON.parse(Buffer.from(data as ArrayBuffer).toString('utf8')) as {
        error?: unknown;
        id?: number;
        result?: Record<string, unknown>;
      };
      if (envelope.id !== id) return;
      socket.off('message', onMessage);
      if (envelope.error !== undefined) reject(new Error(JSON.stringify(envelope.error)));
      else resolve(envelope.result ?? {});
    };
    socket.on('message', onMessage);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ id, method }));
  return await withTimeout(response, 10_000, `Timed out waiting for ${method}`);
}

async function closeWebSocket(socket: WebSocket | undefined): Promise<void> {
  if (socket === undefined || socket.readyState === WebSocket.CLOSED) return;
  const closed = new Promise<void>((resolve) => socket.once('close', () => resolve()));
  socket.close();
  await withTimeout(closed, 5_000, 'TLS WebSocket did not close');
}

async function startPackagedHttpBridge(
  engine: BrowserEngine,
  processEnabled: boolean,
  range: { end: number; start: number },
): Promise<RunningHttpBridge> {
  const { PLAYWRIGHT_MCP_CLI_PATH: _fakeUpstream, ...baseEnv } = packagedCommand.env;
  const child = spawn(
    packagedCommand.command,
    [
      ...(packagedCommand.args ?? []),
      '--transport',
      'streamable-http',
      '--http-host',
      '127.0.0.1',
      '--http-port',
      '0',
    ],
    {
      env: {
        ...baseEnv,
        PLAYWRIGHT_MCP_BROWSER_ENGINE: engine,
        PLAYWRIGHT_MCP_HEADLESS: 'true',
        CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: String(processEnabled),
        CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: `${String(range.start)}-${String(range.end)}`,
      },
    },
  );
  const stdout = collectChildStream(child.stdout);
  const stderr = collectChildStream(child.stderr);

  try {
    const line = await waitForChildLine(child, stderr, /streamable-http listening/u, 75_000);
    const match = /url=(?<url>\S+)$/u.exec(line);
    if (match?.groups?.url === undefined) throw new Error(`Could not parse HTTP URL from: ${line}`);
    return { child, stderr, stdout, url: new URL(match.groups.url) };
  } catch (error) {
    await terminateChild(child);
    throw new Error(
      `Packaged ${engine} HTTP startup failed: ${redactCdpCapabilities(stderr.text)}; reason: ${safeErrorMessage(error)}`,
      { cause: error },
    );
  }
}

async function closePackagedHttpBridge(server: RunningHttpBridge): Promise<void> {
  await terminateChild(server.child);
  expect(server.stderr.text).not.toMatch(/fatal:|Unhandled|Error:/iu);
  expect(server.stdout.text).toBe('');
}

async function initializeRawHttpSession(
  server: RunningHttpBridge,
  bridgeMeta?: Record<string, unknown>,
): Promise<RawHttpSession> {
  const response = await postJsonRpc(server.url, {
    jsonrpc: JSON_RPC_VERSION,
    id: randomUUID(),
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'managed-cdp-http-e2e', version: '1.0.0' },
      ...(bridgeMeta === undefined ? {} : { _meta: { [BRIDGE_INITIALIZE_META_KEY]: bridgeMeta } }),
    },
  });
  expect(response.status).toBe(200);
  await readJsonRpcResult(response);
  const id = response.headers.get(MCP_SESSION_ID_HEADER);
  if (id === null) throw new Error('HTTP initialize response did not include a session id');
  const initialized = await postJsonRpc(
    server.url,
    { jsonrpc: JSON_RPC_VERSION, method: 'notifications/initialized' },
    id,
  );
  expect(initialized.status).toBe(202);
  return { id, server };
}

async function closeRawHttpSession(session: RawHttpSession): Promise<void> {
  await fetch(session.server.url, {
    method: 'DELETE',
    headers: { [MCP_SESSION_ID_HEADER]: session.id },
  });
}

async function callHttpTool(
  session: RawHttpSession,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<CallToolResult> {
  const response = await postJsonRpc(
    session.server.url,
    {
      jsonrpc: JSON_RPC_VERSION,
      id: randomUUID(),
      method: 'tools/call',
      params: { name, arguments: arguments_ },
    },
    session.id,
  );
  expect(response.status).toBe(200);
  const result = (await readJsonRpcResult(response)) as CallToolResult;
  if (result.isError === true) throw new Error(JSON.stringify(result.content));
  return result;
}

async function readHttpCdpState(
  session: RawHttpSession,
): Promise<{ enabled: false } | ReadyCdpInfo | UnavailableCdpInfo> {
  const result = await callHttpTool(session, LOCAL_TOOL_BRIDGE_INFO);
  const cdp = result.structuredContent?.cdp as
    { enabled: false } | ReadyCdpInfo | UnavailableCdpInfo | undefined;
  if (cdp === undefined) throw new Error('HTTP bridge info omitted managed CDP state');
  return cdp;
}

async function readHttpCdpInfo(session: RawHttpSession): Promise<ReadyCdpInfo> {
  const cdp = await readHttpCdpState(session);
  if (cdp.enabled !== true || cdp.state !== 'ready') {
    throw new Error(`Managed HTTP CDP is not ready: ${JSON.stringify(cdp)}`);
  }
  return cdp;
}

async function postJsonRpc(url: URL, body: unknown, sessionId?: string): Promise<Response> {
  return await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(sessionId === undefined ? {} : { [MCP_SESSION_ID_HEADER]: sessionId }),
    },
    body: JSON.stringify(body),
  });
}

async function readJsonRpcResult(response: Response): Promise<unknown> {
  const text = await response.text();
  const serialized = response.headers.get('content-type')?.includes('text/event-stream')
    ? text
        .split(/\r?\n/u)
        .find((line) => line.startsWith('data: '))
        ?.slice('data: '.length)
    : text;
  if (serialized === undefined || serialized.length === 0) {
    throw new Error(`Expected JSON-RPC response body, got: ${text}`);
  }
  const envelope = JSON.parse(serialized) as { error?: unknown; result?: unknown };
  if (envelope.error !== undefined) throw new Error(JSON.stringify(envelope.error));
  return envelope.result;
}

function collectChildStream(stream: Readable): { text: string } {
  const collected = { text: '' };
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string) => {
    collected.text += chunk;
  });
  return collected;
}

async function waitForChildLine(
  child: ChildProcessWithoutNullStreams,
  stream: { text: string },
  pattern: RegExp,
  timeoutMs: number,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const line = stream.text.split(/\r?\n/u).find((candidate) => pattern.test(candidate));
    if (line !== undefined) return line;
    if (child.exitCode !== null) throw new Error(`HTTP bridge exited with ${String(child.exitCode)}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out waiting for child output matching ${String(pattern)}`);
}

async function terminateChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.kill('SIGTERM');
  await withTimeout(exited, 10_000, 'Packaged HTTP bridge did not exit after SIGTERM');
}

async function findManagedBrowserProcess(
  excludedPids: ReadonlySet<number> = new Set(),
): Promise<{ arguments: string[]; pid: number }> {
  let processInfo: { arguments: string[]; pid: number } | undefined;
  await expect
    .poll(async () => {
      const candidates = await findManagedBrowserProcesses();
      processInfo = candidates.filter((candidate) => !excludedPids.has(candidate.pid)).at(-1);
      return processInfo;
    })
    .toBeDefined();
  if (processInfo === undefined) throw new Error('Managed browser process was not observed');
  return processInfo;
}

async function findManagedBrowserProcesses(): Promise<Array<{ arguments: string[]; pid: number }>> {
  if (process.platform !== 'linux') {
    throw new Error('Managed browser process launch evidence requires Linux /proc');
  }
  const entries = await readdir('/proc', { withFileTypes: true });
  const processes = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name))
      .map(async (entry) => {
        const pid = Number(entry.name);
        try {
          const commandLine = await readFile(`/proc/${entry.name}/cmdline`);
          const arguments_ = commandLine
            .toString('utf8')
            .split('\0')
            .filter((argument) => argument.length > 0);
          const flattened = arguments_.join(' ');
          return flattened.includes('--remote-debugging-pipe') && !flattened.includes(' --type=')
            ? { arguments: arguments_, pid }
            : undefined;
        } catch {
          return undefined;
        }
      }),
  );
  return processes
    .filter((processInfo): processInfo is { arguments: string[]; pid: number } => Boolean(processInfo))
    .sort((left, right) => left.pid - right.pid);
}

async function processExists(pid: number): Promise<boolean> {
  try {
    await readFile(`/proc/${String(pid)}/stat`);
    return true;
  } catch {
    return false;
  }
}

async function startPackagedBridge(engine: BrowserEngine): Promise<RunningBridge> {
  const port = await findFreePort();
  const baselineBrowserPids = new Set(
    (await findManagedBrowserProcesses()).map((processInfo) => processInfo.pid),
  );
  const { PLAYWRIGHT_MCP_CLI_PATH: _fakeUpstream, ...baseEnv } = packagedCommand.env;
  const transport = new StdioClientTransport({
    command: packagedCommand.command,
    args: packagedCommand.args,
    env: {
      ...baseEnv,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: engine,
      PLAYWRIGHT_MCP_HEADLESS: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED: 'true',
      CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE: String(port),
    },
    stderr: 'pipe',
  });
  const stderr = { text: '' };
  transport.stderr?.on('data', (chunk: Buffer | string) => {
    stderr.text += chunk.toString();
  });
  const client = new Client({ name: `managed-cdp-${engine}-e2e`, version: '1.0.0' });

  try {
    await withTimeout(client.connect(transport), 75_000, `Packaged ${engine} MCP initialize timed out`);
    const cdp = await readCdpInfo(client);
    const browser = await connectOverManagedCdp(cdp.discoveryUrl);
    const browserProcess = await findManagedBrowserProcess(baselineBrowserPids);
    expect(stderr.text.includes(new URL(cdp.discoveryUrl).pathname)).toBe(false);
    return { baselineBrowserPids, browser, browserProcess, cdp, client, stderr };
  } catch (error) {
    await client.close().catch(() => undefined);
    throwManagedCdpStartupError(engine, stderr.text, error);
  }
}

async function closePackagedBridge(bridge: RunningBridge): Promise<void> {
  await bridge.browser.close().catch(() => undefined);
  await bridge.client.callTool({ name: 'browser_close', arguments: {} }).catch(() => undefined);
  await bridge.client.close().catch(() => undefined);
}

async function readCdpInfo(client: Client): Promise<ReadyCdpInfo> {
  const cdp = await readBridgeCdpInfo(client);
  if (cdp?.enabled !== true || cdp.state !== 'ready') {
    throw new Error(`Managed CDP is not ready: ${describeCdpInfo(cdp)}`);
  }
  return cdp;
}

async function readBridgeCdpInfo(client: Client): Promise<ReadyCdpInfo | UnavailableCdpInfo> {
  const result = await callTool(client, LOCAL_TOOL_BRIDGE_INFO);
  const cdp = result.structuredContent?.cdp as ReadyCdpInfo | UnavailableCdpInfo | undefined;
  if (cdp?.enabled !== true) throw new Error(`Managed CDP is disabled: ${describeCdpInfo(cdp)}`);
  return cdp;
}

async function connectOverManagedCdp(discoveryUrl: string): Promise<Browser> {
  try {
    return await chromium.connectOverCDP(discoveryUrl);
  } catch (error) {
    throwManagedCdpConnectionError(error);
  }
}

function throwManagedCdpStartupError(engine: BrowserEngine, stderr: string, error: unknown): never {
  const safeMessage = safeErrorMessage(error);
  throw new Error(
    `Packaged ${engine} managed CDP startup failed: ${redactCdpCapabilities(stderr)}; reason: ${safeMessage}`,
    { cause: new Error(safeMessage) },
  );
}

function throwManagedCdpConnectionError(error: unknown): never {
  const safeMessage = safeErrorMessage(error);
  throw new Error(`Managed CDP connection failed: ${safeMessage}`, {
    cause: new Error(safeMessage),
  });
}

function describeCdpInfo(cdp: ReadyCdpInfo | UnavailableCdpInfo | undefined): string {
  if (cdp === undefined) return 'missing';
  return [
    `state=${cdp.state}`,
    `generation=${String(cdp.generation)}`,
    `port=${String(cdp.port)}`,
    `activeConnections=${String(cdp.activeConnections)}`,
  ].join(', ');
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return redactCdpCapabilities(error.message);
  if (typeof error === 'string') return redactCdpCapabilities(error);
  return 'unknown error';
}

function redactCdpCapabilities(value: string): string {
  return value.replace(/\/cdp\/[A-Za-z0-9_-]{43}(?=[/?#]|$)/gu, '/cdp/<redacted>');
}

function readNativeArchitecture(): 'linux/amd64' | 'linux/arm64' {
  if (process.platform !== 'linux') throw new Error('Managed CDP runtime evidence requires Linux');
  if (process.arch === 'x64') return 'linux/amd64';
  if (process.arch === 'arm64') return 'linux/arm64';
  throw new Error(`Unsupported managed CDP runtime architecture: ${process.arch}`);
}

async function callTool(
  client: Client,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<CallToolResult> {
  const result = (await client.callTool({ name, arguments: arguments_ })) as CallToolResult;
  if (result.isError === true) throw new Error(JSON.stringify(result.content));
  return result;
}

async function expectToolSuccess(
  client: Client,
  name: string,
  arguments_: Record<string, unknown> = {},
): Promise<void> {
  await callTool(client, name, arguments_);
}

async function findPage(browser: Browser, urlPrefix: string): Promise<Page> {
  await expect
    .poll(() =>
      browser
        .contexts()
        .flatMap((context) => context.pages())
        .find((page) => page.url().startsWith(urlPrefix)),
    )
    .toBeDefined();
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((item) => item.url().startsWith(urlPrefix));
  if (page === undefined) throw new Error(`Expected page with URL prefix ${urlPrefix}`);
  return page;
}

async function findFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('Expected TCP address');
  await closeServer(server);
  return address.port;
}

async function findFreePortRange(size: number): Promise<{ end: number; start: number }> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const start = await findFreePort();
    if (start + size - 1 > 65_535) continue;
    const reservations: Server[] = [];
    try {
      for (let offset = 0; offset < size; offset += 1) {
        const server = createServer();
        await new Promise<void>((resolve, reject) => {
          server.once('error', reject);
          server.listen(start + offset, '127.0.0.1', resolve);
        });
        reservations.push(server);
      }
      await Promise.all(reservations.map(async (server) => await closeServer(server)));
      return { end: start + size - 1, start };
    } catch {
      await Promise.allSettled(reservations.map(async (server) => await closeServer(server)));
    }
  }
  throw new Error(`Unable to reserve a contiguous ${String(size)}-port range`);
}

async function startFixtureServer(): Promise<{ close(): Promise<void>; url: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>MCP to CDP</title><main>shared state</main>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('Expected fixture address');
  return {
    close: async () => await closeServer(server),
    url: `http://127.0.0.1:${String(address.port)}/`,
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
        timer.unref();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
