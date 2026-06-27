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
