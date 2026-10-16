import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  ATTACHMENT_LIMIT,
  PNG_LIMIT,
  sanitizeDiagnostic,
  TEXT_LIMIT,
  validateControlledPng,
} from '#scripts/lib/test-diagnostics';

const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const RESULT_FILE = /^[\da-f-]{36}-result\.json$/i;
const ATTACHMENT_FILE = /^[\da-f-]{36}-attachment\.(?:txt|png)$/i;
const RESULT_LIMIT = 256 * 1024;
const PRODUCER_LIMIT = 64 * 1024 * 1024;
const MAX_RESULTS = 10000;
const FILE_BATCH_SIZE = 8;
const fileSizes = new WeakMap();
const statuses = ['passed', 'failed', 'broken', 'skipped'];
const environmentKeys = ['os', 'arch', 'node', 'browser', 'lane'];
const resultKeys = [
  'uuid',
  'historyId',
  'testCaseId',
  'name',
  'fullName',
  'status',
  'start',
  'stop',
  'stage',
  'statusDetails',
  'labels',
  'parameters',
  'attachments',
];

function invalid(reason = 'invalid or incomplete evidence') {
  throw new Error(`Test evidence: ${reason}`);
}
function object(value, allowed) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Object.keys(value).every((key) => allowed.includes(key))
  )
    invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.values(descriptors).some((descriptor) => !Object.hasOwn(descriptor, 'value'))) invalid();
}
function text(value, secrets = [], limit = 4096) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value) > limit) invalid();
  return sanitizeDiagnostic(value, secrets);
}
function segment(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z\d][a-zA-Z\d._-]{0,79}$/.test(value))
    invalid('invalid namespace');
  return value;
}
function timing(start, stop) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(stop) || start < 0 || stop < start)
    invalid('invalid timing');
}
function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
function contained(root, filename) {
  const relative = path.relative(root, filename);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) invalid('unsafe path');
}

async function directory(filename, create = false) {
  if (typeof filename !== 'string' || !path.isAbsolute(filename) || path.parse(filename).root === filename)
    invalid('unsafe directory');
  const resolved = path.resolve(filename);
  const parsed = path.parse(resolved);
  let current = parsed.root;
  for (const part of resolved.slice(parsed.root.length).split(path.sep)) {
    current = path.join(current, part);
    if (create) {
      try {
        await fs.mkdir(current, { mode: 0o700 });
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
    }
    const info = await fs.lstat(current);
    if (!info.isDirectory() || info.isSymbolicLink()) invalid('unsafe directory');
  }
  return fs.realpath(resolved);
}

async function readOwned(root, filename, limit) {
  if (typeof filename !== 'string' || filename.includes('/') || filename.includes('\\'))
    invalid('unsafe path');
  const target = path.join(root, filename);
  contained(root, target);
  const info = await fs.lstat(target);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit) invalid('unsafe evidence file');
  const real = await fs.realpath(target);
  contained(root, real);
  const handle = await fs.open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const actual = await handle.stat();
    if (!actual.isFile() || actual.size > limit || actual.ino !== info.ino || actual.dev !== info.dev)
      invalid('changed evidence file');
    // Descriptor size is policy-bounded above; one sentinel byte detects later growth.
    const capacity = actual.size + 1;
    const bytes = Buffer.alloc(capacity);
    let count = 0;
    while (count < bytes.length) {
      const { bytesRead } = await handle.read(bytes, count, bytes.length - count, count);
      if (bytesRead === 0) break;
      count += bytesRead;
    }
    if (count > actual.size) invalid('changed evidence file');
    return bytes.subarray(0, count);
  } finally {
    await handle.close();
  }
}

async function writeFlushed(filename, data) {
  const handle = await fs.open(filename, 'wx', 0o600);
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function processFiles(entries, operation) {
  for (let offset = 0; offset < entries.length; offset += FILE_BATCH_SIZE) {
    const end = offset + FILE_BATCH_SIZE;
    const batch = entries.slice(offset, end);
    const pending = batch.map(async (entry) => operation(entry));
    // Drain the whole batch before callers remove their owned staging directory.
    const completed = await Promise.allSettled(pending);
    const failed = completed.find((result) => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
}

async function publish(parent, name, files) {
  const target = path.join(parent, name);
  try {
    await fs.lstat(target);
    invalid('destination already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const stage = await fs.mkdtemp(path.join(parent, '.pending-'));
  try {
    const directories = new Set();
    for (const filename of files.keys()) {
      const directory = path.dirname(filename);
      if (directory !== '.' && !directories.has(directory)) {
        const targetDirectory = path.join(stage, directory);
        const options = { mode: 0o700 };
        await fs.mkdir(targetDirectory, options);
        directories.add(directory);
      }
    }
    const entries = [...files];
    await processFiles(entries, async ([filename, data]) => {
      const targetFile = path.join(stage, filename);
      await writeFlushed(targetFile, data);
    });
    await fs.rename(stage, target);
    return target;
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

function attachment(input, secrets, files) {
  object(input, ['name', 'type', 'data']);
  if (!['text/plain', 'image/png'].includes(input.type)) invalid('unsupported attachment');
  const data = sanitizeDiagnostic(input.data, secrets);
  if (
    (input.type === 'text/plain' && typeof data !== 'string') ||
    (input.type === 'image/png' && !Buffer.isBuffer(data))
  )
    invalid('invalid attachment provenance');
  const extension = input.type === 'image/png' ? 'png' : 'txt';
  const source = `${randomUUID()}-attachment.${extension}`;
  addUnique(files, source, data);
  const result = { name: text(input.name, secrets), type: input.type, source };
  if (extension === 'png') result.provenance = 'controlled-local';
  return result;
}

function normalize(input, secrets, files) {
  object(input, [
    'uuid',
    'file',
    'name',
    'project',
    'feature',
    'level',
    'status',
    'start',
    'stop',
    'retry',
    'flaky',
    'environment',
    'error',
    'attachments',
  ]);
  if (
    !UUID.test(input.uuid) ||
    !statuses.includes(input.status) ||
    !['unit', 'integration', 'e2e'].includes(input.level)
  )
    invalid();
  timing(input.start, input.stop);
  if (!Number.isSafeInteger(input.retry) || input.retry < 0) invalid('invalid retry evidence');
  const file = text(input.file, secrets);
  if (
    file.includes('\\') ||
    path.posix.isAbsolute(file) ||
    file.includes(':') ||
    file.split('/').some((part) => !part || part === '..' || part === '.')
  )
    invalid('unsafe identity');
  object(input.environment, environmentKeys);
  const variant = environmentKeys.map((name) => ({ name, value: text(input.environment[name], secrets) }));
  const name = text(input.name, secrets);
  const project = text(input.project, secrets);
  const identity = JSON.stringify([file, name, project]);
  const result = {
    uuid: input.uuid,
    testCaseId: digest(identity),
    historyId: digest(JSON.stringify([identity, variant])),
    name,
    fullName: `${file} > ${name}`,
    status: input.status,
    stage: 'finished',
    start: input.start,
    stop: input.stop,
    labels: [
      { name: 'feature', value: text(input.feature, secrets) },
      { name: 'suite', value: project },
      { name: 'level', value: input.level },
      ...variant,
    ],
    parameters: [{ name: 'retry', value: String(input.retry), excluded: true }],
    statusDetails: {},
    attachments: [],
  };
  if (input.flaky !== undefined) {
    if (typeof input.flaky !== 'boolean') invalid('invalid flaky evidence');
    result.statusDetails.flaky = input.flaky;
  }
  if (input.error !== undefined) {
    object(input.error, ['message', 'stack']);
    result.statusDetails.message = text(input.error.message, secrets);
    if (input.error.stack !== undefined)
      result.statusDetails.trace = text(input.error.stack, secrets, TEXT_LIMIT);
  }
  if (!Array.isArray(input.attachments) || input.attachments.length > 64) invalid('invalid attachments');
  result.attachments = input.attachments.map((item) => attachment(item, secrets, files));
  let size = 0;
  for (const entry of result.attachments) size += Buffer.byteLength(files.get(entry.source));
  if (size > ATTACHMENT_LIMIT) invalid('oversized attachments');
  return result;
}

function addUnique(files, name, bytes) {
  const existing = files.get(name);
  if (existing !== undefined && !Buffer.from(existing).equals(Buffer.from(bytes)))
    invalid('conflicting UUID');
  if (existing === undefined) {
    const size = (fileSizes.get(files) || 0) + Buffer.byteLength(bytes);
    if (size > PRODUCER_LIMIT) invalid('oversized evidence');
    fileSizes.set(files, size);
  }
  files.set(name, bytes);
}

/** Flush one completed producer batch atomically; empty or partial evidence is never success. */
export async function writeTestResult({ root, runId, producerId, results, secretValues = [] }) {
  try {
    segment(runId);
    segment(producerId);
    if (text(runId, secretValues) !== runId || text(producerId, secretValues) !== producerId)
      invalid('unsafe namespace');
    if (!Array.isArray(results) || !results.length || results.length > MAX_RESULTS)
      invalid('empty or oversized producer');
    const files = new Map();
    const names = [];
    for (const input of results) {
      const result = normalize(input, secretValues, files);
      const filename = `${result.uuid}-result.json`;
      const data = JSON.stringify(result);
      if (Buffer.byteLength(data) > RESULT_LIMIT) invalid('oversized result');
      addUnique(files, filename, data);
      names.push(filename);
    }
    if (new Set(names).size !== names.length) invalid('duplicate result UUID');
    const manifest = { version: 1, runId, producerId, complete: true, count: names.length, results: names };
    files.set('producer.json', JSON.stringify(manifest));
    const total = [...files.values()].reduce((sum, bytes) => sum + Buffer.byteLength(bytes), 0);
    if (total > PRODUCER_LIMIT) invalid('oversized producer');
    const owner = await directory(root, true);
    const parent = await directory(path.join(owner, runId), true);
    return await publish(parent, producerId, files);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Test evidence:')) throw error;
    invalid('producer write/flush failed');
  }
}

function validateStored(result, secrets) {
  object(result, resultKeys);
  if (
    !UUID.test(result.uuid) ||
    !statuses.includes(result.status) ||
    result.stage !== 'finished' ||
    !/^[\da-f]{64}$/.test(result.historyId) ||
    !/^[\da-f]{64}$/.test(result.testCaseId)
  )
    invalid();
  timing(result.start, result.stop);
  result.name = text(result.name, secrets);
  result.fullName = text(result.fullName, secrets);
  object(result.statusDetails, ['message', 'trace', 'flaky']);
  if (result.statusDetails.flaky !== undefined && typeof result.statusDetails.flaky !== 'boolean') invalid();
  for (const key of ['message', 'trace'])
    if (result.statusDetails[key] !== undefined)
      result.statusDetails[key] = text(result.statusDetails[key], secrets, TEXT_LIMIT);
  if (!Array.isArray(result.labels) || result.labels.length !== 8) invalid();
  const names = ['feature', 'suite', 'level', ...environmentKeys];
  for (const label of result.labels) {
    object(label, ['name', 'value']);
    if (!names.includes(label.name)) invalid();
    label.value = text(label.value, secrets);
  }
  if (new Set(result.labels.map((label) => label.name)).size !== names.length) invalid();
  if (!Array.isArray(result.parameters) || result.parameters.length !== 1) invalid();
  const retry = result.parameters[0];
  object(retry, ['name', 'value', 'excluded']);
  if (retry.name !== 'retry' || !/^\d{1,6}$/.test(retry.value) || retry.excluded !== true) invalid();
  if (!Array.isArray(result.attachments) || result.attachments.length > 64) invalid();
}

function checkFingerprint(fingerprints, filename, bytes) {
  const hash = digest(bytes);
  const previous = fingerprints.get(filename);
  if (previous !== undefined && previous !== hash) invalid('conflicting UUID');
  fingerprints.set(filename, hash);
}

async function collectProducer(root, runId, producerId, files, fingerprints, secrets) {
  const owner = await directory(path.join(root, runId, segment(producerId)));
  const bytes = await readOwned(owner, 'producer.json', RESULT_LIMIT * 8);
  const manifest = JSON.parse(bytes.toString('utf8'));
  object(manifest, ['version', 'runId', 'producerId', 'complete', 'count', 'results']);
  if (
    manifest.version !== 1 ||
    manifest.runId !== runId ||
    manifest.producerId !== producerId ||
    manifest.complete !== true ||
    !Array.isArray(manifest.results) ||
    !manifest.results.length ||
    manifest.results.length > MAX_RESULTS ||
    manifest.count !== manifest.results.length ||
    new Set(manifest.results).size !== manifest.results.length
  )
    invalid('incomplete producer');
  const allowed = new Set(['producer.json', ...manifest.results]);
  let size = bytes.length;
  await processFiles(manifest.results, async (filename) => {
    if (typeof filename !== 'string' || !RESULT_FILE.test(filename)) invalid('unsafe result path');
    const resultBytes = await readOwned(owner, filename, RESULT_LIMIT);
    checkFingerprint(fingerprints, filename, resultBytes);
    size += resultBytes.length;
    const result = JSON.parse(resultBytes.toString('utf8'));
    validateStored(result, secrets);
    if (filename !== `${result.uuid}-result.json`) invalid('invalid result UUID');
    let attachmentSize = 0;
    for (const item of result.attachments) {
      object(item, ['name', 'type', 'source', 'provenance']);
      if (typeof item.source !== 'string' || !ATTACHMENT_FILE.test(item.source))
        invalid('unsafe attachment path');
      item.name = text(item.name, secrets);
      const png = item.type === 'image/png';
      if (
        (!png && item.type !== 'text/plain') ||
        !item.source.endsWith(png ? '.png' : '.txt') ||
        (png && item.provenance !== 'controlled-local') ||
        (!png && item.provenance !== undefined)
      )
        invalid('unsupported attachment');
      const data = await readOwned(owner, item.source, png ? PNG_LIMIT : TEXT_LIMIT);
      checkFingerprint(fingerprints, item.source, data);
      attachmentSize += data.length;
      size += data.length;
      if (attachmentSize > ATTACHMENT_LIMIT || size > PRODUCER_LIMIT) invalid('oversized producer');
      const safe = png ? validateControlledPng(data) : sanitizeDiagnostic(data.toString('utf8'), secrets);
      addUnique(files, item.source, safe);
      allowed.add(item.source);
    }
    if (size > PRODUCER_LIMIT) invalid('oversized producer');
    addUnique(files, filename, JSON.stringify(result));
  });
  const entries = await fs.readdir(owner);
  if (entries.length !== allowed.size || entries.some((entry) => !allowed.has(entry)))
    invalid('unsupported producer files');
  allowed.delete('producer.json');
  return { results: manifest.results, files: allowed };
}

function preservedProducerFiles(files, producers, runId) {
  segment(runId);
  const preserved = new Map();
  for (const [producerId, producer] of producers) {
    for (const filename of producer.files) {
      const target = path.join(producerId, filename);
      const data = files.get(filename);
      addUnique(preserved, target, data);
    }
    const manifest = {
      version: 1,
      runId,
      producerId,
      complete: true,
      count: producer.results.length,
      results: producer.results,
    };
    const target = path.join(producerId, 'producer.json');
    const encoded = JSON.stringify(manifest);
    addUnique(preserved, target, encoded);
  }
  return preserved;
}

/** Revalidate and redact expected producer data before atomically publishing an aggregate. */
export async function mergeTestResults({
  root,
  runId,
  producerIds,
  outputDir,
  outputRunId,
  secretValues = [],
}) {
  try {
    segment(runId);
    if (
      !Array.isArray(producerIds) ||
      !producerIds.length ||
      producerIds.length > 256 ||
      new Set(producerIds).size !== producerIds.length
    )
      invalid('missing or duplicate producers');
    const owner = await directory(root);
    const files = new Map();
    const fingerprints = new Map();
    const producers = new Map();
    for (const producerId of producerIds) {
      const producer = await collectProducer(owner, runId, producerId, files, fingerprints, secretValues);
      producers.set(producerId, producer);
    }
    const total = [...files.values()].reduce((sum, bytes) => sum + Buffer.byteLength(bytes), 0);
    if (total > PRODUCER_LIMIT) invalid('oversized aggregate');
    const parent = await directory(path.dirname(outputDir));
    const name = segment(path.basename(outputDir));
    const output = outputRunId === undefined ? files : preservedProducerFiles(files, producers, outputRunId);
    return await publish(parent, name, output);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Test evidence:')) throw error;
    invalid('merge validation/read/flush failed');
  }
}
