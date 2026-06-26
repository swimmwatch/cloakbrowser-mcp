import { lstatSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanStaleSingletonLocks, getCacheDir, readLockPid } from '@/cli/singleton-lock-cleanup.js';

const tempRoots: string[] = [];

function createTempRoot(): string {
  const root = join(
    tmpdir(),
    `cloakbrowser-mcp-singleton-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(root, { recursive: true });
  tempRoots.push(root);
  return root;
}

function createProfileDir(cacheDir: string, name: string): string {
  const profileDir = join(cacheDir, name);
  mkdirSync(profileDir, { recursive: true });
  return profileDir;
}

function exists(profileDir: string, name: string): boolean {
  // `lstatSync` (does not follow symlinks) detects broken `SingletonLock`
  // symlinks; `existsSync` would return false for our fake targets.
  try {
    lstatSync(join(profileDir, name));
    return true;
  } catch {
    return false;
  }
}

function writePosixLock(profileDir: string, pid: number): void {
  symlinkSync(`hostname-${pid}`, join(profileDir, 'SingletonLock'));
}

function writeWindowsLock(profileDir: string, pid: number): void {
  writeFileSync(join(profileDir, 'SingletonLock'), `${pid}\nhostname\n`);
}

function writeExtraLockFiles(profileDir: string): void {
  writeFileSync(join(profileDir, 'SingletonCookie'), 'cookie');
  writeFileSync(join(profileDir, 'SingletonSocket'), 'socket');
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
    err.code = result === 'dead' ? 'ESRCH' : result === 'eperm' ? 'EPERM' : 'EACCES';
    throw err;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('cleanStaleSingletonLocks (posix)', () => {
  it('removes the three singleton files when the PID is dead', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-dead');
    const deadPid = 2_000_000_001;
    writePosixLock(profile, deadPid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('dead');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(false);
    expect(exists(profile, 'SingletonCookie')).toBe(false);
    expect(exists(profile, 'SingletonSocket')).toBe(false);
  });

  it('keeps locks when the PID is still alive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-alive');
    const alivePid = 4242;
    writePosixLock(profile, alivePid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('alive');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(exists(profile, 'SingletonCookie')).toBe(true);
    expect(exists(profile, 'SingletonSocket')).toBe(true);
  });

  it('keeps locks when the PID status is indeterminate (EPERM)', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-eperm');
    writePosixLock(profile, 12345);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('eperm');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(exists(profile, 'SingletonCookie')).toBe(true);
    expect(exists(profile, 'SingletonSocket')).toBe(true);
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

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(exists(profile, 'SingletonCookie')).toBe(true);
    expect(exists(profile, 'SingletonSocket')).toBe(true);
  });

  it('keeps locks when the lock target has no valid PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-bad');
    symlinkSync('not-a-number', join(profile, 'SingletonLock'));
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(exists(profile, 'SingletonCookie')).toBe(true);
    expect(exists(profile, 'SingletonSocket')).toBe(true);
    // Unparseable lock — process probe must never have been consulted.
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('keeps locks when the PID is zero', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-zero');
    symlinkSync('hostname-0', join(profile, 'SingletonLock'));
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('skips profile directories that do not start with the chromium prefix', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'firefox-something');
    writePosixLock(profile, 2_000_000_002);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(profile, 'SingletonLock')).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('skips profiles whose SingletonLock is missing', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-no-lock');
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');

    expect(() => cleanStaleSingletonLocks({ cacheDir: root })).not.toThrow();
    expect(exists(profile, 'SingletonCookie')).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('is a silent no-op when the cache directory does not exist', () => {
    const root = createTempRoot();
    const missing = join(root, 'definitely-not-here');
    const killSpy = vi.spyOn(process, 'kill');

    expect(() => cleanStaleSingletonLocks({ cacheDir: missing })).not.toThrow();
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('cleans multiple stale profiles in a single call', () => {
    const root = createTempRoot();
    const a = createProfileDir(root, 'mcp-chromium-a');
    const b = createProfileDir(root, 'mcp-chromium-b');
    const alive = createProfileDir(root, 'mcp-chromium-c');
    const aPid = 2_000_000_003;
    const bPid = 2_000_000_004;
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
      const err = new Error('ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    });
    spy.mockImplementationOnce(() => {
      const err = new Error('ESRCH') as NodeJS.ErrnoException;
      err.code = 'ESRCH';
      throw err;
    });
    spy.mockImplementationOnce(() => true);

    cleanStaleSingletonLocks({ cacheDir: root });

    expect(exists(a, 'SingletonLock')).toBe(false);
    expect(exists(b, 'SingletonLock')).toBe(false);
    expect(exists(alive, 'SingletonLock')).toBe(true);
  });

  it('is robust when only some singleton files are present', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-partial');
    const pid = 2_000_000_006;
    writePosixLock(profile, pid);
    stubProcessKillOnce('dead');

    expect(() => cleanStaleSingletonLocks({ cacheDir: root })).not.toThrow();
    expect(exists(profile, 'SingletonLock')).toBe(false);
  });
});

describe('cleanStaleSingletonLocks (windows lock format)', () => {
  it('removes a windows-format lock whose PID is dead', () => {
    // Drive the win32 branch of `readLockPid` by passing
    // `platform: 'win32'` explicitly. The cache directory is injected
    // so we do not depend on the win32 cache-dir branch.
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win');
    const deadPid = 2_000_000_005;
    writeWindowsLock(profile, deadPid);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('dead');

    cleanStaleSingletonLocks({ cacheDir: root, platform: 'win32' });

    expect(exists(profile, 'SingletonLock')).toBe(false);
    expect(exists(profile, 'SingletonCookie')).toBe(false);
    expect(exists(profile, 'SingletonSocket')).toBe(false);
  });

  it('keeps a windows-format lock whose PID is alive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-alive');
    writeWindowsLock(profile, 4242);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('alive');

    cleanStaleSingletonLocks({ cacheDir: root, platform: 'win32' });

    expect(exists(profile, 'SingletonLock')).toBe(true);
  });

  it('keeps a windows-format lock whose PID status is unknown', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-eperm');
    writeWindowsLock(profile, 4243);
    writeExtraLockFiles(profile);
    stubProcessKillOnce('eperm');

    cleanStaleSingletonLocks({ cacheDir: root, platform: 'win32' });

    expect(exists(profile, 'SingletonLock')).toBe(true);
  });

  it('skips a windows-format lock with a non-positive PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-bad');
    writeWindowsLock(profile, 0);
    writeExtraLockFiles(profile);
    const killSpy = vi.spyOn(process, 'kill');

    cleanStaleSingletonLocks({ cacheDir: root, platform: 'win32' });

    expect(exists(profile, 'SingletonLock')).toBe(true);
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
    expect(getCacheDir('linux')).toBe(`${process.env.HOME}/.cache/ms-playwright-mcp`);
  });

  it('returns the XDG cache path on darwin', () => {
    expect(getCacheDir('darwin')).toBe(`${process.env.HOME}/.cache/ms-playwright-mcp`);
  });

  it('returns %LOCALAPPDATA%\\ms-playwright-mcp on win32 when set', () => {
    process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
    delete process.env.USERPROFILE;
    expect(getCacheDir('win32')).toBe('C:\\Users\\test\\AppData\\Local\\ms-playwright-mcp');
  });

  it('falls back to %USERPROFILE% on win32 when %LOCALAPPDATA% is unset', () => {
    delete process.env.LOCALAPPDATA;
    process.env.USERPROFILE = 'C:\\Users\\test';
    expect(getCacheDir('win32')).toBe('C:\\Users\\test\\ms-playwright-mcp');
  });

  it('falls back to homedir() on win32 when neither env var is set', () => {
    delete process.env.LOCALAPPDATA;
    delete process.env.USERPROFILE;
    expect(getCacheDir('win32').endsWith('\\ms-playwright-mcp')).toBe(true);
  });
});

describe('readLockPid (posix)', () => {
  it('parses PID from symlink target ending in digits', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    symlinkSync('host-12345', join(profile, 'SingletonLock'));
    expect(readLockPid(join(profile, 'SingletonLock'), 'linux')).toBe(12345);
  });

  it('returns null when the lock file is missing', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    expect(readLockPid(join(profile, 'SingletonLock'), 'linux')).toBeNull();
  });

  it('returns null when the symlink target has no trailing PID', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    symlinkSync('host-without-pid', join(profile, 'SingletonLock'));
    expect(readLockPid(join(profile, 'SingletonLock'), 'linux')).toBeNull();
  });
});

describe('readLockPid (windows)', () => {
  it('parses PID from the first line of the lock file', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    writeFileSync(join(profile, 'SingletonLock'), '4242\nDESKTOP-XYZ\n');
    expect(readLockPid(join(profile, 'SingletonLock'), 'win32')).toBe(4242);
  });

  it('tolerates CRLF line endings', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    writeFileSync(join(profile, 'SingletonLock'), '99\r\nDESKTOP\r\n');
    expect(readLockPid(join(profile, 'SingletonLock'), 'win32')).toBe(99);
  });

  it('returns null when the file is missing', () => {
    const root = createTempRoot();
    expect(readLockPid(join(root, 'nope'), 'win32')).toBeNull();
  });

  it('returns null when the PID is non-positive', () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-a');
    writeFileSync(join(profile, 'SingletonLock'), '0\nhost\n');
    expect(readLockPid(join(profile, 'SingletonLock'), 'win32')).toBeNull();
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
    const profile = createProfileDir(root, 'mcp-chromium-raced');
    writePosixLock(profile, 2_000_000_010);
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readlinkSync: () => {
          throw new Error('ENOENT');
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => cleanup({ cacheDir: root })).not.toThrow();
  });

  it('survives a readdirSync error on the cache directory', async () => {
    const root = createTempRoot();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readdirSync: () => {
          throw new Error('EACCES');
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => cleanup({ cacheDir: root })).not.toThrow();
  });

  it('survives a readFileSync error on a windows-format lock', async () => {
    const root = createTempRoot();
    const profile = createProfileDir(root, 'mcp-chromium-win-raced');
    writeWindowsLock(profile, 2_000_000_011);
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readFileSync: () => {
          throw new Error('EACCES');
        },
      };
    });
    const { cleanStaleSingletonLocks: cleanup } = await import('@/cli/singleton-lock-cleanup.js');
    expect(() => cleanup({ cacheDir: root, platform: 'win32' })).not.toThrow();
  });
});
