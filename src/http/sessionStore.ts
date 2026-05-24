export type HttpSessionStatus = 'active' | 'closed';

export interface HttpSessionRecord {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  status: HttpSessionStatus;
}

export interface SessionStore {
  create(record: HttpSessionRecord): Promise<void>;
  get(id: string): Promise<HttpSessionRecord | undefined>;
  touch(id: string, now: number, idleTtlMs: number): Promise<HttpSessionRecord | undefined>;
  markClosed(id: string, now: number): Promise<HttpSessionRecord | undefined>;
  countActive(now: number): Promise<number>;
  listExpired(now: number): Promise<HttpSessionRecord[]>;
  list(): Promise<HttpSessionRecord[]>;
  clear(): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  readonly #records = new Map<string, HttpSessionRecord>();

  async create(record: HttpSessionRecord): Promise<void> {
    this.#records.set(record.id, { ...record });
  }

  async get(id: string): Promise<HttpSessionRecord | undefined> {
    const record = this.#records.get(id);
    return record ? { ...record } : undefined;
  }

  async touch(id: string, now: number, idleTtlMs: number): Promise<HttpSessionRecord | undefined> {
    const record = this.#records.get(id);
    if (!record || record.status !== 'active') return undefined;
    const updated = {
      ...record,
      lastSeenAt: now,
      expiresAt: now + idleTtlMs,
    };
    this.#records.set(id, updated);
    return { ...updated };
  }

  async markClosed(id: string, now: number): Promise<HttpSessionRecord | undefined> {
    const record = this.#records.get(id);
    if (!record) return undefined;
    const updated = {
      ...record,
      lastSeenAt: now,
      expiresAt: now,
      status: 'closed' as const,
    };
    this.#records.set(id, updated);
    return { ...updated };
  }

  async countActive(now: number): Promise<number> {
    let count = 0;
    for (const record of this.#records.values()) {
      if (record.status === 'active' && record.expiresAt > now) count += 1;
    }
    return count;
  }

  async listExpired(now: number): Promise<HttpSessionRecord[]> {
    return [...this.#records.values()]
      .filter((record) => record.status === 'active' && record.expiresAt <= now)
      .map((record) => ({ ...record }));
  }

  async list(): Promise<HttpSessionRecord[]> {
    return [...this.#records.values()].map((record) => ({ ...record }));
  }

  async clear(): Promise<void> {
    this.#records.clear();
  }
}

export function createSessionStore(backend: string): SessionStore {
  if (backend === 'memory') return new InMemorySessionStore();
  throw new Error(`Unsupported HTTP session backend "${backend}"`);
}
