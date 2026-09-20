import { describe, expect, it, vi } from 'vitest';

import {
  CdpPortAllocator,
  CdpPortBindError,
  type CdpPortBinding,
  CdpPortPoolExhaustedError,
} from '@/cdp/allocator.js';

describe('CDP port allocator', () => {
  it('leases available ports atomically in ascending order and reports exhaustion', async () => {
    const allocator = new CdpPortAllocator({ start: 20_001, end: 20_002 });
    const ports: number[] = [];
    const bind = async (port: number): Promise<CdpPortBinding> => {
      ports.push(port);
      return { close: async () => undefined };
    };

    const [first, second] = await Promise.all([
      allocator.acquire({ bind, host: '127.0.0.1' }),
      allocator.acquire({ bind, host: '127.0.0.1' }),
    ]);

    expect([first.port, second.port].sort((left, right) => left - right)).toEqual([20_001, 20_002]);
    expect(ports.sort((left, right) => left - right)).toEqual([20_001, 20_002]);
    await expect(allocator.acquire({ bind, host: '127.0.0.1' })).rejects.toBeInstanceOf(
      CdpPortPoolExhaustedError,
    );

    await Promise.all([first.release(), second.release()]);
  });

  it.each(['EADDRINUSE', 'EACCES'])('fails immediately on bind error %s without scanning', async (code) => {
    const allocator = new CdpPortAllocator({ start: 21_001, end: 21_002 });
    const attempted: number[] = [];
    const bind = async (port: number): Promise<CdpPortBinding> => {
      attempted.push(port);
      throw Object.assign(new Error('bind failed'), { code });
    };

    await expect(allocator.acquire({ bind, host: '127.0.0.1' })).rejects.toMatchObject({
      code,
      port: 21_001,
    });
    expect(attempted).toEqual([21_001]);
  });

  it('rolls back a failed provisional lease so the same candidate can be retried', async () => {
    const allocator = new CdpPortAllocator({ start: 22_001, end: 22_001 });
    const bind = vi
      .fn<(port: number, host: string) => Promise<CdpPortBinding>>()
      .mockRejectedValueOnce(Object.assign(new Error('collision'), { code: 'EADDRINUSE' }))
      .mockResolvedValue({ close: async () => undefined });

    await expect(allocator.acquire({ bind, host: '127.0.0.1' })).rejects.toBeInstanceOf(CdpPortBindError);
    const lease = await allocator.acquire({ bind, host: '127.0.0.1' });

    expect(lease.port).toBe(22_001);
    expect(bind).toHaveBeenNthCalledWith(1, 22_001, '127.0.0.1');
    expect(bind).toHaveBeenNthCalledWith(2, 22_001, '127.0.0.1');
    await lease.release();
  });

  it('keeps the port leased until close completes and makes release idempotent', async () => {
    const allocator = new CdpPortAllocator({ start: 23_001, end: 23_001 });
    let completeClose: (() => void) | undefined;
    const close = vi.fn(
      async () =>
        await new Promise<void>((resolve) => {
          completeClose = resolve;
        }),
    );
    const bind = vi.fn(async (): Promise<CdpPortBinding> => ({ close }));
    const lease = await allocator.acquire({ bind, host: '127.0.0.1' });

    const firstRelease = lease.release();
    const secondRelease = lease.release();
    await expect(allocator.acquire({ bind, host: '127.0.0.1' })).rejects.toBeInstanceOf(
      CdpPortPoolExhaustedError,
    );

    completeClose?.();
    await Promise.all([firstRelease, secondRelease]);
    expect(close).toHaveBeenCalledTimes(1);

    const reused = await allocator.acquire({ bind, host: '127.0.0.1' });
    expect(reused.port).toBe(23_001);
  });

  it('closes the listener without releasing the process-local reservation', async () => {
    const allocator = new CdpPortAllocator({ start: 24_001, end: 24_001 });
    const close = vi.fn(async () => undefined);
    const bind = vi.fn(async (): Promise<CdpPortBinding> => ({ close }));
    const lease = await allocator.acquire({ bind, host: '127.0.0.1' });

    await lease.closeBinding();
    await expect(allocator.acquire({ bind, host: '127.0.0.1' })).rejects.toBeInstanceOf(
      CdpPortPoolExhaustedError,
    );
    expect(close).toHaveBeenCalledTimes(1);

    await lease.release();
    expect(close).toHaveBeenCalledTimes(1);
    const reused = await allocator.acquire({ bind, host: '127.0.0.1' });
    expect(reused.port).toBe(24_001);
    await reused.release();
  });
});
