#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runCommand } from '#scripts/lib/command';
import { readJson } from '#scripts/lib/files';
import { appendGithubOutput } from '#scripts/lib/github-output';
import { assertPackageFileList, formatBytes } from '#scripts/lib/npm-package';

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageJson = readJson(packageJsonPath);

const packed = packProject();
const packageFile = path.resolve(root, packed.filename);

assertPackageFileList(packed.files.map((file) => file.path));
verifyInstall(packageFile);
await appendGithubOutput({
  package_file: packed.filename,
  package_name: packed.name,
  package_version: packed.version,
});

process.stderr.write(
  `verified ${packed.filename}: ${packed.entryCount} files, ${formatBytes(packed.size)} packed, ${formatBytes(
    packed.unpackedSize,
  )} unpacked\n`,
);

function packProject() {
  const raw = runCommand('npm', ['pack', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const results = JSON.parse(raw);
  const packages = Array.isArray(results)
    ? results
    : results !== null && typeof results === 'object'
      ? Object.values(results)
      : [];
  if (packages.length !== 1) {
    throw new Error(`expected npm pack to return one package, got ${raw}`);
  }
  return packages[0];
}

function verifyInstall(packageFile) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-npm-'));
  try {
    writeFileSync(path.join(tempDir, 'package.json'), '{"private":true,"type":"module"}\n');
    runCommand('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', packageFile], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    const binPath = path.join(
      tempDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'cloakbrowser-mcp.cmd' : 'cloakbrowser-mcp',
    );
    const cliVersion = runCommand(binPath, ['--version'], { cwd: tempDir, encoding: 'utf8' }).trim();
    if (cliVersion !== packageJson.version) {
      throw new Error(`CLI version mismatch: expected ${packageJson.version}, got ${cliVersion}`);
    }

    const cliHelp = runCommand(binPath, ['--help'], { cwd: tempDir, encoding: 'utf8' });
    if (!cliHelp.includes('Playwright MCP bridge backed by CloakBrowser')) {
      throw new Error('CLI help does not describe the bridge runtime');
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
