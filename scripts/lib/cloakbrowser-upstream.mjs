import { readFile } from 'node:fs/promises';
import { stripDependencyRange } from '#scripts/lib/semver';
import {
  createReleaseNotesSummary as summarizeReleaseNotes,
  getLatestNpmDistTag,
  getRepositoryReleaseNotes,
} from '#scripts/lib/upstream-releases';

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
  return getLatestNpmDistTag(fetchJson, upstreamConfig.npmPackageName);
}

export async function getReleaseNotes(fetchJson, currentVersion, latestVersion) {
  return getRepositoryReleaseNotes(fetchJson, {
    currentVersion,
    latestVersion,
    upstreamRepository: upstreamConfig.upstreamRepository,
  });
}

export function createReleaseNotesSummary(releases) {
  return summarizeReleaseNotes(releases);
}
