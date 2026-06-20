import { describe, expect, it } from 'vitest';
import { HTTP_SESSION_BACKEND_MEMORY } from '@/http/options.js';
import {
  HTTP_SESSION_STATUS_ACTIVE,
  HTTP_SESSION_STATUS_CLOSED,
  InMemorySessionStore,
  createSessionStore,
} from '@/http/sessionStore.js';

describe('HTTP session store', () => {
  it('creates, touches, expires, and closes session metadata', async () => {
    const store = new InMemorySessionStore();
    await store.create({
      id: 'session-1',
      createdAt: 1000,
      lastSeenAt: 1000,
      expiresAt: 2000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    });

    expect(await store.countActive(1500)).toBe(1);
    expect(await store.listExpired(2500)).toMatchObject([{ id: 'session-1' }]);

    await store.touch('session-1', 3000, 1000);
    expect(await store.get('session-1')).toMatchObject({
      lastSeenAt: 3000,
      expiresAt: 4000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    });

    await store.markClosed('session-1', 3500);
    expect(await store.get('session-1')).toMatchObject({
      expiresAt: 3500,
      status: HTTP_SESSION_STATUS_CLOSED,
    });
    expect(await store.countActive(3500)).toBe(0);
  });

  it('constructs only the memory backend in this release', () => {
    expect(createSessionStore(HTTP_SESSION_BACKEND_MEMORY)).toBeInstanceOf(InMemorySessionStore);
    expect(() => createSessionStore('sqlite')).toThrow('Unsupported HTTP session backend');
  });
});
