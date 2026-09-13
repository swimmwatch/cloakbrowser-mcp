import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDoctorReport, renderDoctorReport } from '@/cli/doctor.js';
import { fakeCloakBinaryPath } from '@tests/helpers/paths.js';

describe('CLI doctor diagnostics', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    vi.doUnmock('@/bridge/config.js');
    vi.doUnmock('@/bridge/paths.js');
    vi.unstubAllEnvs();
    vi.resetModules();
    for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  it('returns a stable diagnostics report without starting the bridge', () => {
    const report = createDoctorReport();

    expect(['ok', 'warning']).toContain(report.status);
    expect(report.project).toMatchObject({
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
      nodeEngine: '^22.13.0 || >=24.0.0',
    });
    expect(report.node.supported).toBe(true);
    expect(report.upstream.package).toBe('@playwright/mcp');
    expect(report.upstream.cliPath?.replaceAll('\\', '/')).toEqual(
      expect.stringContaining('@playwright/mcp'),
    );
    expect(report.upstream.resolvedVersion).toBe('0.0.80');
    expect(report.upstream.playwright.version).toBe('1.63.0-alpha-2026-08-31');
    expect(report.upstream.playwrightCore).toMatchObject({
      version: '1.63.0-alpha-2026-08-31',
      bundlePath: expect.stringContaining('coreBundle'),
    });
    expect(report.checks.map((check) => check.name)).toEqual([
      'node',
      'playwright-mcp-cli',
      'playwright-runtime',
      'cloakbrowser-binary',
    ]);
  });

  it('renders human-readable diagnostics', () => {
    const output = renderDoctorReport(createDoctorReport());

    expect(output).toContain('CloakBrowser MCP doctor');
    expect(output).toContain('Checks:');
    expect(output).toContain('playwright-mcp-cli');
    expect(output).toContain('Playwright Core: 1.63.0-alpha-2026-08-31');
    expect(output).toContain('Core bundle:');
  });

  it('reports package metadata from an external Playwright MCP tree', async () => {
    const fixture = createExternalPlaywrightFixture(tempRoots);
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => fixture.cliPath,
      resolvePlaywrightCoreBundlePath: () => fixture.coreBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.upstream).toMatchObject({
      resolvedVersion: '9.9.9',
      packagePath: fixture.mcpPackagePath,
      playwright: {
        version: '1.2.3',
        packagePath: fixture.playwrightPackagePath,
      },
      playwrightCore: {
        version: '1.2.3',
        packagePath: fixture.playwrightCorePackagePath,
        bundlePath: fixture.coreBundlePath,
      },
    });
    expect(report.checks.find((check) => check.name === 'playwright-runtime')).toMatchObject({
      status: 'ok',
    });
  });

  it('keeps effective paths while resolving package metadata through a directory link', async () => {
    const fixture = createExternalPlaywrightFixture(tempRoots);
    const linkedRoot = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doctor-link-'));
    tempRoots.push(linkedRoot);
    rmSync(linkedRoot, { recursive: true, force: true });
    symlinkSync(fixture.root, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');

    const linkedCliPath = path.join(linkedRoot, 'node_modules', '@playwright', 'mcp', 'cli.js');
    const linkedCoreBundlePath = path.join(
      linkedRoot,
      'node_modules',
      'playwright-core',
      'lib',
      'coreBundle',
    );
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => linkedCliPath,
      resolvePlaywrightCoreBundlePath: () => linkedCoreBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.upstream).toMatchObject({
      cliPath: linkedCliPath,
      resolvedVersion: '9.9.9',
      packagePath: realpathSync.native(fixture.mcpPackagePath),
      playwright: {
        version: '1.2.3',
        packagePath: realpathSync.native(fixture.playwrightPackagePath),
      },
      playwrightCore: {
        version: '1.2.3',
        packagePath: realpathSync.native(fixture.playwrightCorePackagePath),
        bundlePath: linkedCoreBundlePath,
      },
    });
    expect(report.checks.find((check) => check.name === 'playwright-mcp-cli')).toMatchObject({
      status: 'ok',
    });
  });

  it('warns when an existing external CLI has no package metadata', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doctor-cli-'));
    tempRoots.push(root);
    const cliPath = path.join(root, 'cli.js');
    writeFileSync(cliPath, '');
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => cliPath,
      resolvePlaywrightCoreBundlePath: () => defaultCoreBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('warning');
    expect(report.upstream).toMatchObject({
      cliPath,
      resolvedVersion: null,
      packagePath: null,
      playwright: { version: null, packagePath: null },
      playwrightCore: { version: null, packagePath: null },
    });
    expect(report.checks.find((check) => check.name === 'playwright-mcp-cli')).toMatchObject({
      status: 'warning',
      message: expect.stringContaining('package metadata is unavailable'),
    });
  });

  it('reports an error when the resolved upstream CLI path does not exist', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doctor-missing-cli-'));
    tempRoots.push(root);
    const cliPath = path.join(root, 'missing-cli.js');
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => cliPath,
      resolvePlaywrightCoreBundlePath: () => defaultCoreBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('error');
    expect(report.upstream.cliPath).toBe(cliPath);
    expect(report.checks.find((check) => check.name === 'playwright-mcp-cli')).toMatchObject({
      status: 'error',
      message: expect.stringContaining('CLI path does not exist'),
    });
  });

  it('reports a warning when CloakBrowser metadata exists but the binary is not installed', async () => {
    const playwrightCliPath = fileURLToPath(
      new URL('../../node_modules/@playwright/mcp/cli.js', import.meta.url),
    );
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => playwrightCliPath,
      resolvePlaywrightCoreBundlePath: () => defaultCoreBundlePath,
    }));
    vi.doMock('@/bridge/config.js', () => ({
      getCurrentCloakBinaryInfo: () => ({
        version: '146.0.0',
        platform: 'linux-x64',
        binaryPath: fakeCloakBinaryPath,
        installed: false,
        cacheDir: path.dirname(fakeCloakBinaryPath),
        downloadUrl: 'https://example.invalid/cloakbrowser.tar.gz',
      }),
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('warning');
    expect(report.cloakbrowser?.installed).toBe(false);
    expect(report.checks.find((check) => check.name === 'cloakbrowser-binary')).toMatchObject({
      status: 'warning',
      message: expect.stringContaining('not installed'),
    });
    expect(doctor.renderDoctorReport(report)).toContain('not installed');
  });

  it('reports an error for an explicitly configured missing core bundle', async () => {
    const missingBundlePath = path.join(tmpdir(), 'missing-playwright-core-bundle');
    vi.stubEnv('CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH', missingBundlePath);
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => defaultPlaywrightCliPath,
      resolvePlaywrightCoreBundlePath: () => missingBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('error');
    expect(report.checks.find((check) => check.name === 'playwright-runtime')).toMatchObject({
      status: 'error',
      message: 'Configured Playwright core bundle path does not exist',
    });
  });

  it('warns when the core bundle version differs from the upstream runtime', async () => {
    const stableCoreBundlePath = createCoreBundleFixture(tempRoots, '1.63.0');
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => defaultPlaywrightCliPath,
      resolvePlaywrightCoreBundlePath: () => stableCoreBundlePath,
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('warning');
    expect(report.checks.find((check) => check.name === 'playwright-runtime')).toMatchObject({
      status: 'warning',
      message: 'Playwright core 1.63.0-alpha-2026-08-31 does not match core bundle 1.63.0',
    });
  });

  it('reports hard failures when required upstream and CloakBrowser metadata cannot be resolved', async () => {
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => {
        throw new Error('missing upstream cli');
      },
      resolvePlaywrightCoreBundlePath: () => {
        throw new Error('missing core bundle');
      },
    }));
    vi.doMock('@/bridge/config.js', () => ({
      getCurrentCloakBinaryInfo: () => {
        throw new Error('missing cloak metadata');
      },
    }));

    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('error');
    expect(report.upstream.cliPath).toBeNull();
    expect(report.cloakbrowser).toBeNull();
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'playwright-mcp-cli',
          status: 'error',
          message: 'missing upstream cli',
        }),
        expect.objectContaining({
          name: 'cloakbrowser-binary',
          status: 'error',
          message: 'missing cloak metadata',
        }),
      ]),
    );
    expect(doctor.renderDoctorReport(report)).toContain('CloakBrowser: unavailable');
  });
});

const defaultPlaywrightCliPath = fileURLToPath(
  new URL('../../node_modules/@playwright/mcp/cli.js', import.meta.url),
);
const defaultCoreBundlePath = fileURLToPath(
  new URL('../../node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle', import.meta.url),
);

interface ExternalPlaywrightFixture {
  root: string;
  cliPath: string;
  coreBundlePath: string;
  mcpPackagePath: string;
  playwrightPackagePath: string;
  playwrightCorePackagePath: string;
}

function createExternalPlaywrightFixture(tempRoots: string[]): ExternalPlaywrightFixture {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doctor-external-'));
  tempRoots.push(root);
  const modulesPath = path.join(root, 'node_modules');
  const mcpPackagePath = path.join(modulesPath, '@playwright', 'mcp');
  const playwrightPackagePath = path.join(modulesPath, 'playwright');
  const playwrightCorePackagePath = path.join(modulesPath, 'playwright-core');
  const cliPath = path.join(mcpPackagePath, 'cli.js');
  const coreBundlePath = path.join(playwrightCorePackagePath, 'lib', 'coreBundle');

  writePackageFixture(mcpPackagePath, '@playwright/mcp', '9.9.9');
  writePackageFixture(playwrightPackagePath, 'playwright', '1.2.3');
  writePackageFixture(playwrightCorePackagePath, 'playwright-core', '1.2.3');
  writeFileSync(cliPath, '');
  mkdirSync(path.dirname(coreBundlePath), { recursive: true });
  writeFileSync(`${coreBundlePath}.js`, '');

  return {
    root,
    cliPath,
    coreBundlePath,
    mcpPackagePath,
    playwrightPackagePath,
    playwrightCorePackagePath,
  };
}

function writePackageFixture(packagePath: string, name: string, version: string): void {
  mkdirSync(packagePath, { recursive: true });
  writeFileSync(path.join(packagePath, 'package.json'), `${JSON.stringify({ name, version }, null, 2)}\n`);
}

function createCoreBundleFixture(tempRoots: string[], version: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doctor-core-'));
  tempRoots.push(root);
  const packageRoot = path.join(root, 'node_modules', 'playwright-core');
  const bundlePath = path.join(packageRoot, 'lib', 'coreBundle');
  mkdirSync(path.dirname(bundlePath), { recursive: true });
  writeFileSync(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: 'playwright-core', version }, null, 2)}\n`,
  );
  writeFileSync(`${bundlePath}.js`, '');
  return bundlePath;
}
