import { readFileSync } from 'node:fs';
const uRL = new URL('../../package-lock.json', import.meta.url);
const fileSyncResult = readFileSync(uRL, 'utf8');
const lockfile = JSON.parse(fileSyncResult) as {
  packages: Record<
    string,
    {
      version?: string;
    }
  >;
};
const freezeOptions = {
  productionPlaywrightCore: lockedVersion('node_modules/playwright-core'),
  playwrightMcp: lockedVersion('node_modules/@playwright/mcp'),
  upstreamPlaywright: lockedVersion('node_modules/@playwright/mcp/node_modules/playwright'),
  upstreamPlaywrightCore: lockedVersion('node_modules/@playwright/mcp/node_modules/playwright-core'),
  developmentPlaywright: lockedVersion('node_modules/playwright'),
} as const;
// Keep expectations independent of the diagnostics implementation.
export const expectedDependencyVersions = Object.freeze(freezeOptions);
function lockedVersion(packagePath: string): string {
  const version = lockfile.packages[packagePath]?.version;
  if (!version) {
    const message = `Missing locked dependency version: ${packagePath}`;
    throw new Error(message);
  }
  return version;
}
