const markerName = 'compatibility-table';
const startMarker = `<!-- ${markerName}:start -->`;
const endMarker = `<!-- ${markerName}:end -->`;

export function renderReadmeTable(compatibilityRows) {
  return renderTable(
    ['cloakbrowser-mcp', '@playwright/mcp', 'CloakBrowser', 'Node.js', 'Platform'],
    compatibilityRows.map((row) => [
      code(row.version),
      code(row.playwrightMcp),
      code(row.cloakbrowser),
      code(row.node),
      codePlatformList(row.readmePlatforms),
    ]),
  );
}

export function renderHomepageTable(compatibilityRows) {
  return renderTable(
    [
      'cloakbrowser-mcp',
      '@playwright/mcp',
      'Playwright MCP Docker base',
      'CloakBrowser',
      'Transport',
      'Parity',
    ],
    compatibilityRows.map((row) => [
      code(row.version),
      code(row.playwrightMcp),
      code(row.playwrightMcpDockerBase),
      code(row.cloakbrowser),
      row.transports.join(', '),
      'Compared in CI',
    ]),
  );
}

export function renderFullTable(compatibilityRows) {
  return renderTable(
    [
      'cloakbrowser-mcp',
      '@playwright/mcp dependency',
      'Playwright MCP Docker base',
      'CloakBrowser dependency',
      'Node.js',
      'Transport',
      'Tested platform',
      'Tool parity',
    ],
    compatibilityRows.map((row) => [
      code(row.version),
      code(row.playwrightMcp),
      code(row.playwrightMcpDockerBase),
      code(row.cloakbrowser),
      code(row.node),
      row.transports.join(', '),
      codePlatformList(row.testedPlatform),
      row.parity,
    ]),
  );
}

export function renderTable(headers, tableRows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, 3, ...tableRows.map((row) => row[index].length)),
  );
  const lines = [
    renderTableRow(headers, widths),
    renderTableRow(
      widths.map((width) => '-'.repeat(width)),
      widths,
    ),
    ...tableRows.map((row) => renderTableRow(row, widths)),
  ];
  return lines.join('\n');
}

export function renderTableRow(row, widths) {
  return `| ${row.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`;
}

export function replaceGeneratedBlock(content, heading, table) {
  const block = `${startMarker}\n\n${table}\n\n${endMarker}`;
  const markedPattern = new RegExp(`${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}`);
  if (markedPattern.test(content)) {
    return content.replace(markedPattern, block);
  }

  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    throw new Error(`missing heading "${heading}"`);
  }

  const tableStart = content.indexOf('\n|', headingIndex);
  if (tableStart === -1) {
    throw new Error(`missing markdown table after "${heading}"`);
  }

  const afterTable = content.slice(tableStart + 1).search(/\n(?!\|)/u);
  if (afterTable === -1) {
    throw new Error(`could not find end of markdown table after "${heading}"`);
  }

  const tableEnd = tableStart + 1 + afterTable;
  return `${content.slice(0, tableStart + 1)}${block}${content.slice(tableEnd)}`;
}

export function validateRows(value, dataPath = 'docs/data/version-compatibility.json') {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${dataPath} must contain at least one compatibility row`);
  }

  for (const [index, row] of value.entries()) {
    for (const key of [
      'version',
      'playwrightMcp',
      'playwrightMcpDockerBase',
      'cloakbrowser',
      'node',
      'readmePlatforms',
      'testedPlatform',
      'parity',
    ]) {
      if (typeof row[key] !== 'string' || row[key].length === 0) {
        throw new Error(`${dataPath}[${index}].${key} must be a non-empty string`);
      }
    }
    if (!Array.isArray(row.transports) || row.transports.some((transport) => typeof transport !== 'string')) {
      throw new Error(`${dataPath}[${index}].transports must be an array of strings`);
    }
  }
}

export function code(value) {
  return `\`${value}\``;
}

export function codePlatformList(value) {
  return value.replaceAll('linux/amd64', '`linux/amd64`').replaceAll('linux/arm64', '`linux/arm64`');
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
