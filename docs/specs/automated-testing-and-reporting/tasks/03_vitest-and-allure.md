# 03 — Public Vitest reporting and local Allure

Status: Complete locally; execution evidence is recorded in plan.md, todo.md, and handoff.md.
Requirements: TEST-002, TEST-006, TEST-007, TEST-008, TEST-009, TEST-010
Dependencies: 02 complete; safe writer and multi-producer tests pass

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Connect every test level to safe Allure results and prove actual HTML, history and
failure behavior. Approved choice is Allure 3 with the public Vitest API, preserving
Vitest 5.0.1. The incompatible official adapter is not an implementation option.

Evidence: public TestCase, annotations, diagnostics, TestModule and run-end types
in `node_modules/vitest/dist/chunks/plugin.d.CN87HSxv.d.ts:100`, `:138`, `:155`,
`:253`, `:2126`; installed Vitest at `package-lock.json:6334`.
Existing configuration: `vitest.config.ts:15`, `vitest.e2e.config.ts:15`,
`vitest.distribution-e2e.config.mjs:15`. Re-resolve public types after drift.

## Scope and ownership

Allowed: `scripts/testing/allure-reporter.ts`, `scripts/test-report.mjs`,
`allure.config.mjs`, three Vitest configs and shared reporter wiring,
`package.json`, `package-lock.json`, `.gitignore`,
`tests/unit/test-report-cli.test.ts`, `tests/integration/test-reporting.test.ts`,
`tests/fixtures/reporting/`, and plan/checklist/handoff.
Install only approved development `allure@3.20.1`; lock its exact version.
No runtime imports, Vitest downgrade, private patch or upstream contract edit.

`SafeAllureReporter` adapts public callbacks to packet 02's writer. Emit completed
and skipped cases plus synthetic broken records for import/collection/hook/unhandled
errors otherwise lacking a test. Feature/level/environment labels use checked
values, not arbitrary environment serialization. Stable identity: file + full
test name + project; environment: OS/architecture/Node major/engine/lane.
Preserve reported retry count/flaky evidence and actual timing; do not invent
per-attempt timestamps. Deduplicate runner errors without silently dropping them.

The CLI spawns Node tools using argument arrays, awaits writes, preserves runner
failure, and uses separate run/producer namespaces. It controls development test
configuration; ordinary `check` retains current tests and exit behavior.
Generation validates/redacts input again before the installed Allure CLI;
generation errors remain failures. Use Allure 3's supported history configuration,
validated by two real launches, without a custom UI/service.

Expose NEW npm scripts `test:report`, `test:report:generate`,
`test:report:open`, `test:report:merge`, `test:report:probe`.
Collect accepts checked `--suite` selectors (unit, integration, cli, npm, cdp,
docker) and optional `--run-id`; default creates a unique run. IDs cannot escape
the root; existing runs are not overwritten. Generate takes explicit
`--input`/`--output`; open takes `--report`; merge takes producer inputs and an
expected producer list. History is an explicit trusted input, separate from
reruns. These development options do not change the production CLI.

## Test-first acceptance

| Criterion | RED probe/test before wiring | GREEN / PROVE |
| --- | --- | --- |
| Complete results | Child Vitest fixture: pass, assertion failure, skip, retry-success | Exact counts/status/error/stack/timing/retry evidence match actual runner; no private fields |
| Runner failures | Import, collection/hook and unhandled-error fixtures outside normal globs | Visible synthetic broken evidence; nonzero runner exit remains nonzero |
| No empty success | No-tests fixture, write fault and absent manifest | Explicit failure; suppress run-end validation and prove detection |
| All levels | Representative unit, integration, CLI and heavy fixture invocations | Feature/level/environment visible; existing configs still select tests |
| HTML/history | Actual HTML for success/failed runs and two launches | Matching statuses/diagnostics; history only for same environment; no invented retry attempts |
| Safe generation | Canaries, unsafe paths and attachment metadata | No canaries in JSON/HTML/copied artifacts; disable second sanitization and prove failure |
| Packaging | Archive inspection with generated results present | Reports/history excluded from package/Git; PROVE newly structural inclusion check |

Controlled fixture failures are expected only inside the probe orchestrator:
assert their exit/evidence, then succeed when expectations hold. Never hide a
failure of actual project tests.

## Commands and prerequisites

Prerequisites: 02, supported Node, npm access for the approved dependency; no Java.
Add probes before wiring. Every `test:report*` command below is NEW in this packet.

```bash
rtk proxy npm exec -- vitest run tests/unit/test-report-cli.test.ts tests/integration/test-reporting.test.ts
rtk proxy npm run test:report:probe
rtk proxy npm run test:report -- --suite unit --run-id local-unit
rtk proxy npm run test:report:generate -- --input artifacts/test-results/local-unit --output artifacts/test-report/local-unit
rtk proxy npm run test:report:open -- --report artifacts/test-report/local-unit
rtk proxy npm run check
rtk proxy npm run package:verify
```

Inspect local HTML in a browser: status/history/attachments, with no publication.
Compatibility/HTML failure blocks this packet; return any material alternative to
specification rather than silently replacing the chosen reporter.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
