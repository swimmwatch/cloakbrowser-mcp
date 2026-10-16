import { constants } from 'node:os';
import { getSystemErrorMap } from 'node:util';
const argumentValue = [...Object.keys(constants.errno)];
const valuesResult = getSystemErrorMap().values();
const argumentValue2 = [...Array.from(valuesResult, ([name]) => name)];
const values2: Iterable<string> | null | undefined = [...argumentValue, ...argumentValue2];
// Use names, not native errno numbers: Node exposes libuv names in error.code.
const names = new Set(values2);
const fromResult = Array.from(names, (name) => [name, name]);
const codes = Object.fromEntries(fromResult) as {
  readonly [Name in keyof typeof constants.errno]: Name;
};
const freezeOptions = {
  ...codes,
  // Preserve the POSIX alias even on platforms where Node only exposes ENOTSUP.
  EOPNOTSUPP: codes.EOPNOTSUPP ?? 'EOPNOTSUPP',
} as const;
export const systemErrorCodes = Object.freeze(freezeOptions);
