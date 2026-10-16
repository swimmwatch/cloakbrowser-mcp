import { systemErrorCodes } from '#src/runtime/systemErrorCodes';
import {
  accessSync,
  closeSync,
  constants as fsConstants,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isIP } from 'node:net';
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
import { readOrCreateProfileSeed } from '#src/bridge/profile-seed';
import { consoleFallbackInitScript, consoleFallbackPreloadScript } from '#src/runtime/consoleFallback';
export type BrowserEngine = 'cloak' | 'playwright';
export const humanPresets = ['default', 'careful'] as const;
export type HumanPreset = (typeof humanPresets)[number];
export const releaseChannels = ['stable', 'preview'] as const;
export type ReleaseChannel = (typeof releaseChannels)[number];
const codegenLanguages = ['typescript', 'python', 'java', 'csharp', 'none'] as const;
const fingerprintWebrtcIpFlag = '--fingerprint-webrtc-ip';
type CodegenLanguage = (typeof codegenLanguages)[number];
type CloakBuildLaunchOptions = typeof buildLaunchOptions;
type CloakLaunchOptions = NonNullable<Parameters<CloakBuildLaunchOptions>[0]>;
type CloakLaunchOptionsWithExtensions = CloakLaunchOptions & {
  extensionPaths?: string[];
};
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
type ResolvedCloakLaunchOptions = {
  args: string[];
  proxy: PlaywrightProxyOption | undefined;
  licenseKey: string | undefined;
};
export type BridgeContextOptions = {
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  } | null;
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
  binaryPath?: string;
  env?: EnvReader;
  tempRoot?: string;
  ensureCloakBinary?: () => Promise<string>;
  buildCloakLaunchOptions?: CloakBuildLaunchOptions;
  browserIsolated?: boolean;
  contextOptions?: BridgeContextOptions;
  extensionMode?: boolean;
  extensionPaths?: string[];
  geoipProxyMatch?: boolean;
  headless?: boolean;
  humanize?: boolean;
  humanPreset?: HumanPreset;
  managedCdpInternalPort?: number;
  proxy?: BridgeRuntimeProxy;
  profileDirName?: string;
  releaseChannel?: ReleaseChannel;
  userDataDir?: string;
}
export function resolveEffectiveHeadless(
  options: Pick<PrepareBridgeRuntimeOptions, 'headless'>,
  env: EnvReader = process.env,
): boolean {
  return options.headless ?? envBool(env, 'PLAYWRIGHT_MCP_HEADLESS', true);
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
  codegen?: CodegenLanguage;
  snapshot?: {
    boxes?: boolean;
  };
}
const ignoredAutomationArgs = ['--enable-automation', '--enable-unsafe-swiftshader'];
const activeProfileLocks = new Set<string>();
const profileLockFileName = '.cloakbrowser-mcp-profile.lock';
const values: Iterable<string> | null | undefined = [
  'ALL_PROXY',
  'APPDATA',
  'CLOAKBROWSER_AUTO_UPDATE',
  'CLOAKBROWSER_CACHE_DIR',
  'CLOAKBROWSER_LICENSE_KEY',
  'COMSPEC',
  'DBUS_SESSION_BUS_ADDRESS',
  'DISPLAY',
  'HOME',
  'HOMEDRIVE',
  'HOMEPATH',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LC_MESSAGES',
  'LOCALAPPDATA',
  'NODE_EXTRA_CA_CERTS',
  'NO_PROXY',
  'PATH',
  'PATHEXT',
  'Path',
  'PLAYWRIGHT_BROWSERS_PATH',
  'PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST',
  'PLAYWRIGHT_DOWNLOAD_HOST',
  'PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST',
  'PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD',
  'PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST',
  'SSL_CERT_DIR',
  'SSL_CERT_FILE',
  'SystemRoot',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
  'USERPROFILE',
  'WAYLAND_DISPLAY',
  'WINDIR',
  'XAUTHORITY',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'XDG_RUNTIME_DIR',
  'all_proxy',
  'http_proxy',
  'https_proxy',
  'no_proxy',
];
const inheritedChildEnvNames = new Set(values);
const inheritedChildEnvPrefixes = ['PLAYWRIGHT_MCP_', 'CLOAK_PLAYWRIGHT_MCP_'] as const;
type BridgeBrowserConfig = NonNullable<PlaywrightMcpBridgeConfig['browser']>;
type BridgeLaunchOptions = NonNullable<BridgeBrowserConfig['launchOptions']>;
interface PreparedBridgeRuntimeBase {
  env: EnvReader;
  tempDir: string;
  outputDir: string;
  browserEngine: BrowserEngine;
  extensionMode: boolean;
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
  const computedValue = options.tempRoot ?? tmpdir();
  const joinedPath = path.join(computedValue, 'cloakbrowser-mcp-');
  const tempDir = mkdtempSync(joinedPath);
  let releaseProfileLock: (() => void) | undefined;
  try {
    const runtime = createPreparedBridgeRuntimeBase(env, options, tempDir);
    const computedValue2 = runtime.launchOptions.args ?? [];
    validateManagedCdpLaunchArgs(computedValue2, options.managedCdpInternalPort);
    releaseProfileLock = applyConfiguredUserDataDir(runtime, options.userDataDir);
    const extensionPaths = applyConfiguredContextAndExtensions(runtime, options);
    applyConfiguredProxy(runtime, options.proxy);
    applyBrowserIsolation(runtime, options.browserIsolated);
    validateAndApplyExtensionConnectionMode(runtime, options, extensionPaths);
    const cloakBinaryPath =
      runtime.useCloak && !runtime.extensionMode
        ? await configureCloakRuntime(runtime, options, extensionPaths)
        : undefined;
    applyManagedCdpLaunchOption(runtime, options.managedCdpInternalPort);
    configureConsoleFallback(runtime);
    const configPath = writeBridgeConfig(runtime);
    return createBridgeRuntime(runtime, configPath, cloakBinaryPath, releaseProfileLock);
  } catch (error) {
    releaseProfileLock?.();
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(tempDir, rmSyncOptions);
    throw error;
  }
}
function createPreparedBridgeRuntimeBase(
  env: EnvReader,
  options: PrepareBridgeRuntimeOptions,
  tempDir: string,
): PreparedBridgeRuntimeBase {
  const resolvedValue = path.resolve('.playwright-mcp');
  const outputDir = envString(env, 'PLAYWRIGHT_MCP_OUTPUT_DIR', resolvedValue);
  const mkdirSyncOptions = { recursive: true } as const;
  mkdirSync(outputDir, mkdirSyncOptions);
  const extensionMode = options.extensionMode ?? envBool(env, 'PLAYWRIGHT_MCP_EXTENSION', false);
  const browserEngine = extensionMode
    ? 'playwright'
    : (() => {
        const envStringResult = envString(env, 'PLAYWRIGHT_MCP_BROWSER_ENGINE', 'cloak');
        return parseBrowserEngine(envStringResult);
      })();
  const useCloak = browserEngine === 'cloak';
  const headless = extensionMode ? false : resolveEffectiveHeadless(options, env);
  const codegen = readCodegenLanguage(env);
  const snapshotBoxes = readSnapshotBoxes(env);
  const humanPreset =
    options.humanPreset ??
    (() => {
      const envStringResult2 = envString(env, 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', 'default');
      return parseHumanPreset(envStringResult2);
    })();
  const childEnv = createChildEnv(env, outputDir, options.proxy, headless, humanPreset);
  if (!useCloak && !extensionMode) {
    childEnv.PLAYWRIGHT_MCP_BROWSER ??= 'chromium';
  }
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
    extensionMode,
    useCloak,
    headless,
    humanPreset,
    childEnv,
    chromiumSandbox,
    launchOptions,
    browserConfig,
    config: {
      browser: browserConfig,
      ...(codegen === undefined ? {} : { codegen }),
      ...(snapshotBoxes === undefined ? {} : { snapshot: { boxes: snapshotBoxes } }),
    },
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
  const argumentValue = runtime.env;
  const computedValue3 = runtime.launchOptions.args ?? [];
  const configuredProxy = resolveConfiguredProxy(argumentValue, computedValue3, runtimeProxy);
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
function validateAndApplyExtensionConnectionMode(
  runtime: PreparedBridgeRuntimeBase,
  options: PrepareBridgeRuntimeOptions,
  extensionPaths: readonly string[],
): void {
  const profileDirName = resolveProfileDirName(runtime.env, options.profileDirName);
  if (profileDirName !== undefined) {
    runtime.childEnv.PLAYWRIGHT_MCP_PROFILE_DIR_NAME = profileDirName;
  }
  runtime.childEnv.PLAYWRIGHT_MCP_EXTENSION = String(runtime.extensionMode);
  if (!runtime.extensionMode) {
    delete runtime.childEnv.PLAYWRIGHT_MCP_EXTENSION_TOKEN;
    return;
  }
  if (optionalEnvString(runtime.env, 'PLAYWRIGHT_MCP_EXTENSION_TOKEN') === undefined) {
    throw new BridgeRuntimeConfigurationError(
      'PLAYWRIGHT_MCP_EXTENSION_TOKEN must be a non-empty process environment value in extension mode',
    );
  }
  if (runtime.browserConfig.userDataDir === undefined) {
    throw new BridgeRuntimeConfigurationError(
      'PLAYWRIGHT_MCP_USER_DATA_DIR or initialize metadata userDataDir is required in extension mode',
    );
  }
  const conflicts = collectExtensionModeConflicts(runtime, options, extensionPaths);
  if (conflicts.length > 0) {
    const message2 = `Playwright Extension connection mode is incompatible with ${conflicts.join(', ')}`;
    throw new BridgeRuntimeConfigurationError(message2);
  }
  delete runtime.browserConfig.isolated;
  runtime.browserConfig.launchOptions = {};
  delete runtime.childEnv.PLAYWRIGHT_MCP_ISOLATED;
  runtime.childEnv.PLAYWRIGHT_MCP_HEADLESS = 'false';
}
function collectExtensionModeConflicts(
  runtime: PreparedBridgeRuntimeBase,
  options: PrepareBridgeRuntimeOptions,
  extensionPaths: readonly string[],
): string[] {
  const conflicts: string[] = [];
  const add = (condition: boolean, label: string): void => {
    if (condition) conflicts.push(label);
  };
  const computedValue4 = options.managedCdpInternalPort !== undefined;
  add(computedValue4, 'managed CDP');
  const computedValue5 = optionalEnvString(runtime.env, 'PLAYWRIGHT_MCP_CDP_ENDPOINT') !== undefined;
  add(computedValue5, 'PLAYWRIGHT_MCP_CDP_ENDPOINT');
  const computedValue6 = optionalEnvString(runtime.env, 'PLAYWRIGHT_MCP_ENDPOINT') !== undefined;
  add(computedValue6, 'PLAYWRIGHT_MCP_ENDPOINT');
  const computedValue7 =
    options.headless === true ||
    (runtime.env.PLAYWRIGHT_MCP_HEADLESS !== undefined &&
      envBool(runtime.env, 'PLAYWRIGHT_MCP_HEADLESS', false));
  add(computedValue7, 'headless launch');
  const envBoolResult = envBool(runtime.env, 'PLAYWRIGHT_MCP_ISOLATED', false);
  add(envBoolResult, 'PLAYWRIGHT_MCP_ISOLATED');
  const computedValue8 = runtime.launchOptions.proxy !== undefined;
  add(computedValue8, 'proxy configuration');
  const shouldMatchProxyGeoipResult = shouldMatchProxyGeoip(runtime.env, options.geoipProxyMatch);
  add(shouldMatchProxyGeoipResult, 'GeoIP matching');
  const shouldHumanizeResult = shouldHumanize(runtime.env, options.humanize);
  add(shouldHumanizeResult, 'humanization');
  const computedValue9 = runtime.browserConfig.contextOptions !== undefined;
  add(computedValue9, 'browser context mutation');
  const computedValue10 = extensionPaths.length > 0;
  add(computedValue10, 'CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS');
  for (const name of [
    'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS',
    'CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX',
    'CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL',
    'CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS',
  ] as const) {
    const computedValue11 = runtime.env[name] !== undefined;
    add(computedValue11, name);
  }
  return conflicts;
}
function resolveProfileDirName(
  env: EnvReader,
  runtimeProfileDirName: string | undefined,
): string | undefined {
  const value = runtimeProfileDirName ?? optionalEnvString(env, 'PLAYWRIGHT_MCP_PROFILE_DIR_NAME');
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed === '.' ||
    trimmed === '..' ||
    path.posix.isAbsolute(trimmed) ||
    path.win32.isAbsolute(trimmed) ||
    trimmed.includes('/') ||
    trimmed.includes('\\')
  ) {
    const label = runtimeProfileDirName === undefined ? 'PLAYWRIGHT_MCP_PROFILE_DIR_NAME' : 'profileDirName';
    const message3 = `${label} must be one relative path segment`;
    throw new BridgeRuntimeConfigurationError(message3);
  }
  return trimmed;
}
async function configureCloakRuntime(
  runtime: PreparedBridgeRuntimeBase,
  options: PrepareBridgeRuntimeOptions,
  extensionPaths: string[],
): Promise<string> {
  const profile = runtime.browserConfig.userDataDir;
  const explicitFingerprint = envList(runtime.env, 'CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS').some(
    (arg) => arg.split('=')[0] === '--fingerprint',
  );
  if (profile && envBool(runtime.env, 'CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS', true) && !explicitFingerprint) {
    try {
      const seed = await readOrCreateProfileSeed(profile);
      runtime.launchOptions.args = [
        `--fingerprint=${seed}`,
        ...(runtime.launchOptions.args ?? []).filter((arg) => arg.split('=')[0] !== '--fingerprint'),
      ];
    } catch (cause) {
      const bridgeRuntimeConfigurationErrorOptions = {
        cause,
      } as const;
      throw new BridgeRuntimeConfigurationError(
        'Unable to initialize the persistent profile fingerprint seed',
        bridgeRuntimeConfigurationErrorOptions,
      );
    }
  }
  const configuredBinaryPath = resolveConfiguredCloakBinaryPath(runtime.env, options.binaryPath);
  const cloakBinaryPath =
    configuredBinaryPath ??
    (await (() => {
      const computedValue12 = options.ensureCloakBinary ?? ensureBinary;
      return suppressStdout(computedValue12);
    })());
  runtime.launchOptions.executablePath = cloakBinaryPath;
  runtime.childEnv.PLAYWRIGHT_MCP_EXECUTABLE_PATH = cloakBinaryPath;
  runtime.childEnv.CLOAKBROWSER_AUTO_UPDATE = runtime.childEnv.CLOAKBROWSER_AUTO_UPDATE ?? 'false';
  const resolveCloakLaunchOptionsOptions: ResolveCloakLaunchOptionsOptions = {
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
    releaseChannel: resolveReleaseChannel(runtime.env, options.releaseChannel),
  };
  const cloakLaunchOptions = await resolveCloakLaunchOptions(resolveCloakLaunchOptionsOptions);
  runtime.launchOptions.args = cloakLaunchOptions.args;
  if (cloakLaunchOptions.proxy === undefined) delete runtime.launchOptions.proxy;
  else runtime.launchOptions.proxy = cloakLaunchOptions.proxy;
  if (cloakLaunchOptions.licenseKey !== undefined) {
    runtime.childEnv.CLOAKBROWSER_LICENSE_KEY = cloakLaunchOptions.licenseKey;
  }
  if (shouldHumanize(runtime.env, options.humanize)) {
    runtime.browserConfig.initPage = [
      ...(runtime.browserConfig.initPage ?? []),
      resolveHumanizeInitPagePath(),
    ];
  }
  return cloakBinaryPath;
}
function configureConsoleFallback(runtime: PreparedBridgeRuntimeBase): void {
  if (
    runtime.extensionMode ||
    !runtime.useCloak ||
    !envBool(runtime.env, 'CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK', true)
  ) {
    return;
  }
  const initScriptPath = path.join(runtime.tempDir, 'console-fallback-init.js');
  const preloadPath = path.join(runtime.tempDir, 'console-fallback.cjs');
  writeFileSync(initScriptPath, consoleFallbackInitScript);
  const resolvePlaywrightCoreBundlePathResult = resolvePlaywrightCoreBundlePath();
  const consoleFallbackPreloadScriptResult = consoleFallbackPreloadScript(
    resolvePlaywrightCoreBundlePathResult,
  );
  writeFileSync(preloadPath, consoleFallbackPreloadScriptResult);
  runtime.browserConfig.initScript = [...(runtime.browserConfig.initScript ?? []), initScriptPath];
  const argumentValue2 = runtime.childEnv.NODE_OPTIONS;
  const message4 = `--require=${quoteNodeOptionValue(preloadPath)}`;
  runtime.childEnv.NODE_OPTIONS = appendNodeOption(argumentValue2, message4);
}
function applyManagedCdpLaunchOption(
  runtime: PreparedBridgeRuntimeBase,
  internalPort: number | undefined,
): void {
  for (const name of Object.keys(runtime.childEnv)) {
    if (name.startsWith('PLAYWRIGHT_MCP_CDP_') || name.startsWith('CLOAK_PLAYWRIGHT_MCP_CDP_')) {
      delete runtime.childEnv[name];
    }
  }
  if (internalPort === undefined) return;
  if (!Number.isInteger(internalPort) || internalPort < 1 || internalPort > 65535) {
    throw new BridgeRuntimeConfigurationError('managedCdpInternalPort must be an integer from 1 to 65535');
  }
  const args = runtime.launchOptions.args ?? [];
  validateManagedCdpLaunchArgs(args, internalPort);
  runtime.launchOptions.args = [...args, `--remote-debugging-port=${internalPort}`];
}
function validateManagedCdpLaunchArgs(args: string[], internalPort: number | undefined): void {
  if (internalPort === undefined) return;
  const prohibitedPrefixes = [
    '--remote-debugging-port',
    '--remote-debugging-address',
    '--remote-debugging-pipe',
    '--remote-allow-origins',
  ];
  const conflict = args.find((arg) =>
    prohibitedPrefixes.some(
      (prefix) =>
        arg === prefix ||
        (() => {
          const message5 = `${prefix}=`;
          return arg.startsWith(message5);
        })(),
    ),
  );
  if (conflict !== undefined) {
    const message6 = `${conflict.split('=')[0]} conflicts with managed CDP`;
    throw new BridgeRuntimeConfigurationError(message6);
  }
}
function writeBridgeConfig(runtime: PreparedBridgeRuntimeBase): string {
  const configPath = path.join(runtime.tempDir, 'playwright-mcp.config.json');
  const message7 = `${JSON.stringify(runtime.config, null, 2)}\n`;
  writeFileSync(configPath, message7);
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
      const rmSyncOptions2 = { recursive: true, force: true } as const;
      rmSync(runtime.tempDir, rmSyncOptions2);
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
interface ResolveCloakLaunchOptionsOptions {
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
  releaseChannel: ReleaseChannel;
}
async function resolveCloakLaunchOptions(
  options: ResolveCloakLaunchOptionsOptions,
): Promise<ResolvedCloakLaunchOptions> {
  const proxy = resolveConfiguredProxy(options.env, options.args, options.proxy);
  const geoip = options.geoip && proxy !== undefined;
  const cloakOptions = createCloakLaunchOptions(options, proxy, geoip);
  if (geoip) {
    // A user-supplied spoof must not suppress or impersonate actual GeoIP discovery.
    cloakOptions.args = options.args.filter((arg) => !isWebrtcIpArg(arg));
  }
  const launchOptions = await suppressStdout(() =>
    withCloakBinaryPath(options.cloakBinaryPath, () => options.buildCloakLaunchOptions(cloakOptions)),
  );
  const generatedLicenseKey = launchOptions.env?.CLOAKBROWSER_LICENSE_KEY;
  const argumentValue3 = options.args;
  const generatedArgs = readStringArray(launchOptions.args);
  const validatedArgs = geoip ? validateGeoipExitArgs(options.args, generatedArgs) : generatedArgs;
  const extractCloakGeneratedArgsResult = extractCloakGeneratedArgs(validatedArgs);
  const mergeLaunchArgsResult = mergeLaunchArgs(argumentValue3, extractCloakGeneratedArgsResult);
  const propertyValue = launchOptions.proxy;
  const propertyValue2 = typeof generatedLicenseKey === 'string' ? generatedLicenseKey : undefined;
  return {
    args: mergeLaunchArgsResult,
    proxy: propertyValue,
    licenseKey: propertyValue2,
  };
}
function isWebrtcIpArg(arg: string): boolean {
  const key = launchArgKey(arg);
  return key === fingerprintWebrtcIpFlag;
}
function validateGeoipExitArgs(originalArgs: readonly string[], generatedArgs: string[]): string[] {
  const exitIp = findLaunchArgValue(generatedArgs, fingerprintWebrtcIpFlag);
  if (exitIp === undefined || isIP(exitIp) === 0) {
    throw new BridgeRuntimeConfigurationError(
      'GeoIP resolution failed: could not discover the proxy exit IP',
    );
  }
  const explicitIp = findLaunchArgValue(originalArgs, fingerprintWebrtcIpFlag);
  // Restore explicit spoofing only after discovery; "auto" keeps the resolved IP.
  return explicitIp !== undefined && explicitIp !== 'auto'
    ? generatedArgs.filter((arg) => !isWebrtcIpArg(arg))
    : generatedArgs;
}
function createCloakLaunchOptions(
  options: ResolveCloakLaunchOptionsOptions,
  proxy: CloakProxyOption | undefined,
  geoip: boolean,
): CloakLaunchOptionsForBridge {
  return {
    headless: options.headless,
    stealthArgs: false,
    args: options.args,
    ...(proxy === undefined ? {} : { proxy }),
    ...(geoip ? { geoip: true } : {}),
    releaseChannel: options.releaseChannel,
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
    const resolveDirectoryOptions = { create: true, writable: true } as const;
    return resolveDirectory(runtimeUserDataDir, 'userDataDir', resolveDirectoryOptions);
  }
  const envUserDataDir = optionalEnvString(env, 'PLAYWRIGHT_MCP_USER_DATA_DIR');
  if (envUserDataDir === undefined) return undefined;
  const resolveDirectoryOptions2 = {
    create: true,
    writable: true,
  } as const;
  return resolveDirectory(envUserDataDir, 'PLAYWRIGHT_MCP_USER_DATA_DIR', resolveDirectoryOptions2);
}
function resolveConfiguredCloakBinaryPath(
  env: EnvReader,
  runtimeBinaryPath: string | undefined,
): string | undefined {
  if (runtimeBinaryPath !== undefined) return resolveFile(runtimeBinaryPath, 'binaryPath');
  const envBinaryPath = optionalEnvString(env, 'CLOAKBROWSER_BINARY_PATH');
  if (envBinaryPath === undefined) return undefined;
  return resolveFile(envBinaryPath, 'CLOAKBROWSER_BINARY_PATH');
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
  return source.paths.map((extensionPath, index) => {
    const message8 = `${source.label}[${index}]`;
    const resolveDirectoryOptions3 = {
      create: false,
      writable: false,
    } as const;
    return resolveDirectory(extensionPath, message8, resolveDirectoryOptions3);
  });
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
    const message9 = `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS must be a JSON object: ${formatErrorMessage(error)}`;
    throw new BridgeRuntimeConfigurationError(message9);
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
    const message10 = `${label} must be an object`;
    throw new BridgeRuntimeConfigurationError(message10);
  }
  const result: BridgeContextOptions = {};
  for (const key of Object.keys(value)) {
    if (!isBridgeContextOptionKey(key)) {
      const message11 = `${label}.${key} is not supported`;
      throw new BridgeRuntimeConfigurationError(message11);
    }
    const message12 = `${label}.${key}`;
    const propertyValue3 = bridgeContextOptionParsers[key](value[key], message12);
    const assignOptions = {
      [key]: propertyValue3,
    } as const;
    Object.assign(result, assignOptions);
  }
  return result;
}
function isBridgeContextOptionKey(key: string): key is keyof BridgeContextOptions {
  return Object.hasOwn(bridgeContextOptionParsers, key);
}
function resolveDirectory(
  value: string,
  label: string,
  options: {
    create: boolean;
    writable: boolean;
  },
): string {
  if (value.trim().length === 0) {
    const message13 = `${label} must be a non-empty path`;
    throw new BridgeRuntimeConfigurationError(message13);
  }
  const normalizeResult = path.normalize(value);
  const resolved = path.resolve(normalizeResult);
  if (options.create) {
    const mkdirSyncOptions2 = { recursive: true } as const;
    mkdirSync(resolved, mkdirSyncOptions2);
  }
  const statSyncOptions = { throwIfNoEntry: false } as const;
  const stats = statSync(resolved, statSyncOptions);
  if (!stats?.isDirectory()) {
    const message14 = `${label} must point to an existing directory: ${resolved}`;
    throw new BridgeRuntimeConfigurationError(message14);
  }
  try {
    const argumentValue4 = options.writable ? fsConstants.W_OK : fsConstants.R_OK;
    accessSync(resolved, argumentValue4);
  } catch {
    const access = options.writable ? 'writable' : 'readable';
    const message15 = `${label} must point to a ${access} directory: ${resolved}`;
    throw new BridgeRuntimeConfigurationError(message15);
  }
  return realpathDirectory(resolved);
}
function resolveFile(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    const message16 = `${label} must be a non-empty path`;
    throw new BridgeRuntimeConfigurationError(message16);
  }
  const normalizeResult2 = path.normalize(trimmed);
  const resolved = path.resolve(normalizeResult2);
  const statSyncOptions2 = { throwIfNoEntry: false } as const;
  const stats = statSync(resolved, statSyncOptions2);
  if (!stats?.isFile()) {
    const message17 = `${label} must point to an existing file: ${resolved}`;
    throw new BridgeRuntimeConfigurationError(message17);
  }
  try {
    accessSync(resolved, fsConstants.R_OK);
  } catch {
    const message18 = `${label} must point to a readable file: ${resolved}`;
    throw new BridgeRuntimeConfigurationError(message18);
  }
  try {
    accessSync(resolved, fsConstants.X_OK);
  } catch {
    const message19 = `${label} must point to an executable file: ${resolved}`;
    throw new BridgeRuntimeConfigurationError(message19);
  }
  try {
    const nativeResult = realpathSync.native(resolved);
    return path.normalize(nativeResult);
  } catch {
    const normalizeResult3 = path.normalize(resolved);
    return path.resolve(normalizeResult3);
  }
}
function realpathDirectory(directory: string): string {
  try {
    const nativeResult2 = realpathSync.native(directory);
    return path.normalize(nativeResult2);
  } catch {
    const normalizeResult4 = path.normalize(directory);
    return path.resolve(normalizeResult4);
  }
}
function acquireProfileLock(userDataDir: string): () => void {
  const key = profileLockKey(userDataDir);
  if (activeProfileLocks.has(key)) {
    const message20 = `User data directory is already active in this process: ${userDataDir}`;
    throw new BridgeRuntimeConfigurationError(message20);
  }
  const lockPath = path.join(userDataDir, profileLockFileName);
  createProfileLockFile(lockPath, userDataDir);
  activeProfileLocks.add(key);
  return () => {
    activeProfileLocks.delete(key);
    removeProfileLockFile(lockPath);
  };
}
function createProfileLockFile(lockPath: string, userDataDir: string): void {
  let fd: number | undefined;
  try {
    fd = openSync(lockPath, 'wx', 0o600);
    const currentFd = fd;
    const stringifyOptions = {
      pid: process.pid,
      createdAt: new Date().toISOString(),
      userDataDir,
    } as const;
    const templateValue = JSON.stringify(stringifyOptions, null, 2);
    const message21 = `${templateValue}\n`;
    writeFileSync(currentFd, message21);
  } catch (error) {
    if (isFileExistsError(error)) {
      const message22 = `Persistent profile is already active: ${userDataDir}${formatProfileLockDetails(lockPath)}`;
      throw new BridgeRuntimeConfigurationError(message22);
    }
    const message = error instanceof Error ? error.message : String(error);
    const message23 = `Could not create profile lock for ${userDataDir}: ${message}`;
    throw new BridgeRuntimeConfigurationError(message23);
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
function removeProfileLockFile(lockPath: string): void {
  try {
    unlinkSync(lockPath);
  } catch (error) {
    if (!isFileMissingError(error)) throw error;
  }
}
function formatProfileLockDetails(lockPath: string): string {
  try {
    const fileSyncResult = readFileSync(lockPath, 'utf8');
    const parsed = JSON.parse(fileSyncResult) as unknown;
    if (!isRecord(parsed)) return '';
    const pid = typeof parsed.pid === 'number' ? parsed.pid : undefined;
    const createdAt = typeof parsed.createdAt === 'string' ? parsed.createdAt : undefined;
    const details = [
      pid === undefined ? undefined : `pid=${pid}`,
      createdAt === undefined ? undefined : `createdAt=${createdAt}`,
    ].filter((item) => item !== undefined);
    return details.length > 0 ? ` (${details.join(', ')})` : '';
  } catch {
    return '';
  }
}
function isFileExistsError(error: unknown): boolean {
  return isNodeError(error) && error.code === systemErrorCodes.EEXIST;
}
function isFileMissingError(error: unknown): boolean {
  return isNodeError(error) && error.code === systemErrorCodes.ENOENT;
}
function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
function profileLockKey(userDataDir: string): string {
  const normalized = path.normalize(userDataDir);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}
function parseViewport(value: unknown, label: string): BridgeContextOptions['viewport'] {
  if (value === null) return null;
  if (!isRecord(value)) {
    const message24 = `${label} must be an object or null`;
    throw new BridgeRuntimeConfigurationError(message24);
  }
  const message25 = `${label}.width`;
  const positiveIntegerResult = readPositiveInteger(value.width, message25);
  const message26 = `${label}.height`;
  const positiveIntegerResult2 = readPositiveInteger(value.height, message26);
  return {
    width: positiveIntegerResult,
    height: positiveIntegerResult2,
  };
}
function parseColorScheme(value: unknown, label: string): BridgeContextOptions['colorScheme'] {
  if (value === 'dark' || value === 'light' || value === 'no-preference') return value;
  const message27 = `${label} must be "dark", "light", or "no-preference"`;
  throw new BridgeRuntimeConfigurationError(message27);
}
function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    const message28 = `${label} must be a string array`;
    throw new BridgeRuntimeConfigurationError(message28);
  }
  return value.map((item, index) => {
    const message29 = `${label}[${index}]`;
    return readNonEmptyString(item, message29);
  });
}
function parseGeolocation(value: unknown, label: string): NonNullable<BridgeContextOptions['geolocation']> {
  if (!isRecord(value)) {
    const message30 = `${label} must be an object`;
    throw new BridgeRuntimeConfigurationError(message30);
  }
  const message31 = `${label}.longitude`;
  const longitude = readFiniteNumber(value.longitude, message31);
  const message32 = `${label}.latitude`;
  const latitude = readFiniteNumber(value.latitude, message32);
  if (longitude < -180 || longitude > 180) {
    const message33 = `${label}.longitude must be between -180 and 180`;
    throw new BridgeRuntimeConfigurationError(message33);
  }
  if (latitude < -90 || latitude > 90) {
    const message34 = `${label}.latitude must be between -90 and 90`;
    throw new BridgeRuntimeConfigurationError(message34);
  }
  const accuracy =
    value.accuracy === undefined
      ? undefined
      : (() => {
          const message35 = `${label}.accuracy`;
          return readNonNegativeNumber(value.accuracy, message35);
        })();
  return accuracy === undefined ? { longitude, latitude } : { longitude, latitude, accuracy };
}
function parseStringRecord(value: unknown, label: string): Record<string, string> {
  if (!isRecord(value)) {
    const message36 = `${label} must be an object`;
    throw new BridgeRuntimeConfigurationError(message36);
  }
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    const message37 = `${label}.${key}`;
    result[key] = readString(item, message37);
  }
  return result;
}
function parseHttpCredentials(
  value: unknown,
  label: string,
): NonNullable<BridgeContextOptions['httpCredentials']> {
  if (!isRecord(value)) {
    const message38 = `${label} must be an object`;
    throw new BridgeRuntimeConfigurationError(message38);
  }
  const message39 = `${label}.username`;
  const nonEmptyStringResult = readNonEmptyString(value.username, message39);
  const message40 = `${label}.password`;
  const stringResult = readString(value.password, message40);
  const result: NonNullable<BridgeContextOptions['httpCredentials']> = {
    username: nonEmptyStringResult,
    password: stringResult,
  };
  if (value.origin !== undefined) {
    const message41 = `${label}.origin`;
    result.origin = readNonEmptyString(value.origin, message41);
  }
  if (value.send !== undefined) {
    if (value.send !== 'always' && value.send !== 'unauthorized') {
      const message42 = `${label}.send must be "always" or "unauthorized"`;
      throw new BridgeRuntimeConfigurationError(message42);
    }
    result.send = value.send;
  }
  return result;
}
function readString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    const message43 = `${label} must be a string`;
    throw new BridgeRuntimeConfigurationError(message43);
  }
  return value;
}
function readNonEmptyString(value: unknown, label: string): string {
  const result = readString(value, label).trim();
  if (result.length === 0) {
    const message44 = `${label} must be a non-empty string`;
    throw new BridgeRuntimeConfigurationError(message44);
  }
  return result;
}
function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    const message45 = `${label} must be a boolean`;
    throw new BridgeRuntimeConfigurationError(message45);
  }
  return value;
}
function readPositiveInteger(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (!Number.isInteger(result) || result <= 0) {
    const message46 = `${label} must be a positive integer`;
    throw new BridgeRuntimeConfigurationError(message46);
  }
  return result;
}
function readPositiveNumber(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (result <= 0) {
    const message47 = `${label} must be a positive number`;
    throw new BridgeRuntimeConfigurationError(message47);
  }
  return result;
}
function readNonNegativeNumber(value: unknown, label: string): number {
  const result = readFiniteNumber(value, label);
  if (result < 0) {
    const message48 = `${label} must be a non-negative number`;
    throw new BridgeRuntimeConfigurationError(message48);
  }
  return result;
}
function readFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    const message49 = `${label} must be a finite number`;
    throw new BridgeRuntimeConfigurationError(message49);
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
  const message50 = `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET must be "default" or "careful", got "${value}"`;
  throw new Error(message50);
}
function isHumanPreset(value: string): value is HumanPreset {
  return humanPresets.includes(value as HumanPreset);
}
function parseReleaseChannel(value: string): ReleaseChannel {
  if (isReleaseChannel(value)) return value;
  const message51 = `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL must be "stable" or "preview", got "${value}"`;
  throw new Error(message51);
}
function resolveReleaseChannel(env: EnvReader, explicit: ReleaseChannel | undefined): ReleaseChannel {
  return (
    explicit ??
    (() => {
      const envStringResult3 = envString(env, 'CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL', 'stable');
      return parseReleaseChannel(envStringResult3);
    })()
  );
}
function isReleaseChannel(value: string): value is ReleaseChannel {
  return releaseChannels.includes(value as ReleaseChannel);
}
function resolveHumanizeInitPagePath(): string {
  const uRL = new URL('../runtime/humanize-init-page.cjs', import.meta.url);
  return fileURLToPath(uRL);
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
    const ensureProxyServerSchemeResult = ensureProxyServerScheme(server);
    const url = new URL(ensureProxyServerSchemeResult);
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
  return args.filter(isCloakGeneratedArg);
}
const values2: Iterable<string> | null | undefined = ['--start-maximized'];
const exactCloakGeneratedArgs = new Set(values2);
const prefixedCloakGeneratedArgs = [
  '--fingerprint-timezone=',
  `${fingerprintWebrtcIpFlag}=`,
  '--lang=',
  '--fingerprint-locale=',
  '--proxy-server=',
  '--proxy-bypass-list=',
  '--load-extension=',
  '--disable-extensions-except=',
];
function isCloakGeneratedArg(arg: string): boolean {
  return (
    exactCloakGeneratedArgs.has(arg) || prefixedCloakGeneratedArgs.some((prefix) => arg.startsWith(prefix))
  );
}
function mergeLaunchArgs(args: readonly string[], replacements: readonly string[]): string[] {
  const mappedValues = replacements.map((replacement): [string, string] => [
    launchArgKey(replacement),
    replacement,
  ]);
  const replacementByKey = new Map(mappedValues);
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
function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
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
  humanPreset = (() => {
    const envStringResult4 = envString(env, 'CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET', 'default');
    return parseHumanPreset(envStringResult4);
  })(),
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string' && shouldInheritChildEnv(key)) result[key] = value;
  }
  result.PLAYWRIGHT_MCP_HEADLESS = String(headless);
  result.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET = humanPreset;
  result.PLAYWRIGHT_MCP_OUTPUT_DIR = outputDir;
  const envIntResult = envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_ACTION', 5000);
  result.PLAYWRIGHT_MCP_TIMEOUT_ACTION = String(envIntResult);
  const envIntResult2 = envInt(env, 'PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION', 60000);
  result.PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION = String(envIntResult2);
  result.CLOAKBROWSER_AUTO_UPDATE = envString(env, 'CLOAKBROWSER_AUTO_UPDATE', 'false');
  const envProxyServer = optionalEnvString(env, 'PLAYWRIGHT_MCP_PROXY_SERVER');
  if (runtimeProxy === undefined && envProxyServer !== undefined && hasProxyCredentials(envProxyServer)) {
    removeProxyEnv(result);
  }
  if (runtimeProxy) applyRuntimeProxyEnv(result, runtimeProxy);
  return result;
}
function readCodegenLanguage(env: EnvReader): CodegenLanguage | undefined {
  const value = env.PLAYWRIGHT_MCP_CODEGEN;
  if (value === undefined) return undefined;
  if (codegenLanguages.includes(value as CodegenLanguage)) return value as CodegenLanguage;
  const message52 = `PLAYWRIGHT_MCP_CODEGEN must be one of "typescript", "python", "java", "csharp", or "none", got "${value}"`;
  throw new BridgeRuntimeConfigurationError(message52);
}
function readSnapshotBoxes(env: EnvReader): boolean | undefined {
  const value = env.PLAYWRIGHT_MCP_SNAPSHOT_BOXES;
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const message53 = `PLAYWRIGHT_MCP_SNAPSHOT_BOXES must be "true" or "false", got "${value}"`;
  throw new BridgeRuntimeConfigurationError(message53);
}
function shouldInheritChildEnv(key: string): boolean {
  return (
    inheritedChildEnvNames.has(key) || inheritedChildEnvPrefixes.some((prefix) => key.startsWith(prefix))
  );
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
let cloakLaunchOptionsQueue: Promise<void> = Promise.resolve();
function withCloakBinaryPath<T>(cloakBinaryPath: string, fn: () => Promise<T>): Promise<T> {
  // CloakBrowser reads this process-wide override during asynchronous launch option generation.
  const result = cloakLaunchOptionsQueue.then(async () => {
    const previous = process.env.CLOAKBROWSER_BINARY_PATH;
    process.env.CLOAKBROWSER_BINARY_PATH = cloakBinaryPath;
    try {
      return await fn();
    } finally {
      if (previous === undefined) delete process.env.CLOAKBROWSER_BINARY_PATH;
      else process.env.CLOAKBROWSER_BINARY_PATH = previous;
    }
  });
  cloakLaunchOptionsQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
function parseBrowserEngine(value: string): BrowserEngine {
  if (value === 'cloak' || value === 'playwright') return value;
  const message54 = `PLAYWRIGHT_MCP_BROWSER_ENGINE must be "cloak" or "playwright", got "${value}"`;
  throw new Error(message54);
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
