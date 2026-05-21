import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('release version injection', () => {
  let dir: string;
  const script = path.join(process.cwd(), 'scripts', 'apply-release-version.mjs');

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'cbmcp-version-'));
    mkdirSync(path.join(dir, 'docs'));
    writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ name: 'demo', version: '0.0.0' })}\n`);
    writeFileSync(
      path.join(dir, 'package-lock.json'),
      `${JSON.stringify({ name: 'demo', version: '0.0.0', packages: { '': { version: '0.0.0' } } })}\n`,
    );
    writeFileSync(
      path.join(dir, 'README.md'),
      'Current version: <!-- project-version -->v0.0.0<!-- /project-version -->\n',
    );
    writeFileSync(
      path.join(dir, 'docs', 'index.md'),
      'Current version: <!-- project-version -->v0.0.0<!-- /project-version -->\n',
    );
    writeFileSync(
      path.join(dir, 'server.json'),
      `${JSON.stringify({
        name: 'io.github.example/demo',
        version: '0.0.0',
        packages: [
          { registryType: 'npm', identifier: 'demo', version: '0.0.0', transport: { type: 'stdio' } },
          { registryType: 'oci', identifier: 'ghcr.io/example/demo:0.0.0', transport: { type: 'stdio' } },
        ],
      })}\n`,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('applies a v-prefixed semver tag to package metadata and docs markers', () => {
    execFileSync(process.execPath, [script, 'v2.3.4'], { cwd: dir, stdio: 'pipe' });

    const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { version: string };
    const lock = JSON.parse(readFileSync(path.join(dir, 'package-lock.json'), 'utf8')) as {
      version: string;
      packages: { '': { version: string } };
    };
    const serverJson = JSON.parse(readFileSync(path.join(dir, 'server.json'), 'utf8')) as {
      version: string;
      packages: { registryType: string; version?: string; identifier: string }[];
    };

    expect(pkg.version).toBe('2.3.4');
    expect(lock.version).toBe('2.3.4');
    expect(lock.packages[''].version).toBe('2.3.4');
    expect(serverJson.version).toBe('2.3.4');
    expect(serverJson.packages[0]!.version).toBe('2.3.4');
    expect(serverJson.packages[1]!.identifier).toBe('ghcr.io/example/demo:2.3.4');
    expect(readFileSync(path.join(dir, 'README.md'), 'utf8')).toContain(
      '<!-- project-version -->v2.3.4<!-- /project-version -->',
    );
    expect(readFileSync(path.join(dir, 'docs', 'index.md'), 'utf8')).toContain(
      '<!-- project-version -->v2.3.4<!-- /project-version -->',
    );
  });

  it('rejects tags that are not npm-compatible semver versions', () => {
    const result = spawnSync(process.execPath, [script, 'release-2'], { cwd: dir, stdio: 'pipe' });

    expect(result.status).not.toBe(0);
    expect(result.stderr.toString()).toContain('release tag must be a semver version');
  });
});
