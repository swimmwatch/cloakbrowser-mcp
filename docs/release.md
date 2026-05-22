---
tags:
  - Project Internals
  - Release
---

# Release

Releases are driven by a published GitHub Release whose tag is a semver value
prefixed with `v`, for example `v1.2.3`.

The release workflows apply the tag version to `package.json`,
`package-lock.json`, `server.json`, README markers, and documentation markers
before packaging or building images.

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

After the first publish, confirm the GHCR package is public and linked to this
repository.

## Documentation Publishing

The docs release workflow deploys MkDocs to the `gh-pages` branch. GitHub Pages
should serve from that branch and the repository root.

The workflow builds documentation in strict mode before deployment.

## Release Tags

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `X.Y.Z`, `X.Y` |

## Checklist

Before publishing a release:

- Merge only after `Actionlint` and `CI` are green.
- Create a GitHub Release from a tag like `v1.2.3`.
- Mark the release as prerelease when publishing a `next` npm version.
- Confirm the `NPM_TOKEN` repository secret is present.
- Confirm GHCR package visibility is public after the first Docker publish.
