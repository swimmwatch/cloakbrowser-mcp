#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const markerPattern = /<!-- project-version -->(.*?)<!-- \/project-version -->/gs;

const rawVersion =
  process.argv[2] ??
  process.env.RELEASE_VERSION ??
  process.env.GITHUB_REF_NAME ??
  process.env.npm_package_version;

if (!rawVersion) {
  throw new Error('release version is required; pass a semver tag such as v1.2.3');
}

const version = normalizeVersion(rawVersion);
const versionTag = `v${version}`;

updatePackageJson('package.json', version);
updatePackageJson('package-lock.json', version);
updateServerJson('server.json', version);
updateVersionMarkers(['README.md', 'docs/index.md'], versionTag);

process.stderr.write(`applied release version ${versionTag}\n`);

function normalizeVersion(value) {
  const stripped = value
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(stripped)) {
    throw new Error(`release tag must be a semver version like v1.2.3, got "${value}"`);
  }
  return stripped;
}

function updatePackageJson(relativePath, nextVersion) {
  const filePath = path.join(root, relativePath);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  data.version = nextVersion;
  if (data.packages?.['']) data.packages[''].version = nextVersion;
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function updateServerJson(relativePath, nextVersion) {
  const filePath = path.join(root, relativePath);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  data.version = nextVersion;

  for (const pkg of data.packages ?? []) {
    if (typeof pkg.version === 'string') pkg.version = nextVersion;
    if (pkg.registryType === 'oci' && typeof pkg.identifier === 'string') {
      pkg.identifier = pkg.identifier.replace(/:[^/:]+$/, `:${nextVersion}`);
    }
  }

  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function updateVersionMarkers(relativePaths, nextVersionTag) {
  for (const relativePath of relativePaths) {
    const filePath = path.join(root, relativePath);
    const original = readFileSync(filePath, 'utf8');
    if (!markerPattern.test(original)) {
      throw new Error(`${relativePath} does not contain a project-version marker`);
    }
    markerPattern.lastIndex = 0;
    const updated = original.replace(
      markerPattern,
      `<!-- project-version -->${nextVersionTag}<!-- /project-version -->`,
    );
    writeFileSync(filePath, updated);
  }
}
