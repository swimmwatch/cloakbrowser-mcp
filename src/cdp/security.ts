export type CdpSecurityRejectionCategory = 'capability' | 'host' | 'origin';
export interface CdpSecurityRejectionSummary {
  capability: number;
  host: number;
  origin: number;
  windowSeconds: number;
}
export interface CdpSecurityRejectionReporter {
  close(): void;
  record(category: CdpSecurityRejectionCategory): void;
}
const maxUint32 = 4294967295;
export const CDP_SECURITY_REJECTION_WINDOW_MS = 60000;
/** Creates a session-scoped, bounded aggregate reporter for rejected CDP requests. */
export function createCdpSecurityRejectionReporter(options: {
  onReport?: (summary: CdpSecurityRejectionSummary) => void;
  windowMs?: number;
}): CdpSecurityRejectionReporter {
  const windowMs = options.windowMs ?? CDP_SECURITY_REJECTION_WINDOW_MS;
  let counts = emptyCounts();
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  const flush = (): void => {
    timer = undefined;
    if (counts.capability === 0 && counts.host === 0 && counts.origin === 0) return;
    const report = { ...counts, windowSeconds: windowMs / 1000 };
    counts = emptyCounts();
    try {
      options.onReport?.(report);
    } catch {
      // Diagnostic reporting never changes proxy behavior.
    }
  };
  return {
    close() {
      if (closed) return;
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      flush();
    },
    record(category) {
      if (closed) return;
      counts[category] = incrementSaturatingUint32(counts[category]);
      if (timer !== undefined) return;
      timer = setTimeout(flush, windowMs);
      timer.unref();
    },
  };
}
/** Increments a non-negative counter without exceeding the unsigned 32-bit maximum. */
export function incrementSaturatingUint32(value: number): number {
  const computedValue = value + 1;
  return Math.min(maxUint32, computedValue);
}
function emptyCounts(): Record<CdpSecurityRejectionCategory, number> {
  return { capability: 0, host: 0, origin: 0 };
}
