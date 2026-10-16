import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { type Browser, chromium } from 'playwright';
import { afterAll, afterEach, beforeAll, describe, expect, it, type TestContext } from 'vitest';
import {
  cleanupDistributionE2e,
  createTempRoot,
  expectDistributionStdioBridge,
  packAndInstallCurrentPackage,
} from './distributionHarness.js';
import { startNpmBrowserFixture } from '@tests/e2e/npm-browser-fixture.js';
import {
  createFreeBrowserRuntime,
  type FreeBrowserRuntime,
  killOwnedProcess,
  resolveFreeBrowserExecutable,
  withCleanupDeadline,
} from '@tests/helpers/browser-test-runtime.js';
import { LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO } from '@/bridge/tools.js';
import { profileSeedFileName } from '@/bridge/profile-seed.js';
import { expectedDependencyVersions } from '@tests/helpers/dependency-versions.js';
import { verifyHumanizedReads, verifyHumanizedSelections } from '@tests/e2e/humanize-release-scenarios.js';
import { comparePersistentLifecycle } from '@tests/e2e/persistent-lifecycle-comparison.js';
const runtimes: FreeBrowserRuntime[] = [];
const linuxPersistentComparison = process.platform === 'linux';
const diagnosticsUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
const diagnostics = (await import(diagnosticsUrl.href)) as {
  TEXT_LIMIT: number;
  registerControlledScreenshot: (bytes: Buffer, url: string) => unknown;
  sanitizeDiagnostic: (input: unknown) => string | Buffer;
};
afterEach(async () => {
  const disposals = runtimes.splice(0).map((runtime) => runtime.dispose());
  try {
    await Promise.all(disposals);
  } finally {
    cleanupDistributionE2e();
  }
});

let freeBinary: ReturnType<typeof resolveFreeBrowserExecutable> | undefined;
let downloadRoot: string;
beforeAll(async () => {
  const directory = tmpdir();
  const prefix = path.join(directory, 'cloak-npm-download-');
  downloadRoot = await mkdtemp(prefix);
});
afterAll(async () => {
  const options = { recursive: true, force: true };
  if (downloadRoot) await rm(downloadRoot, options);
});
async function packFreePackage() {
  freeBinary ??= resolveFreeBrowserExecutable(downloadRoot);
  const { executable } = await freeBinary;
  const command = packAndInstallCurrentPackage();
  const root = createTempRoot('cloak-npm-runtime-');
  const parentEnv = { ...command.env };
  for (const key of Object.keys(parentEnv)) {
    if (key.startsWith('PLAYWRIGHT_MCP_') || key.startsWith('CLOAK_PLAYWRIGHT_MCP_')) delete parentEnv[key];
  }
  parentEnv.PLAYWRIGHT_MCP_OUTPUT_DIR = command.env.PLAYWRIGHT_MCP_OUTPUT_DIR ?? '';
  const options = { root, freeExecutable: executable, parentEnv };
  const runtime = await createFreeBrowserRuntime(options);
  runtimes.push(runtime);
  command.env = runtime.env;
  return command;
}

function toolText(serialized: string): string {
  const result = JSON.parse(serialized) as { content: { type: string; text?: string }[] };
  const parts = result.content.filter((item) => item.type === 'text').map((item) => item.text ?? '');
  return parts.join('\n');
}

function evaluationValue(serialized: string): unknown {
  const text = toolText(serialized);
  const pattern = /### Result\n([\s\S]*?)(?:\n###|$)/u;
  const match = pattern.exec(text);
  const value = match?.[1]?.trim();
  if (!value) throw new Error('Missing browser evaluation result');
  return JSON.parse(value) as unknown;
}

async function assertToolErrors(
  client: Client,
  tools: Awaited<ReturnType<Client['listTools']>>['tools'],
  url: string,
): Promise<void> {
  for (const tool of tools) {
    const properties = tool.inputSchema.properties ?? {};
    const property = Object.entries(properties)[0];
    if (!property) continue;
    const [field, schema] = property;
    const propertySchema = schema as { type?: string };
    const invalid = propertySchema.type === 'object' ? 'invalid-object' : { invalid: true };
    const request = { name: tool.name, arguments: { [field]: invalid } };
    const result = await client.callTool(request);
    expect(result.isError, `${tool.name} accepted an invalid field type`).toBe(true);
    const message = JSON.stringify(result);
    expect(message).toMatch(/invalid|required|expected|must/iu);
  }
  const negativeCases: Array<[string, Record<string, unknown>, RegExp]> = [
    ['browser_click', { target: '#missing' }, /does not match any elements/iu],
    [
      'browser_click',
      { target: '.duplicate' },
      /strict mode violation|matches.*(?:multiple|more than one)/iu,
    ],
    ['browser_tabs', { action: 'select', index: 999 }, /tab|index/iu],
    ['browser_network_request', { index: 999 }, /not found|request|index/iu],
    ['browser_file_upload', { paths: [] }, /file chooser|modal|upload/iu],
    ['browser_handle_dialog', { accept: true }, /dialog|modal/iu],
    ['browser_wait_for', { text: 'Controlled absent marker' }, /Timeout|timed out/iu],
    [
      'browser_run_code_unsafe',
      { code: 'async (page) => page.locator("#date").fill("invalid-date")' },
      /malformed|date/iu,
    ],
    ['browser_navigate', { url: 'invalid://controlled-navigation' }, /ERR_ABORTED|invalid|protocol/iu],
    [
      'browser_run_code_unsafe',
      { code: 'async (page) => { await page.close(); return page.title(); }' },
      /page.*closed|Target closed/iu,
    ],
  ];
  for (const [name, args, expected] of negativeCases) {
    const request = { name, arguments: args };
    const result = await client.callTool(request);
    expect(result.isError, `${name} accepted a controlled invalid operation`).toBe(true);
    const message = JSON.stringify(result);
    expect(message).toMatch(expected);
    const navigation = { name: 'browser_navigate', arguments: { url } };
    const restored = await client.callTool(navigation);
    expect(restored.isError).not.toBe(true);
    const snapshotRequest = { name: 'browser_snapshot', arguments: {} };
    const snapshot = await client.callTool(snapshotRequest);
    expect(snapshot.isError).not.toBe(true);
    const page = JSON.stringify(snapshot);
    expect(page).toContain('Release marker');
    expect(page).toContain(url);
  }
}

async function attachLocalScreenshot(context: TestContext, bytes: Buffer, fixtureUrl: string): Promise<void> {
  const receipt = diagnostics.registerControlledScreenshot(bytes, fixtureUrl);
  const safe = diagnostics.sanitizeDiagnostic(receipt);
  if (!Buffer.isBuffer(safe)) throw new Error('Missing controlled screenshot bytes');
  expect(safe.length).toBeGreaterThan(100);
  const width = safe.readUInt32BE(16);
  const height = safe.readUInt32BE(20);
  expect(width).toBe(1200);
  expect(height).toBe(900);
  const png = safe.toString('base64');
  const evidence = { fixtureUrl, png };
  const message = JSON.stringify(evidence);
  context.task.meta.cloakScreenshot = message;
}

async function attachFailureScreenshot(
  context: TestContext,
  client: Client,
  outputDir: string,
  fixtureUrl: string,
): Promise<void> {
  if (context.task.meta.cloakScreenshot) return;
  try {
    const observation = {
      name: 'browser_evaluate',
      arguments: {
        function: '() => ({ url: location.href, marker: document.querySelector("h1")?.textContent })',
      },
    };
    const result = await client.callTool(observation);
    if (result.isError) return;
    const serialized = JSON.stringify(result);
    const value = evaluationValue(serialized) as { url?: string; marker?: string };
    const controlledPages = [
      `${fixtureUrl}/`,
      `${fixtureUrl}/new`,
      `${fixtureUrl}/second`,
      `${fixtureUrl}/humanize`,
    ];
    if (!value.url || !controlledPages.includes(value.url) || value.marker !== 'Release marker') return;
    const resize = { name: 'browser_resize', arguments: { width: 1200, height: 900 } };
    await client.callTool(resize);
    const filename = path.join(outputDir, 'failure.png');
    const capture = { name: 'browser_take_screenshot', arguments: { filename, scale: 'css' } };
    const screenshot = await client.callTool(capture);
    if (screenshot.isError) return;
    const bytes = readFileSync(filename);
    await attachLocalScreenshot(context, bytes, fixtureUrl);
  } catch {
    // A lost page may not provide a screenshot; preserve the original failure.
  }
}

async function assertHumanizeReleaseScenarios(
  client: Client,
  call: (name: string, args: Record<string, unknown>) => Promise<string>,
  fixtureUrl: string,
): Promise<void> {
  const navigation = { url: `${fixtureUrl}/humanize` };
  await call('browser_navigate', navigation);
  const reads = { code: verifyHumanizedReads.toString() };
  const readResult = await call('browser_run_code_unsafe', reads);
  const readValue = evaluationValue(readResult);
  const commonReads = {
    value: 'Reader value',
    text: 'Nested marker',
    innerText: 'Nested marker',
    html: '<strong>Nested marker</strong>',
    attribute: 'Visible note',
  };
  const expectedReads = {
    pageReads: commonReads,
    locatorReads: { ...commonReads, missingAttribute: null },
    frameReads: {
      value: 'Frame value',
      text: 'Frame action',
      innerText: 'Frame action',
      html: 'Frame action',
      missingAttribute: null,
    },
    handleReads: commonReads,
    fallbackReads: {
      text: 'Hidden marker',
      html: '<strong>Hidden marker</strong>',
      attribute: 'Hidden note',
      overlappingText: 'Exact marker',
      overlappingAttribute: 'Exact note',
    },
    dispatched: {
      clicks: '2',
      visibleHandle: '1',
      frame: 'Frame clicked',
      hidden: '1',
      overlapping: '1',
      payload: 'Handle payload',
    },
    lateRead: 'Late marker',
  };
  expect(readValue).toEqual(expectedReads);
  const selections = { code: verifyHumanizedSelections.toString() };
  const selectionResult = await call('browser_run_code_unsafe', selections);
  const selectionValue = evaluationValue(selectionResult);
  const expectedSelections = {
    last: ['199'],
    lastValue: '199',
    repeated: ['75'],
    repeatedValue: '75',
    accented: ['accented'],
    duplicate: ['duplicate-first'],
    edgeValue: 'duplicate-first',
  };
  expect(selectionValue).toEqual(expectedSelections);
  const negativeCases: Array<[string, RegExp]> = [
    [
      "async (page) => { const options = { timeout: 200 }; return page.locator('#missing-read').textContent(options); }",
      /Timeout|timed out/u,
    ],
    [
      "async (page) => page.locator('#overlapping-container > div').getAttribute('data-note')",
      /strict mode violation/u,
    ],
    ["async (page) => page.locator('#rich').inputValue()", /input|textarea|select/iu],
    [
      "async (page) => { const options = { timeout: 200 }; return page.locator('#edge-choice').selectOption('disabled', options); }",
      /Timeout|timed out/u,
    ],
    [
      "async (page) => { const options = { timeout: 2000 }; return page.locator('#timeout-choice').selectOption('target', options); }",
      /choosing an option/u,
    ],
  ];
  for (const [code, expected] of negativeCases) {
    const request = { name: 'browser_run_code_unsafe', arguments: { code } };
    const failure = await client.callTool(request);
    expect(failure.isError).toBe(true);
    const serialized = JSON.stringify(failure);
    expect(serialized).toMatch(expected);
  }
  const recovery = {
    code: "async (page) => { const options = { timeout: 5000 }; await page.locator('#dispatch').click(options); return page.locator('#result').textContent(); }",
  };
  const recovered = await call('browser_run_code_unsafe', recovery);
  const recoveredValue = evaluationValue(recovered);
  expect(recoveredValue).toBe('Clicked');
  const emoji = {
    name: 'browser_run_code_unsafe',
    arguments: {
      code: "async (page) => { const options = { timeout: 15000 }; return page.locator('#edge-choice').selectOption('emoji', options); }",
    },
  };
  const emojiResult = await client.callTool(emoji);
  const serializedEmoji = JSON.stringify(emojiResult);
  if (process.platform === 'darwin') {
    expect(emojiResult.isError).toBe(true);
    expect(serializedEmoji).toContain('macOS dropdown ignores arrow keys');
    const raw = { code: "async (page) => page._original.selectOption('#edge-choice', 'emoji')" };
    const rawResult = await call('browser_run_code_unsafe', raw);
    const rawValue = evaluationValue(rawResult);
    const expected = ['emoji'];
    expect(rawValue).toEqual(expected);
  } else {
    expect(emojiResult.isError).not.toBe(true);
    const value = evaluationValue(serializedEmoji);
    const expected = ['emoji'];
    expect(value).toEqual(expected);
  }
  const restore = { url: fixtureUrl };
  await call('browser_navigate', restore);
}

interface ProfileSession {
  readState: () => Promise<unknown>;
  writeState: (value: string) => Promise<void>;
  close: () => Promise<void>;
}

function createProfileSessions(
  command: Awaited<ReturnType<typeof packFreePackage>>,
  fixtureUrl: string,
  context: TestContext,
) {
  const sessions: ProfileSession[] = [];
  const start = async (profile?: string, overrides: Record<string, string> = {}): Promise<ProfileSession> => {
    const env: Record<string, string> = {
      ...command.env,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: 'cloak',
      PLAYWRIGHT_MCP_ISOLATED: 'true',
      DEBUG: 'pw:browser',
      ...overrides,
    };
    delete env.PLAYWRIGHT_MCP_CLI_PATH;
    delete env.PLAYWRIGHT_MCP_USER_DATA_DIR;
    delete env.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
    if (profile) env.PLAYWRIGHT_MCP_USER_DATA_DIR = profile;
    const transportOptions = { command: command.command, args: command.args, env, stderr: 'pipe' } as const;
    const transport = new StdioClientTransport(transportOptions);
    const clientOptions = { name: 'profile state npm e2e', version: '1' } as const;
    const client = new Client(clientOptions);
    let stderr = '';
    transport.stderr?.on('data', (chunk: Buffer | string) => {
      const text = stderr + chunk.toString();
      stderr = text.slice(-diagnostics.TEXT_LIMIT / 2);
    });
    const browserPids = new Set<number>();
    let disposal: Promise<void> | undefined;
    let connected = false;
    let bridgePid: number | null = null;
    const close = (): Promise<void> => {
      disposal ??= withCleanupDeadline(
        async () => {
          try {
            if (connected) {
              const request = { name: 'browser_close', arguments: {} };
              const result = await client.callTool(request);
              expect(result.isError).not.toBe(true);
            }
          } finally {
            await client.close();
          }
          const pids = bridgePid === null ? [...browserPids] : [bridgePid, ...browserPids];
          for (const pid of pids) {
            await expect
              .poll(() => {
                try {
                  process.kill(pid, 0);
                  return true;
                } catch (error) {
                  if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
                  throw error;
                }
              })
              .toBe(false);
          }
        },
        'Profile session cleanup',
        () => {
          killOwnedProcess(bridgePid);
          for (const pid of browserPids) killOwnedProcess(pid);
        },
      );
      return disposal;
    };
    const call = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      const request = { name, arguments: args };
      const result = await client.callTool(request);
      const serialized = JSON.stringify(result);
      if (result.isError) throw new Error(serialized);
      return evaluationValue(serialized);
    };
    const readState = async (): Promise<unknown> => {
      const args = {
        code: `async (page) => {
          const cookies = await page.context().cookies();
          const cookie = cookies.find((item) => item.name === 'fixture-state');
          const storage = await page.evaluate(() => localStorage.getItem('fixture-state'));
          return { cookie: cookie?.value ?? null, storage };
        }`,
      };
      return call('browser_run_code_unsafe', args);
    };
    const writeState = async (value: string): Promise<void> => {
      const now = Date.now();
      const seconds = now / 1000;
      const expires = Math.floor(seconds) + 3600;
      const cookie = {
        name: 'fixture-state',
        value,
        url: fixtureUrl,
        expires,
      };
      const encodedCookie = JSON.stringify(cookie);
      const encodedValue = JSON.stringify(value);
      const args = {
        code: `async (page) => {
          await page.context().addCookies([${encodedCookie}]);
          await page.evaluate((value) => localStorage.setItem('fixture-state', value), ${encodedValue});
          return true;
        }`,
      };
      await call('browser_run_code_unsafe', args);
    };
    const session = { readState, writeState, close };
    sessions.push(session);
    try {
      const connection = client.connect(transport);
      bridgePid = transport.pid;
      await connection;
      connected = true;
      const request = { name: 'browser_navigate', arguments: { url: fixtureUrl } };
      const result = await client.callTool(request);
      const serialized = JSON.stringify(result);
      if (result.isError) throw new Error(serialized);
      const args = {
        code: `async (page) => {
          const browser = page.context().browser();
          if (!browser) throw new Error('Missing owned browser');
          const session = await browser.newBrowserCDPSession();
          try {
            const result = await session.send('SystemInfo.getProcessInfo');
            return { pid: result.processInfo.find((info) => info.type === 'browser').id,
              url: page.url(), marker: await page.locator('h1').textContent() };
          } finally { await session.detach(); }
        }`,
      };
      const observation = (await call('browser_run_code_unsafe', args)) as {
        pid: number;
        url: string;
        marker: string;
      };
      if (typeof observation.pid !== 'number') throw new Error('Missing owned Chromium PID');
      browserPids.add(observation.pid);
      const expectedUrl = `${fixtureUrl}/`;
      expect(observation.url).toBe(expectedUrl);
      expect(observation.marker).toBe('Release marker');
      return session;
    } catch (cause) {
      const failure = cause instanceof Error ? cause.message : String(cause);
      const diagnostic = { failure, bridgePid, browserPids: [...browserPids], stderr };
      const safe = diagnostics.sanitizeDiagnostic(diagnostic);
      if (typeof safe !== 'string') {
        const options = { cause };
        throw new Error('Invalid profile diagnostics', options);
      }
      await context.annotate(safe, 'cloak:process-diagnostics');
      await close();
      const options = { cause };
      throw new Error(safe, options);
    }
  };
  const close = async (): Promise<void> => {
    const disposals = sessions.splice(0).map((session) => session.close());
    const results = await Promise.allSettled(disposals);
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures, 'Profile session cleanup failed');
  };
  return { start, close };
}

describe('npm package distribution E2E', () => {
  it('runs the installed package as a stdio MCP bridge and forwards every fake upstream tool', async () => {
    const packAndInstallCurrentPackageResult = packAndInstallCurrentPackage();
    await expectDistributionStdioBridge(packAndInstallCurrentPackageResult);
  });
  it.runIf(linuxPersistentComparison)(
    'compares persistent cold launch and reopen through direct Playwright, upstream MCP, and the installed bridge',
    async (context) => {
      const command = await packFreePackage();
      const fixture = await startNpmBrowserFixture();
      const verifiedFree = await freeBinary;
      if (!verifiedFree) throw new Error('Missing verified Free browser control');
      const annotate = async (evidence: unknown) => {
        const safe = diagnostics.sanitizeDiagnostic(evidence);
        if (typeof safe !== 'string') throw new Error('Invalid lifecycle comparison diagnostics');
        await context.annotate(safe, 'cloak:process-diagnostics');
      };
      try {
        await comparePersistentLifecycle(command, fixture.url, context, annotate, verifiedFree);
      } finally {
        await fixture.close();
      }
    },
  );
  it('keeps navigation alive and exercises every tool through the installed package', async (context) => {
    const command = await packFreePackage();
    const outputDir = command.env.PLAYWRIGHT_MCP_OUTPUT_DIR;
    if (!outputDir) throw new Error('Missing temporary Playwright MCP output directory');
    const filename = path.join(outputDir, 'find-results.md');
    const dirnameResult = path.dirname(outputDir);
    const upstreamCli = path.join(dirnameResult, 'node_modules', '@playwright', 'mcp', 'cli.js');
    const profile = path.join(dirnameResult, 'browser-profile');
    const env: Record<string, string> = {
      ...command.env,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: 'cloak',
      PLAYWRIGHT_MCP_USER_DATA_DIR: profile,
      CLOAKBROWSER_AUTO_UPDATE: 'false',
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'true',
      DEBUG: 'pw:browser',
      PLAYWRIGHT_MCP_TIMEOUT_ACTION: '1000',
    };
    delete env.PLAYWRIGHT_MCP_CLI_PATH;
    const stdioClientTransportOptions = {
      command: command.command,
      args: command.args,
      env,
      stderr: 'pipe',
    } as const;
    const transport = new StdioClientTransport(stdioClientTransportOptions);
    let stderr = '';
    transport.stderr?.on('data', (chunk: Buffer | string) => {
      const text = stderr + chunk.toString();
      stderr = text.slice(-diagnostics.TEXT_LIMIT / 2);
    });
    const clientOptions = { name: 'npm package real upstream e2e client', version: '1.0.0' } as const;
    const client = new Client(clientOptions);
    const stdioClientTransportOptions2: import('@modelcontextprotocol/sdk/client/stdio.js').StdioServerParameters =
      {
        command: process.execPath,
        args: [upstreamCli],
        env,
        stderr: 'pipe',
      };
    const upstreamTransport = new StdioClientTransport(stdioClientTransportOptions2);
    const clientOptions2 = { name: 'official Playwright MCP e2e client', version: '1.0.0' } as const;
    const upstreamClient = new Client(clientOptions2);
    const fixture = await startNpmBrowserFixture();
    const visited = new Set<string>();
    let bridgePid: number | null = null;
    const browserPids: number[] = [];
    let callNumber = 0;
    const call = async (name: string, args: Record<string, unknown> = {}, phase = 'tool-scenario') => {
      callNumber += 1;
      visited.add(name);
      const callToolOptions = { name, arguments: args } as const;
      const result = await client.callTool(callToolOptions);
      if (result.isError) {
        const serialized = JSON.stringify(result);
        const exits = serialized.match(/exitCode=\d+/gu) ?? [];
        const message = `${name} (call ${callNumber}, phase ${phase}): ${exits.join(', ')}\n${serialized.replaceAll('\\n', '\n')}\n${stderr}`;
        throw new Error(message);
      }
      return JSON.stringify(result);
    };
    try {
      const values2: [Promise<void>, Promise<void>] = [
        client.connect(transport),
        upstreamClient.connect(upstreamTransport),
      ];
      await Promise.all(values2);
      bridgePid = transport.pid;
      const tools = await client.listTools();
      const upstreamTools = await upstreamClient.listTools();
      const localNames: readonly string[] = [LOCAL_TOOL_BINARY_INFO, LOCAL_TOOL_BRIDGE_INFO];
      const sliceResult = tools.tools.filter((tool) => !localNames.includes(tool.name));
      expect(sliceResult).toEqual(upstreamTools.tools);
      const names = tools.tools.map((tool) => tool.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
      const find = tools.tools.find((tool) => tool.name === 'browser_find');
      const receiverActual = find?.inputSchema.properties?.filename;
      const toMatchObjectOptions = { type: 'string' } as const;
      expect(receiverActual).toMatchObject(toMatchObjectOptions);
      const callOptions = { url: fixture.url } as const;
      const callResult = await call('browser_navigate', callOptions);
      expect(callResult).toContain(fixture.url);
      const immediateSnapshot = await call('browser_snapshot');
      expect(immediateSnapshot).toContain(fixture.url);
      expect(immediateSnapshot).toContain('Release marker');
      await setTimeout(500);
      const delayedSnapshot = await call('browser_snapshot');
      expect(delayedSnapshot).toContain(fixture.url);
      expect(delayedSnapshot).toContain('Release marker');
      const processObservation = {
        code: `async (page) => {
          const browser = page.context().browser();
          if (!browser) throw new Error('Missing owned browser');
          const session = await browser.newBrowserCDPSession();
          try {
            const result = await session.send('SystemInfo.getProcessInfo');
            const browserProcess = result.processInfo.find((info) => info.type === 'browser');
            return browserProcess.id;
          } finally {
            await session.detach();
          }
        }`,
      } as const;
      const processInfo = await call('browser_run_code_unsafe', processObservation);
      const processId = evaluationValue(processInfo);
      if (typeof processId !== 'number') throw new Error('Missing owned Chromium PID');
      browserPids.push(processId);
      const callOptions2 = { text: 'Release marker', filename } as const;
      await call('browser_find', callOptions2);
      const existsSyncResult = existsSync(filename);
      expect(existsSyncResult).toBe(true);
      const fileSyncResult = readFileSync(filename, 'utf8');
      expect(fileSyncResult).toContain('Release marker');
      const callOptions3 = { width: 1200, height: 900 } as const;
      await call('browser_resize', callOptions3);
      const viewportObservation = { code: 'async (page) => page.viewportSize()' } as const;
      const viewport = await call('browser_run_code_unsafe', viewportObservation);
      const viewportValue = evaluationValue(viewport);
      expect(viewportValue).toEqual(callOptions3);
      const callOptions4 = { target: '#name', text: 'Typed name' } as const;
      await call('browser_type', callOptions4);
      const callOptions5 = { function: '() => document.querySelector("#name").value' } as const;
      const callResult2 = await call('browser_evaluate', callOptions5);
      expect(callResult2).toContain('Typed name');
      const callOptions6 = { key: 'Enter' } as const;
      await call('browser_press_key', callOptions6);
      const selectAll = { key: 'ControlOrMeta+A' } as const;
      await call('browser_press_key', selectAll);
      const erase = { key: 'Backspace' } as const;
      await call('browser_press_key', erase);
      const cleared = await call('browser_evaluate', callOptions5);
      const clearedValue = evaluationValue(cleared);
      expect(clearedValue).toBe('');
      await call('browser_type', callOptions4);
      const callOptions7: Record<string, unknown> | undefined = {
        fields: [{ target: '#consent', name: 'Consent', type: 'checkbox', value: 'true' }],
      };
      await call('browser_fill_form', callOptions7);
      const callOptions8: Record<string, unknown> | undefined = { target: '#choice', values: ['b'] };
      await call('browser_select_option', callOptions8);
      const specialInputs = {
        code: `async (page) => {
          await page.locator('#date').fill('2026-10-10');
          const range = page.locator('#range');
          await range.focus();
          await range.press('Home');
          await range.press('ArrowRight');
          await page.locator('#color').evaluate((element) => {
            element.value = '#123456';
            const eventOptions = { bubbles: true };
            const event = new Event('input', eventOptions);
            element.dispatchEvent(event);
          });
          return true;
        }`,
      } as const;
      await call('browser_run_code_unsafe', specialInputs);
      const fieldsObservation = {
        function: `() => ({name: document.querySelector('#name').value,
          consent: document.querySelector('#consent').checked,
          choice: document.querySelector('#choice').value,
          date: document.querySelector('#date').value,
          range: document.querySelector('#range').value,
          color: document.querySelector('#color').value})`,
      } as const;
      const fields = await call('browser_evaluate', fieldsObservation);
      const fieldsValue = evaluationValue(fields);
      const expectedFields = {
        name: 'Typed name',
        consent: true,
        choice: 'b',
        date: '2026-10-10',
        range: '1',
        color: '#123456',
      };
      expect(fieldsValue).toEqual(expectedFields);
      const frameAction = {
        code: `async (page) => {
          const options = { name: 'Frame action' };
          await page.frameLocator('iframe').getByRole('button', options).click();
          return page.frameLocator('iframe').getByRole('button').innerText();
        }`,
      } as const;
      const frame = await call('browser_run_code_unsafe', frameAction);
      const frameValue = evaluationValue(frame);
      expect(frameValue).toBe('Frame clicked');
      const callOptions9 = { target: '#action', modifiers: ['Shift'] } as const;
      await call('browser_click', callOptions9);
      const modifierObservation = {
        function: '() => document.querySelector("#action").dataset.shiftClick',
      } as const;
      const modifierResult = await call('browser_evaluate', modifierObservation);
      const shift = evaluationValue(modifierResult);
      expect(shift).toBe('true');
      const callOptions10 = { text: 'Clicked' } as const;
      await call('browser_wait_for', callOptions10);
      const callResult3 = await call('browser_snapshot');
      expect(callResult3).toContain('Clicked');
      const callOptions11 = { target: '#hover' } as const;
      await call('browser_hover', callOptions11);
      const callResult4 = await call('browser_snapshot');
      expect(callResult4).toContain('Hovered');
      const callOptions12 = { startTarget: '#source', endTarget: '#drop' } as const;
      await call('browser_drag', callOptions12);
      const dragged = await call('browser_snapshot');
      expect(dragged).toContain('dragged');
      const callOptions13 = { target: '#drop', data: { 'text/plain': 'Dropped' } } as const;
      await call('browser_drop', callOptions13);
      const callResult5 = await call('browser_snapshot');
      expect(callResult5).toContain('Dropped');
      const upload = path.join(outputDir, 'upload.txt');
      writeFileSync(upload, 'Fixture upload');
      const callOptions14 = { target: '#file' } as const;
      await call('browser_click', callOptions14);
      const callOptions15: Record<string, unknown> | undefined = { paths: [upload] };
      await call('browser_file_upload', callOptions15);
      const callResult6 = await call('browser_snapshot');
      expect(callResult6).toContain('upload.txt');
      const uploadAction = { target: '#upload' } as const;
      await call('browser_click', uploadAction);
      const uploadedState = { text: 'Uploaded' } as const;
      await call('browser_wait_for', uploadedState);
      const fixtureState = fixture.getState();
      const expectedUploads = ['Fixture upload'];
      expect(fixtureState.uploads).toEqual(expectedUploads);
      const downloadAction = { target: '#download' } as const;
      await call('browser_click', downloadAction);
      const download = path.join(outputDir, 'fixture-download.txt');
      await expect.poll(() => existsSync(download)).toBe(true);
      const downloaded = readFileSync(download, 'utf8');
      expect(downloaded).toBe('Controlled fixture download\n');
      const callOptions16 = { target: '#dialog' } as const;
      const dialog = await call('browser_click', callOptions16);
      expect(dialog).toContain('Fixture dialog');
      const callOptions17 = { accept: true } as const;
      await call('browser_handle_dialog', callOptions17);
      const dialogClosed = { text: 'Dialog closed' } as const;
      await call('browser_wait_for', dialogClosed);
      const callOptions18 = { level: 'warning' } as const;
      const callResult7 = await call('browser_console_messages', callOptions18);
      expect(callResult7).toContain('Fixture console');
      const callOptions19 = { static: true } as const;
      const callResult8 = await call('browser_network_requests', callOptions19);
      expect(callResult8).toContain('/api');
      const networkText = toolText(callResult8);
      const apiPattern = /^(\d+)\.\s.*\/api(?:\s|$)/mu;
      const api = apiPattern.exec(networkText);
      if (!api) throw new Error(`Controlled API request not found:\n${networkText}`);
      const index = Number(api[1]);
      const requestFilename = path.join(outputDir, 'api-details.log');
      const requestOptions = { index, filename: requestFilename };
      await call('browser_network_request', requestOptions);
      const requestDetails = readFileSync(requestFilename, 'utf8');
      expect(requestDetails).toContain(`${fixture.url}/api`);
      expect(requestDetails).toMatch(/status:\s+\[200\]/u);
      expect(requestDetails).toContain('application/json');
      const bodyFilename = path.join(outputDir, 'api-response.json');
      const bodyOptions = { index, part: 'response-body', filename: bodyFilename };
      await call('browser_network_request', bodyOptions);
      const body = readFileSync(bodyFilename, 'utf8');
      expect(body).toBe('{"fixture":true}');
      const networkState = fixture.getState();
      expect(networkState.apiRequests).toBeGreaterThan(0);
      const callOptions21 = { colorScheme: 'dark' } as const;
      await call('browser_emulate_media', callOptions21);
      const callOptions22 = {
        function: '() => matchMedia("(prefers-color-scheme: dark)").matches',
      } as const;
      const callResult10 = await call('browser_evaluate', callOptions22);
      expect(callResult10).toContain('true');
      const screenshot = path.join(outputDir, 'fixture.png');
      const callOptions23 = { filename: screenshot, scale: 'css' } as const;
      await call('browser_take_screenshot', callOptions23);
      const existsSyncResult2 = existsSync(screenshot);
      expect(existsSyncResult2).toBe(true);
      const screenshotBytes = readFileSync(screenshot);
      await attachLocalScreenshot(context, screenshotBytes, fixture.url);
      const callOptions24 = { code: 'async (page) => page.title()' } as const;
      const callResult11 = await call('browser_run_code_unsafe', callOptions24);
      expect(callResult11).toContain('Release fixture');
      const callOptions25 = { action: 'new', url: `${fixture.url}/new` } as const;
      await call('browser_tabs', callOptions25);
      const callResult12 = await call('browser_snapshot');
      expect(callResult12).toContain('Release marker');
      expect(callResult12).toContain(`${fixture.url}/new`);
      const firstTab = { action: 'select', index: 0 } as const;
      await call('browser_tabs', firstTab);
      const original = await call('browser_snapshot');
      expect(original).not.toContain(`Page URL: ${fixture.url}/new`);
      const secondTab = { action: 'select', index: 1 } as const;
      await call('browser_tabs', secondTab);
      await call('browser_click', callOptions9);
      const selectedTab = await call('browser_snapshot');
      expect(selectedTab).toContain(`${fixture.url}/new`);
      expect(selectedTab).toContain('Clicked');
      const callOptions26 = { action: 'close' } as const;
      await call('browser_tabs', callOptions26);
      const callOptions27 = { url: `${fixture.url}/second` } as const;
      await call('browser_navigate', callOptions27);
      const callResult13 = await call('browser_navigate_back');
      expect(callResult13).toContain(fixture.url);
      expect(callResult13).not.toContain(`Page URL: ${fixture.url}/second`);
      const backSnapshot = await call('browser_snapshot');
      expect(backSnapshot).toContain('Release marker');
      await assertToolErrors(client, upstreamTools.tools, fixture.url);
      const binary = await call(LOCAL_TOOL_BINARY_INFO);
      const binaryResult = JSON.parse(binary) as { structuredContent: { browserEngine: string } };
      const expectedBinary = {
        browserEngine: 'cloak',
        executablePath: env.CLOAKBROWSER_BINARY_PATH,
        binary: { tier: 'free' },
      };
      expect(binaryResult.structuredContent).toMatchObject(expectedBinary);
      const bridge = await call(LOCAL_TOOL_BRIDGE_INFO);
      const bridgeResult = JSON.parse(bridge) as { structuredContent: unknown };
      const expectedBridge = {
        runtime: 'playwright-mcp-bridge',
        browserEngine: 'cloak',
        upstream: {
          version: expectedDependencyVersions.playwrightMcp,
          toolCount: upstreamTools.tools.length,
        },
        localTools: { names: localNames },
      };
      expect(bridgeResult.structuredContent).toMatchObject(expectedBridge);
      await call('browser_close');
      const listTabs = { action: 'list' } as const;
      const closed = await call('browser_tabs', listTabs, 'reopen-after-browser-close');
      expect(closed).toContain('about:blank');
      expect(closed).not.toContain(fixture.url);
      await call('browser_navigate', callOptions, 'navigate-after-browser-reopen');
      const recovered = await call('browser_snapshot');
      expect(recovered).toContain(fixture.url);
      expect(recovered).toContain('Release marker');
      const recoveredProcessInfo = await call('browser_run_code_unsafe', processObservation);
      const recoveredProcessId = evaluationValue(recoveredProcessInfo);
      if (typeof recoveredProcessId !== 'number') throw new Error('Missing restarted Chromium PID');
      browserPids.push(recoveredProcessId);
      await call('browser_close');
      const sortResult = [...visited].sort();
      const receiver2Actual = sortResult;
      const sortResult2 = tools.tools.map((tool) => tool.name).sort();
      expect(receiver2Actual).toEqual(sortResult2);
    } catch (cause) {
      if (visited.has('browser_navigate'))
        await attachFailureScreenshot(context, client, outputDir, fixture.url);
      const failure = cause instanceof Error ? cause.message : 'Unknown browser scenario failure';
      const diagnostic = { bridgePid, browserPids, failure, browserProcessLog: stderr };
      const safe = diagnostics.sanitizeDiagnostic(diagnostic);
      if (typeof safe !== 'string') {
        const errorOptions = { cause };
        throw new Error('Invalid process diagnostics', errorOptions);
      }
      await context.annotate(safe, 'cloak:process-diagnostics');
      const message2 = `Packaged browser E2E failed. Owned PID/exit diagnostics:\n${safe}`;
      const errorOptions = { cause } as const;
      throw new Error(message2, errorOptions);
    } finally {
      const values3: [Promise<void>, Promise<void>] = [client.close(), upstreamClient.close()];
      await Promise.allSettled(values3);
      await fixture.close();
      const pids = bridgePid === null ? browserPids : [bridgePid, ...browserPids];
      for (const pid of pids) {
        await expect
          .poll(() => {
            try {
              process.kill(pid, 0);
              return true;
            } catch (error) {
              if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
              throw error;
            }
          })
          .toBe(false);
      }
    }
  });
  it('restores cookie and localStorage state after restart and isolates persistent profiles', async (context) => {
    const command = await packFreePackage();
    const fixture = await startNpmBrowserFixture();
    const root = createTempRoot('cloak-profile-state-');
    const profileA = path.join(root, 'a');
    const profileB = path.join(root, 'b');
    const seedPath = path.join(profileA, profileSeedFileName);
    const owner = createProfileSessions(command, fixture.url, context);
    try {
      const first = await owner.start(profileA);
      await first.writeState('profile-a');
      const expected = { cookie: 'profile-a', storage: 'profile-a' };
      const original = await first.readState();
      expect(original).toEqual(expected);
      const seed = readFileSync(seedPath, 'utf8');
      expect(seed).toMatch(/^[1-9][0-9]{4}\n$/u);
      await first.close();
      const restarted = await owner.start(profileA);
      const restored = await restarted.readState();
      expect(restored).toEqual(expected);
      const reusedSeed = readFileSync(seedPath, 'utf8');
      expect(reusedSeed).toBe(seed);
      const independent = await owner.start(profileB);
      const absent = { cookie: null, storage: null };
      const isolated = await independent.readState();
      expect(isolated).toEqual(absent);
      await independent.writeState('profile-b');
      const unchanged = await restarted.readState();
      expect(unchanged).toEqual(expected);
      await independent.close();
      await restarted.close();
      const final = await owner.start(profileA);
      const retained = await final.readState();
      expect(retained).toEqual(expected);
    } finally {
      try {
        await owner.close();
      } finally {
        await fixture.close();
      }
    }
  });
  it('isolates concurrent in-memory sessions and discards state after recreation', async (context) => {
    const command = await packFreePackage();
    const fixture = await startNpmBrowserFixture();
    const owner = createProfileSessions(command, fixture.url, context);
    try {
      const first = await owner.start();
      await first.writeState('temporary-a');
      const expected = { cookie: 'temporary-a', storage: 'temporary-a' };
      const stored = await first.readState();
      expect(stored).toEqual(expected);
      const second = await owner.start();
      const absent = { cookie: null, storage: null };
      const isolated = await second.readState();
      expect(isolated).toEqual(absent);
      await second.writeState('temporary-b');
      const unchanged = await first.readState();
      expect(unchanged).toEqual(expected);
      await first.close();
      await second.close();
      const recreated = await owner.start();
      const fresh = await recreated.readState();
      expect(fresh).toEqual(absent);
    } finally {
      try {
        await owner.close();
      } finally {
        await fixture.close();
      }
    }
  });
  it('rejects competing profile ownership and releases it after shutdown and failed setup', async (context) => {
    const command = await packFreePackage();
    const fixture = await startNpmBrowserFixture();
    const profile = createTempRoot('cloak-profile-lock-');
    const owner = createProfileSessions(command, fixture.url, context);
    try {
      const first = await owner.start(profile);
      await first.writeState('lock-owner');
      const contention = owner.start(profile);
      await expect(contention).rejects.toThrow('Persistent profile is already active');
      const expected = { cookie: 'lock-owner', storage: 'lock-owner' };
      const unchanged = await first.readState();
      expect(unchanged).toEqual(expected);
      await first.close();
      const failureEnv = { PLAYWRIGHT_MCP_EXTENSION: 'true' };
      const failedSetup = owner.start(profile, failureEnv);
      await expect(failedSetup).rejects.toThrow('PLAYWRIGHT_MCP_EXTENSION_TOKEN must be a non-empty');
      const recovered = await owner.start(profile);
      const retained = await recovered.readState();
      expect(retained).toEqual(expected);
    } finally {
      try {
        await owner.close();
      } finally {
        await fixture.close();
      }
    }
  });
  const values4: readonly string[] = ['default', 'careful'];
  it.for(values4)('runs the revised humanize engine with preset %s', async (preset, context) => {
    const command = await packFreePackage();
    const fixture = await startNpmBrowserFixture();
    const options = { ...command.env };
    const propertyValue = 'cloak';
    const propertyValue2 = 'true';
    const currentPreset = preset;
    const propertyValue3 = 'false';
    const propertyValue4 = 'pw:browser';
    const computedValue2 = command.env.PLAYWRIGHT_MCP_OUTPUT_DIR ?? '';
    const dirnameResult3 = path.dirname(computedValue2);
    const joinedPath2 = path.join(dirnameResult3, 'profile');
    const env: Record<string, string> = {
      ...options,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: propertyValue,
      CLOAK_PLAYWRIGHT_MCP_HUMANIZE: propertyValue2,
      CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET: currentPreset,
      CLOAKBROWSER_AUTO_UPDATE: propertyValue3,
      DEBUG: propertyValue4,
      PLAYWRIGHT_MCP_USER_DATA_DIR: joinedPath2,
    };
    delete env.PLAYWRIGHT_MCP_CLI_PATH;
    const stdioClientTransportOptions4 = {
      command: command.command,
      args: command.args,
      env,
      stderr: 'pipe',
    } as const;
    const transport = new StdioClientTransport(stdioClientTransportOptions4);
    let stderr = '';
    transport.stderr?.on('data', (chunk: Buffer | string) => {
      stderr = (stderr + chunk.toString()).slice(-32768);
    });
    const clientOptions4 = { name: 'humanized npm e2e', version: '1' } as const;
    const client = new Client(clientOptions4);
    const call = async (name: string, args: Record<string, unknown>) => {
      const callToolOptions4 = { name, arguments: args } as const;
      const result = await client.callTool(callToolOptions4);
      if (result.isError) {
        const message3 = `${name}: ${JSON.stringify(result).replaceAll('\\n', '\n')}\n${stderr}`;
        const sanitized = diagnostics.sanitizeDiagnostic(message3);
        const safe = String(sanitized);
        throw new Error(safe);
      }
      return JSON.stringify(result);
    };
    try {
      await client.connect(transport);
      const callOptions28 = { url: fixture.url } as const;
      await call('browser_navigate', callOptions28);
      await setTimeout(500);
      const callOptions29 = {} as const;
      const callResult14 = await call('browser_snapshot', callOptions29);
      expect(callResult14).toContain('Release marker');
      const code = `async (page) => {
        page.setDefaultTimeout(5000);
        const filterOptions = { hasText: /^Action$/ };
        const clickOptions = { modifiers: ['Shift'] };
        await page.getByRole('button').filter(filterOptions).click(clickOptions);
        const frameButtonOptions = { name: 'Frame action' };
        await page.frameLocator('iframe').getByRole('button', frameButtonOptions).click();
        await page.locator('.duplicate').nth(1).click();
        const selectedDuplicate = await page.locator('#result').innerText();
        if (selectedDuplicate !== 'Duplicate 2 clicked') throw new Error('Humanize selected the wrong duplicate');
        const shiftClick = await page.locator('#action').getAttribute('data-shift-click');
        if (shiftClick !== 'true') throw new Error('Humanize lost the Shift click modifier');
        await page.locator('#name').fill('Humanized');
        await page.locator('#name').press('ControlOrMeta+A');
        await page.locator('#name').press('Backspace');
        await page.locator('#date').fill('2026-10-09');
        await page.locator('#month').fill('2026-10');
        await page.locator('#week').fill('2026-W41');
        await page.locator('#time').fill('15:24');
        await page.locator('#datetime').fill('2026-10-09T15:24');
        await page.locator('#choice').selectOption('b');
        if (await page.locator('#name').inputValue() !== '') throw new Error('Select-all did not clear input');
        if (await page.locator('#choice').inputValue() !== 'b') throw new Error('Selection did not change');
        return { frame: await page.frameLocator('iframe').getByRole('button').innerText(),
          date: await page.locator('#date').inputValue(),
          month: await page.locator('#month').inputValue(),
          week: await page.locator('#week').inputValue(),
          time: await page.locator('#time').inputValue(),
          datetime: await page.locator('#datetime').inputValue() };
      }`;
      const callOptions30 = { code } as const;
      const result = await call('browser_run_code_unsafe', callOptions30);
      expect(result).toContain('Frame clicked');
      expect(result).toContain('2026-10-09');
      const nativeValues = evaluationValue(result);
      const expectedNativeValues = {
        date: '2026-10-09',
        month: '2026-10',
        week: '2026-W41',
        time: '15:24',
        datetime: '2026-10-09T15:24',
      };
      expect(nativeValues).toMatchObject(expectedNativeValues);
      for (const [code, expected] of [
        [
          "async (page) => { const clickOptions = { timeout: 1000 }; return page.locator('.duplicate').click(clickOptions); }",
          'strict mode violation',
        ],
        [
          "async (page) => { const fillOptions = { timeout: 1000 }; return page.locator('#color').fill('#123456', fillOptions); }",
          'color',
        ],
      ]) {
        const callToolOptions5 = { name: 'browser_run_code_unsafe', arguments: { code } } as const;
        const failure = await client.callTool(callToolOptions5);
        expect(failure.isError).toBe(true);
        const serializedValue = JSON.stringify(failure);
        expect(serializedValue).toContain(expected);
      }
      for (const [property, hiddenValue, visibleValue, expectedError] of [
        ['visibility', 'hidden', 'visible', 'element is not visible'],
        ['display', 'none', 'block', 'TimeoutError: locator.click: Timeout 1000ms exceeded.'],
      ]) {
        const callToolOptions6 = {
          name: 'browser_run_code_unsafe',
          arguments: {
            code: `async (page) => {
              await page.locator('iframe').evaluate((element) => { element.style.${property} = '${hiddenValue}'; });
              const clickOptions = { timeout: 1000 };
              await page.frameLocator('iframe').getByRole('button').click(clickOptions);
            }`,
          },
        } as const;
        const hiddenFrame = await client.callTool(callToolOptions6);
        expect(hiddenFrame.isError).toBe(true);
        const serializedValue2 = JSON.stringify(hiddenFrame);
        expect(serializedValue2).toContain(expectedError);
        const callOptions31 = {
          code: `async (page) => page.locator('iframe').evaluate((element) => { element.style.${property} = '${visibleValue}'; })`,
        } as const;
        await call('browser_run_code_unsafe', callOptions31);
        const callOptions32 = {
          code: `async (page) => {
            const clicks = await page.frameLocator('iframe').getByRole('button').getAttribute('data-clicks');
            if (clicks !== '1') throw new Error('A hidden iframe received a click');
            return 'Hidden iframe click count unchanged';
          }`,
        } as const;
        await call('browser_run_code_unsafe', callOptions32);
      }
      await assertHumanizeReleaseScenarios(client, call, fixture.url);
      const callOptions33 = { action: 'new', url: `${fixture.url}/new` } as const;
      await call('browser_tabs', callOptions33);
      const callOptions34 = { target: '#action' } as const;
      await call('browser_click', callOptions34);
      const callOptions35 = {} as const;
      const callResult15 = await call('browser_snapshot', callOptions35);
      expect(callResult15).toContain('Clicked');
      const callOptions36 = {
        code: `async (page) => {
          const session = await page.context().newCDPSession(page);
          try {
            const liveId = await page._stealth.evaluate("__cloakH.resolve('#action', true).id");
            await session.send('HeapProfiler.collectGarbage');
            const liveElementExpression = '__cloakH.el(' + liveId + ').isConnected';
            if (!(await page._stealth.evaluate(liveElementExpression))) {
              throw new Error('Humanize lost a live DOM element during garbage collection');
            }
            const baseline = await session.send('Memory.getDOMCounters');
            for (let round = 0; round < 2; round++) {
              const ids = await page._stealth.evaluate(
                "(() => { const ids = []; for (let i = 0; i < 1000; i++) { const el = document.createElement('button'); el.id = 'memory-probe'; document.body.append(el); ids.push(__cloakH.resolve('#memory-probe', true).id); el.remove(); } return ids; })()"
              );
              await session.send('HeapProfiler.collectGarbage');
              const references = JSON.stringify(ids);
              const staleExpression = '(() => { const ids = ' + references + '; return ids.every(id => { try { __cloakH.el(id); return false; } catch (error) { return error.message.includes("cloak:stale-element"); } }); })()';
              if (!(await page._stealth.evaluate(staleExpression))) {
                throw new Error('Humanize retained a detached element reference');
              }
              const current = await session.send('Memory.getDOMCounters');
              if (current.nodes > baseline.nodes + 10) {
                const message = 'Humanize retained detached DOM nodes: ' + baseline.nodes + ' -> ' + current.nodes;
                throw new Error(message);
              }
            }
            const clickOptions = { timeout: 5000 };
            await page.locator('#action').click(clickOptions);
            if (await page.locator('#result').innerText() !== 'Clicked') {
              throw new Error('Live humanized element stopped working after collection');
            }
          } finally {
            await session.detach();
          }
          return 'Detached DOM nodes collected';
        }`,
      } as const;
      await call('browser_run_code_unsafe', callOptions36);
      const profile = env.PLAYWRIGHT_MCP_USER_DATA_DIR;
      if (!profile) throw new Error('Missing temporary persistent profile');
      const joinedPath3 = path.join(profile, '.cloakbrowser-seed');
      const fileSyncResult2 = readFileSync(joinedPath3, 'utf8');
      expect(fileSyncResult2).toMatch(/^[1-9][0-9]{4}\n$/u);
    } catch (cause) {
      await attachFailureScreenshot(context, client, computedValue2, fixture.url);
      const evidence = { pid: transport.pid, stderr, error: String(cause) };
      const sanitized = diagnostics.sanitizeDiagnostic(evidence);
      const safe = String(sanitized);
      await context.annotate(safe, 'cloak:process-diagnostics');
      const safeCause = new Error(safe);
      const errorOptions = { cause: safeCause };
      throw new Error(safe, errorOptions);
    } finally {
      try {
        await client.close();
      } finally {
        await fixture.close();
      }
    }
  });
  it('downloads safely from two processes into a cold cache without stdout status messages', async () => {
    const command = await packFreePackage();
    const computedValue3 = command.env.PLAYWRIGHT_MCP_OUTPUT_DIR ?? '';
    const installDir = path.dirname(computedValue3);
    const home = createTempRoot('cloak-cold-cache-');
    const env: Record<string, string> = {
      ...command.env,
      HOME: home,
      USERPROFILE: home,
      CLOAKBROWSER_CACHE_DIR: path.join(home, 'cache'),
      CLOAKBROWSER_LICENSE_KEY: '',
      CLOAKBROWSER_AUTO_UPDATE: 'false',
    };
    delete env.CLOAKBROWSER_BINARY_PATH;
    const code =
      "import { binaryInfo, ensureBinary } from 'cloakbrowser'; const expected = binaryInfo(); const binary = await ensureBinary(undefined, expected.version); const info = binaryInfo(expected.version); if (info.tier !== 'free' || !info.installed || info.binaryPath !== binary) throw new Error('Unexpected downloaded binary'); const result = { binary, version: info.version, tier: info.tier }; const encoded = JSON.stringify(result); const output = encoded + '\\n'; process.stdout.write(output);";
    const children: ReturnType<typeof spawn>[] = [];
    let outputs: string[];
    try {
      const fromOptions = { length: 2 } as const;
      const fromResult = Array.from(
        fromOptions,
        () =>
          new Promise<string>((resolve, reject) => {
            const values5: readonly string[] | undefined = ['--input-type=module', '-e', code];
            const spawnOptions = {
              cwd: installDir,
              env,
            } as const;
            const child = spawn(process.execPath, values5, spawnOptions);
            children.push(child);
            const timeout = globalThis.setTimeout(() => {
              child.kill('SIGKILL');
            }, 120000);
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk: Buffer) => {
              stdout += chunk.toString();
            });
            child.stderr.on('data', (chunk: Buffer) => {
              stderr = (stderr + chunk.toString()).slice(-32768);
            });
            child.once('error', (error) => {
              globalThis.clearTimeout(timeout);
              reject(error);
            });
            child.once('close', (exitCode, signal) => {
              globalThis.clearTimeout(timeout);
              if (exitCode === 0) resolve(stdout);
              else {
                const raw = `Concurrent download failed: pid=${String(child.pid)} exit=${String(exitCode)} signal=${String(signal)}\n${stderr}`;
                const sanitized = diagnostics.sanitizeDiagnostic(raw);
                const message4 = String(sanitized);
                const error2 = new Error(message4);
                reject(error2);
              }
            });
          }),
      );
      outputs = await Promise.all(fromResult);
    } finally {
      const mappedValues = children.map(async (child) => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
        child.kill('SIGKILL');
        await closed;
      });
      await Promise.all(mappedValues);
    }
    expect(outputs[0]).toBe(outputs[1]);
    expect(outputs[0]).toMatch(/^\{"binary":"[^\n]+","version":"[\d.]+","tier":"free"\}\n$/u);
    const computedValue4 = outputs[0] ?? '';
    const result = JSON.parse(computedValue4) as {
      binary: string;
      version: string;
      tier: string;
    };
    const existsSyncResult3 = existsSync(result.binary);
    expect(existsSyncResult3).toBe(true);
    const cache = env.CLOAKBROWSER_CACHE_DIR;
    if (!cache) throw new Error('Missing isolated cold cache');
    const entries = await readdir(cache);
    const leftovers = entries.filter((entry) => /\.partial-|\.lock$|\.tmp$|\.(?:zip|tar\.gz)$/u.test(entry));
    expect(leftovers).toEqual([]);
    const fixture = await startNpmBrowserFixture();
    const launchOptions = { executablePath: result.binary, headless: true };
    let browser: Browser | undefined;
    try {
      browser = await chromium.launch(launchOptions);
      const version = browser.version();
      const expectedVersion = result.version.split('.').slice(0, 4).join('.');
      expect(version).toBe(expectedVersion);
      const page = await browser.newPage();
      await page.goto(fixture.url);
      const marker = await page.locator('h1').innerText();
      expect(marker).toBe('Release marker');
    } finally {
      try {
        await browser?.close();
      } finally {
        await fixture.close();
      }
    }
  });
});
import { spawn } from 'node:child_process';
