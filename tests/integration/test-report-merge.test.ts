import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';

// Exercise the full count-boundary flow without creating 30000 native files.
// Real filesystem safety, atomic publication and cleanup have separate integration tests.
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  const files = new Map<string, Buffer>();
  const source = new URL(import.meta.url);
  const metadata = await original.stat(source);
  const fileStat = (filename: string) => {
    const bytes = files.get(filename);
    if (!bytes) throw new Error('Missing virtual evidence');
    return { ...metadata, size: bytes.length, isFile: () => true, isSymbolicLink: () => false };
  };
  const removeFiles = (directory: string) => {
    const prefix = directory + path.sep;
    for (const filename of files.keys()) {
      if (filename === directory || filename.startsWith(prefix)) files.delete(filename);
    }
  };
  return {
    ...original,
    open: async (...args: Parameters<typeof original.open>) => {
      const filename = String(args[0]);
      if (args[1] === 'wx') {
        if (files.has(filename)) {
          const error = new Error('Already exists');
          const fields = { code: 'EEXIST' };
          Object.assign(error, fields);
          throw error;
        }
        const empty = Buffer.alloc(0);
        files.set(filename, empty);
      } else if (!files.has(filename)) return original.open(...args);
      const handle = {
        writeFile: async (data: string | Buffer) => {
          const bytes = Buffer.from(data);
          files.set(filename, bytes);
        },
        stat: async () => fileStat(filename),
        read: async (buffer: Buffer, offset: number, length: number, position: number) => {
          const bytes = files.get(filename);
          if (!bytes) throw new Error('Missing virtual evidence');
          const end = position + length;
          const bytesRead = bytes.copy(buffer, offset, position, end);
          return { bytesRead, buffer };
        },
        sync: async () => undefined,
        close: async () => undefined,
      };
      return handle as unknown as Awaited<ReturnType<typeof original.open>>;
    },
    lstat: async (...args: Parameters<typeof original.lstat>) => {
      const filename = String(args[0]);
      if (!files.has(filename)) return original.lstat(...args);
      return fileStat(filename);
    },
    realpath: async (...args: Parameters<typeof original.realpath>) => {
      const filename = String(args[0]);
      if (!files.has(filename)) return original.realpath(...args);
      return filename;
    },
    readFile: async (...args: Parameters<typeof original.readFile>) => {
      if (typeof args[0] !== 'string') return original.readFile(...args);
      const filename = args[0];
      const bytes = files.get(filename);
      if (!bytes) return original.readFile(...args);
      return args[1] === 'utf8' ? bytes.toString('utf8') : Buffer.from(bytes);
    },
    writeFile: async (...args: Parameters<typeof original.writeFile>) => {
      if (typeof args[0] !== 'string' || typeof args[1] !== 'string') return original.writeFile(...args);
      const filename = args[0];
      if (!files.has(filename)) return original.writeFile(...args);
      const bytes = Buffer.from(args[1]);
      files.set(filename, bytes);
    },
    readdir: async (...args: Parameters<typeof original.readdir>) => {
      const directory = String(args[0]);
      const options = args[1];
      if (typeof options === 'object' && options?.withFileTypes) return original.readdir(...args);
      const entries = await original.readdir(directory);
      for (const filename of files.keys()) {
        const parent = path.dirname(filename);
        if (parent === directory) {
          const name = path.basename(filename);
          entries.push(name);
        }
      }
      return entries;
    },
    rename: async (...args: Parameters<typeof original.rename>) => {
      await original.rename(...args);
      const source = String(args[0]);
      const destination = String(args[1]);
      const prefix = source + path.sep;
      for (const [filename, bytes] of [...files]) {
        if (!filename.startsWith(prefix)) continue;
        const suffix = filename.slice(source.length);
        const target = destination + suffix;
        files.set(target, bytes);
        files.delete(filename);
      }
    },
    rm: async (...args: Parameters<typeof original.rm>) => {
      await original.rm(...args);
      const directory = String(args[0]);
      removeFiles(directory);
    },
  };
});

interface Reporting {
  mergeReport: (options: Record<string, unknown>) => Promise<string>;
}
interface Evidence {
  writeTestResult: (options: Record<string, unknown>) => Promise<string>;
  mergeTestResults: (options: Record<string, unknown>) => Promise<string>;
}
const reportingModule = import.meta.resolve('#scripts/test-report');
const evidenceModule = import.meta.resolve('#scripts/lib/test-results');
const { mergeReport } = (await import(reportingModule)) as Reporting;
const { writeTestResult, mergeTestResults } = (await import(evidenceModule)) as Evidence;

it('keeps 10001 merged results readable without enlarging individual producer limits', async () => {
  const temporary = tmpdir();
  const prefix = path.join(temporary, 'report-large-merge-');
  const directory = await mkdtemp(prefix);
  const root = await realpath(directory);
  try {
    const runId = 'original';
    const ids = ['first', 'second'];
    const counts = [6000, 4001];
    let failedFile = '';
    for (const [index, producerId] of ids.entries()) {
      const count = counts[index];
      const allocation = { length: count };
      const results = Array.from(allocation, (_, caseIndex) => {
        const uuid = randomUUID();
        const failed = index === 1 && caseIndex === count - 1;
        if (failed) failedFile = `${uuid}-result.json`;
        return {
          uuid,
          file: 'tests/unit/controlled.test.ts',
          name: `${producerId} case ${caseIndex}`,
          project: 'unit',
          feature: 'reporting',
          level: 'unit',
          status: failed ? 'failed' : 'passed',
          start: 10,
          stop: 20,
          retry: 0,
          environment: { os: 'linux', arch: 'x64', node: '24', browser: 'none', lane: 'pr' },
          attachments:
            caseIndex === 0 ? [{ name: 'log', type: 'text/plain', data: `Controlled ${producerId}` }] : [],
        };
      });
      const options = { root, runId, producerId, results };
      await writeTestResult(options);
    }
    const input = path.join(root, runId);
    const output = path.join(root, 'merged-run');
    const expected = ids.join(',');
    const merge = { input, output, expected };
    await mergeReport(merge);
    const directories = await readdir(output);
    const sorted = directories.sort();
    expect(sorted).toEqual(ids);
    for (const [index, id] of ids.entries()) {
      const filename = path.join(output, id, 'producer.json');
      const bytes = await readFile(filename, 'utf8');
      const manifest = JSON.parse(bytes) as { count: number; runId: string; producerId: string };
      const expectedManifest = { count: counts[index], runId: 'merged-run', producerId: id };
      expect(manifest).toMatchObject(expectedManifest);
    }
    // Use the same strict reader as generateReport, including its per-manifest limit.
    const outputDir = path.join(root, 'readback');
    const reading = { root, runId: 'merged-run', producerIds: ids, outputDir };
    await mergeTestResults(reading);
    const files = await readdir(outputDir);
    const resultFiles = files.filter((filename) => filename.endsWith('-result.json'));
    const attachments = files.filter((filename) => filename.endsWith('-attachment.txt'));
    expect(resultFiles).toHaveLength(10001);
    expect(attachments).toHaveLength(2);
    const failedPath = path.join(outputDir, failedFile);
    const failedBytes = await readFile(failedPath, 'utf8');
    const failure = JSON.parse(failedBytes) as { status: string };
    expect(failure.status).toBe('failed');
    const repeated = mergeReport(merge);
    await expect(repeated).rejects.toThrow('already exists');
    const manifestPath = path.join(output, 'first', 'producer.json');
    const manifestBytes = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestBytes) as { count: number; results: string[] };
    manifest.results = resultFiles;
    manifest.count = resultFiles.length;
    const oversized = JSON.stringify(manifest);
    await writeFile(manifestPath, oversized);
    const rejectedOutput = path.join(root, 'oversized-run');
    const invalid = { input: output, output: rejectedOutput, expected };
    const rejection = mergeReport(invalid);
    await expect(rejection).rejects.toThrow('incomplete producer');
    const rootEntries = await readdir(root);
    expect(rootEntries).not.toContain('oversized-run');
  } finally {
    const cleanup = { recursive: true, force: true };
    await rm(root, cleanup);
  }
}, 60000);
