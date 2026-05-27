---
description: Release process for the CloakBrowser MCP npm package, Docker image, documentation site, MCP Registry listing, and GitHub Pages deployment.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Release

Releases are driven by a published GitHub Release whose tag is a semver value
prefixed with `v`, for example `v1.2.5`.

The unified `Release` workflow resolves the tag once, then passes the derived `version`,
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
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Add required reviewers to `npm-production`, `docker-production`, and
`mcp-registry-production` if releases should require manual approval after a
GitHub Release is published. The `github-pages` environment is used by the
native GitHub Pages deployment job.

## npm Publishing

The npm release workflow publishes through npm Trusted Publishing with GitHub
Actions OIDC. It does not use `NPM_TOKEN` for publishing.

Configure the trusted publisher on npmjs.com with these exact values:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

The `npm` job runs on GitHub-hosted runners, uses Node.js 24, and keeps
`id-token: write` so npm can exchange the GitHub Actions OIDC token for a
short-lived publish credential. npm Trusted Publishing requires npm CLI
`>=11.5.1` and Node.js `>=22.14.0`.

Publishing uses:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

When publishing through Trusted Publishing, npm automatically generates package
provenance for public packages from public repositories. Do not add a long-lived
npm publish token back to this workflow.

The package version is applied from the GitHub Release tag before `npm pack`
and `npm publish`, and the job fails if `package.json` does not match the
resolved release version.

## Docker Publishing

Docker images are published to:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
```

The `docker` job uses the repository `GITHUB_TOKEN` with
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

## MCP Registry Publishing

The `mcp-registry` job publishes `server.json` to the official
registry at:

```text
https://registry.modelcontextprotocol.io
```

Server publishing uses the local `MCP Registry Publish` composite GitHub Action,
the official `mcp-publisher` CLI, and GitHub Actions OIDC. Do not open a pull
request to `modelcontextprotocol/registry` to list this server; that repository
explicitly requires package authors to publish with `mcp-publisher`.

The workflow does not need Glama, billing, a GitHub PAT, DNS credentials, or
long-lived registry secrets. It uses:

- `id-token: write` for GitHub OIDC authentication;
- `mcp-publisher login github-oidc`;
- the existing GitHub namespace `io.github.swimmwatch/cloakbrowser-mcp`;
- the npm package `mcpName` value to prove npm package ownership;
- the Docker image label `io.modelcontextprotocol.server.name` to prove OCI
  image ownership.

The MCP Registry job starts from the same GitHub Release event as npm, Docker,
and documentation publishing. It declares `needs: [npm, docker]`, so npm and
GHCR publication complete before registry publishing starts. The composite
action is intentionally registry-focused: it validates `server.json` locally,
validates it with `mcp-publisher`, checks whether the exact registry version is
already visible, authenticates with `mcp-publisher login github-oidc`, publishes
the server metadata, and verifies the final registry entry.

If a transient registry failure happens, rerun the failed `mcp-registry` job in
the original release run after the npm and Docker jobs are green. The manual
`workflow_dispatch` trigger on `Release` is for full release-pipeline runs with
an explicit tag.

Verify the published registry entry with:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
```

## Security Workflows

The repository uses free security tooling:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

Action SHA pinning is tracked as a future hardening pass. Current workflows use
versioned action references so updates stay manageable while the release
infrastructure is still young.

## Documentation Publishing

The `docs-build` and `docs-deploy` jobs deploy MkDocs with the native GitHub Pages Actions
deployment flow. Repository Pages settings must use `GitHub Actions` as the
source.

The workflow builds documentation in strict mode, uploads the generated `site/`
directory with `actions/upload-pages-artifact`, and deploys it with
`actions/deploy-pages` to the `github-pages` environment.

Documentation publishing also runs the SEO validator after the MkDocs build.
Optional webmaster verification tokens use official free webmaster tools and can
be provided as repository variables or secrets:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Optional IndexNow notifications require a repository secret named
`INDEXNOW_KEY`. When it is set, the workflow publishes the required key file and
submits the generated sitemap URLs after GitHub Pages deployment.

Do not add paid indexing services, advertising products, or third-party
analytics to the documentation release flow without a separate explicit
decision.

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
- Create a GitHub Release from a tag like `v1.2.5`.
- Mark the release as prerelease when publishing a `next` npm version.
- Confirm the npm Trusted Publisher is configured for `release.yml` and
  `npm-production`.
- Confirm `npm-production`, `docker-production`, `github-pages`, and
  `mcp-registry-production` environments exist.
- Confirm GitHub code scanning is enabled if SARIF upload visibility is needed.
- Confirm GHCR package visibility is public after the first Docker publish.

`SUPPORT.md` is intentionally deferred until the project has a stable support
policy beyond GitHub issues and security advisories.
