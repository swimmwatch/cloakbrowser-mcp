import { basename } from 'node:path';
export const defaultSchemaBaseUrl = 'https://static.modelcontextprotocol.io/schemas';
export const defaultSchemaCatalogUrl =
  'https://api.github.com/repos/modelcontextprotocol/static/contents/schemas?ref=main';
const schemaVersionPattern = /^\d{4}-\d{2}-\d{2}$/;
export function toIsoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}
export function normalizeJson(value) {
  const sortJsonResult = sortJson(value);
  const templateValue = JSON.stringify(sortJsonResult, null, 2);
  return `${templateValue}\n`;
}
export function normalizeSchemaForComparison(value) {
  const stripTopLevelCommentResult = stripTopLevelComment(value);
  return normalizeJson(stripTopLevelCommentResult);
}
export function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }
  if (value !== null && typeof value === 'object') {
    const mappedValues = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJson(child)]);
    return Object.fromEntries(mappedValues);
  }
  return value;
}
function stripTopLevelComment(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }
  const comparable = { ...value };
  delete comparable.$comment;
  return comparable;
}
export async function resolveSchemaSourceUrl({
  catalogUrl = defaultSchemaCatalogUrl,
  explicitUrl,
  fetchImpl = fetch,
  schemaBaseUrl = defaultSchemaBaseUrl,
} = {}) {
  const trimmedExplicitUrl = explicitUrl?.trim();
  if (trimmedExplicitUrl) {
    return trimmedExplicitUrl;
  }
  const fetchSchemaCatalogOptions = { catalogUrl, fetchImpl };
  const catalog = await fetchSchemaCatalog(fetchSchemaCatalogOptions);
  const version = selectLatestSchemaVersion(catalog);
  const createSchemaSourceUrlOptions = { schemaBaseUrl, version };
  return createSchemaSourceUrl(createSchemaSourceUrlOptions);
}
export async function fetchSchemaCatalog({ catalogUrl = defaultSchemaCatalogUrl, fetchImpl = fetch } = {}) {
  const fetchImplOptions = {
    headers: {
      Accept: 'application/vnd.github+json, application/json',
      'User-Agent': 'cloakbrowser-mcp-schema-monitor',
    },
  };
  const response = await fetchImpl(catalogUrl, fetchImplOptions);
  if (!response.ok) {
    const message = `Failed to discover MCP schema versions from ${catalogUrl}: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const message2 = `MCP schema catalog from ${catalogUrl} is invalid JSON.`;
    throw new Error(message2);
  }
  if (!Array.isArray(parsed)) {
    const message3 = `MCP schema catalog from ${catalogUrl} must be a JSON array.`;
    throw new Error(message3);
  }
  return parsed;
}
export function selectLatestSchemaVersion(entries) {
  const versions = entries
    .filter(isSchemaVersionDirectoryEntry)
    .map((entry) => entry.name)
    .sort();
  const latest = versions[versions.length - 1];
  if (!latest) {
    throw new Error('MCP schema catalog does not contain any dated schema directories.');
  }
  return latest;
}
export function createSchemaSourceUrl({ schemaBaseUrl = defaultSchemaBaseUrl, version }) {
  return `${schemaBaseUrl.replace(/\/$/, '')}/${version}/server.schema.json`;
}
function isSchemaVersionDirectoryEntry(entry) {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    entry.type === 'dir' &&
    typeof entry.name === 'string' &&
    schemaVersionPattern.test(entry.name)
  );
}
export function parseSchemaPayload({ text, contentType, sourceUrl }) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    const message4 = `Received an empty response from ${sourceUrl}.`;
    throw new Error(message4);
  }
  if (isHtmlResponse(text, contentType)) {
    const message5 = `Expected JSON from ${sourceUrl}, but received HTML content.`;
    throw new Error(message5);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const message6 = `Downloaded MCP schema from ${sourceUrl} is invalid JSON.`;
    throw new Error(message6);
  }
  if (parsed === null || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    const message7 = `Downloaded MCP schema from ${sourceUrl} must be a JSON object or array.`;
    throw new Error(message7);
  }
  return parsed;
}
export function isHtmlResponse(text, contentType) {
  const normalizedType = contentType?.toLowerCase() ?? '';
  if (normalizedType.includes('text/html') || normalizedType.includes('application/xhtml+xml')) {
    return true;
  }
  return /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(text);
}
export function pickSnapshotFilename({ date, existingFilenames }) {
  const baseName = `mcp-schema-${date}`;
  for (let index = 0; index < Number.MAX_SAFE_INTEGER; index += 1) {
    const suffix = index === 0 ? '' : `-${index + 1}`;
    const candidate = `${baseName}${suffix}.json`;
    if (!existingFilenames.has(candidate)) {
      return candidate;
    }
  }
  const message8 = `Failed to allocate a snapshot filename for ${baseName}.json`;
  throw new Error(message8);
}
export function describeTopLevelDiff(previousSchema, nextSchema) {
  if (previousSchema === undefined) {
    return 'Initial schema snapshot added.';
  }
  const previousKeys = topLevelKeys(previousSchema);
  const nextKeys = topLevelKeys(nextSchema);
  const added = [...nextKeys].filter((key) => !previousKeys.has(key));
  const removed = [...previousKeys].filter((key) => !nextKeys.has(key));
  if (added.length === 0 && removed.length === 0) {
    return 'Top-level keys unchanged; differences were found in nested values.';
  }
  const changes = [];
  if (added.length > 0) {
    const message9 = `added keys: ${added.slice(0, 6).join(', ')}${added.length > 6 ? ', ...' : ''}`;
    changes.push(message9);
  }
  if (removed.length > 0) {
    const message10 = `removed keys: ${removed.slice(0, 6).join(', ')}${removed.length > 6 ? ', ...' : ''}`;
    changes.push(message10);
  }
  return changes.join('; ');
}
function topLevelKeys(schema) {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    const values = [`[${typeof schema}]`];
    return new Set(values);
  }
  const keysResult = Object.keys(schema);
  return new Set(keysResult);
}
export function parseSnapshotDateFromFilename(filePath) {
  const filename = basename(filePath);
  const match = /^mcp-schema-(\d{4}-\d{2}-\d{2})(?:-\d+)?\.json$/.exec(filename);
  return match?.[1];
}
