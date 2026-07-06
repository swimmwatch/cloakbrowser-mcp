import { afterEach, describe, expect, it, vi } from 'vitest';

interface McpRegistryModule {
  checkOciManifest(identifier: string): Promise<{ ok: boolean; status: number; url: string }>;
  createBearerTokenUrl(authHeader: string | undefined, fallbackScope: string): string | null;
  createRegistryReport(input: {
    localVersion: string;
    packageName: string;
    registryApiUrl: string;
    serverName: string;
  }): RegistryReport;
  formatOciRegistryName(identifier: string): string;
  formatReport(report: RegistryReport): string;
  getOciRegistryApiHost(registry: string): string;
  normalizeRegistryEntries(registry: unknown): RegistryEntry[];
  parseArgs(argv: string[]): { flags: Set<string>; options: Record<string, string> };
  parseGitHubRepository(url: string): { owner: string; repo: string } | null;
  parseOciIdentifier(identifier: string): { registry: string; repository: string; tag: string };
  parseWwwAuthenticate(header: string | undefined): Record<string, string>;
  selectLatestEntry(entries: RegistryEntry[]): RegistryEntry;
}

interface RegistryEntry {
  server: {
    name?: string;
    version: string;
  };
  meta: Record<string, Record<string, unknown>>;
}

interface RegistryReport {
  serverName: string;
  localVersion: string;
  targetVersion: string | null;
  officialRegistry: {
    status: string;
    url: string;
    latestVersion: string | null;
  };
  npm: {
    status: string;
    package: string;
    version: string | null;
  };
  oci: {
    status: string;
    images: Array<{ registry: string; status: string; image: string; url: string }>;
  };
  githubMcp: {
    status: string;
    checkedUrls: Array<{ status: number | null; url: string }>;
  };
  warnings: string[];
  errors: string[];
}

const registry = (await import(
  new URL('../../scripts/lib/mcp-registry.mjs', import.meta.url).href
)) as unknown as McpRegistryModule;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MCP registry helpers', () => {
  it('parses CLI flags and options', () => {
    const parsed = registry.parseArgs([
      '--strict',
      '--version',
      '1.2.3',
      '--registry-api-url=https://registry.example/v1',
    ]);

    expect(parsed.flags.has('strict')).toBe(true);
    expect(parsed.options).toEqual({
      'registry-api-url': 'https://registry.example/v1',
      version: '1.2.3',
    });
    expect(() => registry.parseArgs(['positional'])).toThrow('unsupported positional argument');
  });

  it('normalizes registry entries and selects the official latest version', () => {
    const entries = registry.normalizeRegistryEntries({
      servers: [
        {
          _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: false } },
          server: { name: 'pkg', version: '1.0.0' },
        },
        {
          _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true } },
          server: { name: 'pkg', version: '1.1.0' },
        },
      ],
    });

    expect(entries).toHaveLength(2);
    expect(registry.selectLatestEntry(entries).server.version).toBe('1.1.0');
    expect(registry.selectLatestEntry([{ server: { version: '1.0.0' }, meta: {} }]).server.version).toBe(
      '1.0.0',
    );
  });

  it('parses OCI image identifiers and authentication challenges', () => {
    expect(registry.parseOciIdentifier('docker.io/swimmwatch/cloakbrowser-mcp:1.6.1')).toEqual({
      registry: 'docker.io',
      repository: 'swimmwatch/cloakbrowser-mcp',
      tag: '1.6.1',
    });
    expect(() => registry.parseOciIdentifier('docker.io/no-tag')).toThrow('unsupported OCI image identifier');
    expect(registry.getOciRegistryApiHost('docker.io')).toBe('registry-1.docker.io');
    expect(registry.formatOciRegistryName('ghcr.io/swimmwatch/cloakbrowser-mcp:1.6.1')).toBe('GHCR');
    expect(
      registry.parseWwwAuthenticate('Bearer realm="https://auth.example/token",service="registry"'),
    ).toEqual({
      realm: 'https://auth.example/token',
      service: 'registry',
    });
    expect(
      registry.createBearerTokenUrl(
        'Bearer realm="https://auth.example/token",service="registry"',
        'repository:repo:pull',
      ),
    ).toBe('https://auth.example/token?service=registry&scope=repository%3Arepo%3Apull');
  });

  it('checks OCI manifests through bearer-token auth without live network', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        urls.push(url);
        const headers = init.headers;
        const hasAuthorization =
          typeof headers === 'object' && headers !== null && 'Authorization' in headers;
        if (url.includes('/manifests/1.6.1') && !hasAuthorization) {
          return new Response('', {
            headers: {
              'www-authenticate': 'Bearer realm="https://auth.example/token",service="registry.example"',
            },
            status: 401,
          });
        }
        if (url === 'https://auth.example/token?service=registry.example&scope=repository%3Arepo%3Apull') {
          return new Response(JSON.stringify({ token: 'secret' }), { status: 200 });
        }
        return new Response('', { status: 200 });
      }),
    );

    await expect(registry.checkOciManifest('registry.example/repo:1.6.1')).resolves.toEqual({
      ok: true,
      status: 200,
      url: 'https://registry.example/v2/repo/manifests/1.6.1',
    });
    expect(urls).toEqual([
      'https://registry.example/v2/repo/manifests/1.6.1',
      'https://auth.example/token?service=registry.example&scope=repository%3Arepo%3Apull',
      'https://registry.example/v2/repo/manifests/1.6.1',
    ]);
  });

  it('parses GitHub repository URLs and formats reports', () => {
    expect(registry.parseGitHubRepository('git+https://github.com/swimmwatch/cloakbrowser-mcp.git')).toEqual({
      owner: 'swimmwatch',
      repo: 'cloakbrowser-mcp',
    });
    expect(registry.parseGitHubRepository('https://example.com/repo')).toBeNull();

    const report = registry.createRegistryReport({
      localVersion: '1.6.1',
      packageName: 'cloakbrowser-mcp',
      registryApiUrl: 'https://registry.example',
      serverName: 'io.github.swimmwatch/cloakbrowser-mcp',
    });
    report.targetVersion = '1.6.1';
    report.oci.images.push({
      image: 'docker.io/swimmwatch/cloakbrowser-mcp:1.6.1',
      registry: 'Docker Hub',
      status: 'ok',
      url: 'https://registry-1.docker.io/v2/swimmwatch/cloakbrowser-mcp/manifests/1.6.1',
    });
    report.githubMcp.checkedUrls.push({ status: 404, url: 'https://github.com/mcp' });
    report.warnings.push('eventual consistency');
    report.errors.push('not listed');

    expect(registry.formatReport(report)).toContain(
      'MCP registry check for io.github.swimmwatch/cloakbrowser-mcp',
    );
    expect(registry.formatReport(report)).toContain('- Docker Hub: ok');
    expect(registry.formatReport(report)).toContain('Warnings:\n- eventual consistency');
    expect(registry.formatReport(report)).toContain('Errors:\n- not listed');
  });
});
