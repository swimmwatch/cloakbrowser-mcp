import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDoctorReport, renderDoctorReport } from '../../src/cli/doctor.js';

describe('CLI doctor diagnostics', () => {
  afterEach(() => {
    vi.doUnmock('../../src/bridge/config.js');
    vi.doUnmock('../../src/bridge/paths.js');
    vi.resetModules();
  });

  it('returns a stable diagnostics report without starting the bridge', () => {
    const report = createDoctorReport();

    expect(['ok', 'warning']).toContain(report.status);
    expect(report.project).toMatchObject({
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
      nodeEngine: '>=22.12.0',
    });
    expect(report.node.supported).toBe(true);
    expect(report.upstream.package).toBe('@playwright/mcp');
    expect(report.upstream.cliPath?.replaceAll('\\', '/')).toEqual(
      expect.stringContaining('@playwright/mcp'),
    );
    expect(report.checks.map((check) => check.name)).toEqual([
      'node',
      'playwright-mcp-cli',
      'cloakbrowser-binary',
    ]);
  });

  it('renders human-readable diagnostics', () => {
    const output = renderDoctorReport(createDoctorReport());

    expect(output).toContain('CloakBrowser MCP doctor');
    expect(output).toContain('Checks:');
    expect(output).toContain('playwright-mcp-cli');
  });

  it('reports a warning when CloakBrowser metadata exists but the binary is not installed', async () => {
    const playwrightCliPath = fileURLToPath(
      new URL('../../node_modules/@playwright/mcp/cli.js', import.meta.url),
    );
    vi.doMock('../../src/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => playwrightCliPath,
    }));
    vi.doMock('../../src/bridge/config.js', () => ({
      getCurrentCloakBinaryInfo: () => ({
        version: '146.0.0',
        platform: 'linux-x64',
        binaryPath: '/cache/chrome',
        installed: false,
        cacheDir: '/cache',
        downloadUrl: 'https://example.invalid/cloakbrowser.tar.gz',
      }),
    }));

    const doctor = await import('../../src/cli/doctor.js');
    const report = doctor.createDoctorReport();

    expect(report.status).toBe('warning');
    expect(report.cloakbrowser?.installed).toBe(false);
    expect(report.checks.find((check) => check.name === 'cloakbrowser-binary')).toMatchObject({
      status: 'warning',
      message: expect.stringContaining('not installed'),
    });
    expect(doctor.renderDoctorReport(report)).toContain('not installed');
  });

  it('reports hard failures when required upstream and CloakBrowser metadata cannot be resolved', async () => {
    vi.doMock('../../src/bridge/paths.js', () => ({
      resolvePlaywrightMcpCliPath: () => {
        throw new Error('missing upstream cli');
      },
    }));
    vi.doMock('../../src/bridge/config.js', () => ({
      getCurrentCloakBinaryInfo: () => {
        throw new Error('missing cloak metadata');
      },
    }));

    const doctor = await import('../../src/cli/doctor.js');
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
