# Roadmap

This page is mainly for contributors and release planning. Users looking for supported behavior should use [Getting started](getting-started.md), [Configuration](configuration.md), and [Tools](tools.md).

This roadmap is the source of truth for what is implemented, what is planned, and what is permanently excluded. It is reviewed on every meaningful change.

## Current state (implemented)

- TypeScript `strict` + ESM project, Node ≥ 20, MCP stdio transport via `@modelcontextprotocol/sdk`.
- Configuration loader (defaults → env → CLI) validated with `zod`.
- Capability flag model with registration-time and dispatch-time enforcement.
- Origin allow/deny list enforced at every navigation.
- Non-Playwright alias deny-list enforced at registration.
- `BrowserAdapter` abstraction with `CloakBrowserAdapter` (real) and `MockBrowserAdapter` (tests).
- `SessionManager` with page/context limits, `ArtifactManager` with sanitised writes.
- pino-backed `stderr`-only logger; contract test enforces no writes to `stdout`.
- **28 default tools**: the full 23-tool Playwright MCP-compatible browser surface plus 5 project-specific tools, with additional extension tools behind capability flags; see [Tools](tools.md).
- Test suite: unit + integration + contract + gated real, with v8 coverage thresholds (85 / 85 / 85 / 75).
- CI: matrix Node 20/22 quality, coverage on Node 20, Docker `--help` smoke.
- Release workflows: npm package publish via npm Trusted Publishing/OIDC, GHCR Docker image publish, and GitHub Pages docs deploy on `release.published`; each workflow injects the Git tag as the release version before building artifacts.
- Docker multi-stage image with production dependencies, runtime privilege drop, and artifact volume handling.
- MkDocs Material docs site.
- MCP Registry-ready metadata: `mcpName`, `server.json`, runtime implementation metadata, and OCI ownership label.
- MIT license selected, declared in `package.json`, and included in the root `LICENSE` file.
- Logger redaction covers common secret keys and secret-looking string values.
- Public library exports include typed `createServer`, config, logger, adapter, registry, artifact, and tool types; see [Library API](library-api.md).

## Release blockers

The project is **not** released yet. The following must be resolved before the first public release:

1. **`README.md` and `docs/` accuracy pass for the first release.** Bump versions and tool counts when adding tools.
2. **`CHANGELOG.md` `Unreleased` section consolidated** into a versioned section at release time.

## Release hardening (planned)

| Item | Goal | Acceptance | Blockers |
| --- | --- | --- | --- |
| Real-browser CI tier | Gain confidence that `CloakBrowserAdapter` behaves like `MockBrowserAdapter` in practice. | A nightly (or release-gated) CI job runs `npm run test:real` on at least Node 20 / amd64. | Runner with browser dependencies and stable CloakBrowser runtime cache behavior. |
| `linux/arm64` Docker image | Match common deployment targets. | `docker-release.yml` builds and pushes both `linux/amd64` and `linux/arm64`. | CloakBrowser binary validated on arm64. |

## Extension tools implemented

Playwright MCP parity is implemented. The first CloakBrowser-oriented extension layer is also implemented:

- `allowPdf` → `browser_pdf_save` writes PDF artifacts.
- `allowStorageMutation` → `browser_set_cookies`, `browser_clear_storage`.
- `browser_verify_text`, `browser_verify_selector_count`, `browser_verify_url` provide read-only assertions.
- `allowNetworkInterception` → `browser_network_route` adds or clears route rules.
- `allowDevtoolsExperimental` → `browser_trace_start`, `browser_trace_stop`, `browser_har_save`, `browser_video_save`.
- `allowCoordinateInput` → `browser_mouse_click`, `browser_mouse_move`, `browser_mouse_drag`, `browser_mouse_wheel`.
- `allowBinaryInstall` → `cloakbrowser_install_binary`.

### Persistent profiles

- `allowPersistentProfiles` gates `userDataDir`; no new tool name is needed.

## Future capability candidates (no commitment)

- `allowUploads`, `allowFileAccess`, and `allowNetworkInspection` may gain stricter policy-specific variants if the default Playwright-compatible tools need deployment-specific narrowing.
- DevTools highlighting could be added later if it proves useful for debugging without broadening the browser mutation surface.

## Permanently excluded

The following will not be added under any circumstances:

- Any feature framed around CAPTCHA solving, bot-detection evasion, or bypassing access controls. See [Security → Responsible use](security.md#responsible-use).

## Open questions

- Whether to add a `--profile <name>` CLI flag for layered config presets (`agent`, `developer`, `read-only`).
- Whether to publish a smaller Docker image variant that does not include the pre-populated CloakBrowser cache, for deployments that provide `CLOAKBROWSER_BINARY_PATH` or a mounted cache themselves.
