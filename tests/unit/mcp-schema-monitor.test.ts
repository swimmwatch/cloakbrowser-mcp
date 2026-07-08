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

const monitor = (await import(
  new URL('../../scripts/lib/mcp-schema-monitor.mjs', import.meta.url).href
)) as unknown as McpSchemaMonitorModule;

describe('mcp schema monitor helpers', () => {
  it('normalizes object keys recursively for stable comparisons', () => {
    const normalized = monitor.normalizeJson({
      z: 1,
      nested: {
        b: 2,
        a: 1,
      },
      array: [{ d: 4, c: 3 }],
    });

    expect(normalized).toBe(
      [
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
      ].join('\n'),
    );
  });

  it('selects the latest dated schema directory', () => {
    const version = monitor.selectLatestSchemaVersion([
      { name: '2025-10-17', type: 'dir' },
      { name: 'latest', type: 'dir' },
      { name: 'README.md', type: 'file' },
      { name: '2025-12-11', type: 'dir' },
      { name: '2025-09-29', type: 'dir' },
    ]);

    expect(version).toBe('2025-12-11');
  });

  it('builds canonical static schema URLs', () => {
    expect(
      monitor.createSchemaSourceUrl({
        schemaBaseUrl: 'https://static.example.test/schemas/',
        version: '2025-12-11',
      }),
    ).toBe('https://static.example.test/schemas/2025-12-11/server.schema.json');
  });

  it('resolves the latest schema URL from the catalog', async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify([
          { name: '2025-09-29', type: 'dir' },
          { name: '2025-12-11', type: 'dir' },
        ]),
        {
          headers: { 'content-type': 'application/json' },
          status: 200,
        },
      );

    await expect(
      monitor.resolveSchemaSourceUrl({
        catalogUrl: 'https://api.example.test/schemas',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        schemaBaseUrl: 'https://static.example.test/schemas',
      }),
    ).resolves.toBe('https://static.example.test/schemas/2025-12-11/server.schema.json');
  });

  it('keeps an explicit schema source URL without catalog discovery', async () => {
    const fetchImpl = async () => {
      throw new Error('unexpected fetch');
    };

    await expect(
      monitor.resolveSchemaSourceUrl({
        explicitUrl: ' https://example.test/custom.schema.json ',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe('https://example.test/custom.schema.json');
  });

  it('rejects HTML responses when schema source does not return JSON', () => {
    expect(() =>
      monitor.parseSchemaPayload({
        text: '<html><body>Not JSON</body></html>',
        contentType: 'text/html; charset=utf-8',
        sourceUrl: 'https://example.invalid/schema.json',
      }),
    ).toThrow('Expected JSON');
  });

  it('ignores top-level comments when comparing schema content', () => {
    const local = monitor.normalizeSchemaForComparison({
      $comment: 'Bundled locally.',
      $id: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      definitions: {
        ServerDetail: {
          type: 'object',
        },
      },
    });

    const upstream = monitor.normalizeSchemaForComparison({
      $comment: 'Generated upstream.',
      $id: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
      definitions: {
        ServerDetail: {
          type: 'object',
        },
      },
    });

    expect(local).toBe(upstream);
  });

  it('rejects invalid JSON responses', () => {
    expect(() =>
      monitor.parseSchemaPayload({
        text: '{not-json}',
        contentType: 'application/json',
        sourceUrl: 'https://example.invalid/schema.json',
      }),
    ).toThrow('invalid JSON');
  });

  it('allocates a suffixed snapshot filename when a same-day file already exists', () => {
    const name = monitor.pickSnapshotFilename({
      date: '2026-07-04',
      existingFilenames: new Set(['mcp-schema-2026-07-04.json', 'latest.json']),
    });

    expect(name).toBe('mcp-schema-2026-07-04-2.json');
  });

  it('describes top-level key changes for PR summaries', () => {
    const summary = monitor.describeTopLevelDiff({ a: 1, b: 2 }, { b: 2, c: 3 });

    expect(summary).toContain('added keys: c');
    expect(summary).toContain('removed keys: a');
  });
});
