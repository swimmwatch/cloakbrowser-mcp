import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

interface DocTranslationsModule {
  createLocaleSuffixSet(locales: LocaleConfig[]): Set<string>;
  findStaleTranslations(
    sources: SourceDoc[],
    manifest: TranslationManifest,
    options: {
      docsDir: string;
      locales: LocaleConfig[];
      validateLocalizedMarkdown: (markdown: string, locale: string) => string | undefined;
    },
  ): StaleTranslation[];
  isLocalizedMarkdown(fileName: string, localeSuffixes: Set<string>): boolean;
  localizedPath(sourceRel: string, locale: string): string;
  normalizeDocPath(filePath: string): string;
  postProcessLocalizedMarkdown(
    markdown: string,
    locale: string,
    localizedPhraseReplacements: Record<string, Record<string, string>>,
  ): string;
  preservesPlaceholders(source: string, translated: string): boolean;
  protectMarkdown(markdown: string): { text: string; placeholders: Array<[string, string]> };
  refreshManifest(
    manifest: TranslationManifest,
    sources: SourceDoc[],
    options: {
      docsDir: string;
      locales: LocaleConfig[];
      now: () => string;
      validateLocalizedMarkdown: (markdown: string, locale: string) => string | undefined;
    },
  ): void;
  restoreMarkdown(markdown: string, placeholders: Array<[string, string]>): string;
  sha256(value: string): string;
  shouldTranslatePart(part: string): boolean;
  translateMarkdown(markdown: string, targetLanguage: string, client: TranslationClient): Promise<string>;
  validateLocalizedMarkdown(
    markdown: string,
    locale: string,
    options?: {
      invalidLocalizedContentPatterns?: RegExp[];
      knownUntranslatedPhrases?: string[];
    },
  ): string | undefined;
}

interface LocaleConfig {
  locale: string;
  deeplTarget?: string;
}

interface SourceDoc {
  rel: string;
  sourceHash: string;
  sourceText: string;
}

interface StaleTranslation {
  locale: string;
  reason: string;
  sourceRel: string;
  targetRel: string;
}

interface TranslationManifest {
  sources: Record<
    string,
    {
      sourceHash: string;
      translations?: Record<
        string,
        {
          path: string;
          sourceHash: string;
          translationHash: string;
          translator?: string;
          updatedAt?: string;
        }
      >;
    }
  >;
}

interface TranslationClient {
  translateText(text: string, targetLanguage: string): Promise<string>;
}

const translations = (await import(
  new URL('../../scripts/lib/doc-translations.mjs', import.meta.url).href
)) as unknown as DocTranslationsModule;

const tempRoots: string[] = [];
const locales: LocaleConfig[] = [{ locale: 'es', deeplTarget: 'ES' }];

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function createTempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'cloakbrowser-doc-translations-'));
  tempRoots.push(root);
  return root;
}

function writeDoc(root: string, rel: string, text: string): void {
  const filePath = path.join(root, rel);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, text);
}

describe('documentation translation helpers', () => {
  it('recognizes localized Markdown paths and applies phrase replacements', () => {
    const suffixes = translations.createLocaleSuffixSet(locales);

    expect(translations.isLocalizedMarkdown('guide.es.md', suffixes)).toBe(true);
    expect(translations.isLocalizedMarkdown('guide.md', suffixes)).toBe(false);
    expect(translations.normalizeDocPath('nested\\guide.md')).toBe('nested/guide.md');
    expect(translations.localizedPath('nested/guide.md', 'es')).toBe('nested/guide.es.md');
    expect(translations.localizedPath('nested\\guide.md', 'es')).toBe('nested/guide.es.md');
    expect(
      translations.postProcessLocalizedMarkdown('Get started', 'es', {
        es: { 'Get started': 'Primeros pasos' },
      }),
    ).toBe('Primeros pasos');
  });

  it('validates localized Markdown markers and fences', () => {
    expect(
      translations.validateLocalizedMarkdown('Translation failed: quota', 'es', {
        invalidLocalizedContentPatterns: [/Translation failed:/u],
      }),
    ).toContain('invalid marker');
    expect(translations.validateLocalizedMarkdown('```ts\ncode\n', 'es')).toContain(
      'unbalanced triple-backtick',
    );
    expect(
      translations.validateLocalizedMarkdown('Bridge runtime', 'es', {
        knownUntranslatedPhrases: ['Bridge runtime'],
      }),
    ).toContain('untranslated phrase');
    expect(translations.validateLocalizedMarkdown('Contenido localizado', 'es')).toBeUndefined();
  });

  it('protects and restores Markdown placeholders around non-translatable fragments', async () => {
    const markdown = [
      '---',
      'title: My title',
      'slug: keep-this',
      '---',
      '',
      'Use `CODE` and https://example.com/path.',
    ].join('\n');

    const protectedMarkdown = translations.protectMarkdown(markdown);
    expect(protectedMarkdown.text).toContain('<clb-keep');
    expect(translations.restoreMarkdown(protectedMarkdown.text, protectedMarkdown.placeholders)).toBe(
      markdown,
    );
    expect(() => translations.restoreMarkdown('missing', protectedMarkdown.placeholders)).toThrow(
      'DeepL response did not preserve placeholder',
    );
    expect(translations.preservesPlaceholders(protectedMarkdown.text, protectedMarkdown.text)).toBe(true);
    expect(translations.preservesPlaceholders(protectedMarkdown.text, 'translated')).toBe(false);
    expect(translations.shouldTranslatePart('Hello')).toBe(true);
    expect(translations.shouldTranslatePart('<clb-keep data-i="000000">CLB000000</clb-keep>')).toBe(false);

    const translated = await translations.translateMarkdown('Hello `CODE`', 'ES', {
      async translateText(text) {
        return text.replace('Hello', 'Hola');
      },
    });
    expect(translated).toBe('Hola `CODE`');
  });

  it('detects stale translations and refreshes manifest hashes from temp files', () => {
    const docsDir = createTempRoot();
    const sourceText = '# Guide\n';
    const translatedText = '# Guia\n';
    const source: SourceDoc = {
      rel: 'guide.md',
      sourceHash: translations.sha256(sourceText),
      sourceText,
    };
    writeDoc(docsDir, 'guide.es.md', translatedText);

    const manifest: TranslationManifest = {
      sources: {
        'guide.md': {
          sourceHash: source.sourceHash,
          translations: {
            es: {
              path: 'guide.es.md',
              sourceHash: source.sourceHash,
              translationHash: translations.sha256(translatedText),
            },
          },
        },
        'removed.md': {
          sourceHash: 'old',
          translations: {},
        },
      },
    };

    const validateLocalizedMarkdown = () => undefined;
    expect(
      translations.findStaleTranslations([source], manifest, {
        docsDir,
        locales,
        validateLocalizedMarkdown,
      }),
    ).toEqual([]);

    const translationEntry = manifest.sources['guide.md'].translations?.es;
    if (!translationEntry) throw new Error('missing test translation entry');
    translationEntry.translationHash = 'stale';
    expect(
      translations.findStaleTranslations([source], manifest, {
        docsDir,
        locales,
        validateLocalizedMarkdown,
      }),
    ).toMatchObject([{ reason: 'localized file changed without manifest update', targetRel: 'guide.es.md' }]);

    translations.refreshManifest(manifest, [source], {
      docsDir,
      locales,
      now: () => '2026-07-06T00:00:00.000Z',
      validateLocalizedMarkdown,
    });
    const refreshedTranslationEntry = manifest.sources['guide.md'].translations?.es;
    if (!refreshedTranslationEntry) throw new Error('missing refreshed test translation entry');
    expect(refreshedTranslationEntry.translationHash).toBe(translations.sha256(translatedText));
    expect(manifest.sources['removed.md']).toBeUndefined();
  });

  it('normalizes Windows-style source paths before checking the manifest', () => {
    const docsDir = createTempRoot();
    const sourceText = '# Recipe\n';
    const translatedText = '# Receta\n';
    const source: SourceDoc = {
      rel: 'recipes\\guide.md',
      sourceHash: translations.sha256(sourceText),
      sourceText,
    };
    writeDoc(docsDir, 'recipes/guide.es.md', translatedText);

    const manifest: TranslationManifest = {
      sources: {
        'recipes/guide.md': {
          sourceHash: source.sourceHash,
          translations: {
            es: {
              path: 'recipes/guide.es.md',
              sourceHash: source.sourceHash,
              translationHash: translations.sha256(translatedText),
            },
          },
        },
      },
    };

    expect(
      translations.findStaleTranslations([source], manifest, {
        docsDir,
        locales,
        validateLocalizedMarkdown: () => undefined,
      }),
    ).toEqual([]);
  });
});
