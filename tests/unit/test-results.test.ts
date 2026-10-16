import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { controlledPng as png } from '@tests/fixtures/reporting/controlled-png.js';

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof fs>();
  return { ...original, open: vi.fn(original.open) };
});
const originalFs = await vi.importActual<typeof fs>('node:fs/promises');

interface Results {
  writeTestResult: (options: Record<string, unknown>) => Promise<string>;
  mergeTestResults: (options: Record<string, unknown>) => Promise<string>;
}
const moduleUrl = new URL('../../scripts/lib/test-results.mjs', import.meta.url);
const { writeTestResult, mergeTestResults } = (await import(moduleUrl.href)) as Results;
const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  vi.mocked(fs.open).mockImplementation(originalFs.open);
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

async function options() {
  const prefix = path.join(tmpdir(), 'cloak-results-');
  const temporary = await fs.mkdtemp(prefix);
  const root = await fs.realpath(temporary);
  roots.push(root);
  return { root, runId: 'run-1', producerId: 'linux-unit', results: [record('passed')] };
}
function record(status: string) {
  return {
    uuid: randomUUID(),
    file: 'tests/unit/example.test.ts',
    name: 'preserves status',
    project: 'unit',
    feature: 'profiles',
    level: 'unit',
    status,
    start: 1000,
    stop: 1010,
    retry: 1,
    environment: { os: 'linux', arch: 'x64', node: '24', browser: 'free', lane: 'pr' },
    error: { message: 'fixture failed password=synthetic-password', stack: 'at fixture:1' },
    attachments: [{ name: 'stderr', type: 'text/plain', data: 'Bearer synthetic-bearer' }],
  };
}

describe('atomic producer evidence', () => {
  it('drains a bounded parallel write batch before cleaning up a failed publication', async () => {
    const input = await options();
    const allocation = { length: 20 };
    input.results = Array.from(allocation, () => record('passed'));
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let opened = 0;
    let closed = 0;
    let gated = false;
    let settled = false;
    vi.mocked(fs.open).mockImplementation(async (...args) => {
      const handle = await originalFs.open(...args);
      const sequence = ++opened;
      const close = handle.close.bind(handle);
      vi.spyOn(handle, 'close').mockImplementationOnce(async () => {
        await close();
        closed += 1;
      });
      vi.spyOn(handle, 'sync').mockImplementationOnce(async () => {
        if (sequence === 1) throw new Error('Controlled flush failure');
        gated = true;
        await gate;
      });
      return handle;
    });
    const writing = writeTestResult(input);
    void writing.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    try {
      await expect.poll(() => gated).toBe(true);
      expect(settled).toBe(false);
      expect(opened).toBeGreaterThan(1);
      expect(opened).toBeLessThan(input.results.length);
      const runRoot = path.join(input.root, input.runId);
      const pending = await originalFs.readdir(runRoot);
      expect(pending).toHaveLength(1);
    } finally {
      release?.();
      await writing.catch(() => undefined);
    }
    await expect(writing).rejects.toThrow('producer write/flush failed');
    expect(closed).toBe(opened);
    const runRoot = path.join(input.root, input.runId);
    const remaining = await originalFs.readdir(runRoot);
    expect(remaining).toHaveLength(0);
  });

  it('bounds read allocation to descriptor size and rejects growth before publishing', async () => {
    const input = await options();
    const directory = await writeTestResult(input);
    const filename = `${input.results[0].uuid}-result.json`;
    const target = path.join(directory, filename);
    const bytes = await originalFs.readFile(target);
    const capacity = bytes.length + 1;
    const allocation = vi.spyOn(Buffer, 'alloc');
    vi.mocked(fs.open).mockImplementation(async (...args) => {
      const handle = await originalFs.open(...args);
      if (args[0] === target) {
        const stat = handle.stat.bind(handle);
        vi.spyOn(handle, 'stat').mockImplementationOnce(async () => {
          const snapshot = await stat();
          await originalFs.appendFile(target, 'x');
          return snapshot;
        });
      }
      return handle;
    });
    const outputDir = path.join(input.root, 'merged');
    const producerIds = [input.producerId];
    const reading = { root: input.root, runId: input.runId, producerIds, outputDir };
    const merging = mergeTestResults(reading);
    await expect(merging).rejects.toThrow('changed evidence file');
    expect(allocation).toHaveBeenCalledWith(capacity);
    const entries = await originalFs.readdir(input.root);
    expect(entries).not.toContain('merged');
  });

  it('accepts canonical temporary roots while continuing to reject symlink aliases', async () => {
    const input = await options();
    const physical = path.join(input.root, 'physical');
    const alias = path.join(input.root, 'alias');
    await fs.mkdir(physical);
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    await fs.symlink(physical, alias, type);
    const unsafe = { ...input, root: alias };
    await expect(writeTestResult(unsafe)).rejects.toThrow('unsafe directory');
    const canonical = await fs.realpath(alias);
    const safe = { ...input, root: canonical };
    const directory = await writeTestResult(safe);
    const manifest = path.join(directory, 'producer.json');
    await fs.access(manifest);
  });
  it('persists all statuses, stable history, retry, grouping and safe attachments', async () => {
    const input = await options();
    input.results = ['passed', 'failed', 'broken', 'skipped'].map(record);
    const directory = await writeTestResult(input);
    const entries = await fs.readdir(directory);
    const results = [];
    for (const entry of entries.filter((name) => name.endsWith('-result.json'))) {
      const filename = path.join(directory, entry);
      const content = await fs.readFile(filename, 'utf8');
      expect(content).not.toContain('synthetic-password');
      results.push(JSON.parse(content) as Record<string, unknown>);
    }
    const statuses = results.map((result) => result.status).sort();
    expect(statuses).toEqual(['broken', 'failed', 'passed', 'skipped']);
    const histories = new Set(results.map((result) => result.historyId));
    expect(histories.size).toBe(1);
    expect(results[0]).toMatchObject({ start: 1000, stop: 1010 });
    const allText = [];
    for (const entry of entries) {
      const filename = path.join(directory, entry);
      allText.push(await fs.readFile(filename, 'utf8'));
    }
    const serialized = allText.join('\n');
    expect(serialized).not.toContain('synthetic-bearer');
    expect(serialized).toContain('profiles');
    expect(serialized).toContain('retry');
    const manifestPath = path.join(directory, 'producer.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    expect(manifest).toMatchObject({ complete: true, producerId: 'linux-unit', count: 4 });
  });

  it.each(['empty', 'status', 'timing', 'path', 'environment', 'unknown field', 'uuid', 'attachments'])(
    'rejects invalid %s before publishing any files',
    async (kind) => {
      const input = await options();
      const result: Record<string, unknown> = record('passed');
      if (kind === 'status') result.status = 'unknown';
      if (kind === 'timing') result.stop = 999;
      if (kind === 'path') result.file = '../private';
      if (kind === 'environment') result.environment = { env: process.env };
      if (kind === 'unknown field') result.descriptionHtml = '<script>bad()</script>';
      if (kind === 'uuid') result.uuid = '../../escape';
      if (kind === 'attachments')
        result.attachments = [{ name: 'binary', type: 'application/octet-stream', data: 'bad' }];
      const records = kind === 'empty' ? [] : [result];
      const invalid = { ...input, results: records };
      await expect(writeTestResult(invalid)).rejects.toThrow('Test evidence');
      expect(await fs.readdir(input.root)).toEqual([]);
    },
  );

  it('does not overwrite an existing producer', async () => {
    const input = await options();
    const directory = await writeTestResult(input);
    await expect(writeTestResult(input)).rejects.toThrow('Test evidence');
    const entries = await fs.readdir(directory);
    expect(entries).toHaveLength(3);
  });

  it('preserves bounded multiline stack traces rather than a short label limit', async () => {
    const input = await options();
    const trace = 'at controlled-fixture:1\n'.repeat(300);
    input.results[0].error.stack = trace;
    const directory = await writeTestResult(input);
    const filename = path.join(directory, `${input.results[0].uuid}-result.json`);
    const result = JSON.parse(await fs.readFile(filename, 'utf8')) as { statusDetails: { trace: string } };
    expect(result.statusDetails.trace).toBe(trace);
  });

  it('preserves explicit flaky evidence without inventing it from retry count', async () => {
    const input = await options();
    const explicit = { ...record('passed'), flaky: true };
    const results = [input.results[0], explicit];
    const directory = await writeTestResult({ ...input, results });
    const observed = [];
    for (const result of results) {
      const filename = path.join(directory, `${result.uuid}-result.json`);
      observed.push(
        JSON.parse(await fs.readFile(filename, 'utf8')) as { statusDetails: Record<string, unknown> },
      );
    }
    expect(observed[0].statusDetails).not.toHaveProperty('flaky');
    expect(observed[1].statusDetails).toHaveProperty('flaky', true);
  });

  it('rejects aggregate attachment size before writing any files', async () => {
    const input = await options();
    const diagnosticUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
    const limits = (await import(diagnosticUrl.href)) as { TEXT_LIMIT: number; ATTACHMENT_LIMIT: number };
    const text = 'x'.repeat(limits.TEXT_LIMIT);
    const count = Math.floor(limits.ATTACHMENT_LIMIT / limits.TEXT_LIMIT) + 1;
    input.results[0].attachments = Array.from({ length: count }, () => ({
      name: 'log',
      type: 'text/plain',
      data: text,
    }));
    await expect(writeTestResult(input)).rejects.toThrow('oversized attachments');
    expect(await fs.readdir(input.root)).toEqual([]);
  });

  it('isolates concurrent producer batches and rejects a concurrent same-producer write', async () => {
    const input = await options();
    const second = { ...input, producerId: 'macos-unit', results: [record('failed')] };
    const batches = [writeTestResult(input), writeTestResult(second)];
    const paths = await Promise.all(batches);
    expect(new Set(paths).size).toBe(2);
    const competing = { ...input, producerId: 'competing', results: [record('passed')] };
    const writes = [writeTestResult(competing), writeTestResult(competing)];
    const settled = await Promise.allSettled(writes);
    expect(settled.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(settled.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const runRoot = path.join(input.root, input.runId);
    expect((await fs.readdir(runRoot)).sort()).toEqual(['competing', 'linux-unit', 'macos-unit']);
  });

  it('rejects secret-bearing producer identity rather than persisting it in a manifest', async () => {
    const input = await options();
    const invalid = {
      ...input,
      producerId: 'synthetic-private-producer',
      secretValues: ['synthetic-private'],
    };
    await expect(writeTestResult(invalid)).rejects.toThrow('Test evidence');
    expect(await fs.readdir(input.root)).toEqual([]);
  });

  it('writes registered PNG bytes and rejects forged screenshot data without residue', async () => {
    const input = await options();
    const diagnosticUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
    const diagnostics = (await import(diagnosticUrl.href)) as {
      registerControlledScreenshot: (bytes: Buffer, url: string) => unknown;
    };
    const data = diagnostics.registerControlledScreenshot(png, 'http://127.0.0.1/fixture');
    const result = { ...input.results[0], attachments: [{ name: 'fixture', type: 'image/png', data }] };
    const directory = await writeTestResult({ ...input, results: [result] });
    const entries = await fs.readdir(directory);
    const attachment = entries.find((name) => name.endsWith('.png'));
    if (!attachment) throw new Error('PNG evidence missing');
    const filename = path.join(directory, attachment);
    expect(await fs.readFile(filename)).toEqual(png);
    const forged = {
      ...input,
      producerId: 'forged',
      results: [
        {
          ...result,
          attachments: [
            { name: 'remote', type: 'image/png', data: { bytes: png, provenance: 'controlled-local' } },
          ],
        },
      ],
    };
    await expect(writeTestResult(forged)).rejects.toThrow('Test evidence');
    const runRoot = path.join(input.root, input.runId);
    expect(await fs.readdir(runRoot)).toEqual(['linux-unit']);
  });

  it.each(['write', 'flush'])('cleans staged evidence after %s failure', async (operation) => {
    const input = await options();
    vi.mocked(fs.open).mockImplementation(async (...args) => {
      const handle = await originalFs.open(...args);
      const method = operation === 'write' ? 'writeFile' : 'sync';
      vi.spyOn(handle, method).mockRejectedValueOnce(new Error('synthetic I/O failure'));
      return handle;
    });
    await expect(writeTestResult(input)).rejects.toThrow('Test evidence');
    const runRoot = path.join(input.root, input.runId);
    expect(await fs.readdir(runRoot)).toEqual([]);
    vi.restoreAllMocks();
    vi.mocked(fs.open).mockImplementation(originalFs.open);
    await writeTestResult(input);
    expect(await fs.readdir(runRoot)).toEqual([input.producerId]);
  });
});
