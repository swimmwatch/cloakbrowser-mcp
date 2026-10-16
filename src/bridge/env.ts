export type EnvReader = Readonly<Record<string, string | undefined>>;
export function envString(env: EnvReader, name: string, fallback: string): string {
  return env[name] ?? fallback;
}
export function envBool(env: EnvReader, name: string, fallback: boolean): boolean {
  const value = env[name];
  if (value === undefined) return fallback;
  const receiver = ['1', 'true', 'yes', 'on'];
  const toLowerCaseResult = value.toLowerCase();
  return receiver.includes(toLowerCaseResult);
}
export function envInt(env: EnvReader, name: string, fallback: number): number {
  const value = env[name];
  if (value === undefined || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    const message = `${name} must be an integer, got "${value}"`;
    throw new Error(message);
  }
  return parsed;
}
export function envList(env: EnvReader, name: string, fallback = ''): string[] {
  const raw = env[name] ?? fallback;
  if (!raw.trim()) return [];
  if (raw.trim().startsWith('[')) {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed))
      throw (() => {
        const message2 = `${name} must be a JSON string array`;
        return new Error(message2);
      })();
    const result: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') {
        const message3 = `${name} must be a JSON string array`;
        throw new Error(message3);
      }
      result.push(item);
    }
    return result;
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
export function appendNodeOption(existing: string | undefined, option: string): string {
  return existing ? `${existing} ${option}` : option;
}
export function quoteNodeOptionValue(value: string): string {
  return /\s/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
