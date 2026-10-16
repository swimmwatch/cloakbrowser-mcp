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
  fetchJson(
    url: string,
    options?: {
      githubToken?: string;
      userAgent?: string;
    },
  ): Promise<unknown>;
  fetchText(
    url: string,
    options?: {
      userAgent?: string;
    },
  ): Promise<string>;
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
  parseNpmPackOutput(raw: string): NpmPackResult;
  requiredPackageFiles: string[];
}
interface NpmPackResult {
  entryCount: number;
  filename: string;
  files: Array<{
    path: string;
  }>;
  name: string;
  size: number;
  unpackedSize: number;
  version: string;
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
  parseVersion(version: string): {
    version: string;
    major: number;
    minor: number;
    patch: number;
  };
  stripDependencyRange(range: string): string;
  toVersionTag(version: string): string;
}
interface TemplateModule {
  renderTemplate(template: string, values: Record<string, unknown>): string;
  renderTemplateFile(templatePath: string, values: Record<string, unknown>): Promise<string>;
}
interface VersionCompatibilityModule {
  prependLocalizedCompatibilityRow(
    content: string,
    previousRow: CompatibilityRow,
    currentRow: CompatibilityRow,
  ): string;
}
interface CompatibilityRow {
  cloakbrowser: string;
  node: string;
  parity: string;
  playwrightMcp: string;
  playwrightMcpDockerBase: string;
  readmePlatforms: string;
  testedPlatform: string;
  transports: string[];
  version: string;
}
const tempRoots: string[] = [];
const argumentValue = new URL('../../scripts/lib/files.mjs', import.meta.url).href;
const files = (await import(argumentValue)) as unknown as FilesModule;
const argumentValue2 = new URL('../../scripts/lib/github-output.mjs', import.meta.url).href;
const githubOutput = (await import(argumentValue2)) as unknown as GithubOutputModule;
const argumentValue3 = new URL('../../scripts/lib/http.mjs', import.meta.url).href;
const http = (await import(argumentValue3)) as unknown as HttpModule;
const argumentValue4 = new URL('../../scripts/lib/indexnow.mjs', import.meta.url).href;
const indexnow = (await import(argumentValue4)) as unknown as IndexNowModule;
const argumentValue5 = new URL('../../scripts/lib/npm-package.mjs', import.meta.url).href;
const npmPackage = (await import(argumentValue5)) as unknown as NpmPackageModule;
const argumentValue6 = new URL('../../scripts/lib/playwright-mcp-parity.mjs', import.meta.url).href;
const parity = (await import(argumentValue6)) as unknown as ParityModule;
const argumentValue7 = new URL('../../scripts/lib/semver.mjs', import.meta.url).href;
const semver = (await import(argumentValue7)) as unknown as SemverModule;
const argumentValue8 = new URL('../../scripts/lib/template.mjs', import.meta.url).href;
const template = (await import(argumentValue8)) as unknown as TemplateModule;
const argumentValue9 = new URL('../../scripts/lib/version-compatibility.mjs', import.meta.url).href;
const versionCompatibility = (await import(argumentValue9)) as unknown as VersionCompatibilityModule;
afterEach(() => {
  vi.unstubAllGlobals();
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-script-core-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
describe('script file helpers', () => {
  it('reads and writes text and JSON files', () => {
    const root = createTempRoot();
    const textPath = path.join(root, 'message.txt');
    const jsonPath = path.join(root, 'data.json');
    files.writeText(textPath, 'hello');
    const writeJsonOptions = { ok: true } as const;
    files.writeJson(jsonPath, writeJsonOptions);
    const textResult = files.readText(textPath);
    expect(textResult).toBe('hello');
    const jsonResult = files.readJson<{
      ok: boolean;
    }>(jsonPath);
    const receiverActual = jsonResult;
    const toEqualOptions = { ok: true } as const;
    expect(receiverActual).toEqual(toEqualOptions);
    const fileSyncResult = readFileSync(jsonPath, 'utf8');
    expect(fileSyncResult).toBe('{\n  "ok": true\n}\n');
    expect(() => {
      const joinedPath2 = path.join(root, 'missing.txt');
      return files.assertFileExists(joinedPath2, 'fixture');
    }).toThrow('missing fixture');
  });
});
describe('GitHub output helper', () => {
  it('appends workflow outputs when a path is provided', async () => {
    const root = createTempRoot();
    const outputPath = path.join(root, 'github-output');
    const appendGithubOutputOptions = { one: '1', two: '2' } as const;
    await githubOutput.appendGithubOutput(appendGithubOutputOptions, outputPath);
    const appendGithubOutputOptions2 = { three: '3' } as const;
    await githubOutput.appendGithubOutput(appendGithubOutputOptions2, outputPath);
    const appendGithubOutputOptions3 = { skipped: 'true' } as const;
    await githubOutput.appendGithubOutput(appendGithubOutputOptions3);
    const fileSyncResult2 = readFileSync(outputPath, 'utf8');
    expect(fileSyncResult2).toBe('one=1\ntwo=2\nthree=3\n');
  });
});
describe('script HTTP helpers', () => {
  it('adds GitHub auth headers and parses JSON responses', async () => {
    const calls: Array<{
      url: string;
      init: RequestInit;
    }> = [];
    const fnResult = vi.fn(async (url: string, init: RequestInit) => {
      const pushOptions = { url, init } as const;
      calls.push(pushOptions);
      const stringifyOptions = { ok: true } as const;
      const serializedValue = JSON.stringify(stringifyOptions);
      const responseOptions = {
        headers: { 'content-type': 'application/json' },
        status: 200,
      } as const;
      return new Response(serializedValue, responseOptions);
    });
    vi.stubGlobal('fetch', fnResult);
    const fetchJsonOptions = { githubToken: 'token' } as const;
    const fetchJsonResult = http.fetchJson('https://api.github.com/repos/example/repo', fetchJsonOptions);
    const receiver2Actual = fetchJsonResult;
    const toEqualOptions2 = { ok: true } as const;
    await expect(receiver2Actual).resolves.toEqual(toEqualOptions2);
    const receiver3Actual = calls[0]?.init.headers;
    const toMatchObjectOptions = {
      Authorization: 'Bearer token',
      'X-GitHub-Api-Version': '2022-11-28',
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions);
  });
  it('throws on failed text responses', async () => {
    const fnResult2 = vi.fn(async () => {
      const responseOptions2 = { status: 404, statusText: 'Not Found' } as const;
      return new Response('missing', responseOptions2);
    });
    vi.stubGlobal('fetch', fnResult2);
    const fetchTextResult = http.fetchText('https://example.invalid/file.txt');
    await expect(fetchTextResult).rejects.toThrow(
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
    const writeIndexNowKeyFileOptions = { docsDir: siteDir, key } as const;
    const writeIndexNowKeyFileResult = indexnow.writeIndexNowKeyFile(writeIndexNowKeyFileOptions);
    const receiver4Actual = writeIndexNowKeyFileResult;
    const message = `${key}.txt`;
    const joinedPath3 = path.join(siteDir, message);
    expect(receiver4Actual).toBe(joinedPath3);
    const message2 = `${key}.txt`;
    const joinedPath4 = path.join(siteDir, message2);
    const textResult2 = files.readText(joinedPath4);
    expect(textResult2).toBe(key);
    expect(() => indexnow.assertIndexNowKey('not-a-key')).toThrow('INDEXNOW_KEY');
    const joinedPath5 = path.join(siteDir, 'sitemap.xml');
    files.writeText(joinedPath5, '<urlset><url><loc>https://example.com/docs/</loc></url></urlset>');
    const loadSitemapUrlsOptions = { siteDir, siteUrl: 'https://example.com/' } as const;
    const loadSitemapUrlsResult = indexnow.loadSitemapUrls(loadSitemapUrlsOptions);
    const receiver5Actual = loadSitemapUrlsResult;
    const values2: string[] = ['https://example.com/docs/'];
    await expect(receiver5Actual).resolves.toEqual(values2);
    const extractSitemapUrlsResult = indexnow.extractSitemapUrls('<loc> https://a.example/ </loc>');
    const receiver6Actual = extractSitemapUrlsResult;
    const values3: string[] = ['https://a.example/'];
    expect(receiver6Actual).toEqual(values3);
    const requests: RequestInit[] = [];
    const fnResult3 = vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(init);
      const responseOptions3 = { status: 200 } as const;
      return new Response('', responseOptions3);
    });
    vi.stubGlobal('fetch', fnResult3);
    const submitIndexNowOptions: {
      key: string;
      siteUrl: string;
      urls: string[];
    } = {
      key,
      siteUrl: 'https://example.com/docs/',
      urls: ['https://example.com/docs/page/', 'https://other.example/docs/page/'],
    };
    const submitIndexNowResult = indexnow.submitIndexNow(submitIndexNowOptions);
    const receiver7Actual = submitIndexNowResult;
    const toEqualOptions3 = { status: 200, submitted: 1 } as const;
    await expect(receiver7Actual).resolves.toEqual(toEqualOptions3);
    const requestBody = requests[0]?.body;
    if (typeof requestBody !== 'string') throw new Error('expected string request body');
    const parsedValue = JSON.parse(requestBody);
    const receiver8Actual = parsedValue;
    const toMatchObjectOptions2: {
      host: string;
      urlList: string[];
    } = {
      host: 'example.com',
      urlList: ['https://example.com/docs/page/'],
    };
    expect(receiver8Actual).toMatchObject(toMatchObjectOptions2);
  });
});
describe('npm package helpers', () => {
  it('validates package file allowlists and formats sizes', () => {
    expect(() => npmPackage.assertPackageFileList(npmPackage.requiredPackageFiles)).not.toThrow();
    expect(() => {
      const values4: string[] = ['package.json'];
      return npmPackage.assertPackageFileList(values4);
    }).toThrow('npm package is missing required file');
    expect(() => {
      const values5: string[] = [...npmPackage.requiredPackageFiles, 'src/private.ts'];
      return npmPackage.assertPackageFileList(values5);
    }).toThrow('npm package contains non-runtime files');
    const formatBytesResult = npmPackage.formatBytes(2048);
    expect(formatBytesResult).toBe('2 KiB');
  });
  it('parses npm pack JSON from supported npm formats', () => {
    const packed: NpmPackResult = {
      entryCount: 1,
      filename: 'cloakbrowser-mcp-1.9.0.tgz',
      files: [{ path: 'package.json' }],
      name: 'cloakbrowser-mcp',
      size: 1024,
      unpackedSize: 2048,
      version: '1.9.0',
    };
    const values6 = [packed];
    const serializedValue2 = JSON.stringify(values6);
    const parseNpmPackOutputResult = npmPackage.parseNpmPackOutput(serializedValue2);
    expect(parseNpmPackOutputResult).toEqual(packed);
    const stringifyOptions2 = { 'cloakbrowser-mcp': packed } as const;
    const serializedValue3 = JSON.stringify(stringifyOptions2);
    const parseNpmPackOutputResult2 = npmPackage.parseNpmPackOutput(serializedValue3);
    expect(parseNpmPackOutputResult2).toEqual(packed);
  });
  it('rejects invalid npm pack JSON output', () => {
    const packed: NpmPackResult = {
      entryCount: 1,
      filename: 'cloakbrowser-mcp-1.9.0.tgz',
      files: [{ path: 'package.json' }],
      name: 'cloakbrowser-mcp',
      size: 1024,
      unpackedSize: 2048,
      version: '1.9.0',
    };
    expect(() => npmPackage.parseNpmPackOutput('not json')).toThrow('invalid JSON');
    expect(() => {
      const values7: unknown[] = [];
      const serializedValue4 = JSON.stringify(values7);
      return npmPackage.parseNpmPackOutput(serializedValue4);
    }).toThrow('exactly one package');
    expect(() => {
      const values8 = [packed, packed];
      const serializedValue5 = JSON.stringify(values8);
      return npmPackage.parseNpmPackOutput(serializedValue5);
    }).toThrow('exactly one package');
    expect(() => {
      const stringifyOptions3 = { 'cloakbrowser-mcp': {} } as const;
      const serializedValue6 = JSON.stringify(stringifyOptions3);
      return npmPackage.parseNpmPackOutput(serializedValue6);
    }).toThrow('exactly one package');
  });
});
describe('semver helpers', () => {
  it('parses, compares, tags, and sorts semver-like values', () => {
    const parseVersionResult = semver.parseVersion('v1.2.3-beta.1');
    const receiver9Actual = parseVersionResult;
    const toMatchObjectOptions3 = { version: '1.2.3', major: 1 } as const;
    expect(receiver9Actual).toMatchObject(toMatchObjectOptions3);
    const compareVersionsResult = semver.compareVersions('1.2.4', '1.2.3');
    expect(compareVersionsResult).toBe(1);
    const stripDependencyRangeResult = semver.stripDependencyRange('^1.2.3');
    expect(stripDependencyRangeResult).toBe('1.2.3');
    const toVersionTagResult = semver.toVersionTag('1.2.3-beta.1');
    expect(toVersionTagResult).toBe('v1.2.3');
    const latestVersionResult = semver.latestVersion('1.0.0', '1.2.0', '1.1.9');
    expect(latestVersionResult).toBe('1.2.0');
  });
});
describe('template helper', () => {
  it('renders templates and rejects missing values', async () => {
    const root = createTempRoot();
    const templatePath = path.join(root, 'template.md');
    files.writeText(templatePath, 'Hello {{name}}');
    const renderTemplateOptions = { version: '1.0.0' } as const;
    const renderTemplateResult = template.renderTemplate('Version {{version}}', renderTemplateOptions);
    expect(renderTemplateResult).toBe('Version 1.0.0');
    const renderTemplateFileOptions = { name: 'Ada' } as const;
    const renderTemplateFileResult = template.renderTemplateFile(templatePath, renderTemplateFileOptions);
    await expect(renderTemplateFileResult).resolves.toBe('Hello Ada');
    expect(() => {
      const renderTemplateOptions2 = {} as const;
      return template.renderTemplate('{{missing}}', renderTemplateOptions2);
    }).toThrow('Missing template value: missing');
  });
});
describe('version compatibility helpers', () => {
  it('adds an identifier-only localized compatibility row', () => {
    const previous: CompatibilityRow = {
      cloakbrowser: '^0.5.1',
      node: '^22.13.0 || >=24.0.0',
      parity: 'Compared in CI',
      playwrightMcp: '^0.0.78',
      playwrightMcpDockerBase: 'mcr.microsoft.com/playwright/mcp:v0.0.78',
      readmePlatforms: 'npm on Linux',
      testedPlatform: 'npm on Node.js 22',
      transports: ['stdio', 'Streamable HTTP'],
      version: '1.9.0',
    };
    const current: CompatibilityRow = { ...previous, cloakbrowser: '^0.5.3', version: '1.10.0' };
    const content = [
      '<!-- compatibility-table:start -->',
      '',
      '| version | CloakBrowser |',
      '| ------- | ------------ |',
      '| `1.9.0` | `^0.5.1`     |',
      '',
      '<!-- compatibility-table:end -->',
    ].join('\n');
    const generated = versionCompatibility.prependLocalizedCompatibilityRow(content, previous, current);
    expect(generated).toContain('| `1.10.0` | `^0.5.3`     |');
    const prependLocalizedCompatibilityRowResult = versionCompatibility.prependLocalizedCompatibilityRow(
      generated,
      previous,
      current,
    );
    expect(prependLocalizedCompatibilityRowResult).toBe(generated);
  });
  it('rejects localized rows that require translated content', () => {
    const previous: CompatibilityRow = {
      cloakbrowser: '^0.5.1',
      node: '^22.13.0 || >=24.0.0',
      parity: 'Compared in CI',
      playwrightMcp: '^0.0.78',
      playwrightMcpDockerBase: 'mcr.microsoft.com/playwright/mcp:v0.0.78',
      readmePlatforms: 'npm on Linux',
      testedPlatform: 'npm on Node.js 22',
      transports: ['stdio'],
      version: '1.9.0',
    };
    const current: CompatibilityRow = { ...previous, node: '>=24', version: '1.10.0' };
    expect(() =>
      versionCompatibility.prependLocalizedCompatibilityRow(
        '<!-- compatibility-table:start -->\n<!-- compatibility-table:end -->',
        previous,
        current,
      ),
    ).toThrow('manual translation');
  });
  it('preserves a manually translated localized row when package versions change', () => {
    const previous: CompatibilityRow = {
      cloakbrowser: '^0.5.3',
      node: '^22.13.0 || >=24.0.0',
      parity: 'Compared in CI',
      playwrightMcp: '^0.0.78',
      playwrightMcpDockerBase: 'mcr.microsoft.com/playwright/mcp:v0.0.78',
      readmePlatforms: 'npm on Linux',
      testedPlatform: 'npm on Node.js 22',
      transports: ['stdio', 'Streamable HTTP'],
      version: '1.10.0',
    };
    const current: CompatibilityRow = {
      ...previous,
      cloakbrowser: '^0.5.6',
      playwrightMcp: '^0.0.79',
      playwrightMcpDockerBase: 'mcr.microsoft.com/playwright/mcp:v0.0.79',
      version: '1.11.0',
    };
    const content = [
      '<!-- compatibility-table:start -->',
      '',
      '| version | CloakBrowser |',
      '| ------- | ------------ |',
      '| `1.11.0` | `^0.5.6`     |',
      '| `1.10.0` | `^0.5.3`     |',
      '',
      '<!-- compatibility-table:end -->',
    ].join('\n');
    const prependLocalizedCompatibilityRowResult2 = versionCompatibility.prependLocalizedCompatibilityRow(
      content,
      previous,
      current,
    );
    expect(prependLocalizedCompatibilityRowResult2).toBe(content);
  });
});
describe('Playwright MCP parity helpers', () => {
  it('normalizes volatile tool response text and compares values', () => {
    expect(parity.localToolNames).toContain('cloakbrowser_binary_info');
    expect(parity.expectedDefaultTools).toContain('browser_find');
    expect(parity.expectedDefaultTools).toContain('browser_snapshot');
    expect(parity.expectedDefaultTools).toContain('browser_emulate_media');
    const normalizeToolResponseTextResult = parity.normalizeToolResponseText(
      'saved /data/path/page-123456.png in 1234ms\n[box=12,34,56,78]\n### Events\n- unstable event\nDone',
    );
    expect(normalizeToolResponseTextResult).toBe(
      'saved /data/<artifact> in <duration>ms\n[box=<coordinates>]Done',
    );
    expect(() => {
      const assertEqualOptions = { a: 1 } as const;
      const assertEqualOptions2 = { a: 2 } as const;
      return parity.assertEqual(assertEqualOptions, assertEqualOptions2, 'value');
    }).toThrow('value mismatch');
  });
});
