import { describe, expect, it } from 'vitest';

interface VersionCompatibilityModule {
  code(value: string): string;
  codePlatformList(value: string): string;
  escapeRegex(value: string): string;
  renderFullTable(rows: CompatibilityRow[]): string;
  renderHomepageTable(rows: CompatibilityRow[]): string;
  renderReadmeTable(rows: CompatibilityRow[]): string;
  renderTable(headers: string[], tableRows: string[][]): string;
  renderTableRow(row: string[], widths: number[]): string;
  replaceGeneratedBlock(content: string, heading: string, table: string): string;
  validateRows(value: unknown, dataPath?: string): void;
}

interface CompatibilityRow {
  version: string;
  playwrightMcp: string;
  playwrightMcpDockerBase: string;
  cloakbrowser: string;
  node: string;
  readmePlatforms: string;
  testedPlatform: string;
  parity: string;
  transports: string[];
}

const compatibility = (await import(
  new URL('../../scripts/lib/version-compatibility.mjs', import.meta.url).href
)) as unknown as VersionCompatibilityModule;

const row: CompatibilityRow = {
  cloakbrowser: '0.4.8',
  node: '>=22.12.0',
  parity: 'Compared in CI',
  playwrightMcp: '0.0.77',
  playwrightMcpDockerBase: 'v0.0.77',
  readmePlatforms: 'linux/amd64, linux/arm64',
  testedPlatform: 'linux/amd64',
  transports: ['stdio', 'streamable-http'],
  version: '1.6.1',
};

describe('version compatibility helpers', () => {
  it('validates compatibility row shape', () => {
    expect(() => compatibility.validateRows([row], 'compat.json')).not.toThrow();
    expect(() => compatibility.validateRows([], 'compat.json')).toThrow(
      'compat.json must contain at least one compatibility row',
    );
    expect(() => compatibility.validateRows([{ ...row, transports: ['stdio', 42] }], 'compat.json')).toThrow(
      'compat.json[0].transports must be an array of strings',
    );
  });

  it('renders padded markdown tables for all compatibility targets', () => {
    expect(compatibility.renderTable(['A', 'Long'], [['x', 'y']])).toBe(
      ['| A   | Long |', '| --- | ---- |', '| x   | y    |'].join('\n'),
    );
    expect(compatibility.renderTableRow(['x', 'y'], [1, 3])).toBe('| x | y   |');
    expect(compatibility.renderReadmeTable([row])).toContain('`linux/amd64`, `linux/arm64`');
    expect(compatibility.renderHomepageTable([row])).toContain('Compared in CI');
    expect(compatibility.renderFullTable([row])).toContain('@playwright/mcp dependency');
  });

  it('replaces existing generated blocks or legacy tables', () => {
    const table = '| A |\n| - |\n| x |';
    expect(
      compatibility.replaceGeneratedBlock(
        [
          '## Version compatibility',
          '<!-- compatibility-table:start -->',
          '',
          'old',
          '',
          '<!-- compatibility-table:end -->',
          '',
        ].join('\n'),
        '## Version compatibility',
        table,
      ),
    ).toContain(table);

    expect(
      compatibility.replaceGeneratedBlock(
        ['## Version compatibility', '| Old |', '| --- |', '| x |', '', 'Next'].join('\n'),
        '## Version compatibility',
        table,
      ),
    ).toBe(
      [
        '## Version compatibility',
        '<!-- compatibility-table:start -->',
        '',
        table,
        '',
        '<!-- compatibility-table:end -->',
        '',
        'Next',
      ].join('\n'),
    );
    expect(() => compatibility.replaceGeneratedBlock('No heading\n', '## Missing', table)).toThrow(
      'missing heading',
    );
  });

  it('formats inline code and regex fragments', () => {
    expect(compatibility.code('value')).toBe('`value`');
    expect(compatibility.codePlatformList('linux/amd64')).toBe('`linux/amd64`');
    expect(compatibility.escapeRegex('a+b?')).toBe('a\\+b\\?');
  });
});
