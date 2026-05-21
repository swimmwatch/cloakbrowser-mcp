import type { CapabilityKey } from './schema.js';

export interface CoreConfigOption {
  key:
    | 'headless'
    | 'outputDir'
    | 'defaultTimeoutMs'
    | 'navigationTimeoutMs'
    | 'maxPages'
    | 'maxContexts'
    | 'allowedOrigins'
    | 'blockedOrigins'
    | 'userDataDir'
    | 'browserExecutablePath'
    | 'logLevel';
  cliFlag: string;
  envVar: string;
  description: string;
  defaultLabel?: string;
}

export const coreConfigOptions = [
  {
    key: 'headless',
    cliFlag: '--headless / --no-headless',
    envVar: 'CLOAKBROWSER_MCP_HEADLESS',
    description: 'Run the browser with no visible window.',
  },
  {
    key: 'outputDir',
    cliFlag: '-o, --output-dir <path>',
    envVar: 'CLOAKBROWSER_MCP_OUTPUT_DIR',
    description:
      'Directory under which all artifacts (screenshots, etc.) are written. Path traversal and absolute paths in tool arguments are rejected.',
  },
  {
    key: 'defaultTimeoutMs',
    cliFlag: '--default-timeout-ms <n>',
    envVar: 'CLOAKBROWSER_MCP_DEFAULT_TIMEOUT_MS',
    description: 'Default per-action timeout.',
  },
  {
    key: 'navigationTimeoutMs',
    cliFlag: '--navigation-timeout-ms <n>',
    envVar: 'CLOAKBROWSER_MCP_NAVIGATION_TIMEOUT_MS',
    description: 'Navigation timeout.',
  },
  {
    key: 'maxPages',
    cliFlag: '--max-pages <n>',
    envVar: 'CLOAKBROWSER_MCP_MAX_PAGES',
    description: 'Maximum concurrent pages. Hard cap to prevent runaway resource use.',
  },
  {
    key: 'maxContexts',
    cliFlag: '--max-contexts <n>',
    envVar: 'CLOAKBROWSER_MCP_MAX_CONTEXTS',
    description: 'Maximum browser contexts.',
  },
  {
    key: 'allowedOrigins',
    cliFlag: '--allowed-origins <list>',
    envVar: 'CLOAKBROWSER_MCP_ALLOWED_ORIGINS',
    description:
      'Comma-separated host suffixes. When set, navigation is restricted to these hosts. `*` allows all.',
    defaultLabel: '_unset_ (all)',
  },
  {
    key: 'blockedOrigins',
    cliFlag: '--blocked-origins <list>',
    envVar: 'CLOAKBROWSER_MCP_BLOCKED_ORIGINS',
    description: 'Comma-separated host suffixes. Always denied; overrides `allowedOrigins`.',
  },
  {
    key: 'userDataDir',
    cliFlag: '--user-data-dir <path>',
    envVar: 'CLOAKBROWSER_MCP_USER_DATA_DIR',
    description:
      'Persistent user-data directory (requires CloakBrowser support; reserved for `allowPersistentProfiles`).',
    defaultLabel: '_unset_',
  },
  {
    key: 'browserExecutablePath',
    cliFlag: '--browser-executable-path <path>',
    envVar: 'CLOAKBROWSER_MCP_BROWSER_EXECUTABLE_PATH',
    description: 'Override the bundled CloakBrowser executable.',
    defaultLabel: '_unset_',
  },
  {
    key: 'logLevel',
    cliFlag: '-l, --log-level <level>',
    envVar: 'CLOAKBROWSER_MCP_LOG_LEVEL',
    description: 'One of `silent`, `error`, `warn`, `info`, `debug`. Always written to `stderr`.',
  },
] as const satisfies readonly CoreConfigOption[];

export type CoreConfigKey = (typeof coreConfigOptions)[number]['key'];

export const coreConfigEnvMap = coreConfigOptions.map((option) => [option.envVar, option.key] as const);

export interface CapabilityFlagOption {
  key: CapabilityKey;
  fallbackToolsLabel?: string;
  securityImplication: string;
}

export const capabilityFlagOptions = [
  {
    key: 'allowScreenshots',
    securityImplication: 'Writes image files into `outputDir`.',
  },
  {
    key: 'allowPdf',
    securityImplication: 'Writes PDF files into `outputDir`.',
  },
  {
    key: 'allowUploads',
    fallbackToolsLabel: '_none yet_',
    securityImplication:
      'Reserved for stricter upload/drop policy variants; Playwright-compatible `browser_file_upload` and `browser_drop` are registered by default.',
  },
  {
    key: 'allowFileAccess',
    fallbackToolsLabel: '`file:` navigation',
    securityImplication:
      '`file:` navigation. Playwright-compatible `browser_run_code_unsafe` and file-drop/upload paths are available by default.',
  },
  {
    key: 'allowStorageMutation',
    securityImplication: 'Cookie / localStorage / sessionStorage writes; can affect signed-in state.',
  },
  {
    key: 'allowNetworkInspection',
    fallbackToolsLabel: '_none yet_',
    securityImplication:
      'Reserved for stricter policy variants; Playwright-compatible network inspection tools are registered by default.',
  },
  {
    key: 'allowNetworkInterception',
    securityImplication: 'Modify or block requests; high-impact.',
  },
  {
    key: 'allowPersistentProfiles',
    fallbackToolsLabel: '`userDataDir` config option',
    securityImplication: 'Persistent user-data dirs across sessions.',
  },
  {
    key: 'allowDevtoolsExperimental',
    securityImplication: 'Tracing / video / HAR artifact capture.',
  },
  {
    key: 'allowCoordinateInput',
    securityImplication: 'Coordinate-based mouse input; bypasses accessibility-tree-targeted interaction.',
  },
  {
    key: 'allowBinaryInstall',
    securityImplication: 'Tools that download browser binaries.',
  },
] as const satisfies readonly CapabilityFlagOption[];
