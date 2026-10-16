import { readFile } from 'node:fs/promises';
import { compareVersions, parseVersion, semverPattern, stripDependencyRange } from '#scripts/lib/semver';
import {
  getLatestNpmDistTag,
  getRepositoryReleaseNotes,
  createReleaseNotesSummary as summarizeReleaseNotes,
} from '#scripts/lib/upstream-releases';
export const upstreamConfig = {
  dockerRepository: 'mcr.microsoft.com/playwright/mcp',
  mcrTagsUrl: 'https://mcr.microsoft.com/v2/playwright/mcp/tags/list',
  npmPackageName: '@playwright/mcp',
  upstreamRepository: 'microsoft/playwright-mcp',
};
export async function readCurrentPlaywrightMcpVersions() {
  const fileResult = await readFile('package.json', 'utf8');
  const packageJson = JSON.parse(fileResult);
  const dockerfile = await readFile('Dockerfile', 'utf8');
  const dependencyRange = packageJson.dependencies?.[upstreamConfig.npmPackageName];
  if (typeof dependencyRange !== 'string') {
    const message = `Could not find ${upstreamConfig.npmPackageName} in package.json dependencies.`;
    throw new Error(message);
  }
  return {
    npmVersion: stripDependencyRange(dependencyRange),
    dockerVersion: extractDockerImageVersion(dockerfile),
  };
}
export async function getLatestNpmVersion(fetchJson) {
  return getLatestNpmDistTag(fetchJson, upstreamConfig.npmPackageName);
}
export async function getLatestDockerVersion(fetchJson) {
  const metadata = await fetchJson(upstreamConfig.mcrTagsUrl);
  const versions = metadata.tags
    .filter((tag) => semverPattern.test(tag))
    .map((tag) => parseVersion(tag))
    .sort(compareVersions);
  const latest = versions.at(-1);
  if (!latest) {
    const message2 = `Could not resolve latest Docker tag for ${upstreamConfig.dockerRepository}.`;
    throw new Error(message2);
  }
  return latest.version;
}
export async function getReleaseNotes(fetchJson, currentVersion, latestVersion) {
  const getRepositoryReleaseNotesOptions = {
    currentVersion,
    latestVersion,
    upstreamRepository: upstreamConfig.upstreamRepository,
  };
  return getRepositoryReleaseNotes(fetchJson, getRepositoryReleaseNotesOptions);
}
export function createReleaseNotesSummary(releases) {
  return summarizeReleaseNotes(releases);
}
function extractDockerImageVersion(dockerfile) {
  const match = dockerfile.match(
    /^ARG PLAYWRIGHT_MCP_IMAGE=mcr\.microsoft\.com\/playwright\/mcp:(?<tag>[^@\s]+)(?:@sha256:[a-f0-9]{64})?$/m,
  );
  if (!match?.groups?.tag) {
    throw new Error('Could not find PLAYWRIGHT_MCP_IMAGE in Dockerfile.');
  }
  return match.groups.tag.replace(/^v/, '');
}
