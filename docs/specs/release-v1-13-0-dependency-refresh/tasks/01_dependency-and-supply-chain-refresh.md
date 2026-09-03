# 01 — Dependency and supply-chain refresh

## Outcome

Refresh the specified package, lockfile, Docker runtime, documentation Python
dependency, and GitHub Action pins to the approved v1.13.0 baseline.

## Prerequisites and ownership

Requires an approved specification, approved task packets, and explicit
authorization for this packet. Owns DEP-01, DEP-02, CI-01, and DOCKER-01.
There are no prior implementation packet dependencies.

## Scope and contracts

- Set direct dependency ranges to: `@playwright/mcp` `^0.0.80`,
  `cloakbrowser` `^0.5.10`, `@types/node` `^26.4.1`,
  `@vitest/coverage-v8` and `vitest` `^5.0.0`, `eslint` `^10.9.1`,
  `eslint-plugin-jsdoc` `^64.3.4`, `eslint-plugin-perfectionist` `^5.11.0`,
  `tsx` `^4.23.13`, and `typescript-eslint` `^8.69.0`.
- Recreate `package-lock.json` with `npm@11.19.0`; do not change unrelated
  dependency targets or override pins unless the install requires a direct,
  evidence-backed compatibility fix.
- Preserve existing Vitest include patterns, 15-second timeouts, and coverage
  thresholds. Record any required Vitest 5 configuration adaptation for packet
  02 instead of silently changing test policy.
- Set `mkdocs-git-revision-date-localized-plugin>=1.5.4`.
- Pin Playwright MCP Docker references in Dockerfile and CI/release workflows
  to `v0.0.80@sha256:dda1f7f9b812e22946635c8af7df9288b96d3b9e3f0f1b8576d6823e2031c1de`.
- Add `fonts-urw-base35` to the final Docker runtime only; retain its existing
  non-root runtime user and CloakBrowser binary-install flow.
- Replace every CodeQL action pin with
  `ff2f1c621b7f889edc0d3c761ac2e6a3f8cdb0dd # v4.37.7` and every Buildx pin
  with `37fe631027851001ddb9b187196cc803df7f5f0e # v4.3.0`.

No CLI, MCP, HTTP, environment, child-process, or local-tool contract changes
are in scope. Do not modify `.trackerignore`.

## Expected files

`package.json`, `package-lock.json`, `docs/requirements.txt`, `Dockerfile`,
and the affected files under `.github/workflows/`.

## Acceptance and verification

- `npm --version` reports `11.19.0` before lockfile generation.
- Manifest and lockfile resolve every approved target.
- All changed workflow references have the approved SHA and trailing version
  comment.
- Docker has the approved base image and installs `fonts-urw-base35` in the
  final runtime stage.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`, and
  `npm run test:unit`. If a check fails, retain output and stop before packet
  completion; do not modify unrelated contracts.

## Failure handling and manual gates

Restore only faulty local changes through a targeted follow-up; never reset the
worktree. Commit, push, PR creation, GitHub cleanup, merge, tag, and publish
are MANUAL GATE actions and are forbidden in this packet.

## Completion checklist and handoff

- [x] Dependencies and lockfile refreshed with npm 11.19.0.
- [x] Docker and workflows use the approved pins; runtime font added.
- [x] Focused checks completed.
- [x] `todo.md` and `handoff.md` updated with files, checks, worktree state,
  blockers, and packet 02 as the next packet.
