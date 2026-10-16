import { createServer, Server } from 'node:net';
import { expect, it, vi } from 'vitest';
import { reservePortRange } from '@tests/helpers/port-reservation.js';

vi.mock('node:net', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:net')>();
  return { ...original, createServer: vi.fn(original.createServer) };
});

it('closes an overflowing candidate before reserving a new contiguous range', async () => {
  const first = new Server();
  const address = { address: '127.0.0.1', family: 'IPv4', port: 65535 } as const;
  vi.spyOn(first, 'address').mockReturnValue(address);
  vi.mocked(createServer).mockReturnValueOnce(first);
  const pool = await reservePortRange(2);
  try {
    expect(first.listening).toBe(false);
    expect(pool.end).toBeLessThanOrEqual(address.port);
    const expectedEnd = pool.start + 1;
    expect(pool.end).toBe(expectedEnd);
  } finally {
    await pool.close();
    vi.restoreAllMocks();
  }
});
