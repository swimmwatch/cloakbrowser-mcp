import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function workflow(name: string): string {
  return readFileSync(path.join(process.cwd(), '.github', 'workflows', name), 'utf8');
}

describe('GitHub Actions workflows', () => {
  it('runs actionlint for workflow changes with the repository config', () => {
    const actionlint = workflow('actionlint.yml');
    const actionlintConfig = readFileSync(path.join(process.cwd(), '.github', 'actionlint.yml'), 'utf8');

    expect(actionlint).toContain('name: Actionlint');
    expect(actionlint).toContain('.github/actionlint.yml');
    expect(actionlint).toContain('.github/workflows/**');
    expect(actionlint).toContain(
      'docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:1.7.12 -color',
    );
    expect(actionlintConfig).toContain('.github/workflows/**/*.{yml,yaml}');
    expect(actionlintConfig).toContain('SC2086');
  });

  it('publishes npm releases through release-triggered trusted publishing', () => {
    const npmRelease = workflow('npm-release.yml');

    expect(npmRelease).toContain('types: [published]');
    expect(npmRelease).toContain('id-token: write');
    expect(npmRelease).toContain("NODE_VERSION: '24'");
    expect(npmRelease).toContain('registry-url: https://registry.npmjs.org');
    expect(npmRelease).toContain('package-manager-cache: false');
    expect(npmRelease).not.toContain('cache: npm');
    expect(npmRelease).not.toContain('NODE_AUTH_TOKEN');
    expect(npmRelease).toContain('npm run version:apply -- "$GITHUB_REF_NAME"');
    expect(npmRelease).toContain('npm audit signatures');
    expect(npmRelease).toContain('npm view "$package" version');
    expect(npmRelease).toContain('npm run check:ci');
    expect(npmRelease).toContain('npm run package:verify');
    expect(npmRelease).toContain('uses: actions/upload-artifact@v4');
    expect(npmRelease).toContain(
      'npm publish "${{ steps.pack.outputs.package_file }}" --access public --tag "${{ steps.npm-tag.outputs.tag }}"',
    );
  });

  it('injects the release tag before building Docker and docs artifacts', () => {
    const dockerRelease = workflow('docker-release.yml');
    const docsRelease = workflow('docs-release.yml');

    expect(dockerRelease).toContain('node scripts/apply-release-version.mjs "$GITHUB_REF_NAME"');
    expect(docsRelease).toContain('node scripts/apply-release-version.mjs "$GITHUB_REF_NAME"');
  });

  it('uses the MIT license in Docker release labels', () => {
    const dockerRelease = workflow('docker-release.yml');

    expect(dockerRelease).toContain('org.opencontainers.image.licenses=MIT');
  });

  it('publishes Docker images with MCP Registry ownership metadata', () => {
    const dockerRelease = workflow('docker-release.yml');

    expect(dockerRelease).toContain('MCP_SERVER_NAME: io.github.swimmwatch/cloakbrowser-mcp');
    expect(dockerRelease).toContain('io.modelcontextprotocol.server.name=${{ env.MCP_SERVER_NAME }}');
  });

  it('builds Docker images through Buildx with shared GitHub Actions cache', () => {
    const ci = workflow('ci.yml');
    const dockerRelease = workflow('docker-release.yml');

    for (const file of [ci, dockerRelease]) {
      expect(file).toContain('uses: docker/build-push-action@v7');
      expect(file).toContain('cache-from: type=gha,scope=${{ env.DOCKER_CACHE_SCOPE }}');
      expect(file).toContain(
        'cache-to: type=gha,mode=max,scope=${{ env.DOCKER_CACHE_SCOPE }},ignore-error=true',
      );
      expect(file).toContain('NODE_IMAGE_TAG=${{ env.NODE_IMAGE_TAG }}');
    }

    expect(ci).toContain('load: true');
    expect(dockerRelease).toContain('push: true');
    expect(dockerRelease).toContain('sbom: true');
    expect(dockerRelease).toContain('provenance: mode=max');
  });
});
