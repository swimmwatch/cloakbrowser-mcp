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

Preferred setup is npm Trusted Publishing:

| Field | Value |
| --- | --- |
| Package | `cloakbrowser-mcp` |
| Publisher | GitHub Actions |
| Repository owner | `swimmwatch` |
| Repository | `cloakbrowser-mcp` |
| Workflow | `.github/workflows/npm-release.yml` |
| Environment | unset |

The npm release workflow also supports the classic token path. Add a repository
secret named `NPM_TOKEN` when Trusted Publishing is not configured.

The workflow publishes with provenance enabled. Trusted Publishing generates
provenance automatically; token publishing uses `npm publish --provenance`.

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
- Confirm the npm package has Trusted Publishing configured or `NPM_TOKEN` is
  present.
- Confirm GHCR package visibility is public after the first Docker publish.
