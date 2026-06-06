import { describe, expect, it } from 'vitest';
import { createDoctorReport, renderDoctorReport } from '../../src/cli/doctor.js';

describe('CLI doctor diagnostics', () => {
  it('returns a stable diagnostics report without starting the bridge', () => {
    const report = createDoctorReport();

    expect(['ok', 'warning']).toContain(report.status);
    expect(report.project).toMatchObject({
      packageName: 'cloakbrowser-mcp',
      mcpName: 'io.github.swimmwatch/cloakbrowser-mcp',
      nodeEngine: '>=20.0.0',
    });
    expect(report.node.supported).toBe(true);
    expect(report.upstream.package).toBe('@playwright/mcp');
    expect(report.upstream.cliPath).toEqual(expect.stringContaining('@playwright/mcp'));
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
});
