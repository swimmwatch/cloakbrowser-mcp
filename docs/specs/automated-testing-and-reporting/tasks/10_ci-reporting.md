# 10 — CI evidence, aggregation and periodic lanes

Status: Complete — 2026-10-10; local workflow acceptance verified
Requirements: TEST-002, TEST-006, TEST-007, TEST-009, TEST-010, TEST-011
Dependencies: 03–09 complete; local reporting and key functional scenarios pass

## Remote CI observation policy

The agent must not wait for remote CI completion, poll it repeatedly, or schedule
background monitoring. Inspect remote run/job status only when the user requests
it. If required jobs are pending or running, report that state and leave their
acceptance evidence unresolved. When all relevant jobs have finished, inspect
conclusions, logs and artifacts before drawing conclusions or making authorized
corrections. A cancelled, skipped or failed required check is not a pass.
CI workflows may still aggregate results automatically through job dependencies;
this policy governs agent observation, not workflow execution. Local checks remain
part of their authorized implementation packets.

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Integrate safe artifacts and summaries with existing CI, add periodic/manual
functional lanes and collect supported-platform evidence without increasing
mandatory PR browser workload.

Evidence: `.github/workflows/ci.yml:18` Node matrix, `:33` native runners,
`:49` quality, `:68` check, `:69` package verify, `:71` E2E,
`:107`/`:123` real CDP, `:127` coverage, `:152` Codecov,
`:187` Docker architectures, `:255` distribution and `:259`/`:264` CDP.
`:303`/`:322` required aggregate/list must remain intact.
Pinned container is still upstream MCP 0.0.82; do not upgrade it in this packet.

## Scope and ownership

Allowed: `.github/workflows/ci.yml`, one new
`.github/workflows/test-reporting.yml`, narrowly needed
`scripts/test-report.mjs`/safe result support, CI aggregation fixture tests,
`package.json` development scripts if needed, and plan/checklist/handoff.
No automation-monitor changes, branch protection, required-check policy, release
workflow publishing, runtime source or Docker base edits.

Existing jobs produce only already-sanitized result directories and producer
manifests. Upload on success/failure with `always()`, unique producer names,
14-day retention and explicit empty-output failure. Aggregator downloads only
expected run artifacts, validates them as data, merges without overwrite, generates
HTML and safe summary even when a producer failed. Never publish raw results.

Retain top-level `contents: read`; job-level `actions: read` only where trusted
history lookup needs it. Reuse pinned Actions, or verify full commit SHA for any
needed action; no mutable tag pins. This producer/aggregation packet has no write
token or publication step; public Pages and the PR link belong to packet 13.
Summary counts statuses/duration/retries/missing producers without
secret diagnostics.

Trusted history is read from the most recent successful sanitized artifact for the
same default-branch trusted lane and environment. Save it only on that trusted
branch/lane; PR/fork artifacts cannot update trusted history. Missing/expired prior
history is a documented first run, not a test failure. Corrupt/untrusted history
is rejected explicitly. No execution of producer-supplied scripts/config.

Periodic/manual workflow uses scheduled and workflow-dispatch triggers, no PR
trigger. Cover real npm functional suites on each existing supported native
platform/architecture with compatible Node, and Docker amd64/arm64 in their
existing scope. Do not construct a full heavy Cartesian product or change the
current required aggregate. Reuse existing heavy console/CDP/Docker checks.

## Test-first acceptance

| Criterion | Executable check before workflow changes / PROVE |
| --- | --- |
| Complete aggregation | Local fixture with two producers, attachments and one failed runner yields matching HTML/summary; missing producer cannot become green |
| Failure transparency | Controlled failed producer retains nonzero status while report steps still run; aggregate emits explicit missing-job evidence |
| Trust/history | Fork/non-default producer cannot select or overwrite trusted history; disable trust check once and prove rejection assertion fails |
| Secret safety | Synthetic canaries absent from upload directories, merged JSON/HTML and summary; symlink/traversal/invalid metadata rejected |
| PR workload/Codecov | Structural diff/check: required job list, coverage thresholds, Codecov path/token scope and existing heavy gates preserved; PROVE any new structural assertion |
| Platform configuration | Checked producer IDs contain OS/architecture/Node/engine/lane; all agreed native/Docker environments have explicit scheduled/manual coverage |
| Workflow syntax/security | actionlint and zizmor pass without broad suppressions or downgraded security gates |

Write CI-simulation tests before script/workflow changes; the actual remote-run
test remains a separate authorized action, not simulated proof of native execution.

## Commands and prerequisites

Prerequisites: 03–09; Docker and pipx available for repository-mandated workflow
checks. Add the named local aggregation test before running it.

```bash
rtk proxy npm exec -- vitest run tests/integration/test-report-ci.test.ts
rtk proxy npm run test:report:probe
rtk proxy npm run check
rtk proxy docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
rtk proxy python3 -m pipx run zizmor --min-severity high .
```

Local workflow/tooling acceptance can complete this packet; actual native/Docker
runs are mandatory packet 11 evidence, explicitly still unverified here.
MANUAL GATE: maintainer separately authorizes commit/push and/or remote dispatch
needed to obtain remote runs. Do not trigger external runs automatically.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.

## Execution evidence — 2026-10-10

Existing CI emits sanitized producers with distinct OS/architecture/Node/browser/
job/level identities and always uploads them for 14 days. Existing test commands,
required-ci dependencies, Codecov and coverage thresholds remain intact. Expected
PR inventory is 90 producers, including managed CDP on every native platform and Linux Node 22. The new schedule/manual-only workflow covers five
native environments on Node 24 and both Docker architectures: 26 producers.
The actual workflow environment declarations are checked against that inventory.

Aggregation validates manifests and result labels, rejects unexpected producers,
symlinks and traversal, and creates broken evidence for missing jobs. It generates
actual Allure 3 HTML and a safe status/duration/retry/missing-job summary. Trusted
history is restricted to successful default-branch scheduled/manual runs with the
same repository/lane/environment inventory; PRs cannot select or write it.
History lookup is bounded to ten returned successful runs, and stored history to
30 launches. No publication, write credential or PR comment is added.

- 17 CI integration tests passed, including actual HTML, failed/missing/empty
  evidence, secret redaction, spoofed labels, history trust, level splitting,
  distinct quality/coverage cases and workflow inventory/gate preservation.
- Relevant RED: missing implementation, accepted spoofed labels and an incorrect
  periodic platform variable. Each was corrected and the assertion passed.
- Restored PROVE mutations: allow PR history, omit missing evidence, misclassify
  integration, remove Docker from required-ci. All corresponding checks failed.
- `npm run test:report:probe` passed, including pass/failure/hook/import/unhandled
  fixtures, history and npm archive exclusion.
- Final `npm run check` with real ci-config reporting passed: 669 unit/integration
  tests, four unchanged skips, six fast fake-upstream CLI cases. Ten lint warnings,
  no errors. A new regex-style lint failure was corrected before this final run.
- Local download-layout aggregation of those three actual producers passed:
  679 cases, 675 passed, four skipped, zero failed/broken/missing, zero retries.
  Report: `artifacts/test-report/packet10-local-20261010/index.html`.
- Pinned actionlint passed; zizmor passed with no findings in its default offline
  mode (online-only audits are not claimed). No suppressions were added.
- Scenario MCP: pass/reviewed/Approved, source/specification/review pins unchanged.

Only Linux x64 / Node 24.20.0 local tooling was executed. Fixtures and packaged
CLI use fake upstream; this packet does not claim a new real Chromium run.
Native macOS/Windows/arm64 and Docker runtime acceptance remains packet 11.
The Docker base still contains MCP 0.0.82, not npm MCP 0.0.83. No commit, push,
remote dispatch/polling or publication. Next packet: 13 on a separate invocation.

## Superseding CI amendment (2026-10-13)

The user requires every application suite before merge. The unified `ci.yml` now
includes the functional matrix on PRs and reuses it for weekly/manual runs.
The separate `test-reporting.yml`, duplicate coverage executions and duplicate CLI
runs are removed. Both lanes expect 97 producers. `required-ci` also requires
functional suites and report aggregation. Release jobs assemble/publish artifacts
without repeating application test suites. This supersedes the historical
90-producer inventory and periodic-only functional strategy above.
