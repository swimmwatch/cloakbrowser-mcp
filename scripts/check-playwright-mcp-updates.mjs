import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';

const npmPackageName = '@playwright/mcp';
const dockerRepository = 'mcr.microsoft.com/playwright/mcp';
const upstreamRepository = 'microsoft/playwright-mcp';
const defaultIssueAssignee = 'swimmwatch';

const githubOutput = process.env.GITHUB_OUTPUT;
const githubToken = process.env.GITHUB_TOKEN;
const issueAssignee = process.env.UPSTREAM_MONITOR_ASSIGNEE ?? defaultIssueAssignee;

const semverPattern = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

function parseVersion(version) {
  const normalized = version.trim().replace(/^[^\d]*/, '');
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);

  if (!match) {
    throw new Error(`Unsupported semver value: ${version}`);
  }

  return {
    raw: version,
    version: `${match[1]}.${match[2]}.${match[3]}`,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareVersions(left, right) {
  const parsedLeft = typeof left === 'string' ? parseVersion(left) : left;
  const parsedRight = typeof right === 'string' ? parseVersion(right) : right;

  for (const key of ['major', 'minor', 'patch']) {
    if (parsedLeft[key] > parsedRight[key]) {
      return 1;
    }

    if (parsedLeft[key] < parsedRight[key]) {
      return -1;
    }
  }

  return 0;
}

function stripDependencyRange(range) {
  return range.trim().replace(/^[~^=<> ]+/, '');
}

function toVersionTag(version) {
  return `v${parseVersion(version).version}`;
}

function truncateMarkdown(markdown, maxLength) {
  if (markdown.length <= maxLength) {
    return markdown;
  }

  return `${markdown.slice(0, maxLength).trimEnd()}\n\n...`;
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

async function fetchJson(url) {
  const headers = {
    Accept: 'application/vnd.github+json, application/json',
    'User-Agent': 'cloakbrowser-mcp-upstream-monitor',
  };

  if (url.startsWith('https://api.github.com/') && githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
    headers['X-GitHub-Api-Version'] = '2022-11-28';
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getLatestNpmVersion() {
  const metadata = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(npmPackageName)}`);
  const latest = metadata?.['dist-tags']?.latest;

  if (typeof latest !== 'string') {
    throw new Error(`Could not resolve latest npm dist-tag for ${npmPackageName}.`);
  }

  return latest;
}

async function getLatestDockerVersion() {
  const metadata = await fetchJson('https://mcr.microsoft.com/v2/playwright/mcp/tags/list');
  const versions = metadata.tags
    .filter((tag) => semverPattern.test(tag))
    .map((tag) => parseVersion(tag))
    .sort(compareVersions);

  const latest = versions.at(-1);

  if (!latest) {
    throw new Error(`Could not resolve latest Docker tag for ${dockerRepository}.`);
  }

  return latest.version;
}

async function getReleaseNotes(currentVersion, latestVersion) {
  const releases = await fetchJson(
    `https://api.github.com/repos/${upstreamRepository}/releases?per_page=100`,
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

function createReleaseNotesSummary(releases) {
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

function createIssueBody({
  currentNpmVersion,
  latestNpmVersion,
  currentDockerVersion,
  latestDockerVersion,
  releases,
}) {
  const npmChanged = currentNpmVersion !== latestNpmVersion;
  const dockerChanged = currentDockerVersion !== latestDockerVersion;
  const latestKnownVersion = [latestNpmVersion, latestDockerVersion].sort((left, right) =>
    compareVersions(parseVersion(right), parseVersion(left)),
  )[0];

  return `## Summary

A newer upstream Playwright MCP release is available.

| Component | Current | Latest | Update needed |
| --- | --- | --- | --- |
| npm \`${npmPackageName}\` | \`${currentNpmVersion}\` | \`${latestNpmVersion}\` | ${npmChanged ? 'yes' : 'no'} |
| Docker \`${dockerRepository}\` | \`v${currentDockerVersion}\` | \`v${latestDockerVersion}\` | ${dockerChanged ? 'yes' : 'no'} |

## Suggested Work

- Update \`${npmPackageName}\` in \`package.json\` and \`package-lock.json\`.
- Update \`${dockerRepository}\` references in \`Dockerfile\`, workflows, docs, and parity scripts.
- Run \`npm run check\`, \`npm run docker:build\`, \`npm run docker:smoke\`, and \`npm run bridge:compare\`.
- Update the version compatibility table in README and documentation.

## Release Notes Summary

${createReleaseNotesSummary(releases)}

## Links

- Full upstream changelog: https://github.com/${upstreamRepository}/releases
- Latest upstream release: https://github.com/${upstreamRepository}/releases/tag/${toVersionTag(latestKnownVersion)}
- npm package: https://www.npmjs.com/package/${encodeURIComponent(npmPackageName)}
- Docker tags: https://mcr.microsoft.com/artifact/mar/playwright/mcp/tags

_This issue was created automatically by the Playwright MCP upstream monitor workflow._
`;
}

async function appendGithubOutput(outputs) {
  if (!githubOutput) {
    return;
  }

  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  await writeFile(githubOutput, `${lines.join('\n')}\n`, { flag: 'a' });
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const dockerfile = await readFile('Dockerfile', 'utf8');

const currentNpmVersion = stripDependencyRange(packageJson.dependencies[npmPackageName]);
const currentDockerVersion = extractDockerImageVersion(dockerfile);
const latestNpmVersion = await getLatestNpmVersion();
const latestDockerVersion = await getLatestDockerVersion();
const updateAvailable =
  currentNpmVersion !== latestNpmVersion || currentDockerVersion !== latestDockerVersion;
const latestKnownVersion = [latestNpmVersion, latestDockerVersion].sort((left, right) =>
  compareVersions(parseVersion(right), parseVersion(left)),
)[0];
const issueTitle = `Update Playwright MCP upstream to ${toVersionTag(latestKnownVersion)}`;
const issueBodyPath = join(tmpdir(), `cloakbrowser-mcp-${basename(process.cwd())}-upstream-update.md`);

let releaseCount = 0;

if (updateAvailable) {
  const releases = await getReleaseNotes(currentNpmVersion, latestKnownVersion);
  releaseCount = releases.length;

  await writeFile(
    issueBodyPath,
    createIssueBody({
      currentNpmVersion,
      latestNpmVersion,
      currentDockerVersion,
      latestDockerVersion,
      releases,
    }),
  );
}

await appendGithubOutput({
  update_available: String(updateAvailable),
  current_npm_version: currentNpmVersion,
  latest_npm_version: latestNpmVersion,
  current_docker_version: currentDockerVersion,
  latest_docker_version: latestDockerVersion,
  latest_known_version: latestKnownVersion,
  issue_title: issueTitle,
  issue_body_path: issueBodyPath,
  issue_assignee: issueAssignee,
  release_count: String(releaseCount),
});

console.log(
  JSON.stringify(
    {
      updateAvailable,
      currentNpmVersion,
      latestNpmVersion,
      currentDockerVersion,
      latestDockerVersion,
      latestKnownVersion,
      issueTitle,
      issueBodyPath,
      issueAssignee,
      releaseCount,
    },
    null,
    2,
  ),
);
