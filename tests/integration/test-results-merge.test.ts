import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { crc32 } from 'node:zlib';
import { controlledPng } from '@tests/fixtures/reporting/controlled-png.js';

interface Results {
  writeTestResult: (options: Record<string, unknown>) => Promise<string>;
  mergeTestResults: (options: Record<string, unknown>) => Promise<string>;
}
const moduleUrl = new URL('../../scripts/lib/test-results.mjs', import.meta.url);
const { writeTestResult, mergeTestResults } = (await import(moduleUrl.href)) as Results;
const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const prefix = path.join(tmpdir(), 'cloak-merge-');
  const temporary = await mkdtemp(prefix);
  const root = await realpath(temporary);
  roots.push(root);
  const runId = 'run-1';
  const producers: string[] = [];
  async function producer(id: string, os: string, status = 'passed', uuid = randomUUID()) {
    const result = {
      uuid,
      file: 'tests/unit/example.test.ts',
      name: 'same identity',
      project: 'unit',
      feature: 'profiles',
      level: 'unit',
      status,
      start: 1000,
      stop: 1010,
      retry: 0,
      environment: { os, arch: 'x64', node: '24', browser: 'free', lane: 'pr' },
      attachments: [{ name: 'stderr', type: 'text/plain', data: 'fixture log' }],
    };
    producers.push(id);
    return writeTestResult({ root, runId, producerId: id, results: [result] });
  }
  const outputDir = path.join(root, 'merged');
  const input = { root, runId, producerIds: producers, outputDir };
  return { root, producer, input, outputDir };
}

describe('untrusted cross-job evidence merge', () => {
  it.each(['checksum', 'metadata'])('rejects PNG %s tampering before aggregate publication', async (kind) => {
    const f = await fixture();
    const directory = await f.producer('linux', 'linux');
    const entries = await readdir(directory);
    const name = entries.find((entry) => entry.endsWith('-result.json'));
    const text = entries.find((entry) => entry.endsWith('.txt'));
    if (!name || !text) throw new Error('Controlled evidence missing');
    const resultPath = path.join(directory, name);
    const result = JSON.parse(await readFile(resultPath, 'utf8')) as { attachments: unknown[] };
    const source = `${randomUUID()}-attachment.png`;
    const image = Buffer.from(controlledPng);
    let corrupted = image;
    if (kind === 'checksum') image[45] ^= 1;
    else {
      const payload = Buffer.from('synthetic-png-payload');
      const size = payload.length + 12;
      const chunk = Buffer.alloc(size);
      chunk.writeUInt32BE(payload.length);
      chunk.write('sRGB', 4, 'ascii');
      payload.copy(chunk, 8);
      const offset = size - 4;
      const input = chunk.subarray(4, offset);
      const checksum = crc32(input);
      chunk.writeUInt32BE(checksum, offset);
      const header = image.subarray(0, 33);
      const rest = image.subarray(33);
      const parts = [header, chunk, rest];
      corrupted = Buffer.concat(parts);
    }
    result.attachments = [{ name: 'fixture', type: 'image/png', source, provenance: 'controlled-local' }];
    const serialized = JSON.stringify(result);
    await writeFile(resultPath, serialized);
    const textPath = path.join(directory, text);
    await rm(textPath);
    const imagePath = path.join(directory, source);
    await writeFile(imagePath, corrupted);
    await expect(mergeTestResults(f.input)).rejects.toThrow('Test evidence');
    expect(await readdir(f.root)).not.toContain('merged');
  });
  it('preserves environment variants, failures and referenced attachments', async () => {
    const f = await fixture();
    await f.producer('linux', 'linux');
    await f.producer('windows', 'windows', 'failed');
    await mergeTestResults(f.input);
    const entries = await readdir(f.outputDir);
    const results = [];
    for (const entry of entries.filter((name) => name.endsWith('-result.json'))) {
      const filename = path.join(f.outputDir, entry);
      const result = JSON.parse(await readFile(filename, 'utf8')) as {
        status: string;
        historyId: string;
        testCaseId: string;
        attachments: { source: string }[];
      };
      results.push(result);
      const source = path.join(f.outputDir, result.attachments[0].source);
      expect(await readFile(source, 'utf8')).toBe('fixture log');
    }
    expect(results.map((result) => result.status).sort()).toEqual(['failed', 'passed']);
    expect(new Set(results.map((result) => result.historyId)).size).toBe(2);
    expect(new Set(results.map((result) => result.testCaseId)).size).toBe(1);
  });

  it('redacts producer JSON and text attachments again', async () => {
    const f = await fixture();
    const directory = await f.producer('linux', 'linux');
    const entries = await readdir(directory);
    for (const entry of entries) {
      const filename = path.join(directory, entry);
      if (entry.endsWith('.txt')) await writeFile(filename, 'Bearer synthetic-injected');
      if (entry.endsWith('-result.json')) {
        const result = JSON.parse(await readFile(filename, 'utf8')) as Record<string, unknown>;
        result.name = 'password=synthetic-injected';
        await writeFile(filename, JSON.stringify(result));
      }
    }
    await mergeTestResults(f.input);
    for (const entry of await readdir(f.outputDir)) {
      const filename = path.join(f.outputDir, entry);
      expect(await readFile(filename, 'utf8')).not.toContain('synthetic-injected');
    }
  });

  it.each([
    'missing producer',
    'incomplete',
    'traversal',
    'symlink',
    'unknown metadata',
    'missing attachment',
  ])('rejects %s without publishing a partial aggregate', async (kind) => {
    const f = await fixture();
    const directory = await f.producer('linux', 'linux');
    const manifestPath = path.join(directory, 'producer.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    if (kind === 'missing producer') f.input.producerIds.push('absent');
    if (kind === 'incomplete') manifest.complete = false;
    if (kind === 'traversal') manifest.results = ['../private-result.json'];
    if (kind === 'unknown metadata') manifest.executable = 'malicious.js';
    await writeFile(manifestPath, JSON.stringify(manifest));
    const entries = await readdir(directory);
    const attachment = entries.find((entry) => entry.endsWith('.txt'));
    if (!attachment) throw new Error('Fixture attachment missing');
    const attachmentPath = path.join(directory, attachment);
    if (kind === 'symlink' || kind === 'missing attachment') await rm(attachmentPath);
    if (kind === 'symlink') {
      const target = path.join(f.root, 'external.txt');
      await writeFile(target, 'external');
      await symlink(target, attachmentPath, 'file');
    }
    await expect(mergeTestResults(f.input)).rejects.toThrow('Test evidence');
    const entriesAfter = await readdir(f.root);
    const expected = kind === 'symlink' ? ['external.txt', 'run-1'] : ['run-1'];
    expect(entriesAfter).toEqual(expected);
  });

  const outputRunIds = [undefined, 'preserved-run'];
  it.each(outputRunIds)('rejects conflicting UUID content with outputRunId=%s', async (outputRunId) => {
    const f = await fixture();
    const uuid = randomUUID();
    await f.producer('linux', 'linux', 'passed', uuid);
    await f.producer('windows', 'windows', 'failed', uuid);
    const options = { ...f.input, outputRunId };
    await expect(mergeTestResults(options)).rejects.toThrow('conflicting UUID');
  });

  it('deduplicates byte-identical UUID evidence and never overwrites an aggregate', async () => {
    const f = await fixture();
    const first = await f.producer('first', 'linux');
    const second = path.join(f.root, 'run-1', 'second');
    await cp(first, second, { recursive: true });
    const manifestPath = path.join(second, 'producer.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    manifest.producerId = 'second';
    await writeFile(manifestPath, JSON.stringify(manifest));
    f.input.producerIds.push('second');
    await mergeTestResults(f.input);
    const entries = await readdir(f.outputDir);
    expect(entries).toHaveLength(2);
    await expect(mergeTestResults(f.input)).rejects.toThrow('destination already exists');
    expect(await readdir(f.outputDir)).toEqual(entries);
  });

  it('rejects distinct UUID content even when redaction makes it identical', async () => {
    const f = await fixture();
    const first = await f.producer('first', 'linux');
    const second = path.join(f.root, 'run-1', 'second');
    await cp(first, second, { recursive: true });
    const manifestPath = path.join(second, 'producer.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
    manifest.producerId = 'second';
    await writeFile(manifestPath, JSON.stringify(manifest));
    f.input.producerIds.push('second');
    for (const [directory, secret] of [
      [first, 'synthetic-first'],
      [second, 'synthetic-second'],
    ]) {
      const entries = await readdir(directory);
      const attachment = entries.find((name) => name.endsWith('.txt'));
      if (!attachment) throw new Error('Fixture attachment missing');
      const filename = path.join(directory, attachment);
      await writeFile(filename, `Bearer ${secret}`);
    }
    await expect(mergeTestResults(f.input)).rejects.toThrow('conflicting UUID');
    expect(await readdir(f.root)).not.toContain('merged');
  });

  it.each([
    'malformed JSON',
    'unsupported version',
    'result symlink',
    'unknown result field',
    'extra executable',
    'attachment traversal',
  ])('rejects untrusted %s before aggregate publication', async (kind) => {
    const f = await fixture();
    const directory = await f.producer('linux', 'linux');
    const entries = await readdir(directory);
    const resultFile = entries.find((name) => name.endsWith('-result.json'));
    if (!resultFile) throw new Error('Fixture result missing');
    const resultPath = path.join(directory, resultFile);
    const manifestPath = path.join(directory, 'producer.json');
    if (kind === 'malformed JSON') await writeFile(manifestPath, '{');
    if (kind === 'unsupported version') {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;
      manifest.version = 999;
      await writeFile(manifestPath, JSON.stringify(manifest));
    }
    if (kind === 'result symlink') {
      const target = path.join(f.root, 'sentinel.json');
      await writeFile(target, await readFile(resultPath));
      await rm(resultPath);
      await symlink(target, resultPath, 'file');
    }
    if (kind === 'unknown result field' || kind === 'attachment traversal') {
      const result = JSON.parse(await readFile(resultPath, 'utf8')) as {
        descriptionHtml?: string;
        attachments: { source: string }[];
      };
      if (kind === 'unknown result field') result.descriptionHtml = '<script>malicious()</script>';
      else result.attachments[0].source = '../sentinel.txt';
      await writeFile(resultPath, JSON.stringify(result));
    }
    if (kind === 'extra executable') {
      const executable = path.join(directory, 'malicious.js');
      await writeFile(executable, 'throw new Error("must not execute")');
    }
    await expect(mergeTestResults(f.input)).rejects.toThrow('Test evidence');
    expect(await readdir(f.root)).not.toContain('merged');
  });
});
