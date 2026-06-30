import { readFile } from 'node:fs/promises';
import { compareVersions, parseVersion, semverPattern, stripDependencyRange } from '#scripts/lib/semver';

export const upstreamConfig = {
  npmPackageName: 'cloakbrowser',
  upstreamRepository: 'CloakHQ/CloakBrowser',
};

export async function readCurrentCloakBrowserVersion(packageJsonPath = 'package.json') {
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const dependencyRange = packageJson.dependencies?.[upstreamConfig.npmPackageName];

  if (typeof dependencyRange !== 'string') {
    throw new Error(`Could not find ${upstreamConfig.npmPackageName} in package.json dependencies.`);
  }

  return stripDependencyRange(dependencyRange);
}

export async function getLatestNpmVersion(fetchJson) {
  const metadata = await fetchJson(
    `https://registry.npmjs.org/${encodeURIComponent(upstreamConfig.npmPackageName)}`,
  );
  const latest = metadata?.['dist-tags']?.latest;

  if (typeof latest !== 'string') {
    throw new Error(`Could not resolve latest npm dist-tag for ${upstreamConfig.npmPackageName}.`);
  }

  return latest;
}

export async function getReleaseNotes(fetchJson, currentVersion, latestVersion) {
  const releases = await fetchJson(
    `https://api.github.com/repos/${upstreamConfig.upstreamRepository}/releases?per_page=100`,
  );
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

export function createReleaseNotesSummary(releases) {
  if (releases.length === 0) {
    return '- Upstream release notes were not found for the detected version range.';
  }

  return releases
    .map((release) => {
      const body = truncateMarkdown(release.body.trim() || 'No release body was published.', 1800);
      return `### [${release.name}](${release.url})\n\n${body}`;
    })
    .join('\n\n');
}

function truncateMarkdown(markdown, maxLength) {
  if (markdown.length <= maxLength) {
    return markdown;
  }

  return `${markdown.slice(0, maxLength).trimEnd()}\n\n...`;
}
