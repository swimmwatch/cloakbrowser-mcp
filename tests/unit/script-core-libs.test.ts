import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface FilesModule {
  assertFileExists(filePath: string, label?: string): void;
  readJson<T>(filePath: string): T;
  readText(filePath: string): string;
  writeJson(filePath: string, data: unknown): void;
  writeText(filePath: string, value: string): void;
}

interface GithubOutputModule {
  appendGithubOutput(outputs: Record<string, string>, outputPath?: string): Promise<void>;
}

interface HttpModule {
  fetchJson(url: string, options?: { githubToken?: string; userAgent?: string }): Promise<unknown>;
  fetchText(url: string, options?: { userAgent?: string }): Promise<string>;
}

interface IndexNowModule {
  assertIndexNowKey(key: string): void;
  extractSitemapUrls(xml: string): string[];
  loadSitemapUrls(input: { siteDir?: string; siteUrl: string }): Promise<string[]>;
  submitIndexNow(input: { key: string; siteUrl: string; urls: string[] }): Promise<{
    status: number;
    submitted: number;
  }>;
  writeIndexNowKeyFile(input: { docsDir?: string; key: string }): string;
}

interface NpmPackageModule {
  assertPackageFileList(files: string[]): void;
  formatBytes(bytes: number): string;
  requiredPackageFiles: string[];
}

interface ParityModule {
  assertEqual(actual: unknown, expected: unknown, label: string): void;
  expectedDefaultTools: string[];
  localToolNames: string[];
  normalizeToolResponseText(value: string): string;
}

interface SemverModule {
  compareVersions(left: string, right: string): number;
  latestVersion(...versions: string[]): string;
  parseVersion(version: string): { version: string; major: number; minor: number; patch: number };
  stripDependencyRange(range: string): string;
  toVersionTag(version: string): string;
}

interface TemplateModule {
  renderTemplate(template: string, values: Record<string, unknown>): string;
  renderTemplateFile(templatePath: string, values: Record<string, unknown>): Promise<string>;
}

const tempRoots: string[] = [];
const files = (await import(
  new URL('../../scripts/lib/files.mjs', import.meta.url).href
)) as unknown as FilesModule;
const githubOutput = (await import(
  new URL('../../scripts/lib/github-output.mjs', import.meta.url).href
)) as unknown as GithubOutputModule;
const http = (await import(
  new URL('../../scripts/lib/http.mjs', import.meta.url).href
)) as unknown as HttpModule;
const indexnow = (await import(
  new URL('../../scripts/lib/indexnow.mjs', import.meta.url).href
)) as unknown as IndexNowModule;
const npmPackage = (await import(
  new URL('../../scripts/lib/npm-package.mjs', import.meta.url).href
)) as unknown as NpmPackageModule;
const parity = (await import(
  new URL('../../scripts/lib/playwright-mcp-parity.mjs', import.meta.url).href
)) as unknown as ParityModule;
const semver = (await import(
  new URL('../../scripts/lib/semver.mjs', import.meta.url).href
)) as unknown as SemverModule;
const template = (await import(
  new URL('../../scripts/lib/template.mjs', import.meta.url).href
)) as unknown as TemplateModule;

afterEach(() => {
  vi.unstubAllGlobals();
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-script-core-'));
  tempRoots.push(root);
  return root;
}

describe('script file helpers', () => {
  it('reads and writes text and JSON files', () => {
    const root = createTempRoot();
    const textPath = path.join(root, 'message.txt');
    const jsonPath = path.join(root, 'data.json');

    files.writeText(textPath, 'hello');
    files.writeJson(jsonPath, { ok: true });

    expect(files.readText(textPath)).toBe('hello');
    expect(files.readJson<{ ok: boolean }>(jsonPath)).toEqual({ ok: true });
    expect(readFileSync(jsonPath, 'utf8')).toBe('{\n  "ok": true\n}\n');
    expect(() => files.assertFileExists(path.join(root, 'missing.txt'), 'fixture')).toThrow(
      'missing fixture',
    );
  });
});

describe('GitHub output helper', () => {
  it('appends workflow outputs when a path is provided', async () => {
    const root = createTempRoot();
    const outputPath = path.join(root, 'github-output');

    await githubOutput.appendGithubOutput({ one: '1', two: '2' }, outputPath);
    await githubOutput.appendGithubOutput({ three: '3' }, outputPath);
    await githubOutput.appendGithubOutput({ skipped: 'true' });

    expect(readFileSync(outputPath, 'utf8')).toBe('one=1\ntwo=2\nthree=3\n');
  });
});

describe('script HTTP helpers', () => {
  it('adds GitHub auth headers and parses JSON responses', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
          status: 200,
        });
      }),
    );

    await expect(
      http.fetchJson('https://api.github.com/repos/example/repo', { githubToken: 'token' }),
    ).resolves.toEqual({ ok: true });

    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: 'Bearer token',
      'X-GitHub-Api-Version': '2022-11-28',
    });
  });

  it('throws on failed text responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('missing', { status: 404, statusText: 'Not Found' })),
    );

    await expect(http.fetchText('https://example.invalid/file.txt')).rejects.toThrow(
      'Failed to fetch https://example.invalid/file.txt: 404 Not Found',
    );
  });
});

describe('IndexNow helpers', () => {
  it('validates keys, writes key files, extracts sitemap URLs, and filters submissions', async () => {
    const root = createTempRoot();
    const siteDir = path.join(root, 'site');
    mkdirSync(siteDir);
    const key = 'abcdef12';

    expect(indexnow.writeIndexNowKeyFile({ docsDir: siteDir, key })).toBe(path.join(siteDir, `${key}.txt`));
    expect(files.readText(path.join(siteDir, `${key}.txt`))).toBe(key);
    expect(() => indexnow.assertIndexNowKey('not-a-key')).toThrow('INDEXNOW_KEY');

    files.writeText(
      path.join(siteDir, 'sitemap.xml'),
      '<urlset><url><loc>https://example.com/docs/</loc></url></urlset>',
    );
    await expect(indexnow.loadSitemapUrls({ siteDir, siteUrl: 'https://example.com/' })).resolves.toEqual([
      'https://example.com/docs/',
    ]);
    expect(indexnow.extractSitemapUrls('<loc> https://a.example/ </loc>')).toEqual(['https://a.example/']);

    const requests: RequestInit[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        requests.push(init);
        return new Response('', { status: 200 });
      }),
    );

    await expect(
      indexnow.submitIndexNow({
        key,
        siteUrl: 'https://example.com/docs/',
        urls: ['https://example.com/docs/page/', 'https://other.example/docs/page/'],
      }),
    ).resolves.toEqual({ status: 200, submitted: 1 });
    const requestBody = requests[0]?.body;
    if (typeof requestBody !== 'string') throw new Error('expected string request body');
    expect(JSON.parse(requestBody)).toMatchObject({
      host: 'example.com',
      urlList: ['https://example.com/docs/page/'],
    });
  });
});

describe('npm package helpers', () => {
  it('validates package file allowlists and formats sizes', () => {
    expect(() => npmPackage.assertPackageFileList(npmPackage.requiredPackageFiles)).not.toThrow();
    expect(() => npmPackage.assertPackageFileList(['package.json'])).toThrow(
      'npm package is missing required file',
    );
    expect(() =>
      npmPackage.assertPackageFileList([...npmPackage.requiredPackageFiles, 'src/private.ts']),
    ).toThrow('npm package contains non-runtime files');
    expect(npmPackage.formatBytes(2048)).toBe('2 KiB');
  });
});

describe('semver helpers', () => {
  it('parses, compares, tags, and sorts semver-like values', () => {
    expect(semver.parseVersion('v1.2.3-beta.1')).toMatchObject({ version: '1.2.3', major: 1 });
    expect(semver.compareVersions('1.2.4', '1.2.3')).toBe(1);
    expect(semver.stripDependencyRange('^1.2.3')).toBe('1.2.3');
    expect(semver.toVersionTag('1.2.3-beta.1')).toBe('v1.2.3');
    expect(semver.latestVersion('1.0.0', '1.2.0', '1.1.9')).toBe('1.2.0');
  });
});

describe('template helper', () => {
  it('renders templates and rejects missing values', async () => {
    const root = createTempRoot();
    const templatePath = path.join(root, 'template.md');
    files.writeText(templatePath, 'Hello {{name}}');

    expect(template.renderTemplate('Version {{version}}', { version: '1.0.0' })).toBe('Version 1.0.0');
    await expect(template.renderTemplateFile(templatePath, { name: 'Ada' })).resolves.toBe('Hello Ada');
    expect(() => template.renderTemplate('{{missing}}', {})).toThrow('Missing template value: missing');
  });
});

describe('Playwright MCP parity helpers', () => {
  it('normalizes volatile tool response text and compares values', () => {
    expect(parity.localToolNames).toContain('cloakbrowser_binary_info');
    expect(parity.expectedDefaultTools).toContain('browser_snapshot');
    expect(
      parity.normalizeToolResponseText(
        'saved /data/path/page-123456.png in 1234ms\n### Events\n- unstable event\nDone',
      ),
    ).toBe('saved /data/<artifact> in <duration>msDone');
    expect(() => parity.assertEqual({ a: 1 }, { a: 2 }, 'value')).toThrow('value mismatch');
  });
});
