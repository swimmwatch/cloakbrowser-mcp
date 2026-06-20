#!/usr/bin/env node
import process from 'node:process';
import { format } from 'prettier';
import { appendGithubOutput } from '#scripts/lib/github-output';
import { readText, writeText } from '#scripts/lib/files';
import {
  normalizeReleaseVersion,
  toDockerMajorMinor,
  toDockerTag,
  updatePackageJsonVersion,
  updatePinnedInstallCommands,
  updateServerJsonVersion,
  updateVersionMarkers,
} from '#scripts/lib/release-version';

const rawVersion =
  process.argv[2] ??
  process.env.RELEASE_VERSION ??
  process.env.GITHUB_REF_NAME ??
  process.env.npm_package_version;

if (!rawVersion) {
  throw new Error('release version is required; pass a semver tag such as v1.2.3');
}

const version = normalizeReleaseVersion(rawVersion);
const versionTag = `v${version}`;
const dockerTag = toDockerTag(versionTag);
const dockerVersion = toDockerTag(version);
const dockerMajorMinor = toDockerMajorMinor(version);
const releaseFiles = [
  'package.json',
  'package-lock.json',
  'server.json',
  'docs/index.md',
  'docs/getting-started.md',
];

updatePackageJsonVersion('package.json', version);
updatePackageJsonVersion('package-lock.json', version);
updateServerJsonVersion('server.json', version, dockerVersion);
updateVersionMarkers(['docs/index.md'], versionTag);
updatePinnedInstallCommands('docs/getting-started.md', version, dockerVersion);

for (const filePath of releaseFiles) {
  writeText(filePath, await format(readText(filePath), { filepath: filePath }));
}

await appendGithubOutput({
  docker_major_minor: dockerMajorMinor,
  docker_tag: dockerTag,
  docker_version: dockerVersion,
  version,
  version_tag: versionTag,
});

process.stderr.write(`applied release version ${versionTag}\n`);
