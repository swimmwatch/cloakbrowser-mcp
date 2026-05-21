import { describe, expect, it } from 'vitest';
import { configSchema } from '@/config/schema.js';
import { requireCapabilities, enabledCapabilities } from '@/security/capabilities.js';
import { isCloakMcpError } from '@/errors/index.js';

describe('capability gates', () => {
  const cfg = configSchema.parse({});

  it('allows when all required flags are on', () => {
    expect(() =>
      requireCapabilities({ ...cfg.capabilities, allowScreenshots: true }, ['allowScreenshots']),
    ).not.toThrow();
  });

  it('throws CAPABILITY_DENIED when a required flag is off', () => {
    try {
      requireCapabilities(cfg.capabilities, ['allowPdf']);
      expect.fail('should have thrown');
    } catch (e) {
      expect(isCloakMcpError(e)).toBe(true);
      if (isCloakMcpError(e)) {
        expect(e.code).toBe('CAPABILITY_DENIED');
        expect(e.details?.missing).toEqual(['allowPdf']);
      }
    }
  });

  it('reports enabled capabilities snapshot', () => {
    const enabled = enabledCapabilities({ ...cfg.capabilities, allowPdf: true });
    expect(enabled).toContain('allowScreenshots');
    expect(enabled).toContain('allowPdf');
    expect(enabled).not.toContain('allowUploads');
  });
});
