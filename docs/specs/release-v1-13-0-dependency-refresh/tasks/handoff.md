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
