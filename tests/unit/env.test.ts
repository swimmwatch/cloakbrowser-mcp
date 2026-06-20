import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { appendNodeOption, envBool, envInt, envList, envString } from '@/bridge/env.js';

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

  it('round-trips JSON string arrays for list environment values', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 24 }), { maxLength: 12 }), (values) => {
        expect(envList({ JSON_LIST: JSON.stringify(values) }, 'JSON_LIST')).toEqual(values);
      }),
    );
  });

  it('preserves appended Node.js options after an existing option string', () => {
    const token = fc
      .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_:=-.'), {
        minLength: 1,
        maxLength: 24,
      })
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(token, token, (existing, next) => {
        expect(appendNodeOption(existing, next)).toBe(`${existing} ${next}`);
      }),
    );
  });
});
