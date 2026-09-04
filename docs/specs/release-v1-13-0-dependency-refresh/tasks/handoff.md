# v1.13.0 handoff

Current state: packet 02 is verified and authorized for one local commit.

Completed packets: 01 Dependency and supply-chain refresh; 02 Bridge parity and
integration coverage.

Packet 01 changes:

- Updated the approved dependency ranges and regenerated `package-lock.json`
  with npm `11.19.0`; the lock resolves `@playwright/mcp` `0.0.80`,
  CloakBrowser `0.5.10`, Vitest `5.0.0`, and every other supplied target.
- Updated the Playwright MCP Docker image baseline in Dockerfile and CI/release
  workflows; added `fonts-urw-base35` to the final runtime image.
- Updated CodeQL and Buildx action pins in all affected workflows.
- Raised the MkDocs revision plugin floor to `1.5.4`.
- Excluded internal `docs/specs/` workflow artifacts from public translation
  discovery; this fixes the translation check without omitting any public doc.

Packet 01 verification:

- `npm --version` -> `11.19.0`
- `npm run typecheck` -> passed
- `npm run lint` -> passed
- `npm run format:check` -> passed
- `npm run test:unit` -> passed (22 files; 199 passed; 4 skipped)
- `npm run docs:translations:check` -> passed
- `npm run check` -> passed
- `git diff --check` -> passed

Packet 02 changes:

- Added a unit regression that preserves the exact `buildLaunchOptions` error
  and verifies removal of the temporary `cloakbrowser-mcp-*` runtime directory.
- Extended the humanization smoke with `browser_select_option` and
  `browser_click` after navigation.
- Updated the parity baseline to Playwright MCP `v0.0.80` with the approved
  digest, added `PLAYWRIGHT_MCP_CAPS=devtools` baseline and bridge containers,
  and compares every forwarded tool input schema while requiring both recording
  tools.
- Public docs upstream links to commit
  `4c1fb03bad3bae379b0ae0e3d81d2660de56bd91` remain the scoped work of packet
  03, together with their localized versions and manifest hashes.

Packet 02 verification:

- `npm run test:unit` -> passed (22 files; 200 passed; 4 skipped)
- `npm run typecheck` -> passed
- `npm run lint` -> passed
- `npm run format:check` -> passed
- `npm run test:integration` -> passed (3 files; 24 passed)
- `npm run docker:build` -> passed
- `npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json` -> passed
  (24 default tools; 37 matching devtools schemas including both recording tools)
- `npm run check` -> passed
- Inspected and removed `bridge-parity-report.json`.

Current worktree exception: preserve the user's untracked `.trackerignore`
without inspection, staging, deletion, or modification.

Release confirmation: Prompt MCP confirmed `v1.13.0`, stable, and local
release preparation only. No authorization exists for commit, push, PR
creation, GitHub cleanup, merge, tag, or publication.

Next packet: 03 Release metadata and documentation. Before it starts, the
uncommitted completed packet requires explicit commit authorization and a
Conventional Commits review. Packet 03 also requires its own explicit
authorization.

Unrelated worktree state: the user-owned untracked `.trackerignore` remains
unchanged.

Blockers: no technical blocker. Stop before packet 03, commit, push, PR
creation, GitHub cleanup, merge, tag, or publication without their separate
manual gates.

## Packet 03 completion update

Current state: packet 03 is verified; local release preparation remains
uncommitted. Completed packets: 01 Dependency and supply-chain refresh; 02
Bridge parity and integration coverage; 03 Release metadata and documentation.

Packet 03 changes:

- Applied local version `v1.13.0` to `package.json`, `package-lock.json`, and
  `server.json` with `npm run version:apply -- v1.13.0`.
- Added the `1.13.0` compatibility row for Playwright MCP `^0.0.80`, Docker
  `mcr.microsoft.com/playwright/mcp:v0.0.80`, and CloakBrowser `^0.5.10` while
  preserving Node.js, platform, and transport contracts.
- Added the dated `1.13.0` changelog entry and compare links; retained an empty
  `[Unreleased]` section.
- Documented fail-closed GeoIP matching, its 20-second resolution timeout,
  explicit CloakBrowser license failures, the public-entry-point limitation for
  `SessionSeats`/`getSessionSeats`, the 24 default upstream tools, and inherited
  `PLAYWRIGHT_MCP_CAPS=devtools` without a bridge `--caps` option.
- Updated English and ten localized configuration, GeoIP, and tools pages,
  compatibility tables, generated `llms.txt`, and the affected translation
  manifest entries.

Packet 03 verification:

- `npm run docs:compatibility:check` -> passed
- `npm run docs:translations:check` -> passed
- `npm run docs:build` -> passed (MkDocs emitted its upstream Material 2.0
  migration notice; no build failure)
- `npm run docs:seo:validate` -> passed
- `git diff --check` -> passed

Next packet: 04 Full release verification. It requires its own explicit
authorization. Packet 03 must remain uncommitted unless the user separately
authorizes its commit after a Conventional Commits review.

Unrelated worktree state: the user-owned untracked `.trackerignore` remains
unchanged. Stop before packet 04, commit, push, PR creation, GitHub cleanup,
merge, tag, or publication without separate manual gates.
