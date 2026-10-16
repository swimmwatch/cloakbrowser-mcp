import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

it('packs a release artifact without installing or executing its CLI', async () => {
  const temporaryDirectory = tmpdir();
  const prefix = path.join(temporaryDirectory, 'cloak-pack-only-');
  const root = await mkdtemp(prefix);
  try {
    const runtime = path.join(root, 'dist', 'runtime');
    const directoryOptions = { recursive: true };
    await mkdir(runtime, directoryOptions);
    const metadata = {
      name: 'cloakbrowser-mcp-pack-only-fixture',
      version: '0.0.0',
      type: 'module',
      files: ['dist', 'server.json'],
      bin: { 'cloakbrowser-mcp': 'dist/cli.js' },
    };
    const files: Record<string, string> = {
      'package.json': JSON.stringify(metadata),
      'README.md': '# Test fixture\n',
      LICENSE: 'Test fixture\n',
      'server.json': '{}\n',
      'dist/index.js': 'export {};\n',
      'dist/index.d.ts': 'export {};\n',
      'dist/cli.js': 'throw new Error("Release packaging must not execute the CLI");\n',
      'dist/runtime/humanize-init-page.cjs': 'module.exports = {};\n',
    };
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(root, name);
      await writeFile(target, content);
    }
    const scriptUrl = import.meta.resolve('#scripts/verify-npm-package');
    const script = fileURLToPath(scriptUrl);
    const args = [script, '--pack-only'];
    const outputs = path.join(root, 'github-output');
    const cache = path.join(root, 'npm-cache');
    const options = {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: outputs, NPM_CONFIG_CACHE: cache },
    };
    const execute = promisify(execFile);
    const result = await execute(process.execPath, args, options);
    expect(result.stderr).toContain('packed cloakbrowser-mcp-pack-only-fixture-0.0.0.tgz');
    const output = await readFile(outputs, 'utf8');
    expect(output).toContain('package_file=cloakbrowser-mcp-pack-only-fixture-0.0.0.tgz');
    expect(output).toContain('package_version=0.0.0');
    const entries = await readdir(root);
    expect(entries).toContain('cloakbrowser-mcp-pack-only-fixture-0.0.0.tgz');
    expect(entries).not.toContain('node_modules');
  } finally {
    const removal = { recursive: true, force: true };
    await rm(root, removal);
  }
});
