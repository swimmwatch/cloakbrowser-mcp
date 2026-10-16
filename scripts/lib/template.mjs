import { readFile } from 'node:fs/promises';
export async function renderTemplateFile(templatePath, values) {
  const template = await readFile(templatePath, 'utf8');
  return renderTemplate(template, values);
}
export function renderTemplate(template, values) {
  return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) {
      const message = `Missing template value: ${key}`;
      throw new Error(message);
    }
    return String(values[key]);
  });
}
