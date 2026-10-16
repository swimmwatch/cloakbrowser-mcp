import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface Identity {
  pr: number;
  run: number;
  attempt: number;
  sha: string;
  path: string;
  fallback: string;
}
type Api = (method: string, endpoint: string, body?: unknown) => Promise<unknown>;
interface Publisher {
  resolveIdentity: (api: Api, id: number, trigger?: Record<string, unknown>) => Promise<Identity | undefined>;
  preparePublicReport: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  copyGeneratedReport: (report: string, target: string) => Promise<Array<{ path: string; digest: string }>>;
  maxReportFileBytes: number;
  updateReportComment: (
    api: Api,
    identity: Identity,
    report?: Record<string, unknown>,
    url?: string,
  ) => Promise<string>;
  cleanPublicTree: (tree: string, now: number) => Promise<Identity[]>;
  verifyPublicReport: (
    api: Api,
    request: (url: string) => Promise<Buffer>,
    options: Record<string, unknown>,
  ) => Promise<void>;
  githubApi: (token: string, destination?: string, request?: typeof fetch) => Api;
}
const url = new URL('../../scripts/publish-test-report.mjs', import.meta.url);
const publisher = (await import(url.href)) as Publisher;
const writerUrl = new URL('../../scripts/lib/test-results.mjs', import.meta.url);
const writer = (await import(writerUrl.href)) as {
  writeTestResult: (options: Record<string, unknown>) => Promise<void>;
};
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
const sha = 'a'.repeat(40);
const identity: Identity = {
  pr: 7,
  run: 20,
  attempt: 2,
  sha,
  path: `pr/7/run/20-attempt-2/${sha}`,
  fallback: 'https://github.com/swimmwatch/cloakbrowser-mcp/actions/runs/20/attempts/2',
};
const base = '/repos/swimmwatch/cloakbrowser-mcp';
const bot = { type: 'Bot', login: 'github-actions[bot]' };
const pr = { number: 7, state: 'open', head: { sha } };
const run = {
  id: 20,
  run_attempt: 2,
  event: 'pull_request',
  head_sha: sha,
  path: '.github/workflows/ci.yml',
};
const report = {
  status: 'failed',
  total: 2,
  passed: 1,
  failed: 1,
  broken: 0,
  skipped: 0,
  missing: [],
  environments: [
    { id: 'linux', failed: 0 },
    { id: 'windows', failed: 1 },
  ],
};
const reportUrl = `https://swimmwatch.github.io/cloakbrowser-mcp-reports/${identity.path}/`;
function fakeApi(
  comments: unknown[] = [],
  current: unknown = pr,
  runs: unknown[] = [run],
  jobs: unknown[] = [],
) {
  const writes: { method: string; endpoint: string; body: unknown }[] = [];
  const reads: string[] = [];
  const api: Api = async (method, endpoint, body) => {
    if (method !== 'GET') {
      writes.push({ method, endpoint, body });
      return {};
    }
    reads.push(endpoint);
    if (endpoint === `${base}/pulls/7`) return current;
    if (endpoint.startsWith(`${base}/actions/workflows/ci.yml/runs?`)) return { workflow_runs: runs };
    if (endpoint.startsWith(`${base}/issues/7/comments?`)) return comments;
    if (endpoint.startsWith(`${base}/actions/runs/20/attempts/2/jobs?`)) return { jobs };
    throw new Error(`Unexpected API access: ${endpoint}`);
  };
  return { api, writes, reads };
}
async function fixture() {
  const temporary = await mkdtemp(path.join(tmpdir(), 'report-publisher-'));
  const root = await realpath(temporary);
  roots.push(root);
  return root;
}

async function producer(input: string) {
  const root = path.join(input, 'test-results-linux');
  const result = {
    uuid: randomUUID(),
    file: 'tests/controlled.test.ts',
    name: 'Controlled result',
    project: 'default',
    feature: 'publisher',
    level: 'integration',
    status: 'passed',
    start: 0,
    stop: 1,
    retry: 0,
    environment: { os: 'linux', arch: 'x64', node: '24', browser: 'none', lane: 'pr' },
    attachments: [],
  };
  const options = { root, runId: 'run-20-attempt-2', producerId: 'linux', results: [result] };
  await writer.writeTestResult(options);
  return path.join(root, options.runId, options.producerId);
}

describe('trusted report publisher', () => {
  it('prepares a report through the CLI using workflow Node versions without an environment override', async () => {
    const root = await fixture();
    const input = path.join(root, 'download');
    const output = path.join(root, 'public');
    await mkdir(input);
    const repository = 'swimmwatch/cloakbrowser-mcp-reports';
    const state = { repository, identity };
    const statePath = path.join(root, 'cloak-report-publication.json');
    const serializedState = JSON.stringify(state);
    await writeFile(statePath, serializedState);
    const platforms = ['ubuntu-latest'];
    const encodedPlatforms = JSON.stringify(platforms);
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GITHUB_TOKEN: 'controlled-test-credential',
      GITHUB_REPOSITORY: 'swimmwatch/cloakbrowser-mcp',
      REPORTS_REPOSITORY: repository,
      RUNNER_TEMP: root,
      REPORT_INPUT: input,
      REPORT_PUBLIC_TREE: output,
      CLOAK_REPORT_PLATFORMS: encodedPlatforms,
    };
    delete env.NODE_CHECK_VERSIONS;
    const filename = fileURLToPath(url);
    const args = [filename, 'prepare'];
    const options = { env };
    const execute = promisify(execFile);
    const result = await execute(process.execPath, args, options);
    expect(result.stderr).toBe('');
    const saved = await readFile(statePath, 'utf8');
    const updated = JSON.parse(saved) as {
      publication: { summary: { missing: string[]; status: string }; identity: Identity };
    };
    const reportCliUrl = new URL('../../scripts/test-report.mjs', import.meta.url);
    const cli = (await import(reportCliUrl.href)) as {
      ciPlan: (lane: string, platforms: string[]) => string[];
    };
    const expected = cli.ciPlan('pr', platforms);
    expect(updated.publication.summary.missing).toEqual(expected);
    expect(updated.publication.summary.status).toBe('failed');
    const htmlPath = path.join(output, identity.path, 'index.html');
    const html = await readFile(htmlPath, 'utf8');
    expect(html).toContain('<html');
  });
  it('keeps matrix failures truthful and never updates a user-owned marker comment', async () => {
    const human = {
      id: 1,
      user: { type: 'User', login: 'maintainer' },
      body: '<!-- cloakbrowser-report -->',
    };
    const f = fakeApi([human]);
    await publisher.updateReportComment(f.api, identity, report, reportUrl);
    expect(f.writes).toHaveLength(1);
    expect(f.writes[0]?.endpoint).toBe(`${base}/issues/7/comments`);
    const body = JSON.stringify(f.writes[0]?.body);
    expect(body).toContain(sha);
    expect(body).toContain('Windows');
    expect(body).toContain('❌ **Failed**');
    expect(body).toContain(reportUrl);
  });
  it('keeps successful environments collapsed and highlights failures with readable names', async () => {
    const f = fakeApi();
    const summary = {
      ...report,
      environments: [
        { id: 'linux/arm64/24/none/pr-quality', failed: 0 },
        { id: 'darwin/x64/22/none/pr-quality', failed: 1 },
      ],
    };
    await publisher.updateReportComment(f.api, identity, summary, reportUrl);
    const body = (f.writes[0]?.body as { body: string }).body;
    const [overview, details] = body.split('<details>');
    expect(overview).toContain('| 2 | 1 | 1 | 0 | 0 |');
    expect(overview).toContain('#### macOS');
    expect(overview).toContain('| x64 | 22 | — | quality | 1 | — |');
    expect(overview).not.toContain('Linux');
    expect(overview).not.toContain('none');
    expect(details).toContain('All environments (2)');
    expect(details).toContain('#### Linux');
    expect(details).toContain('| arm64 | 24 | — | quality | 0 | — |');
    expect(body).toContain(`Commit [\`${sha.slice(0, 7)}\`]`);
    expect(body).toContain('**[Open Allure report →]');
  });
  it('groups operating systems into separate tables with direct links to the matching attempt jobs', async () => {
    const cases = [
      ['linux/x64/22/none/pr-quality', 'quality (ubuntu-latest, node 22)', 101],
      ['linux/x64/22/mixed/pr-cdp', 'e2e (ubuntu-24.04, node 22)', 102],
      ['darwin/arm64/26/playwright/pr-console', 'e2e (macos-latest, node 26)', 103],
      ['darwin/arm64/26/mixed/pr-cdp', 'e2e (macos-latest, node 26)', 103],
      ['darwin/x64/24/cloak/pr-npm', 'functional (macos-15-intel, npm, node 24)', 104],
      ['win32/x64/24/cloak/pr-extensions', 'functional (windows-latest, extensions, node 24)', 105],
      ['linux/arm64/22/cloak/pr-docker', 'docker (linux/arm64)', 106],
      ['linux/arm64/22/cloak/pr-docker-cdp', 'docker (linux/arm64)', 106],
      ['linux/arm64/22/playwright/pr-docker-cdp', 'docker (linux/arm64)', 106],
    ] as const;
    const jobEntries = cases.map(([, name, id]) => [id, { id, name }] as const);
    const uniqueJobs = new Map(jobEntries);
    const jobs = [...uniqueJobs.values()].map((job) => ({
      ...job,
      run_id: identity.run,
      head_sha: identity.sha,
      run_attempt: identity.attempt,
      html_url: 'https://untrusted.invalid/ignored',
    }));
    const comments: unknown[] = [];
    const runs = [run];
    const f = fakeApi(comments, pr, runs, jobs);
    const summary = {
      ...report,
      status: 'passed',
      total: cases.length,
      passed: cases.length,
      failed: 0,
      environments: cases.map(([id]) => ({ id, failed: 0 })),
    };
    await publisher.updateReportComment(f.api, identity, summary, reportUrl);
    const body = (f.writes[0]?.body as { body: string }).body;
    const headings = body.match(/^#### .+$/gmu);
    const expectedHeadings = ['#### macOS', '#### Linux', '#### Windows'];
    expect(headings).toEqual(expectedHeadings);
    const headers = body.match(
      /^\| Architecture \| Node.js \| Browser \| Suite \| Failed \/ broken \| Job \|$/gmu,
    );
    expect(headers).toHaveLength(3);
    for (const [environment, , id] of cases) {
      const [, arch, node, browser, lane] = environment.split('/');
      const engine = browser === 'none' ? '—' : browser;
      const suite = lane?.replace(/^pr-/u, '');
      const link = `https://github.com/swimmwatch/cloakbrowser-mcp/actions/runs/20/job/${id}`;
      const row = `| ${arch} | ${node} | ${engine} | ${suite} | 0 | [Open job](${link}) |`;
      expect(body).toContain(row);
    }
    expect(body).not.toContain('untrusted.invalid');
    const jobsEndpoint = `${base}/actions/runs/20/attempts/2/jobs?per_page=100&page=1`;
    expect(f.reads).toContain(jobsEndpoint);
  });
  it.each([
    { id: -1 },
    { run_id: 21 },
    { head_sha: 'b'.repeat(40) },
    { run_attempt: 1 },
    { name: 'quality (macos-latest, node 24)' },
  ])('omits a job link when API identity or environment does not match: %j', async (change) => {
    const job = {
      id: 101,
      name: 'quality (ubuntu-latest, node 24)',
      run_id: identity.run,
      head_sha: identity.sha,
      run_attempt: identity.attempt,
      ...change,
    };
    const comments: unknown[] = [];
    const runs = [run];
    const jobs = [job];
    const f = fakeApi(comments, pr, runs, jobs);
    const summary = {
      ...report,
      environments: [{ id: 'linux/x64/24/none/pr-quality', failed: 0 }],
    };
    await publisher.updateReportComment(f.api, identity, summary, reportUrl);
    const body = (f.writes[0]?.body as { body: string }).body;
    expect(body).toContain('| x64 | 24 | — | quality | 0 | — |');
    expect(body).not.toContain('[Open job]');
  });
  it('omits attention warnings for a successful run and sorts environments deterministically', async () => {
    const summary = {
      ...report,
      status: 'passed',
      passed: 2,
      failed: 0,
      environments: report.environments.map((entry) => ({ ...entry, failed: 0 })),
    };
    const initial = fakeApi();
    await publisher.updateReportComment(initial.api, identity, summary, reportUrl);
    const body = (initial.writes[0]?.body as { body: string }).body;
    expect(body).toContain('✅ **Passed**');
    expect(body).not.toContain('Needs attention');
    expect(body).not.toContain('Missing producers');
    const reordered = { ...summary, environments: [...summary.environments].reverse() };
    const duplicate = fakeApi([{ id: 2, user: bot, body }]);
    const status = await publisher.updateReportComment(duplicate.api, identity, reordered, reportUrl);
    expect(status).toBe('unchanged');
    expect(duplicate.writes).toEqual([]);
  });
  it('marks incomplete evidence and escapes Markdown and HTML in environment labels', async () => {
    const f = fakeApi();
    const summary = {
      ...report,
      status: 'passed',
      failed: 0,
      missing: ['quality|missing', 'api_key=comment-secret-canary'],
      environments: [{ id: '<img src=x>|[link]', failed: 0 }],
    };
    await publisher.updateReportComment(f.api, identity, summary, reportUrl);
    const body = (f.writes[0]?.body as { body: string }).body;
    expect(body).toContain('⚠️ **Incomplete**');
    expect(body).not.toContain('✅ **Passed**');
    expect(body).toContain('Missing producers: 2');
    expect(body).not.toContain('comment-secret-canary');
    expect(body).toContain('quality&#124;missing');
    expect(body).not.toContain('<img');
    expect(body).not.toContain('[link]');
    expect(body).toContain('&lt;img src=x&gt;&#124;&#91;link&#93;');
  });
  it('updates only one bot-owned marker and makes identical events idempotent', async () => {
    const initial = fakeApi();
    await publisher.updateReportComment(initial.api, identity, report, reportUrl);
    const body = (initial.writes[0]?.body as { body: string }).body;
    const duplicate = fakeApi([{ id: 2, user: bot, body }]);
    expect(await publisher.updateReportComment(duplicate.api, identity, report, reportUrl)).toBe('unchanged');
    expect(duplicate.writes).toEqual([]);
    const old = fakeApi([{ id: 2, user: bot, body: '<!-- cloakbrowser-report -->\nold' }]);
    await publisher.updateReportComment(old.api, identity, report, reportUrl);
    expect(old.writes[0]?.endpoint).toBe(`${base}/issues/comments/2`);
  });
  it.each(['head', 'run', 'attempt'])('does not overwrite a newer %s', async (change) => {
    const current = change === 'head' ? { ...pr, head: { sha: 'b'.repeat(40) } } : pr;
    const newer = change === 'run' ? { ...run, id: 21 } : { ...run, run_attempt: 3 };
    const f = fakeApi([], current, change === 'head' ? [run] : [newer]);
    expect(await publisher.updateReportComment(f.api, identity, report, reportUrl)).toBe('stale');
    expect(f.writes).toEqual([]);
  });
  it('reports unavailable deployment without a successful public link', async () => {
    const f = fakeApi();
    await publisher.updateReportComment(f.api, identity);
    const body = JSON.stringify(f.writes[0]?.body);
    expect(body).toContain('unavailable');
    expect(body).toContain(identity.fallback);
    expect(body).not.toContain('github.io');
  });
  it('regenerates actual merged HTML and publishes no producer HTML or raw results', async () => {
    const root = await fixture();
    const input = path.join(root, 'download');
    const output = path.join(root, 'public');
    await mkdir(input);
    for (const id of ['linux', 'windows']) {
      const artifact = path.join(input, `test-results-${id}`);
      const result = {
        uuid: randomUUID(),
        file: 'tests/controlled.test.ts',
        name: 'Controlled matrix',
        project: 'default',
        feature: 'publisher',
        level: 'integration',
        status: id === 'linux' ? 'passed' : 'failed',
        start: 0,
        stop: 1,
        retry: 0,
        environment: { os: id, arch: 'x64', node: '24', browser: 'none', lane: 'pr' },
        attachments: [{ name: 'log', type: 'text/plain', data: 'Authorization: Bearer synthetic-secret' }],
      };
      const options = { root: artifact, runId: 'run-20-attempt-2', producerId: id, results: [result] };
      await writer.writeTestResult(options);
      // A producer can tamper with valid evidence after its first sanitization.
      const owner = path.join(artifact, options.runId, id);
      const filenames = await readdir(owner);
      const filename = filenames.find((entry) => entry.endsWith('-result.json'));
      if (!filename) throw new Error('Missing controlled result');
      const target = path.join(owner, filename);
      const stored = JSON.parse(await readFile(target, 'utf8')) as {
        name: string;
        statusDetails: { message?: string };
      };
      stored.name = 'Controlled matrix <img src=x onerror="globalThis.publisherAttack=true">';
      stored.statusDetails.message = 'password=second-pass-secret';
      await writeFile(target, JSON.stringify(stored));
    }
    const expected = ['linux', 'windows'];
    const options = { input, output, identity, expected };
    const summary = await publisher.preparePublicReport(options);
    expect(summary).toMatchObject({ total: 2, failed: 1 });
    const published = path.join(output, identity.path);
    const entries = await readdir(published);
    expect(entries).toContain('index.html');
    expect(entries).toContain('data');
    expect(entries).toContain('widgets');
    const hasScript = entries.some((filename) => filename.endsWith('.js'));
    expect(hasScript).toBe(true);
    const excluded = ['results', 'history.jsonl', 'report.json', 'test-results.json'];
    for (const filename of excluded) expect(entries).not.toContain(filename);
    const html = await readFile(path.join(published, 'index.html'), 'utf8');
    expect(html).toContain('<html');
    expect(html).not.toContain('synthetic-secret');
    expect(html).not.toContain('second-pass-secret');
    expect(html).not.toContain('<img src=x onerror=');
    expect(html).not.toContain('data:text/javascript;base64,');
    const files = await readdir(published, { recursive: true });
    for (const filename of files.filter((name) => /\.(?:json|html|txt)$/.test(name))) {
      const target = path.join(published, filename);
      const text = await readFile(target, 'utf8');
      expect(text).not.toContain('synthetic-secret');
      expect(text).not.toContain('second-pass-secret');
    }
    const statisticsPath = path.join(published, 'widgets/statistic.json');
    const statistics = JSON.parse(await readFile(statisticsPath, 'utf8')) as {
      total: number;
      failed: number;
    };
    const expectedStatistics = { total: 2, failed: 1 };
    expect(statistics).toMatchObject(expectedStatistics);
    const publicationPath = path.join(published, 'publication.json');
    const publication = JSON.parse(await readFile(publicationPath, 'utf8')) as {
      digest: string;
      assets: Array<{ path: string; digest: string }>;
    };
    const request = async (href: string) => {
      const relative = href === reportUrl ? 'index.html' : href.slice(reportUrl.length);
      const filename = path.join(published, relative);
      return readFile(filename);
    };
    const api: Api = async () => ({ status: 'built', commit: sha });
    const verification = {
      ...publication,
      repository: 'swimmwatch/cloakbrowser-mcp-reports',
      commit: sha,
      url: reportUrl,
    };
    await publisher.verifyPublicReport(api, request, verification);
    const hasStatistics = publication.assets.some((asset) => asset.path === 'widgets/statistic.json');
    expect(hasStatistics).toBe(true);
    const f = fakeApi();
    await publisher.updateReportComment(f.api, identity, summary, reportUrl);
    expect(JSON.stringify(f.writes)).not.toContain('synthetic-secret');
  });
  it('rejects artifact executable content before producing a public tree', async () => {
    const root = await fixture();
    const input = path.join(root, 'download');
    const output = path.join(root, 'public');
    await mkdir(input);
    const directory = await producer(input);
    await writeFile(path.join(directory, 'index.html'), '<script>danger()</script>');
    const options = { input, output, identity, expected: ['linux'] };
    await expect(publisher.preparePublicReport(options)).rejects.toThrow('unsupported producer files');
    await expect(readdir(output)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects a forged manifest path before producing output', async () => {
    const root = await fixture();
    const input = path.join(root, 'download');
    await mkdir(input);
    const directory = await producer(input);
    const filename = path.join(directory, 'producer.json');
    const manifest = JSON.parse(await readFile(filename, 'utf8')) as { results: string[] };
    manifest.results = ['../outside-result.json'];
    await writeFile(filename, JSON.stringify(manifest));
    const output = path.join(root, 'public');
    const options = { input, output, identity, expected: ['linux'] };
    await expect(publisher.preparePublicReport(options)).rejects.toThrow('unsafe result path');
    await expect(readdir(output)).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rejects ambiguous bot ownership without changing any comments', async () => {
    const body = '<!-- cloakbrowser-report -->';
    const f = fakeApi([
      { id: 1, user: bot, body },
      { id: 2, user: bot, body },
    ]);
    await expect(publisher.updateReportComment(f.api, identity, report, reportUrl)).rejects.toThrow(
      'multiple bot-owned',
    );
    expect(f.writes).toEqual([]);
  });
  it('rejects wrong-target and unsupported API writes before invoking the network', async () => {
    const calls: unknown[] = [];
    const request: typeof fetch = async (...args) => {
      calls.push(args);
      return new Response('{}');
    };
    const api = publisher.githubApi('synthetic-test-token', undefined, request);
    for (const endpoint of [
      '/repos/swimmwatch/cloakbrowser-mcp/contents/site',
      '/repos/other/reports/issues/7/comments',
    ]) {
      await expect(api('POST', endpoint, {})).rejects.toThrow();
    }
    await expect(api('DELETE', `${base}/issues/comments/2`)).rejects.toThrow('forbidden API write');
    expect(calls).toEqual([]);
  });
  it('keeps publisher disabled, read-only source access and trusted checkout wiring', async () => {
    const workflow = await readFile('.github/workflows/publish-test-report.yml', 'utf8');
    expect(workflow).toContain("vars.TEST_REPORT_PUBLICATION_ENABLED == 'true'");
    expect(workflow).toContain("github.event.workflow_run.event == 'pull_request'");
    expect(workflow).toContain('  workflow_call:');
    expect(workflow).toContain('github.event.pull_request.head.repo.full_name == github.repository');
    expect(workflow).toContain('github.event.workflow_run.head_repository.full_name != github.repository');
    expect(workflow).toContain('github.event.repository.default_branch || github.sha');
    expect(workflow).toContain("if: steps.identity.outputs.eligible == 'true'");
    const ci = await readFile('.github/workflows/ci.yml', 'utf8');
    expect(ci).toContain('    needs: test-report');
    expect(ci).toContain('    uses: ./.github/workflows/publish-test-report.yml');
    expect(ci).not.toContain('secrets: inherit');
    expect(ci).toContain('TEST_REPORT_APP_PRIVATE_KEY: ${{ secrets.TEST_REPORT_APP_PRIVATE_KEY }}');
    expect(workflow).not.toMatch(/^\s+(?:contents|pages): write/m);
    expect(workflow).not.toContain('github.event.workflow_run.head_sha');
    expect(workflow).toContain('persist-credentials: false');
    expect(workflow).toContain('external_repository: ${{ env.REPORTS_REPOSITORY }}');
    expect(workflow.indexOf('run: node scripts/publish-test-report.mjs prepare')).toBeLessThan(
      workflow.indexOf('uses: actions/create-github-app-token@'),
    );
  });
  it('resolves the active caller against API identity and skips manual runs without an open PR', async () => {
    const source = { id: 10, full_name: 'swimmwatch/cloakbrowser-mcp' };
    const active = {
      ...run,
      status: 'in_progress',
      event: 'workflow_dispatch',
      workflow_id: 4,
      repository: source,
      head_repository: source,
    };
    const current = { ...pr, head: { sha, repo: source }, base: { repo: source } };
    let associations: unknown[] = [current];
    const api: Api = async (_method, endpoint) => {
      if (endpoint === base) return source;
      if (endpoint === `${base}/actions/workflows/ci.yml`) return { id: 4 };
      if (endpoint === `${base}/actions/runs/20`) return active;
      if (endpoint.startsWith(`${base}/commits/${sha}/pulls?`)) return associations;
      if (endpoint === `${base}/pulls/7`) return current;
      throw new Error(`Unexpected API access: ${endpoint}`);
    };
    const trigger = { event: 'workflow_dispatch', activeRun: { id: 20, attempt: 2 } };
    expect(await publisher.resolveIdentity(api, 20, trigger)).toEqual(identity);
    const wrongAttempt = { ...trigger, activeRun: { id: 20, attempt: 3 } };
    await expect(publisher.resolveIdentity(api, 20, wrongAttempt)).rejects.toThrow('workflow identity');
    const wrongEvent = { ...trigger, event: 'pull_request' };
    await expect(publisher.resolveIdentity(api, 20, wrongEvent)).rejects.toThrow('workflow identity');
    associations = [];
    expect(await publisher.resolveIdentity(api, 20, trigger)).toBeUndefined();
    associations = [current, { ...current, number: 8 }];
    await expect(publisher.resolveIdentity(api, 20, trigger)).rejects.toThrow('unique current PR');
  });
  it('verifies both successful Pages build identity and exact entrypoint bytes', async () => {
    const bytes = Buffer.from('<html>trusted</html>');
    const digest = createHash('sha256').update(bytes).digest('hex');
    const options = {
      repository: 'swimmwatch/cloakbrowser-mcp-reports',
      commit: sha,
      url: reportUrl,
      digest,
    };
    const api: Api = async () => ({ status: 'built', commit: sha });
    const request = async () => bytes;
    await publisher.verifyPublicReport(api, request, options);
    const wrong = async () => Buffer.from('other report');
    await expect(publisher.verifyPublicReport(api, wrong, options)).rejects.toThrow('entrypoint');
    const pending: Api = async () => ({ status: 'building', commit: sha });
    await expect(publisher.verifyPublicReport(pending, request, options)).rejects.toThrow('deployment');
  });
  it('rejects deployment with missing or substituted report resources', async () => {
    const html = Buffer.from('<html>trusted</html>');
    const script = Buffer.from('trusted generated script');
    const digest = createHash('sha256').update(html).digest('hex');
    const assetDigest = createHash('sha256').update(script).digest('hex');
    const asset = { path: 'app.js', digest: assetDigest };
    const options = {
      repository: 'swimmwatch/cloakbrowser-mcp-reports',
      commit: sha,
      url: reportUrl,
      digest,
      assets: [asset],
    };
    const api: Api = async () => ({ status: 'built', commit: sha });
    const valid = async (href: string) => (href === reportUrl ? html : script);
    await publisher.verifyPublicReport(api, valid, options);
    const missing = async (href: string) => {
      if (href === reportUrl) return html;
      throw new Error('HTTP status 404');
    };
    const missingResult = publisher.verifyPublicReport(api, missing, options);
    await expect(missingResult).rejects.toThrow('404');
    const substituted = async () => html;
    const substitutedResult = publisher.verifyPublicReport(api, substituted, options);
    await expect(substitutedResult).rejects.toThrow('resource does not match');
    const unsafe = { ...options, assets: [{ ...asset, path: '../other-report/app.js' }] };
    const unsafeResult = publisher.verifyPublicReport(api, valid, unsafe);
    await expect(unsafeResult).rejects.toThrow('unsafe resource identity');
  });
  it('rejects oversized generated resources before they enter the publication tree', async () => {
    const root = await fixture();
    const source = path.join(root, 'report');
    const target = path.join(root, 'public');
    await mkdir(source);
    const filename = path.join(source, 'app.js');
    await writeFile(filename, '');
    const oversized = publisher.maxReportFileBytes + 1;
    await truncate(filename, oversized);
    const copying = publisher.copyGeneratedReport(source, target);
    await expect(copying).rejects.toThrow('exceeds the GitHub 100 MiB file limit');
    const files = await readdir(target);
    expect(files).toHaveLength(0);
  });
  it('rejects links in generated resources instead of copying files outside the report', async () => {
    const root = await fixture();
    const source = path.join(root, 'report');
    const target = path.join(root, 'public');
    const outside = path.join(root, 'outside');
    await mkdir(source);
    await mkdir(outside);
    const link = path.join(source, 'data');
    await symlink(outside, link, 'junction');
    const copying = publisher.copyGeneratedReport(source, target);
    await expect(copying).rejects.toThrow('symlink in generated report');
    const files = await readdir(target);
    expect(files).toHaveLength(0);
  });
  it('cleans expired owned paths while preserving live and unrelated files', async () => {
    const tree = await fixture();
    const now = Date.UTC(2026, 9, 10);
    const expired = path.join(tree, identity.path);
    await mkdir(expired, { recursive: true });
    const metadata = { version: 1, identity, created: now - 15 * 86400000 };
    await writeFile(path.join(expired, 'publication.json'), JSON.stringify(metadata));
    await writeFile(path.join(expired, 'index.html'), 'owned');
    const live = path.join(tree, 'unrelated');
    await mkdir(live);
    await writeFile(path.join(live, 'index.html'), 'retain');
    const freshIdentity = {
      ...identity,
      run: 21,
      path: `pr/7/run/21-attempt-2/${sha}`,
      fallback: 'https://github.com/swimmwatch/cloakbrowser-mcp/actions/runs/21/attempts/2',
    };
    const fresh = path.join(tree, freshIdentity.path);
    await mkdir(fresh, { recursive: true });
    const freshMetadata = { version: 1, identity: freshIdentity, created: now };
    await writeFile(path.join(fresh, 'publication.json'), JSON.stringify(freshMetadata));
    await writeFile(path.join(fresh, 'index.html'), 'fresh');
    expect(await publisher.cleanPublicTree(tree, now)).toEqual([identity]);
    await expect(readFile(path.join(expired, 'index.html'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(live, 'index.html'), 'utf8')).toBe('retain');
    expect(await readFile(path.join(fresh, 'index.html'), 'utf8')).toBe('fresh');
  });
  it('rejects forged retention metadata without deleting a report', async () => {
    const tree = await fixture();
    const owned = path.join(tree, identity.path);
    await mkdir(owned, { recursive: true });
    const metadata = { version: 1, identity: { ...identity, pr: 8 }, created: 0 };
    await writeFile(path.join(owned, 'publication.json'), JSON.stringify(metadata));
    await writeFile(path.join(owned, 'index.html'), 'retain');
    await expect(publisher.cleanPublicTree(tree, Date.now())).rejects.toThrow('identity');
    expect(await readFile(path.join(owned, 'index.html'), 'utf8')).toBe('retain');
  });
  it('rejects symlinked cleanup roots without touching their target', async () => {
    const tree = await fixture();
    const target = await fixture();
    await writeFile(path.join(target, 'keep'), 'safe');
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    await symlink(target, path.join(tree, 'pr'), type);
    await expect(publisher.cleanPublicTree(tree, Date.now())).rejects.toThrow();
    expect(await readFile(path.join(target, 'keep'), 'utf8')).toBe('safe');
  });
});
