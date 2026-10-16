import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();
  return { ...original, spawn: vi.fn(original.spawn) };
});
const originalChildProcess = await vi.importActual<typeof import('node:child_process')>('node:child_process');

interface ReportCli {
  assertPackageExclusions: (files: { path: string }[]) => void;
  parseArguments: (args: string[]) => { command: string; suite?: string; runId?: string };
  collectReport: (options: Record<string, unknown>) => Promise<{ code: number; directory: string }>;
  openReport: (report: string) => Promise<number>;
  reportOpenCommand: (index: string, platform: string) => { command: string; args: string[] };
}
const cliUrl = new URL('../../scripts/test-report.mjs', import.meta.url);
const cli = (await import(cliUrl.href)) as ReportCli;
const roots: string[] = [];
afterEach(async () => {
  vi.mocked(spawn).mockReset();
  vi.mocked(spawn).mockImplementation(originalChildProcess.spawn);
  const cleanup = roots.splice(0).map((root) => rm(root, { recursive: true, force: true }));
  await Promise.all(cleanup);
});

describe('test reporting CLI boundaries', () => {
  it.each([
    ['linux', 'xdg-open'],
    ['darwin', 'open'],
    ['win32', 'rundll32.exe'],
  ])('selects the native %s file handler without an HTTP server', (platform, command) => {
    const index = path.join(tmpdir(), 'report with spaces', 'index.html');
    const selected = cli.reportOpenCommand(index, platform);
    expect(selected.command).toBe(command);
    const url = selected.args.at(-1);
    expect(url).toMatch(/^file:/);
    expect(url).toContain('report%20with%20spaces');
    expect(url).toContain('index.html');
  });

  it('opens only the generated HTML entry and waits for its native launcher', async () => {
    const prefix = path.join(tmpdir(), 'report-open-');
    const temporary = await mkdtemp(prefix);
    const root = await realpath(temporary);
    roots.push(root);
    const marker = { version: 1, generator: 'allure@3.20.1', complete: true };
    const markerPath = path.join(root, 'report.json');
    const serialized = JSON.stringify(marker);
    await writeFile(markerPath, serialized);
    const index = path.join(root, 'index.html');
    await writeFile(index, '<p>Controlled report entry</p>');
    vi.mocked(spawn).mockImplementationOnce(() => {
      const args = ['-e', ''];
      const options = { stdio: 'ignore' } as const;
      return originalChildProcess.spawn(process.execPath, args, options);
    });
    const code = await cli.openReport(root);
    expect(code).toBe(0);
    const expected = cli.reportOpenCommand(index, process.platform);
    expect(spawn).toHaveBeenCalledWith(expected.command, expected.args, expect.any(Object));
  });
  it('opens a multi-file CI report through the installed Allure viewer with trusted configuration', async () => {
    const prefix = path.join(tmpdir(), 'report-open-multi-');
    const temporary = await mkdtemp(prefix);
    const root = await realpath(temporary);
    roots.push(root);
    const marker = { version: 1, generator: 'allure@3.20.1', complete: true, singleFile: false };
    const markerPath = path.join(root, 'report.json');
    const serialized = JSON.stringify(marker);
    await writeFile(markerPath, serialized);
    const index = path.join(root, 'index.html');
    await writeFile(index, '<p>Controlled multi-file report</p>');
    vi.mocked(spawn).mockImplementationOnce(() => {
      const args = ['-e', ''];
      const options = { stdio: 'ignore' } as const;
      return originalChildProcess.spawn(process.execPath, args, options);
    });
    const code = await cli.openReport(root);
    expect(code).toBe(0);
    const project = path.resolve('.');
    const script = path.join(project, 'node_modules/allure/cli.js');
    const config = path.join(project, 'allure.config.mjs');
    const args = [script, 'open', '--config', config, root];
    const anyOptions = expect.any(Object);
    expect(spawn).toHaveBeenCalledWith(process.execPath, args, anyOptions);
  });
  it('detects generated report data in the archive inventory', () => {
    const clean = [{ path: 'dist/cli.js' }, { path: 'package.json' }];
    expect(() => cli.assertPackageExclusions(clean)).not.toThrow();
    for (const path of [
      'artifacts/test-report/index.html',
      'dist/history.jsonl',
      'allure-results/result.json',
    ]) {
      const contaminated = [...clean, { path }];
      expect(() => cli.assertPackageExclusions(contaminated)).toThrow('included');
    }
    const empty: { path: string }[] = [];
    expect(() => cli.assertPackageExclusions(empty)).toThrow();
  });
  it('accepts only known suites and safe run identifiers', () => {
    const args = ['collect', '--suite', 'unit', '--run-id', 'local-unit'];
    const parsed = cli.parseArguments(args);
    expect(parsed).toMatchObject({ command: 'collect', suite: 'unit', runId: 'local-unit' });
    for (const suite of ['unknown', '../unit']) {
      const invalid = ['collect', '--suite', suite];
      expect(() => cli.parseArguments(invalid)).toThrow();
    }
    const unsafe = ['collect', '--suite', 'unit', '--run-id', '../escape'];
    expect(() => cli.parseArguments(unsafe)).toThrow();
  });

  it('accepts the extension E2E suite without changing the default suite', () => {
    const args = ['collect', '--suite', 'extensions', '--run-id', 'local-extensions'];
    const parsed = cli.parseArguments(args);
    const expected = { command: 'collect', suite: 'extensions', runId: 'local-extensions' };
    expect(parsed).toMatchObject(expected);
  });

  it('accepts the real browser lifecycle suite', () => {
    const args = ['collect', '--suite', 'lifecycle', '--run-id', 'local-lifecycle'];
    const parsed = cli.parseArguments(args);
    const expected = { command: 'collect', suite: 'lifecycle', runId: 'local-lifecycle' };
    expect(parsed).toMatchObject(expected);
  });

  it('requires explicit generation and viewing paths and rejects duplicate options', () => {
    for (const args of [
      ['generate'],
      ['open'],
      ['merge'],
      ['collect', '--suite', 'unit', '--suite', 'cli'],
    ]) {
      expect(() => cli.parseArguments(args)).toThrow();
    }
  });

  it('rejects unknown suites before starting a runner', async () => {
    const prefix = path.join(tmpdir(), 'report-cli-');
    const temporary = await mkdtemp(prefix);
    const root = await realpath(temporary);
    roots.push(root);
    const options = { root, runId: 'absent', producerId: 'unit', suite: 'invalid' };
    await expect(cli.collectReport(options)).rejects.toThrow();
  });
});
