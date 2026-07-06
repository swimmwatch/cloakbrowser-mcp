import {
  accessSync,
  constants as fsConstants,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { binaryInfo, buildLaunchOptions, ensureBinary, getDefaultStealthArgs } from 'cloakbrowser';
import {
  appendNodeOption,
  envBool,
  envInt,
  envList,
  type EnvReader,
  envString,
  quoteNodeOptionValue,
} from '#src/bridge/env';
import { resolvePlaywrightCoreBundlePath } from '#src/bridge/paths';
import { consoleFallbackInitScript, consoleFallbackPreloadScript } from '#src/runtime/consoleFallback';

export type BrowserEngine = 'cloak' | 'playwright';
export const humanPresets = ['default', 'careful'] as const;
export type HumanPreset = (typeof humanPresets)[number];
type CloakBuildLaunchOptions = typeof buildLaunchOptions;
type CloakLaunchOptions = NonNullable<Parameters<CloakBuildLaunchOptions>[0]>;
type CloakLaunchOptionsWithExtensions = CloakLaunchOptions & { extensionPaths?: string[] };
type CloakLaunchOptionsForBridge = CloakLaunchOptionsWithExtensions & {
  viewport?: BridgeContextOptions['viewport'];
};
type CloakProxyOption = NonNullable<CloakLaunchOptions['proxy']>;
type PlaywrightProxyOption = {
  server: string;
  bypass?: string;
  username?: string;
  password?: string;
};

export type BridgeContextOptions = {
  userAgent?: string;
  viewport?: { width: number; height: number } | null;
  locale?: string;
  timezoneId?: string;
  colorScheme?: 'dark' | 'light' | 'no-preference';
  permissions?: string[];
  geolocation?: {
    longitude: number;
    latitude: number;
    accuracy?: number;
  };
  extraHTTPHeaders?: Record<string, string>;
  httpCredentials?: {
    username: string;
    password: string;
    origin?: string;
    send?: 'always' | 'unauthorized';
  };
  ignoreHTTPSErrors?: boolean;
  offline?: boolean;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
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
  contextOptions?: BridgeContextOptions;
  extensionPaths?: string[];
  geoipProxyMatch?: boolean;
  headless?: boolean;
  humanize?: boolean;
  humanPreset?: HumanPreset;
  proxy?: BridgeRuntimeProxy;
  userDataDir?: string;
}

export interface PlaywrightMcpBridgeConfig {
  browser?: {
    browserName?: 'chromium';
    isolated?: boolean;
    userDataDir?: string;
    launchOptions?: {
      executablePath?: string;
      headless?: boolean;
      args?: string[];
      chromiumSandbox?: boolean;
      ignoreDefaultArgs?: string[];
      proxy?: PlaywrightProxyOption;
    };
    contextOptions?: BridgeContextOptions;
    initPage?: string[];
    initScript?: string[];
  };
}

const ignoredAutomationArgs = ['--enable-automation', '--enable-unsafe-swiftshader'];
const activeProfileLocks = new Set<string>();

type BridgeBrowserConfig = NonNullable<PlaywrightMcpBridgeConfig['browser']>;
type BridgeLaunchOptions = NonNullable<BridgeBrowserConfig['launchOptions']>;

interface PreparedBridgeRuntimeBase {
  env: EnvReader;
  tempDir: string;
  outputDir: string;
  browserEngine: BrowserEngine;
  useCloak: boolean;
  headless: boolean;
  humanPreset: HumanPreset;
  childEnv: Record<string, string>;
  chromiumSandbox: boolean | undefined;
  launchOptions: BridgeLaunchOptions;
  browserConfig: BridgeBrowserConfig;
  config: PlaywrightMcpBridgeConfig;
}

/**
 * Builds the temporary Playwright MCP config and environment used to launch the upstream bridge.
 */
export async function prepareBridgeRuntime(
  options: PrepareBridgeRuntimeOptions = {},
): Promise<BridgeRuntime> {
  const env = options.env ?? process.env;
  const tempDir = mkdtempSync(path.join(options.tempRoot ?? tmpdir(), 'cloakbrowser-mcp-'));
  let releaseProfileLock: (() => void) | undefined;

  try {
    const runtime = createPreparedBridgeRuntimeBase(env, options, tempDir);
    releaseProfileLock = applyConfiguredUserDataDir(runtime, options.userDataDir);
    const extensionPaths = applyConfiguredContextAndExtensions(runtime, options);
    applyConfiguredProxy(runtime, options.proxy);
    applyBrowserIsolation(runtime, options.browserIsolated);
    const cloakBinaryPath = runtime.useCloak
      ? await configureCloakRuntime(runtime, options, extensionPaths)
      : undefined;
    configureConsoleFallback(runtime);
    const configPath = writeBridgeConfig(runtime);

    return createBridgeRuntime(runtime, configPath, cloakBinaryPath, releaseProfileLock);
  } catch (error) {
    releaseProfileLock?.();
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function createPreparedBridgeRuntimeBase(
  env: EnvReader,
  options: PrepareBridgeRuntimeOptions,
  tempDir: string,
): PreparedBridgeRuntimeBase {
  const outputDir = envString(env, 'PLAYWRIGHT_MCP_OUTPUT_DIR', path.resolve('.playwright-mcp'));
  mkdirSync(outputDir, { recursive: true });

  const browserEngine = parseBrowserEngine(envString(env, 'PLAYWRIGHT_MCP_BROWSER_ENGINE', 'cloak'));
  const useCloak = browserEngine === 'cloak';
  const headless = options.headless ?? envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true);
  const humanPreset =
    options.humanPreset ?? parseHumanPreset(envString(env, 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', 'default'));
  const childEnv = createChildEnv(env, outputDir, options.proxy, headless, humanPreset);
  const chromiumSandbox = useCloak ? !envBool(env, 'CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX', true) : undefined;
  const launchOptions: BridgeLaunchOptions = {
    headless,
    args: useCloak ? createLaunchArgs(env) : envList(env, 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS'),
    chromiumSandbox,
    ignoreDefaultArgs: useCloak ? ignoredAutomationArgs : undefined,
  };
  const browserConfig: BridgeBrowserConfig = {
    browserName: 'chromium',
    launchOptions,
  };

  return {
    env,
    tempDir,
    outputDir,
    browserEngine,
    useCloak,
    headless,
    humanPreset,
    childEnv,
    chromiumSandbox,
    launchOptions,
    browserConfig,
    config: { browser: browserConfig },
  };
}

function applyConfiguredUserDataDir(
  runtime: PreparedBridgeRuntimeBase,
  runtimeUserDataDir: string | undefined,
): (() => void) | undefined {
  const userDataDir = resolveConfiguredUserDataDir(runtime.env, runtimeUserDataDir);
  if (userDataDir === undefined) return undefined;

  runtime.browserConfig.userDataDir = userDataDir;
  runtime.childEnv.PLAYWRIGHT_MCP_USER_DATA_DIR = userDataDir;
  delete runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED;
  return acquireProfileLock(userDataDir);
}

function applyConfiguredContextAndExtensions(
  runtime: PreparedBridgeRuntimeBase,
  options: PrepareBridgeRuntimeOptions,
): string[] {
  const contextOptions = resolveConfiguredContextOptions(runtime.env, options.contextOptions);
  if (contextOptions !== undefined) {
    runtime.browserConfig.contextOptions = contextOptions;
  }

  const extensionPaths = resolveConfiguredExtensionPaths(runtime.env, options.extensionPaths);
  if (extensionPaths.length > 0 && runtime.browserConfig.userDataDir === undefined) {
    throw new BridgeRuntimeConfigurationError(
      'CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS requires PLAYWRIGHT_MCP_USER_DATA_DIR or initialize metadata userDataDir',
    );
  }
  return extensionPaths;
}

function applyConfiguredProxy(
  runtime: PreparedBridgeRuntimeBase,
  runtimeProxy: BridgeRuntimeProxy | undefined,
): void {
  const configuredProxy = resolveConfiguredProxy(runtime.env, runtime.launchOptions.args ?? [], runtimeProxy);
  if (configuredProxy && typeof configuredProxy !== 'string') {
    runtime.launchOptions.proxy = configuredProxy;
  }
}

function applyBrowserIsolation(
  runtime: PreparedBridgeRuntimeBase,
  browserIsolated: boolean | undefined,
): void {
  if (browserIsolated === true && runtime.browserConfig.userDataDir === undefined) {
    runtime.browserConfig.isolated = true;
    runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED = 'true';
  }
}

async function configureCloakRuntime(
  runtime: PreparedBridgeRuntimeBase,
  options: PrepareBridgeRuntimeOptions,
  extensionPaths: string[],
): Promise<string> {
  const cloakBinaryPath = await suppressStdout(options.ensureCloakBinary ?? ensureBinary);
  runtime.launchOptions.executablePath = cloakBinaryPath;
  runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH = cloakBinaryPath;
  runtime.childEnv.CLOAKBROWSER_AUTO_UPDATE = runtime.childEnv.CLOAKBROWSER_AUTO_UPDATE ?? 'false';
  runtime.launchOptions.args = await resolveCloakLaunchArgs({
    env: runtime.env,
    cloakBinaryPath,
    args: runtime.launchOptions.args ?? [],
    headless: runtime.headless,
    chromiumSandbox: runtime.chromiumSandbox,
    proxy: options.proxy,
    extensionPaths,
    contextOptions: runtime.browserConfig.contextOptions,
    buildCloakLaunchOptions: options.buildCloakLaunchOptions ?? buildLaunchOptions,
    geoip: shouldMatchProxyGeoip(runtime.env, options.geoipProxyMatch),
  });
  if (shouldHumanize(runtime.env, options.humanize)) {
    runtime.browserConfig.initPage = [
      ...(runtime.browserConfig.initPage ?? []),
      resolveHumanizeInitPagePath(),
    ];
  }
  return cloakBinaryPath;
}

function configureConsoleFallback(runtime: PreparedBridgeRuntimeBase): void {
  if (!runtime.useCloak || !envBool(runtime.env, 'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', true)) return;

  const initScriptPath = path.join(runtime.tempDir, 'console-fallback-init.js');
  const preloadPath = path.join(runtime.tempDir, 'console-fallback.cjs');
  writeFileSync(initScriptPath, consoleFallbackInitScript);
  writeFileSync(preloadPath, consoleFallbackPreloadScript(resolvePlaywrightCoreBundlePath()));
  runtime.browserConfig.initScript = [...(runtime.browserConfig.initScript ?? []), initScriptPath];
  runtime.childEnv.NODE_OPTIONS = appendNodeOption(
    runtime.childEnv.NODE_OPTIONS,
    `--require=${quoteNodeOptionValue(preloadPath)}`,
  );
}

function writeBridgeConfig(runtime: PreparedBridgeRuntimeBase): string {
  const configPath = path.join(runtime.tempDir, 'playwright-mcp.config.json');
  writeFileSync(configPath, `${JSON.stringify(runtime.config, null, 2)}\n`);
  runtime.childEnv.PLAYWRIGHT_MCP_CONFIG = configPath;
  return configPath;
}

function createBridgeRuntime(
  runtime: PreparedBridgeRuntimeBase,
  configPath: string,
  cloakBinaryPath: string | undefined,
  releaseProfileLock: (() => void) | undefined,
): BridgeRuntime {
  let releaseLock = releaseProfileLock;
  return {
    browserEngine: runtime.browserEngine,
    configPath,
    tempDir: runtime.tempDir,
    childEnv: runtime.childEnv,
    outputDir: runtime.outputDir,
    cloakBinaryPath,
    config: runtime.config,
    dispose() {
      releaseLock?.();
      releaseLock = undefined;
      rmSync(runtime.tempDir, { recursive: true, force: true });
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

export class BridgeRuntimeConfigurationError extends Error {}

interface ResolveCloakLaunchArgsOptions {
  env: EnvReader;
  cloakBinaryPath: string;
  args: string[];
  headless: boolean;
  chromiumSandbox: boolean | undefined;
  proxy?: BridgeRuntimeProxy;
  extensionPaths: string[];
  contextOptions?: BridgeContextOptions;
  buildCloakLaunchOptions: CloakBuildLaunchOptions;
  geoip: boolean;
}

async function resolveCloakLaunchArgs(options: ResolveCloakLaunchArgsOptions): Promise<string[]> {
  const proxy = resolveConfiguredProxy(options.env, options.args, options.proxy);
  const geoip = options.geoip && proxy !== undefined;
  const cloakOptions = createCloakLaunchOptions(options, proxy, geoip);
  const launchOptions = await suppressStdout(() =>
    withCloakBinaryPath(options.cloakBinaryPath, () => options.buildCloakLaunchOptions(cloakOptions)),
  );
  return mergeLaunchArgs(options.args, extractCloakGeneratedArgs(launchOptions.args ?? []));
}

function createCloakLaunchOptions(
  options: ResolveCloakLaunchArgsOptions,
  proxy: CloakProxyOption | undefined,
  geoip: boolean,
): CloakLaunchOptionsForBridge {
  return {
    headless: options.headless,
    stealthArgs: false,
    args: options.args,
    ...(proxy === undefined ? {} : { proxy }),
    ...(geoip ? { geoip: true } : {}),
    ...(options.extensionPaths.length === 0 ? {} : { extensionPaths: options.extensionPaths }),
    ...(options.contextOptions?.viewport === undefined ? {} : { viewport: options.contextOptions.viewport }),
    launchOptions:
      options.chromiumSandbox === undefined ? undefined : { chromiumSandbox: options.chromiumSandbox },
  };
}

function resolveConfiguredUserDataDir(
  env: EnvReader,
  runtimeUserDataDir: string | undefined,
): string | undefined {
  if (runtimeUserDataDir !== undefined) {
    return resolveDirectory(runtimeUserDataDir, 'userDataDir', { create: true, writable: true });
  }
  const envUserDataDir = optionalEnvString(env, 'PLAYWRIGHT_MCP_USER_DATA_DIR');
  if (envUserDataDir === undefined) return undefined;
  return resolveDirectory(envUserDataDir, 'PLAYWRIGHT_MCP_USER_DATA_DIR', {
    create: true,
    writable: true,
  });
}

function resolveConfiguredExtensionPaths(
  env: EnvReader,
  runtimeExtensionPaths: string[] | undefined,
): string[] {
  const source =
    runtimeExtensionPaths === undefined
      ? {
          paths: envList(env, 'CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS'),
          label: 'CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS',
        }
      : { paths: runtimeExtensionPaths, label: 'extensionPaths' };
  return source.paths.map((extensionPath, index) =>
    resolveDirectory(extensionPath, `${source.label}[${index}]`, {
      create: false,
      writable: false,
    }),
  );
}

function resolveConfiguredContextOptions(
  env: EnvReader,
  runtimeContextOptions: BridgeContextOptions | undefined,
): BridgeContextOptions | undefined {
  const envContextOptions = readEnvContextOptions(env);
  const parsedRuntimeContextOptions =
    runtimeContextOptions === undefined
      ? undefined
      : parseBridgeContextOptions(runtimeContextOptions, 'contextOptions');
  return mergeContextOptions(envContextOptions, parsedRuntimeContextOptions);
}

function readEnvContextOptions(env: EnvReader): BridgeContextOptions | undefined {
  const raw = optionalEnvString(env, 'CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS');
  if (raw === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new BridgeRuntimeConfigurationError(
      `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS must be a JSON object: ${formatErrorMessage(error)}`,
    );
  }
  return parseBridgeContextOptions(parsed, 'CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS');
}

function mergeContextOptions(
  envContextOptions: BridgeContextOptions | undefined,
  runtimeContextOptions: BridgeContextOptions | undefined,
): BridgeContextOptions | undefined {
  const merged = {
    ...(envContextOptions ?? {}),
    ...(runtimeContextOptions ?? {}),
  };
  return Object.keys(merged).length === 0 ? undefined : merged;
}

const bridgeContextOptionParsers = {
  userAgent: readNonEmptyString,
  viewport: parseViewport,
  locale: readNonEmptyString,
  timezoneId: readNonEmptyString,
  colorScheme: parseColorScheme,
  permissions: parseStringArray,
  geolocation: parseGeolocation,
  extraHTTPHeaders: parseStringRecord,
  httpCredentials: parseHttpCredentials,
  ignoreHTTPSErrors: readBoolean,
  offline: readBoolean,
  deviceScaleFactor: readPositiveNumber,
  isMobile: readBoolean,
  hasTouch: readBoolean,
} satisfies Record<keyof BridgeContextOptions, (value: unknown, label: string) => unknown>;

/**
 * Validates browser context options supplied through environment JSON or initialize metadata.
 */
export function parseBridgeContextOptions(value: unknown, label = 'contextOptions'): BridgeContextOptions {
  if (!isRecord(value)) {
    throw new BridgeRuntimeConfigurationError(`${label} must be an object`);
  }

  const result: BridgeContextOptions = {};
  for (const key of Object.keys(value)) {
    if (!isBridgeContextOptionKey(key)) {
      throw new BridgeRuntimeConfigurationError(`${label}.${key} is not supported`);
    }
    Object.assign(result, {
      [key]: bridgeContextOptionParsers[key](value[key], `${label}.${key}`),
    });
  }
  return result;
}

function isBridgeContextOptionKey(key: string): key is keyof BridgeContextOptions {
  return Object.hasOwn(bridgeContextOptionParsers, key);
}

function resolveDirectory(
  value: string,
  label: string,
  options: { create: boolean; writable: boolean },
): string {
  if (value.trim().length === 0) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a non-empty path`);
  }
  const resolved = path.resolve(path.normalize(value));
  if (options.create) mkdirSync(resolved, { recursive: true });
  const stats = statSync(resolved, { throwIfNoEntry: false });
  if (!stats?.isDirectory()) {
    throw new BridgeRuntimeConfigurationError(`${label} must point to an existing directory: ${resolved}`);
  }
  try {
    accessSync(resolved, options.writable ? fsConstants.W_OK : fsConstants.R_OK);
  } catch {
    const access = options.writable ? 'writable' : 'readable';
    throw new BridgeRuntimeConfigurationError(`${label} must point to a ${access} directory: ${resolved}`);
  }
  return realpathDirectory(resolved);
}

function realpathDirectory(directory: string): string {
  try {
    return path.normalize(realpathSync.native(directory));
  } catch {
    return path.resolve(path.normalize(directory));
  }
}

function acquireProfileLock(userDataDir: string): () => void {
  const key = profileLockKey(userDataDir);
  if (activeProfileLocks.has(key)) {
    throw new BridgeRuntimeConfigurationError(
      `User data directory is already active in this process: ${userDataDir}`,
    );
  }
  activeProfileLocks.add(key);
  return () => {
    activeProfileLocks.delete(key);
  };
}

function profileLockKey(userDataDir: string): string {
  const normalized = path.normalize(userDataDir);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function parseViewport(value: unknown, label: string): BridgeContextOptions['viewport'] {
  if (value === null) return null;
  if (!isRecord(value)) throw new BridgeRuntimeConfigurationError(`${label} must be an object or null`);
  return {
    width: readPositiveInteger(value.width, `${label}.width`),
    height: readPositiveInteger(value.height, `${label}.height`),
  };
}

function parseColorScheme(value: unknown, label: string): BridgeContextOptions['colorScheme'] {
  if (value === 'dark' || value === 'light' || value === 'no-preference') return value;
  throw new BridgeRuntimeConfigurationError(`${label} must be "dark", "light", or "no-preference"`);
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new BridgeRuntimeConfigurationError(`${label} must be a string array`);
  return value.map((item, index) => readNonEmptyString(item, `${label}[${index}]`));
}

function parseGeolocation(value: unknown, label: string): NonNullable<BridgeContextOptions['geolocation']> {
  if (!isRecord(value)) throw new BridgeRuntimeConfigurationError(`${label} must be an object`);
  const longitude = readFiniteNumber(value.longitude, `${label}.longitude`);
  const latitude = readFiniteNumber(value.latitude, `${label}.latitude`);
  if (longitude < -180 || longitude > 180) {
    throw new BridgeRuntimeConfigurationError(`${label}.longitude must be between -180 and 180`);
  }
  if (latitude < -90 || latitude > 90) {
    throw new BridgeRuntimeConfigurationError(`${label}.latitude must be between -90 and 90`);
  }
  const accuracy =
    value.accuracy === undefined ? undefined : readNonNegativeNumber(value.accuracy, `${label}.accuracy`);
  return accuracy === undefined ? { longitude, latitude } : { longitude, latitude, accuracy };
}

function parseStringRecord(value: unknown, label: string): Record<string, string> {
  if (!isRecord(value)) throw new BridgeRuntimeConfigurationError(`${label} must be an object`);
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = readString(item, `${label}.${key}`);
  }
  return result;
}

function parseHttpCredentials(
  value: unknown,
  label: string,
): NonNullable<BridgeContextOptions['httpCredentials']> {
  if (!isRecord(value)) throw new BridgeRuntimeConfigurationError(`${label} must be an object`);
  const result: NonNullable<BridgeContextOptions['httpCredentials']> = {
    username: readNonEmptyString(value.username, `${label}.username`),
    password: readString(value.password, `${label}.password`),
  };
  if (value.origin !== undefined) {
    result.origin = readNonEmptyString(value.origin, `${label}.origin`);
  }
  if (value.send !== undefined) {
    if (value.send !== 'always' && value.send !== 'unauthorized') {
      throw new BridgeRuntimeConfigurationError(`${label}.send must be "always" or "unauthorized"`);
    }
    result.send = value.send;
  }
  return result;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new BridgeRuntimeConfigurationError(`${label} must be a string`);
  }
  return value;
}

function readNonEmptyString(value: unknown, label: string): string {
  const result = readString(value, label).trim();
  if (result.length === 0) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a non-empty string`);
  }
  return result;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BridgeRuntimeConfigurationError(`${label} must be a boolean`);
  }
  return value;
}

function readPositiveInteger(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (!Number.isInteger(result) || result <= 0) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a positive integer`);
  }
  return result;
}

function readPositiveNumber(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (result <= 0) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a positive number`);
  }
  return result;
}

function readNonNegativeNumber(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (result < 0) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a non-negative number`);
  }
  return result;
}

function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BridgeRuntimeConfigurationError(`${label} must be a finite number`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

function extractCloakGeneratedArgs(args: readonly string[]): string[] {
  return args.filter((arg) =>
    [
      '--fingerprint-timezone=',
      '--lang=',
      '--fingerprint-locale=',
      '--load-extension=',
      '--disable-extensions-except=',
      '--start-maximized',
    ].some((prefix) => arg.startsWith(prefix)),
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

function withCloakBinaryPath<T>(cloakBinaryPath: string, fn: () => T): T {
  const previous = process.env.CLOAKBROWSER_BINARY_PATH;
  process.env.CLOAKBROWSER_BINARY_PATH = cloakBinaryPath;
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.CLOAKBROWSER_BINARY_PATH;
    else process.env.CLOAKBROWSER_BINARY_PATH = previous;
  }
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
