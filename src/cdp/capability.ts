import { randomBytes, timingSafeEqual } from 'node:crypto';

export const CDP_CAPABILITY_BYTES = 32;

const encodedCapabilityLength = 43;
const encodedCapabilityPattern = /^[A-Za-z0-9_-]{43}$/u;

export type CdpCapabilityComparator = (left: Uint8Array, right: Uint8Array) => boolean;
export type CdpCapabilityRandomSource = (size: number) => Uint8Array;

export class CdpCapabilityError extends Error {}

export function generateCdpCapability(randomSource: CdpCapabilityRandomSource = randomBytes): string {
  const bytes = Buffer.from(randomSource(CDP_CAPABILITY_BYTES));
  if (bytes.byteLength !== CDP_CAPABILITY_BYTES) {
    throw new CdpCapabilityError(`CDP capability source must return exactly ${CDP_CAPABILITY_BYTES} bytes`);
  }
  return bytes.toString('base64url');
}

export function isCdpCapability(value: string | undefined): boolean {
  return decodeCapability(value).valid;
}

export function matchesCdpCapability(
  expected: string,
  presented: string | undefined,
  compare: CdpCapabilityComparator = timingSafeEqual,
): boolean {
  const expectedCapability = decodeCapability(expected);
  const presentedCapability = decodeCapability(presented);
  const equal = compare(expectedCapability.bytes, presentedCapability.bytes);
  return expectedCapability.valid && presentedCapability.valid && equal;
}

interface DecodedCapability {
  bytes: Uint8Array;
  valid: boolean;
}

function decodeCapability(value: string | undefined): DecodedCapability {
  if (
    value === undefined ||
    value.length !== encodedCapabilityLength ||
    !encodedCapabilityPattern.test(value)
  ) {
    return invalidCapability();
  }

  const bytes = Buffer.from(value, 'base64url');
  if (bytes.byteLength !== CDP_CAPABILITY_BYTES || bytes.toString('base64url') !== value) {
    return invalidCapability();
  }
  return { bytes, valid: true };
}

function invalidCapability(): DecodedCapability {
  return { bytes: new Uint8Array(CDP_CAPABILITY_BYTES), valid: false };
}
