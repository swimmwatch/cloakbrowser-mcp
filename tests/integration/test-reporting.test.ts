import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn, type SpawnOptions, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { controlledPng } from '@tests/fixtures/reporting/controlled-png.js';

interface ReportResult {
  status: string;
  name: string;
  start: number;
  stop: number;
  statusDetails: { message?: string; trace?: string; flaky?: boolean };
  parameters: { name: string; value: string }[];
  labels: { name: string; value: string }[];
  attachments: { name: string; type: string; source: string }[];
}
interface ReportCli {
  collectReport: (options: Record<string, unknown>) => Promise<{ code: number; directory: string }>;
  generateReport: (options: Record<string, unknown>) => Promise<string>;
  openReport: (report: string) => Promise<number>;
  mergeReport: (options: Record<string, unknown>) => Promise<string>;
}
const cliUrl = new URL('../../scripts/test-report.mjs', import.meta.url);
const cli = (await import(cliUrl.href)) as ReportCli;
const config = 'tests/fixtures/reporting/vitest.config.ts';
const roots: string[] = [];
afterEach(async () => {
  const cleanup = roots.splice(0).map((root) => rm(root, { recursive: true, force: true }));
  await Promise.all(cleanup);
});
async function fixture(scenario: string, suite = 'unit') {
  const prefix = path.join(tmpdir(), 'report-fixture-');
  const temporary = await mkdtemp(prefix);
  const root = await realpath(temporary);
  roots.push(root);
  const canary = 'reporting-synthetic-canary';
  const env = { REPORT_PROBE_CASE: scenario };
  const options = { root, runId: 'fixture', producerId: suite, suite, config, env, secretValues: [canary] };
  const result = await cli.collectReport(options);
  const files = await readdir(result.directory);
  const results: ReportResult[] = [];
  for (const filename of files.filter((name) => name.endsWith('-result.json'))) {
    const target = path.join(result.directory, filename);
    const json = await readFile(target, 'utf8');
    expect(json).not.toContain(canary);
    results.push(JSON.parse(json) as ReportResult);
  }
  return { ...result, results, root };
}

describe('public Vitest reporting through a real child runner', () => {
  it('persists controlled screenshots and sanitized process logs for successful and failed browser cases', async () => {
    const run = await fixture('screenshot', 'npm');
    expect(run.code).not.toBe(0);
    const browserCases = run.results.filter((result) => result.name.startsWith('browser'));
    const statuses = browserCases.map((result) => result.status).sort();
    expect(statuses).toEqual(['failed', 'passed']);
    for (const result of browserCases) {
      const screenshot = result.attachments.find((attachment) => attachment.type === 'image/png');
      expect(screenshot).toBeDefined();
      const imagePath = path.join(run.directory, screenshot?.source ?? 'missing');
      const image = await readFile(imagePath);
      expect(image).toEqual(controlledPng);
      const diagnostic = result.attachments.find(
        (attachment) => attachment.name === 'Owned process diagnostics',
      );
      expect(diagnostic).toBeDefined();
      const textPath = path.join(run.directory, diagnostic?.source ?? 'missing');
      const text = await readFile(textPath, 'utf8');
      expect(text).toContain('pid=42');
      expect(text).not.toContain('reporting-synthetic-canary');
    }
    const input = path.dirname(run.directory);
    const output = path.join(run.root, 'browser-report');
    const options = { input, output };
    await cli.generateReport(options);
    const summaryPath = path.join(output, 'summary.json');
    const summaryText = await readFile(summaryPath, 'utf8');
    const summary = JSON.parse(summaryText) as { stats: { total: number; failed: number } };
    expect(summary.stats.total).toBe(3);
    expect(summary.stats.failed).toBe(1);
  });
  it('restores signal listeners after both successful and failed runners', async () => {
    const interrupts = process.listenerCount('SIGINT');
    const terminations = process.listenerCount('SIGTERM');
    await fixture('pass');
    await fixture('complete');
    expect(process.listenerCount('SIGINT')).toBe(interrupts);
    expect(process.listenerCount('SIGTERM')).toBe(terminations);
  });

  it.each(['SIGINT', 'SIGTERM'])(
    'stops its process tree and removes incomplete data on %s',
    async (signal) => {
      const prefix = path.join(tmpdir(), 'report-interruption-');
      const temporary = await mkdtemp(prefix);
      const root = await realpath(temporary);
      roots.push(root);
      const pidFile = path.join(root, 'children.json');
      const configPath = path.join(root, 'blocked.config.mjs');
      const worker = 'process.stdout.write("ready"); setInterval(() => {}, 1000)';
      const configuration = `import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
process.on('SIGTERM', () => {});
const child = spawn(process.execPath, ['-e', ${JSON.stringify(worker)}], {stdio: ['ignore', 'pipe', 'ignore']});
child.stdout.once('data', () => writeFileSync(${JSON.stringify(pidFile)}, JSON.stringify({runner: process.pid, worker: child.pid})));
await new Promise(resolve => setTimeout(resolve, 60000));
export default {test: {include: []}};`;
      await writeFile(configPath, configuration);
      const resultsRoot = path.join(root, 'results');
      const options = {
        root: resultsRoot,
        runId: 'interrupted',
        producerId: 'unit',
        suite: 'unit',
        config: configPath,
      };
      const wrapper = `import {collectReport} from ${JSON.stringify(cliUrl.href)};
process.on('message', signal => process.emit(signal));
process.on('SIGTERM', () => { if (process.connected) process.send('interrupted'); });
try { await collectReport(${JSON.stringify(options)}); }
catch { process.exitCode ||= 1; }
finally { if (process.connected) process.disconnect(); }`;
      const args = ['--input-type=module', '-e', wrapper];
      const spawnOptions: SpawnOptions = { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] };
      const child = spawn(process.execPath, args, spawnOptions);
      const closed = once(child, 'close');
      let children: { runner: number; worker: number } | undefined;
      try {
        const deadline = Date.now() + 5000;
        while (!children && Date.now() < deadline) {
          try {
            const content = await readFile(pidFile, 'utf8');
            children = JSON.parse(content) as typeof children;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
        }
        if (!children) throw new Error('Controlled runner did not become ready');
        const firstSignal = signal === 'SIGTERM' ? once(child, 'message') : undefined;
        if (process.platform === 'win32') child.send(signal);
        else child.kill(signal as NodeJS.Signals);
        if (firstSignal) {
          await firstSignal;
          if (process.platform === 'win32') child.send(signal);
          else child.kill(signal as NodeJS.Signals);
        }
        const [code] = await closed;
        const expected = signal === 'SIGINT' ? 130 : 143;
        expect(code).toBe(expected);
        for (const pid of [children.runner, children.worker]) {
          expect(() => process.kill(pid, 0)).toThrow();
        }
        expect(await readdir(resultsRoot)).toEqual([]);
      } finally {
        if (children) {
          for (const pid of [children.runner, children.worker]) {
            try {
              if (process.platform === 'win32') {
                const args = ['/PID', String(pid), '/T', '/F'];
                const options = { stdio: 'ignore', windowsHide: true, timeout: 3000 } as const;
                spawnSync('taskkill.exe', args, options);
              } else process.kill(pid, 'SIGKILL');
            } catch {
              /* Already stopped owned processes need no further cleanup. */
            }
          }
        }
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await closed;
      }
    },
  );

  it('preserves statuses, diagnostics, timing and retry evidence', async () => {
    const run = await fixture('complete');
    expect(run.code).not.toBe(0);
    expect(run.results).toHaveLength(4);
    expect(run.results.map((item) => item.status).sort()).toEqual(['failed', 'passed', 'passed', 'skipped']);
    const failed = run.results.find((item) => item.status === 'failed');
    expect(failed?.statusDetails.trace).toContain('cases.fixture.ts');
    const retry = run.results.find((item) => item.name.includes('retries'));
    expect(retry?.parameters).toContainEqual({ name: 'retry', value: '1', excluded: true });
    expect(retry?.statusDetails.flaky).toBe(true);
    for (const result of run.results) expect(result.stop).toBeGreaterThanOrEqual(result.start);
  });
  it.each(['import', 'collection', 'hook', 'after-hook', 'unhandled'])(
    'retains %s runner failures',
    async (scenario) => {
      const run = await fixture(scenario);
      expect(run.code).not.toBe(0);
      expect(run.results.some((item) => item.status === 'broken' || item.status === 'failed')).toBe(true);
      expect(
        run.results.some(
          (item) =>
            item.statusDetails.message?.includes('Fixture') ||
            item.statusDetails.message?.includes('Import') ||
            item.statusDetails.message?.includes('No test suite'),
        ),
      ).toBe(true);
    },
  );
  it.each(['empty', 'write-fault', 'no-reporter'])('rejects %s incomplete evidence', async (scenario) => {
    await expect(fixture(scenario)).rejects.toThrow('no complete manifest');
  });
  it('rejects a reporting write failure and an existing run', async () => {
    const run = await fixture('pass');
    const existing = { root: run.root, runId: 'fixture', suite: 'unit', config };
    await expect(cli.collectReport(existing)).rejects.toThrow();
    const faultRoot = path.join(run.root, 'fault');
    await writeFile(faultRoot, 'not a directory');
    const fault = { root: faultRoot, runId: 'fault', suite: 'unit', config };
    await expect(cli.collectReport(fault)).rejects.toThrow();
  });
  // Two real HTML generations and history validation need headroom on slower CI runners.
  it('generates real HTML, re-redacts modified evidence and preserves launch history', async () => {
    const run = await fixture('complete');
    const names = await readdir(run.directory);
    const filename = names.find((name) => name.endsWith('-result.json'));
    expect(filename).toBeDefined();
    const target = path.join(run.directory, filename || 'absent');
    const raw = await readFile(target, 'utf8');
    const modified = JSON.parse(raw) as ReportResult;
    const canary = 'generation-synthetic-canary';
    modified.statusDetails.message = canary;
    await writeFile(target, JSON.stringify(modified));
    const input = path.dirname(run.directory);
    const output = path.join(run.root, 'first-report');
    const generation = { input, output, secretValues: [canary] };
    await cli.generateReport(generation);
    const summary = JSON.parse(await readFile(path.join(output, 'summary.json'), 'utf8')) as {
      stats: Record<string, number>;
      flakyTests: string[];
    };
    expect(summary.stats).toMatchObject({ total: 4, passed: 2, failed: 1, skipped: 1 });
    expect(summary.flakyTests).toHaveLength(1);
    const allFiles = await readdir(output, { recursive: true });
    const diagnosticFiles = allFiles.filter((filename) => /\.(?:json|jsonl|html|txt)$/.test(filename));
    for (const filename of diagnosticFiles) {
      const full = path.join(output, filename);
      expect(await readFile(full, 'utf8')).not.toContain(canary);
    }
    const history = path.join(output, 'history.jsonl');
    const secondOutput = path.join(run.root, 'second-report');
    const second = { input, output: secondOutput, history, secretValues: [canary] };
    await cli.generateReport(second);
    const launches = await readFile(path.join(secondOutput, 'history.jsonl'), 'utf8');
    expect(launches.split('\n').filter(Boolean)).toHaveLength(2);
    const html = await readFile(path.join(output, 'index.html'), 'utf8');
    expect(html).toContain('<html');
    await expect(cli.generateReport(generation)).rejects.toThrow('already exists');
  }, 60_000);
  it.each(['linux', 'darwin', 'win32'])(
    'keeps operating system variants distinct in real Allure output from %s',
    async (initialOs) => {
      const run = await fixture('pass');
      const files = await readdir(run.directory);
      const filename = files.find((name) => name.endsWith('-result.json')) || 'absent';
      const source = path.join(run.directory, filename);
      const result = JSON.parse(await readFile(source, 'utf8')) as ReportResult & { uuid: string };
      result.labels = result.labels.map((label) =>
        label.name === 'os' ? { ...label, value: initialOs } : label,
      );
      const originalResult = JSON.stringify(result);
      await writeFile(source, originalResult);
      result.uuid = randomUUID();
      const sourceOs = result.labels.find((label) => label.name === 'os')?.value;
      const alternateOs = sourceOs === 'win32' ? 'linux' : 'win32';
      result.labels = result.labels.map((label) =>
        label.name === 'os' ? { ...label, value: alternateOs } : label,
      );
      const duplicateName = `${result.uuid}-result.json`;
      await writeFile(path.join(run.directory, duplicateName), JSON.stringify(result));
      const manifestPath = path.join(run.directory, 'producer.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        count: number;
        results: string[];
      };
      manifest.results.push(duplicateName);
      manifest.count += 1;
      await writeFile(manifestPath, JSON.stringify(manifest));
      const input = path.dirname(run.directory);
      const output = path.join(run.root, 'variants-report');
      await cli.generateReport({ input, output });
      const summary = JSON.parse(await readFile(path.join(output, 'summary.json'), 'utf8')) as {
        stats: { total: number };
      };
      expect(summary.stats.total).toBe(2);
      const tests = JSON.parse(await readFile(path.join(output, 'test-results.json'), 'utf8')) as {
        byId: Record<string, { environment: string }>;
      };
      const environments = Object.values(tests.byId).map((test) => test.environment);
      expect(new Set(environments).size).toBe(2);
    },
  );
  it('redacts known secrets in history keys and credential values before real HTML generation', async () => {
    const run = await fixture('pass');
    const input = path.dirname(run.directory);
    const firstOutput = path.join(run.root, 'history-source');
    const first = { input, output: firstOutput };
    await cli.generateReport(first);
    const history = path.join(firstOutput, 'history.jsonl');
    const content = await readFile(history, 'utf8');
    const original = JSON.parse(content.trim()) as Record<string, unknown>;
    const secret = 'history-synthetic-canary';
    original.extra = { [secret]: 'preserved', password: 'synthetic-history-password' };
    const modified = `${JSON.stringify(original)}\n`;
    await writeFile(history, modified);
    const output = path.join(run.root, 'history-redacted');
    const options = { input, output, history, secretValues: [secret] };
    await cli.generateReport(options);
    const safeHistory = await readFile(path.join(output, 'history.jsonl'), 'utf8');
    expect(safeHistory).not.toContain(secret);
    expect(safeHistory).not.toContain('synthetic-history-password');
    expect(safeHistory).toContain('preserved');
    const files = await readdir(output, { recursive: true });
    for (const file of files.filter((name) => /\.(?:json|jsonl|html|txt)$/.test(name))) {
      const filename = path.join(output, file);
      const content = await readFile(filename, 'utf8');
      expect(content).not.toContain(secret);
      expect(content).not.toContain('synthetic-history-password');
    }
  });
  it('rejects missing manifests and unverified reports', async () => {
    const run = await fixture('pass');
    const manifest = path.join(run.directory, 'producer.json');
    await rm(manifest);
    const input = path.dirname(run.directory);
    const output = path.join(run.root, 'bad-report');
    await expect(cli.generateReport({ input, output })).rejects.toThrow();
    await expect(cli.openReport(run.root)).rejects.toThrow();
  });
  it('generates HTML from a validated CLI aggregate and checks expected producers', async () => {
    const run = await fixture('pass');
    const input = path.dirname(run.directory);
    const output = path.join(run.root, 'merged-run');
    const wrong = { input, output, expected: 'unit,integration' };
    await expect(cli.mergeReport(wrong)).rejects.toThrow('expected producers');
    const merge = { input, output, expected: 'unit' };
    await cli.mergeReport(merge);
    const report = path.join(run.root, 'merged-report');
    await cli.generateReport({ input: output, output: report });
    const summary = JSON.parse(await readFile(path.join(report, 'summary.json'), 'utf8')) as {
      stats: { total: number };
    };
    expect(summary.stats.total).toBe(1);
    await expect(cli.mergeReport(merge)).rejects.toThrow();
  });
  it.each(['unit', 'integration', 'cli', 'npm', 'cdp', 'docker'])(
    'labels the %s lane explicitly',
    async (suite) => {
      const run = await fixture('pass', suite);
      expect(run.code).toBe(0);
      expect(run.results[0]?.labels).toContainEqual({ name: 'lane', value: suite });
      const level = suite === 'unit' || suite === 'integration' ? suite : 'e2e';
      expect(run.results[0]?.labels).toContainEqual({ name: 'level', value: level });
    },
  );
});
