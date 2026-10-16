import { readFileSync } from 'node:fs';
import { createRequire, register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
let registered = false;
export function registerHumanizeCompatibility(): void {
  if (registered) return;
  const require = createRequire(import.meta.url);
  const entry = require.resolve('cloakbrowser');
  const dirnameResult = path.dirname(entry);
  const joinedPath = path.join(dirnameResult, '..', 'package.json');
  const fileSyncResult = readFileSync(joinedPath, 'utf8');
  const metadata: unknown = JSON.parse(fileSyncResult);
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('version' in metadata) ||
    (metadata.version !== '0.6.0' &&
      metadata.version !== '0.6.1' &&
      metadata.version !== '0.6.2' &&
      metadata.version !== '0.6.3')
  ) {
    throw new Error(
      'Humanize compatibility is verified only for CloakBrowser 0.6.0, 0.6.1, 0.6.2, and 0.6.3; update the bridge before enabling humanize with another version',
    );
  }
  const uRL = new URL('./humanizeCompatibilityLoader.js', import.meta.url);
  const pathToFileURLResult = pathToFileURL(entry);
  const propertyValue = new URL('./human/worldHelpers.js', pathToFileURLResult).href;
  const pathToFileURLResult2 = pathToFileURL(entry);
  const propertyValue2 = new URL('./human/world.js', pathToFileURLResult2).href;
  const engineModule = new URL('./human/engine.js', pathToFileURLResult);
  const engineUrl =
    metadata.version === '0.6.2' || metadata.version === '0.6.3' ? engineModule.href : undefined;
  const options = {
    helpersUrl: propertyValue,
    worldUrl: propertyValue2,
    engineUrl,
  } as const;
  const registerOptions = {
    data: options,
  } as const;
  register(uRL, registerOptions);
  registered = true;
}
