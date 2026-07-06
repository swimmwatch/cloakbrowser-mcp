/**
 * Clean stale Chromium `SingletonLock` files left behind by killed browser
 * processes. Chromium uses these locks to prevent concurrent profile access —
 * when the browser is killed with SIGKILL or crashes, the lock files remain
 * and block every subsequent launch with "Browser is already in use".
 *
 * Runs on every CloakBrowser MCP stdio startup, before the Playwright MCP
 * subprocess is spawned, so the downstream process never sees a zombie lock.
 *
 * Lock format differs by platform:
 * - POSIX (Linux, macOS): `SingletonLock` is a symlink whose target ends in
 *   the owning PID, e.g. `profile-12345` -> `hostname-12345`.
 * - Windows: `SingletonLock` is a regular file whose first line is the
 *   owning PID, e.g. `12345\nhostname\n`.
 *
 * Safety: never deletes a lock whose owning PID is still alive, whose
 * status cannot be confirmed (e.g. EPERM), or whose PID value is missing,
 * non-positive, or not a safe integer.
 *
 * Related upstream issues (fixed in newer @playwright/mcp but not in the
 * version that ships with CloakBrowser):
 * - microsoft/playwright-mcp#1311
 * - microsoft/playwright-mcp#1305
 * - microsoft/playwright-mcp#1245
 */
import { existsSync, readdirSync, readFileSync, readlinkSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join as joinPosix } from 'node:path/posix';
import { join as joinWin32 } from 'node:path/win32';

const SINGLETON_LOCK_FILES = ['SingletonLock', 'SingletonCookie', 'SingletonSocket'] as const;
const PROFILE_DIR_PREFIX = 'mcp-chromium-';
const CACHE_DIR_NAME = 'ms-playwright-mcp';
const PID_REGEX = /\d+$/;

/**
 * Resolves the platform-specific Playwright MCP cache directory.
 * Exported for testability — the win32 branch uses env vars that
 * cannot be exercised cleanly on POSIX CI hosts.
 */
export function getCacheDir(platform: NodeJS.Platform): string {
  if (platform === 'win32') {
    // `%LOCALAPPDATA%` is the Windows default; fall back to `%USERPROFILE%`
    // for unusual shells, and finally to `homedir()`.
    const localAppData = process.env.LOCALAPPDATA;
    const userProfile = process.env.USERPROFILE;
    const base =
      localAppData && localAppData.length > 0
        ? localAppData
        : userProfile && userProfile.length > 0
          ? userProfile
          : homedir();
    // `path.win32.join` keeps `\` separators even on POSIX CI hosts so the
    // path matches what the Windows Chromium process will resolve later.
    return joinWin32(base, CACHE_DIR_NAME);
  }
  return joinPosix(homedir(), '.cache', CACHE_DIR_NAME);
}

/**
 * Reads the owning PID from a `SingletonLock` entry, handling both POSIX
 * symlink targets and Windows plain-file content. Returns `null` when the
 * lock is missing, unreadable, or has no valid positive PID.
 * Exported for testability.
 */
export function readLockPid(lockPath: string, platform: NodeJS.Platform): number | null {
  let raw: string;
  if (platform === 'win32') {
    try {
      raw = readFileSync(lockPath, 'utf8');
    } catch {
      return null;
    }
    // First line: `PID\nhostname\n`. Tolerate CRLF.
    raw = raw.split(/\r?\n/, 1)[0]?.trim() ?? '';
  } else {
    let target: string;
    try {
      target = readlinkSync(lockPath);
    } catch {
      return null;
    }
    raw = target;
  }
  const match = PID_REGEX.exec(raw);
  if (!match) return null;
  const pid = Number(match[0]);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}

function isProcessDead(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false; // alive
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ESRCH') return true; // dead
    return false; // EPERM, EACCES, or other — keep the lock
  }
}

function removeSingletonFiles(profileDir: string, platform: NodeJS.Platform): void {
  const joinPath = platform === 'win32' ? joinWin32 : joinPosix;
  for (const name of SINGLETON_LOCK_FILES) {
    try {
      unlinkSync(joinPath(profileDir, name));
    } catch {
      // File may not exist; cleanup is best-effort.
    }
  }
}

/** Options accepted by {@link cleanStaleSingletonLocks}. */
export interface CleanStaleSingletonLocksOptions {
  /** Override the cache directory (used by tests). */
  readonly cacheDir?: string;
  /** Override the platform identifier (used by tests). */
  readonly platform?: NodeJS.Platform;
}

/**
 * Iterates every `mcp-chromium-*` profile directory under the platform cache
 * directory and removes the `SingletonLock` / `SingletonCookie` /
 * `SingletonSocket` files whose owning PID is no longer alive.
 *
 * Safety guarantees:
 * - Skips the cache directory silently if it does not exist.
 * - Skips entries whose lock file is missing or unreadable.
 * - Skips entries whose owning PID is still alive.
 * - Skips entries whose PID status is indeterminate (EPERM, etc.).
 * - Skips entries with malformed PID values (negative, zero, non-integer).
 */
export function cleanStaleSingletonLocks(options: CleanStaleSingletonLocksOptions = {}): void {
  const platform = options.platform ?? process.platform;
  const cacheDir = options.cacheDir ?? getCacheDir(platform);
  if (!existsSync(cacheDir)) return;

  let entries: string[];
  try {
    entries = readdirSync(cacheDir);
  } catch {
    return;
  }

  const joinPath = platform === 'win32' ? joinWin32 : joinPosix;

  for (const entry of entries) {
    if (!entry.startsWith(PROFILE_DIR_PREFIX)) continue;
    const profileDir = joinPath(cacheDir, entry);
    const lockPath = joinPath(profileDir, 'SingletonLock');

    const pid = readLockPid(lockPath, platform);
    if (pid === null) continue;
    if (!isProcessDead(pid)) continue;

    removeSingletonFiles(profileDir, platform);
  }
}
