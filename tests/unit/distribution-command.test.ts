import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import {
  cleanupDistributionE2e,
  packAndInstallCurrentPackage,
  runNpmCommand,
} from '@tests/e2e/distributionHarness.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }));
afterEach(() => {
  cleanupDistributionE2e();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('launches the installed manifest CLI through Node without a platform shell wrapper', () => {
  vi.stubEnv('npm_execpath', '/controlled/npm-cli.js');
  const packed = [{ filename: 'controlled.tgz' }];
  const packOutput = {
    status: 0,
    stdout: JSON.stringify(packed),
    stderr: '',
    pid: 1,
    output: [],
    signal: null,
  };
  vi.mocked(spawnSync)
    .mockReturnValueOnce(packOutput)
    .mockImplementationOnce((_command, _args, options) => {
      const cwd = (options as { cwd: string }).cwd;
      const root = path.join(cwd, 'node_modules', 'cloakbrowser-mcp');
      const directoryOptions = { recursive: true } as const;
      mkdirSync(root, directoryOptions);
      const manifest = { bin: { 'cloakbrowser-mcp': 'dist/cli with spaces & symbols.js' } };
      const manifestPath = path.join(root, 'package.json');
      const source = JSON.stringify(manifest);
      writeFileSync(manifestPath, source);
      return { status: 0, stdout: '', stderr: '', pid: 1, output: [], signal: null };
    });
  const installed = packAndInstallCurrentPackage();
  expect(installed.command).toBe(process.execPath);
  const expectedArgs = [installed.cliPath];
  expect(installed.args).toEqual(expectedArgs);
  const expectedPackageRoot = path.join(installed.installRoot, 'node_modules', 'cloakbrowser-mcp');
  expect(installed.cliPath).toContain(expectedPackageRoot);
  expect(installed.args?.[0]).toContain('cli with spaces & symbols.js');
  const packageRoot = path.join('node_modules', 'cloakbrowser-mcp', 'dist');
  expect(installed.args?.[0]).toContain(packageRoot);
});

it('runs npm through Node without shell parsing of Windows paths or metacharacters', () => {
  const cli = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js';
  vi.stubEnv('npm_execpath', cli);
  const output = { status: 0, stdout: 'packed', stderr: '', pid: 1, output: [], signal: null };
  vi.mocked(spawnSync).mockReturnValue(output);
  const cwd = tmpdir();
  const args = ['install', 'C:\\Temp\\fixture & package.tgz'];
  const result = runNpmCommand(args, cwd);
  expect(result).toBe('packed');
  const expectedArgs = [cli, ...args];
  const expectedOptions = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };
  expect(spawnSync).toHaveBeenCalledExactlyOnceWith(process.execPath, expectedArgs, expectedOptions);
});

it('fails clearly when the npm CLI context is unavailable', () => {
  vi.stubEnv('npm_execpath', undefined);
  const cwd = tmpdir();
  const args = ['pack'];
  expect(() => runNpmCommand(args, cwd)).toThrow('Run distribution tests through npm');
  expect(spawnSync).not.toHaveBeenCalled();
});
