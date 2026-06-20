import path from 'node:path';
import { tmpdir } from 'node:os';

export const fakeCloakBinaryPath = path.join(tmpdir(), 'cloakbrowser', platformExecutableName('chrome'));
export const fakeConfigPath = path.join(tmpdir(), 'config.json');
export const fakeCoreBundlePath = path.join(tmpdir(), 'coreBundle');
export const fakeOutputDir = path.join(tmpdir(), 'output');
export const fakeRuntimeDir = path.join(tmpdir(), 'runtime');
export const fakeUpstreamCliPath = path.join(tmpdir(), 'playwright-mcp.js');

function platformExecutableName(name: string): string {
  return process.platform === 'win32' ? `${name}.exe` : name;
}
