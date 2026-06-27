import { readJson, writeJson } from '#scripts/lib/files';

export function normalizeReleaseVersion(value) {
  const stripped = value
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/^v/, '');

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(stripped)) {
    throw new Error(`release tag must be a semver version like v1.2.3, got "${value}"`);
  }

  return stripped;
}

export function toDockerTag(value) {
  return value.replace(/\+/g, '-');
}

export function toDockerMajorMinor(value) {
  const match = value.match(/^(\d+)\.(\d+)\./);

  if (!match) {
    throw new Error(`release version must include major and minor numbers, got "${value}"`);
  }

  return `${match[1]}.${match[2]}`;
}

export function updatePackageJsonVersion(filePath, nextVersion) {
  const data = readJson(filePath);
  data.version = nextVersion;

  if (data.packages?.['']) {
    data.packages[''].version = nextVersion;
  }

  writeJson(filePath, data);
}

export function updateServerJsonVersion(filePath, nextVersion, nextDockerVersion) {
  const data = readJson(filePath);
  data.version = nextVersion;

  for (const pkg of data.packages ?? []) {
    if (typeof pkg.version === 'string') {
      pkg.version = nextVersion;
    }

    if (pkg.registryType === 'oci' && typeof pkg.identifier === 'string') {
      pkg.identifier = pkg.identifier.replace(/:[^/:]+$/, `:${nextDockerVersion}`);
    }
  }

  writeJson(filePath, data);
}
