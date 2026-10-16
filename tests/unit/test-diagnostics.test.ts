import { describe, expect, it } from 'vitest';
import { crc32 } from 'node:zlib';
import { controlledPng as png } from '@tests/fixtures/reporting/controlled-png.js';

interface Diagnostics {
  TEXT_LIMIT: number;
  PNG_LIMIT: number;
  ATTACHMENT_LIMIT: number;
  sanitizeDiagnostic: (input: unknown, secrets?: string[]) => string | Buffer;
  registerControlledScreenshot: (bytes: Buffer, url: string) => unknown;
  sanitizeHistory: (input: unknown, secrets?: string[]) => string;
  screenshotAnnotation: (message: string) => unknown;
}
const moduleUrl = new URL('../../scripts/lib/test-diagnostics.mjs', import.meta.url);
const diagnostics = (await import(moduleUrl.href)) as Diagnostics;
const { sanitizeDiagnostic, registerControlledScreenshot } = diagnostics;
function pngChunk(type: string, data: Buffer): Buffer {
  const size = data.length + 12;
  const chunk = Buffer.alloc(size);
  chunk.writeUInt32BE(data.length);
  chunk.write(type, 4, 'ascii');
  data.copy(chunk, 8);
  const checksumInput = chunk.subarray(4, size - 4);
  const checksum = crc32(checksumInput);
  chunk.writeUInt32BE(checksum, size - 4);
  return chunk;
}

function withChunk(chunk: Buffer): Buffer {
  const header = png.subarray(0, 33);
  const rest = png.subarray(33);
  const parts = [header, chunk, rest];
  return Buffer.concat(parts);
}

describe('safe test diagnostics', () => {
  it('validates inline screenshot evidence without reading arbitrary attachment paths', () => {
    const pngBase64 = png.toString('base64');
    const record = { fixtureUrl: 'http://127.0.0.1:1234/fixture', png: pngBase64 };
    const message = JSON.stringify(record);
    const receipt = diagnostics.screenshotAnnotation(message);
    const safe = sanitizeDiagnostic(receipt);
    expect(safe).toEqual(png);
    const invalid = [
      { ...record, fixtureUrl: 'https://external.invalid' },
      { ...record, png: `${pngBase64}!` },
      { ...record, source: '/tmp/untrusted.png' },
    ];
    for (const value of invalid) {
      const encoded = JSON.stringify(value);
      expect(() => diagnostics.screenshotAnnotation(encoded)).toThrow('Test evidence');
    }
  });
  it('redacts history keys and credential fields without limiting normal launch size to 256 fields', () => {
    const secret = 'history-synthetic-canary';
    const values = Array.from({ length: 600 }, (_, index) => ({ name: `case-${index}`, status: 'passed' }));
    const history = { [secret]: 'preserved', password: 'synthetic-history-password', testResults: values };
    const secrets = [secret];
    const output = diagnostics.sanitizeHistory(history, secrets);
    expect(output).not.toContain(secret);
    expect(output).not.toContain('synthetic-history-password');
    expect(output).toContain('case-599');
    expect(output).toContain('preserved');
  });

  it('rejects colliding redacted history keys and excessive nesting', () => {
    const history = { 'synthetic-first': 1, 'synthetic-second': 2 };
    const secrets = ['synthetic-first', 'synthetic-second'];
    expect(() => diagnostics.sanitizeHistory(history, secrets)).toThrow('Test evidence');
    let nested: unknown = 'leaf';
    for (let index = 0; index < 40; index += 1) nested = { child: nested };
    expect(() => diagnostics.sanitizeHistory(nested)).toThrow('Test evidence');
  });

  it('rejects corrupt PNG checksums and malformed metadata with valid checksums', () => {
    const damaged = Buffer.from(png);
    damaged[45] ^= 1;
    expect(() => registerControlledScreenshot(damaged, 'http://localhost/fixture')).toThrow();
    const invalidChunks: Array<[string, Buffer]> = [
      ['sRGB', Buffer.from('synthetic-png-secret')],
      ['gAMA', Buffer.alloc(5)],
      ['pHYs', Buffer.alloc(8)],
    ];
    for (const [type, data] of invalidChunks) {
      const chunk = pngChunk(type, data);
      const image = withChunk(chunk);
      expect(() => registerControlledScreenshot(image, 'http://localhost/fixture')).toThrow();
    }
  });

  it('strips valid optional metadata before PNG persistence', () => {
    const canary = 'TESTSEED';
    const physical = Buffer.alloc(9);
    physical.write(canary, 0, 'ascii');
    const chunk = pngChunk('pHYs', physical);
    const image = withChunk(chunk);
    const receipt = registerControlledScreenshot(image, 'http://localhost/fixture');
    const secrets = [canary];
    const safe = sanitizeDiagnostic(receipt, secrets) as Buffer;
    expect(safe).toEqual(png);
    expect(safe.includes(canary)).toBe(false);
  });
  it('redacts structured secrets and useful text before persistence', () => {
    const secrets = ['synthetic-known-secret'];
    const metadata = {
      status: 'failed',
      pid: 42,
      password: 'synthetic-password',
      apiKey: 'synthetic-key',
      headers: { Authorization: 'Bearer synthetic-bearer', Cookie: 'sid=synthetic-cookie' },
      message: 'navigation failed synthetic-known-secret https://user:synthetic-proxy@proxy.invalid',
      stack:
        'Error: token=synthetic-token\n at fixture:1\nws://localhost:9222/devtools/browser/synthetic-cdp',
    };
    const result = sanitizeDiagnostic(metadata, secrets);
    for (const secret of [
      'synthetic-password',
      'synthetic-key',
      'synthetic-bearer',
      'synthetic-cookie',
      'synthetic-proxy',
      'synthetic-token',
      'synthetic-known-secret',
      'synthetic-cdp',
    ]) {
      expect(result).not.toContain(secret);
    }
    expect(result).toContain('navigation failed');
    expect(result).toContain('fixture:1');
  });

  it('redacts mixed-case headers, quoted fields, encoded known secrets and CDP HTTP capabilities', () => {
    const input =
      'AUTHORIZATION: Basic synthetic-basic\nSet-Cookie: value=synthetic-session\n' +
      '"password": "synthetic-spaced password"\napi_key=synthetic-api\n' +
      'https://localhost:9222/cdp/synthetic-capability?token=synthetic-query\n' +
      'synthetic%20encoded';
    const output = sanitizeDiagnostic(input, ['synthetic encoded']);
    for (const value of [
      'synthetic-basic',
      'synthetic-session',
      'synthetic-spaced',
      'synthetic-api',
      'synthetic-capability',
      'synthetic-query',
      'synthetic%20encoded',
    ]) {
      expect(output).not.toContain(value);
    }
  });

  it('rejects environment dumps, circular values, unknown binary and oversized text', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const oversized = 'x'.repeat(diagnostics.TEXT_LIMIT + 1);
    const unknown = Buffer.from('unknown binary');
    for (const value of [{ env: { SECRET: 'synthetic' } }, circular, unknown, oversized]) {
      expect(() => sanitizeDiagnostic(value)).toThrow();
    }
  });

  it('accepts only registered controlled-local PNG and copies its bytes', () => {
    const registered = registerControlledScreenshot(png, 'http://127.0.0.1:1234/fixture');
    const output = sanitizeDiagnostic(registered);
    expect(Buffer.isBuffer(output)).toBe(true);
    expect(output).not.toBe(png);
    expect(output).toEqual(png);
    const forged = { bytes: png, provenance: 'controlled-local' };
    expect(() => sanitizeDiagnostic(forged)).toThrow();
  });

  it('rejects remote, credential-bearing, invalid and oversized screenshots', () => {
    const largeChunk = Buffer.alloc(diagnostics.PNG_LIMIT + 12);
    largeChunk.writeUInt32BE(diagnostics.PNG_LIMIT);
    largeChunk.write('IDAT', 4, 'ascii');
    const oversized = Buffer.concat([png.subarray(0, 33), largeChunk, png.subarray(png.length - 12)]);
    const bad = Buffer.from('not a PNG');
    for (const url of [
      'https://external.invalid',
      'http://user:password@localhost/fixture',
      'file:///tmp/image',
    ]) {
      expect(() => registerControlledScreenshot(png, url)).toThrow();
    }
    for (const bytes of [oversized, bad]) {
      expect(() => registerControlledScreenshot(bytes, 'http://localhost/fixture')).toThrow();
    }
  });

  it('redacts key fields and private-key blocks', () => {
    const input = {
      key: 'synthetic-key-field',
      proxyPassword: 'synthetic-proxy-field',
      clientSecret: 'synthetic-client-field',
      message: '-----BEGIN PRIVATE KEY-----\nsynthetic-private-material\n-----END PRIVATE KEY-----',
    };
    const output = sanitizeDiagnostic(input);
    for (const value of [
      'synthetic-key-field',
      'synthetic-proxy-field',
      'synthetic-client-field',
      'synthetic-private-material',
    ]) {
      expect(output).not.toContain(value);
    }
  });

  it('neutralizes HTML and rejects metadata-bearing PNGs', () => {
    const output = sanitizeDiagnostic('<script>alert(1)</script>');
    expect(output).not.toContain('<script>');
    const chunk = Buffer.alloc(12);
    chunk.write('tEXt', 4, 'ascii');
    const metadataPng = Buffer.concat([
      png.subarray(0, png.length - 12),
      chunk,
      png.subarray(png.length - 12),
    ]);
    expect(() => registerControlledScreenshot(metadataPng, 'http://localhost')).toThrow();
  });

  it('rejects accessor metadata without invoking user code', () => {
    let calls = 0;
    const metadata = {
      get message() {
        calls += 1;
        return 'unsafe getter';
      },
    };
    expect(() => sanitizeDiagnostic(metadata)).toThrow('Test evidence');
    expect(calls).toBe(0);
  });
});
