import { describe, expect, it } from 'vitest';
interface UpstreamReleasesModule {
  createReleaseNotesSummary(
    releases: ReleaseNote[],
    options?: {
      maxBodyLength?: number;
    },
  ): string;
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
const argumentValue = new URL('../../scripts/lib/upstream-releases.mjs', import.meta.url).href;
const upstream = (await import(argumentValue)) as unknown as UpstreamReleasesModule;
describe('upstream release helpers', () => {
  it('reads latest npm dist-tags with package-specific errors', async () => {
    const fetchJson: FetchJson = async () => ({ 'dist-tags': { latest: '1.2.3' } });
    const latestNpmDistTagResult = upstream.getLatestNpmDistTag(fetchJson, '@scope/pkg');
    await expect(latestNpmDistTagResult).resolves.toBe('1.2.3');
    const latestNpmDistTagResult2 = upstream.getLatestNpmDistTag(async () => ({}), 'pkg');
    await expect(latestNpmDistTagResult2).rejects.toThrow('Could not resolve latest npm dist-tag for pkg.');
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
    const getRepositoryReleaseNotesOptions = {
      currentVersion: '1.0.0',
      latestVersion: '1.2.0',
      upstreamRepository: 'owner/repo',
    } as const;
    const releases = await upstream.getRepositoryReleaseNotes(fetchJson, getRepositoryReleaseNotesOptions);
    const receiverActual = urls;
    const values: string[] = ['https://api.github.com/repos/owner/repo/releases?per_page=100'];
    expect(receiverActual).toEqual(values);
    const mappedValues = releases.map((release) => release.tagName);
    const receiver2Actual = mappedValues;
    const values2: string[] = ['v1.2.0', 'v1.1.0'];
    expect(receiver2Actual).toEqual(values2);
    expect(releases[0]?.version.version).toBe('1.2.0');
  });
  it('summarizes and truncates release notes', () => {
    const values3: ReleaseNote[] = [];
    const releaseNotesSummaryResult = upstream.createReleaseNotesSummary(values3);
    expect(releaseNotesSummaryResult).toContain('release notes were not found');
    const truncateMarkdownResult = upstream.truncateMarkdown('short', 10);
    expect(truncateMarkdownResult).toBe('short');
    const truncateMarkdownResult2 = upstream.truncateMarkdown('long body', 4);
    expect(truncateMarkdownResult2).toBe('long\n\n...');
    const values4: ReleaseNote[] = [
      {
        body: 'Noisy body',
        name: 'v1.2.3',
        publishedAt: '2026-01-01T00:00:00Z',
        tagName: 'v1.2.3',
        url: 'https://example.com/release',
        version: { version: '1.2.3' },
      },
    ];
    const createReleaseNotesSummaryOptions = { maxBodyLength: 4 } as const;
    const releaseNotesSummaryResult2 = upstream.createReleaseNotesSummary(
      values4,
      createReleaseNotesSummaryOptions,
    );
    expect(releaseNotesSummaryResult2).toBe('### [v1.2.3](https://example.com/release)\n\nNois\n\n...');
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
