import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function createLocaleSuffixSet(locales) {
  return new Set(locales.map(({ locale }) => locale));
}

export function isLocalizedMarkdown(fileName, localeSuffixes) {
  const match = fileName.match(/\.([^.]+(?:-[^.]+)?)\.md$/u);
  return Boolean(match && localeSuffixes.has(match[1]));
}

/**
 * Finds localized docs whose manifest entry no longer matches the source or target file state.
 */
export function findStaleTranslations(sources, manifest, { docsDir, locales, validateLocalizedMarkdown }) {
  const stale = [];

  for (const source of sources) {
    const sourceEntry = manifest.sources[source.rel];

    for (const localeConfig of locales) {
      const status = readTranslationStatus(source, sourceEntry, localeConfig, {
        docsDir,
        validateLocalizedMarkdown,
      });
      const reason = getStaleTranslationReason(source, status);

      if (reason) {
        stale.push({
          locale: localeConfig.locale,
          reason,
          sourceRel: source.rel,
          sourceHash: source.sourceHash,
          sourceText: source.sourceText,
          targetPath: status.targetPath,
          targetRel: status.targetRel,
        });
      }
    }
  }

  return stale;
}

function readTranslationStatus(source, sourceEntry, localeConfig, { docsDir, validateLocalizedMarkdown }) {
  const targetRel = localizedPath(source.rel, localeConfig.locale);
  const targetPath = join(docsDir, targetRel);
  const translationEntry = sourceEntry?.translations?.[localeConfig.locale];
  const targetExists = existsSync(targetPath);
  const targetText = targetExists ? readFileSync(targetPath, 'utf8') : undefined;
  return {
    targetRel,
    targetPath,
    translationEntry,
    targetExists,
    translationHash: targetText === undefined ? undefined : sha256(targetText),
    invalidReason:
      targetText === undefined ? undefined : validateLocalizedMarkdown(targetText, localeConfig.locale),
    expectedSourceHash: translationEntry?.sourceHash ?? sourceEntry?.sourceHash,
  };
}

function getStaleTranslationReason(source, status) {
  if (!status.targetExists) return 'missing localized file';
  if (!status.translationEntry) return 'missing manifest entry';
  if (status.expectedSourceHash !== source.sourceHash) return 'source changed';
  if (status.translationEntry.path !== status.targetRel) return 'manifest path mismatch';
  if (status.invalidReason) return status.invalidReason;
  if (status.translationEntry.translationHash !== status.translationHash) {
    return 'localized file changed without manifest update';
  }
  return undefined;
}

export function pruneManifest(manifest, sources, { locales }) {
  const sourceRels = new Set(sources.map(({ rel }) => rel));
  const localeCodes = new Set(locales.map(({ locale }) => locale));

  for (const sourceRel of Object.keys(manifest.sources)) {
    if (!sourceRels.has(sourceRel)) {
      delete manifest.sources[sourceRel];
      continue;
    }

    const translations = manifest.sources[sourceRel].translations ?? {};
    for (const locale of Object.keys(translations)) {
      if (!localeCodes.has(locale)) {
        delete translations[locale];
      }
    }
  }
}

/**
 * Rebuilds the translation manifest from localized files that already exist on disk.
 */
export function refreshManifest(
  manifest,
  sources,
  { docsDir, locales, validateLocalizedMarkdown, now = () => new Date().toISOString() },
) {
  for (const source of sources) {
    const sourceEntry = (manifest.sources[source.rel] ??= {
      sourceHash: source.sourceHash,
      translations: {},
    });
    sourceEntry.sourceHash = source.sourceHash;
    sourceEntry.translations ??= {};

    for (const { locale } of locales) {
      const targetRel = localizedPath(source.rel, locale);
      const targetPath = join(docsDir, targetRel);

      if (!existsSync(targetPath)) {
        throw new Error(`Cannot refresh manifest; missing ${targetRel}`);
      }

      const targetText = readFileSync(targetPath, 'utf8');
      const invalidReason = validateLocalizedMarkdown(targetText, locale);
      if (invalidReason) {
        throw new Error(`Cannot refresh manifest; ${targetRel}: ${invalidReason}`);
      }

      sourceEntry.translations[locale] = {
        path: targetRel,
        sourceHash: source.sourceHash,
        translationHash: sha256(targetText),
        translator: sourceEntry.translations[locale]?.translator ?? 'deepl-mcp translate-text',
        updatedAt: sourceEntry.translations[locale]?.updatedAt ?? now(),
      };
    }
  }

  pruneManifest(manifest, sources, { locales });
}

export function localizedPath(sourceRel, locale) {
  return sourceRel.replace(/\.md$/u, `.${locale}.md`);
}

export function postProcessLocalizedMarkdown(markdown, locale, localizedPhraseReplacements) {
  const replacements = localizedPhraseReplacements[locale];
  if (!replacements) {
    return markdown;
  }

  let result = markdown;
  for (const [source, replacement] of Object.entries(replacements)) {
    result = result.replaceAll(source, replacement);
  }

  return result;
}

export function validateLocalizedMarkdown(
  markdown,
  locale,
  { invalidLocalizedContentPatterns = [], knownUntranslatedPhrases = [] } = {},
) {
  for (const pattern of invalidLocalizedContentPatterns) {
    if (pattern.test(markdown)) {
      return `localized ${locale} content contains invalid marker ${pattern}`;
    }
  }

  const tripleFenceCount = markdown.match(/^```/gmu)?.length ?? 0;
  if (tripleFenceCount % 2 !== 0) {
    return `localized ${locale} content has unbalanced triple-backtick code fences`;
  }

  const tildeFenceCount = markdown.match(/^~~~/gmu)?.length ?? 0;
  if (tildeFenceCount % 2 !== 0) {
    return `localized ${locale} content has unbalanced tilde code fences`;
  }

  for (const phrase of knownUntranslatedPhrases) {
    if (markdown.includes(phrase)) {
      return `localized ${locale} content contains untranslated phrase "${phrase}"`;
    }
  }

  return undefined;
}

export async function translateMarkdown(markdown, targetLanguage, client) {
  const protectedMarkdown = protectMarkdown(markdown);
  const translated = await translateProtectedMarkdown(protectedMarkdown.text, targetLanguage, client);
  return restoreMarkdown(translated, protectedMarkdown.placeholders);
}

export async function translateProtectedMarkdown(markdown, targetLanguage, client) {
  const parts = markdown.split(/(\n{2,})/u);
  const translatedParts = [];

  for (const part of parts) {
    if (shouldTranslatePart(part)) {
      translatedParts.push(await translatePart(part, targetLanguage, client));
    } else {
      translatedParts.push(part);
    }
  }

  return translatedParts.join('');
}

export async function translatePart(part, targetLanguage, client) {
  const translated = await client.translateText(part, targetLanguage);
  if (preservesPlaceholders(part, translated)) {
    return translated;
  }

  const lineParts = part.split(/(\n)/u);
  const translatedLineParts = [];

  for (const linePart of lineParts) {
    if (!shouldTranslatePart(linePart)) {
      translatedLineParts.push(linePart);
      continue;
    }

    const translatedLine = await client.translateText(linePart, targetLanguage);
    translatedLineParts.push(preservesPlaceholders(linePart, translatedLine) ? translatedLine : linePart);
  }

  return translatedLineParts.join('');
}

export function preservesPlaceholders(source, translated) {
  for (const token of source.matchAll(/<clb-keep data-i="[0-9]+">CLB[0-9]+<\/clb-keep>/gu)) {
    if (!translated.includes(token[0])) {
      return false;
    }
  }

  return true;
}

export function shouldTranslatePart(part) {
  if (part.trim() === '') {
    return false;
  }

  const withoutPlaceholders = part.replace(/<clb-keep data-i="[0-9]+">CLB[0-9]+<\/clb-keep>/gu, '');

  return /[A-Za-z]/u.test(withoutPlaceholders);
}

/**
 * Replaces Markdown syntax that must survive machine translation with stable placeholder tokens.
 */
export function protectMarkdown(markdown) {
  const placeholders = [];

  function protect(value) {
    if (value === '') {
      return value;
    }

    const id = String(placeholders.length).padStart(6, '0');
    const token = `<clb-keep data-i="${id}">CLB${id}</clb-keep>`;
    placeholders.push([token, value]);
    return token;
  }

  let text = markdown;

  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end !== -1) {
      const frontmatter = text.slice(4, end);
      const body = text.slice(end + 5);
      const protectedFrontmatter = frontmatter
        .split('\n')
        .map((line) => {
          const match = line.match(/^([A-Za-z0-9_-]+):(\s*)(.*)$/u);
          if (match && (match[1] === 'title' || match[1] === 'description')) {
            return `${protect(`${match[1]}:${match[2]}`)}${match[3]}`;
          }

          return protect(line);
        })
        .join('\n');
      text = `${protect('---')}\n${protectedFrontmatter}\n${protect('---')}\n${body}`;
    }
  }

  text = protectBody(text, protect);
  return { text, placeholders };
}

export function protectBody(text, protect) {
  return text
    .replace(/```[\s\S]*?```/gu, (value) => protect(value))
    .replace(/~~~[\s\S]*?~~~/gu, (value) => protect(value))
    .replace(/<!--[\s\S]*?-->/gu, (value) => protect(value))
    .replace(/\{\{\s*[^{}\n]+\s*\}\}/gu, (value) => protect(value))
    .replace(/^(?:\|.*\|\n?){2,}/gmu, (value) => protect(value))
    .replace(/<p\b[\s\S]*?<\/p>/giu, (value) => protect(value))
    .replace(/<div\b[\s\S]*?<\/div>/giu, (value) => protect(value))
    .replace(/`[^`\n]+`/gu, (value) => protect(value))
    .replace(/:[a-z0-9_/-]+:/giu, (value) => protect(value))
    .replace(/\]\(([^)\n]+)\)/gu, (_match, url) => `](${protect(url)})`)
    .replace(/https?:\/\/[^\s)>]+/giu, (value) => protect(value));
}

export function restoreMarkdown(markdown, placeholders) {
  let restored = markdown;

  for (const [token, value] of placeholders.toReversed()) {
    if (!restored.includes(token)) {
      throw new Error(`DeepL response did not preserve placeholder ${token}`);
    }

    restored = restored.replaceAll(token, value);
  }

  return restored;
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
