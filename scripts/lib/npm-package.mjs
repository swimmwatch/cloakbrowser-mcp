export const requiredPackageFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'server.json',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/cli.js',
  'dist/runtime/humanize-init-page.cjs',
];

export const forbiddenPackageFilePatterns = [
  /^src\//,
  /^tests\//,
  /^docs\//,
  /^\.github\//,
  /^coverage\//,
  /^artifacts\//,
  /^site\//,
  /^node_modules\//,
  /(^|\/)\.env(?:\.|$)/,
];

export function assertPackageFileList(files) {
  for (const file of requiredPackageFiles) {
    if (!files.includes(file)) {
      throw new Error(`npm package is missing required file: ${file}`);
    }
  }

  const leakedFiles = files.filter((file) =>
    forbiddenPackageFilePatterns.some((pattern) => pattern.test(file)),
  );

  if (leakedFiles.length > 0) {
    throw new Error(`npm package contains non-runtime files: ${leakedFiles.join(', ')}`);
  }
}

export function formatBytes(bytes) {
  return `${Math.round(bytes / 1024)} KiB`;
}

export function parseNpmPackOutput(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('npm pack --json returned invalid JSON');
  }

  const entries = Array.isArray(parsed) ? parsed : isRecord(parsed) ? Object.values(parsed) : [];

  if (entries.length !== 1 || !isNpmPackResult(entries[0])) {
    throw new Error('npm pack --json must describe exactly one package');
  }

  return entries[0];
}

function isNpmPackResult(value) {
  return (
    isRecord(value) &&
    typeof value.entryCount === 'number' &&
    Array.isArray(value.files) &&
    value.files.every((file) => isRecord(file) && typeof file.path === 'string') &&
    typeof value.filename === 'string' &&
    typeof value.name === 'string' &&
    typeof value.size === 'number' &&
    typeof value.unpackedSize === 'number' &&
    typeof value.version === 'string'
  );
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
