import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCliReferenceMarkdown } from '../src/cli/options.js';

interface PackageJson {
  version: string;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as PackageJson;
const outputDirectory = path.join(root, 'docs', 'generated');
const outputPath = path.join(outputDirectory, 'cli.md');

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, renderCliReferenceMarkdown(packageJson.version));
