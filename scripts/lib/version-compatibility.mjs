const markerName = 'compatibility-table';
const startMarker = `<!-- ${markerName}:start -->`;
const endMarker = `<!-- ${markerName}:end -->`;
export function renderReadmeTable(compatibilityRows) {
  const values = ['cloakbrowser-mcp', '@playwright/mcp', 'CloakBrowser', 'Node.js', 'Platform'];
  const mappedValues = compatibilityRows.map((row) => [
    code(row.version),
    code(row.playwrightMcp),
    code(row.cloakbrowser),
    code(row.node),
    codePlatformList(row.readmePlatforms),
  ]);
  return renderTable(values, mappedValues);
}
export function renderHomepageTable(compatibilityRows) {
  const values2 = [
    'cloakbrowser-mcp',
    '@playwright/mcp',
    'Playwright MCP Docker base',
    'CloakBrowser',
    'Transport',
    'Parity',
  ];
  const mappedValues2 = compatibilityRows.map((row) => [
    code(row.version),
    code(row.playwrightMcp),
    code(row.playwrightMcpDockerBase),
    code(row.cloakbrowser),
    row.transports.join(', '),
    'Compared in CI',
  ]);
  return renderTable(values2, mappedValues2);
}
export function renderFullTable(compatibilityRows) {
  const values3 = [
    'cloakbrowser-mcp',
    '@playwright/mcp dependency',
    'Playwright MCP Docker base',
    'CloakBrowser dependency',
    'Node.js',
    'Transport',
    'Tested platform',
    'Tool parity',
  ];
  const mappedValues3 = compatibilityRows.map((row) => [
    code(row.version),
    code(row.playwrightMcp),
    code(row.playwrightMcpDockerBase),
    code(row.cloakbrowser),
    code(row.node),
    row.transports.join(', '),
    codePlatformList(row.testedPlatform),
    row.parity,
  ]);
  return renderTable(values3, mappedValues3);
}
export function renderTable(headers, tableRows) {
  const widths = headers.map((header, index) => {
    const argumentValue = header.length;
    const spreadValues = [...tableRows.map((row) => row[index].length)];
    return Math.max(argumentValue, 3, ...spreadValues);
  });
  const renderTableRowResult = renderTableRow(headers, widths);
  const mappedValues4 = widths.map((width) => '-'.repeat(width));
  const renderTableRowResult2 = renderTableRow(mappedValues4, widths);
  const argumentValue2 = [...tableRows.map((row) => renderTableRow(row, widths))];
  const lines = [renderTableRowResult, renderTableRowResult2, ...argumentValue2];
  return lines.join('\n');
}
export function renderTableRow(row, widths) {
  return `| ${row.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`;
}
export function replaceGeneratedBlock(content, heading, table) {
  const block = `${startMarker}\n\n${table}\n\n${endMarker}`;
  const message = `${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}`;
  const markedPattern = new RegExp(message);
  if (markedPattern.test(content)) {
    return content.replace(markedPattern, block);
  }
  const headingIndex = content.indexOf(heading);
  if (headingIndex === -1) {
    const message2 = `missing heading "${heading}"`;
    throw new Error(message2);
  }
  const tableStart = content.indexOf('\n|', headingIndex);
  if (tableStart === -1) {
    const message3 = `missing markdown table after "${heading}"`;
    throw new Error(message3);
  }
  const computedValue = tableStart + 1;
  const afterTable = content.slice(computedValue).search(/\n(?!\|)/u);
  if (afterTable === -1) {
    const message4 = `could not find end of markdown table after "${heading}"`;
    throw new Error(message4);
  }
  const tableEnd = tableStart + 1 + afterTable;
  const computedValue2 = tableStart + 1;
  const templateValue = content.slice(0, computedValue2);
  const templateValue2 = block;
  const templateValue3 = content.slice(tableEnd);
  return `${templateValue}${templateValue2}${templateValue3}`;
}
/** Synchronize version fields while preserving translated table cells. */
export function synchronizeLocalizedCompatibilityMetadata(content, rows, includeNode) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex <= startIndex) {
    throw new Error('localized compatibility table markers are missing or malformed');
  }
  const tableStart = startIndex + startMarker.length;
  const entries = rows.map((row) => [row.version, row]);
  const rowByVersion = new Map(entries);
  const fieldCount = includeNode ? 5 : 4;
  const prefixSource = '^(?:\\|\\s*`[^`]*`\\s*){' + fieldCount + '}\\|';
  const metadataPrefix = new RegExp(prefixSource, 'u');
  const tableSource = content.slice(tableStart, endIndex);
  const lines = tableSource.split('\n');
  const updatedLines = lines.map((line) => {
    const versionMatch = /^\|\s*`([^`]*)`\s*\|/u.exec(line);
    const version = versionMatch?.[1];
    const row = rowByVersion.get(version);
    if (row === undefined) return line;
    if (!metadataPrefix.test(line)) {
      const message = `localized compatibility metadata is malformed for ${version}`;
      throw new Error(message);
    }
    const values = [
      row.version,
      row.playwrightMcp,
      row.playwrightMcpDockerBase,
      row.cloakbrowser,
      ...(includeNode ? [row.node] : []),
    ];
    let index = 0;
    return line.replace(/`[^`]*`/gu, (cell) => {
      if (index >= values.length) return cell;
      const value = values[index++];
      return code(value);
    });
  });
  const table = updatedLines.join('\n');
  const before = content.slice(0, tableStart);
  const after = content.slice(endIndex);
  return `${before}${table}${after}`;
}
export function prependLocalizedCompatibilityRow(content, previousRow, currentRow) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('localized compatibility table markers are missing or malformed');
  }
  const tableStart = startIndex + startMarker.length;
  const table = content.slice(tableStart, endIndex);
  const lines = table.split('\n');
  const currentVersion = code(currentRow.version);
  if (lines.some((line) => line.includes(currentVersion))) {
    return content;
  }
  if (!hasMatchingLocalizedFields(previousRow, currentRow)) {
    throw new Error(
      'localized compatibility rows require a manual translation when non-version values change',
    );
  }
  const previousVersion = code(previousRow.version);
  const previousRowIndex = lines.findIndex((line) => line.includes(previousVersion));
  if (previousRowIndex === -1) {
    const message5 = `localized compatibility table is missing version ${previousRow.version}`;
    throw new Error(message5);
  }
  const receiver = lines[previousRowIndex].replace(previousVersion, currentVersion);
  const codeResult = code(previousRow.cloakbrowser);
  const codeResult2 = code(currentRow.cloakbrowser);
  const localizedRow = receiver.replace(codeResult, codeResult2);
  lines.splice(previousRowIndex, 0, localizedRow);
  return `${content.slice(0, tableStart)}${lines.join('\n')}${content.slice(endIndex)}`;
}
export function validateRows(value, dataPath = 'docs/data/version-compatibility.json') {
  if (!Array.isArray(value) || value.length === 0) {
    const message6 = `${dataPath} must contain at least one compatibility row`;
    throw new Error(message6);
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
        const message7 = `${dataPath}[${index}].${key} must be a non-empty string`;
        throw new Error(message7);
      }
    }
    if (!Array.isArray(row.transports) || row.transports.some((transport) => typeof transport !== 'string')) {
      const message8 = `${dataPath}[${index}].transports must be an array of strings`;
      throw new Error(message8);
    }
  }
}
function hasMatchingLocalizedFields(previousRow, currentRow) {
  return (
    previousRow.playwrightMcp === currentRow.playwrightMcp &&
    previousRow.playwrightMcpDockerBase === currentRow.playwrightMcpDockerBase &&
    previousRow.node === currentRow.node &&
    previousRow.readmePlatforms === currentRow.readmePlatforms &&
    previousRow.testedPlatform === currentRow.testedPlatform &&
    previousRow.parity === currentRow.parity &&
    previousRow.transports.join(',') === currentRow.transports.join(',')
  );
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
