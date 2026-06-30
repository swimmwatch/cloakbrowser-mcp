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
const upstream = (await import(
  new URL('../../scripts/lib/cloakbrowser-upstream.mjs', import.meta.url).href
)) as unknown as CloakBrowserUpstreamModule;

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-upstream-test-'));
  tempRoots.push(root);
  return root;
}

describe('CloakBrowser upstream monitor helper', () => {
  it('reads the current CloakBrowser dependency version from package.json', async () => {
    const root = createTempRoot();
    const packageJsonPath = path.join(root, 'package.json');
    writeFileSync(
      packageJsonPath,
      `${JSON.stringify({ dependencies: { cloakbrowser: '^0.4.3' } }, null, 2)}\n`,
    );

    await expect(upstream.readCurrentCloakBrowserVersion(packageJsonPath)).resolves.toBe('0.4.3');
  });

  it('detects the latest npm version from the dist-tag', async () => {
    const fetchJson: FetchJson = async () => ({ 'dist-tags': { latest: '0.4.3' } });

    await expect(upstream.getLatestNpmVersion(fetchJson)).resolves.toBe('0.4.3');
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

    expect(releases.map((release) => release.tagName)).toEqual(['v0.4.5', 'v0.4.4']);
    expect(upstream.createReleaseNotesSummary(releases)).toContain('latest');
    expect(upstream.createReleaseNotesSummary([])).toContain('release notes were not found');
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
