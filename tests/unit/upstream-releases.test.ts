import { describe, expect, it } from 'vitest';

interface UpstreamReleasesModule {
  createReleaseNotesSummary(releases: ReleaseNote[], options?: { maxBodyLength?: number }): string;
  getLatestNpmDistTag(fetchJson: FetchJson, packageName: string): Promise<string>;
  getRepositoryReleaseNotes(
    fetchJson: FetchJson,
    input: {
      currentVersion: string;
      latestVersion: string;
      upstreamRepository: string;
    },
  ): Promise<ReleaseNote[]>;
  truncateMarkdown(markdown: string, maxLength: number): string;
}

interface ReleaseNote {
  tagName: string;
  name: string;
  url: string;
  publishedAt: string;
  body: string;
  version: {
    version: string;
  };
}

type FetchJson = (url: string) => Promise<unknown>;

const upstream = (await import(
  new URL('../../scripts/lib/upstream-releases.mjs', import.meta.url).href
)) as unknown as UpstreamReleasesModule;

describe('upstream release helpers', () => {
  it('reads latest npm dist-tags with package-specific errors', async () => {
    const fetchJson: FetchJson = async () => ({ 'dist-tags': { latest: '1.2.3' } });

    await expect(upstream.getLatestNpmDistTag(fetchJson, '@scope/pkg')).resolves.toBe('1.2.3');
    await expect(upstream.getLatestNpmDistTag(async () => ({}), 'pkg')).rejects.toThrow(
      'Could not resolve latest npm dist-tag for pkg.',
    );
  });

  it('filters repository releases to the current-to-latest range', async () => {
    const urls: string[] = [];
    const fetchJson: FetchJson = async (url) => {
      urls.push(url);
      return [
        createGitHubRelease('v2.0.0', 'future'),
        createGitHubRelease('v1.2.0', 'latest'),
        createGitHubRelease('v1.1.0', 'intermediate'),
        createGitHubRelease('v1.0.0', 'current'),
        createGitHubRelease('not-a-version', 'ignored'),
      ];
    };

    const releases = await upstream.getRepositoryReleaseNotes(fetchJson, {
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      upstreamRepository: 'owner/repo',
    });

    expect(urls).toEqual(['https://api.github.com/repos/owner/repo/releases?per_page=100']);
    expect(releases.map((release) => release.tagName)).toEqual(['v1.2.0', 'v1.1.0']);
    expect(releases[0]?.version.version).toBe('1.2.0');
  });

  it('summarizes and truncates release notes', () => {
    expect(upstream.createReleaseNotesSummary([])).toContain('release notes were not found');
    expect(upstream.truncateMarkdown('short', 10)).toBe('short');
    expect(upstream.truncateMarkdown('long body', 4)).toBe('long\n\n...');
    expect(
      upstream.createReleaseNotesSummary(
        [
          {
            body: 'Noisy body',
            name: 'v1.2.3',
            publishedAt: '2026-01-01T00:00:00Z',
            tagName: 'v1.2.3',
            url: 'https://example.com/release',
            version: { version: '1.2.3' },
          },
        ],
        { maxBodyLength: 4 },
      ),
    ).toBe('### [v1.2.3](https://example.com/release)\n\nNois\n\n...');
  });
});

function createGitHubRelease(tagName: string, body: string): Record<string, string> {
  return {
    body,
    html_url: `https://example.com/${tagName}`,
    name: tagName,
    published_at: '2026-01-01T00:00:00Z',
    tag_name: tagName,
  };
}
