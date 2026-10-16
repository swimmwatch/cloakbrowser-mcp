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
  protectMarkdown(markdown: string): {
    text: string;
    placeholders: Array<[string, string]>;
  };
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
const argumentValue = new URL('../../scripts/lib/doc-translations.mjs', import.meta.url).href;
const translations = (await import(argumentValue)) as unknown as DocTranslationsModule;
const tempRoots: string[] = [];
const locales: LocaleConfig[] = [{ locale: 'es', deeplTarget: 'ES' }];
afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    const rmSyncOptions = { recursive: true, force: true } as const;
    rmSync(root, rmSyncOptions);
  }
});
function createTempRoot(): string {
  const tmpdirResult = tmpdir();
  const joinedPath = path.join(tmpdirResult, 'cloakbrowser-doc-translations-');
  const root = mkdtempSync(joinedPath);
  tempRoots.push(root);
  return root;
}
function writeDoc(root: string, rel: string, text: string): void {
  const filePath = path.join(root, rel);
  const dirnameResult = path.dirname(filePath);
  const mkdirSyncOptions = { recursive: true } as const;
  mkdirSync(dirnameResult, mkdirSyncOptions);
  writeFileSync(filePath, text);
}
describe('documentation translation helpers', () => {
  it('recognizes localized Markdown paths and applies phrase replacements', () => {
    const suffixes = translations.createLocaleSuffixSet(locales);
    const isLocalizedMarkdownResult = translations.isLocalizedMarkdown('guide.es.md', suffixes);
    expect(isLocalizedMarkdownResult).toBe(true);
    const isLocalizedMarkdownResult2 = translations.isLocalizedMarkdown('guide.md', suffixes);
    expect(isLocalizedMarkdownResult2).toBe(false);
    const normalizeDocPathResult = translations.normalizeDocPath('nested\\guide.md');
    expect(normalizeDocPathResult).toBe('nested/guide.md');
    const localizedPathResult = translations.localizedPath('nested/guide.md', 'es');
    expect(localizedPathResult).toBe('nested/guide.es.md');
    const localizedPathResult2 = translations.localizedPath('nested\\guide.md', 'es');
    expect(localizedPathResult2).toBe('nested/guide.es.md');
    const postProcessLocalizedMarkdownOptions = {
      es: { 'Get started': 'Primeros pasos' },
    } as const;
    const postProcessLocalizedMarkdownResult = translations.postProcessLocalizedMarkdown(
      'Get started',
      'es',
      postProcessLocalizedMarkdownOptions,
    );
    expect(postProcessLocalizedMarkdownResult).toBe('Primeros pasos');
  });
  it('validates localized Markdown markers and fences', () => {
    const validateLocalizedMarkdownOptions:
      | {
          invalidLocalizedContentPatterns?: RegExp[];
          knownUntranslatedPhrases?: string[];
        }
      | undefined = {
      invalidLocalizedContentPatterns: [/Translation failed:/u],
    };
    const validateLocalizedMarkdownResult = translations.validateLocalizedMarkdown(
      'Translation failed: quota',
      'es',
      validateLocalizedMarkdownOptions,
    );
    expect(validateLocalizedMarkdownResult).toContain('invalid marker');
    const validateLocalizedMarkdownResult2 = translations.validateLocalizedMarkdown('```ts\ncode\n', 'es');
    expect(validateLocalizedMarkdownResult2).toContain('unbalanced triple-backtick');
    const validateLocalizedMarkdownOptions2:
      | {
          invalidLocalizedContentPatterns?: RegExp[];
          knownUntranslatedPhrases?: string[];
        }
      | undefined = {
      knownUntranslatedPhrases: ['Bridge runtime'],
    };
    const validateLocalizedMarkdownResult3 = translations.validateLocalizedMarkdown(
      'Bridge runtime',
      'es',
      validateLocalizedMarkdownOptions2,
    );
    expect(validateLocalizedMarkdownResult3).toContain('untranslated phrase');
    const validateLocalizedMarkdownResult4 = translations.validateLocalizedMarkdown(
      'Contenido localizado',
      'es',
    );
    expect(validateLocalizedMarkdownResult4).toBeUndefined();
  });
  it('protects and restores Markdown placeholders around non-translatable fragments', async () => {
    const markdown = [
      '---',
      'title: My title',
      'slug: keep-this',
      '---',
      '',
      'Use `CODE` and https://example.com/path.',
      'Runtime: {{ project.node_engine_range }}.',
    ].join('\n');
    const protectedMarkdown = translations.protectMarkdown(markdown);
    expect(protectedMarkdown.text).toContain('<clb-keep');
    expect(protectedMarkdown.text).not.toContain('{{ project.node_engine_range }}');
    const restoreMarkdownResult = translations.restoreMarkdown(
      protectedMarkdown.text,
      protectedMarkdown.placeholders,
    );
    expect(restoreMarkdownResult).toBe(markdown);
    expect(() => translations.restoreMarkdown('missing', protectedMarkdown.placeholders)).toThrow(
      'DeepL response did not preserve placeholder',
    );
    const preservesPlaceholdersResult = translations.preservesPlaceholders(
      protectedMarkdown.text,
      protectedMarkdown.text,
    );
    expect(preservesPlaceholdersResult).toBe(true);
    const preservesPlaceholdersResult2 = translations.preservesPlaceholders(
      protectedMarkdown.text,
      'translated',
    );
    expect(preservesPlaceholdersResult2).toBe(false);
    const shouldTranslatePartResult = translations.shouldTranslatePart('Hello');
    expect(shouldTranslatePartResult).toBe(true);
    const shouldTranslatePartResult2 = translations.shouldTranslatePart(
      '<clb-keep data-i="000000">CLB000000</clb-keep>',
    );
    expect(shouldTranslatePartResult2).toBe(false);
    const translateMarkdownOptions: TranslationClient = {
      async translateText(text) {
        return text.replace('Hello', 'Hola');
      },
    };
    const translated = await translations.translateMarkdown('Hello `CODE`', 'ES', translateMarkdownOptions);
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
    const values: SourceDoc[] = [source];
    const findStaleTranslationsOptions = {
      docsDir,
      locales,
      validateLocalizedMarkdown,
    } as const;
    const findStaleTranslationsResult = translations.findStaleTranslations(
      values,
      manifest,
      findStaleTranslationsOptions,
    );
    const receiverActual = findStaleTranslationsResult;
    const values2: never[] = [];
    expect(receiverActual).toEqual(values2);
    const translationEntry = manifest.sources['guide.md'].translations?.es;
    if (!translationEntry) throw new Error('missing test translation entry');
    translationEntry.translationHash = 'stale';
    const values3: SourceDoc[] = [source];
    const findStaleTranslationsOptions2 = {
      docsDir,
      locales,
      validateLocalizedMarkdown,
    } as const;
    const findStaleTranslationsResult2 = translations.findStaleTranslations(
      values3,
      manifest,
      findStaleTranslationsOptions2,
    );
    const receiver2Actual = findStaleTranslationsResult2;
    const values4: {
      reason: string;
      targetRel: string;
    }[] = [{ reason: 'localized file changed without manifest update', targetRel: 'guide.es.md' }];
    expect(receiver2Actual).toMatchObject(values4);
    const values5: SourceDoc[] = [source];
    const refreshManifestOptions: {
      docsDir: string;
      locales: LocaleConfig[];
      now: () => string;
      validateLocalizedMarkdown: (markdown: string, locale: string) => string | undefined;
    } = {
      docsDir,
      locales,
      now: () => '2026-07-06T00:00:00.000Z',
      validateLocalizedMarkdown,
    };
    translations.refreshManifest(manifest, values5, refreshManifestOptions);
    const refreshedTranslationEntry = manifest.sources['guide.md'].translations?.es;
    if (!refreshedTranslationEntry) throw new Error('missing refreshed test translation entry');
    const receiver3Actual = refreshedTranslationEntry.translationHash;
    const sha256Result = translations.sha256(translatedText);
    expect(receiver3Actual).toBe(sha256Result);
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
    const values6: SourceDoc[] = [source];
    const findStaleTranslationsOptions3: {
      docsDir: string;
      locales: LocaleConfig[];
      validateLocalizedMarkdown: (markdown: string, locale: string) => string | undefined;
    } = {
      docsDir,
      locales,
      validateLocalizedMarkdown: () => undefined,
    };
    const findStaleTranslationsResult3 = translations.findStaleTranslations(
      values6,
      manifest,
      findStaleTranslationsOptions3,
    );
    const receiver4Actual = findStaleTranslationsResult3;
    const values7: never[] = [];
    expect(receiver4Actual).toEqual(values7);
  });
});
