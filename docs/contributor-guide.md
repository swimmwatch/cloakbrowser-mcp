# Contributor Guide

This section is for people changing the project itself. If you only want to run the MCP server, use the [User Guide](getting-started.md).

## What lives here

- [Development](development.md) — local source setup, commands, coding conventions, and how to add tools.
- [Library API](library-api.md) — exported programmatic API and embedding examples.
- [Testing](testing.md) — unit, integration, contract, coverage, and real-browser test tiers.
- [Architecture](architecture.md) — internal design, adapter boundaries, registry behavior, artifacts, and errors.
- [Contributing](contributing.md) — PR checklist, code of conduct, and security reporting.
- [Roadmap](roadmap.md) — release blockers, planned hardening, and future capability candidates.

## Release publishing

Publishing is driven by GitHub releases:

- `npm-release.yml` publishes the Node.js package to npm using npm Trusted Publishing via GitHub Actions OIDC.
- `docker-release.yml` publishes the Docker image to GHCR.
- `docs-release.yml` publishes the documentation site to GitHub Pages.

The npm release job uses a clean, uncached install, verifies npm registry signatures, rejects already-published versions, packs the package, installs that exact tarball in a temporary project, checks the CLI and public exports, uploads the verified tarball, and publishes that same tarball to npm.

MCP Registry metadata is kept in sync with published artifacts:

- `package.json` declares `mcpName`, and it must match `server.json.name`.
- `server.json` describes npm and GHCR package entries, stdio transport, and runtime environment variables.
- The Dockerfile and Docker release workflow both set `io.modelcontextprotocol.server.name` for OCI ownership verification.

Release versions are sourced from the GitHub release tag. The workflows run `scripts/apply-release-version.mjs` so the tag is applied to package metadata, `server.json`, and version-marked documentation before publishing.
