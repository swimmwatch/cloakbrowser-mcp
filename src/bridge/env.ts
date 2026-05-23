export type EnvReader = Readonly<Record<string, string | undefined>>;

export function envString(env: EnvReader, name: string, fallback: string): string {
  return env[name] ?? fallback;
}

export function envBool(env: EnvReader, name: string, fallback: boolean): boolean {
  const value = env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function envInt(env: EnvReader, name: string, fallback: number): number {
  const value = env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer, got "${value}"`);
  return parsed;
}

export function envList(env: EnvReader, name: string, fallback = ''): string[] {
  const raw = env[name] ?? fallback;
  if (!raw.trim()) return [];
  if (raw.trim().startsWith('[')) {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      throw new Error(`${name} must be a JSON string array`);
    }
    return parsed;
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function appendNodeOption(existing: string | undefined, option: string): string {
  return existing ? `${existing} ${option}` : option;
}
