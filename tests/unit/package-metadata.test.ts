import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

interface PackageJson {
  name: string;
  mcpName?: string;
  sideEffects?: boolean;
  files?: string[];
  publishConfig?: Record<string, unknown>;
  scripts?: Record<string, string>;
}

describe('npm package metadata', () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  ) as PackageJson;

  it('publishes a constrained runtime package surface', () => {
    expect(packageJson.files).toEqual(['dist', 'README.md', 'LICENSE', 'server.json']);
    expect(packageJson.sideEffects).toBe(false);
  });

  it('declares MCP Registry metadata that matches server.json', () => {
    const serverJson = JSON.parse(readFileSync(path.join(process.cwd(), 'server.json'), 'utf8')) as {
      name: string;
      version: string;
      packages: { registryType: string; identifier: string; version?: string }[];
    };

    expect(packageJson.mcpName).toBe('io.github.swimmwatch/cloakbrowser-mcp');
    expect(serverJson.name).toBe(packageJson.mcpName);
    expect(serverJson.version).toBeDefined();
    expect(serverJson.packages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registryType: 'npm',
          identifier: packageJson.name,
          version: serverJson.version,
        }),
        expect.objectContaining({
          registryType: 'oci',
          identifier: expect.stringMatching(new RegExp(`:${serverJson.version.replaceAll('.', '\\.')}$`)),
        }),
      ]),
    );
  });

  it('publishes to the public npm registry and verifies the packed tarball', () => {
    expect(packageJson.publishConfig).toMatchObject({
      access: 'public',
      registry: 'https://registry.npmjs.org/',
    });
    expect(packageJson.scripts?.['package:verify']).toBe(
      'npm run build && node scripts/verify-npm-package.mjs',
    );
  });
});
