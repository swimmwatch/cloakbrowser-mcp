#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { runCommand } from '#scripts/lib/command';
import { readJson } from '#scripts/lib/files';
import { appendGithubOutput } from '#scripts/lib/github-output';
import { assertPackageFileList, formatBytes, parseNpmPackOutput } from '#scripts/lib/npm-package';
const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageJson = readJson(packageJsonPath);
const packOnly = process.argv.includes('--pack-only');
const packed = packProject();
const packageFile = path.resolve(root, packed.filename);
const mappedValues = packed.files.map((file) => file.path);
assertPackageFileList(mappedValues);
if (!packOnly) verifyInstall(packageFile);
const appendGithubOutputOptions = {
  package_file: packed.filename,
  package_name: packed.name,
  package_version: packed.version,
};
await appendGithubOutput(appendGithubOutputOptions);
const action = packOnly ? 'packed' : 'verified';
const message = `${action} ${packed.filename}: ${packed.entryCount} files, ${formatBytes(packed.size)} packed, ${formatBytes(packed.unpackedSize)} unpacked\n`;
process.stderr.write(message);
function packProject() {
  const values = ['pack', '--json'];
  const runCommandOptions = {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  };
  const raw = runCommand('npm', values, runCommandOptions);
  return parseNpmPackOutput(raw);
}
function verifyInstall(packageFile) {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-npm-');
  const tempDir = mkdtempSync(joinedPath);
  try {
    const joinedPath2 = path.join(tempDir, 'package.json');
    writeFileSync(joinedPath2, '{"private":true,"type":"module"}\n');
    const values2 = ['install', '--ignore-scripts', '--no-audit', '--no-fund', packageFile];
    const runCommandOptions2 = {
      cwd: tempDir,
      stdio: 'inherit',
    };
    runCommand('npm', values2, runCommandOptions2);
    const argumentValue = process.platform === 'win32' ? 'cloakbrowser-mcp.cmd' : 'cloakbrowser-mcp';
    const binPath = path.join(tempDir, 'node_modules', '.bin', argumentValue);
    const values3 = ['--version'];
    const runCommandOptions3 = { cwd: tempDir, encoding: 'utf8' };
    const cliVersion = runCommand(binPath, values3, runCommandOptions3).trim();
    if (cliVersion !== packageJson.version) {
      const message2 = `CLI version mismatch: expected ${packageJson.version}, got ${cliVersion}`;
      throw new Error(message2);
    }
    const values4 = ['--help'];
    const runCommandOptions4 = { cwd: tempDir, encoding: 'utf8' };
    const cliHelp = runCommand(binPath, values4, runCommandOptions4);
    if (!cliHelp.includes('Playwright MCP bridge backed by CloakBrowser')) {
      throw new Error('CLI help does not describe the bridge runtime');
    }
  } finally {
    const rmSyncOptions = { recursive: true, force: true };
    rmSync(tempDir, rmSyncOptions);
  }
}
