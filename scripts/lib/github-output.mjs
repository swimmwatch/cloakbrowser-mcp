import { writeFile } from 'node:fs/promises';

export async function appendGithubOutput(outputs, outputPath = process.env.GITHUB_OUTPUT) {
  if (!outputPath) {
    return;
  }

  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  await writeFile(outputPath, `${lines.join('\n')}\n`, { flag: 'a' });
}
