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
| Branch protection | Require `Actionlint` and the `CI` jobs before merging to `main`. |
| Pages | Use the `gh-pages` branch from the repository root after the first docs release. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |

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
- runs `--help` in the image;
- compares the image against upstream Playwright MCP with the bridge parity
  script.

The Docker build receives `RELEASE_VERSION`, `RELEASE_VERSION_TAG`, and
`VCS_REF` build arguments. The final image stores the same values as OCI labels
and runtime metadata environment variables.

After the first publish, confirm the GHCR package is public and linked to this
repository.

## Documentation Publishing

The docs release workflow deploys MkDocs to the `gh-pages` branch. GitHub Pages
should serve from that branch and the repository root.

The workflow builds documentation in strict mode before deployment.

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
- Confirm GHCR package visibility is public after the first Docker publish.
