import { CloakMcpError } from '@/errors/index.js';
import { coreConfigEnvMap } from './options.js';
import { capabilityFlagsSchema, configSchema, type ResolvedConfig } from './schema.js';

/** Parsed CLI args. Booleans accept --flag and --no-flag. */
export interface CliArgs {
  headless?: boolean;
  outputDir?: string;
  defaultTimeoutMs?: number;
  navigationTimeoutMs?: number;
  maxPages?: number;
  maxContexts?: number;
  allowedOrigins?: string[];
  blockedOrigins?: string[];
  userDataDir?: string;
  browserExecutablePath?: string;
  logLevel?: string;
  capabilities?: Partial<Record<string, boolean>>;
}

type EnvLike = Record<string, string | undefined>;

const CAP_PREFIX = 'CLOAKBROWSER_MCP_CAP_';
const ENV_MAP = coreConfigEnvMap satisfies readonly (readonly [string, keyof CliArgs])[];

function parseBool(value: string): boolean {
  const v = value.toLowerCase().trim();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  throw new CloakMcpError('INVALID_INPUT', `expected boolean value, got "${value}"`);
}

function parseInt10(value: string, name: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) throw new CloakMcpError('INVALID_INPUT', `${name} must be an integer`);
  return n;
}

const BOOL_KEYS = new Set<keyof CliArgs>(['headless']);
const INT_KEYS = new Set<keyof CliArgs>([
  'defaultTimeoutMs',
  'navigationTimeoutMs',
  'maxPages',
  'maxContexts',
]);
const LIST_KEYS = new Set<keyof CliArgs>(['allowedOrigins', 'blockedOrigins']);

export function loadFromEnv(env: EnvLike = process.env): CliArgs {
  const out: CliArgs = {};
  for (const [envKey, argKey] of ENV_MAP) {
    const raw = env[envKey];
    if (raw === undefined) continue;
    if (BOOL_KEYS.has(argKey)) (out as Record<string, unknown>)[argKey] = parseBool(raw);
    else if (INT_KEYS.has(argKey)) (out as Record<string, unknown>)[argKey] = parseInt10(raw, envKey);
    else if (LIST_KEYS.has(argKey))
      (out as Record<string, unknown>)[argKey] = raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    else (out as Record<string, unknown>)[argKey] = raw;
  }
  const caps: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(env)) {
    if (!k.startsWith(CAP_PREFIX) || v === undefined) continue;
    const capName = toCamel(k.slice(CAP_PREFIX.length).toLowerCase());
    caps[capName] = parseBool(v);
  }
  if (Object.keys(caps).length > 0) out.capabilities = caps;
  return out;
}

function toCamel(snake: string): string {
  return snake.replace(/[-_]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Minimal argv parser. Supports:
 *   --flag        boolean true
 *   --no-flag     boolean false
 *   --key value   string/number
 *   --key=value   string/number
 *   --cap-<name>  capability flag (true) / --no-cap-<name>
 */
export function parseArgv(argv: string[]): CliArgs {
  const out: CliArgs = {};
  const caps: Record<string, boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === undefined || !tok.startsWith('--')) continue;
    let key: string;
    let value: string | undefined;
    const eq = tok.indexOf('=');
    if (eq >= 0) {
      key = tok.slice(2, eq);
      value = tok.slice(eq + 1);
    } else {
      key = tok.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        value = next;
        i += 1;
      }
    }
    const negate = key.startsWith('no-');
    const normalised = negate ? key.slice(3) : key;

    if (normalised.startsWith('cap-')) {
      caps[toCamel(normalised.slice(4))] = !negate;
      continue;
    }

    const argKey = toCamel(normalised) as keyof CliArgs;
    if (BOOL_KEYS.has(argKey)) {
      (out as Record<string, unknown>)[argKey] = !negate;
    } else if (value === undefined) {
      throw new CloakMcpError('INVALID_INPUT', `--${key} requires a value`);
    } else if (INT_KEYS.has(argKey)) {
      (out as Record<string, unknown>)[argKey] = parseInt10(value, `--${key}`);
    } else if (LIST_KEYS.has(argKey)) {
      (out as Record<string, unknown>)[argKey] = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      (out as Record<string, unknown>)[argKey] = value;
    }
  }
  if (Object.keys(caps).length > 0) out.capabilities = caps;
  return out;
}

function merge(...layers: CliArgs[]): CliArgs {
  const merged: CliArgs = {};
  const caps: Record<string, boolean> = {};
  for (const l of layers) {
    for (const [k, v] of Object.entries(l)) {
      if (v === undefined) continue;
      if (k === 'capabilities' && v && typeof v === 'object') {
        Object.assign(caps, v);
        continue;
      }
      (merged as Record<string, unknown>)[k] = v;
    }
  }
  if (Object.keys(caps).length > 0) merged.capabilities = caps;
  return merged;
}

/** Combine layers (defaults < env < cli) and validate via zod. */
export function loadConfig(opts: { argv?: string[]; cliArgs?: CliArgs; env?: EnvLike } = {}): ResolvedConfig {
  const envArgs = loadFromEnv(opts.env);
  const cliArgs = opts.cliArgs ?? (opts.argv ? parseArgv(opts.argv) : {});
  const merged = merge(envArgs, cliArgs);

  const capabilities = merged.capabilities ? capabilityFlagsSchema.parse(merged.capabilities) : undefined;

  const parsed = configSchema.parse({
    ...merged,
    ...(capabilities ? { capabilities } : {}),
  });
  return parsed;
}
