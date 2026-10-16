import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { describe, expect, it, vi } from 'vitest';
import {
  CdpPortAllocator,
  CdpPortBindError,
  type CdpPortBinding,
  CdpPortPoolExhaustedError,
} from '@/cdp/allocator.js';
describe('CDP port allocator', () => {
  const invalidRanges = [
    { start: 0, end: 1 },
    { start: 1, end: 65536 },
    { start: 2, end: 1 },
    { start: 1.5, end: 2 },
    { start: 1, end: 2.5 },
    { start: NaN, end: 2 },
  ];
  it.each(invalidRanges)('rejects invalid port range %j', (range) => {
    const create = () => new CdpPortAllocator(range);
    expect(create).toThrow(RangeError);
  });
  const unknownFailures: unknown[] = [new Error('bind failed'), { code: 13 }, 'bind failed'];
  it.each(unknownFailures)(
    'preserves an untyped bind failure and rolls back its reservation: %j',
    async (failure) => {
      const range = { start: 25001, end: 25001 };
      const allocator = new CdpPortAllocator(range);
      const binding = { close: async () => undefined };
      const bind = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(binding);
      const options = { bind, host: '127.0.0.1' };
      const acquire = allocator.acquire(options);
      const expected = { cause: failure, code: undefined, port: range.start };
      await expect(acquire).rejects.toMatchObject(expected);
      const lease = await allocator.acquire(options);
      expect(lease.port).toBe(range.start);
      await lease.release();
    },
  );
  it('keeps an uncertain binding reserved after close fails', async () => {
    const range = { start: 25002, end: 25002 };
    const allocator = new CdpPortAllocator(range);
    const failure = new Error('close failed');
    const close = vi.fn().mockRejectedValue(failure);
    const bind = async () => ({ close });
    const options = { bind, host: '127.0.0.1' };
    const lease = await allocator.acquire(options);
    const release = lease.release();
    await expect(release).rejects.toBe(failure);
    const repeatedRelease = lease.release();
    await expect(repeatedRelease).rejects.toBe(failure);
    const acquire = allocator.acquire(options);
    await expect(acquire).rejects.toBeInstanceOf(CdpPortPoolExhaustedError);
    expect(close).toHaveBeenCalledOnce();
  });
  it('leases available ports atomically in ascending order and reports exhaustion', async () => {
    const cdpPortAllocatorOptions = { start: 20001, end: 20002 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions);
    const ports: number[] = [];
    const bind = async (port: number): Promise<CdpPortBinding> => {
      ports.push(port);
      return { close: async () => undefined };
    };
    const acquireOptions = { bind, host: '127.0.0.1' } as const;
    const acquireResult = allocator.acquire(acquireOptions);
    const acquireOptions2 = { bind, host: '127.0.0.1' } as const;
    const acquireResult2 = allocator.acquire(acquireOptions2);
    const values: [
      Promise<import('@/cdp/allocator.js').CdpPortLease>,
      Promise<import('@/cdp/allocator.js').CdpPortLease>,
    ] = [acquireResult, acquireResult2];
    const [first, second] = await Promise.all(values);
    const sortResult = [first.port, second.port].sort((left, right) => left - right);
    const receiverActual = sortResult;
    const values2: number[] = [20001, 20002];
    expect(receiverActual).toEqual(values2);
    const sortResult2 = ports.sort((left, right) => left - right);
    const receiver2Actual = sortResult2;
    const values3: number[] = [20001, 20002];
    expect(receiver2Actual).toEqual(values3);
    const acquireOptions3 = { bind, host: '127.0.0.1' } as const;
    const acquireResult3 = allocator.acquire(acquireOptions3);
    await expect(acquireResult3).rejects.toBeInstanceOf(CdpPortPoolExhaustedError);
    const values4: [Promise<void>, Promise<void>] = [first.release(), second.release()];
    await Promise.all(values4);
  });
  const values5: readonly ('EACCES' | 'EADDRINUSE')[] = [
    systemErrorCodes.EADDRINUSE,
    systemErrorCodes.EACCES,
  ];
  it.each(values5)('fails immediately on bind error %s without scanning', async (code) => {
    const cdpPortAllocatorOptions2 = { start: 21001, end: 21002 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions2);
    const attempted: number[] = [];
    const bind = async (port: number): Promise<CdpPortBinding> => {
      attempted.push(port);
      const error = new Error('bind failed');
      const assignOptions = { code } as const;
      throw Object.assign(error, assignOptions);
    };
    const acquireOptions4 = { bind, host: '127.0.0.1' } as const;
    const acquireResult4 = allocator.acquire(acquireOptions4);
    const receiver3Actual = acquireResult4;
    const toMatchObjectOptions = {
      code,
      port: 21001,
    } as const;
    await expect(receiver3Actual).rejects.toMatchObject(toMatchObjectOptions);
    const receiver4Actual = attempted;
    const values6: number[] = [21001];
    expect(receiver4Actual).toEqual(values6);
  });
  it('rolls back a failed provisional lease so the same candidate can be retried', async () => {
    const cdpPortAllocatorOptions3 = { start: 22001, end: 22001 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions3);
    const receiver5 = vi.fn<(port: number, host: string) => Promise<CdpPortBinding>>();
    const error2 = new Error('collision');
    const assignOptions2 = { code: systemErrorCodes.EADDRINUSE } as const;
    const assignResult = Object.assign(error2, assignOptions2);
    const receiver6 = receiver5.mockRejectedValueOnce(assignResult);
    const mockResolvedValueOptions: CdpPortBinding = { close: async () => undefined };
    const bind = receiver6.mockResolvedValue(mockResolvedValueOptions);
    const acquireOptions5 = { bind, host: '127.0.0.1' } as const;
    const acquireResult5 = allocator.acquire(acquireOptions5);
    await expect(acquireResult5).rejects.toBeInstanceOf(CdpPortBindError);
    const acquireOptions6 = { bind, host: '127.0.0.1' } as const;
    const lease = await allocator.acquire(acquireOptions6);
    expect(lease.port).toBe(22001);
    expect(bind).toHaveBeenNthCalledWith(1, 22001, '127.0.0.1');
    expect(bind).toHaveBeenNthCalledWith(2, 22001, '127.0.0.1');
    await lease.release();
  });
  it('keeps the port leased until close completes and makes release idempotent', async () => {
    const cdpPortAllocatorOptions4 = { start: 23001, end: 23001 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions4);
    let completeClose: (() => void) | undefined;
    const close = vi.fn(
      async () =>
        await new Promise<void>((resolve) => {
          completeClose = resolve;
        }),
    );
    const bind = vi.fn(async (): Promise<CdpPortBinding> => ({ close }));
    const acquireOptions7 = { bind, host: '127.0.0.1' } as const;
    const lease = await allocator.acquire(acquireOptions7);
    const firstRelease = lease.release();
    const secondRelease = lease.release();
    const acquireOptions8 = { bind, host: '127.0.0.1' } as const;
    const acquireResult6 = allocator.acquire(acquireOptions8);
    await expect(acquireResult6).rejects.toBeInstanceOf(CdpPortPoolExhaustedError);
    completeClose?.();
    const values7: [Promise<void>, Promise<void>] = [firstRelease, secondRelease];
    await Promise.all(values7);
    expect(close).toHaveBeenCalledTimes(1);
    const acquireOptions9 = { bind, host: '127.0.0.1' } as const;
    const reused = await allocator.acquire(acquireOptions9);
    expect(reused.port).toBe(23001);
  });
  it('closes the listener without releasing the process-local reservation', async () => {
    const cdpPortAllocatorOptions5 = { start: 24001, end: 24001 } as const;
    const allocator = new CdpPortAllocator(cdpPortAllocatorOptions5);
    const close = vi.fn(async () => undefined);
    const bind = vi.fn(async (): Promise<CdpPortBinding> => ({ close }));
    const acquireOptions10 = { bind, host: '127.0.0.1' } as const;
    const lease = await allocator.acquire(acquireOptions10);
    await lease.closeBinding();
    const acquireOptions11 = { bind, host: '127.0.0.1' } as const;
    const acquireResult7 = allocator.acquire(acquireOptions11);
    await expect(acquireResult7).rejects.toBeInstanceOf(CdpPortPoolExhaustedError);
    expect(close).toHaveBeenCalledTimes(1);
    await lease.release();
    expect(close).toHaveBeenCalledTimes(1);
    const acquireOptions12 = { bind, host: '127.0.0.1' } as const;
    const reused = await allocator.acquire(acquireOptions12);
    expect(reused.port).toBe(24001);
    await reused.release();
  });
});
