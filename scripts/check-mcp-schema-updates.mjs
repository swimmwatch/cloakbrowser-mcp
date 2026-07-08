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

const schemaSourceUrl = await resolveSchemaSourceUrl({
  catalogUrl: process.env.MCP_SCHEMA_CATALOG_URL,
  explicitUrl: process.env.MCP_SCHEMA_SOURCE_URL,
});
const schemaDir = process.env.MCP_SCHEMA_DIR ?? 'schemas/mcp';
const checkedAt = process.env.MCP_SCHEMA_CHECKED_AT ?? toIsoDate();
const writeSnapshots = readBooleanEnv('MCP_SCHEMA_WRITE_SNAPSHOTS', true);
const latestSchemaPath = join(schemaDir, 'latest.json');

const downloadedSchema = await downloadSchema(schemaSourceUrl);
const normalizedDownloaded = normalizeJson(downloadedSchema);
const comparableDownloaded = normalizeSchemaForComparison(downloadedSchema);

const previous = await readPreviousSchema(latestSchemaPath);

if (previous?.comparable === comparableDownloaded) {
  await appendGithubOutput({
    changed: 'false',
    schema_source_url: schemaSourceUrl,
    checked_at: checkedAt,
    latest_schema_path: latestSchemaPath,
    diff_summary: 'No changes detected in normalized schema content.',
    snapshots_written: 'false',
  });

  process.stdout.write(
    `${JSON.stringify(
      {
        changed: false,
        schemaSourceUrl,
        checkedAt,
        latestSchemaPath,
        snapshotsWritten: false,
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
}

let snapshotPath = '';

if (writeSnapshots) {
  await mkdir(schemaDir, { recursive: true });
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

await appendGithubOutput({
  changed: String(result.changed),
  schema_source_url: result.schemaSourceUrl,
  checked_at: result.checkedAt,
  latest_schema_path: result.latestSchemaPath,
  snapshot_path: result.snapshotPath,
  previous_schema_path: result.previousSchemaPath,
  diff_summary: result.diffSummary,
  snapshots_written: String(result.snapshotsWritten),
});

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

async function downloadSchema(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/schema+json, application/json, text/plain;q=0.8',
      'User-Agent': 'cloakbrowser-mcp-schema-monitor',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download MCP schema from ${url}: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type');
  return parseSchemaPayload({ text, contentType, sourceUrl: url });
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
  const filenames = new Set(await listJsonFiles(directoryPath));

  const candidate = `mcp-schema-${date}.json`;
  if (filenames.has(candidate)) {
    const existingContent = await readFile(join(directoryPath, candidate), 'utf8');
    if (normalizeSchemaForComparison(JSON.parse(existingContent)) === comparableSchema) {
      return candidate;
    }
  }

  return pickSnapshotFilename({ date, existingFilenames: filenames });
}

async function listJsonFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
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

  throw new Error(`${name} must be true or false.`);
}
