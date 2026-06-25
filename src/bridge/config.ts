import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
type CloakBuildLaunchOptions = typeof buildLaunchOptions;
type CloakLaunchOptions = NonNullable<Parameters<CloakBuildLaunchOptions>[0]>;
type CloakProxyOption = NonNullable<CloakLaunchOptions['proxy']>;

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
    };
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
  const childEnv = createChildEnv(env, outputDir);
  const useCloak = browserEngine === 'cloak';
  const headless = envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true);
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
        buildCloakLaunchOptions: options.buildCloakLaunchOptions ?? buildLaunchOptions,
      });
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
  buildCloakLaunchOptions: CloakBuildLaunchOptions;
}

async function resolveGeoipProxyMatchingArgs(
  options: ResolveGeoipProxyMatchingArgsOptions,
): Promise<string[]> {
  const proxy = resolveConfiguredProxy(options.env, options.args);
  if (!proxy) return options.args;

  const launchOptions = await suppressStdout(() =>
    options.buildCloakLaunchOptions({
      headless: options.headless,
      stealthArgs: false,
      args: options.args,
      proxy,
      geoip: true,
      launchOptions:
        options.chromiumSandbox === undefined
          ? undefined
          : { chromiumSandbox: options.chromiumSandbox },
    }),
  );
  return mergeLaunchArgs(options.args, extractGeoipMatchingArgs(launchOptions.args ?? []));
}

function shouldMatchProxyGeoip(env: EnvReader, explicit: boolean | undefined): boolean {
  return explicit === true || envBool(env, 'CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH', false);
}

function resolveConfiguredProxy(env: EnvReader, args: readonly string[]): CloakProxyOption | undefined {
  const envProxyServer = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_SERVER');
  if (envProxyServer) {
    const bypass = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_BYPASS');
    return bypass ? { server: envProxyServer, bypass } : envProxyServer;
  }

  const argProxyServer = findLaunchArgValue(args, '--proxy-server');
  if (!argProxyServer) return undefined;
  const bypass = findLaunchArgValue(args, '--proxy-bypass-list');
  return bypass ? { server: argProxyServer, bypass } : argProxyServer;
}

function extractGeoipMatchingArgs(args: readonly string[]): string[] {
  return args.filter((arg) =>
    ['--fingerprint-timezone=', '--lang=', '--fingerprint-locale='].some((prefix) => arg.startsWith(prefix)),
  );
}

function mergeLaunchArgs(args: readonly string[], replacements: readonly string[]): string[] {
  const result = [...args];
  const indexes = new Map(result.map((arg, index) => [launchArgKey(arg), index]));
  for (const replacement of replacements) {
    const key = launchArgKey(replacement);
    const index = indexes.get(key);
    if (index === undefined) {
      indexes.set(key, result.length);
      result.push(replacement);
    } else {
      result[index] = replacement;
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

export function createChildEnv(env: EnvReader, outputDir: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') result[key] = value;
  }
  result.PLAYWRIGHT_MCP_HEADLESS = envString(env, 'PLAYWRIGHT_MCP_HEADLESS', 'true');
  result.PLAYWRIGHT_MCP_OUTPUT_DIR = outputDir;
  result.PLAYWRIGHT_MCP_OUTPUT_MODE = envString(env, 'PLAYWRIGHT_MCP_OUTPUT_MODE', 'stdout');
  result.PLAYWRIGHT_MCP_TIMEOUT_ACTION = String(envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_ACTION', 5000));
  result.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION = String(envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION', 60000));
  result.CLOAKBROWSER_AUTO_UPDATE = envString(env, 'CLOAKBROWSER_AUTO_UPDATE', 'false');
  return result;
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
  const write = stdout.write.bind(stdout);
  process.stdout.write = (() => true) as typeof process.stdout.write;
  try {
    return await fn();
  } finally {
    process.stdout.write = write;
  }
}
