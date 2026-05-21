import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Dockerfile', () => {
  const dockerfile = readFileSync(path.join(process.cwd(), 'Dockerfile'), 'utf8');
  const dockerignore = readFileSync(path.join(process.cwd(), '.dockerignore'), 'utf8');

  it('uses BuildKit cache mounts for expensive package-manager work', () => {
    expect(dockerfile).toContain('# syntax=docker/dockerfile:1.7');
    expect(dockerfile).toContain('--mount=type=cache,target=/root/.npm,sharing=locked');
    expect(dockerfile).toContain('--mount=type=cache,target=/var/cache/apt,sharing=locked');
    expect(dockerfile).toContain('--mount=type=cache,target=/tmp/cloakbrowser-cache,sharing=locked');
  });

  it('keeps production dependencies cacheable across source changes', () => {
    expect(dockerfile).toContain('FROM node:${NODE_IMAGE_TAG} AS deps');
    expect(dockerfile).toContain('FROM deps AS prod-deps');
    expect(dockerfile).toContain('COPY src ./src');
    expect(dockerfile).toContain('COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules');
  });

  it('pre-populates CloakBrowser cache during image build', () => {
    expect(dockerfile).toContain('ENV CLOAKBROWSER_CACHE_DIR=/home/app/.cloakbrowser');
    expect(dockerfile).toContain('ENV CLOAKBROWSER_AUTO_UPDATE=false');
    expect(dockerfile).toContain('node node_modules/cloakbrowser/dist/cli.js install');
  });

  it('declares the MCP Registry OCI ownership label', () => {
    expect(dockerfile).toContain(
      'LABEL io.modelcontextprotocol.server.name="io.github.swimmwatch/cloakbrowser-mcp"',
    );
  });

  it('limits the Docker build context to runtime build inputs', () => {
    expect(dockerignore).toContain('*');
    expect(dockerignore).toContain('!Dockerfile');
    expect(dockerignore).toContain('!package-lock.json');
    expect(dockerignore).toContain('!src/**');

    for (const excludedPath of [
      '.git/',
      '.github/',
      'node_modules/',
      'dist/',
      'coverage/',
      'artifacts/',
      'site/',
      '.generated-docs/',
      '.venv-docs/',
      'docs/',
      'tests/',
      'scripts/',
      '.env',
      '.env.*',
    ]) {
      expect(dockerignore).toContain(excludedPath);
    }
  });
});
