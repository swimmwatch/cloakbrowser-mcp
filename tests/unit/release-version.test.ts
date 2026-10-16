import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, describe, expect, it } from 'vitest';
const tempRoots: string[] = [];
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-mcp-release-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
function readJson<T>(root: string, relativePath: string): T {
  const joinedPath2 = path.join(root, relativePath);
  const fileSyncResult = readFileSync(joinedPath2, 'utf8');
  return JSON.parse(fileSyncResult) as T;
}
describe('release version script', () => {
  it('applies GitHub release tags to package, server metadata, and workflow outputs', () => {
    const root = createTempRoot();
    const joinedPath3 = path.join(root, 'docs');
    const mkdirSyncOptions = { recursive: true } as const;
    mkdirSync(joinedPath3, mkdirSyncOptions);
    const joinedPath4 = path.join(root, 'package.json');
    const stringifyOptions = { name: 'cloakbrowser-mcp', version: '0.0.0' } as const;
    const templateValue = JSON.stringify(stringifyOptions, null, 2);
    const message = `${templateValue}\n`;
    writeFileSync(joinedPath4, message);
    const joinedPath5 = path.join(root, 'package-lock.json');
    const stringifyOptions2 = {
      name: 'cloakbrowser-mcp',
      version: '0.0.0',
      packages: { '': { version: '0.0.0' } },
    } as const;
    const templateValue2 = JSON.stringify(stringifyOptions2, null, 2);
    const message2 = `${templateValue2}\n`;
    writeFileSync(joinedPath5, message2);
    const joinedPath6 = path.join(root, 'server.json');
    const stringifyOptions3 = {
      version: '0.0.0',
      packages: [
        { registryType: 'npm', version: '0.0.0' },
        { registryType: 'oci', identifier: 'ghcr.io/swimmwatch/cloakbrowser-mcp:0.0.0' },
        { registryType: 'oci', identifier: 'docker.io/swimmwatch/cloakbrowser-mcp:0.0.0' },
      ],
    };
    const templateValue3 = JSON.stringify(stringifyOptions3, null, 2);
    const message3 = `${templateValue3}\n`;
    writeFileSync(joinedPath6, message3);
    const joinedPath7 = path.join(root, 'docs/index.md');
    writeFileSync(joinedPath7, 'Current version: {{ project.version_tag }}.\n');
    const joinedPath8 = path.join(root, 'docs/getting-started.md');
    const joinedPath9 = [
      'npx -y {{ project.npm_pin }}',
      'docker pull {{ project.docker_image }}',
      'docker pull {{ project.ghcr_image }}',
    ].join('\n');
    writeFileSync(joinedPath8, joinedPath9);
    const githubOutputPath = path.join(root, 'github-output');
    const argumentValue2 = process.execPath;
    const cwdResult = process.cwd();
    const joinedPath10 = path.join(cwdResult, 'scripts/apply-release-version.mjs');
    const argumentValue = 'refs/tags/v2.3.4-beta.1+build';
    const values: readonly string[] = [joinedPath10, argumentValue];
    const execFileSyncOptions = {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: githubOutputPath },
      stdio: 'ignore',
    } as const;
    execFileSync(argumentValue2, values, execFileSyncOptions);
    const packageJson = readJson<{
      version: string;
    }>(root, 'package.json');
    const serverJson = readJson<{
      version: string;
      packages: Array<{
        identifier?: string;
        version?: string;
      }>;
    }>(root, 'server.json');
    const mappedValues = readFileSync(githubOutputPath, 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('='));
    const outputs = Object.fromEntries(mappedValues);
    expect(packageJson.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.packages[0]?.version).toBe('2.3.4-beta.1+build');
    expect(serverJson.packages[1]?.identifier).toBe('ghcr.io/swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build');
    expect(serverJson.packages[2]?.identifier).toBe(
      'docker.io/swimmwatch/cloakbrowser-mcp:2.3.4-beta.1-build',
    );
    const joinedPath11 = path.join(root, 'docs/index.md');
    const fileSyncResult2 = readFileSync(joinedPath11, 'utf8');
    expect(fileSyncResult2).toBe('Current version: {{ project.version_tag }}.\n');
    const joinedPath12 = path.join(root, 'docs/getting-started.md');
    const fileSyncResult3 = readFileSync(joinedPath12, 'utf8');
    const receiverActual = fileSyncResult3;
    const joinedPath13 = [
      'npx -y {{ project.npm_pin }}',
      'docker pull {{ project.docker_image }}',
      'docker pull {{ project.ghcr_image }}',
    ].join('\n');
    expect(receiverActual).toBe(joinedPath13);
    const receiver2Actual = outputs;
    const toEqualOptions = {
      docker_major_minor: '2.3',
      docker_tag: 'v2.3.4-beta.1-build',
      docker_version: '2.3.4-beta.1-build',
      version: '2.3.4-beta.1+build',
      version_tag: 'v2.3.4-beta.1+build',
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions);
  });
});
