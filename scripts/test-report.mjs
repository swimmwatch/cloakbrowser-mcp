import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sanitizeDiagnostic, sanitizeHistory } from '#scripts/lib/test-diagnostics';
import { mergeTestResults, writeTestResult } from '#scripts/lib/test-results';

const cwd = fileURLToPath(new URL('..', import.meta.url));
const workflowUrl = new URL('../.github/workflows/ci.yml', import.meta.url);
const workflowSource = await fs.readFile(workflowUrl, 'utf8');
function workflowNodeVersion(name) {
  const pattern = new RegExp(`^ {2}${name}: '([^'\\n]+)'$`, 'mu');
  const match = pattern.exec(workflowSource);
  if (!match) throw new Error(`CI reporting: missing workflow constant ${name}`);
  return match[1];
}
const supportedNodeVersions = JSON.parse(workflowNodeVersion('NODE_CHECK_VERSIONS'));
const minimumNode = workflowNodeVersion('NODE_MINIMUM_VERSION');
const currentNode = workflowNodeVersion('NODE_CURRENT_VERSION');
const primaryNode = workflowNodeVersion('NODE_PRIMARY_VERSION');

const suites = {
  unit: ['vitest.config.ts', 'tests/unit'],
  integration: ['vitest.config.ts', 'tests/integration'],
  cli: ['vitest.e2e.config.ts'],
  npm: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/npm-package.manual.ts'],
  cdp: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/cdp-access.manual.ts'],
  'proxy-geoip': ['vitest.distribution-e2e.config.mjs', 'tests/e2e/proxy-geoip.manual.ts'],
  extensions: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/extensions.manual.ts'],
  lifecycle: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/browser-lifecycle.manual.ts'],
  console: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/playwright-console.manual.ts'],
  'docker-cdp': ['vitest.distribution-e2e.config.mjs', 'tests/e2e/cdp-docker.manual.ts'],
  docker: ['vitest.distribution-e2e.config.mjs', 'tests/e2e/docker-image.manual.ts'],
};
const namespace = /^[a-zA-Z\d][a-zA-Z\d._-]{0,79}$/;
const flags = {
  collect: ['suite', 'run-id'],
  generate: ['input', 'output', 'history'],
  open: ['report'],
  merge: ['input', 'output', 'expected'],
  probe: [],
  'ci-plan': [],
  'ci-config': [],
  'ci-aggregate': [],
  'ci-history': [],
  'ci-history-save': [],
};

export const nativePlatforms = {
  'ubuntu-latest': 'linux-x64',
  'ubuntu-24.04-arm': 'linux-arm64',
  'macos-latest': 'darwin-arm64',
  'macos-15-intel': 'darwin-x64',
  'windows-latest': 'win32-x64',
};

/** Derive the expected inventory from the workflow's existing native/Node matrix. */
export function ciPlan(lane, platforms, nodes = supportedNodeVersions) {
  if (!['pr', 'periodic'].includes(lane) || !Array.isArray(platforms) || !Array.isArray(nodes))
    throw new Error('CI reporting: invalid matrix');
  const environments = platforms.map((platform) => {
    const environment = nativePlatforms[platform];
    if (!environment) throw new Error('CI reporting: unknown platform');
    return environment;
  });
  for (const node of nodes) if (!/^\d{2}$/.test(node)) throw new Error('CI reporting: invalid Node major');
  const levels = ['unit', 'integration', 'e2e'];
  const suites = ['npm', 'proxy-geoip', 'extensions', 'lifecycle'];
  const ids = environments.flatMap((environment) => {
    const quality = nodes.flatMap((node) =>
      levels.map((level) => `${environment}-node${node}-none-${lane}-quality-${level}`),
    );
    return [
      ...quality,
      ...suites.map((suite) => `${environment}-node${primaryNode}-cloak-${lane}-${suite}`),
      `${environment}-node${currentNode}-playwright-${lane}-console`,
      `${environment}-node${currentNode}-mixed-${lane}-cdp`,
    ];
  });
  ids.push(`linux-x64-node${minimumNode}-mixed-${lane}-cdp`);
  for (const arch of ['x64', 'arm64']) {
    ids.push(`linux-${arch}-node${minimumNode}-cloak-${lane}-docker`);
    for (const engine of ['cloak', 'playwright'])
      ids.push(`linux-${arch}-node${minimumNode}-${engine}-${lane}-docker-cdp`);
  }
  if (new Set(ids).size !== ids.length || ids.length > 256) throw new Error('CI reporting: duplicate matrix');
  return ids.map(checkedId);
}

/** PRs and non-default refs cannot select or write trusted launch history. */
export function historyScope(env, producers) {
  const branch = env.CLOAK_REPORT_DEFAULT_BRANCH;
  if (
    !['schedule', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME) ||
    !branch ||
    env.GITHUB_REF !== `refs/heads/${branch}`
  )
    return undefined;
  const repository = env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('CI reporting: invalid repository');
  const lane = checkedId(env.CLOAK_REPORT_LANE);
  const inventory = producers.map(checkedId).sort();
  const identity = JSON.stringify([repository, lane, inventory]);
  const key = createHash('sha256').update(identity).digest('hex');
  return { repository, lane, key, producers: inventory, branch };
}

function historyArtifact(run, artifacts, scope) {
  const expected = `test-history-${scope.key}`;
  const attemptName =
    Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0
      ? `${expected}-attempt-${run.run_attempt}`
      : undefined;
  const matches = (artifact, name) =>
    artifact.name === name && artifact.expired === false && artifact.workflow_run?.id === run.id;
  const attempted =
    attemptName === undefined ? undefined : artifacts.find((artifact) => matches(artifact, attemptName));
  return attempted ?? artifacts.find((artifact) => matches(artifact, expected));
}

export function selectHistoryRun(runs, artifacts, scope) {
  if (!scope) throw new Error('CI reporting: untrusted history selection');
  for (const run of runs) {
    if (
      run.status !== 'completed' ||
      run.conclusion !== 'success' ||
      !['schedule', 'workflow_dispatch'].includes(run.event) ||
      run.head_repository?.full_name !== scope.repository ||
      run.head_branch !== scope.branch
    )
      continue;
    if (historyArtifact(run, artifacts, scope)) return run.id;
  }
  return undefined;
}

function validateProducerEnvironment(id, result) {
  const identity =
    /^(linux|darwin|win32)-(x64|arm64)-node(\d{2})-(none|cloak|playwright|mixed)-(pr|periodic)-(.+)$/.exec(
      id,
    );
  if (!identity) return; // The CLI inventory always uses qualified IDs; local fixtures may use short IDs.
  const [, os, arch, node, browser, lane, group] = identity;
  const level = /^(?:quality|coverage)-(unit|integration|e2e)$/.exec(group)?.[1] ?? 'e2e';
  const job = group.replace(/-(?:unit|integration|e2e)$/, '');
  const executionLane = `${lane}-${job}`;
  const expected = { os, arch, node, browser, lane: executionLane, level };
  for (const [name, value] of Object.entries(expected))
    if (!result.labels.some((label) => label.name === name && label.value === value))
      throw new Error('CI reporting: producer environment does not match expected inventory');
}

function artifactAttempt(runId, sourceRunId) {
  const pattern = /^run-([1-9]\d*)-attempt-([1-9]\d*)$/u;
  const current = pattern.exec(runId);
  if (!current && sourceRunId === runId) return 0;
  const source = pattern.exec(sourceRunId);
  const attempt = Number(source?.[2]);
  const currentAttempt = Number(current?.[2]);
  if (
    !current ||
    !source ||
    current[1] !== source[1] ||
    !Number.isSafeInteger(attempt) ||
    !Number.isSafeInteger(currentAttempt) ||
    attempt > currentAttempt
  )
    throw new Error('CI reporting: wrong artifact run');
  return attempt;
}

async function latestCiArtifacts(source, runId) {
  const latestArtifacts = new Map();
  const artifacts = await fs.readdir(source, { withFileTypes: true });
  for (const artifact of artifacts) {
    if (!artifact.name.startsWith('test-results-') || !artifact.isDirectory() || artifact.isSymbolicLink())
      throw new Error('CI reporting: unsafe artifact');
    const artifactRoot = path.join(source, artifact.name);
    const entries = await fs.readdir(artifactRoot);
    if (entries.length !== 1) throw new Error('CI reporting: wrong artifact run');
    const sourceRunId = entries[0];
    const attempt = artifactAttempt(runId, sourceRunId);
    const group = artifact.name.replace(/-attempt-[1-9]\d*$/u, '');
    const previous = latestArtifacts.get(group);
    if (previous?.attempt === attempt) throw new Error('CI reporting: duplicate producer attempt');
    if (!previous || previous.attempt < attempt)
      latestArtifacts.set(group, { artifactRoot, sourceRunId, attempt });
  }
  return latestArtifacts;
}

async function selectCiArtifacts(source, runId, inventory) {
  const selected = new Map();
  const artifacts = await latestCiArtifacts(source, runId);
  for (const { artifactRoot, sourceRunId, attempt } of artifacts.values()) {
    const producerRoot = path.join(artifactRoot, sourceRunId);
    await canonicalDirectory(producerRoot);
    const producers = await fs.readdir(producerRoot, { withFileTypes: true });
    for (const producer of producers) {
      const id = checkedId(producer.name);
      if (!inventory.includes(id)) throw new Error('CI reporting: unexpected producer');
      if (!producer.isDirectory() || producer.isSymbolicLink())
        throw new Error('CI reporting: unsafe producer');
      const previous = selected.get(id);
      if (previous?.attempt === attempt) throw new Error('CI reporting: duplicate producer attempt');
      if (!previous || previous.attempt < attempt) selected.set(id, { artifactRoot, sourceRunId, attempt });
    }
  }
  return selected;
}

async function stageCiArtifacts(source, run, runId, inventory, secretValues) {
  const selected = await selectCiArtifacts(source, runId, inventory);
  for (const [id, { artifactRoot, sourceRunId }] of selected) {
    const to = path.join(run, id);
    const validation = {
      root: artifactRoot,
      runId: sourceRunId,
      producerIds: [id],
      outputDir: to,
      secretValues,
    };
    await mergeTestResults(validation);
    const entries = await fs.readdir(to);
    const results = entries.filter((entry) => entry.endsWith('-result.json'));
    for (const filename of results) {
      const target = path.join(to, filename);
      const bytes = await fs.readFile(target, 'utf8');
      const result = JSON.parse(bytes);
      validateProducerEnvironment(id, result);
    }
    const manifest = {
      version: 1,
      runId,
      producerId: id,
      complete: true,
      count: results.length,
      results,
    };
    const target = path.join(to, 'producer.json');
    const encoded = JSON.stringify(manifest);
    const writeOptions = { flag: 'wx', mode: 0o600 };
    await fs.writeFile(target, encoded, writeOptions);
  }
  const producerIds = selected.keys();
  return new Set(producerIds);
}

async function writeCiSummary(output, missing) {
  const resultRoot = path.join(output, 'results');
  const files = await fs.readdir(resultRoot);
  const summary = {
    status: 'passed',
    total: 0,
    passed: 0,
    failed: 0,
    broken: 0,
    skipped: 0,
    retries: 0,
    duration: 0,
    missing,
  };
  for (const filename of files) {
    if (!filename.endsWith('-result.json')) continue;
    const target = path.join(resultRoot, filename);
    const result = JSON.parse(await fs.readFile(target, 'utf8'));
    summary.total += 1;
    summary[result.status] += 1;
    summary.retries += Number(result.parameters[0].value);
    summary.duration += result.stop - result.start;
  }
  if (summary.failed || summary.broken || missing.length) summary.status = 'failed';
  const text = `## Test report\n\nStatus: **${summary.status}**\n\n| Total | Passed | Failed | Broken | Skipped | Retries | Test duration (ms) |\n| --- | --- | --- | --- | --- | --- | --- |\n| ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.broken} | ${summary.skipped} | ${summary.retries} | ${summary.duration} |\n\nMissing producers: ${missing.length ? missing.join(', ') : 'none'}.\n`;
  const summaryPath = path.join(output, 'ci-summary.md');
  const identityPath = path.join(output, 'ci-summary.json');
  await fs.writeFile(summaryPath, text);
  const encoded = JSON.stringify(summary);
  await fs.writeFile(identityPath, encoded);
  return summary;
}

/** Regenerate only validated data; absent producers become explicit broken cases. */
export async function ciAggregate({ input, output, runId, expected, history, scope, secretValues = [] }) {
  const inventory = expected.map(checkedId);
  if (!inventory.length || inventory.length > 256 || new Set(inventory).size !== inventory.length)
    throw new Error('CI reporting: invalid expected producers');
  checkedId(runId);
  const source = await canonicalDirectory(input);
  const stagePrefix = path.join(path.dirname(source), '.ci-report-');
  const stage = await fs.mkdtemp(stagePrefix);
  try {
    const run = path.join(stage, runId);
    await fs.mkdir(run);
    const seen = await stageCiArtifacts(source, run, runId, inventory, secretValues);
    const missing = inventory.filter((id) => !seen.has(id));
    if (missing.length) {
      const results = missing.map((id) => ({
        uuid: randomUUID(),
        file: 'ci/missing-producer',
        name: `Missing producer: ${id}`,
        project: 'CI',
        feature: 'CI completeness',
        level: 'integration',
        status: 'broken',
        start: 0,
        stop: 0,
        retry: 0,
        environment: {
          os: 'unavailable',
          arch: 'unavailable',
          node: 'unavailable',
          browser: 'none',
          lane: 'missing',
        },
        error: { message: 'Required test producer did not publish complete evidence' },
        attachments: [],
      }));
      const options = { root: stage, runId, producerId: 'missing-producers', results };
      await writeTestResult(options);
    }
    let historyFile;
    if (history) {
      if (!scope) throw new Error('CI reporting: untrusted history');
      const historyRoot = await canonicalDirectory(history);
      const contextPath = path.join(historyRoot, 'context.json');
      const meta = JSON.parse(await boundedFile(contextPath));
      if (JSON.stringify(meta) !== JSON.stringify(scope))
        throw new Error('CI reporting: wrong history scope');
      historyFile = path.join(historyRoot, 'history.jsonl');
      await validateCiHistory(historyFile);
    }
    const generation = { input: run, output, history: historyFile, secretValues, singleFile: false };
    await generateReport(generation);
    return await writeCiSummary(output, missing);
  } finally {
    const removal = { recursive: true, force: true };
    await fs.rm(stage, removal);
  }
}

async function boundedFile(filename, limit = 16 * 1024 * 1024) {
  const info = await fs.lstat(filename);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limit)
    throw new Error('CI reporting: unsafe history file');
  return fs.readFile(filename, 'utf8');
}
async function validateCiHistory(filename) {
  const bytes = await boundedFile(filename);
  const lines = bytes.split('\n').filter(Boolean);
  if (!lines.length || lines.length > 1000) throw new Error('CI reporting: invalid history');
  for (const line of lines) {
    const launch = JSON.parse(line);
    if (
      !launch ||
      typeof launch !== 'object' ||
      !Number.isSafeInteger(launch.timestamp) ||
      !Array.isArray(launch.knownTestCaseIds) ||
      !launch.testResults ||
      typeof launch.testResults !== 'object'
    )
      throw new Error('CI reporting: invalid history');
  }
  return bytes;
}
export async function saveCiHistory({ report, output, env, expected }) {
  const scope = historyScope(env, expected);
  if (!scope) throw new Error('CI reporting: untrusted history');
  const source = await canonicalDirectory(report);
  const summaryPath = path.join(source, 'ci-summary.json');
  const summary = JSON.parse(await boundedFile(summaryPath));
  if (summary.status !== 'passed' || summary.missing.length)
    throw new Error('CI reporting: failed history source');
  const historyFile = path.join(source, 'history.jsonl');
  const bytes = await validateCiHistory(historyFile);
  const lines = bytes.split('\n').filter(Boolean).slice(-30);
  const safe = lines.map((line) => sanitizeHistory(JSON.parse(line))).join('\n');
  const target = await canonicalDirectory(output, true);
  const historyPath = path.join(target, 'history.jsonl');
  const contextPath = path.join(target, 'context.json');
  const writeOptions = { flag: 'wx', mode: 0o600 };
  const content = `${safe}\n`;
  await fs.writeFile(historyPath, content, writeOptions);
  const encoded = JSON.stringify(scope);
  await fs.writeFile(contextPath, encoded, writeOptions);
}

function checkedId(value) {
  if (typeof value !== 'string' || !namespace.test(value))
    throw new Error('Test reporting: invalid identifier');
  return value;
}

/** Parse only the development reporting command surface. */
export function parseArguments(args) {
  const [command = 'collect', ...rest] = args;
  if (!Object.hasOwn(flags, command)) throw new Error('Test reporting: unknown command');
  const result = { command };
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index]?.replace(/^--/, '');
    const value = rest[index + 1];
    if (
      !rest[index]?.startsWith('--') ||
      !flags[command].includes(flag) ||
      !value ||
      Object.hasOwn(result, flag)
    ) {
      throw new Error('Test reporting: invalid or duplicate option');
    }
    result[flag] = value;
  }
  if (command === 'collect') {
    if (!Object.hasOwn(suites, result.suite)) throw new Error('Test reporting: unknown suite');
    if (result['run-id']) result.runId = checkedId(result['run-id']);
  }
  const required = {
    generate: ['input', 'output'],
    open: ['report'],
    merge: ['input', 'output', 'expected'],
  };
  for (const name of required[command] || [])
    if (!result[name]) throw new Error(`Test reporting: --${name} is required`);
  return result;
}

/** Enforce report exclusion against the actual npm archive inventory. */
export function assertPackageExclusions(files) {
  if (!Array.isArray(files) || !files.length) throw new Error('Test reporting: missing package inventory');
  const generated =
    /(?:^|\/)(?:artifacts|allure-results|allure-report|test-results|test-report|history\.jsonl)(?:\/|$)/;
  if (files.some((file) => typeof file.path !== 'string' || generated.test(file.path))) {
    throw new Error('Test reporting: generated report data included in npm archive');
  }
}

async function canonicalDirectory(value, create = false) {
  const absolute = path.resolve(value);
  let current = path.parse(absolute).root;
  if (absolute === current) throw new Error('Test reporting: filesystem root is not allowed');
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    if (create) await fs.mkdir(current, { recursive: true, mode: 0o700 });
    const info = await fs.lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Test reporting: unsafe directory');
  }
  return fs.realpath(absolute);
}

function nodeTool(script, args, env = process.env, secrets = []) {
  return new Promise((resolve, reject) => {
    const windows = process.platform === 'win32';
    const options = { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: !windows };
    const argumentsList = [script, ...args];
    const child = spawn(process.execPath, argumentsList, options);
    const chunks = [];
    let length = 0;
    let interrupted;
    let timer;
    const terminate = (signal) => {
      if (!child.pid) return;
      if (windows) {
        const command = 'taskkill.exe';
        const args = ['/PID', String(child.pid), '/T', '/F'];
        const options = { stdio: 'ignore', windowsHide: true, timeout: 3000 };
        const result = spawnSync(command, args, options);
        if (result.status !== 0) child.kill(signal);
      } else {
        try {
          const group = -child.pid;
          process.kill(group, signal);
        } catch (error) {
          if (error.code !== 'ESRCH') child.kill(signal);
        }
      }
    };
    const interrupt = (signal) => {
      if (interrupted) return;
      interrupted = signal;
      process.exitCode = signal === 'SIGINT' ? 130 : 143;
      terminate('SIGTERM');
      timer = setTimeout(() => {
        terminate('SIGKILL');
      }, 2000);
    };
    const onInterrupt = () => interrupt('SIGINT');
    const onTerminate = () => interrupt('SIGTERM');
    const cleanup = () => {
      clearTimeout(timer);
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onTerminate);
    };
    const capture = (chunk) => {
      // Keep a bounded diagnostic tail; never stream raw runner output or secrets.
      chunks.push(Buffer.from(chunk));
      length += chunk.length;
      while (length > 128 * 1024 && chunks.length > 1) length -= chunks.shift().length;
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onTerminate);
    child.once('error', (error) => {
      cleanup();
      const failure =
        error instanceof Error ? error : new Error('Test reporting: runner process could not start');
      reject(failure);
    });
    child.once('close', (code, signal) => {
      cleanup();
      try {
        const raw = Buffer.concat(chunks)
          .subarray(-128 * 1024)
          .toString('utf8');
        const output = sanitizeDiagnostic(raw, secrets);
        const exitCode = interrupted ? process.exitCode : (code ?? 1);
        resolve({ code: exitCode, signal: interrupted || signal, output, interrupted: Boolean(interrupted) });
      } catch {
        reject(new Error('Test reporting: unsafe runner diagnostics'));
      }
    });
  });
}

/** Run the selected existing suite; a failed runner is never turned into success. */
export async function collectReport({
  root = path.join(cwd, 'artifacts/test-results'),
  runId = randomUUID(),
  producerId,
  suite,
  config: fixtureConfig,
  env = {},
  secretValues = [],
}) {
  if (!Object.hasOwn(suites, suite)) throw new Error('Test reporting: unknown suite');
  checkedId(runId);
  producerId = checkedId(producerId || suite);
  const owner = await canonicalDirectory(root, true);
  const run = path.join(owner, runId);
  await fs.mkdir(run, { mode: 0o700 });
  const [defaultConfig, selection] = suites[suite];
  const reportOptions = { root: owner, runId, producerId, suite, secretValues };
  const encoded = JSON.stringify(reportOptions);
  const childEnv = { ...process.env, ...env, CLOAK_TEST_REPORT_OPTIONS: encoded };
  const script = path.join(cwd, 'node_modules/vitest/vitest.mjs');
  const args = ['run', '--config', fixtureConfig || defaultConfig];
  if (!fixtureConfig && selection) args.push(selection);
  const child = await nodeTool(script, args, childEnv, secretValues);
  if (child.interrupted) {
    const removal = { recursive: true, force: true };
    await fs.rm(run, removal);
    throw new Error('Test reporting: collection interrupted; owned processes stopped');
  }
  const directory = path.join(run, producerId);
  try {
    const manifestPath = path.join(directory, 'producer.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (!manifest.complete || !manifest.count) throw new Error('incomplete');
  } catch {
    throw new Error(
      `Test reporting: runner produced no complete manifest (exit ${child.code})\n${child.output}`,
    );
  }
  return { ...child, directory, run };
}

async function producers(input, expected) {
  const owner = await canonicalDirectory(input);
  const entries = await fs.readdir(owner, { withFileTypes: true });
  if (!entries.length || entries.some((entry) => !entry.isDirectory() || entry.isSymbolicLink())) {
    throw new Error('Test reporting: expected a run containing producer directories');
  }
  const actual = entries.map((entry) => checkedId(entry.name)).sort();
  const selected = expected ? expected.split(',').map(checkedId).sort() : actual;
  if (new Set(selected).size !== selected.length || JSON.stringify(actual) !== JSON.stringify(selected)) {
    throw new Error('Test reporting: expected producers do not match');
  }
  return { root: path.dirname(owner), runId: checkedId(path.basename(owner)), producerIds: selected };
}

/** Preserve a complete producer manifest so aggregated data can be validated again. */
export async function mergeReport({ input, output, expected, secretValues = [] }) {
  if (!expected) throw new Error('Test reporting: expected producers are required');
  const source = await producers(input, expected);
  const parent = await canonicalDirectory(path.dirname(path.resolve(output)), true);
  const runId = checkedId(path.basename(output));
  const target = path.join(parent, runId);
  try {
    await fs.lstat(target);
    throw new Error('Test reporting: aggregate already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const options = { ...source, outputDir: target, outputRunId: runId, secretValues };
  return mergeTestResults(options);
}

/** Validate raw producer manifests and re-redact before the generator reads data. */
export async function generateReport({ input, output, history, secretValues = [], singleFile = true }) {
  const source = await producers(input);
  const parent = await canonicalDirectory(path.dirname(path.resolve(output)), true);
  const target = path.join(parent, checkedId(path.basename(output)));
  try {
    await fs.lstat(target);
    throw new Error('Test reporting: report already exists');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const stage = await fs.mkdtemp(path.join(parent, '.report-'));
  try {
    const results = path.join(stage, 'results');
    const mergeOptions = { ...source, outputDir: results, secretValues };
    await mergeTestResults(mergeOptions);
    const historyPath = path.join(stage, 'history.jsonl');
    if (history) {
      const owner = await canonicalDirectory(path.dirname(path.resolve(history)));
      const filename = path.join(owner, path.basename(history));
      const info = await fs.lstat(filename);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 16 * 1024 * 1024)
        throw new Error('Test reporting: unsafe history');
      const bytes = await fs.readFile(filename, 'utf8');
      const lines = bytes.split('\n').filter(Boolean);
      // History is trusted input, but keys, credential fields and values still need redaction.
      const sanitized = lines
        .map((line) => {
          const record = JSON.parse(line);
          return sanitizeHistory(record, secretValues);
        })
        .join('\n');
      await fs.writeFile(historyPath, `${sanitized}\n`, { flag: 'wx', mode: 0o600 });
    }
    const report = path.join(stage, 'html');
    const variants = new Map();
    for (const filename of await fs.readdir(results)) {
      if (!filename.endsWith('-result.json')) continue;
      const target = path.join(results, filename);
      const result = JSON.parse(await fs.readFile(target, 'utf8'));
      const labels = ['os', 'arch', 'node', 'browser', 'lane'].map((name) =>
        result.labels.find((label) => label.name === name),
      );
      const identity = JSON.stringify(labels);
      const id = `env-${createHash('sha256').update(identity).digest('hex').slice(0, 24)}`;
      const name = labels.map((label) => label.value).join(', ');
      variants.set(id, { id, name, labels });
    }
    const options = { historyPath, singleFile, variants: [...variants.values()] };
    const trustedConfig = new URL('../allure.config.mjs', import.meta.url).href;
    const configuration = `import { createAllureConfig } from ${JSON.stringify(trustedConfig)};\nexport default createAllureConfig(${JSON.stringify(options)});\n`;
    const configPath = path.join(stage, 'config.mjs');
    await fs.writeFile(configPath, configuration, { flag: 'wx', mode: 0o600 });
    const script = path.join(cwd, 'node_modules/allure/cli.js');
    const args = ['generate', '--config', configPath, '--output', report, results];
    const generated = await nodeTool(script, args, process.env, secretValues);
    if (generated.code !== 0)
      throw new Error(`Test reporting: Allure generation failed\n${generated.output}`);
    const index = path.join(report, 'index.html');
    await fs.access(index);
    await fs.rename(results, path.join(report, 'results'));
    await fs.rename(historyPath, path.join(report, 'history.jsonl'));
    const marker = { version: 1, generator: 'allure@3.20.1', complete: true, singleFile };
    await fs.writeFile(path.join(report, 'report.json'), JSON.stringify(marker), { flag: 'wx', mode: 0o600 });
    await fs.rename(report, target);
    return target;
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

/** Open the self-contained HTML through the native desktop handler, without a server. */
export function reportOpenCommand(index, platform = process.platform) {
  const url = pathToFileURL(index).href;
  if (platform === 'win32') return { command: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] };
  if (platform === 'darwin') return { command: 'open', args: [url] };
  if (platform === 'linux') return { command: 'xdg-open', args: [url] };
  throw new Error('Test reporting: unsupported desktop platform');
}

export async function openReport(report) {
  const owner = await canonicalDirectory(report);
  const markerPath = path.join(owner, 'report.json');
  const marker = JSON.parse(await fs.readFile(markerPath, 'utf8'));
  if (marker.version !== 1 || marker.complete !== true || marker.generator !== 'allure@3.20.1')
    throw new Error('Test reporting: not a generated report');
  const index = path.join(owner, 'index.html');
  const info = await fs.lstat(index);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Test reporting: unsafe HTML entry');
  const script = path.join(cwd, 'node_modules/allure/cli.js');
  const config = path.join(cwd, 'allure.config.mjs');
  const viewer =
    marker.singleFile === false
      ? { command: process.execPath, args: [script, 'open', '--config', config, owner] }
      : reportOpenCommand(index);
  const { command, args } = viewer;
  const options = { cwd, stdio: 'inherit', windowsHide: true };
  const child = spawn(command, args, options);
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function probe() {
  const prefix = path.join(cwd, 'artifacts/report-probe-');
  await canonicalDirectory(path.dirname(prefix), true);
  const root = await fs.mkdtemp(prefix);
  try {
    const secret = 'reporting-synthetic-canary';
    const config = 'tests/fixtures/reporting/vitest.config.ts';
    for (const scenario of ['pass', 'complete', 'import', 'hook', 'after-hook', 'unhandled']) {
      const env = { REPORT_PROBE_CASE: scenario };
      const options = {
        root,
        runId: scenario,
        producerId: 'unit',
        suite: 'unit',
        config,
        env,
        secretValues: [secret],
      };
      const result = await collectReport(options);
      if ((result.code === 0) !== (scenario === 'pass'))
        throw new Error(`Test reporting: wrong ${scenario} runner exit`);
      const output = path.join(root, `${scenario}-report`);
      const generation = { input: result.run, output, secretValues: [secret] };
      await generateReport(generation);
    }
    const history = path.join(root, 'pass-report/history.jsonl');
    const input = path.join(root, 'complete');
    const output = path.join(root, 'history-report');
    await generateReport({ input, output, history, secretValues: [secret] });
    const historical = await fs.readFile(path.join(output, 'history.jsonl'), 'utf8');
    if (historical.split('\n').filter(Boolean).length < 2)
      throw new Error('Test reporting: missing launch history');
    const npm = process.env.npm_execpath;
    if (!npm) throw new Error('Test reporting: run the probe through npm run test:report:probe');
    const packArgs = ['pack', '--dry-run', '--json', '--ignore-scripts'];
    const packed = await nodeTool(npm, packArgs);
    if (packed.code !== 0) throw new Error('Test reporting: package inspection failed');
    const inventory = JSON.parse(packed.output);
    assertPackageExclusions(inventory[0]?.files);
    process.stdout.write('Reporting probe passed (synthetic fixtures; no Chromium).\n');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function ciInputs(env = process.env) {
  const lane = env.CLOAK_REPORT_LANE;
  const platforms = JSON.parse(env.CLOAK_REPORT_PLATFORMS || '[]');
  const nodes = env.NODE_CHECK_VERSIONS ? JSON.parse(env.NODE_CHECK_VERSIONS) : supportedNodeVersions;
  const expected = ciPlan(lane, platforms, nodes);
  const runId = checkedId(`run-${env.GITHUB_RUN_ID}-attempt-${env.GITHUB_RUN_ATTEMPT}`);
  return { lane, expected, runId };
}

async function githubJson(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('CI reporting: missing read-only GitHub token');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
  const signal = AbortSignal.timeout(15000);
  const options = { headers, signal, redirect: 'error' };
  const response = await fetch(`https://api.github.com/${endpoint}`, options);
  if (!response.ok) throw new Error(`CI reporting: history API failed (${response.status})`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const value = await reader.read();
      if (value.done) break;
      size += value.value.length;
      if (size > 2 * 1024 * 1024) throw new Error('CI reporting: oversized API response');
      chunks.push(value.value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks);
  const text = bytes.toString('utf8');
  return JSON.parse(text);
}

async function findCiHistory(scope) {
  const branch = encodeURIComponent(scope.branch);
  const endpoint = `repos/${scope.repository}/actions/workflows/ci.yml/runs?branch=${branch}&status=success&per_page=10`;
  const data = await githubJson(endpoint);
  if (!Array.isArray(data.workflow_runs)) throw new Error('CI reporting: invalid history API response');
  for (const run of data.workflow_runs) {
    if (!Number.isSafeInteger(run.id) || String(run.id) === process.env.GITHUB_RUN_ID) continue;
    const artifactsEndpoint = `repos/${scope.repository}/actions/runs/${run.id}/artifacts?per_page=100`;
    const artifacts = await githubJson(artifactsEndpoint);
    if (!Array.isArray(artifacts.artifacts)) throw new Error('CI reporting: invalid artifact API response');
    const selected = selectHistoryRun([run], artifacts.artifacts, scope);
    if (selected) {
      const artifact = historyArtifact(run, artifacts.artifacts, scope);
      return { id: selected, name: artifact.name };
    }
  }
  return undefined;
}

async function aggregateCiCommand(env, runId, expected, scope) {
  const options = {
    input: env.CLOAK_REPORT_INPUT,
    output: env.CLOAK_REPORT_OUTPUT,
    runId,
    expected,
    scope,
  };
  const previous = env.CLOAK_REPORT_HISTORY_INPUT;
  if (previous && scope) {
    try {
      await fs.access(previous);
      options.history = previous;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  try {
    const result = await ciAggregate(options);
    const summaryPath = path.join(options.output, 'ci-summary.md');
    const summary = await fs.readFile(summaryPath, 'utf8');
    await fs.appendFile(env.GITHUB_STEP_SUMMARY, summary);
    if (result.status !== 'passed') process.exitCode = 1;
  } catch (error) {
    await fs.appendFile(
      env.GITHUB_STEP_SUMMARY,
      '## Test report unavailable\n\nEvidence validation or report generation failed. No successful report is claimed.\n',
    );
    throw error;
  }
}

async function ciCommand(command) {
  const env = process.env;
  if (command === 'ci-config') {
    const lane = checkedId(env.CLOAK_REPORT_LANE);
    const group = checkedId(env.CLOAK_REPORT_GROUP);
    const browser = checkedId(env.CLOAK_REPORT_ENGINE);
    const runId = checkedId(`run-${env.GITHUB_RUN_ID}-attempt-${env.GITHUB_RUN_ATTEMPT}`);
    const node = process.versions.node.split('.')[0];
    const producerId = checkedId(
      `${process.platform}-${process.arch}-node${node}-${browser}-${lane}-${group}`,
    );
    const root = path.join(env.RUNNER_TEMP, 'test-results');
    const options = {
      root,
      runId,
      producerId,
      suite: env.CLOAK_REPORT_SUITE,
      secretValues: [],
      lane: `${lane}-${group}`,
      browser,
      splitLevels: ['quality', 'coverage'].includes(group),
    };
    const encoded = JSON.stringify(options);
    const lines = `CLOAK_TEST_REPORT_OPTIONS=${encoded}\nCLOAK_REPORT_RUN_ID=${runId}\nCLOAK_REPORT_ROOT=${root}\n`;
    await fs.appendFile(env.GITHUB_ENV, lines);
    return;
  }
  const { expected, runId } = ciInputs(env);
  const scope = historyScope(env, expected);
  if (command === 'ci-plan') {
    const encoded = JSON.stringify(expected);
    process.stdout.write(`${encoded}\n`);
  } else if (command === 'ci-history') {
    let history;
    if (scope) history = await findCiHistory(scope);
    const run = history?.id;
    const saveName = scope ? `test-history-${scope.key}` : '';
    const name = history?.name ?? saveName;
    const output = `run-id=${run || ''}\nname=${name}\nsave-name=${saveName}\n`;
    await fs.appendFile(env.GITHUB_OUTPUT, output);
    const state = run ? 'matching trusted launch found' : 'first run: no eligible retained history';
    await fs.appendFile(env.GITHUB_STEP_SUMMARY, `History: ${state}.\n\n`);
  } else if (command === 'ci-history-save') {
    const options = {
      report: env.CLOAK_REPORT_OUTPUT,
      output: env.CLOAK_REPORT_HISTORY_OUTPUT,
      env,
      expected,
    };
    await saveCiHistory(options);
  } else if (command === 'ci-aggregate') {
    await aggregateCiCommand(env, runId, expected, scope);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArguments(args);
  if (parsed.command.startsWith('ci-')) await ciCommand(parsed.command);
  else if (parsed.command === 'collect') {
    const result = await collectReport(parsed);
    process.stdout.write(`${result.run}\n${result.output}\n`);
    process.exitCode = result.code;
  } else if (parsed.command === 'generate') {
    const result = await generateReport(parsed);
    process.stdout.write(`${result}\n`);
  } else if (parsed.command === 'open') process.exitCode = await openReport(parsed.report);
  else if (parsed.command === 'merge') {
    const output = await mergeReport(parsed);
    process.stdout.write(`${output}\n`);
  } else await probe();
}
const entry = process.argv[1] && path.resolve(process.argv[1]);
if (entry === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    const message = sanitizeDiagnostic(error instanceof Error ? error.message : 'Test reporting failed');
    process.stderr.write(`${message}\n`);
    process.exitCode ||= 1;
  }
}
