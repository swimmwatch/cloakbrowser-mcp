---
tags:
  - Project Internals
  - Release
---

# Release

Releases are driven by a published GitHub Release whose tag is a semver value
prefixed with `v`, for example `v1.2.3`.

The release workflows resolve the tag once, then pass the derived `version`,
`version_tag`, and Docker-safe image tag through npm packaging, Docker build
arguments, image labels, server metadata, README markers, and documentation
markers.

## GitHub Repository Settings

Configure these settings before the first release.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production` and `docker-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Add required reviewers to `npm-production` and `docker-production` if releases should require manual approval after a GitHub Release is published.

## npm Publishing

The npm release workflow uses a repository secret named `NPM_TOKEN`.

Create an npm automation token with publish access to `cloakbrowser-mcp`, then
add it to GitHub:

```text
Settings -> Secrets and variables -> Actions -> Repository secrets -> NPM_TOKEN
```

The workflow fails before packaging if `NPM_TOKEN` is missing.

Publishing uses:

```bash
npm publish <tarball> --access public --tag <latest|next> --provenance
```

The workflow keeps `id-token: write` so npm can attach provenance from GitHub
Actions while authenticating with `NPM_TOKEN`.

The package version is applied from the GitHub Release tag before `npm pack`
and `npm publish`, and the workflow fails if `package.json` does not match the
resolved release version.

npm Trusted Publishing is intentionally deferred. Releases currently use
`NPM_TOKEN` plus npm provenance.

## Docker Publishing

Docker images are published to:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
```

The Docker release workflow uses the repository `GITHUB_TOKEN` with
`packages: write`. No extra Docker token is required for GHCR.

Before pushing the release image, the workflow:

- applies the release version;
- runs the TypeScript, lint, format, build, test, and coverage checks;
- builds a local release smoke image;
- applies available Debian security updates on top of the pinned Playwright MCP
  base image during the Docker build;
- removes the unused global npm payload from the runtime image;
- runs `--help` in the image;
- compares the image against upstream Playwright MCP with the bridge parity
  script;
- uploads the JSON bridge parity report as a workflow artifact;
- scans the image with Trivy for high and critical OS/library vulnerabilities.

The Docker build receives `RELEASE_VERSION`, `RELEASE_VERSION_TAG`, and
`VCS_REF` build arguments. The workflow also resolves the upstream Playwright
MCP base image digest and passes it as `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

The final image stores the same values as OCI labels and runtime metadata
environment variables. Published images include labels for title, description,
source, documentation, version, revision, license, authors, vendor, base image
name, base image digest, and MCP server name.

Trivy is free and open source and does not require an external token for public
image scans. SARIF results are uploaded to GitHub code scanning when code
scanning is enabled.

After the first publish, confirm the GHCR package is public and linked to this
repository.

Docker multi-platform publishing is intentionally limited to `linux/amd64`
until CloakBrowser and upstream Playwright MCP behavior are verified on other
architectures.

## Security Workflows

The repository uses free security tooling:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Docker Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

Action SHA pinning is tracked as a future hardening pass. Current workflows use
versioned action references so updates stay manageable while the release
infrastructure is still young.

## Documentation Publishing

The docs release workflow deploys MkDocs with the native GitHub Pages Actions
deployment flow. Repository Pages settings must use `GitHub Actions` as the
source.

The workflow builds documentation in strict mode, uploads the generated `site/`
directory with `actions/upload-pages-artifact`, and deploys it with
`actions/deploy-pages` to the `github-pages` environment.

## Upstream Monitoring

The upstream monitor workflow runs daily and can also be started manually from
GitHub Actions. It checks both upstream Playwright MCP distribution channels:

- npm package: `@playwright/mcp`;
- Docker image: `mcr.microsoft.com/playwright/mcp`.

When a newer upstream version is detected, the workflow creates a GitHub issue
assigned to `swimmwatch`. The issue includes the current and latest npm/Docker
versions, a short release-notes summary from
`microsoft/playwright-mcp`, and links to the full upstream changelog, npm
package, and Docker tags.

Run the same check locally with:

```bash
npm run upstream:check
```

## Release Tags

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Checklist

Before publishing a release:

- Merge only after `Actionlint` and `CI` are green.
- Create a GitHub Release from a tag like `v1.2.3`.
- Mark the release as prerelease when publishing a `next` npm version.
- Confirm the `NPM_TOKEN` repository secret is present.
- Confirm `npm-production` and `docker-production` environments exist.
- Confirm GitHub code scanning is enabled if SARIF upload visibility is needed.
- Confirm GHCR package visibility is public after the first Docker publish.

`SUPPORT.md` is intentionally deferred until the project has a stable support
policy beyond GitHub issues and security advisories.
Давай закоммить свои изменения.