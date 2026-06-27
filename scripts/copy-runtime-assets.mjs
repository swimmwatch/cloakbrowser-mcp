import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const runtimeDistDir = path.join(repoRoot, 'dist', 'runtime');

mkdirSync(runtimeDistDir, { recursive: true });
copyFileSync(
  path.join(repoRoot, 'src', 'runtime', 'humanize-init-page.cjs'),
  path.join(runtimeDistDir, 'humanize-init-page.cjs'),
);
