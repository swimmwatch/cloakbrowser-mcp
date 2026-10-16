# 04 — Observable browser tool outcomes

Status: Complete — 2026-10-10; executed on explicit incremental invocation
Requirements: TEST-004, TEST-007, TEST-010, TEST-011
Dependencies: 01 and 03 complete; Free fixture and safe reports available

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Exercise the installed npm package's complete actual tool list with local pages,
asserting real effects rather than only successful replies.

Reuse `tests/e2e/npm-package.manual.ts:22` (schemas/all tools), `:90` (navigation
survival), `:131` (upload), and `tests/e2e/npm-browser-fixture.ts:7`.
Upstream forwarding belongs to `src/server.ts:125` and `:143`; only two local
tools exist. Current count is fixed at 25; derive completeness from the actual
upstream list instead of maintaining a new count constant.

## Scope and ownership

Allowed: `tests/e2e/npm-package.manual.ts`, `tests/e2e/npm-browser-fixture.ts`,
`tests/fixtures/npm-browser/`, narrowly needed harness/helper changes,
safe diagnostic helper and plan/checklist/handoff.
Runtime fixes only after a discriminating test proves a bridge defect, within
`src/server.ts` forwarding/lifecycle ownership. Never rewrite tool schemas or
patch upstream browser behavior; an upstream defect remains a blocker.

Fixture owns request/upload/download state and connections. Harness owns clients,
browser children, output root and snapshots. Schema client must not launch a
competing browser merely to list tools. Browser operations run sequentially
with verified Free and separate caches.

## Test-first acceptance

Derive a name-to-scenario map from actual `listTools`, separating both local
tools. Every standard tool has valid-input coverage; every applicable invalid-input
or error path has an explicit assertion. Retain sufficient existing checks.

| Scenarios | Required observation / defect detected |
| --- | --- |
| Navigation/back/tabs/snapshot/find | Correct URL/title/marker immediately and after survival delay; back restores page; selected tab receives action; find file contains expected text |
| Click/hover/drag/drop/keys/modifiers | Exact fixture state; drag payload arrives; modifier effect observed |
| Forms/special fields/dialogs/iframe | Correct input/select/checkbox/date/range/color state, expected dialog and iframe effect |
| Upload/download | Server receives exact uploaded bytes; saved download filename and bytes match controlled payload |
| Screenshot/console/network | Valid nonempty marker PNG, known console event and local request; safe failure attachments where available |
| Close/error/recovery | Closed page/invalid navigation give expected errors; new clean navigation restores actual local content |
| Schemas/locals | Direct upstream equality; all returned tools represented; local info reports current runtime/engine and redacted state |

Negative checks match the expected error and resulting state, then verify recovery.
Use existing dependency-version helper. RED: add missing assertions first and
record failures before fixture/bridge changes. Assertions passing existing behavior
need PROVE by removing the controlled effect or corrupting bytes once.
PROVE also covers schema wiring and absence guarantees; never weaken contracts.

## Commands and prerequisites

Prerequisites: 03; verified Free; existing npm pack/install dependencies.
All fixture/output data are temporary and cleaned.

```bash
rtk proxy npm run test:e2e:npm-package
rtk proxy npm run test:report -- --suite npm
rtk proxy npm run check
rtk proxy npm run package:verify
```

Reporting must exercise the same suite. Unexpected browser/page loss fails with
bounded sanitized stderr, owned PID and observed exit code/signal. No silent skips
for tools requiring setup; changing a binary alone is not diagnosis.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
