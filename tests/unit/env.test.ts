import fc from 'fast-check';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendNodeOption, envBool, envInt, envList, envString, quoteNodeOptionValue } from '@/bridge/env.js';
import { fakeRuntimeDir } from '@tests/helpers/paths.js';
describe('bridge environment helpers', () => {
  const truthyValues = ['1', 'TRUE', 'Yes', 'oN'];
  it.each(truthyValues)('recognizes the boolean alias %s', (value) => {
    const env = { FLAG: value };
    const result = envBool(env, 'FLAG', false);
    expect(result).toBe(true);
  });
  it('uses defaults for missing or empty integer and list values', () => {
    const env = { EMPTY: '', SPACE: '  ' };
    const missingBool = envBool(env, 'MISSING', true);
    const missingInt = envInt(env, 'MISSING', 17);
    const emptyInt = envInt(env, 'EMPTY', 17);
    const emptyList = envList(env, 'SPACE');
    const defaultList = envList(env, 'MISSING', ' alpha, ,beta ');
    const expected = ['alpha', 'beta'];
    expect(missingBool).toBe(true);
    expect(missingInt).toBe(17);
    expect(emptyInt).toBe(17);
    expect(emptyList).toHaveLength(0);
    expect(defaultList).toEqual(expected);
  });
  it('rejects invalid integers with the environment variable name', () => {
    const env = { PORT: 'invalid' };
    const parse = () => envInt(env, 'PORT', 17);
    expect(parse).toThrow('PORT must be an integer');
  });
  const invalidLists: Array<[string, string | typeof SyntaxError]> = [
    ['[1]', 'ARGS must be a JSON string array'],
    ['["valid", null]', 'ARGS must be a JSON string array'],
    ['[false]', 'ARGS must be a JSON string array'],
    ['[', SyntaxError],
  ];
  it.each(invalidLists)('rejects malformed JSON lists %s', (value, error) => {
    const env = { ARGS: value };
    const parse = () => envList(env, 'ARGS');
    expect(parse).toThrow(error);
  });
  it('escapes embedded quotes in Node option paths with whitespace', () => {
    const result = quoteNodeOptionValue('a "quoted" path');
    expect(result).toBe('"a \\"quoted\\" path"');
  });
  it('reads strings, booleans, integers, and lists', () => {
    const env = {
      TEXT: 'value',
      TRUE_VALUE: 'true',
      FALSE_VALUE: 'false',
      NUMBER: '42',
      CSV: '--one,--two=value',
      JSON_LIST: '["--alpha","--beta=1"]',
    };
    const envStringResult = envString(env, 'TEXT', 'fallback');
    expect(envStringResult).toBe('value');
    const envStringResult2 = envString(env, 'MISSING', 'fallback');
    expect(envStringResult2).toBe('fallback');
    const envBoolResult = envBool(env, 'TRUE_VALUE', false);
    expect(envBoolResult).toBe(true);
    const envBoolResult2 = envBool(env, 'FALSE_VALUE', true);
    expect(envBoolResult2).toBe(false);
    const envIntResult = envInt(env, 'NUMBER', 0);
    expect(envIntResult).toBe(42);
    const envListResult = envList(env, 'CSV');
    const receiverActual = envListResult;
    const values2: string[] = ['--one', '--two=value'];
    expect(receiverActual).toEqual(values2);
    const envListResult2 = envList(env, 'JSON_LIST');
    const receiver2Actual = envListResult2;
    const values3: string[] = ['--alpha', '--beta=1'];
    expect(receiver2Actual).toEqual(values3);
  });
  it('appends node options without dropping existing flags', () => {
    const preloadOption = `--require=${path.join(fakeRuntimeDir, 'a.cjs')}`;
    const appendNodeOptionResult = appendNodeOption(undefined, preloadOption);
    expect(appendNodeOptionResult).toBe(preloadOption);
    const appendNodeOptionResult2 = appendNodeOption('--enable-source-maps', preloadOption);
    const receiver3Actual = appendNodeOptionResult2;
    const message = `--enable-source-maps ${preloadOption}`;
    expect(receiver3Actual).toBe(message);
  });
  it('quotes Node.js option values only when paths contain whitespace', () => {
    const joinedPath = path.join(fakeRuntimeDir, 'a.cjs');
    const quoteNodeOptionValueResult = quoteNodeOptionValue(joinedPath);
    const receiver4Actual = quoteNodeOptionValueResult;
    const joinedPath2 = path.join(fakeRuntimeDir, 'a.cjs');
    expect(receiver4Actual).toBe(joinedPath2);
    const joinedPath3 = path.join(fakeRuntimeDir, 'with space', 'a.cjs');
    const quoteNodeOptionValueResult2 = quoteNodeOptionValue(joinedPath3);
    const receiver5Actual = quoteNodeOptionValueResult2;
    const message2 = `"${path.join(fakeRuntimeDir, 'with space', 'a.cjs')}"`;
    expect(receiver5Actual).toBe(message2);
  });
  it('round-trips JSON string arrays for list environment values', () => {
    const stringOptions = { maxLength: 24 } as const;
    const stringResult = fc.string(stringOptions);
    const arrayOptions = { maxLength: 12 } as const;
    const arrayResult = fc.array(stringResult, arrayOptions);
    const propertyResult = fc.property(arrayResult, (values) => {
      const envListOptions = { JSON_LIST: JSON.stringify(values) } as const;
      const envListResult3 = envList(envListOptions, 'JSON_LIST');
      expect(envListResult3).toEqual(values);
    });
    fc.assert(propertyResult);
  });
  it('preserves appended Node.js options after an existing option string', () => {
    const constantFromResult = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_:=-.',
    );
    const arrayOptions2 = {
      minLength: 1,
      maxLength: 24,
    } as const;
    const token = fc.array(constantFromResult, arrayOptions2).map((chars) => chars.join(''));
    const propertyResult2 = fc.property(token, token, (existing, next) => {
      const appendNodeOptionResult3 = appendNodeOption(existing, next);
      const receiver6Actual = appendNodeOptionResult3;
      const message3 = `${existing} ${next}`;
      expect(receiver6Actual).toBe(message3);
    });
    fc.assert(propertyResult2);
  });
});
