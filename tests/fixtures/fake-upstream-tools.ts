import { readFileSync } from 'node:fs';
const uRL = new URL('./fake-upstream-tools.json', import.meta.url);
const fileSyncResult = readFileSync(uRL, 'utf8');
const parsedValue = JSON.parse(fileSyncResult) as string[];
export const fakeUpstreamToolNames = Object.freeze(parsedValue);
