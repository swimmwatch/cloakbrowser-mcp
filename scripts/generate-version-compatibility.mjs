#!/usr/bin/env node
import process from 'node:process';
import { readJson, readText, writeText } from '#scripts/lib/files';
import {
  prependLocalizedCompatibilityRow,
  renderFullTable,
  renderHomepageTable,
  renderReadmeTable,
  replaceGeneratedBlock,
  synchronizeLocalizedCompatibilityMetadata,
  validateRows,
} from '#scripts/lib/version-compatibility';
const checkOnly = process.argv.includes('--check');
const dataPath = 'docs/data/version-compatibility.json';
const rows = readJson(dataPath);
validateRows(rows);
const [currentRow, previousRow] = rows;
if (!previousRow) {
  const message = `${dataPath} must contain a prior release for localized table generation`;
  throw new Error(message);
}
const locales = ['ru', 'be', 'uk', 'es', 'pt-BR', 'zh', 'ja', 'de', 'fr', 'hi'];
const targets = [
  {
    filePath: 'README.md',
    generate: (content) => {
      const renderReadmeTableResult = renderReadmeTable(rows);
      return replaceGeneratedBlock(content, '## Version compatibility', renderReadmeTableResult);
    },
  },
  {
    filePath: 'docs/index.md',
    generate: (content) => {
      const renderHomepageTableResult = renderHomepageTable(rows);
      return replaceGeneratedBlock(content, '## Version Compatibility', renderHomepageTableResult);
    },
  },
  {
    filePath: 'docs/version-compatibility.md',
    generate: (content) => {
      const renderFullTableResult = renderFullTable(rows);
      return replaceGeneratedBlock(content, '# Version Compatibility', renderFullTableResult);
    },
  },
  ...locales.flatMap((locale) => [
    {
      filePath: `docs/index.${locale}.md`,
      generate: (content) => {
        const synchronized = synchronizeLocalizedCompatibilityMetadata(content, rows, false);
        return prependLocalizedCompatibilityRow(synchronized, previousRow, currentRow);
      },
    },
    {
      filePath: `docs/version-compatibility.${locale}.md`,
      generate: (content) => {
        const synchronized = synchronizeLocalizedCompatibilityMetadata(content, rows, true);
        return prependLocalizedCompatibilityRow(synchronized, previousRow, currentRow);
      },
    },
  ]),
];
const stale = [];
for (const target of targets) {
  const original = readText(target.filePath);
  const generated = target.generate(original);
  if (generated !== original) {
    stale.push(target.filePath);
    if (!checkOnly) {
      writeText(target.filePath, generated);
    }
  }
}
if (checkOnly && stale.length > 0) {
  const message2 = `version compatibility tables are stale; run npm run docs:compatibility (${stale.join(', ')})`;
  throw new Error(message2);
}
if (!checkOnly) {
  process.stderr.write('generated version compatibility tables\n');
}
