import { expectedDependencyVersions } from '@tests/helpers/dependency-versions.js';
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
    for (const root of tempRoots.splice(0)) {
      const rmSyncOptions = { recursive: true, force: true } as const;
      rmSync(root, rmSyncOptions);
    }
  });
  it('returns a stable diagnostics report without starting the bridge', () => {
    const report = createDoctorReport();
    const values: string[] = ['ok', 'warning'];
    expect(values).toContain(report.status);
    const receiverActual = report.project;
    const toMatchObjectOptions = {
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
      nodeEngine: '^22.13.0 || >=24.0.0',
    } as const;
    expect(receiverActual).toMatchObject(toMatchObjectOptions);
    expect(report.node.supported).toBe(true);
    expect(report.upstream.package).toBe('@playwright/mcp');
    const replaceAllResult = report.upstream.cliPath?.replaceAll('\\', '/');
    const receiver2Actual = replaceAllResult;
    const stringContainingResult = expect.stringContaining('@playwright/mcp');
    expect(receiver2Actual).toEqual(stringContainingResult);
    expect(report.upstream.resolvedVersion).toBe(expectedDependencyVersions.playwrightMcp);
    expect(report.upstream.playwright.version).toBe(expectedDependencyVersions.upstreamPlaywright);
    const receiver3Actual = report.upstream.playwrightCore;
    const toMatchObjectOptions2 = {
      version: expectedDependencyVersions.upstreamPlaywrightCore,
      bundlePath: expect.stringContaining('coreBundle'),
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    const mappedValues = report.checks.map((check) => check.name);
    const receiver4Actual = mappedValues;
    const values2: string[] = ['node', 'playwright-mcp-cli', 'playwright-runtime', 'cloakbrowser-binary'];
    expect(receiver4Actual).toEqual(values2);
  });
  it('renders human-readable diagnostics', () => {
    const doctorReportResult = createDoctorReport();
    const output = renderDoctorReport(doctorReportResult);
    expect(output).toContain('CloakBrowser MCP doctor');
    expect(output).toContain('Checks:');
    expect(output).toContain('playwright-mcp-cli');
    const receiver5Actual = output;
    const message2 = `Playwright Core: ${expectedDependencyVersions.upstreamPlaywrightCore}`;
    expect(receiver5Actual).toContain(message2);
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
    const receiver6Actual = report.upstream;
    const toMatchObjectOptions3 = {
      resolvedVersion: '9.9.9',
      packagePath: realpathSync.native(fixture.mcpPackagePath),
      playwright: {
        version: '1.2.3',
        packagePath: realpathSync.native(fixture.playwrightPackagePath),
      },
      playwrightCore: {
        version: '1.2.3',
        packagePath: realpathSync.native(fixture.playwrightCorePackagePath),
        bundlePath: fixture.coreBundlePath,
      },
    } as const;
    expect(receiver6Actual).toMatchObject(toMatchObjectOptions3);
    const findResult = report.checks.find((check) => check.name === 'playwright-runtime');
    const receiver7Actual = findResult;
    const toMatchObjectOptions4 = {
      status: 'ok',
    } as const;
    expect(receiver7Actual).toMatchObject(toMatchObjectOptions4);
  });
  it('keeps effective paths while resolving package metadata through a directory link', async () => {
    const fixture = createExternalPlaywrightFixture(tempRoots);
    const tmpdirResult = tmpdir();
    const joinedPath = path.join(tmpdirResult, 'cloakbrowser-doctor-link-');
    const linkedRoot = mkdtempSync(joinedPath);
    tempRoots.push(linkedRoot);
    const rmSyncOptions2 = { recursive: true, force: true } as const;
    rmSync(linkedRoot, rmSyncOptions2);
    const argumentValue = fixture.root;
    const argumentValue2 = process.platform === 'win32' ? 'junction' : 'dir';
    symlinkSync(argumentValue, linkedRoot, argumentValue2);
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
    const receiver8Actual = report.upstream;
    const toMatchObjectOptions5 = {
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
    } as const;
    expect(receiver8Actual).toMatchObject(toMatchObjectOptions5);
    const findResult2 = report.checks.find((check) => check.name === 'playwright-mcp-cli');
    const receiver9Actual = findResult2;
    const toMatchObjectOptions6 = {
      status: 'ok',
    } as const;
    expect(receiver9Actual).toMatchObject(toMatchObjectOptions6);
  });
  it('warns when an existing external CLI has no package metadata', async () => {
    const tmpdirResult2 = tmpdir();
    const joinedPath2 = path.join(tmpdirResult2, 'cloakbrowser-doctor-cli-');
    const root = mkdtempSync(joinedPath2);
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
    const receiver10Actual = report.upstream;
    const toMatchObjectOptions7 = {
      cliPath,
      resolvedVersion: null,
      packagePath: null,
      playwright: { version: null, packagePath: null },
      playwrightCore: { version: null, packagePath: null },
    } as const;
    expect(receiver10Actual).toMatchObject(toMatchObjectOptions7);
    const findResult3 = report.checks.find((check) => check.name === 'playwright-mcp-cli');
    const receiver11Actual = findResult3;
    const toMatchObjectOptions8 = {
      status: 'warning',
      message: expect.stringContaining('package metadata is unavailable'),
    } as const;
    expect(receiver11Actual).toMatchObject(toMatchObjectOptions8);
  });
  it('reports an error when the resolved upstream CLI path does not exist', async () => {
    const tmpdirResult3 = tmpdir();
    const joinedPath3 = path.join(tmpdirResult3, 'cloakbrowser-doctor-missing-cli-');
    const root = mkdtempSync(joinedPath3);
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
    const findResult4 = report.checks.find((check) => check.name === 'playwright-mcp-cli');
    const receiver12Actual = findResult4;
    const toMatchObjectOptions9 = {
      status: 'error',
      message: expect.stringContaining('CLI path does not exist'),
    } as const;
    expect(receiver12Actual).toMatchObject(toMatchObjectOptions9);
  });
  it('reports a warning when CloakBrowser metadata exists but the binary is not installed', async () => {
    const uRL = new URL('../../node_modules/@playwright/mcp/cli.js', import.meta.url);
    const playwrightCliPath = fileURLToPath(uRL);
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
    const findResult5 = report.checks.find((check) => check.name === 'cloakbrowser-binary');
    const receiver13Actual = findResult5;
    const toMatchObjectOptions10 = {
      status: 'warning',
      message: expect.stringContaining('not installed'),
    } as const;
    expect(receiver13Actual).toMatchObject(toMatchObjectOptions10);
    const renderDoctorReportResult = doctor.renderDoctorReport(report);
    expect(renderDoctorReportResult).toContain('not installed');
  });
  it('reports an error for an explicitly configured missing core bundle', async () => {
    const tmpdirResult4 = tmpdir();
    const missingBundlePath = path.join(tmpdirResult4, 'missing-playwright-core-bundle');
    vi.stubEnv('CLOAK_PLAYWRIGHT_MCP_CORE_BUNDLE_PATH', missingBundlePath);
    vi.doMock('@/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => defaultPlaywrightCliPath,
      resolvePlaywrightCoreBundlePath: () => missingBundlePath,
    }));
    const doctor = await import('@/cli/doctor.js');
    const report = doctor.createDoctorReport();
    expect(report.status).toBe('error');
    const findResult6 = report.checks.find((check) => check.name === 'playwright-runtime');
    const receiver14Actual = findResult6;
    const toMatchObjectOptions11 = {
      status: 'error',
      message: 'Configured Playwright core bundle path does not exist',
    } as const;
    expect(receiver14Actual).toMatchObject(toMatchObjectOptions11);
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
    const findResult7 = report.checks.find((check) => check.name === 'playwright-runtime');
    const receiver15Actual = findResult7;
    const toMatchObjectOptions12 = {
      status: 'warning',
      message: `Playwright core ${expectedDependencyVersions.upstreamPlaywrightCore} does not match core bundle 1.63.0`,
    } as const;
    expect(receiver15Actual).toMatchObject(toMatchObjectOptions12);
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
    const receiver16Actual = report.checks;
    const objectContainingOptions = {
      name: 'playwright-mcp-cli',
      status: 'error',
      message: 'missing upstream cli',
    } as const;
    const objectContainingResult = expect.objectContaining(objectContainingOptions);
    const objectContainingOptions2 = {
      name: 'cloakbrowser-binary',
      status: 'error',
      message: 'missing cloak metadata',
    } as const;
    const objectContainingResult2 = expect.objectContaining(objectContainingOptions2);
    const values3 = [objectContainingResult, objectContainingResult2];
    const arrayContainingResult = expect.arrayContaining(values3);
    expect(receiver16Actual).toEqual(arrayContainingResult);
    const renderDoctorReportResult2 = doctor.renderDoctorReport(report);
    expect(renderDoctorReportResult2).toContain('CloakBrowser: unavailable');
  });
});
const uRL2 = new URL('../../node_modules/@playwright/mcp/cli.js', import.meta.url);
const defaultPlaywrightCliPath = fileURLToPath(uRL2);
const uRL3 = new URL(
  '../../node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle',
  import.meta.url,
);
const defaultCoreBundlePath = fileURLToPath(uRL3);
interface ExternalPlaywrightFixture {
  root: string;
  cliPath: string;
  coreBundlePath: string;
  mcpPackagePath: string;
  playwrightPackagePath: string;
  playwrightCorePackagePath: string;
}
function createExternalPlaywrightFixture(tempRoots: string[]): ExternalPlaywrightFixture {
  const tmpdirResult5 = tmpdir();
  const joinedPath4 = path.join(tmpdirResult5, 'cloakbrowser-doctor-external-');
  const root = mkdtempSync(joinedPath4);
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
  const dirnameResult = path.dirname(coreBundlePath);
  const mkdirSyncOptions = { recursive: true } as const;
  mkdirSync(dirnameResult, mkdirSyncOptions);
  const message3 = `${coreBundlePath}.js`;
  writeFileSync(message3, '');
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
  const mkdirSyncOptions2 = { recursive: true } as const;
  mkdirSync(packagePath, mkdirSyncOptions2);
  const joinedPath5 = path.join(packagePath, 'package.json');
  const stringifyOptions = { name, version } as const;
  const templateValue = JSON.stringify(stringifyOptions, null, 2);
  const message4 = `${templateValue}\n`;
  writeFileSync(joinedPath5, message4);
}
function createCoreBundleFixture(tempRoots: string[], version: string): string {
  const tmpdirResult6 = tmpdir();
  const joinedPath6 = path.join(tmpdirResult6, 'cloakbrowser-doctor-core-');
  const root = mkdtempSync(joinedPath6);
  tempRoots.push(root);
  const packageRoot = path.join(root, 'node_modules', 'playwright-core');
  const bundlePath = path.join(packageRoot, 'lib', 'coreBundle');
  const dirnameResult2 = path.dirname(bundlePath);
  const mkdirSyncOptions3 = { recursive: true } as const;
  mkdirSync(dirnameResult2, mkdirSyncOptions3);
  const joinedPath7 = path.join(packageRoot, 'package.json');
  const stringifyOptions2 = { name: 'playwright-core', version } as const;
  const templateValue2 = JSON.stringify(stringifyOptions2, null, 2);
  const message5 = `${templateValue2}\n`;
  writeFileSync(joinedPath7, message5);
  const message6 = `${bundlePath}.js`;
  writeFileSync(message6, '');
  return bundlePath;
}
