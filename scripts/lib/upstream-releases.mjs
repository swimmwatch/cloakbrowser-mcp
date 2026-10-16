import { compareVersions, parseVersion, semverPattern } from '#scripts/lib/semver';
export async function getLatestNpmDistTag(fetchJson, packageName) {
  const message = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  const metadata = await fetchJson(message);
  const latest = metadata?.['dist-tags']?.latest;
  if (typeof latest !== 'string') {
    const message2 = `Could not resolve latest npm dist-tag for ${packageName}.`;
    throw new Error(message2);
  }
  return latest;
}
export async function getRepositoryReleaseNotes(
  fetchJson,
  { currentVersion, latestVersion, upstreamRepository },
) {
  const message3 = `https://api.github.com/repos/${upstreamRepository}/releases?per_page=100`;
  const releases = await fetchJson(message3);
  const current = parseVersion(currentVersion);
  const latest = parseVersion(latestVersion);
  return releases
    .filter((release) => semverPattern.test(release.tag_name))
    .map((release) => ({
      tagName: release.tag_name,
      name: release.name || release.tag_name,
      url: release.html_url,
      publishedAt: release.published_at,
      body: release.body || '',
      version: parseVersion(release.tag_name),
    }))
    .filter(
      (release) =>
        compareVersions(release.version, current) > 0 && compareVersions(release.version, latest) <= 0,
    )
    .sort((left, right) => compareVersions(right.version, left.version));
}
export function createReleaseNotesSummary(releases, { maxBodyLength = 1800 } = {}) {
  if (releases.length === 0) {
    return '- Upstream release notes were not found for the detected version range.';
  }
  return releases
    .map((release) => {
      const computedValue = release.body.trim() || 'No release body was published.';
      const body = truncateMarkdown(computedValue, maxBodyLength);
      return `### [${release.name}](${release.url})\n\n${body}`;
    })
    .join('\n\n');
}
export function truncateMarkdown(markdown, maxLength) {
  if (markdown.length <= maxLength) {
    return markdown;
  }
  return `${markdown.slice(0, maxLength).trimEnd()}\n\n...`;
}
