import { readJson, readText, writeJson, writeText } from './files.mjs';

const markerPattern = /<!-- project-version -->(.*?)<!-- \/project-version -->/gs;

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

export function updateVersionMarkers(filePaths, nextVersionTag) {
  for (const filePath of filePaths) {
    const original = readText(filePath);

    if (!markerPattern.test(original)) {
      throw new Error(`${filePath} does not contain a project-version marker`);
    }

    markerPattern.lastIndex = 0;
    writeText(
      filePath,
      original.replace(markerPattern, `<!-- project-version -->${nextVersionTag}<!-- /project-version -->`),
    );
  }
}

export function updatePinnedInstallCommands(filePath, nextVersion, nextDockerVersion) {
  const original = readText(filePath);
  const updated = original
    .replace(
      /npx -y cloakbrowser-mcp@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/g,
      `npx -y cloakbrowser-mcp@${nextVersion}`,
    )
    .replace(
      /ghcr\.io\/swimmwatch\/cloakbrowser-mcp:\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:-[0-9A-Za-z.-]+)?/g,
      `ghcr.io/swimmwatch/cloakbrowser-mcp:${nextDockerVersion}`,
    );

  writeText(filePath, updated);
}
