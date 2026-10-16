import { createHash } from 'node:crypto';
import type { LoadHook } from 'node:module';
let helpersUrl: string | undefined;
let worldUrl: string | undefined;
let engineUrl: string | undefined;
export function initialize(data: { helpersUrl: string; worldUrl: string; engineUrl?: string }): void {
  helpersUrl = data.helpersUrl;
  worldUrl = data.worldUrl;
  engineUrl = data.engineUrl;
}
const helperHashes = [
  '3b698b81b3ceb5dc400237b088eb80178fbbc3ce6ab0fcf84ce3d83041913919',
  '189fb94cf919c1c6993adf7d5868f87f0e9288e4cf1e16c1c15c41d98d47525d',
  '4e2737cf9342924e31f44bdd9eb4f6d80b24f13c57605722613d447f44c2166d',
  'd00c1b498782e11b6e422af4d674967fc9c45c7b2019e9b7ddc9cd1ea49d5451',
] as const;
const worldHashes = ['2949df4184c14d6022bac0f552d0428481ab199fb7658e4ed584e96071d81258'] as const;
const engineHashes = [
  'fc4aafe8f6f45a3f349aa1644fb832f012bf1e4bc9229aa83a01ad7da70e447b',
  '1800523fa80680c07053667824566cff46a84fc33c7268f8d6e1652c0d0bcd02',
] as const;
function requireSource(source: string, hashes: readonly string[]): void {
  const actualHash = createHash('sha256').update(source).digest('hex');
  if (!hashes.includes(actualHash)) {
    throw new Error('CloakBrowser humanize source does not match the verified compatibility patch');
  }
}
// Patch only the verified dependency sources; never write to node_modules.
export function patchHelpers(source: string): string {
  requireSource(source, helperHashes);
  return source
    .replace(
      "const els = new Map(); let seq = 0;\nconst put = (e) => { const id = ++seq; els.set(id, e); return id; };\nconst get = (id) => { const e = els.get(id); if (!e) throw new Error('cloak:stale-element'); return e; };",
      `const els = new Map(); const ids = new WeakMap(); let seq = 0;
const collected = new FinalizationRegistry((id) => els.delete(id));
const put = (e) => {
  const existing = ids.get(e); if (existing !== undefined) return existing;
  const id = ++seq; ids.set(e, id); const ref = new WeakRef(e); els.set(id, ref); collected.register(e, id); return id;
};
const get = (id) => { const e = els.get(id)?.deref(); if (!e) throw new Error('cloak:stale-element'); return e; };`,
    )
    .replace(
      'async states(id, states) {\n    const e = get(id);',
      "async states(id, states, frameVisible) {\n    const e = get(id);\n    if (!frameVisible && states.includes('visible')) return { missing: 'visible' };",
    )
    .replace('I.checkElementStates(e, states, true)', 'I.checkElementStates(e, states, frameVisible)')
    .replace('I.checkElementStates(e, states)', 'I.checkElementStates(e, states, frameVisible)')
    .replace('I.elementState(e, s, true)', 'I.elementState(e, s, frameVisible)')
    .replace('I.elementState(e, s)', 'I.elementState(e, s, frameVisible)');
}
export function patchWorld(source: string): string {
  requireSource(source, worldHashes);
  return source.replace(
    '    call(frame, method, ...args) {',
    `    async call(frame, method, ...args) {
        if (method === 'states') {
            let frameVisible = true;
            for (let current = frame; current.parentFrame(); current = current.parentFrame()) {
                const owner = await current.frameElement();
                try {
                    if (!(await owner.isVisible())) { frameVisible = false; break; }
                } finally {
                    await owner.dispose();
                }
            }
            args.push(frameVisible);
        }`,
  );
}
export function patchEngine(source: string): string {
  requireSource(source, engineHashes);
  return source.replace(
    "        await sleepMs(rand(80, 200));\n        const current = fields.datetimeParts(inputType, (await this.worlds.call(r.frame, 'value', r.id)) || '');",
    `        await sleepMs(rand(80, 200));
        // A native editor can focus a later segment on its first click.
        for (let index = 1; index < segs.length; index++) {
            await this.raw.keyPress('ArrowLeft');
        }
        const current = fields.datetimeParts(inputType, (await this.worlds.call(r.frame, 'value', r.id)) || '');`,
  );
}
export const load: LoadHook = async (url, context, nextLoad) => {
  const result = await nextLoad(url, context);
  if (url !== helpersUrl && url !== worldUrl && url !== engineUrl) return result;
  if (result.source === undefined || result.source === null) {
    throw new Error('CloakBrowser humanize source is unavailable for the compatibility patch');
  }
  const source = typeof result.source === 'string' ? result.source : new TextDecoder().decode(result.source);
  if (url === helpersUrl) return { ...result, source: patchHelpers(source) };
  if (url === worldUrl) return { ...result, source: patchWorld(source) };
  return { ...result, source: patchEngine(source) };
};
