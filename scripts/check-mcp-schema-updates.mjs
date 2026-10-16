#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { appendGithubOutput } from '#scripts/lib/github-output';
import {
  describeTopLevelDiff,
  normalizeJson,
  normalizeSchemaForComparison,
  parseSchemaPayload,
  pickSnapshotFilename,
  resolveSchemaSourceUrl,
  toIsoDate,
} from '#scripts/lib/mcp-schema-monitor';
const resolveSchemaSourceUrlOptions = {
  catalogUrl: process.env.MCP_SCHEMA_CATALOG_URL,
  explicitUrl: process.env.MCP_SCHEMA_SOURCE_URL,
};
const schemaSourceUrl = await resolveSchemaSourceUrl(resolveSchemaSourceUrlOptions);
const schemaDir = process.env.MCP_SCHEMA_DIR ?? 'schemas/mcp';
const checkedAt = process.env.MCP_SCHEMA_CHECKED_AT ?? toIsoDate();
const writeSnapshots = readBooleanEnv('MCP_SCHEMA_WRITE_SNAPSHOTS', true);
const latestSchemaPath = join(schemaDir, 'latest.json');
const downloadedSchema = await downloadSchema(schemaSourceUrl);
const normalizedDownloaded = normalizeJson(downloadedSchema);
const comparableDownloaded = normalizeSchemaForComparison(downloadedSchema);
const previous = await readPreviousSchema(latestSchemaPath);
if (previous?.comparable === comparableDownloaded) {
  const appendGithubOutputOptions = {
    changed: 'false',
    schema_source_url: schemaSourceUrl,
    checked_at: checkedAt,
    latest_schema_path: latestSchemaPath,
    diff_summary: 'No changes detected in normalized schema content.',
    snapshots_written: 'false',
  };
  await appendGithubOutput(appendGithubOutputOptions);
  const stringifyOptions = {
    changed: false,
    schemaSourceUrl,
    checkedAt,
    latestSchemaPath,
    snapshotsWritten: false,
  };
  const templateValue = JSON.stringify(stringifyOptions, null, 2);
  const message = `${templateValue}\n`;
  process.stdout.write(message);
  process.exit(0);
}
let snapshotPath = '';
if (writeSnapshots) {
  const mkdirOptions = { recursive: true };
  await mkdir(schemaDir, mkdirOptions);
  const snapshotFilename = await allocateSnapshotFilename(schemaDir, checkedAt, comparableDownloaded);
  snapshotPath = join(schemaDir, snapshotFilename);
  await writeFile(snapshotPath, normalizedDownloaded);
  await writeFile(latestSchemaPath, normalizedDownloaded);
}
const diffSummary = describeTopLevelDiff(previous?.parsed, downloadedSchema);
const result = {
  changed: true,
  schemaSourceUrl,
  checkedAt,
  latestSchemaPath,
  snapshotPath,
  previousSchemaPath: previous?.path ?? '',
  diffSummary,
  snapshotsWritten: writeSnapshots,
};
const appendGithubOutputOptions2 = {
  changed: String(result.changed),
  schema_source_url: result.schemaSourceUrl,
  checked_at: result.checkedAt,
  latest_schema_path: result.latestSchemaPath,
  snapshot_path: result.snapshotPath,
  previous_schema_path: result.previousSchemaPath,
  diff_summary: result.diffSummary,
  snapshots_written: String(result.snapshotsWritten),
};
await appendGithubOutput(appendGithubOutputOptions2);
const message2 = `${JSON.stringify(result, null, 2)}\n`;
process.stdout.write(message2);
async function downloadSchema(url) {
  const fetchOptions = {
    headers: {
      Accept: 'application/schema+json, application/json, text/plain;q=0.8',
      'User-Agent': 'cloakbrowser-mcp-schema-monitor',
    },
  };
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    const message3 = `Failed to download MCP schema from ${url}: ${response.status} ${response.statusText}`;
    throw new Error(message3);
  }
  const text = await response.text();
  const contentType = response.headers.get('content-type');
  const parseSchemaPayloadOptions = { text, contentType, sourceUrl: url };
  return parseSchemaPayload(parseSchemaPayloadOptions);
}
async function readPreviousSchema(filePath) {
  try {
    const text = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(text);
    return {
      path: filePath,
      comparable: normalizeSchemaForComparison(parsed),
      parsed,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }
    throw error;
  }
}
async function allocateSnapshotFilename(directoryPath, date, comparableSchema) {
  const listJsonFilesResult = await listJsonFiles(directoryPath);
  const filenames = new Set(listJsonFilesResult);
  const candidate = `mcp-schema-${date}.json`;
  if (filenames.has(candidate)) {
    const joinResult = join(directoryPath, candidate);
    const existingContent = await readFile(joinResult, 'utf8');
    if (
      (() => {
        const parsedValue = JSON.parse(existingContent);
        return normalizeSchemaForComparison(parsedValue) === comparableSchema;
      })()
    ) {
      return candidate;
    }
  }
  const pickSnapshotFilenameOptions = { date, existingFilenames: filenames };
  return pickSnapshotFilename(pickSnapshotFilenameOptions);
}
async function listJsonFiles(directoryPath) {
  const readdirOptions = { withFileTypes: true };
  const entries = await readdir(directoryPath, readdirOptions);
  return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map((entry) => entry.name);
}
function isMissingFileError(error) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code === 'ENOENT'
  );
}
function readBooleanEnv(name, defaultValue) {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') {
    return defaultValue;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  const message4 = `${name} must be true or false.`;
  throw new Error(message4);
}
