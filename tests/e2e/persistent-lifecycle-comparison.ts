import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, readlinkSync, realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, type TestContext } from 'vitest';
import type { NpmDistributionCommand } from '@tests/e2e/distributionHarness.js';
import { killOwnedProcess } from '@tests/helpers/browser-test-runtime.js';
import { profileSeedFileName } from '@/bridge/profile-seed.js';
import { prepareBridgeRuntime } from '@/bridge/config.js';

type Layer = 'direct-playwright' | 'upstream-mcp' | 'installed-bridge';
interface Observation {
  url: string;
  marker: string | null;
  viewport: unknown;
  pid: number;
  args?: string[];
}
interface Evidence {
  layer: Layer;
  phase: string;
  stderr: string;
  primaryFailure?: unknown;
  binary: { version: string; sha256: string; wrapperVersion: string; arch: string };
  launches: string[];
  observations: Observation[];
}
const fixtureUrl = new URL('../fixtures/direct-persistent-browser.ts', import.meta.url);
const fixturePath = fileURLToPath(fixtureUrl);
const execute = promisify(execFile);

/** Compare one verified Free binary sequentially through three persistent-browser owners. */
export async function comparePersistentLifecycle(
  command: NpmDistributionCommand,
  url: string,
  context: TestContext,
  annotate: (evidence: unknown) => Promise<void>,
  verifiedFree: { executable: string; version: string },
): Promise<void> {
  const upstreamCli = path.join(command.installRoot, 'node_modules', '@playwright', 'mcp', 'cli.js');
  const configPath = path.join(command.installRoot, 'node_modules', 'cloakbrowser', 'dist', 'config.js');
  const configUrl = pathToFileURL(configPath);
  const { getChromiumVersion, WRAPPER_VERSION } = (await import(configUrl.href)) as {
    getChromiumVersion: () => string;
    WRAPPER_VERSION: string;
  };
  const expectedFreeVersion = getChromiumVersion();
  expect(verifiedFree.version).toBe(expectedFreeVersion);
  const executable = realpathSync(verifiedFree.executable);
  expect(command.env.CLOAKBROWSER_BINARY_PATH).toBe(executable);
  const hash = createHash('sha256');
  const stream = createReadStream(executable);
  for await (const chunk of stream) {
    if (!Buffer.isBuffer(chunk)) throw new Error('Invalid browser executable chunk');
    hash.update(chunk);
  }
  const sha256 = hash.digest('hex');
  const binary = {
    version: verifiedFree.version,
    sha256,
    wrapperVersion: WRAPPER_VERSION,
    arch: process.arch,
  };
  const layers: Layer[] = ['direct-playwright', 'upstream-mcp', 'installed-bridge'];
  const failures: unknown[] = [];
  const launches: string[] = [];
  const configs: unknown[] = [];
  for (const layer of layers) {
    const profile = path.join(command.installRoot, layer);
    await mkdir(profile);
    const seedPath = path.join(profile, profileSeedFileName);
    await writeFile(seedPath, '55369\n');
    const viewport = { width: 1200, height: 900 };
    const contextOptions = { viewport };
    const encodedContext = JSON.stringify(contextOptions);
    const env: Record<string, string> = {
      ...command.env,
      PLAYWRIGHT_MCP_BROWSER_ENGINE: 'cloak',
      PLAYWRIGHT_MCP_USER_DATA_DIR: profile,
      PLAYWRIGHT_MCP_HEADLESS: 'true',
      CLOAK_PLAYWRIGHT_MCP_HUMANIZE: 'false',
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS: '--fingerprint-platform=windows',
      CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS: encodedContext,
      DEBUG: 'pw:browser',
      DEBUG_COLORS: '0',
    };
    delete env.PLAYWRIGHT_MCP_CLI_PATH;
    const options = { env, tempRoot: command.installRoot, binaryPath: env.CLOAKBROWSER_BINARY_PATH };
    const runtime = await prepareBridgeRuntime(options);
    const evidence: Evidence = {
      layer,
      phase: 'connect',
      stderr: '',
      binary,
      launches: [],
      observations: [],
    };
    const identities = new Map<number, string | undefined>();
    const appendLog = (chunk: Buffer | string) => {
      evidence.stderr += chunk.toString();
      for (const match of evidence.stderr.matchAll(/<launched> pid=(\d+)/gu)) {
        const pid = Number(match[1]);
        if (identities.has(pid)) continue;
        identities.set(pid, undefined);
        try {
          const identity = ownedLinuxIdentity(pid, executable, profile);
          identities.set(pid, identity);
        } catch (cause) {
          failures.push(cause);
        }
      }
    };
    const encodedConfig = JSON.stringify(runtime.config.browser);
    const normalizedConfig = encodedConfig.replaceAll(profile, '<profile>');
    configs.push(JSON.parse(normalizedConfig));
    try {
      if (layer === 'direct-playwright') {
        const args = ['--experimental-strip-types', fixturePath, upstreamCli, runtime.configPath, url];
        const directOptions = {
          env: { ...runtime.childEnv, DEBUG: env.DEBUG, DEBUG_COLORS: '0' },
          timeout: 60000,
          maxBuffer: 1048576,
        };
        const operation = execute(process.execPath, args, directOptions);
        operation.child.stderr?.on('data', appendLog);
        let stdout: string;
        try {
          const result = await operation;
          stdout = result.stdout;
        } catch (cause) {
          const result = cause instanceof Error && 'stdout' in cause ? cause.stdout : undefined;
          evidence.primaryFailure = {
            phase: 'direct-driver',
            message: String(cause),
            result,
            stderr: evidence.stderr,
          };
          throw cause;
        }
        const result = JSON.parse(stdout) as {
          observations: Observation[];
          failure?: unknown;
          cleanupFailure?: string;
        };
        evidence.observations = result.observations;
        if (result.failure || result.cleanupFailure) throw new Error(stdout);
        const observation = { url: `${url}/`, marker: 'Release marker', viewport };
        const expected = [observation, observation];
        const observed = result.observations.map(({ url, marker, viewport }) => ({ url, marker, viewport }));
        expect(observed).toEqual(expected);
        for (const observation of result.observations) {
          if (!observation.args) throw new Error('Missing direct browser arguments');
          const args = observation.args.map((arg) => arg.replaceAll(profile, '<profile>'));
          const commandLine = args.join(' ').trim();
          evidence.launches.push(commandLine);
        }
      } else {
        if (layer === 'installed-bridge') runtime.dispose();
        const args = layer === 'upstream-mcp' ? [upstreamCli] : command.args;
        const childEnv = layer === 'upstream-mcp' ? runtime.childEnv : env;
        const transportOptions = { command: command.command, args, env: childEnv, stderr: 'pipe' } as const;
        const transport = new StdioClientTransport(transportOptions);
        transport.stderr?.on('data', appendLog);
        const clientOptions = { name: 'persistent lifecycle comparison', version: '1.0.0' };
        const client = new Client(clientOptions);
        context.onTestFinished(() => client.close());
        const call = async (phase: string, name: string, args: Record<string, unknown>) => {
          evidence.phase = phase;
          const request = { name, arguments: args };
          const result = await client.callTool(request);
          if (result.isError) {
            evidence.primaryFailure = { phase, result, stderr: evidence.stderr };
            const message = JSON.stringify(result);
            throw new Error(message);
          }
          return result;
        };
        try {
          await client.connect(transport);
          const emptyArgs = {};
          for (const mode of ['cold', 'reopen']) {
            if (mode === 'reopen') {
              const list = { action: 'list' };
              const result = await call('reopen-launch', 'browser_tabs', list);
              const serialized = JSON.stringify(result);
              expect(serialized).toContain('about:blank');
            }
            const navigation = { url };
            const navigationPhase = `${mode}-navigate`;
            await call(navigationPhase, 'browser_navigate', navigation);
            const snapshotPhase = `${mode}-snapshot`;
            const snapshot = await call(snapshotPhase, 'browser_snapshot', emptyArgs);
            const serialized = JSON.stringify(snapshot);
            expect(serialized).toContain('Release marker');
            expect(serialized).toContain(url);
            const observationArgs = { code: observeBrowser.toString() };
            const observationPhase = `${mode}-observe`;
            const result = await call(observationPhase, 'browser_run_code_unsafe', observationArgs);
            const observation = readObservation(result);
            evidence.observations.push(observation);
            const expectedViewport = { width: 1200, height: 900 };
            expect(observation.viewport).toEqual(expectedViewport);
            expect(observation.marker).toBe('Release marker');
            const expectedUrl = `${url}/`;
            expect(observation.url).toBe(expectedUrl);
            const identity = ownedLinuxIdentity(observation.pid, executable, profile);
            if (identity === undefined)
              throw new Error('Observed browser process is not owned by this layer');
            identities.set(observation.pid, identity);
            const commandPath = `/proc/${observation.pid}/cmdline`;
            const commandLine = readFileSync(commandPath, 'utf8');
            const actualArgs = commandLine.split('\0').filter(Boolean);
            observation.args = actualArgs;
            const normalizedArgs = actualArgs.map((arg) => arg.replaceAll(profile, '<profile>'));
            const normalizedCommand = normalizedArgs.join(' ').trim();
            evidence.launches.push(normalizedCommand);
            const closePhase = `${mode}-close`;
            await call(closePhase, 'browser_close', emptyArgs);
          }
        } finally {
          try {
            await client.close();
          } catch (cause) {
            failures.push(cause);
          }
        }
      }
      const commands = evidence.launches;
      expect(commands).toHaveLength(2);
      const first = commands[0];
      const second = commands[1];
      expect(first).toContain('--fingerprint=55369');
      expect(first).toContain('--fingerprint-platform=windows');
      expect(first).toContain('--remote-debugging-pipe');
      expect(first).toEqual(second);
      if (first) launches.push(first);
    } catch (cause) {
      evidence.primaryFailure ??= { phase: evidence.phase, message: String(cause), stderr: evidence.stderr };
      failures.push(cause);
    } finally {
      try {
        for (const [pid, originalIdentity] of identities) {
          const pollOptions = { timeout: 10000 };
          try {
            await expect
              .poll(() => {
                try {
                  const identity = ownedLinuxIdentity(pid, executable, profile);
                  if (identity === undefined) return false;
                  if (originalIdentity === undefined)
                    throw new Error('Could not capture original browser process identity');
                  return identity === originalIdentity;
                } catch (cause) {
                  if (cause instanceof Error && 'code' in cause && cause.code === 'ESRCH') return false;
                  throw cause;
                }
              }, pollOptions)
              .toBe(false);
          } catch (cause) {
            const identity = ownedLinuxIdentity(pid, executable, profile);
            if (originalIdentity !== undefined && identity === originalIdentity) killOwnedProcess(pid);
            failures.push(cause);
          }
        }
      } catch (cause) {
        failures.push(cause);
      } finally {
        try {
          runtime.dispose();
        } catch (cause) {
          failures.push(cause);
        }
        try {
          await annotate(evidence);
        } catch (cause) {
          failures.push(cause);
        }
      }
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Persistent lifecycle comparison failed');
  const directConfig = configs[0];
  const upstreamConfig = configs[1];
  const bridgeConfig = configs[2];
  expect(directConfig).toEqual(upstreamConfig);
  expect(directConfig).toEqual(bridgeConfig);
  expect(launches).toHaveLength(3);
  const directLaunch = launches[0];
  const upstreamLaunch = launches[1];
  const bridgeLaunch = launches[2];
  expect(directLaunch).toEqual(upstreamLaunch);
  expect(directLaunch).toEqual(bridgeLaunch);
}

/** Verify executable, profile, and process start time before signalling an owned process. */
function ownedLinuxIdentity(pid: number, executable: string, profile: string): string | undefined {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid observed browser process ID');
  const root = `/proc/${pid}`;
  const executablePath = path.join(root, 'exe');
  const commandPath = path.join(root, 'cmdline');
  const statPath = path.join(root, 'stat');
  try {
    const currentExecutable = readlinkSync(executablePath);
    const command = readFileSync(commandPath, 'utf8');
    const args = command.split('\0').filter(Boolean);
    const profileArg = `--user-data-dir=${profile}`;
    // Chromium may replace its argv vector with one complete process-title string.
    const profilePart = ` ${profileArg}`;
    const delimitedProfile = `${profilePart} `;
    const hasProfile =
      args.length === 1
        ? command.includes(delimitedProfile) || command.replaceAll('\0', '').endsWith(profilePart)
        : args.includes(profileArg);
    if (currentExecutable !== executable || !hasProfile) return undefined;
    const stat = readFileSync(statPath, 'utf8');
    const start = stat.lastIndexOf(')') + 2;
    const suffix = stat.slice(start);
    const fields = suffix.split(' ');
    const startTime = fields[19];
    if (!startTime) throw new Error('Missing Linux browser process start time');
    return startTime;
  } catch (cause) {
    if (cause instanceof Error && 'code' in cause && cause.code === 'ENOENT') return undefined;
    throw cause;
  }
}

async function observeBrowser(page: import('playwright').Page): Promise<Omit<Observation, 'args'>> {
  const browser = page.context().browser();
  if (!browser) throw new Error('Missing persistent browser');
  const session = await browser.newBrowserCDPSession();
  try {
    const result = await session.send('SystemInfo.getProcessInfo');
    const info = result.processInfo.find((item) => item.type === 'browser');
    if (!info) throw new Error('Missing browser process information');
    const heading = page.locator('h1');
    const marker = await heading.textContent();
    return { pid: info.id, url: page.url(), marker, viewport: page.viewportSize() };
  } finally {
    await session.detach();
  }
}

function readObservation(result: Awaited<ReturnType<Client['callTool']>>): Observation {
  if (!Array.isArray(result.content)) throw new Error('Missing MCP evaluation content');
  const content = result.content as Array<{ type: string; text?: unknown }>;
  const texts = content
    .filter((item) => item.type === 'text')
    .map((item) => (typeof item.text === 'string' ? item.text : ''));
  const text = texts.join('\n');
  const pattern = /### Result\n([\s\S]*?)(?:\n###|$)/u;
  const match = pattern.exec(text);
  const value = match?.[1]?.trim();
  if (!value) throw new Error('Missing MCP evaluation result');
  return JSON.parse(value) as Observation;
}
