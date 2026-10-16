import { describe, expect, it, vi } from 'vitest';
import {
  CDP_CAPABILITY_BYTES,
  CdpCapabilityError,
  generateCdpCapability,
  isCdpCapability,
  matchesCdpCapability,
} from '@/cdp/capability.js';
describe('CDP capability foundations', () => {
  const invalidSizes = [CDP_CAPABILITY_BYTES - 1, CDP_CAPABILITY_BYTES + 1];
  it.each(invalidSizes)('rejects a random source returning %i bytes', (size) => {
    const bytes = Buffer.alloc(size);
    const random = () => bytes;
    const generate = () => generateCdpCapability(random);
    expect(generate).toThrow(CdpCapabilityError);
    const message = `exactly ${CDP_CAPABILITY_BYTES} bytes`;
    expect(generate).toThrow(message);
  });
  it('rejects noncanonical trailing bits even when the decoded bytes match', () => {
    const bytes = Buffer.alloc(CDP_CAPABILITY_BYTES);
    const canonical = bytes.toString('base64url');
    const noncanonical = `${canonical.slice(0, -1)}B`;
    const decoded = Buffer.from(noncanonical, 'base64url');
    expect(decoded).toEqual(bytes);
    const valid = isCdpCapability(noncanonical);
    const match = matchesCdpCapability(canonical, noncanonical);
    expect(valid).toBe(false);
    expect(match).toBe(false);
  });
  it('never authenticates an invalid expected capability even if comparison succeeds', () => {
    const bytes = Buffer.alloc(CDP_CAPABILITY_BYTES);
    const current = bytes.toString('base64url');
    const compare = vi.fn(() => true);
    const match = matchesCdpCapability('invalid', current, compare);
    expect(match).toBe(false);
    expect(compare).toHaveBeenCalledOnce();
  });
  it('requests at least 256 bits and emits one path-safe segment', () => {
    const random = vi.fn((size: number) => Buffer.alloc(size, 0xab));
    const capability = generateCdpCapability(random);
    expect(CDP_CAPABILITY_BYTES).toBeGreaterThanOrEqual(32);
    expect(random).toHaveBeenCalledWith(CDP_CAPABILITY_BYTES);
    expect(capability).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(capability).not.toContain('/');
    const isCdpCapabilityResult = isCdpCapability(capability);
    expect(isCdpCapabilityResult).toBe(true);
    const fromResult = Buffer.from(capability, 'base64url');
    expect(fromResult).toHaveLength(CDP_CAPABILITY_BYTES);
  });
  const values: readonly (string | undefined)[] = [
    undefined,
    '',
    'short',
    'a'.repeat(42),
    'a'.repeat(44),
    `${'a'.repeat(42)}/`,
    `${'a'.repeat(42)}+`,
    'é'.repeat(43),
  ];
  it.each(values)('rejects malformed capability %j', (value) => {
    const isCdpCapabilityResult2 = isCdpCapability(value);
    expect(isCdpCapabilityResult2).toBe(false);
  });
  it('matches the current capability and rejects wrong or stale values', () => {
    const current = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 1));
    const stale = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 2));
    const matchesCdpCapabilityResult = matchesCdpCapability(current, current);
    expect(matchesCdpCapabilityResult).toBe(true);
    const matchesCdpCapabilityResult2 = matchesCdpCapability(current, stale);
    expect(matchesCdpCapabilityResult2).toBe(false);
    const matchesCdpCapabilityResult3 = matchesCdpCapability(current, undefined);
    expect(matchesCdpCapabilityResult3).toBe(false);
  });
  it('always invokes the injected equal-length comparison for malformed input', () => {
    const expected = generateCdpCapability(() => Buffer.alloc(CDP_CAPABILITY_BYTES, 1));
    const compare = vi.fn((_left: Uint8Array, _right: Uint8Array): boolean => true);
    const matchesCdpCapabilityResult4 = matchesCdpCapability(expected, 'malformed', compare);
    expect(matchesCdpCapabilityResult4).toBe(false);
    expect(compare).toHaveBeenCalledOnce();
    const [left, right] = compare.mock.calls[0] ?? [];
    expect(left).toHaveLength(CDP_CAPABILITY_BYTES);
    expect(right).toHaveLength(CDP_CAPABILITY_BYTES);
  });
});
