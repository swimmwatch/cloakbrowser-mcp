import { z } from 'zod';

/**
 * Capability flags. Tools declare which capabilities they require; the registry
 * refuses to register a tool whose capability is disabled.
 *
 * Playwright MCP parity tools are registered by default. These flags are kept
 * for project-specific extensions and deployment policy.
 */
export const capabilityFlagsSchema = z.object({
  allowScreenshots: z.boolean().default(true),
  allowPdf: z.boolean().default(false),
  allowUploads: z.boolean().default(false),
  allowFileAccess: z.boolean().default(false),
  allowStorageMutation: z.boolean().default(false),
  allowNetworkInspection: z.boolean().default(false),
  allowNetworkInterception: z.boolean().default(false),
  allowPersistentProfiles: z.boolean().default(false),
  allowDevtoolsExperimental: z.boolean().default(false),
  allowCoordinateInput: z.boolean().default(false),
  allowBinaryInstall: z.boolean().default(false),
});

export type CapabilityFlags = z.infer<typeof capabilityFlagsSchema>;
export type CapabilityKey = keyof CapabilityFlags;

const baseConfigSchema = z.object({
  headless: z.boolean().default(true),
  outputDir: z.string().min(1).default('./artifacts'),
  defaultTimeoutMs: z.number().int().positive().default(5_000),
  navigationTimeoutMs: z.number().int().positive().default(60_000),
  maxPages: z.number().int().positive().default(10),
  maxContexts: z.number().int().positive().default(2),
  allowedOrigins: z.array(z.string()).optional(),
  blockedOrigins: z.array(z.string()).default([]),
  userDataDir: z.string().optional(),
  browserExecutablePath: z.string().optional(),
  logLevel: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info'),
  capabilities: capabilityFlagsSchema.default({}),
});

export const configSchema = baseConfigSchema.superRefine((config, ctx) => {
  if (config.userDataDir && !config.capabilities.allowPersistentProfiles) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['userDataDir'],
      message: 'userDataDir requires the allowPersistentProfiles capability',
    });
  }
});

export type ResolvedConfig = z.infer<typeof configSchema>;

/** Public defaults useful for tests and CLI help. */
export const DEFAULT_CONFIG: ResolvedConfig = configSchema.parse({});
