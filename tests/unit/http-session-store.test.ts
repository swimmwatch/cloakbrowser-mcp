import { describe, expect, it } from 'vitest';
import { HTTP_SESSION_BACKEND_MEMORY } from '@/http/options.js';
import {
  createSessionStore,
  HTTP_SESSION_STATUS_ACTIVE,
  HTTP_SESSION_STATUS_CLOSED,
  InMemorySessionStore,
} from '@/http/sessionStore.js';
describe('HTTP session store', () => {
  it('creates, touches, expires, and closes session metadata', async () => {
    const store = new InMemorySessionStore();
    const createOptions = {
      id: 'session-1',
      createdAt: 1000,
      lastSeenAt: 1000,
      expiresAt: 2000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    } as const;
    await store.create(createOptions);
    const countActiveResult = await store.countActive(1500);
    expect(countActiveResult).toBe(1);
    const listExpiredResult = await store.listExpired(2500);
    const receiverActual = listExpiredResult;
    const values: { id: string }[] = [{ id: 'session-1' }];
    expect(receiverActual).toMatchObject(values);
    await store.touch('session-1', 3000, 1000);
    const result: import('@/http/sessionStore.js').HttpSessionRecord | undefined =
      await store.get('session-1');
    const receiver2Actual = result;
    const toMatchObjectOptions = {
      lastSeenAt: 3000,
      expiresAt: 4000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    } as const;
    expect(receiver2Actual).toMatchObject(toMatchObjectOptions);
    await store.markClosed('session-1', 3500);
    const result2: import('@/http/sessionStore.js').HttpSessionRecord | undefined =
      await store.get('session-1');
    const receiver3Actual = result2;
    const toMatchObjectOptions2 = {
      expiresAt: 3500,
      status: HTTP_SESSION_STATUS_CLOSED,
    } as const;
    expect(receiver3Actual).toMatchObject(toMatchObjectOptions2);
    const countActiveResult2 = await store.countActive(3500);
    expect(countActiveResult2).toBe(0);
    const listResult = await store.list();
    const receiver4Actual = listResult;
    const objectContainingOptions = {
      id: 'session-1',
      status: HTTP_SESSION_STATUS_CLOSED,
    } as const;
    const objectContainingResult = expect.objectContaining(objectContainingOptions);
    const values2 = [objectContainingResult];
    expect(receiver4Actual).toEqual(values2);
  });
  it('lists active and closed session records as defensive copies', async () => {
    const store = new InMemorySessionStore();
    const createOptions2 = {
      id: 'session-1',
      createdAt: 1000,
      lastSeenAt: 1000,
      expiresAt: 2000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    } as const;
    await store.create(createOptions2);
    const createOptions3 = {
      id: 'session-2',
      createdAt: 2000,
      lastSeenAt: 2000,
      expiresAt: 3000,
      status: HTTP_SESSION_STATUS_ACTIVE,
    } as const;
    await store.create(createOptions3);
    await store.markClosed('session-2', 2500);
    const records = await store.list();
    const mappedValues = records.map((record) => [record.id, record.status]);
    const receiver5Actual = mappedValues;
    const values3: string[][] = [
      ['session-1', HTTP_SESSION_STATUS_ACTIVE],
      ['session-2', HTTP_SESSION_STATUS_CLOSED],
    ];
    expect(receiver5Actual).toEqual(values3);
    records[0]!.status = HTTP_SESSION_STATUS_CLOSED;
    const result3: import('@/http/sessionStore.js').HttpSessionRecord | undefined =
      await store.get('session-1');
    const receiver6Actual = result3;
    const toMatchObjectOptions3 = {
      status: HTTP_SESSION_STATUS_ACTIVE,
    } as const;
    expect(receiver6Actual).toMatchObject(toMatchObjectOptions3);
  });
  it('constructs only the memory backend in this release', () => {
    const sessionStoreResult = createSessionStore(HTTP_SESSION_BACKEND_MEMORY);
    expect(sessionStoreResult).toBeInstanceOf(InMemorySessionStore);
    expect(() => createSessionStore('sqlite')).toThrow('Unsupported HTTP session backend');
  });
});
