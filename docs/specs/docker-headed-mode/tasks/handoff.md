# Docker Headed Mode Handoff

## Current State

- Planning is complete; implementation has not started.
- Specification status: `Approved`.
- Workflow state: `pass` / `reviewed`.
- Source version:
  `aaaeebcaeeebeee6c002e06b1288b222ad86806b2727cde376f6f790f4f87993`.
- Specification version:
  `fad6bcccd0eac43e8a19841c851a8425a69f51cd2bcd14a21f9c83d2c07fe5a6`.
- Review reference: `3c616247-2370-4c25-9165-043ac7bfdb39`.
- Next packet: `01_s6_runtime_and_lifecycle.md`.

## Important Evidence

- The current image has `USER node`, entrypoint
  `node /opt/cloakbrowser-mcp/dist/cli.js`, Xvfb at `/usr/bin/Xvfb`, and no
  configured display supervisor.
- The local Docker builder currently advertises amd64 only. Arm64 execution
  evidence must come from the existing CI matrix.
- S6 Overlay `v3.2.3.2` release digests and architecture mapping are recorded in
  `plan.md` and packet 01.
- Existing Docker distribution tests substitute the fake upstream and do not
  launch real CloakBrowser headed mode.

## Worktree Coordination

The worktree contains unrelated user changes, including changes in files that
the packets must touch:

- `.github/workflows/ci.yml`
- `package.json`
- `docs/getting-started.md` and all locale variants
- `docs/data/translation-manifest.json`
- `docs/recipes/ci-smoke-test.md` and all locale variants
- `tests/e2e/playwright-console.manual.ts` is untracked

Before each edit, re-read the current scoped diff. Patch only the required
fragments and do not reformat, replace, or remove unrelated work.

## Verification Already Performed

- Workflow MCP `specification_check_state`: `status: pass`,
  `coverage_status: reviewed`.
- Planning inspection confirmed Docker image metadata and Xvfb availability.
- S6 release asset digests were read from the official GitHub release API.
- No production files, tests, CI workflow, or documentation were changed during
  planning.

## Next Action

On explicit implementation authorization, execute only packet 01. Start by
rechecking the pinned specification source version and current worktree overlap,
then write and run the discriminating Docker tests before changing the runtime
image.
