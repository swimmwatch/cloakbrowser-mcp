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
  updateServerJsonVersion,
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
const releaseFiles = ['package.json', 'package-lock.json', 'server.json'];
updatePackageJsonVersion('package.json', version);
updatePackageJsonVersion('package-lock.json', version);
updateServerJsonVersion('server.json', version, dockerVersion);
for (const filePath of releaseFiles) {
  const content = readText(filePath);
  const formatOptions = { filepath: filePath };
  const formattedContent = await format(content, formatOptions);
  writeText(filePath, formattedContent);
}
const appendGithubOutputOptions = {
  docker_major_minor: dockerMajorMinor,
  docker_tag: dockerTag,
  docker_version: dockerVersion,
  version,
  version_tag: versionTag,
};
await appendGithubOutput(appendGithubOutputOptions);
const message = `applied release version ${versionTag}\n`;
process.stderr.write(message);
