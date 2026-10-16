import { createServer, type Server } from 'node:net';
import { systemErrorCodes } from '@/runtime/systemErrorCodes.js';
const maximumTcpPort = 65535;

export interface ReservedPortRange {
  start: number;
  end: number;
  releaseNext(): Promise<void>;
  close(): Promise<void>;
}

/** Keep later candidates occupied while earlier CDP sessions bootstrap. */
export async function reservePortRange(size: number): Promise<ReservedPortRange> {
  if (!Number.isInteger(size) || size < 1 || size > maximumTcpPort) {
    throw new Error('Port reservation size must be a positive integer within the TCP port range');
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const reservations: Server[] = [];
    try {
      const first = createServer();
      reservations.push(first);
      await listen(first, 0);
      const address = first.address();
      if (!address || typeof address === 'string') throw new Error('Port reservation did not bind TCP');
      const start = address.port;
      const end = start + size - 1;
      if (end > maximumTcpPort) {
        await closeServer(first);
        continue;
      }
      for (let offset = 1; offset < size; offset += 1) {
        const server = createServer();
        reservations.push(server);
        const port = start + offset;
        await listen(server, port);
      }
      return {
        start,
        end,
        releaseNext: async () => {
          const server = reservations[0];
          if (!server) throw new Error('No reserved CDP port remains');
          await closeServer(server);
          reservations.shift();
        },
        close: async () => {
          const closing = reservations.map(closeServer);
          const results = await Promise.allSettled(closing);
          reservations.length = 0;
          const errors: unknown[] = [];
          for (const result of results) {
            if (result.status === 'rejected') errors.push(result.reason);
          }
          if (errors.length) throw new AggregateError(errors, 'Port reservation cleanup failed');
        },
      };
    } catch (error) {
      const closing = reservations.map(closeServer);
      await Promise.all(closing);
      if (!(error instanceof Error && 'code' in error && error.code === systemErrorCodes.EADDRINUSE))
        throw error;
    }
  }
  throw new Error('Unable to reserve a contiguous CDP port range');
}

async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
}

async function closeServer(server: Server): Promise<void> {
  if (!server.listening) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
