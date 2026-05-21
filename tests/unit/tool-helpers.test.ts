import { describe, expect, it, vi } from 'vitest';
import { isCloakMcpError } from '@/errors/index.js';
import { secondsToMilliseconds, targetSelector } from '@/tools/compat.js';
import { withTimeout } from '@/tools/withTimeout.js';

describe('tool helper utilities', () => {
  it('resolves and rejects wrapped promises', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 100, 'quick')).resolves.toBe('ok');
    await expect(withTimeout(Promise.reject(new Error('bad')), 100, 'quick')).rejects.toThrow('bad');
  });

  it('rejects with TIMEOUT when the promise does not settle in time', async () => {
    vi.useFakeTimers();
    try {
      const pending = withTimeout(new Promise(() => undefined), 10, 'slow');
      const assertion = expect(pending).rejects.toSatisfy((error: unknown) => {
        return isCloakMcpError(error) && error.code === 'TIMEOUT';
      });
      await vi.advanceTimersByTimeAsync(10);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('normalises selectors and wait seconds', () => {
    expect(targetSelector({ selector: '#explicit', target: '#target' })).toBe('#explicit');
    expect(targetSelector({ target: '#target' })).toBe('#target');
    expect(() => targetSelector({}, 'element')).toThrow(/element or target is required/);
    expect(secondsToMilliseconds(0.001)).toBe(1);
    expect(secondsToMilliseconds(1.25)).toBe(1250);
  });
});
