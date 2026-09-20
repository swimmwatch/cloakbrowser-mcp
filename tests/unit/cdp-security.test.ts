import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CDP_SECURITY_REJECTION_WINDOW_MS,
  createCdpSecurityRejectionReporter,
  incrementSaturatingUint32,
} from '@/cdp/security.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('CDP security rejection reporter', () => {
  it('aggregates changed counters once per window and resets emitted counts', () => {
    vi.useFakeTimers();
    const onReport = vi.fn();
    const reporter = createCdpSecurityRejectionReporter({ onReport });

    for (let index = 0; index < 10_000; index += 1) reporter.record('capability');
    reporter.record('host');
    reporter.record('origin');
    expect(onReport).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CDP_SECURITY_REJECTION_WINDOW_MS);
    expect(onReport).toHaveBeenCalledWith({
      capability: 10_000,
      host: 1,
      origin: 1,
      windowSeconds: 60,
    });

    reporter.record('origin');
    reporter.close();
    expect(onReport).toHaveBeenLastCalledWith({
      capability: 0,
      host: 0,
      origin: 1,
      windowSeconds: 60,
    });
    expect(onReport).toHaveBeenCalledTimes(2);
  });

  it('saturates unsigned 32-bit counters', () => {
    expect(incrementSaturatingUint32(0xffff_fffe)).toBe(0xffff_ffff);
    expect(incrementSaturatingUint32(0xffff_ffff)).toBe(0xffff_ffff);
  });

  it('does not let reporting failures affect recording or final flush', () => {
    const reporter = createCdpSecurityRejectionReporter({
      onReport: () => {
        throw new Error('diagnostic sink failed');
      },
    });
    expect(() => reporter.record('host')).not.toThrow();
    expect(() => reporter.close()).not.toThrow();
  });
});
