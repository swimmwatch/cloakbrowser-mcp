import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('../../scripts/update-doc-translations.mjs', import.meta.url));
const tempRoots: string[] = [];

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doc-discovery-'));
  tempRoots.push(root);
  return root;
}

function writeDoc(root: string, relativePath: string): void {
  const target = path.join(root, 'docs', relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, '# Documentation fixture\n');
}

function checkTranslations(root: string) {
  return spawnSync(process.execPath, [scriptPath, '--check'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
  });
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    assert.match(path.basename(root), /^cloakbrowser-doc-discovery-/u);
    rmSync(root, { recursive: true, force: true });
  }
});

describe('documentation translation discovery', () => {
  it('excludes the root internal agent documentation without writing a manifest', () => {
    const root = createTempRoot();
    writeDoc(root, 'agents/domain.md');
    writeDoc(root, 'agents/nested/workflow.md');

    const result = checkTranslations(root);

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('Documentation translations are current.\n');
    expect(result.status).toBe(0);
    expect(existsSync(path.join(root, 'docs/data/translation-manifest.json'))).toBe(false);
  });

  it.each(['guide.md', 'agents-guide.md', 'recipes/agents/guide.md'])(
    'still requires translations for the public document %s',
    (relativePath) => {
      const root = createTempRoot();
      writeDoc(root, relativePath);

      const result = checkTranslations(root);

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${relativePath} -> ru: missing localized file`);
      expect(existsSync(path.join(root, 'docs/data/translation-manifest.json'))).toBe(false);
    },
  );
});
