export const semverPattern = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export function parseVersion(version) {
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

export function compareVersions(left, right) {
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

export function stripDependencyRange(range) {
  return range.trim().replace(/^[~^=<> ]+/, '');
}

export function toVersionTag(version) {
  return `v${parseVersion(version).version}`;
}

export function latestVersion(...versions) {
  return versions.sort((left, right) => compareVersions(right, left))[0];
}
