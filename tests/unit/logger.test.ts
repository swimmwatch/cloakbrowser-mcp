import { describe, expect, it } from 'vitest';
import { redactLogFields } from '@/logging/logger.js';

describe('logger redaction', () => {
  it('redacts common secret keys while preserving safe fields', () => {
    const redacted = redactLogFields({
      url: 'https://example.test/',
      headers: {
        authorization: 'Bearer secret-token',
        cookie: 'sid=abc',
        accept: 'application/json',
      },
      credentials: {
        password: 'p4ssw0rd',
        api_key: 'key-123',
      },
    });

    expect(redacted.url).toBe('https://example.test/');
    expect(redacted.headers).toMatchObject({
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      accept: 'application/json',
    });
    expect(redacted.credentials).toMatchObject({
      password: '[REDACTED]',
      api_key: '[REDACTED]',
    });
  });

  it('redacts secret-looking values in strings', () => {
    const redacted = redactLogFields({
      message: 'fetch with Bearer abc.def.ghi and token=secret123',
    });

    expect(redacted.message).toBe('fetch with Bearer [REDACTED] and token=[REDACTED]');
  });

  it('handles arrays and circular values', () => {
    const circular: Record<string, unknown> = { token: 'secret' };
    circular.self = circular;

    const redacted = redactLogFields({ items: [circular] });

    expect(redacted).toEqual({ items: [{ token: '[REDACTED]', self: '[Circular]' }] });
  });
});
