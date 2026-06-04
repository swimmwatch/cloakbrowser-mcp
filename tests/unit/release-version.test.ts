import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-mcp-release-'));
  tempRoots.push(root);
  return root;
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8')) as T;
}

describe('release version script', () => {
  it('applies GitHub release tags to package, server metadata, docs, and workflow outputs', () => {
    const root = createTempRoot();
    mkdirSync(path.join(root, 'docs'), { recursive: true });

    writeFileSync(
      path.join(root, 'package.json'),
      `${JSON.stringify({ name: 'cloakbrowser-mcp', version: '0.0.0' }, null, 2)}\n`,
    );
    writeFileSync(
      path.join(root, 'package-lock.json'),
      `${JSON.stringify(
        { name: 'cloakbrowser-mcp', version: '0.0.0', packages: { '': { version: '0.0.0' } } },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(root, 'server.json'),
      `${JSON.stringify(
        {
          version: '0.0.0',
          packages: [
            { registryType: 'npm', version: '0.0.0' },
            { registryType: 'oci', identifier: 'ghcr.io/swimmwatch/cloakbrowser-mcp:0.0.0' },
            { registryType: 'oci', identifier: 'docker.io/swimmwatch/cloakbrowser-mcp:0.0.0' },
          ],
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      path.join(root, 'docs/index.md'),
      'Current version: <!-- project-version -->v0.0.0<!-- /project-version -->.\n',
    );
    writeFileSync(
      path.join(root, 'docs/getting-started.md'),
      [
        'npx -y cloakbrowser-mcp@0.0.0',
        'docker pull swimmwatch/cloakbrowser-mcp:0.0.0',
        'docker pull ghcr.io/swimmwatch/cloakbrowser-mcp:0.0.0',
      ].join('\n'),
    );

    const githubOutputPath = path.join(root, 'github-output');
    execFileSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts/apply-release-version.mjs'), 'refs/tags/v2.3.4-beta.1+build'],
      {
        cwd: root,
        env: { ...process.env, GITHUB_OUTPUT: githubOutputPath },
        stdio: 'ignore',
      },
    );

    const packageJson = readJson<{ version: string }>(root, 'package.json');
    const serverJson = readJson<{
      version: string;
      packages: Array<{ identifier?: string; version?: string }>;
    }>(root, 'server.json');
    const outputs = Object.fromEntries(
      readFileSync(githubOutputPath, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split('=')),
    );

    expect(packageJson.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.packages[0]?.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.packages[1]?.identifier).toBe('ghcr.io/swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build');
    expect(serverJson.packages[2]?.identifier).toBe(
      'docker.io/swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build',
    );
    expect(readFileSync(path.join(root, 'docs/index.md'), 'utf8')).toContain('v2.3.4-beta.1+build');
    expect(readFileSync(path.join(root, 'docs/getting-started.md'), 'utf8')).toContain(
      'cloakbrowser-mcp@2.3.4-beta.1+build',
    );
    expect(readFileSync(path.join(root, 'docs/getting-started.md'), 'utf8')).toContain(
      'ghcr.io/swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build',
    );
    expect(readFileSync(path.join(root, 'docs/getting-started.md'), 'utf8')).toContain(
      'swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build',
    );
    expect(outputs).toEqual({
      docker_major_minor: '2.3',
      docker_tag: 'v2.3.4-beta.1-build',
      docker_version: '2.3.4-beta.1-build',
      version: '2.3.4-beta.1+build',
      version_tag: 'v2.3.4-beta.1+build',
    });
  });
});
