import { basename } from 'node:path';

export function toIsoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

export function normalizeJson(value) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

export function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }

  return value;
}

export function parseSchemaPayload({ text, contentType, sourceUrl }) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error(`Received an empty response from ${sourceUrl}.`);
  }

  if (isHtmlResponse(text, contentType)) {
    throw new Error(`Expected JSON from ${sourceUrl}, but received HTML content.`);
  }

  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Downloaded MCP schema from ${sourceUrl} is invalid JSON.`);
  }

  if (parsed === null || (typeof parsed !== 'object' && !Array.isArray(parsed))) {
    throw new Error(`Downloaded MCP schema from ${sourceUrl} must be a JSON object or array.`);
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

  throw new Error(`Failed to allocate a snapshot filename for ${baseName}.json`);
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
    changes.push(`added keys: ${added.slice(0, 6).join(', ')}${added.length > 6 ? ', ...' : ''}`);
  }
  if (removed.length > 0) {
    changes.push(`removed keys: ${removed.slice(0, 6).join(', ')}${removed.length > 6 ? ', ...' : ''}`);
  }

  return changes.join('; ');
}

function topLevelKeys(schema) {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    return new Set([`[${typeof schema}]`]);
  }

  return new Set(Object.keys(schema));
}

export function parseSnapshotDateFromFilename(filePath) {
  const filename = basename(filePath);
  const match = /^mcp-schema-(\d{4}-\d{2}-\d{2})(?:-\d+)?\.json$/.exec(filename);
  return match?.[1];
}
