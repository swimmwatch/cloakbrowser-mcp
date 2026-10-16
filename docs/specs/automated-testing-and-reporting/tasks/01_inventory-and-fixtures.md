# 01 — Inventory and owned Free fixtures

Status: Complete locally; execution evidence is recorded in plan.md, todo.md, and handoff.md.
Requirements: TEST-001, TEST-007, TEST-010, TEST-011
Dependencies: Approved specification

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Make every required scenario traceable and give later browser tests a portable,
license-free environment with explicit resource ownership.

Existing inputs: `vitest.config.ts:15`, `:20`, `:26` select suites and coverage;
`vitest.e2e.config.ts:15` is fast packaged CLI; the heavy collector is
`vitest.distribution-e2e.config.mjs:15`. Reuse
`tests/e2e/distributionHarness.ts:33`, `:41`, `:66`, `:228`,
`tests/e2e/npm-browser-fixture.ts:7`, `:23`, `:29`. Base environment currently
spreads the parent environment; `node_modules/cloakbrowser/dist/license.js:284`
and `:292` prove that an empty key alone does not exclude a cached license.

## Scope and ownership

Allowed: `tests/e2e/distributionHarness.ts`, `tests/e2e/npm-browser-fixture.ts`,
`tests/helpers/browser-test-runtime.ts`, associated unit/integration helper tests,
`tests/fixtures/npm-browser/`, and this bundle's plan/checklist/handoff.
No production source, package dependency, workflow or public documentation changes.

`createFreeBrowserRuntime` accepts a verified Free executable and a newly created
temporary root, returns a bounded child environment and idempotent disposal.
It removes inherited license/status/Pro-selection inputs, selects the known Free
binary and uses a new cache without `license.key`; do not mutate the user's home.
Set the existing `PLAYWRIGHT_BROWSERS_PATH` to an owned temporary directory so
upstream browser-install scenarios cannot write into a personal browser cache.
Fixture and distribution owners register acquired resources immediately and
dispose in reverse order even after partial startup. Track only owned PIDs.
This helper may depend on existing harness utilities; runtime code must not
depend on it. Do not invent another browser abstraction or test-only MCP tools.

Templates keep whole HTML pages separate and CSS/JS in the corresponding tags.
Expose observable fixture state for upload/download, profiles and error scenarios;
reuse existing page behaviors rather than duplicate a second all-tools fixture.

## Test-first acceptance

| Criterion | Check first / expected defect detected | GREEN and PROVE |
| --- | --- | --- |
| Complete key-area map | Enumerate current suites/cases and map every TEST-011 scenario in `plan.md`, distinguishing fake/real, collected/executed/skipped | Reuse sufficient checks; list precise missing assertions, duplicates retained/deleted and flaky risks. Unknown scenario is an explicit gap |
| Free environment | New helper test launches a controlled child from a parent with synthetic license/cache values | Child observes cleared key/new cache/selected Free path; mutate one clearance rule and prove the test fails |
| Ownership | New helper tests inject failure after server/child acquisition and call cleanup twice | Owned child exits, port refuses reconnect, root disappears; unrelated sentinel remains alive. Suppress one cleanup at a time and prove failure |
| Fixture readiness | Start local server and verify controlled content/bytes before using it as browser evidence | Ephemeral loopback port and all connections close. No fixed readiness sleeps or global process kill |

Use synthetic values only. Do not print environment dumps. Reuse OS error
constants and dependency-version helpers rather than duplicate version/error literals.

## Commands and prerequisites

Prerequisites: installed locked dependencies, known Free executable for subsequent
heavy checks; fixture helper tests themselves use controlled Node children.
Create the named tests before running them. Existing runner commands:

```bash
rtk proxy npm exec -- vitest list tests/unit tests/integration
rtk proxy npm exec -- vitest list --config vitest.e2e.config.ts
rtk proxy npm exec -- vitest list --config vitest.distribution-e2e.config.mjs
rtk proxy npm exec -- vitest run tests/unit/browser-test-runtime.test.ts
rtk proxy npm exec -- vitest run tests/integration/browser-fixture-lifecycle.test.ts
rtk proxy npm run check
```

Collection updates only inventory; it is not browser execution. Capture actual
case counts from runner output and do not relabel existing four skips as passes.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
