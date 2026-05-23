import { readFile } from 'node:fs/promises';

export async function renderTemplateFile(templatePath, values) {
  const template = await readFile(templatePath, 'utf8');
  return renderTemplate(template, values);
}

export function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Missing template value: ${key}`);
    }

    return String(values[key]);
  });
}
