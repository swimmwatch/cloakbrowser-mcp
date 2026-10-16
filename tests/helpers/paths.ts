import path from 'node:path';
import { tmpdir } from 'node:os';
const tmpdirResult = tmpdir();
const platformExecutableNameResult = platformExecutableName('chrome');
export const fakeCloakBinaryPath = path.join(tmpdirResult, 'cloakbrowser', platformExecutableNameResult);
const tmpdirResult2 = tmpdir();
export const fakeConfigPath = path.join(tmpdirResult2, 'config.json');
const tmpdirResult3 = tmpdir();
export const fakeCoreBundlePath = path.join(tmpdirResult3, 'coreBundle');
const tmpdirResult4 = tmpdir();
export const fakeOutputDir = path.join(tmpdirResult4, 'output');
const tmpdirResult5 = tmpdir();
export const fakeRuntimeDir = path.join(tmpdirResult5, 'runtime');
const tmpdirResult6 = tmpdir();
export const fakeUpstreamCliPath = path.join(tmpdirResult6, 'playwright-mcp.js');
function platformExecutableName(name: string): string {
  return process.platform === 'win32' ? `${name}.exe` : name;
}
