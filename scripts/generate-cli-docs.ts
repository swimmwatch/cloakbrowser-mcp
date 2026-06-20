import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCliReferenceMarkdown } from '#/cli/options';

interface PackageJson {
  version: string;
}

const root = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as PackageJson;
const outputDirectory = path.join(root, 'docs', 'generated');
const outputPath = path.join(outputDirectory, 'cli.md');

mkdirSync(outputDirectory, { recursive: true });

const markdown = renderCliReferenceMarkdown(packageJson.version);

if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== markdown) {
  writeFileSync(outputPath, markdown);
}
