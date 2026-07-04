import { describe, expect, it } from 'vitest';

interface McpSchemaMonitorModule {
  describeTopLevelDiff(previousSchema: unknown, nextSchema: unknown): string;
  normalizeJson(value: unknown): string;
  parseSchemaPayload(input: { text: string; contentType?: string; sourceUrl: string }): unknown;
  pickSnapshotFilename(input: { date: string; existingFilenames: Set<string> }): string;
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

  it('rejects HTML responses when schema source does not return JSON', () => {
    expect(() =>
      monitor.parseSchemaPayload({
        text: '<html><body>Not JSON</body></html>',
        contentType: 'text/html; charset=utf-8',
        sourceUrl: 'https://example.invalid/schema.json',
      }),
    ).toThrow('Expected JSON');
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
