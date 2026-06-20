#!/usr/bin/env node
import process from 'node:process';
import { URL } from 'node:url';
import { readJson } from '#scripts/lib/files';
import { compareVersions } from '#scripts/lib/semver';

const defaultRegistryApiUrl = 'https://registry.modelcontextprotocol.io/v0.1';
const officialMetaKey = 'io.modelcontextprotocol.registry/official';
const manifestAccept = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

const args = parseArgs(process.argv.slice(2));
const packageJson = readJson('package.json');
const serverJson = readJson('server.json');
const serverName = String(serverJson.name ?? packageJson.mcpName ?? '');
const localVersion = String(packageJson.version ?? serverJson.version ?? '');
const registryApiUrl = String(args.options['registry-api-url'] ?? defaultRegistryApiUrl).replace(/\/$/, '');
const strict = args.flags.has('strict');
const expectLocalVersion = strict || args.flags.has('expect-local-version');
const requireGitHubMcp = strict || args.flags.has('require-github-mcp');
const outputJson = args.flags.has('json');

if (!serverName) {
  throw new Error('server name is missing from server.json or package.json');
}

const report = {
  serverName,
  localVersion,
  targetVersion: null,
  officialRegistry: {
    status: 'unknown',
    url: `${registryApiUrl}/servers?search=${encodeURIComponent(serverName)}`,
    latestVersion: null,
    targetStatus: null,
    targetIsLatest: null,
    publishedAt: null,
  },
  npm: {
    status: 'unknown',
    package: String(packageJson.name ?? ''),
    version: null,
    url: null,
  },
  oci: {
    status: 'unknown',
    images: [],
  },
  githubMcp: {
    status: 'unknown',
    checkedUrls: [],
  },
  warnings: [],
  errors: [],
};

try {
  await run();
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
}

if (outputJson) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  printReport(report);
}

process.exitCode = report.errors.length > 0 ? 1 : 0;

async function run() {
  const registry = await fetchJson(report.officialRegistry.url);
  const entries = normalizeRegistryEntries(registry).filter((entry) => entry.server.name === serverName);

  if (entries.length === 0) {
    throw new Error(`${serverName} is not visible in the official MCP Registry`);
  }

  const latestEntry = selectLatestEntry(entries);
  report.officialRegistry.latestVersion = latestEntry.server.version;

  const targetVersion = String(
    args.options.version ?? (expectLocalVersion ? localVersion : latestEntry.server.version),
  );
  report.targetVersion = targetVersion;

  if (localVersion !== targetVersion) {
    report.warnings.push(
      `local package version is ${localVersion}, but registry check target is ${targetVersion}`,
    );
  }

  const targetEntry = entries.find((entry) => entry.server.version === targetVersion);

  if (!targetEntry) {
    throw new Error(`${serverName}@${targetVersion} is not visible in the official MCP Registry`);
  }

  const officialMeta = targetEntry.meta?.[officialMetaKey] ?? {};
  report.officialRegistry.status = officialMeta.status === 'active' ? 'ok' : 'failed';
  report.officialRegistry.targetStatus = officialMeta.status ?? null;
  report.officialRegistry.targetIsLatest = officialMeta.isLatest ?? null;
  report.officialRegistry.publishedAt = officialMeta.publishedAt ?? null;

  if (officialMeta.status !== 'active') {
    report.errors.push(
      `${serverName}@${targetVersion} registry status is ${officialMeta.status ?? 'unknown'}`,
    );
  }

  await checkNpmPackage(targetEntry.server, targetVersion);
  await checkOciPackages(targetEntry.server);
  await checkGitHubMcpListing(targetEntry.server);
}

async function checkNpmPackage(server, targetVersion) {
  const npmPackage = server.packages?.find((pkg) => pkg.registryType === 'npm');

  if (!npmPackage) {
    report.errors.push(`${server.name}@${targetVersion} has no npm package in server.json`);
    report.npm.status = 'missing';
    return;
  }

  const packageName = String(npmPackage.identifier);
  const packageVersion = String(npmPackage.version ?? targetVersion);
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(packageVersion)}`;
  const response = await fetchWithStatus(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  });

  report.npm.package = packageName;
  report.npm.version = packageVersion;
  report.npm.url = url;
  report.npm.status = response.ok ? 'ok' : 'failed';

  if (!response.ok) {
    report.errors.push(
      `npm package ${packageName}@${packageVersion} is not available: HTTP ${response.status}`,
    );
  }
}

async function checkOciPackages(server) {
  const ociPackages = server.packages?.filter((pkg) => pkg.registryType === 'oci') ?? [];

  if (ociPackages.length === 0) {
    report.errors.push(`${server.name}@${server.version} has no OCI package in server.json`);
    report.oci.status = 'missing';
    return;
  }

  for (const ociPackage of ociPackages) {
    const image = String(ociPackage.identifier);
    const result = await checkOciManifest(image);

    report.oci.images.push({
      image,
      registry: formatOciRegistryName(image),
      status: result.ok ? 'ok' : 'failed',
      url: result.url,
    });

    if (!result.ok) {
      report.errors.push(`OCI image ${image} is not available: HTTP ${result.status}`);
    }
  }

  report.oci.status = report.oci.images.every((image) => image.status === 'ok') ? 'ok' : 'failed';
}

async function checkGitHubMcpListing(server) {
  const repositoryUrl = server.repository?.url ?? packageJson.repository?.url ?? '';
  const repository = parseGitHubRepository(repositoryUrl);
  const checkedUrls = [];

  if (repository) {
    checkedUrls.push(`https://github.com/mcp/${repository.owner}/${repository.repo}`);
  }

  checkedUrls.push(
    `https://github.com/mcp?q=${encodeURIComponent('cloakbrowser')}`,
    `https://github.com/mcp?q=${encodeURIComponent(repository?.owner ?? 'swimmwatch')}`,
  );

  let sawNotFound = false;
  let sawUnknown = false;

  for (const url of checkedUrls) {
    try {
      const response = await fetchTextWithStatus(url);
      const text = response.text;
      const listed =
        response.ok &&
        (text.includes(serverName) ||
          text.includes(String(server.title ?? '')) ||
          (repository ? text.includes(`${repository.owner}/${repository.repo}`) : false));

      report.githubMcp.checkedUrls.push({
        url,
        status: response.status,
        matched: listed,
      });

      if (listed) {
        report.githubMcp.status = 'listed';
        return;
      }

      if (response.status === 404) {
        sawNotFound = true;
      } else if (!response.ok) {
        sawUnknown = true;
      }
    } catch (error) {
      sawUnknown = true;
      report.githubMcp.checkedUrls.push({
        url,
        status: null,
        matched: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  report.githubMcp.status = sawUnknown && !sawNotFound ? 'unknown' : 'not_listed_yet';

  if (report.githubMcp.status === 'unknown') {
    report.warnings.push('GitHub MCP Registry listing could not be determined');
  } else if (report.githubMcp.status === 'not_listed_yet') {
    report.warnings.push('GitHub MCP Registry listing is not visible yet; GitHub /mcp is curated separately');
  }

  if (requireGitHubMcp && report.githubMcp.status !== 'listed') {
    report.errors.push(`GitHub MCP Registry status is ${report.githubMcp.status}`);
  }
}

function normalizeRegistryEntries(registry) {
  return (registry.servers ?? []).map((entry) => ({
    server: entry.server ?? entry,
    meta: entry._meta ?? entry.server?._meta ?? {},
  }));
}

function selectLatestEntry(entries) {
  const officialLatest = entries.find((entry) => entry.meta?.[officialMetaKey]?.isLatest === true);

  if (officialLatest) {
    return officialLatest;
  }

  return [...entries].sort((left, right) => compareVersions(right.server.version, left.server.version))[0];
}

async function checkOciManifest(identifier) {
  const parsed = parseOciIdentifier(identifier);
  const registryApiHost = getOciRegistryApiHost(parsed.registry);
  const url = `https://${registryApiHost}/v2/${parsed.repository}/manifests/${encodeURIComponent(parsed.tag)}`;
  const firstResponse = await fetchWithStatus(url, {
    headers: {
      Accept: manifestAccept,
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  });

  if (firstResponse.status !== 401) {
    return {
      ok: firstResponse.ok,
      status: firstResponse.status,
      url,
    };
  }

  const authHeader = firstResponse.headers.get('www-authenticate');
  const tokenUrl = createBearerTokenUrl(authHeader, `repository:${parsed.repository}:pull`);

  if (!tokenUrl) {
    return {
      ok: false,
      status: firstResponse.status,
      url,
    };
  }

  const tokenResponse = await fetchJson(tokenUrl);
  const token = tokenResponse.token ?? tokenResponse.access_token;

  if (!token) {
    return {
      ok: false,
      status: firstResponse.status,
      url,
    };
  }

  const secondResponse = await fetchWithStatus(url, {
    headers: {
      Accept: manifestAccept,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  });

  return {
    ok: secondResponse.ok,
    status: secondResponse.status,
    url,
  };
}

function parseOciIdentifier(identifier) {
  const [registry, ...rest] = identifier.split('/');
  const image = rest.join('/');
  const tagSeparator = image.lastIndexOf(':');

  if (!registry || rest.length === 0 || tagSeparator === -1) {
    throw new Error(`unsupported OCI image identifier: ${identifier}`);
  }

  return {
    registry,
    repository: image.slice(0, tagSeparator),
    tag: image.slice(tagSeparator + 1),
  };
}

function getOciRegistryApiHost(registry) {
  return registry === 'docker.io' ? 'registry-1.docker.io' : registry;
}

function formatOciRegistryName(identifier) {
  const parsed = parseOciIdentifier(identifier);

  if (parsed.registry === 'ghcr.io') {
    return 'GHCR';
  }

  if (parsed.registry === 'docker.io') {
    return 'Docker Hub';
  }

  return parsed.registry;
}

function createBearerTokenUrl(authHeader, fallbackScope) {
  const params = parseWwwAuthenticate(authHeader);
  const realm = params.realm;

  if (!realm) {
    return null;
  }

  const url = new URL(realm);

  if (params.service) {
    url.searchParams.set('service', params.service);
  }

  url.searchParams.set('scope', params.scope ?? fallbackScope);
  return url.toString();
}

function parseWwwAuthenticate(header) {
  const result = {};
  const rawParams = header?.replace(/^Bearer\s+/i, '') ?? '';

  for (const match of rawParams.matchAll(/([a-zA-Z_]+)="([^"]*)"/g)) {
    result[match[1]] = match[2];
  }

  return result;
}

function parseGitHubRepository(url) {
  const match = /github\.com[:/](?<owner>[^/\s]+)\/(?<repo>[^/\s.]+)(?:\.git)?/.exec(String(url));

  return match?.groups ?? null;
}

async function fetchJson(url) {
  const response = await fetchWithStatus(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchTextWithStatus(url) {
  const response = await fetchWithStatus(url, {
    headers: {
      Accept: 'text/html, text/plain, */*',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}

async function fetchWithStatus(url, options = {}) {
  return fetch(url, {
    redirect: 'follow',
    ...options,
  });
}

function parseArgs(argv) {
  const flags = new Set();
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith('--')) {
      throw new Error(`unsupported positional argument: ${value}`);
    }

    const [rawName, inlineValue] = value.slice(2).split('=', 2);

    if (inlineValue !== undefined) {
      options[rawName] = inlineValue;
      continue;
    }

    const nextValue = argv[index + 1];

    if (nextValue && !nextValue.startsWith('--') && ['version', 'registry-api-url'].includes(rawName)) {
      options[rawName] = nextValue;
      index += 1;
      continue;
    }

    flags.add(rawName);
  }

  return { flags, options };
}

function printReport(value) {
  const lines = [
    `MCP registry check for ${value.serverName}`,
    `Target version: ${value.targetVersion ?? 'unknown'} (local: ${value.localVersion})`,
    `Official MCP Registry: ${value.officialRegistry.status} (${value.officialRegistry.url})`,
    `npm package: ${value.npm.status} ${value.npm.package}@${value.npm.version ?? 'unknown'}`,
    `OCI images: ${value.oci.status}`,
    `GitHub MCP Registry: ${value.githubMcp.status}`,
  ];

  if (value.oci.images.length > 0) {
    lines.push('OCI image URLs checked:');

    for (const image of value.oci.images) {
      lines.push(`- ${image.registry}: ${image.status} ${image.image} (${image.url})`);
    }
  }

  if (value.githubMcp.checkedUrls.length > 0) {
    lines.push('GitHub MCP URLs checked:');

    for (const checkedUrl of value.githubMcp.checkedUrls) {
      lines.push(`- ${checkedUrl.status ?? 'error'} ${checkedUrl.url}`);
    }
  }

  if (value.warnings.length > 0) {
    lines.push('Warnings:');
    lines.push(...value.warnings.map((warning) => `- ${warning}`));
  }

  if (value.errors.length > 0) {
    lines.push('Errors:');
    lines.push(...value.errors.map((error) => `- ${error}`));
  }

  process.stdout.write(`${lines.join('\n')}\n`);
}
