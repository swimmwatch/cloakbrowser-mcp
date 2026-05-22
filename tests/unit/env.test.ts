import { describe, expect, it } from 'vitest';
import { appendNodeOption, envBool, envInt, envList, envString } from '../../src/bridge/env.js';

describe('bridge environment helpers', () => {
  it('reads strings, booleans, integers, and lists', () => {
    const env = {
      TEXT: 'value',
      TRUE_VALUE: 'true',
      FALSE_VALUE: 'false',
      NUMBER: '42',
      CSV: '--one,--two=value',
      JSON_LIST: '["--alpha","--beta=1"]',
    };

    expect(envString(env, 'TEXT', 'fallback')).toBe('value');
    expect(envString(env, 'MISSING', 'fallback')).toBe('fallback');
    expect(envBool(env, 'TRUE_VALUE', false)).toBe(true);
    expect(envBool(env, 'FALSE_VALUE', true)).toBe(false);
    expect(envInt(env, 'NUMBER', 0)).toBe(42);
    expect(envList(env, 'CSV')).toEqual(['--one', '--two=value']);
    expect(envList(env, 'JSON_LIST')).toEqual(['--alpha', '--beta=1']);
  });

  it('appends node options without dropping existing flags', () => {
    expect(appendNodeOption(undefined, '--require=/tmp/a.cjs')).toBe('--require=/tmp/a.cjs');
    expect(appendNodeOption('--enable-source-maps', '--require=/tmp/a.cjs')).toBe(
      '--enable-source-maps --require=/tmp/a.cjs',
    );
  });
});
