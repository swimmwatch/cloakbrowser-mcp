import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderCliReferenceMarkdown } from '#src/cli/options';
interface PackageJson {
  version: string;
}
const uRL = new URL('..', import.meta.url);
const root = fileURLToPath(uRL);
const joinedPath = path.join(root, 'package.json');
const fileSyncResult = readFileSync(joinedPath, 'utf8');
const packageJson = JSON.parse(fileSyncResult) as PackageJson;
const outputDirectory = path.join(root, 'docs', 'generated');
const outputPath = path.join(outputDirectory, 'cli.md');
const mkdirSyncOptions = { recursive: true } as const;
mkdirSync(outputDirectory, mkdirSyncOptions);
const markdown = renderCliReferenceMarkdown(packageJson.version);
if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== markdown) {
  writeFileSync(outputPath, markdown);
}
