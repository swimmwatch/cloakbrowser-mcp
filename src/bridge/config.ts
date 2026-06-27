import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { binaryInfo, buildLaunchOptions, ensureBinary, getDefaultStealthArgs } from 'cloakbrowser';
import {
  appendNodeOption,
  envBool,
  envInt,
  envList,
  envString,
  quoteNodeOptionValue,
  type EnvReader,
} from '#src/bridge/env';
import { resolvePlaywrightCoreBundlePath } from '#src/bridge/paths';
import { consoleFallbackInitScript, consoleFallbackPreloadScript } from '#src/runtime/consoleFallback';

export type BrowserEngine = 'cloak' | 'playwright';
export const humanPresets = ['default', 'careful'] as const;
export type HumanPreset = (typeof humanPresets)[number];
type CloakBuildLaunchOptions = typeof buildLaunchOptions;
type CloakLaunchOptions = NonNullable<Parameters<CloakBuildLaunchOptions>[0]>;
type CloakProxyOption = NonNullable<CloakLaunchOptions['proxy']>;
type PlaywrightProxyOption = {
  server: string;
  bypass?: string;
  username?: string;
  password?: string;
};

export interface BridgeRuntimeProxy {
  server: string;
  bypass?: string;
}

export interface BridgeRuntime {
  browserEngine: BrowserEngine;
  configPath: string;
  tempDir: string;
  childEnv: Record<string, string>;
  outputDir: string;
  cloakBinaryPath?: string;
  config: PlaywrightMcpBridgeConfig;
  dispose(): void;
}

export interface PrepareBridgeRuntimeOptions {
  env?: EnvReader;
  tempRoot?: string;
  ensureCloakBinary?: () => Promise<string>;
  buildCloakLaunchOptions?: CloakBuildLaunchOptions;
  browserIsolated?: boolean;
  geoipProxyMatch?: boolean;
  headless?: boolean;
  humanize?: boolean;
  humanPreset?: HumanPreset;
  proxy?: BridgeRuntimeProxy;
}

export interface PlaywrightMcpBridgeConfig {
  browser?: {
    browserName?: 'chromium';
    isolated?: boolean;
    launchOptions?: {
      executablePath?: string;
      headless?: boolean;
      args?: string[];
      chromiumSandbox?: boolean;
      ignoreDefaultArgs?: string[];
      proxy?: PlaywrightProxyOption;
    };
    initPage?: string[];
    initScript?: string[];
  };
}

const ignoredAutomationArgs = ['--enable-automation', '--enable-unsafe-swiftshader'];

export async function prepareBridgeRuntime(
  options: PrepareBridgeRuntimeOptions = {},
): Promise<BridgeRuntime> {
  const env = options.env ?? process.env;
  const tempDir = mkdtempSync(path.join(options.tempRoot ?? tmpdir(), 'cloakbrowser-mcp-'));
  const outputDir = envString(env, 'PLAYWRIGHT_MCP_OUTPUT_DIR', path.resolve('.playwright-mcp'));
  mkdirSync(outputDir, { recursive: true });

  const browserEngine = parseBrowserEngine(envString(env, 'PLAYWRIGHT_MCP_BROWSER_ENGINE', 'cloak'));
  const useCloak = browserEngine === 'cloak';
  const headless = options.headless ?? envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true);
  const humanPreset =
    options.humanPreset ?? parseHumanPreset(envString(env, 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', 'default'));
  const childEnv = createChildEnv(env, outputDir, options.proxy, headless, humanPreset);
  const chromiumSandbox = useCloak ? !envBool(env, 'CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX', true) : undefined;
  const launchOptions = {
    headless,
    args: useCloak ? createLaunchArgs(env) : envList(env, 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS'),
    chromiumSandbox,
    ignoreDefaultArgs: useCloak ? ignoredAutomationArgs : undefined,
  };
  const config: PlaywrightMcpBridgeConfig = {
    browser: {
      browserName: 'chromium',
      launchOptions,
    },
  };
  const configuredProxy = resolveConfiguredProxy(env, launchOptions.args ?? [], options.proxy);
  if (configuredProxy && typeof configuredProxy !== 'string') {
    config.browser!.launchOptions!.proxy = configuredProxy;
  }

  if (options.browserIsolated === true) {
    config.browser!.isolated = true;
    childEnv.PLAYWRIGHT_MCP_ISOLATED = 'true';
  }

  let cloakBinaryPath: string | undefined;
  if (useCloak) {
    cloakBinaryPath = await suppressStdout(options.ensureCloakBinary ?? ensureBinary);
    config.browser!.launchOptions!.executablePath = cloakBinaryPath;
    childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH = cloakBinaryPath;
    childEnv.CLOAKBROWSER_AUTO_UPDATE = childEnv.CLOAKBROWSER_AUTO_UPDATE ?? 'false';
    if (shouldMatchProxyGeoip(env, options.geoipProxyMatch)) {
      config.browser!.launchOptions!.args = await resolveGeoipProxyMatchingArgs({
        env,
        args: config.browser!.launchOptions!.args ?? [],
        headless,
        chromiumSandbox,
        proxy: options.proxy,
        buildCloakLaunchOptions: options.buildCloakLaunchOptions ?? buildLaunchOptions,
      });
    }
    if (shouldHumanize(env, options.humanize)) {
      config.browser!.initPage = [...(config.browser!.initPage ?? []), resolveHumanizeInitPagePath()];
    }
  }

  if (useCloak && envBool(env, 'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', true)) {
    const initScriptPath = path.join(tempDir, 'console-fallback-init.js');
    const preloadPath = path.join(tempDir, 'console-fallback.cjs');
    writeFileSync(initScriptPath, consoleFallbackInitScript);
    writeFileSync(preloadPath, consoleFallbackPreloadScript(resolvePlaywrightCoreBundlePath()));
    config.browser!.initScript = [...(config.browser!.initScript ?? []), initScriptPath];
    childEnv.NODE_OPTIONS = appendNodeOption(
      childEnv.NODE_OPTIONS,
      `--require=${quoteNodeOptionValue(preloadPath)}`,
    );
  }

  const configPath = path.join(tempDir, 'playwright-mcp.config.json');
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  childEnv.PLAYWRIGHT_MCP_CONFIG = configPath;

  return {
    browserEngine,
    configPath,
    tempDir,
    childEnv,
    outputDir,
    cloakBinaryPath,
    config,
    dispose() {
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export function createLaunchArgs(env: EnvReader): string[] {
  const args = new Set<string>();
  if (envBool(env, 'CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS', true)) {
    for (const arg of getDefaultStealthArgs()) args.add(arg);
  }
  if (envBool(env, 'CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX', true)) args.add('--no-sandbox');
  for (const arg of envList(env, 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS')) args.add(arg);
  return [...args];
}

interface ResolveGeoipProxyMatchingArgsOptions {
  env: EnvReader;
  args: string[];
  headless: boolean;
  chromiumSandbox: boolean | undefined;
  proxy?: BridgeRuntimeProxy;
  buildCloakLaunchOptions: CloakBuildLaunchOptions;
}

async function resolveGeoipProxyMatchingArgs(
  options: ResolveGeoipProxyMatchingArgsOptions,
): Promise<string[]> {
  const proxy = resolveConfiguredProxy(options.env, options.args, options.proxy);
  if (!proxy) return options.args;

  const launchOptions = await suppressStdout(() =>
    options.buildCloakLaunchOptions({
      headless: options.headless,
      stealthArgs: false,
      args: options.args,
      proxy,
      geoip: true,
      launchOptions:
        options.chromiumSandbox === undefined ? undefined : { chromiumSandbox: options.chromiumSandbox },
    }),
  );
  return mergeLaunchArgs(options.args, extractGeoipMatchingArgs(launchOptions.args ?? []));
}

function shouldMatchProxyGeoip(env: EnvReader, explicit: boolean | undefined): boolean {
  return explicit ?? envBool(env, 'CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH', false);
}

function shouldHumanize(env: EnvReader, explicit: boolean | undefined): boolean {
  return explicit ?? envBool(env, 'CLOAK_PLAYWRIGHT_MCP_HUMANIZE', false);
}

export function parseHumanPreset(value: string): HumanPreset {
  if (isHumanPreset(value)) return value;
  throw new Error(`CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET must be "default" or "careful", got "${value}"`);
}

function isHumanPreset(value: string): value is HumanPreset {
  return humanPresets.includes(value as HumanPreset);
}

function resolveHumanizeInitPagePath(): string {
  return fileURLToPath(new URL('../runtime/humanize-init-page.cjs', import.meta.url));
}

function resolveConfiguredProxy(
  env: EnvReader,
  args: readonly string[],
  runtimeProxy?: BridgeRuntimeProxy,
): CloakProxyOption | undefined {
  if (runtimeProxy)
    return runtimeProxy.bypass
      ? parseProxyOption(runtimeProxy.server, runtimeProxy.bypass)
      : parseProxyOption(runtimeProxy.server);

  const envProxyServer = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_SERVER');
  if (envProxyServer) {
    const bypass = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_BYPASS');
    return bypass ? parseProxyOption(envProxyServer, bypass) : parseProxyOption(envProxyServer);
  }

  const argProxyServer = findLaunchArgValue(args, '--proxy-server');
  if (!argProxyServer) return undefined;
  const bypass = findLaunchArgValue(args, '--proxy-bypass-list');
  return bypass ? parseProxyOption(argProxyServer, bypass) : parseProxyOption(argProxyServer);
}

function parseProxyOption(server: string, bypass?: string): PlaywrightProxyOption {
  const parsed = parseProxyServer(server);
  return bypass === undefined ? parsed : { ...parsed, bypass };
}

function parseProxyServer(server: string): PlaywrightProxyOption {
  try {
    const url = new URL(ensureProxyServerScheme(server));
    const username = decodeUrlCredential(url.username);
    const password = decodeUrlCredential(url.password);
    if (username === undefined && password === undefined) return { server };
    return {
      server: `${url.protocol}//${url.host}`,
      ...(username === undefined ? {} : { username }),
      ...(password === undefined ? {} : { password }),
    };
  } catch {
    return { server };
  }
}

function ensureProxyServerScheme(server: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(server) ? server : `http://${server}`;
}

function decodeUrlCredential(value: string): string | undefined {
  return value ? decodeURIComponent(value) : undefined;
}

function hasProxyCredentials(server: string): boolean {
  const parsed = parseProxyServer(server);
  return parsed.username !== undefined || parsed.password !== undefined;
}

function extractGeoipMatchingArgs(args: readonly string[]): string[] {
  return args.filter((arg) =>
    ['--fingerprint-timezone=', '--lang=', '--fingerprint-locale='].some((prefix) => arg.startsWith(prefix)),
  );
}

function mergeLaunchArgs(args: readonly string[], replacements: readonly string[]): string[] {
  const replacementByKey = new Map(
    replacements.map((replacement) => [launchArgKey(replacement), replacement]),
  );
  const result: string[] = [];
  const replacedKeys = new Set<string>();
  for (const arg of args) {
    const key = launchArgKey(arg);
    const replacement = replacementByKey.get(key);
    if (replacement === undefined) {
      result.push(arg);
    } else if (!replacedKeys.has(key)) {
      result.push(replacement);
      replacedKeys.add(key);
    }
  }
  for (const replacement of replacements) {
    const key = launchArgKey(replacement);
    if (!replacedKeys.has(key)) {
      result.push(replacement);
      replacedKeys.add(key);
    }
  }
  return result;
}

function findLaunchArgValue(args: readonly string[], name: string): string | undefined {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function launchArgKey(arg: string): string {
  return arg.split('=')[0] ?? arg;
}

function optionalEnvString(env: EnvReader, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

export function createChildEnv(
  env: EnvReader,
  outputDir: string,
  runtimeProxy?: BridgeRuntimeProxy,
  headless = envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true),
  humanPreset = parseHumanPreset(envString(env, 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', 'default')),
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') result[key] = value;
  }
  result.PLAYWRIGHT_MCP_HEADLESS = String(headless);
  result.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = humanPreset;
  result.PLAYWRIGHT_MCP_OUTPUT_DIR = outputDir;
  result.PLAYWRIGHT_MCP_OUTPUT_MODE = envString(env, 'PLAYWRIGHT_MCP_OUTPUT_MODE', 'stdout');
  result.PLAYWRIGHT_MCP_TIMEOUT_ACTION = String(envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_ACTION', 5000));
  result.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION = String(envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION', 60000));
  result.CLOAKBROWSER_AUTO_UPDATE = envString(env, 'CLOAKBROWSER_AUTO_UPDATE', 'false');
  const envProxyServer = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_SERVER');
  if (runtimeProxy === undefined && envProxyServer !== undefined && hasProxyCredentials(envProxyServer)) {
    removeProxyEnv(result);
  }
  if (runtimeProxy) applyRuntimeProxyEnv(result, runtimeProxy);
  return result;
}

function applyRuntimeProxyEnv(env: Record<string, string>, proxy: BridgeRuntimeProxy): void {
  env.PLAYWRIGHT_MCP_PROXY_SERVER = proxy.server;
  if (proxy.bypass === undefined) delete env.PLAYWRIGHT_MCP_PROXY_BYPASS;
  else env.PLAYWRIGHT_MCP_PROXY_BYPASS = proxy.bypass;
  if (hasProxyCredentials(proxy.server)) removeProxyEnv(env);
}

function removeProxyEnv(env: Record<string, string>): void {
  delete env.PLAYWRIGHT_MCP_PROXY_SERVER;
  delete env.PLAYWRIGHT_MCP_PROXY_BYPASS;
}

export function getCurrentCloakBinaryInfo(): ReturnType<typeof binaryInfo> {
  return binaryInfo();
}

function parseBrowserEngine(value: string): BrowserEngine {
  if (value === 'cloak' || value === 'playwright') return value;
  throw new Error(`PLAYWRIGHT_MCP_BROWSER_ENGINE must be "cloak" or "playwright", got "${value}"`);
}

async function suppressStdout<T>(fn: () => Promise<T>): Promise<T> {
  const stdout = process.stdout;
  if (stdoutSuppressionDepth === 0) {
    suppressedStdoutWrite = Reflect.get(stdout, 'write') as typeof process.stdout.write;
    process.stdout.write = suppressedProcessStdoutWrite as typeof process.stdout.write;
  }
  stdoutSuppressionDepth += 1;
  try {
    return await fn();
  } finally {
    stdoutSuppressionDepth -= 1;
    if (stdoutSuppressionDepth === 0) {
      const write = suppressedStdoutWrite;
      suppressedStdoutWrite = undefined;
      if (write) process.stdout.write = write;
    }
  }
}

let stdoutSuppressionDepth = 0;
let suppressedStdoutWrite: typeof process.stdout.write | undefined;

function suppressedProcessStdoutWrite(
  _chunk: string | Uint8Array,
  encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
  callback?: (error?: Error | null) => void,
): boolean {
  const writeCallback = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
  writeCallback?.();
  return true;
}
