import { readFile } from 'node:fs/promises';
import { stripDependencyRange } from '#scripts/lib/semver';
import {
  getLatestNpmDistTag,
  getRepositoryReleaseNotes,
  createReleaseNotesSummary as summarizeReleaseNotes,
} from '#scripts/lib/upstream-releases';
export const upstreamConfig = {
  npmPackageName: 'cloakbrowser',
  upstreamRepository: 'CloakHQ/CloakBrowser',
};
export async function readCurrentCloakBrowserVersion(packageJsonPath = 'package.json') {
  const fileResult = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(fileResult);
  const dependencyRange = packageJson.dependencies?.[upstreamConfig.npmPackageName];
  if (typeof dependencyRange !== 'string') {
    const message = `Could not find ${upstreamConfig.npmPackageName} in package.json dependencies.`;
    throw new Error(message);
  }
  return stripDependencyRange(dependencyRange);
}
export async function getLatestNpmVersion(fetchJson) {
  return getLatestNpmDistTag(fetchJson, upstreamConfig.npmPackageName);
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
