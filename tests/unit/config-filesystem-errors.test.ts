import {
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareBridgeRuntime } from '@/bridge/config.js';
import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';

const { fault } = vi.hoisted(() => ({ fault: { path: '', mode: -1, open: false } }));
vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  const denied = () => {
    const error = new Error('Access denied');
    const code = { code: systemErrorCodes.EACCES };
    return Object.assign(error, code);
  };
  const access: typeof original.accessSync = (file, mode) => {
    if (file === fault.path && mode === fault.mode) throw denied();
    original.accessSync(file, mode);
  };
  const open: typeof original.openSync = (file, flags, mode) => {
    if (file === fault.path && fault.open) throw denied();
    return original.openSync(file, flags, mode);
  };
  return { ...original, accessSync: access, openSync: open };
});
const roots: string[] = [];
afterEach(() => {
  fault.path = '';
  fault.mode = -1;
  fault.open = false;
  const options = { recursive: true, force: true };
  for (const root of roots.splice(0)) rmSync(root, options);
});
function createRoot(): string {
  const prefix = path.join(tmpdir(), 'cloak-config-fs-');
  const root = mkdtempSync(prefix);
  roots.push(root);
  return root;
}
function assertRuntimeRemoved(root: string): void {
  const remaining = readdirSync(root).filter((entry) => entry.startsWith('cloakbrowser-mcp-'));
  expect(remaining).toHaveLength(0);
}

describe('configuration filesystem error boundaries', () => {
  const accessFailures: Array<[number, string]> = [
    [constants.R_OK, 'a readable'],
    [constants.X_OK, 'an executable'],
  ];
  it.each(accessFailures)('rejects a binary failing access mode %i before launch', async (mode, label) => {
    const root = createRoot();
    const binaryPath = path.join(root, 'chromium');
    const fileOptions = { mode: 0o755 };
    writeFileSync(binaryPath, 'fixture', fileOptions);
    fault.path = binaryPath;
    fault.mode = mode;
    const options = { tempRoot: root, binaryPath, env: {} };
    const preparing = prepareBridgeRuntime(options);
    const message = `binaryPath must point to ${label} file`;
    await expect(preparing).rejects.toThrow(message);
    assertRuntimeRemoved(root);
  });
  it('rejects an unwritable persistent profile before launching the upstream', async () => {
    const root = createRoot();
    const output = path.join(root, 'output');
    mkdirSync(output);
    fault.path = output;
    fault.mode = constants.W_OK;
    const env = { PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright', PLAYWRIGHT_MCP_OUTPUT_DIR: output };
    const options = { tempRoot: root, userDataDir: output, env };
    const preparing = prepareBridgeRuntime(options);
    await expect(preparing).rejects.toThrow('userDataDir must point to a writable directory');
    assertRuntimeRemoved(root);
  });
  it.each([false, true])(
    'cleans up a profile lock creation failure with directory alias %s',
    async (useAlias) => {
      const root = createRoot();
      const profile = path.join(root, 'profile');
      mkdirSync(profile);
      const canonicalProfile = realpathSync.native(profile);
      const lock = path.join(canonicalProfile, '.cloakbrowser-mcp-profile.lock');
      let userDataDir = profile;
      if (useAlias) {
        userDataDir = path.join(root, 'profile-alias');
        symlinkSync(canonicalProfile, userDataDir, 'junction');
      }
      fault.path = lock;
      fault.open = true;
      const output = path.join(root, 'output');
      const env = {
        PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
        PLAYWRIGHT_MCP_OUTPUT_DIR: output,
        CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
      };
      const options = { tempRoot: root, userDataDir, env };
      const preparing = prepareBridgeRuntime(options);
      await expect(preparing).rejects.toThrow('Could not create profile lock');
      const exists = existsSync(lock);
      expect(exists).toBe(false);
      assertRuntimeRemoved(root);
      fault.open = false;
      const runtime = await prepareBridgeRuntime(options);
      try {
        const reacquired = existsSync(lock);
        expect(reacquired).toBe(true);
      } finally {
        runtime.dispose();
      }
      const lockRemains = existsSync(lock);
      expect(lockRemains).toBe(false);
      assertRuntimeRemoved(root);
    },
  );
  it('disposes and releases an active reservation even if the lock file was already removed', async () => {
    const root = createRoot();
    const profile = path.join(root, 'profile');
    const output = path.join(root, 'output');
    const lock = path.join(profile, '.cloakbrowser-mcp-profile.lock');
    const env = {
      PLAYWRIGHT_MCP_BROWSER_ENGINE: 'playwright',
      PLAYWRIGHT_MCP_OUTPUT_DIR: output,
      CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK: 'false',
    };
    const options = { tempRoot: root, userDataDir: profile, env };
    const runtime = await prepareBridgeRuntime(options);
    try {
      rmSync(lock);
    } finally {
      runtime.dispose();
    }
    assertRuntimeRemoved(root);
    const retry = await prepareBridgeRuntime(options);
    retry.dispose();
    assertRuntimeRemoved(root);
  });
});
