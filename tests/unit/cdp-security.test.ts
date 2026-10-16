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
    const createCdpSecurityRejectionReporterOptions = { onReport } as const;
    const reporter = createCdpSecurityRejectionReporter(createCdpSecurityRejectionReporterOptions);
    for (let index = 0; index < 10000; index += 1) reporter.record('capability');
    reporter.record('host');
    reporter.record('origin');
    expect(onReport).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CDP_SECURITY_REJECTION_WINDOW_MS);
    const receiverActual = onReport;
    const toHaveBeenCalledWithOptions = {
      capability: 10000,
      host: 1,
      origin: 1,
      windowSeconds: 60,
    } as const;
    expect(receiverActual).toHaveBeenCalledWith(toHaveBeenCalledWithOptions);
    reporter.record('origin');
    reporter.close();
    const receiver2Actual = onReport;
    const toHaveBeenLastCalledWithOptions = {
      capability: 0,
      host: 0,
      origin: 1,
      windowSeconds: 60,
    } as const;
    expect(receiver2Actual).toHaveBeenLastCalledWith(toHaveBeenLastCalledWithOptions);
    expect(onReport).toHaveBeenCalledTimes(2);
  });
  it('saturates unsigned 32-bit counters', () => {
    const incrementSaturatingUint32Result = incrementSaturatingUint32(4294967294);
    expect(incrementSaturatingUint32Result).toBe(4294967295);
    const incrementSaturatingUint32Result2 = incrementSaturatingUint32(4294967295);
    expect(incrementSaturatingUint32Result2).toBe(4294967295);
  });
  it('does not let reporting failures affect recording or final flush', () => {
    const createCdpSecurityRejectionReporterOptions2: {
      onReport?: (summary: import('@/cdp/security.js').CdpSecurityRejectionSummary) => void;
      windowMs?: number;
    } = {
      onReport: () => {
        throw new Error('diagnostic sink failed');
      },
    };
    const reporter = createCdpSecurityRejectionReporter(createCdpSecurityRejectionReporterOptions2);
    expect(() => reporter.record('host')).not.toThrow();
    expect(() => reporter.close()).not.toThrow();
  });
});
