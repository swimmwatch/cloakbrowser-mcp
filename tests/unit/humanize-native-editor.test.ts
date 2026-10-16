import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { patchEngine } from '@/runtime/humanizeCompatibilityLoader.js';

const require = createRequire(import.meta.url);
const entry = require.resolve('cloakbrowser');
const directory = path.dirname(entry);
const enginePath = path.join(directory, 'human', 'engine.js');
const fieldsPath = path.join(directory, 'human', 'fields.js');
const engine = readFileSync(enginePath, 'utf8');
const fieldSource = readFileSync(fieldsPath, 'utf8');
type Parts = Record<string, string | number>;
interface FieldHelpers {
  datetimeParts(inputType: string, value: string): Parts | null;
  use24h(parts: Parts, hasAmpm: boolean): Parts;
}
const fieldExpression = `${fieldSource.replaceAll('export ', '')}\n({ datetimeParts, use24h, segmentAutoAdvances });`;
const fields = runInNewContext(fieldExpression) as FieldHelpers;
type SetDatetime = (...args: unknown[]) => Promise<void>;

function setDatetimeFrom(source: string): SetDatetime {
  const executable = source.replace(/^import .*$/gmu, '').replaceAll('export ', '');
  const expression = `${executable}\nHuman.prototype.setDatetime;`;
  const context = { fields, rand: () => 0, sleep: async () => undefined, keyGap: () => 0, keyHold: () => 0 };
  return runInNewContext(expression, context) as SetDatetime;
}

const editors = [
  { type: 'date', value: '2026-10-09', kinds: ['month', 'day', 'year'] },
  { type: 'month', value: '2026-10', kinds: ['month', 'year'] },
  { type: 'week', value: '2026-W41', kinds: ['year', 'week'] },
  { type: 'time', value: '15:24', kinds: ['hour', 'minute', 'ampm'] },
  {
    type: 'datetime-local',
    value: '2026-10-09T15:24',
    kinds: ['month', 'day', 'year', 'hour', 'minute', 'ampm'],
  },
] as const;
type Editor = (typeof editors)[number];

async function fillNativeEditor(method: SetDatetime, editor: Editor, focus: 'first' | 'last'): Promise<void> {
  const parsed = fields.datetimeParts(editor.type, editor.value);
  if (!parsed) throw new Error('Invalid editor fixture');
  const kinds: readonly string[] = editor.kinds;
  const hasAmpm = kinds.includes('ampm');
  const expected = fields.use24h(parsed, hasAmpm);
  expected.ampm = Number(expected.hour24) >= 12 ? 'P' : 'A';
  const typed: Record<string, string> = {};
  let selected = 0;
  const segments = editor.kinds.map((kind) => ({ kind }));
  const receiver = {
    worlds: {
      editorFields: async () => segments,
      call: async () => (editor.kinds.every((kind) => typed[kind] === expected[kind]) ? editor.value : ''),
    },
    pointerAction: async () => {
      selected = focus === 'last' ? segments.length - 1 : 0;
    },
    pressKey: async (key: string) => {
      if (key === 'ArrowRight') selected = Math.min(segments.length - 1, selected + 1);
      if (key === 'ArrowUp' || key === 'ArrowDown') throw new Error('Unexpected month adjustment');
    },
    raw: {
      keyPress: async (key: string) => {
        if (key === 'ArrowLeft') selected = Math.max(0, selected - 1);
        if (key === 'ArrowRight') selected = Math.min(segments.length - 1, selected + 1);
      },
    },
    typeChar: async (character: string) => {
      const kind = segments[selected]?.kind;
      if (!kind) throw new Error('Native editor lost focus');
      typed[kind] = (typed[kind] ?? '') + character;
      const advances = kind !== 'year' && kind !== 'ampm' && !(editor.type === 'month' && kind === 'month');
      if (advances && typed[kind].length === 2) selected = Math.min(segments.length - 1, selected + 1);
    },
  };
  const target = {};
  const reference = { frame: {}, id: 1 };
  const options = {};
  const config = { typing_delay: 0, typing_delay_spread: 0 };
  const deadline = Infinity;
  await method.call(
    receiver,
    target,
    reference,
    editor.type,
    editor.value,
    options,
    'fill',
    config,
    deadline,
  );
}

describe('verified CloakBrowser native editor focus compatibility', () => {
  it('rejects modified engine sources', () => {
    const modified = `${engine}\n`;
    expect(() => patchEngine(modified)).toThrow('does not match');
  });
  it('reproduces misplaced input with the unpatched engine', async () => {
    const method = setDatetimeFrom(engine);
    const editor = editors[0];
    const filling = fillNativeEditor(method, editor, 'last');
    await expect(filling).rejects.toThrow('the date/time editor produced ""');
  });
  const focusCases = ['first', 'last'] as const;
  const cases = editors.flatMap((editor) => focusCases.map((focus) => ({ editor, focus })));
  it.each(cases)(
    'fills $editor.type after the click focuses the $focus segment',
    async ({ editor, focus }) => {
      const patched = patchEngine(engine);
      const method = setDatetimeFrom(patched);
      const filling = fillNativeEditor(method, editor, focus);
      await expect(filling).resolves.toBeUndefined();
    },
  );
});
