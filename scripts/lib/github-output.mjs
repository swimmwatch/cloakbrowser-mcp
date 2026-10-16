import { writeFile } from 'node:fs/promises';
export async function appendGithubOutput(outputs, outputPath = process.env.GITHUB_OUTPUT) {
  if (!outputPath) {
    return;
  }
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  const message = `${lines.join('\n')}\n`;
  const writeFileOptions = { flag: 'a' };
  await writeFile(outputPath, message, writeFileOptions);
}
