import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanStaleSingletonLocks, getCacheDir, readLockPid } from '@/cli/singleton-lock-cleanup.js';
const tempRoots: string[] = [];
const isWin32Host = process.platform === 'win32';
const describeOnWin32Host = isWin32Host ? describe : describe.skip;
const describeOnNonWin32Host = isWin32Host ? describe.skip : describe;
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const message = `cloakbrowser-mcp-singleton-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const root = join(tmpdirResult, message);
  const mkdirSyncOptions = { recursive: true } as const;
  mkdirSync(root, mkdirSyncOptions);
  tempRoots.push(root);
  return root;
}
function createProfileDir(cacheDir: string, name: string): string {
  const profileDir = join(cacheDir, name);
  const mkdirSyncOptions2 = { recursive: true } as const;
  mkdirSync(profileDir, mkdirSyncOptions2);
  return profileDir;
}
function exists(profileDir: string, name: string): boolean {
  // `lstatSync` (does not follow symlinks) detects broken `SingletonLock`
  // symlinks; `existsSync` would return false for our fake targets.
  try {
    const joinResult = join(profileDir, name);
    lstatSync(joinResult);
    return true;
  } catch {
    return false;
  }
}
function writePosixLock(profileDir: string, pid: number): void {
  const message2 = `hostname-${pid}`;
  const joinResult2 = join(profileDir, 'SingletonLock');
  symlinkSync(message2, joinResult2);
}
function writeWindowsLock(profileDir: string, pid: number): void {
  const joinResult3 = join(profileDir, 'SingletonLock');
  const message3 = `${pid}\nhostname\n`;
  writeFileSync(joinResult3, message3);
}
function writeExtraLockFiles(profileDir: string): void {
  const joinResult4 = join(profileDir, 'SingletonCookie');
  writeFileSync(joinResult4, 'cookie');
  const joinResult5 = join(profileDir, 'SingletonSocket');
  writeFileSync(joinResult5, 'socket');
}
/**
 * Stubs `process.kill(pid, 0)` to return the given status for one call.
 * `ESRCH` → process is dead; `EPERM` → status is indeterminate;
 * `other-error` → some other errno (status is also treated as indeterminate);
 * `alive` → process is alive (`process.kill` returns `true` on success).
 * The original `process.kill` is restored automatically by the per-test
 * `beforeEach` hook.
 */
function stubProcessKillOnce(result: 'alive' | 'dead' | 'eperm' | 'other-error'): void {
  if (result === 'alive') {
    vi.spyOn(process, 'kill').mockImplementationOnce(() => true);
    return;
  }
  vi.spyOn(process, 'kill').mockImplementationOnce(() => {
    const err = new Error(result) as NodeJS.ErrnoException;
    err.code =
      result === 'dead'
        ? systemErrorCodes.ESRCH
        : result === 'eperm'
          ? systemErrorCodes.EPERM
          : systemErrorCodes.EACCES;
    throw err;
  });
}
beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
describeOnNonWin32Host('cleanStaleSingletonLocks (posix)', () => {
  it('removes the three singleton files when the PID is dead', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-dead');
    const deadPid = 2000000001;
    writePosixLock(profile, deadPid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('dead');
    const cleanStaleSingletonLocksOptions = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions);
    const existsResult = exists(profile, 'SingletonLock');
    expect(existsResult).toBe(false);
    const existsResult2 = exists(profile, 'SingletonCookie');
    expect(existsResult2).toBe(false);
    const existsResult3 = exists(profile, 'SingletonSocket');
    expect(existsResult3).toBe(false);
  });
  it('keeps locks when the PID is still alive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-alive');
    const alivePid = 4242;
    writePosixLock(profile, alivePid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('alive');
    const cleanStaleSingletonLocksOptions2 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions2);
    const existsResult4 = exists(profile, 'SingletonLock');
    expect(existsResult4).toBe(true);
    const existsResult5 = exists(profile, 'SingletonCookie');
    expect(existsResult5).toBe(true);
    const existsResult6 = exists(profile, 'SingletonSocket');
    expect(existsResult6).toBe(true);
  });
  it('keeps locks when the PID status is indeterminate (EPERM)', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-eperm');
    writePosixLock(profile, 12345);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('eperm');
    const cleanStaleSingletonLocksOptions3 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions3);
    const existsResult7 = exists(profile, 'SingletonLock');
    expect(existsResult7).toBe(true);
    const existsResult8 = exists(profile, 'SingletonCookie');
    expect(existsResult8).toBe(true);
    const existsResult9 = exists(profile, 'SingletonSocket');
    expect(existsResult9).toBe(true);
  });
  it('keeps a lock whose owner-status probe throws an unexpected errno', () => {
    // Any non-ESRCH, non-EPERM error from `process.kill(pid, 0)` is
    // treated as "indeterminate" — the lock is preserved. This guards
    // against future kernel error codes that we have not enumerated.
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-unexpected');
    writePosixLock(profile, 9001);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('other-error');
    const cleanStaleSingletonLocksOptions4 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions4);
    const existsResult10 = exists(profile, 'SingletonLock');
    expect(existsResult10).toBe(true);
    const existsResult11 = exists(profile, 'SingletonCookie');
    expect(existsResult11).toBe(true);
    const existsResult12 = exists(profile, 'SingletonSocket');
    expect(existsResult12).toBe(true);
  });
  it('keeps locks when the lock target has no valid PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-bad');
    const joinResult6 = join(profile, 'SingletonLock');
    symlinkSync('not-a-number', joinResult6);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');
    const cleanStaleSingletonLocksOptions5 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions5);
    const existsResult13 = exists(profile, 'SingletonLock');
    expect(existsResult13).toBe(true);
    const existsResult14 = exists(profile, 'SingletonCookie');
    expect(existsResult14).toBe(true);
    const existsResult15 = exists(profile, 'SingletonSocket');
    expect(existsResult15).toBe(true);
    // Unparseable lock — process probe must never have been consulted.
    expect(killSpy).not.toHaveBeenCalled();
  });
  it('keeps locks when the PID is zero', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-zero');
    const joinResult7 = join(profile, 'SingletonLock');
    symlinkSync('hostname-0', joinResult7);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');
    const cleanStaleSingletonLocksOptions6 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions6);
    const existsResult16 = exists(profile, 'SingletonLock');
    expect(existsResult16).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });
  it('skips profile directories that do not start with the chromium prefix', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'firefox-something');
    writePosixLock(profile, 2000000002);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');
    const cleanStaleSingletonLocksOptions7 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions7);
    const existsResult17 = exists(profile, 'SingletonLock');
    expect(existsResult17).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });
  it('skips profiles whose SingletonLock is missing', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-no-lock');
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');
    expect(() => {
      const cleanStaleSingletonLocksOptions8 = { cacheDir: root } as const;
      return cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions8);
    }).not.toThrow();
    const existsResult18 = exists(profile, 'SingletonCookie');
    expect(existsResult18).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });
  it('is a silent no-op when the cache directory does not exist', () => {
    const root = createTempRoot();
    const missing = join(root, 'definitely-not-here');
    const killSpy = vi.spyOn(process, 'kill');
    expect(() => {
      const cleanStaleSingletonLocksOptions9 = { cacheDir: missing } as const;
      return cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions9);
    }).not.toThrow();
    expect(killSpy).not.toHaveBeenCalled();
  });
  it('cleans multiple stale profiles in a single call', () => {
    const root = createTempRoot();
    const a = createProfileDir(root, 'mcp-chromium-a');
    const b = createProfileDir(root, 'mcp-chromium-b');
    const alive = createProfileDir(root, 'mcp-chromium-c');
    const aPid = 2000000003;
    const bPid = 2000000004;
    const alivePid = 9000;
    writePosixLock(a, aPid);
    writePosixLock(b, bPid);
    writePosixLock(alive, alivePid);
    writeExtraLockFiles(a);
    writeExtraLockFiles(b);
    writeExtraLockFiles(alive);
    // First two `process.kill` calls return dead; the third returns alive.
    const spy = vi.spyOn(process, 'kill');
    spy.mockImplementationOnce(() => {
      const err = new Error(systemErrorCodes.ESRCH) as NodeJS.ErrnoException;
      err.code = systemErrorCodes.ESRCH;
      throw err;
    });
    spy.mockImplementationOnce(() => {
      const err = new Error(systemErrorCodes.ESRCH) as NodeJS.ErrnoException;
      err.code = systemErrorCodes.ESRCH;
      throw err;
    });
    spy.mockImplementationOnce(() => true);
    const cleanStaleSingletonLocksOptions10 = { cacheDir: root } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions10);
    const existsResult19 = exists(a, 'SingletonLock');
    expect(existsResult19).toBe(false);
    const existsResult20 = exists(b, 'SingletonLock');
    expect(existsResult20).toBe(false);
    const existsResult21 = exists(alive, 'SingletonLock');
    expect(existsResult21).toBe(true);
  });
  it('is robust when only some singleton files are present', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-partial');
    const pid = 2000000006;
    writePosixLock(profile, pid);
    stubProcessKillOnce('dead');
    expect(() => {
      const cleanStaleSingletonLocksOptions11 = { cacheDir: root } as const;
      return cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions11);
    }).not.toThrow();
    const existsResult22 = exists(profile, 'SingletonLock');
    expect(existsResult22).toBe(false);
  });
});
describeOnWin32Host('cleanStaleSingletonLocks (windows lock format)', () => {
  it('removes a windows-format lock whose PID is dead', () => {
    // Drive the win32 branch of `readLockPid` by passing
    // `platform: 'win32'` explicitly. The cache directory is injected
    // so we do not depend on the win32 cache-dir branch.
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win');
    const deadPid = 2000000005;
    writeWindowsLock(profile, deadPid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('dead');
    const cleanStaleSingletonLocksOptions12 = { cacheDir: root, platform: 'win32' } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions12);
    const existsResult23 = exists(profile, 'SingletonLock');
    expect(existsResult23).toBe(false);
    const existsResult24 = exists(profile, 'SingletonCookie');
    expect(existsResult24).toBe(false);
    const existsResult25 = exists(profile, 'SingletonSocket');
    expect(existsResult25).toBe(false);
  });
  it('keeps a windows-format lock whose PID is alive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-alive');
    writeWindowsLock(profile, 4242);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('alive');
    const cleanStaleSingletonLocksOptions13 = { cacheDir: root, platform: 'win32' } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions13);
    const existsResult26 = exists(profile, 'SingletonLock');
    expect(existsResult26).toBe(true);
  });
  it('keeps a windows-format lock whose PID status is unknown', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-eperm');
    writeWindowsLock(profile, 4243);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('eperm');
    const cleanStaleSingletonLocksOptions14 = { cacheDir: root, platform: 'win32' } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions14);
    const existsResult27 = exists(profile, 'SingletonLock');
    expect(existsResult27).toBe(true);
  });
  it('skips a windows-format lock with a non-positive PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-bad');
    writeWindowsLock(profile, 0);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');
    const cleanStaleSingletonLocksOptions15 = { cacheDir: root, platform: 'win32' } as const;
    cleanStaleSingletonLocks(cleanStaleSingletonLocksOptions15);
    const existsResult28 = exists(profile, 'SingletonLock');
    expect(existsResult28).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });
});
describe('getCacheDir', () => {
  const originalEnv = {
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    USERPROFILE: process.env.USERPROFILE,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  it('returns the XDG cache path on linux', () => {
    const cacheDirResult = getCacheDir('linux');
    const receiverActual = cacheDirResult;
    const message4 = `${process.env.HOME}/.cache/ms-playwright-mcp`;
    expect(receiverActual).toBe(message4);
  });
  it('returns the XDG cache path on darwin', () => {
    const cacheDirResult2 = getCacheDir('darwin');
    const receiver2Actual = cacheDirResult2;
    const message5 = `${process.env.HOME}/.cache/ms-playwright-mcp`;
    expect(receiver2Actual).toBe(message5);
  });
  it('returns %LOCALAPPDATA%\\ms-playwright-mcp on win32 when set', () => {
    process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
    delete process.env.USERPROFILE;
    const cacheDirResult3 = getCacheDir('win32');
    expect(cacheDirResult3).toBe('C:\\Users\\test\\AppData\\Local\\ms-playwright-mcp');
  });
  it('falls back to %USERPROFILE% on win32 when %LOCALAPPDATA% is unset', () => {
    delete process.env.LOCALAPPDATA;
    process.env.USERPROFILE = 'C:\\Users\\test';
    const cacheDirResult4 = getCacheDir('win32');
    expect(cacheDirResult4).toBe('C:\\Users\\test\\ms-playwright-mcp');
  });
  it('falls back to homedir() on win32 when neither env var is set', () => {
    delete process.env.LOCALAPPDATA;
    delete process.env.USERPROFILE;
    const endsWithResult = getCacheDir('win32').endsWith('\\ms-playwright-mcp');
    expect(endsWithResult).toBe(true);
  });
});
describeOnNonWin32Host('readLockPid (posix)', () => {
  it('parses PID from symlink target ending in digits', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult8 = join(profile, 'SingletonLock');
    symlinkSync('host-12345', joinResult8);
    const joinResult9 = join(profile, 'SingletonLock');
    const lockPidResult = readLockPid(joinResult9, 'linux');
    expect(lockPidResult).toBe(12345);
  });
  it('returns null when the lock file is missing', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult10 = join(profile, 'SingletonLock');
    const lockPidResult2 = readLockPid(joinResult10, 'linux');
    expect(lockPidResult2).toBeNull();
  });
  it('returns null when the symlink target has no trailing PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult11 = join(profile, 'SingletonLock');
    symlinkSync('host-without-pid', joinResult11);
    const joinResult12 = join(profile, 'SingletonLock');
    const lockPidResult3 = readLockPid(joinResult12, 'linux');
    expect(lockPidResult3).toBeNull();
  });
});
describe('readLockPid (windows)', () => {
  it('parses PID from the first line of the lock file', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult13 = join(profile, 'SingletonLock');
    writeFileSync(joinResult13, '4242\nDESKTOP-XYZ\n');
    const joinResult14 = join(profile, 'SingletonLock');
    const lockPidResult4 = readLockPid(joinResult14, 'win32');
    expect(lockPidResult4).toBe(4242);
  });
  it('tolerates CRLF line endings', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult15 = join(profile, 'SingletonLock');
    writeFileSync(joinResult15, '99\r\nDESKTOP\r\n');
    const joinResult16 = join(profile, 'SingletonLock');
    const lockPidResult5 = readLockPid(joinResult16, 'win32');
    expect(lockPidResult5).toBe(99);
  });
  it('returns null when the file is missing', () => {
    const root = createTempRoot();
    const joinResult17 = join(root, 'nope');
    const lockPidResult6 = readLockPid(joinResult17, 'win32');
    expect(lockPidResult6).toBeNull();
  });
  it('returns null when the PID is non-positive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    const joinResult18 = join(profile, 'SingletonLock');
    writeFileSync(joinResult18, '0\nhost\n');
    const joinResult19 = join(profile, 'SingletonLock');
    const lockPidResult7 = readLockPid(joinResult19, 'win32');
    expect(lockPidResult7).toBeNull();
  });
});
describe('cleanStaleSingletonLocks (silent no-op on filesystem errors)', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it('survives a readlinkSync error on a posix lock', async () => {
    // `readlinkSync` failing (e.g. on a profile whose SingletonLock was
    // removed between readdir and readlink) must not throw or cascade.
    // We re-import the module under a `vi.mock` of `node:fs` so the
    // mocked `readlinkSync` is observed by the production code.
    const root = createTempRoot();
    createProfileDir(root, 'mcp-chromium-raced');
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readlinkSync: () => {
          throw new Error(systemErrorCodes.ENOENT);
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => {
      const cleanupOptions = { cacheDir: root, platform: 'linux' } as const;
      return cleanup(cleanupOptions);
    }).not.toThrow();
  });
  it('survives a readdirSync error on the cache directory', async () => {
    const root = createTempRoot();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readdirSync: () => {
          throw new Error(systemErrorCodes.EACCES);
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => {
      const cleanupOptions2 = { cacheDir: root } as const;
      return cleanup(cleanupOptions2);
    }).not.toThrow();
  });
  it('survives a readFileSync error on a windows-format lock', async () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-raced');
    writeWindowsLock(profile, 2000000011);
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readFileSync: () => {
          throw new Error(systemErrorCodes.EACCES);
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => {
      const cleanupOptions3 = { cacheDir: root, platform: 'win32' } as const;
      return cleanup(cleanupOptions3);
    }).not.toThrow();
  });
});
