import { describe, expect, it } from 'vitest';
import { assertOriginAllowed } from '@/security/policies.js';
import { configSchema } from '@/config/schema.js';
import { isCloakMcpError } from '@/errors/index.js';

const baseCfg = configSchema.parse({});

describe('origin policy', () => {
  it('allows any origin when allowedOrigins is unset', () => {
    expect(() => assertOriginAllowed('https://example.com/x', baseCfg)).not.toThrow();
  });

  it('rejects schemes other than http/https/file/about', () => {
    try {
      assertOriginAllowed('ftp://example.com', baseCfg);
      expect.fail('should reject');
    } catch (e) {
      if (isCloakMcpError(e)) expect(e.code).toBe('ORIGIN_DENIED');
      else expect.fail('wrong error');
    }
  });

  it('enforces allowedOrigins suffix match', () => {
    const cfg = { ...baseCfg, allowedOrigins: ['example.com'] };
    expect(() => assertOriginAllowed('https://a.example.com', cfg)).not.toThrow();
    expect(() => assertOriginAllowed('https://example.com', cfg)).not.toThrow();
    expect(() => assertOriginAllowed('https://otherexample.com', cfg)).toThrow();
  });

  it('blockedOrigins overrides allowedOrigins', () => {
    const cfg = { ...baseCfg, allowedOrigins: ['*'], blockedOrigins: ['evil.test'] };
    expect(() => assertOriginAllowed('https://sub.evil.test', cfg)).toThrow();
    expect(() => assertOriginAllowed('https://safe.test', cfg)).not.toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => assertOriginAllowed('not a url', baseCfg)).toThrow(/invalid URL/);
  });

  it('requires allowFileAccess for file URLs', () => {
    expect(() => assertOriginAllowed('file:///tmp/example.html', baseCfg)).toThrow(/allowFileAccess/);

    const cfg = { ...baseCfg, capabilities: { ...baseCfg.capabilities, allowFileAccess: true } };
    expect(() => assertOriginAllowed('file:///tmp/example.html', cfg)).not.toThrow();
  });
});
