import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArtifactManager } from '@/artifacts/manager.js';
import { isCloakMcpError } from '@/errors/index.js';

describe('ArtifactManager', () => {
  let dir: string;
  let mgr: ArtifactManager;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-art-'));
    mgr = new ArtifactManager(dir);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes a file under the root', async () => {
    const ref = await mgr.write('hello.txt', new TextEncoder().encode('hi'), 'text/plain');
    expect(existsSync(ref.path)).toBe(true);
    expect(ref.bytes).toBe(2);
    expect(ref.contentType).toBe('text/plain');
    expect(path.dirname(ref.path)).toBe(path.resolve(dir));
  });

  it('rejects absolute paths', () => {
    expect(() => mgr.resolveSafe('/etc/passwd')).toThrow();
  });

  it('rejects traversal segments', () => {
    expect(() => mgr.resolveSafe('../escape.txt')).toThrow();
    expect(() => mgr.resolveSafe('a/../../b')).toThrow();
  });

  it('rejects unsafe characters', () => {
    try {
      mgr.resolveSafe('weird name?.png');
      expect.fail('should throw');
    } catch (e) {
      if (isCloakMcpError(e)) expect(e.code).toBe('PATH_DENIED');
      else expect.fail('wrong error');
    }
  });

  it('generates unique filenames', () => {
    const a = mgr.uniqueName('screenshot', 'png');
    const b = mgr.uniqueName('screenshot', 'png');
    expect(a).not.toBe(b);
    expect(a.endsWith('.png')).toBe(true);
  });
});
