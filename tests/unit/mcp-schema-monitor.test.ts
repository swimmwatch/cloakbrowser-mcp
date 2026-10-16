import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
interface McpSchemaMonitorModule {
  createSchemaSourceUrl(input: { schemaBaseUrl?: string; version: string }): string;
  describeTopLevelDiff(previousSchema: unknown, nextSchema: unknown): string;
  normalizeJson(value: unknown): string;
  normalizeSchemaForComparison(value: unknown): string;
  parseSchemaPayload(input: { text: string; contentType?: string; sourceUrl: string }): unknown;
  pickSnapshotFilename(input: { date: string; existingFilenames: Set<string> }): string;
  resolveSchemaSourceUrl(input?: {
    catalogUrl?: string;
    explicitUrl?: string;
    fetchImpl?: typeof fetch;
    schemaBaseUrl?: string;
  }): Promise<string>;
  selectLatestSchemaVersion(entries: unknown[]): string;
}
const argumentValue = new URL('../../scripts/lib/mcp-schema-monitor.mjs', import.meta.url).href;
const monitor = (await import(argumentValue)) as unknown as McpSchemaMonitorModule;
const uRL = new URL('../../scripts/check-mcp-schema-updates.mjs', import.meta.url);
const checkScriptPath = fileURLToPath(uRL);
describe('mcp schema monitor helpers', () => {
  it('normalizes object keys recursively for stable comparisons', () => {
    const normalizeJsonOptions = {
      z: 1,
      nested: {
        b: 2,
        a: 1,
      },
      array: [{ d: 4, c: 3 }],
    };
    const normalized = monitor.normalizeJson(normalizeJsonOptions);
    const receiverActual = normalized;
    const joinedPath = [
      '{',
      '  "array": [',
      '    {',
      '      "c": 3,',
      '      "d": 4',
      '    }',
      '  ],',
      '  "nested": {',
      '    "a": 1,',
      '    "b": 2',
      '  },',
      '  "z": 1',
      '}',
      '',
    ].join('\n');
    expect(receiverActual).toBe(joinedPath);
  });
  it('selects the latest dated schema directory', () => {
    const values: unknown[] = [
      { name: '2025-10-17', type: 'dir' },
      { name: 'latest', type: 'dir' },
      { name: 'README.md', type: 'file' },
      { name: '2025-12-11', type: 'dir' },
      { name: '2025-09-29', type: 'dir' },
    ];
    const version = monitor.selectLatestSchemaVersion(values);
    expect(version).toBe('2025-12-11');
  });
  it('builds canonical static schema URLs', () => {
    const createSchemaSourceUrlOptions = {
      schemaBaseUrl: 'https://static.example.test/schemas/',
      version: '2025-12-11',
    } as const;
    const schemaSourceUrlResult = monitor.createSchemaSourceUrl(createSchemaSourceUrlOptions);
    expect(schemaSourceUrlResult).toBe('https://static.example.test/schemas/2025-12-11/server.schema.json');
  });
  it('resolves the latest schema URL from the catalog', async () => {
    const fetchImpl = async () => {
      const values2 = [
        { name: '2025-09-29', type: 'dir' },
        { name: '2025-12-11', type: 'dir' },
      ];
      const serializedValue = JSON.stringify(values2);
      const responseOptions = {
        headers: { 'content-type': 'application/json' },
        status: 200,
      } as const;
      return new Response(serializedValue, responseOptions);
    };
    const resolveSchemaSourceUrlOptions = {
      catalogUrl: 'https://api.example.test/schemas',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      schemaBaseUrl: 'https://static.example.test/schemas',
    } as const;
    const resolveSchemaSourceUrlResult = monitor.resolveSchemaSourceUrl(resolveSchemaSourceUrlOptions);
    await expect(resolveSchemaSourceUrlResult).resolves.toBe(
      'https://static.example.test/schemas/2025-12-11/server.schema.json',
    );
  });
  it('keeps an explicit schema source URL without catalog discovery', async () => {
    const fetchImpl = async () => {
      throw new Error('unexpected fetch');
    };
    const resolveSchemaSourceUrlOptions2 = {
      explicitUrl: ' https://example.test/custom.schema.json ',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    } as const;
    const resolveSchemaSourceUrlResult2 = monitor.resolveSchemaSourceUrl(resolveSchemaSourceUrlOptions2);
    await expect(resolveSchemaSourceUrlResult2).resolves.toBe('https://example.test/custom.schema.json');
  });
  it('rejects HTML responses when schema source does not return JSON', () => {
    expect(() => {
      const parseSchemaPayloadOptions = {
        text: '<html><body>Not JSON</body></html>',
        contentType: 'text/html; charset=utf-8',
        sourceUrl: 'https://example.invalid/schema.json',
      } as const;
      return monitor.parseSchemaPayload(parseSchemaPayloadOptions);
    }).toThrow('Expected JSON');
  });
  it('ignores top-level comments when comparing schema content', () => {
    const normalizeSchemaForComparisonOptions = {
      $comment: 'Bundled locally.',
      $id: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      definitions: {
        ServerDetail: {
          type: 'object',
        },
      },
    } as const;
    const local = monitor.normalizeSchemaForComparison(normalizeSchemaForComparisonOptions);
    const normalizeSchemaForComparisonOptions2 = {
      $comment: 'Generated upstream.',
      $id: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      definitions: {
        ServerDetail: {
          type: 'object',
        },
      },
    } as const;
    const upstream = monitor.normalizeSchemaForComparison(normalizeSchemaForComparisonOptions2);
    expect(local).toBe(upstream);
  });
  it('rejects invalid JSON responses', () => {
    expect(() => {
      const parseSchemaPayloadOptions2 = {
        text: '{not-json}',
        contentType: 'application/json',
        sourceUrl: 'https://example.invalid/schema.json',
      } as const;
      return monitor.parseSchemaPayload(parseSchemaPayloadOptions2);
    }).toThrow('invalid JSON');
  });
  it('allocates a suffixed snapshot filename when a same-day file already exists', () => {
    const propertyValue = '2026-07-04';
    const values3: Iterable<string> | null | undefined = ['mcp-schema-2026-07-04.json', 'latest.json'];
    const set = new Set(values3);
    const pickSnapshotFilenameOptions: { date: string; existingFilenames: Set<string> } = {
      date: propertyValue,
      existingFilenames: set,
    };
    const name = monitor.pickSnapshotFilename(pickSnapshotFilenameOptions);
    expect(name).toBe('mcp-schema-2026-07-04-2.json');
  });
  it('describes top-level key changes for PR summaries', () => {
    const describeTopLevelDiffOptions = { a: 1, b: 2 } as const;
    const describeTopLevelDiffOptions2 = { b: 2, c: 3 } as const;
    const summary = monitor.describeTopLevelDiff(describeTopLevelDiffOptions, describeTopLevelDiffOptions2);
    expect(summary).toContain('added keys: c');
    expect(summary).toContain('removed keys: a');
  });
  it('can report schema changes without writing snapshots', () => {
    const root = mkdirTempDir('cloakbrowser-mcp-schema-check-');
    const schemaDir = path.join(root, 'schemas', 'mcp');
    const githubOutputPath = path.join(root, 'github-output.txt');
    const previousSchema = { $id: 'https://example.test/schema.json', definitions: { Old: {} } };
    const nextSchema = {
      $id: 'https://example.test/schema.json',
      definitions: { New: {}, Old: {} },
    };
    const mkdirSyncOptions = { recursive: true } as const;
    mkdirSync(schemaDir, mkdirSyncOptions);
    const joinedPath2 = path.join(schemaDir, 'latest.json');
    const normalizeJsonResult = monitor.normalizeJson(previousSchema);
    writeFileSync(joinedPath2, normalizeJsonResult);
    const argumentValue2 = process.execPath;
    const values4: readonly string[] = [checkScriptPath];
    const propertyValue4 = 'utf8';
    const options = { ...process.env };
    const currentGithubOutputPath = githubOutputPath;
    const propertyValue2 = '2026-07-08';
    const currentSchemaDir = schemaDir;
    const serializedValue2 = JSON.stringify(nextSchema);
    const templateValue = encodeURIComponent(serializedValue2);
    const message = `data:application/json,${templateValue}`;
    const propertyValue3 = 'false';
    const options2 = {
      ...options,
      GITHUB_OUTPUT: currentGithubOutputPath,
      MCP_SCHEMA_CHECKED_AT: propertyValue2,
      MCP_SCHEMA_DIR: currentSchemaDir,
      MCP_SCHEMA_SOURCE_URL: message,
      MCP_SCHEMA_WRITE_SNAPSHOTS: propertyValue3,
    } as const;
    const spawnSyncOptions = {
      encoding: propertyValue4,
      env: options2,
    } as const;
    const result = spawnSync(argumentValue2, values4, spawnSyncOptions);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const output = readFileSync(githubOutputPath, 'utf8');
    expect(output).toContain('changed=true');
    expect(output).toContain('snapshots_written=false');
    const parsed = JSON.parse(result.stdout) as {
      changed: boolean;
      snapshotPath: string;
      snapshotsWritten: boolean;
    };
    expect(parsed.changed).toBe(true);
    expect(parsed.snapshotPath).toBe('');
    expect(parsed.snapshotsWritten).toBe(false);
    const joinedPath3 = path.join(schemaDir, 'latest.json');
    const fileSyncResult = readFileSync(joinedPath3, 'utf8');
    const receiver2Actual = fileSyncResult;
    const normalizeJsonResult2 = monitor.normalizeJson(previousSchema);
    expect(receiver2Actual).toBe(normalizeJsonResult2);
    const dirSyncResult = readdirSync(schemaDir);
    const receiver3Actual = dirSyncResult;
    const values5: string[] = ['latest.json'];
    expect(receiver3Actual).toEqual(values5);
    const joinedPath4 = path.join(schemaDir, 'mcp-schema-2026-07-08.json');
    const existsSyncResult = existsSync(joinedPath4);
    expect(existsSyncResult).toBe(false);
  });
});
function mkdirTempDir(prefix: string): string {
  const tmpdirResult = tmpdir();
  const joinedPath5 = path.join(tmpdirResult, prefix);
  return mkdtempSync(joinedPath5);
}
