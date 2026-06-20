#!/usr/bin/env node
import process from 'node:process';
import { readJson, readText, writeText } from '#scripts/lib/files';

const checkOnly = process.argv.includes('--check');
const dataPath = 'docs/data/version-compatibility.json';
const markerName = 'compatibility-table';
const startMarker = `<!-- ${markerName}:start -->`;
const endMarker = `<!-- ${markerName}:end -->`;

const rows = readJson(dataPath);
validateRows(rows);

const targets = [
  {
    filePath: 'README.md',
    heading: '## Version compatibility',
    table: renderReadmeTable(rows),
  },
  {
    filePath: 'docs/index.md',
    heading: '## Version Compatibility',
    table: renderHomepageTable(rows),
  },
  {
    filePath: 'docs/version-compatibility.md',
    heading: '# Version Compatibility',
    table: renderFullTable(rows),
  },
];

const stale = [];

for (const target of targets) {
  const original = readText(target.filePath);
  const generated = replaceGeneratedBlock(original, target.heading, target.table);
  if (generated !== original) {
    stale.push(target.filePath);
    if (!checkOnly) {
      writeText(target.filePath, generated);
    }
  }
}

if (checkOnly && stale.length > 0) {
  throw new Error(
    `version compatibility tables are stale; run npm run docs:compatibility (${stale.join(', ')})`,
  );
}

if (!checkOnly) {
  process.stderr.write('generated version compatibility tables\n');
}

function renderReadmeTable(compatibilityRows) {
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

function renderHomepageTable(compatibilityRows) {
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

function renderFullTable(compatibilityRows) {
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

function renderTable(headers, tableRows) {
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

function renderTableRow(row, widths) {
  return `| ${row.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`;
}

function replaceGeneratedBlock(content, heading, table) {
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

function validateRows(value) {
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

function code(value) {
  return `\`${value}\``;
}

function codePlatformList(value) {
  return value.replaceAll('linux/amd64', '`linux/amd64`').replaceAll('linux/arm64', '`linux/arm64`');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
