#!/usr/bin/env node
import process from 'node:process';
import { readJson, readText, writeText } from '#scripts/lib/files';
import {
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
