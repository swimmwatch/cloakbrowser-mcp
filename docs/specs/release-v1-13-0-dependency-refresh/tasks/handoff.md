# v1.13.0 handoff

Current state: packet 01 is verified and authorized for one local commit.

Completed packets: 01 Dependency and supply-chain refresh.

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

Current worktree exception: preserve the user's untracked `.trackerignore`
without inspection, staging, deletion, or modification.

Release confirmation: Prompt MCP confirmed `v1.13.0`, stable, and local
release preparation only. No authorization exists for commit, push, PR
creation, GitHub cleanup, merge, tag, or publication.

Next packet: 02 Bridge parity and integration coverage. It requires its own
explicit authorization after packet 01's local commit.

Unrelated worktree state: the user-owned untracked `.trackerignore` remains
unchanged.

Blockers: no technical blocker. Stop before packet 02, commit, push, PR
creation, GitHub cleanup, merge, tag, or publication without their separate
manual gates.
