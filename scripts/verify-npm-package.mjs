#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const packed = packProject();
const packageFile = path.resolve(root, packed.filename);

assertPackList(packed.files.map((file) => file.path));
verifyInstall(packageFile);
writeGitHubOutputs(packed);

process.stderr.write(
  `verified ${packed.filename}: ${packed.entryCount} files, ${formatBytes(packed.size)} packed, ${formatBytes(
    packed.unpackedSize,
  )} unpacked\n`,
);

function packProject() {
  const raw = execFileSync('npm', ['pack', '--json'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const results = JSON.parse(raw);
  if (!Array.isArray(results) || results.length !== 1) {
    throw new Error(`expected npm pack to return one package, got ${raw}`);
  }
  return results[0];
}

function assertPackList(files) {
  const requiredFiles = [
    'package.json',
    'README.md',
    'LICENSE',
    'server.json',
    'dist/index.js',
    'dist/index.d.ts',
    'dist/cli.js',
  ];
  for (const file of requiredFiles) {
    if (!files.includes(file)) {
      throw new Error(`npm package is missing required file: ${file}`);
    }
  }

  const forbiddenPatterns = [
    /^src\//,
    /^tests\//,
    /^docs\//,
    /^\.github\//,
    /^coverage\//,
    /^artifacts\//,
    /^site\//,
    /^node_modules\//,
    /(^|\/)\.env(?:\.|$)/,
  ];
  const leakedFiles = files.filter((file) => forbiddenPatterns.some((pattern) => pattern.test(file)));
  if (leakedFiles.length > 0) {
    throw new Error(`npm package contains non-runtime files: ${leakedFiles.join(', ')}`);
  }
}

function verifyInstall(packageFile) {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-npm-'));
  try {
    writeFileSync(path.join(tempDir, 'package.json'), '{"private":true,"type":"module"}\n');
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', packageFile], {
      cwd: tempDir,
      stdio: 'inherit',
    });

    const binPath = path.join(
      tempDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'cloakbrowser-mcp.cmd' : 'cloakbrowser-mcp',
    );
    const cliVersion = execFileSync(binPath, ['--version'], { cwd: tempDir, encoding: 'utf8' }).trim();
    if (cliVersion !== packageJson.version) {
      throw new Error(`CLI version mismatch: expected ${packageJson.version}, got ${cliVersion}`);
    }

    const cliHelp = execFileSync(binPath, ['--help'], { cwd: tempDir, encoding: 'utf8' });
    if (!cliHelp.includes('Playwright MCP bridge backed by CloakBrowser')) {
      throw new Error('CLI help does not describe the bridge runtime');
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeGitHubOutputs(packed) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  appendFileSync(
    outputFile,
    [
      `package_file=${packed.filename}`,
      `package_name=${packed.name}`,
      `package_version=${packed.version}`,
      '',
    ].join('\n'),
  );
}

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024)} KiB`;
}
