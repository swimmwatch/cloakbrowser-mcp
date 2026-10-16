import { describe, expect, it } from 'vitest';
import { serializeJavaScriptString } from '@/cdp/script.js';

describe('CDP JavaScript string serialization', () => {
  const values = [
    'plain challenge',
    '</script><script>globalThis.injected = true</script>',
    'quotes" and apostrophes\' and backslashes\\',
    'line separators\u2028\u2029',
    'controls\0\b\f\n\r\t and emoji 🧪',
  ];
  it.each(values)('preserves %j without script delimiters or raw line separators', (value) => {
    const literal = serializeJavaScriptString(value);
    const decoded = JSON.parse(literal) as unknown;
    expect(decoded).toBe(value);
    expect(literal).not.toMatch(/[<>\u2028\u2029]/u);
  });
});
