import { URL } from 'node:url';
import { compareVersions } from '#scripts/lib/semver';
export const defaultRegistryApiUrl = 'https://registry.modelcontextprotocol.io/v0.1';
export const officialMetaKey = 'io.modelcontextprotocol.registry/official';
export const manifestAccept = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');
/**
 * Checks the official MCP Registry, npm package, OCI images, and GitHub MCP listing for local metadata.
 */
export async function checkMcpRegistry({ args, packageJson, serverJson }) {
  const computedValue = serverJson.name ?? packageJson.mcpName ?? '';
  const serverName = String(computedValue);
  const computedValue2 = packageJson.version ?? serverJson.version ?? '';
  const localVersion = String(computedValue2);
  const computedValue3 = args.options['registry-api-url'] ?? defaultRegistryApiUrl;
  const registryApiUrl = String(computedValue3).replace(/\/$/, '');
  const strict = args.flags.has('strict');
  const expectLocalVersion = strict || args.flags.has('expect-local-version');
  const requireGitHubMcp = strict || args.flags.has('require-github-mcp');
  if (!serverName) {
    throw new Error('server name is missing from server.json or package.json');
  }
  const currentLocalVersion = localVersion;
  const computedValue4 = packageJson.name ?? '';
  const stringResult = String(computedValue4);
  const currentRegistryApiUrl = registryApiUrl;
  const currentServerName = serverName;
  const createRegistryReportOptions = {
    localVersion: currentLocalVersion,
    packageName: stringResult,
    registryApiUrl: currentRegistryApiUrl,
    serverName: currentServerName,
  };
  const report = createRegistryReport(createRegistryReportOptions);
  try {
    const runRegistryChecksOptions = {
      args,
      expectLocalVersion,
      localVersion,
      packageJson,
      report,
      requireGitHubMcp,
      serverName,
    };
    await runRegistryChecks(runRegistryChecksOptions);
  } catch (error) {
    const argumentValue = error instanceof Error ? error.message : String(error);
    report.errors.push(argumentValue);
  }
  return report;
}
export function createRegistryReport({ serverName, localVersion, registryApiUrl, packageName }) {
  return {
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
      package: packageName,
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
}
async function runRegistryChecks({
  args,
  expectLocalVersion,
  localVersion,
  packageJson,
  report,
  requireGitHubMcp,
  serverName,
}) {
  const registry = await fetchRegistryJson(report.officialRegistry.url);
  const entries = normalizeRegistryEntries(registry).filter((entry) => entry.server.name === serverName);
  if (entries.length === 0) {
    const message2 = `${serverName} is not visible in the official MCP Registry`;
    throw new Error(message2);
  }
  const latestEntry = selectLatestEntry(entries);
  report.officialRegistry.latestVersion = latestEntry.server.version;
  const computedValue5 =
    args.options.version ?? (expectLocalVersion ? localVersion : latestEntry.server.version);
  const targetVersion = String(computedValue5);
  report.targetVersion = targetVersion;
  if (localVersion !== targetVersion) {
    const message3 = `local package version is ${localVersion}, but registry check target is ${targetVersion}`;
    report.warnings.push(message3);
  }
  const targetEntry = entries.find((entry) => entry.server.version === targetVersion);
  if (!targetEntry) {
    const message4 = `${serverName}@${targetVersion} is not visible in the official MCP Registry`;
    throw new Error(message4);
  }
  const officialMeta = targetEntry.meta?.[officialMetaKey] ?? {};
  report.officialRegistry.status = officialMeta.status === 'active' ? 'ok' : 'failed';
  report.officialRegistry.targetStatus = officialMeta.status ?? null;
  report.officialRegistry.targetIsLatest = officialMeta.isLatest ?? null;
  report.officialRegistry.publishedAt = officialMeta.publishedAt ?? null;
  if (officialMeta.status !== 'active') {
    const message5 = `${serverName}@${targetVersion} registry status is ${officialMeta.status ?? 'unknown'}`;
    report.errors.push(message5);
  }
  await checkNpmPackage(targetEntry.server, targetVersion, report);
  await checkOciPackages(targetEntry.server, report);
  const checkGitHubMcpListingOptions = {
    packageJson,
    report,
    requireGitHubMcp,
    serverName,
  };
  await checkGitHubMcpListing(targetEntry.server, checkGitHubMcpListingOptions);
}
export async function checkNpmPackage(server, targetVersion, report) {
  const npmPackage = server.packages?.find((pkg) => pkg.registryType === 'npm');
  if (!npmPackage) {
    const message6 = `${server.name}@${targetVersion} has no npm package in server.json`;
    report.errors.push(message6);
    report.npm.status = 'missing';
    return;
  }
  const packageName = String(npmPackage.identifier);
  const computedValue6 = npmPackage.version ?? targetVersion;
  const packageVersion = String(computedValue6);
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/${encodeURIComponent(packageVersion)}`;
  const fetchRegistryWithStatusOptions = {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  };
  const response = await fetchRegistryWithStatus(url, fetchRegistryWithStatusOptions);
  report.npm.package = packageName;
  report.npm.version = packageVersion;
  report.npm.url = url;
  report.npm.status = response.ok ? 'ok' : 'failed';
  if (!response.ok) {
    const message7 = `npm package ${packageName}@${packageVersion} is not available: HTTP ${response.status}`;
    report.errors.push(message7);
  }
}
export async function checkOciPackages(server, report) {
  const ociPackages = server.packages?.filter((pkg) => pkg.registryType === 'oci') ?? [];
  if (ociPackages.length === 0) {
    const message8 = `${server.name}@${server.version} has no OCI package in server.json`;
    report.errors.push(message8);
    report.oci.status = 'missing';
    return;
  }
  for (const ociPackage of ociPackages) {
    const image = String(ociPackage.identifier);
    const result = await checkOciManifest(image);
    const pushOptions = {
      image,
      registry: formatOciRegistryName(image),
      status: result.ok ? 'ok' : 'failed',
      url: result.url,
    };
    report.oci.images.push(pushOptions);
    if (!result.ok) {
      const message9 = `OCI image ${image} is not available: HTTP ${result.status}`;
      report.errors.push(message9);
    }
  }
  report.oci.status = report.oci.images.every((image) => image.status === 'ok') ? 'ok' : 'failed';
}
/**
 * Checks whether the server is visible in GitHub's curated MCP listing or search pages.
 */
export async function checkGitHubMcpListing(server, { packageJson, report, requireGitHubMcp, serverName }) {
  const repositoryUrl = server.repository?.url ?? packageJson.repository?.url ?? '';
  const repository = parseGitHubRepository(repositoryUrl);
  const state = { sawNotFound: false, sawUnknown: false };
  for (const url of createGitHubMcpUrls(repository)) {
    const checkGitHubMcpUrlOptions = { repository, server, serverName };
    const checkedUrl = await checkGitHubMcpUrl(url, checkGitHubMcpUrlOptions);
    report.githubMcp.checkedUrls.push(checkedUrl);
    if (checkedUrl.matched) {
      report.githubMcp.status = 'listed';
      return;
    }
    updateGitHubMcpState(state, checkedUrl);
  }
  report.githubMcp.status = state.sawUnknown && !state.sawNotFound ? 'unknown' : 'not_listed_yet';
  appendGitHubMcpOutcome(report, requireGitHubMcp);
}
function createGitHubMcpUrls(repository) {
  const urls = [];
  if (repository) {
    const message10 = `https://github.com/mcp/${repository.owner}/${repository.repo}`;
    urls.push(message10);
  }
  const message11 = `https://github.com/mcp?q=${encodeURIComponent('cloakbrowser')}`;
  const computedValue7 = repository?.owner ?? 'swimmwatch';
  const templateValue = encodeURIComponent(computedValue7);
  const message12 = `https://github.com/mcp?q=${templateValue}`;
  urls.push(message11, message12);
  return urls;
}
async function checkGitHubMcpUrl(url, { repository, server, serverName }) {
  try {
    const response = await fetchRegistryTextWithStatus(url);
    const currentUrl = url;
    const propertyValue = response.status;
    const isGitHubMcpMatchOptions = { repository, server, serverName };
    const isGitHubMcpMatchResult = isGitHubMcpMatch(response, isGitHubMcpMatchOptions);
    return {
      url: currentUrl,
      status: propertyValue,
      matched: isGitHubMcpMatchResult,
    };
  } catch (error) {
    return {
      url,
      status: null,
      matched: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
function isGitHubMcpMatch(response, { repository, server, serverName }) {
  if (!response.ok) return false;
  return (
    response.text.includes(serverName) ||
    (() => {
      const computedValue8 = server.title ?? '';
      const stringResult2 = String(computedValue8);
      return response.text.includes(stringResult2);
    })() ||
    (repository
      ? (() => {
          const message13 = `${repository.owner}/${repository.repo}`;
          return response.text.includes(message13);
        })()
      : false)
  );
}
function updateGitHubMcpState(state, checkedUrl) {
  if (checkedUrl.status === 404) {
    state.sawNotFound = true;
  } else if (checkedUrl.status === null || checkedUrl.status >= 400) {
    state.sawUnknown = true;
  }
}
function appendGitHubMcpOutcome(report, requireGitHubMcp) {
  if (report.githubMcp.status === 'unknown') {
    report.warnings.push('GitHub MCP Registry listing could not be determined');
  } else if (report.githubMcp.status === 'not_listed_yet') {
    report.warnings.push('GitHub MCP Registry listing is not visible yet; GitHub /mcp is curated separately');
  }
  if (requireGitHubMcp && report.githubMcp.status !== 'listed') {
    const message14 = `GitHub MCP Registry status is ${report.githubMcp.status}`;
    report.errors.push(message14);
  }
}
export function normalizeRegistryEntries(registry) {
  return (registry.servers ?? []).map((entry) => ({
    server: entry.server ?? entry,
    meta: entry._meta ?? entry.server?._meta ?? {},
  }));
}
export function selectLatestEntry(entries) {
  const officialLatest = entries.find((entry) => entry.meta?.[officialMetaKey]?.isLatest === true);
  if (officialLatest) {
    return officialLatest;
  }
  return [...entries].sort((left, right) => compareVersions(right.server.version, left.server.version))[0];
}
/**
 * Checks an OCI manifest endpoint, including the bearer-token challenge used by Docker registries.
 */
export async function checkOciManifest(identifier) {
  const parsed = parseOciIdentifier(identifier);
  const registryApiHost = getOciRegistryApiHost(parsed.registry);
  const url = `https://${registryApiHost}/v2/${parsed.repository}/manifests/${encodeURIComponent(parsed.tag)}`;
  const fetchRegistryWithStatusOptions2 = {
    headers: {
      Accept: manifestAccept,
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  };
  const firstResponse = await fetchRegistryWithStatus(url, fetchRegistryWithStatusOptions2);
  if (firstResponse.status !== 401) {
    return {
      ok: firstResponse.ok,
      status: firstResponse.status,
      url,
    };
  }
  const authHeader = firstResponse.headers.get('www-authenticate');
  const message15 = `repository:${parsed.repository}:pull`;
  const tokenUrl = createBearerTokenUrl(authHeader, message15);
  if (!tokenUrl) {
    return {
      ok: false,
      status: firstResponse.status,
      url,
    };
  }
  const tokenResponse = await fetchRegistryJson(tokenUrl);
  const token = tokenResponse.token ?? tokenResponse.access_token;
  if (!token) {
    return {
      ok: false,
      status: firstResponse.status,
      url,
    };
  }
  const fetchRegistryWithStatusOptions3 = {
    headers: {
      Accept: manifestAccept,
      Authorization: `Bearer ${token}`,
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  };
  const secondResponse = await fetchRegistryWithStatus(url, fetchRegistryWithStatusOptions3);
  return {
    ok: secondResponse.ok,
    status: secondResponse.status,
    url,
  };
}
export function parseOciIdentifier(identifier) {
  const [registry, ...rest] = identifier.split('/');
  const image = rest.join('/');
  const tagSeparator = image.lastIndexOf(':');
  if (!registry || rest.length === 0 || tagSeparator === -1) {
    const message16 = `unsupported OCI image identifier: ${identifier}`;
    throw new Error(message16);
  }
  const currentRegistry = registry;
  const sliceResult = image.slice(0, tagSeparator);
  const computedValue9 = tagSeparator + 1;
  const sliceResult2 = image.slice(computedValue9);
  return {
    registry: currentRegistry,
    repository: sliceResult,
    tag: sliceResult2,
  };
}
export function getOciRegistryApiHost(registry) {
  return registry === 'docker.io' ? 'registry-1.docker.io' : registry;
}
export function formatOciRegistryName(identifier) {
  const parsed = parseOciIdentifier(identifier);
  if (parsed.registry === 'ghcr.io') {
    return 'GHCR';
  }
  if (parsed.registry === 'docker.io') {
    return 'Docker Hub';
  }
  return parsed.registry;
}
export function createBearerTokenUrl(authHeader, fallbackScope) {
  const params = parseWwwAuthenticate(authHeader);
  const realm = params.realm;
  if (!realm) {
    return null;
  }
  const url = new URL(realm);
  if (params.service) {
    url.searchParams.set('service', params.service);
  }
  const computedValue10 = params.scope ?? fallbackScope;
  url.searchParams.set('scope', computedValue10);
  return url.toString();
}
export function parseWwwAuthenticate(header) {
  const result = {};
  const rawParams = header?.replace(/^Bearer\s+/i, '') ?? '';
  for (const match of rawParams.matchAll(/([a-zA-Z_]+)="([^"]*)"/g)) {
    result[match[1]] = match[2];
  }
  return result;
}
export function parseGitHubRepository(url) {
  const stringResult3 = String(url);
  const match = /github\.com[:/](?<owner>[^/\s]+)\/(?<repo>[^/\s.]+)(?:\.git)?/.exec(stringResult3);
  return match?.groups ?? null;
}
export async function fetchRegistryJson(url) {
  const fetchRegistryWithStatusOptions4 = {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  };
  const response = await fetchRegistryWithStatus(url, fetchRegistryWithStatusOptions4);
  if (!response.ok) {
    const message17 = `Failed to fetch ${url}: HTTP ${response.status}`;
    throw new Error(message17);
  }
  return response.json();
}
export async function fetchRegistryTextWithStatus(url) {
  const fetchRegistryWithStatusOptions5 = {
    headers: {
      Accept: 'text/html, text/plain, */*',
      'User-Agent': 'cloakbrowser-mcp-registry-check',
    },
  };
  const response = await fetchRegistryWithStatus(url, fetchRegistryWithStatusOptions5);
  return {
    ok: response.ok,
    status: response.status,
    text: await response.text(),
  };
}
export async function fetchRegistryWithStatus(url, options = {}) {
  const fetchOptions = {
    redirect: 'follow',
    ...options,
  };
  return fetch(url, fetchOptions);
}
export function parseArgs(argv) {
  const flags = new Set();
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      const message18 = `unsupported positional argument: ${value}`;
      throw new Error(message18);
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
/**
 * Formats registry check results for the human-readable CLI output.
 */
export function formatReport(value) {
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
      const message19 = `- ${image.registry}: ${image.status} ${image.image} (${image.url})`;
      lines.push(message19);
    }
  }
  if (value.githubMcp.checkedUrls.length > 0) {
    lines.push('GitHub MCP URLs checked:');
    for (const checkedUrl of value.githubMcp.checkedUrls) {
      const message20 = `- ${checkedUrl.status ?? 'error'} ${checkedUrl.url}`;
      lines.push(message20);
    }
  }
  if (value.warnings.length > 0) {
    lines.push('Warnings:');
    const spreadValues = [...value.warnings.map((warning) => `- ${warning}`)];
    lines.push(...spreadValues);
  }
  if (value.errors.length > 0) {
    lines.push('Errors:');
    const spreadValues2 = [...value.errors.map((error) => `- ${error}`)];
    lines.push(...spreadValues2);
  }
  return `${lines.join('\n')}\n`;
}
