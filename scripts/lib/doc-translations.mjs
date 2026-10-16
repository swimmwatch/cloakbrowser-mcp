import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export function createLocaleSuffixSet(locales) {
  const mappedValues = locales.map(({ locale }) => locale);
  return new Set(mappedValues);
}
export function isLocalizedMarkdown(fileName, localeSuffixes) {
  const match = fileName.match(/\.([^.]+(?:-[^.]+)?)\.md$/u);
  const computedValue = match && localeSuffixes.has(match[1]);
  return Boolean(computedValue);
}
/**
 * Finds localized docs whose manifest entry no longer matches the source or target file state.
 */
export function findStaleTranslations(sources, manifest, { docsDir, locales, validateLocalizedMarkdown }) {
  const stale = [];
  for (const rawSource of sources) {
    const source = normalizeSourceDoc(rawSource);
    const sourceEntry = manifest.sources[source.rel];
    for (const localeConfig of locales) {
      const readTranslationStatusOptions = {
        docsDir,
        validateLocalizedMarkdown,
      };
      const status = readTranslationStatus(source, sourceEntry, localeConfig, readTranslationStatusOptions);
      const reason = getStaleTranslationReason(source, status);
      if (reason) {
        const pushOptions = {
          locale: localeConfig.locale,
          reason,
          sourceRel: source.rel,
          sourceHash: source.sourceHash,
          sourceText: source.sourceText,
          targetPath: status.targetPath,
          targetRel: status.targetRel,
        };
        stale.push(pushOptions);
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
  const mappedValues2 = sources.map(({ rel }) => normalizeDocPath(rel));
  const sourceRels = new Set(mappedValues2);
  const mappedValues3 = locales.map(({ locale }) => locale);
  const localeCodes = new Set(mappedValues3);
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
  for (const rawSource of sources) {
    const source = normalizeSourceDoc(rawSource);
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
        const message = `Cannot refresh manifest; missing ${targetRel}`;
        throw new Error(message);
      }
      const targetText = readFileSync(targetPath, 'utf8');
      const invalidReason = validateLocalizedMarkdown(targetText, locale);
      if (invalidReason) {
        const message2 = `Cannot refresh manifest; ${targetRel}: ${invalidReason}`;
        throw new Error(message2);
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
  const pruneManifestOptions = { locales };
  pruneManifest(manifest, sources, pruneManifestOptions);
}
export function localizedPath(sourceRel, locale) {
  const receiver = normalizeDocPath(sourceRel);
  const message3 = `.${locale}.md`;
  return receiver.replace(/\.md$/u, message3);
}
export function normalizeDocPath(filePath) {
  return filePath.replaceAll('\\', '/');
}
function normalizeSourceDoc(source) {
  return {
    ...source,
    rel: normalizeDocPath(source.rel),
  };
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
      const translatePartResult = await translatePart(part, targetLanguage, client);
      translatedParts.push(translatePartResult);
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
    const argumentValue = preservesPlaceholders(linePart, translatedLine) ? translatedLine : linePart;
    translatedLineParts.push(argumentValue);
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
    const values = [token, value];
    placeholders.push(values);
    return token;
  }
  let text = markdown;
  if (text.startsWith('---\n')) {
    const end = text.indexOf('\n---\n', 4);
    if (end !== -1) {
      const frontmatter = text.slice(4, end);
      const computedValue2 = end + 5;
      const body = text.slice(computedValue2);
      const protectedFrontmatter = frontmatter
        .split('\n')
        .map((line) => {
          const match = line.match(/^([A-Za-z0-9_-]+):(\s*)(.*)$/u);
          if (match && (match[1] === 'title' || match[1] === 'description')) {
            const message4 = `${match[1]}:${match[2]}`;
            const templateValue = protect(message4);
            const templateValue2 = match[3];
            return `${templateValue}${templateValue2}`;
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
      const message5 = `DeepL response did not preserve placeholder ${token}`;
      throw new Error(message5);
    }
    restored = restored.replaceAll(token, value);
  }
  return restored;
}
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
