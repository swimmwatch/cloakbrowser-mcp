import { readJson, writeJson } from '#scripts/lib/files';
export function normalizeReleaseVersion(value) {
  const stripped = value
    .trim()
    .replace(/^refs\/tags\//, '')
    .replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(stripped)) {
    const message = `release tag must be a semver version like v1.2.3, got "${value}"`;
    throw new Error(message);
  }
  return stripped;
}
export function toDockerTag(value) {
  return value.replace(/\+/g, '-');
}
export function toDockerMajorMinor(value) {
  const match = value.match(/^(\d+)\.(\d+)\./);
  if (!match) {
    const message2 = `release version must include major and minor numbers, got "${value}"`;
    throw new Error(message2);
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
      const message3 = `:${nextDockerVersion}`;
      pkg.identifier = pkg.identifier.replace(/:[^/:]+$/, message3);
    }
  }
  writeJson(filePath, data);
}
