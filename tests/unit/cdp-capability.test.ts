import { describe, expect, it, vi } from 'vitest';

import {
  CDP_CAPABILITY_BYTES,
  generateCdpCapability,
  isCdpCapability,
  matchesCdpCapability,
} from '@/cdp/capability.js';

describe('CDP capability foundations', () => {
  it('requests at least 256 bits and emits one path-safe segment', () => {
    const random = vi.fn((size: number) => Buffer.alloc(size, 0xab));
    const capability = generateCdpCapability(random);

    expect(CDP_CAPABILITY_BYTES).toBeGreaterThanOrEqual(32);
    expect(random).toHaveBeenCalledWith(CDP_CAPABILITY_BYTES);
    expect(capability).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(capability).not.toContain('/');
    expect(isCdpCapability(capability)).toBe(true);
    expect(Buffer.from(capability, 'base64url')).toHaveLength(CDP_CAPABILITY_BYTES);
  });

  it.each([
    undefined,
    '',
    'short',
    'a'.repeat(42),
    'a'.repeat(44),
    `${'a'.repeat(42)}/`,
    `${'a'.repeat(42)}+`,
    'é'.repeat(43),
  ])('rejects malformed capability %j', (value) => {
    expect(isCdpCapability(value)).toBe(false);
  });

  it('matches the current capability and rejects wrong or stale values', () => {
    const current = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 1));
    const stale = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 2));

    expect(matchesCdpCapability(current, current)).toBe(true);
    expect(matchesCdpCapability(current, stale)).toBe(false);
    expect(matchesCdpCapability(current, undefined)).toBe(false);
  });

  it('always invokes the injected equal-length comparison for malformed input', () => {
    const expected = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 1));
    const compare = vi.fn((_left: Uint8Array, _right: Uint8Array): boolean => true);

    expect(matchesCdpCapability(expected, 'malformed', compare)).toBe(false);
    expect(compare).toHaveBeenCalledOnce();
    const [left, right] = compare.mock.calls[0] ?? [];
    expect(left).toHaveLength(CDP_CAPABILITY_BYTES);
    expect(right).toHaveLength(CDP_CAPABILITY_BYTES);
  });
});
