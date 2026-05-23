import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { binaryInfo, ensureBinary, getDefaultStealthArgs } from 'cloakbrowser';
import { appendNodeOption, envBool, envInt, envList, envString, type EnvReader } from './env.js';
import { resolvePlaywrightCoreBundlePath } from './paths.js';
import { consoleFallbackInitScript, consoleFallbackPreloadScript } from '../runtime/consoleFallback.js';

export type BrowserEngine = 'cloak' | 'playwright';

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
}

export interface PlaywrightMcpBridgeConfig {
  browser?: {
    browserName?: 'chromium';
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
  const launchOptions = {
    headless: envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true),
    args: useCloak ? createLaunchArgs(env) : envList(env, 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS'),
    chromiumSandbox: useCloak ? !envBool(env, 'CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX', true) : undefined,
    ignoreDefaultArgs: useCloak ? ignoredAutomationArgs : undefined,
  };
  const config: PlaywrightMcpBridgeConfig = {
    browser: {
      browserName: 'chromium',
      launchOptions,
    },
  };

  let cloakBinaryPath: string | undefined;
  if (useCloak) {
    cloakBinaryPath = await suppressStdout(options.ensureCloakBinary ?? ensureBinary);
    config.browser!.launchOptions!.executablePath = cloakBinaryPath;
    childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH = cloakBinaryPath;
    childEnv.CLOAKBROWSER_AUTO_UPDATE = childEnv.CLOAKBROWSER_AUTO_UPDATE ?? 'false';
  }

  if (useCloak && envBool(env, 'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', true)) {
    const initScriptPath = path.join(tempDir, 'console-fallback-init.js');
    const preloadPath = path.join(tempDir, 'console-fallback.cjs');
    writeFileSync(initScriptPath, consoleFallbackInitScript);
    writeFileSync(preloadPath, consoleFallbackPreloadScript(resolvePlaywrightCoreBundlePath()));
    config.browser!.initScript = [...(config.browser!.initScript ?? []), initScriptPath];
    childEnv.NODE_OPTIONS = appendNodeOption(childEnv.NODE_OPTIONS, `--require=${preloadPath}`);
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
