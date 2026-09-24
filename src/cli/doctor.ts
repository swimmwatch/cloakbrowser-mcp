import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { getCurrentCloakBinaryInfo } from '#src/bridge/config';
import { resolvePlaywrightCoreBundlePath, resolvePlaywrightMcpCliPath } from '#src/bridge/paths';
import { PLAYWRIGHT_MCP_PACKAGE, PLAYWRIGHT_MCP_VERSION, PROJECT_METADATA } from '#src/project/metadata';

export type DoctorStatus = 'ok' | 'warning' | 'error';

export interface DoctorCheck {
  name: string;
  status: DoctorStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorReport {
  status: DoctorStatus;
  project: {
    packageName: string;
    mcpName: string;
    version: string;
    nodeEngine: string;
  };
  node: {
    version: string;
    supported: boolean;
  };
  upstream: {
    package: string;
    version: string;
    cliPath: string | null;
    resolvedVersion: string | null;
    packagePath: string | null;
    playwright: DoctorPackageResolution;
    playwrightCore: DoctorPackageResolution & {
      bundlePath: string | null;
    };
  };
  cloakbrowser: ReturnType<typeof getCurrentCloakBinaryInfo> | null;
  checks: DoctorCheck[];
}

export interface DoctorPackageResolution {
  version: string | null;
  packagePath: string | null;
}

interface PackageMetadata {
  engines?: {
    node?: string;
  };
}

interface PlaywrightCliInspection {
  cliPath: string | null;
  exists: boolean;
  mcp: DoctorPackageResolution;
  playwright: DoctorPackageResolution;
  playwrightCore: DoctorPackageResolution;
  check: DoctorCheck;
}

interface PlaywrightRuntimeInspection {
  bundlePath: string | null;
  check: DoctorCheck;
}

interface CloakbrowserInspection {
  info: ReturnType<typeof getCurrentCloakBinaryInfo> | null;
  check: DoctorCheck;
}

const packageMetadata = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as PackageMetadata;

const doctorReportTemplate = `CloakBrowser MCP doctor
Status: {{status}}
Project: {{project}}
Node.js: {{node}}
Upstream: {{upstream}}
Upstream CLI: {{upstreamCli}}
Playwright: {{playwright}}
Playwright Core: {{playwrightCore}}
Core bundle: {{coreBundle}}
CloakBrowser: {{cloakbrowser}}

Checks:
{{checks}}
`;

type DoctorReportTemplateValues = Record<
  | 'status'
  | 'project'
  | 'node'
  | 'upstream'
  | 'upstreamCli'
  | 'playwright'
  | 'playwrightCore'
  | 'coreBundle'
  | 'cloakbrowser'
  | 'checks',
  string
>;

/**
 * Collects environment, upstream CLI, and CloakBrowser binary diagnostics for the doctor command.
 */
export function createDoctorReport(): DoctorReport {
  const nodeEngine = packageMetadata.engines?.node ?? 'unknown';
  const nodeSupported = isNodeVersionSupported(process.versions.node, nodeEngine);
  const playwrightCli = inspectPlaywrightCli();
  const playwrightRuntime = inspectPlaywrightRuntime(playwrightCli);
  const cloakbrowser = inspectCloakbrowser();
  const checks = [
    createNodeCheck(nodeEngine, nodeSupported),
    playwrightCli.check,
    playwrightRuntime.check,
    cloakbrowser.check,
  ];

  return {
    status: summarizeStatus(checks),
    project: {
      packageName: PROJECT_METADATA.packageName,
      mcpName: PROJECT_METADATA.mcpName,
      version: PROJECT_METADATA.version,
      nodeEngine,
    },
    node: {
      version: process.version,
      supported: nodeSupported,
    },
    upstream: {
      package: PLAYWRIGHT_MCP_PACKAGE,
      version: PLAYWRIGHT_MCP_VERSION,
      cliPath: playwrightCli.cliPath,
      resolvedVersion: playwrightCli.mcp.version,
      packagePath: playwrightCli.mcp.packagePath,
      playwright: playwrightCli.playwright,
      playwrightCore: {
        ...playwrightCli.playwrightCore,
        bundlePath: playwrightRuntime.bundlePath,
      },
    },
    cloakbrowser: cloakbrowser.info,
    checks,
  };
}

function createNodeCheck(nodeEngine: string, nodeSupported: boolean): DoctorCheck {
  return {
    name: 'node',
    status: nodeSupported ? 'ok' : 'error',
    message: nodeSupported
      ? `Node.js ${process.version} satisfies ${nodeEngine}`
      : `Node.js ${process.version} does not satisfy ${nodeEngine}`,
    details: {
      version: process.version,
      required: nodeEngine,
    },
  };
}

function inspectPlaywrightCli(): PlaywrightCliInspection {
  let cliPath: string | null = null;

  try {
    cliPath = resolvePlaywrightMcpCliPath();
    const cliExists = existsSync(cliPath);
    if (!cliExists) {
      return {
        cliPath,
        exists: false,
        mcp: emptyPackageResolution(),
        playwright: emptyPackageResolution(),
        playwrightCore: emptyPackageResolution(),
        check: createPlaywrightCliCheck(cliPath, false, emptyPackageResolution()),
      };
    }

    const canonicalCliPath = realpathSync.native(cliPath);
    const mcp = findOwningPackage(canonicalCliPath, PLAYWRIGHT_MCP_PACKAGE);
    const playwright = resolvePackageFrom(canonicalCliPath, 'playwright');
    const playwrightCore = resolvePackageFrom(canonicalCliPath, 'playwright-core');

    return {
      cliPath,
      exists: true,
      mcp,
      playwright,
      playwrightCore,
      check: createPlaywrightCliCheck(cliPath, cliExists, mcp),
    };
  } catch (error) {
    return {
      cliPath,
      exists: false,
      mcp: emptyPackageResolution(),
      playwright: emptyPackageResolution(),
      playwrightCore: emptyPackageResolution(),
      check: {
        name: 'playwright-mcp-cli',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to resolve Playwright MCP CLI',
      },
    };
  }
}

function createPlaywrightCliCheck(
  cliPath: string,
  cliExists: boolean,
  mcp: DoctorPackageResolution,
): DoctorCheck {
  const metadataResolved = mcp.version !== null;
  return {
    name: 'playwright-mcp-cli',
    status: !cliExists ? 'error' : metadataResolved ? 'ok' : 'warning',
    message: !cliExists
      ? `Resolved ${PLAYWRIGHT_MCP_PACKAGE} CLI path does not exist`
      : metadataResolved
        ? `Resolved ${PLAYWRIGHT_MCP_PACKAGE} CLI and package metadata`
        : `Resolved ${PLAYWRIGHT_MCP_PACKAGE} CLI but package metadata is unavailable`,
    details: {
      package: PLAYWRIGHT_MCP_PACKAGE,
      version: PLAYWRIGHT_MCP_VERSION,
      resolvedVersion: mcp.version,
      packagePath: mcp.packagePath,
      cliPath,
    },
  };
}

function inspectPlaywrightRuntime(cli: PlaywrightCliInspection): PlaywrightRuntimeInspection {
  let bundlePath: string | null = null;

  try {
    bundlePath = resolvePlaywrightCoreBundlePath();
    const resolvedBundlePath = resolveExistingModulePath(bundlePath);
    if (!resolvedBundlePath) {
      return {
        bundlePath,
        check: createMissingBundleCheck(bundlePath),
      };
    }

    const bundlePackage = findOwningPackage(realpathSync.native(resolvedBundlePath), 'playwright-core');
    return {
      bundlePath,
      check: createPlaywrightRuntimeCheck(cli, bundlePath, bundlePackage),
    };
  } catch (error) {
    return {
      bundlePath,
      check: {
        name: 'playwright-runtime',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to resolve Playwright runtime dependencies',
      },
    };
  }
}

function createMissingBundleCheck(bundlePath: string): DoctorCheck {
  return {
    name: 'playwright-runtime',
    status: 'error',
    message: process.env.CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH
      ? 'Configured Playwright core bundle path does not exist'
      : 'Resolved Playwright core bundle path does not exist',
    details: {
      coreBundlePath: bundlePath,
    },
  };
}

function createPlaywrightRuntimeCheck(
  cli: PlaywrightCliInspection,
  bundlePath: string,
  bundlePackage: DoctorPackageResolution,
): DoctorCheck {
  const details = {
    playwright: cli.playwright,
    playwrightCore: cli.playwrightCore,
    coreBundlePath: bundlePath,
    coreBundlePackage: bundlePackage,
  };

  if (!cli.exists) {
    return {
      name: 'playwright-runtime',
      status: 'error',
      message: 'Playwright runtime dependencies cannot be inspected without the upstream CLI',
      details,
    };
  }

  if (
    cli.playwrightCore.version !== null &&
    bundlePackage.version !== null &&
    cli.playwrightCore.version !== bundlePackage.version
  ) {
    return {
      name: 'playwright-runtime',
      status: 'warning',
      message: `Playwright core ${cli.playwrightCore.version} does not match core bundle ${bundlePackage.version}`,
      details,
    };
  }

  if (
    cli.playwright.version === null ||
    cli.playwrightCore.version === null ||
    bundlePackage.version === null
  ) {
    return {
      name: 'playwright-runtime',
      status: 'warning',
      message: 'Playwright runtime metadata is incomplete',
      details,
    };
  }

  return {
    name: 'playwright-runtime',
    status: 'ok',
    message: 'Resolved Playwright runtime dependencies and core bundle',
    details,
  };
}

function inspectCloakbrowser(): CloakbrowserInspection {
  try {
    const info = getCurrentCloakBinaryInfo();
    return {
      info,
      check: {
        name: 'cloakbrowser-binary',
        status: info.installed ? 'ok' : 'warning',
        message: info.installed
          ? 'CloakBrowser binary is installed'
          : 'CloakBrowser binary is not installed; the first browser action may download it',
        details: {
          version: info.version,
          platform: info.platform,
          binaryPath: info.binaryPath,
          cacheDir: info.cacheDir,
          installed: info.installed,
        },
      },
    };
  } catch (error) {
    return {
      info: null,
      check: {
        name: 'cloakbrowser-binary',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to read CloakBrowser binary metadata',
      },
    };
  }
}

export function renderDoctorReport(report: DoctorReport): string {
  return formatDoctorReportTemplate({
    status: report.status,
    project: `${report.project.packageName} ${report.project.version} (${report.project.mcpName})`,
    node: `${report.node.version} (requires ${report.project.nodeEngine})`,
    upstream: `${report.upstream.package} ${report.upstream.version} (resolved ${report.upstream.resolvedVersion ?? 'unknown'})`,
    upstreamCli: report.upstream.cliPath ?? 'unresolved',
    playwright: formatPackageResolution(report.upstream.playwright),
    playwrightCore: formatPackageResolution(report.upstream.playwrightCore),
    coreBundle: report.upstream.playwrightCore.bundlePath ?? 'unresolved',
    cloakbrowser: formatCloakbrowserSummary(report),
    checks: report.checks.map((check) => `- [${check.status}] ${check.name}: ${check.message}`).join('\n'),
  });
}

function emptyPackageResolution(): DoctorPackageResolution {
  return { version: null, packagePath: null };
}

function resolvePackageFrom(fromPath: string, packageName: string): DoctorPackageResolution {
  try {
    const packageJsonPath = createRequire(path.resolve(fromPath)).resolve(`${packageName}/package.json`);
    return readPackageResolution(packageJsonPath, packageName);
  } catch {
    return emptyPackageResolution();
  }
}

function findOwningPackage(fromPath: string, packageName: string): DoctorPackageResolution {
  let currentDirectory = path.dirname(path.resolve(fromPath));

  while (true) {
    const packageJsonPath = path.join(currentDirectory, 'package.json');
    if (existsSync(packageJsonPath)) {
      const resolution = readPackageResolution(packageJsonPath, packageName);
      if (resolution.version !== null) return resolution;
    }

    const parentDirectory = path.dirname(currentDirectory);
    if (parentDirectory === currentDirectory) return emptyPackageResolution();
    currentDirectory = parentDirectory;
  }
}

function readPackageResolution(packageJsonPath: string, packageName: string): DoctorPackageResolution {
  try {
    const metadata = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      name?: unknown;
      version?: unknown;
    };
    if (metadata.name !== packageName || typeof metadata.version !== 'string') {
      return emptyPackageResolution();
    }
    return {
      version: metadata.version,
      packagePath: path.dirname(packageJsonPath),
    };
  } catch {
    return emptyPackageResolution();
  }
}

function resolveExistingModulePath(modulePath: string): string | null {
  if (existsSync(modulePath)) return modulePath;
  if (existsSync(`${modulePath}.js`)) return `${modulePath}.js`;
  return null;
}

function formatPackageResolution(resolution: DoctorPackageResolution): string {
  if (!resolution.version && !resolution.packagePath) return 'unresolved';
  return `${resolution.version ?? 'unknown'} (${resolution.packagePath ?? 'path unavailable'})`;
}

function formatCloakbrowserSummary(report: DoctorReport): string {
  if (!report.cloakbrowser) return 'unavailable';
  const installed = report.cloakbrowser.installed ? 'installed' : 'not installed';
  return `${report.cloakbrowser.version} (${report.cloakbrowser.platform}, ${installed})`;
}

function formatDoctorReportTemplate(values: DoctorReportTemplateValues): string {
  let output = doctorReportTemplate;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function summarizeStatus(checks: readonly DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === 'error')) return 'error';
  if (checks.some((check) => check.status === 'warning')) return 'warning';
  return 'ok';
}

function isNodeVersionSupported(version: string, range: string): boolean {
  const minimum = parseMinimumNodeVersion(range);
  if (!minimum) return true;
  return compareVersions(parseVersion(version), minimum) >= 0;
}

function parseMinimumNodeVersion(range: string): [number, number, number] | undefined {
  const match = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range);
  if (!match) return undefined;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

function parseVersion(version: string): [number, number, number] {
  const [major = '0', minor = '0', patch = '0'] = version.replace(/^v/, '').split('.');
  return [Number(major), Number(minor), Number(patch)];
}

function compareVersions(actual: [number, number, number], expected: [number, number, number]): number {
  for (const index of [0, 1, 2] as const) {
    const difference = actual[index] - expected[index];
    if (difference !== 0) return difference;
  }
  return 0;
}
