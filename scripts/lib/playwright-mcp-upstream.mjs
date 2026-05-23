import { readFile } from 'node:fs/promises';
import { compareVersions, parseVersion, semverPattern, stripDependencyRange } from './semver.mjs';

export const upstreamConfig = {
  dockerRepository: 'mcr.microsoft.com/playwright/mcp',
  mcrTagsUrl: 'https://mcr.microsoft.com/v2/playwright/mcp/tags/list',
  npmPackageName: '@playwright/mcp',
  upstreamRepository: 'microsoft/playwright-mcp',
};

export async function readCurrentPlaywrightMcpVersions() {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  const dockerfile = await readFile('Dockerfile', 'utf8');
  const dependencyRange = packageJson.dependencies?.[upstreamConfig.npmPackageName];

  if (typeof dependencyRange !== 'string') {
    throw new Error(`Could not find ${upstreamConfig.npmPackageName} in package.json dependencies.`);
  }

  return {
    npmVersion: stripDependencyRange(dependencyRange),
    dockerVersion: extractDockerImageVersion(dockerfile),
  };
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

export async function getLatestDockerVersion(fetchJson) {
  const metadata = await fetchJson(upstreamConfig.mcrTagsUrl);
  const versions = metadata.tags
    .filter((tag) => semverPattern.test(tag))
    .map((tag) => parseVersion(tag))
    .sort(compareVersions);

  const latest = versions.at(-1);

  if (!latest) {
    throw new Error(`Could not resolve latest Docker tag for ${upstreamConfig.dockerRepository}.`);
  }

  return latest.version;
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

function extractDockerImageVersion(dockerfile) {
  const match = dockerfile.match(
    /^ARG PLAYWRIGHT_MCP_IMAGE=mcr\.microsoft\.com\/playwright\/mcp:(?<tag>\S+)$/m,
  );

  if (!match?.groups?.tag) {
    throw new Error('Could not find PLAYWRIGHT_MCP_IMAGE in Dockerfile.');
  }

  return match.groups.tag.replace(/^v/, '');
}

function truncateMarkdown(markdown, maxLength) {
  if (markdown.length <= maxLength) {
    return markdown;
  }

  return `${markdown.slice(0, maxLength).trimEnd()}\n\n...`;
}
