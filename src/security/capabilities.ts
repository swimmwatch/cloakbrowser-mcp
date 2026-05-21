import { CloakMcpError } from '@/errors/index.js';
import type { CapabilityFlags, CapabilityKey, ResolvedConfig } from '@/config/schema.js';

/** Throws if any of the listed capabilities is disabled. */
export function requireCapabilities(caps: CapabilityFlags, required: readonly CapabilityKey[]): void {
  const missing = required.filter((k) => !caps[k]);
  if (missing.length === 0) return;
  throw new CloakMcpError('CAPABILITY_DENIED', `capability not enabled: ${missing.join(', ')}`, { missing });
}

/** Returns subset of caps that are currently true. Useful for diagnostics. */
export function enabledCapabilities(caps: CapabilityFlags): CapabilityKey[] {
  return (Object.keys(caps) as CapabilityKey[]).filter((k) => caps[k]);
}

/** Returns capability flags with all unknown keys stripped — used at config boundary. */
export function snapshotCapabilities(config: ResolvedConfig): CapabilityFlags {
  return { ...config.capabilities };
}
