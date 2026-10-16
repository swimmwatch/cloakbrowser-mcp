import { createServer, type Server } from 'node:net';
import { expect, it } from 'vitest';
import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
import { reservePortRange } from '@tests/helpers/port-reservation.js';

it('keeps later ports unavailable until their session starts and releases all remaining reservations', async () => {
  const pool = await reservePortRange(3);
  const bound: Server[] = [];
  const collision = { code: systemErrorCodes.EADDRINUSE } as const;
  try {
    const firstCollision = bind(pool.start);
    await expect(firstCollision).rejects.toMatchObject(collision);
    await pool.releaseNext();
    const first = await bind(pool.start);
    bound.push(first);
    const secondPort = pool.start + 1;
    const secondCollision = bind(secondPort);
    await expect(secondCollision).rejects.toMatchObject(collision);
    await pool.releaseNext();
    const second = await bind(secondPort);
    bound.push(second);
    const lastCollision = bind(pool.end);
    await expect(lastCollision).rejects.toMatchObject(collision);
    await pool.close();
    const last = await bind(pool.end);
    bound.push(last);
    await pool.close();
  } finally {
    const closing = bound.map(close);
    await Promise.all(closing);
    await pool.close();
  }
});

const invalidSizes = [0, -1, 1.5, Number.NaN] as const;
it.each(invalidSizes)('rejects invalid reservation size %s without binding', async (size) => {
  const reservation = reservePortRange(size);
  await expect(reservation).rejects.toThrow('positive integer');
});

async function bind(port: number): Promise<Server> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return server;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
