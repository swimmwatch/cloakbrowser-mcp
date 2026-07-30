#!/usr/bin/env node
import process from 'node:process';
import { readJson, readText, writeText } from '#scripts/lib/files';
import {
  prependLocalizedCompatibilityRow,
  renderFullTable,
  renderHomepageTable,
  renderReadmeTable,
  replaceGeneratedBlock,
  validateRows,
} from '#scripts/lib/version-compatibility';

const checkOnly = process.argv.includes('--check');
const dataPath = 'docs/data/version-compatibility.json';

const rows = readJson(dataPath);
validateRows(rows);
const [currentRow, previousRow] = rows;

if (!previousRow) {
  throw new Error(`${dataPath} must contain a prior release for localized table generation`);
}

const locales = ['ru', 'be', 'uk', 'es', 'pt-BR', 'zh', 'ja', 'de', 'fr', 'hi'];

const targets = [
  {
    filePath: 'README.md',
    generate: (content) =>
      replaceGeneratedBlock(content, '## Version compatibility', renderReadmeTable(rows)),
  },
  {
    filePath: 'docs/index.md',
    generate: (content) =>
      replaceGeneratedBlock(content, '## Version Compatibility', renderHomepageTable(rows)),
  },
  {
    filePath: 'docs/version-compatibility.md',
    generate: (content) => replaceGeneratedBlock(content, '# Version Compatibility', renderFullTable(rows)),
  },
  ...locales.flatMap((locale) => [
    {
      filePath: `docs/index.${locale}.md`,
      generate: (content) => prependLocalizedCompatibilityRow(content, previousRow, currentRow),
    },
    {
      filePath: `docs/version-compatibility.${locale}.md`,
      generate: (content) => prependLocalizedCompatibilityRow(content, previousRow, currentRow),
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
  throw new Error(
    `version compatibility tables are stale; run npm run docs:compatibility (${stale.join(', ')})`,
  );
}

if (!checkOnly) {
  process.stderr.write('generated version compatibility tables\n');
}
