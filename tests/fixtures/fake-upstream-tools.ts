import { readFileSync } from 'node:fs';

export const fakeUpstreamToolNames = Object.freeze(
  JSON.parse(readFileSync(new URL('./fake-upstream-tools.json', import.meta.url), 'utf8')) as string[],
);
