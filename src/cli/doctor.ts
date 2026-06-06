import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';
import { getCurrentCloakBinaryInfo } from '../bridge/config.js';
import { resolvePlaywrightMcpCliPath } from '../bridge/paths.js';
import { PLAYWRIGHT_MCP_PACKAGE, PLAYWRIGHT_MCP_VERSION, PROJECT_METADATA } from '../project/metadata.js';

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
  };
  cloakbrowser: ReturnType<typeof getCurrentCloakBinaryInfo> | null;
  checks: DoctorCheck[];
}

interface PackageMetadata {
  engines?: {
    node?: string;
  };
}

const packageMetadata = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as PackageMetadata;

export function createDoctorReport(): DoctorReport {
  const checks: DoctorCheck[] = [];
  const nodeEngine = packageMetadata.engines?.node ?? 'unknown';
  const nodeSupported = isNodeVersionSupported(process.versions.node, nodeEngine);
  checks.push({
    name: 'node',
    status: nodeSupported ? 'ok' : 'error',
    message: nodeSupported
      ? `Node.js ${process.version} satisfies ${nodeEngine}`
      : `Node.js ${process.version} does not satisfy ${nodeEngine}`,
    details: {
      version: process.version,
      required: nodeEngine,
    },
  });

  let playwrightMcpCliPath: string | null = null;
  try {
    playwrightMcpCliPath = resolvePlaywrightMcpCliPath();
    checks.push({
      name: 'playwright-mcp-cli',
      status: existsSync(playwrightMcpCliPath) ? 'ok' : 'error',
      message: existsSync(playwrightMcpCliPath)
        ? `Resolved ${PLAYWRIGHT_MCP_PACKAGE} CLI`
        : `Resolved ${PLAYWRIGHT_MCP_PACKAGE} CLI path does not exist`,
      details: {
        package: PLAYWRIGHT_MCP_PACKAGE,
        version: PLAYWRIGHT_MCP_VERSION,
        cliPath: playwrightMcpCliPath,
      },
    });
  } catch (error) {
    checks.push({
      name: 'playwright-mcp-cli',
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to resolve Playwright MCP CLI',
    });
  }

  let cloakbrowser: ReturnType<typeof getCurrentCloakBinaryInfo> | null = null;
  try {
    cloakbrowser = getCurrentCloakBinaryInfo();
    checks.push({
      name: 'cloakbrowser-binary',
      status: cloakbrowser.installed ? 'ok' : 'warning',
      message: cloakbrowser.installed
        ? 'CloakBrowser binary is installed'
        : 'CloakBrowser binary is not installed; the first browser action may download it',
      details: {
        version: cloakbrowser.version,
        platform: cloakbrowser.platform,
        binaryPath: cloakbrowser.binaryPath,
        cacheDir: cloakbrowser.cacheDir,
        installed: cloakbrowser.installed,
      },
    });
  } catch (error) {
    checks.push({
      name: 'cloakbrowser-binary',
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to read CloakBrowser binary metadata',
    });
  }

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
      cliPath: playwrightMcpCliPath,
    },
    cloakbrowser,
    checks,
  };
}

export function renderDoctorReport(report: DoctorReport): string {
  return [
    'CloakBrowser MCP doctor',
    `Status: ${report.status}`,
    `Project: ${report.project.packageName} ${report.project.version} (${report.project.mcpName})`,
    `Node.js: ${report.node.version} (requires ${report.project.nodeEngine})`,
    `Upstream: ${report.upstream.package} ${report.upstream.version}`,
    `Upstream CLI: ${report.upstream.cliPath ?? 'unresolved'}`,
    `CloakBrowser: ${formatCloakbrowserSummary(report)}`,
    '',
    'Checks:',
    ...report.checks.map((check) => `- [${check.status}] ${check.name}: ${check.message}`),
    '',
  ].join('\n');
}

function formatCloakbrowserSummary(report: DoctorReport): string {
  if (!report.cloakbrowser) return 'unavailable';
  const installed = report.cloakbrowser.installed ? 'installed' : 'not installed';
  return `${report.cloakbrowser.version} (${report.cloakbrowser.platform}, ${installed})`;
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
