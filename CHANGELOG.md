# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project will adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once releases begin.

## [Unreleased]

> **Status:** the project has not yet been released. Everything below describes the in-tree foundation.

### Added

- Project foundation: Node ≥ 20 ESM, TypeScript `strict`, ESLint flat config, Prettier, Vitest.
- MCP stdio server wired via `@modelcontextprotocol/sdk` with a programmatic `createServer` factory.
- Configuration loader: defaults → env (`CLOAKBROWSER_MCP_*`) → CLI flags, validated with `zod`.
- Capability flag model (11 flags) retained for project-specific extensions; `allowScreenshots` is the only flag on by default.
- Non-Playwright alias deny-list (`browser_eval`, `cloakbrowser_evaluate`) rejected at `ToolRegistry.register`.
- Origin allow/deny policy (`assertOriginAllowed`) enforced at every `browser_navigate` call; only `http`, `https`, `file`, and `about:` URL schemes accepted.
- `BrowserAdapter` abstraction with `CloakBrowserAdapter` (real) and `MockBrowserAdapter` (in-memory) implementations.
- `SessionManager` with page/context limits and stable `pageId` lifecycle.
- `ArtifactManager` with sanitised filenames (basename only; absolute paths and `..` rejected).
- Pino-backed logger that writes JSON lines to `stderr` only.
- **28 default tools**: the full 23-tool Playwright MCP-compatible browser surface plus `browser_get_config`, `cloakbrowser_binary_info`, and three read-only verify helpers.
- Capability-gated extension tools for PDF export, storage mutation, network routing, trace/HAR/video artifacts, coordinate mouse input, and CloakBrowser binary installation.
- Logger redaction for common secret keys and secret-looking string values.
- Public library API exports for typed embedding: config, logger, adapters, registry, artifacts, tools, and `createServer`.
- `allowPersistentProfiles` now gates `userDataDir`; `allowFileAccess` gates `file:` navigation.
- Library API documentation page with embedding examples.
- Four-tier test suite (unit + integration + contract + gated real-browser) with v8 coverage thresholds 75/75/75/65 enforced in CI.
- Dependency-free fixture HTTP server at `tests/fixtures/httpServer.ts`.
- Multi-stage Dockerfile (non-root `app` user, pre-populated CloakBrowser Chromium cache).
- GitHub Actions workflows:
  - `ci.yml` — quality matrix (Node 20 + 22), coverage on Node 20, Docker `--help` smoke.
  - `npm-release.yml` — npm package publish on `release.published` using npm Trusted Publishing/OIDC.
  - `docker-release.yml` — `linux/amd64` GHCR push on `release.published`.
  - `docs-release.yml` — `mkdocs gh-deploy` on `release.published`.
- Release version injection script (`scripts/apply-release-version.mjs`) that applies the GitHub release tag to package metadata and version-marked docs before publishing artifacts.
- Stricter v8 coverage thresholds: lines 85 / functions 85 / statements 85 / branches 70.
- MkDocs Material docs site under `docs/` with full pages for getting started, configuration, tools, Docker, testing, security, architecture, development, contributing, and roadmap.
- Governance files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, GitHub issue templates.
- MIT license metadata in `package.json` and the root `LICENSE` file.
- Optimized Docker build pipeline with BuildKit cache mounts, a minimal Docker context, cacheable production dependency layers, GitHub Actions cache reuse, and release SBOM/provenance attestations.
- Hardened npm publishing with uncached trusted-publishing release installs, registry signature verification, duplicate-version checks, verified tarball smoke tests, and publish-from-tarball behavior.
- MCP Registry-ready metadata: runtime implementation metadata and instructions, `package.json` `mcpName`, `server.json`, and Docker OCI ownership labels.

### Known limitations

- **Real-browser tests are not run in CI.** They are available locally via `npm run test:real` (gated by `CLOAKBROWSER_MCP_REAL_BROWSER=1`).
- **Docker image is `linux/amd64` only.** `linux/arm64` is deferred until CloakBrowser binary distribution is validated for arm64.
- Real-browser support for video export depends on CloakBrowser/Playwright creating pages with video recording enabled; otherwise `browser_video_save` returns `UNSUPPORTED`.

[Unreleased]: https://github.com/swimmwatch/cloakbrowser-mcp/commits/main
