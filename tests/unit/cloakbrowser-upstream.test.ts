import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
interface CloakBrowserUpstreamModule {
  createReleaseNotesSummary(releases: ReleaseNote[]): string;
  getLatestNpmVersion(fetchJson: FetchJson): Promise<string>;
  getReleaseNotes(
    fetchJson: FetchJson,
    currentVersion: string,
    latestVersion: string,
  ): Promise<ReleaseNote[]>;
  readCurrentCloakBrowserVersion(packageJsonPath?: string): Promise<string>;
}
interface ReleaseNote {
  tagName: string;
  name: string;
  url: string;
  publishedAt: string;
  body: string;
  version: {
    raw: string;
    version: string;
    major: number;
    minor: number;
    patch: number;
  };
}
type FetchJson = (url: string) => Promise<unknown>;
const tempRoots: string[] = [];
const argumentValue = new URL('../../scripts/lib/cloakbrowser-upstream.mjs', import.meta.url).href;
const upstream = (await import(argumentValue)) as unknown as CloakBrowserUpstreamModule;
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-upstream-test-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
describe('CloakBrowser upstream monitor helper', () => {
  it('reads the current CloakBrowser dependency version from package.json', async () => {
    const root = createTempRoot();
    const packageJsonPath = path.join(root, 'package.json');
    const stringifyOptions = { dependencies: { cloakbrowser: '^0.4.3' } } as const;
    const templateValue = JSON.stringify(stringifyOptions, null, 2);
    const message = `${templateValue}\n`;
    writeFileSync(packageJsonPath, message);
    const currentCloakBrowserVersionResult = upstream.readCurrentCloakBrowserVersion(packageJsonPath);
    await expect(currentCloakBrowserVersionResult).resolves.toBe('0.4.3');
  });
  it('detects the latest npm version from the dist-tag', async () => {
    const fetchJson: FetchJson = async () => ({ 'dist-tags': { latest: '0.4.3' } });
    const latestNpmVersionResult = upstream.getLatestNpmVersion(fetchJson);
    await expect(latestNpmVersionResult).resolves.toBe('0.4.3');
  });
  it('filters release notes to the current-to-latest version range', async () => {
    const fetchJson: FetchJson = async () => [
      createRelease('v0.4.6', 'future'),
      createRelease('v0.4.5', 'latest'),
      createRelease('v0.4.4', 'intermediate'),
      createRelease('v0.4.3', 'current'),
      createRelease('not-a-version', 'ignored'),
    ];
    const releases = await upstream.getReleaseNotes(fetchJson, '0.4.3', '0.4.5');
    const mappedValues = releases.map((release) => release.tagName);
    const receiverActual = mappedValues;
    const values: string[] = ['v0.4.5', 'v0.4.4'];
    expect(receiverActual).toEqual(values);
    const releaseNotesSummaryResult = upstream.createReleaseNotesSummary(releases);
    expect(releaseNotesSummaryResult).toContain('latest');
    const values2: ReleaseNote[] = [];
    const releaseNotesSummaryResult2 = upstream.createReleaseNotesSummary(values2);
    expect(releaseNotesSummaryResult2).toContain('release notes were not found');
  });
});
function createRelease(tagName: string, body: string): Record<string, string> {
  return {
    tag_name: tagName,
    name: tagName,
    html_url: `https://github.com/CloakHQ/CloakBrowser/releases/tag/${tagName}`,
    published_at: '2026-01-01T00:00:00Z',
    body,
  };
}
