import { afterEach, describe, expect, it, vi } from 'vitest';
interface McpRegistryModule {
  checkOciManifest(identifier: string): Promise<{
    ok: boolean;
    status: number;
    url: string;
  }>;
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
  parseArgs(argv: string[]): {
    flags: Set<string>;
    options: Record<string, string>;
  };
  parseGitHubRepository(url: string): {
    owner: string;
    repo: string;
  } | null;
  parseOciIdentifier(identifier: string): {
    registry: string;
    repository: string;
    tag: string;
  };
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
    images: Array<{
      registry: string;
      status: string;
      image: string;
      url: string;
    }>;
  };
  githubMcp: {
    status: string;
    checkedUrls: Array<{
      status: number | null;
      url: string;
    }>;
  };
  warnings: string[];
  errors: string[];
}
const argumentValue = new URL('../../scripts/lib/mcp-registry.mjs', import.meta.url).href;
const registry = (await import(argumentValue)) as unknown as McpRegistryModule;
afterEach(() => {
  vi.unstubAllGlobals();
});
describe('MCP registry helpers', () => {
  it('parses CLI flags and options', () => {
    const values: string[] = [
      '--strict',
      '--version',
      '1.2.3',
      '--registry-api-url=https://registry.example/v1',
    ];
    const parsed = registry.parseArgs(values);
    const hasResult = parsed.flags.has('strict');
    expect(hasResult).toBe(true);
    const receiverActual = parsed.options;
    const toEqualOptions = {
      'registry-api-url': 'https://registry.example/v1',
      version: '1.2.3',
    } as const;
    expect(receiverActual).toEqual(toEqualOptions);
    expect(() => {
      const values2: string[] = ['positional'];
      return registry.parseArgs(values2);
    }).toThrow('unsupported positional argument');
  });
  it('normalizes registry entries and selects the official latest version', () => {
    const normalizeRegistryEntriesOptions = {
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
    };
    const entries = registry.normalizeRegistryEntries(normalizeRegistryEntriesOptions);
    expect(entries).toHaveLength(2);
    const argumentValue2 = registry.selectLatestEntry(entries).server.version;
    expect(argumentValue2).toBe('1.1.0');
    const values3: RegistryEntry[] = [{ server: { version: '1.0.0' }, meta: {} }];
    const argumentValue3 = registry.selectLatestEntry(values3).server.version;
    expect(argumentValue3).toBe('1.0.0');
  });
  it('parses OCI image identifiers and authentication challenges', () => {
    const parseOciIdentifierResult = registry.parseOciIdentifier(
      'docker.io/swimmwatch/cloakbrowser-mcp:1.6.1',
    );
    const receiver2Actual = parseOciIdentifierResult;
    const toEqualOptions2 = {
      registry: 'docker.io',
      repository: 'swimmwatch/cloakbrowser-mcp',
      tag: '1.6.1',
    } as const;
    expect(receiver2Actual).toEqual(toEqualOptions2);
    expect(() => registry.parseOciIdentifier('docker.io/no-tag')).toThrow('unsupported OCI image identifier');
    const ociRegistryApiHostResult = registry.getOciRegistryApiHost('docker.io');
    expect(ociRegistryApiHostResult).toBe('registry-1.docker.io');
    const formatOciRegistryNameResult = registry.formatOciRegistryName(
      'ghcr.io/swimmwatch/cloakbrowser-mcp:1.6.1',
    );
    expect(formatOciRegistryNameResult).toBe('GHCR');
    const parseWwwAuthenticateResult = registry.parseWwwAuthenticate(
      'Bearer realm="https://auth.example/token",service="registry"',
    );
    const receiver3Actual = parseWwwAuthenticateResult;
    const toEqualOptions3 = {
      realm: 'https://auth.example/token',
      service: 'registry',
    } as const;
    expect(receiver3Actual).toEqual(toEqualOptions3);
    const bearerTokenUrlResult = registry.createBearerTokenUrl(
      'Bearer realm="https://auth.example/token",service="registry"',
      'repository:repo:pull',
    );
    expect(bearerTokenUrlResult).toBe(
      'https://auth.example/token?service=registry&scope=repository%3Arepo%3Apull',
    );
  });
  it('checks OCI manifests through bearer-token auth without live network', async () => {
    const urls: string[] = [];
    const fnResult = vi.fn(async (url: string, init: RequestInit) => {
      urls.push(url);
      const headers = init.headers;
      const hasAuthorization = typeof headers === 'object' && headers !== null && 'Authorization' in headers;
      if (url.includes('/manifests/1.6.1') && !hasAuthorization) {
        const responseOptions = {
          headers: {
            'www-authenticate': 'Bearer realm="https://auth.example/token",service="registry.example"',
          },
          status: 401,
        } as const;
        return new Response('', responseOptions);
      }
      if (url === 'https://auth.example/token?service=registry.example&scope=repository%3Arepo%3Apull') {
        const stringifyOptions = { token: 'secret' } as const;
        const serializedValue = JSON.stringify(stringifyOptions);
        const responseOptions2 = { status: 200 } as const;
        return new Response(serializedValue, responseOptions2);
      }
      const responseOptions3 = { status: 200 } as const;
      return new Response('', responseOptions3);
    });
    vi.stubGlobal('fetch', fnResult);
    const checkOciManifestResult = registry.checkOciManifest('registry.example/repo:1.6.1');
    const receiver4Actual = checkOciManifestResult;
    const toEqualOptions4 = {
      ok: true,
      status: 200,
      url: 'https://registry.example/v2/repo/manifests/1.6.1',
    } as const;
    await expect(receiver4Actual).resolves.toEqual(toEqualOptions4);
    const receiver5Actual = urls;
    const values4: string[] = [
      'https://registry.example/v2/repo/manifests/1.6.1',
      'https://auth.example/token?service=registry.example&scope=repository%3Arepo%3Apull',
      'https://registry.example/v2/repo/manifests/1.6.1',
    ];
    expect(receiver5Actual).toEqual(values4);
  });
  it('parses GitHub repository URLs and formats reports', () => {
    const parseGitHubRepositoryResult = registry.parseGitHubRepository(
      'git+https://github.com/swimmwatch/cloakbrowser-mcp.git',
    );
    const receiver6Actual = parseGitHubRepositoryResult;
    const toEqualOptions5 = {
      owner: 'swimmwatch',
      repo: 'cloakbrowser-mcp',
    } as const;
    expect(receiver6Actual).toEqual(toEqualOptions5);
    const parseGitHubRepositoryResult2 = registry.parseGitHubRepository('https://example.com/repo');
    expect(parseGitHubRepositoryResult2).toBeNull();
    const createRegistryReportOptions = {
      localVersion: '1.6.1',
      packageName: 'cloakbrowser-mcp',
      registryApiUrl: 'https://registry.example',
      serverName: 'io.github.swimmwatch/cloakbrowser-mcp',
    } as const;
    const report = registry.createRegistryReport(createRegistryReportOptions);
    report.targetVersion = '1.6.1';
    const pushOptions = {
      image: 'docker.io/swimmwatch/cloakbrowser-mcp:1.6.1',
      registry: 'Docker Hub',
      status: 'ok',
      url: 'https://registry-1.docker.io/v2/swimmwatch/cloakbrowser-mcp/manifests/1.6.1',
    } as const;
    report.oci.images.push(pushOptions);
    const pushOptions2 = { status: 404, url: 'https://github.com/mcp' } as const;
    report.githubMcp.checkedUrls.push(pushOptions2);
    report.warnings.push('eventual consistency');
    report.errors.push('not listed');
    const formatReportResult = registry.formatReport(report);
    expect(formatReportResult).toContain('MCP registry check for io.github.swimmwatch/cloakbrowser-mcp');
    const formatReportResult2 = registry.formatReport(report);
    expect(formatReportResult2).toContain('- Docker Hub: ok');
    const formatReportResult3 = registry.formatReport(report);
    expect(formatReportResult3).toContain('Warnings:\n- eventual consistency');
    const formatReportResult4 = registry.formatReport(report);
    expect(formatReportResult4).toContain('Errors:\n- not listed');
  });
});
