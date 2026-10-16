# 09 — Humanize and repeated resource cleanup

Status: Complete — 2026-10-10; local evidence verified after review corrections
Requirements: TEST-007, TEST-010, TEST-011
Dependencies: 04–08 complete; relevant browser, profile, transport, proxy and extension evidence available

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Retain existing real humanize coverage, add only missing assertions, and prove
bounded repeated lifecycle cleanup across successful and failed scenarios.

Evidence: `tests/e2e/npm-package.manual.ts:842` already covers both presets,
tabs/iframes/locators/inputs/modifiers/errors and detached DOM; `:1041` checks
concurrent cold-cache downloading and stdout. Weak-reference/frame checks exist
at `tests/unit/humanize-compatibility.test.ts:46` and `:93`.
Compatibility ownership: `src/runtime/humanizeCompatibility.ts:6`,
`src/runtime/humanizeCompatibilityLoader.ts:17`, `:37`.
Startup rollback: `src/bridge/config.ts:250`; CDP disposal:
`src/cdp/session.ts:599`, `:613`, `:676`.

## Scope and ownership

Allowed: `tests/e2e/npm-package.manual.ts`, `tests/e2e/browser-lifecycle.manual.ts`,
existing humanize/CDP/HTTP lifecycle tests, owned runtime fixture helper,
narrow reporter selector/diagnostic changes and plan/checklist/handoff.
Only confirmed defects justify changes in existing humanize compatibility hook,
bridge/HTTP/CDP disposal owners. Keep `humanizeBrowser`/`patchContext`,
source hash guard and unchanged upstream contracts. No license use or replacement
private adapter; no speculative memory framework.

Fixture registers owned children/servers/clients/profiles/cache resources once.
Disposal is idempotent and awaits completion, including partial-start failure.
Use public process exit/close, socket close, reconnect refusal and successful
profile reacquisition. Tests must not kill arbitrary OS browsers.

## Test-first acceptance

| Scenario | Observation and bound |
| --- | --- |
| Both presets | default/careful pass real existing/new-tab, iframe-visible/hidden, complex/ambiguous locator, special field, modifier and MCP error cases; add missing outcomes only |
| Detached DOM | Existing collection check observes element references disappear after detach and bounded explicit collection; retained live element remains valid |
| Repeated success/failure | At least five sequential lifecycle cycles per selected owner; successful start, partial-start failure and browser/upstream failure each close owned resources |
| HTTP/CDP/profile | Session failure does not leak child or port; stale generation unavailable; same explicit profile can be acquired after shutdown |
| Proxy/extension | Negative setup/pairing/routing paths release sockets/browser resources observed in packets 07/08 |
| Concurrent download | Two real Free processes share an empty isolated cache; exact usable binary, clean stdout protocol and no leftover partial download/locks |
| Diagnostics | Unexpected failures retain bounded redacted stderr, owned PID and exit/signal; fixture screenshot only when local controlled page is available |

Resource close deadline is 10 seconds after initiating disposal; a deadline failure
fails the owning scenario. Readiness uses events/bounded conditions, not a fixed
sleep. Keep intentional navigation survival delays distinct from readiness.
Long RSS trends are supplemental P2 and cannot substitute deterministic cleanup.

RED: write uncovered assertions before fixes. New checks of existing behavior,
absence/cleanup and structural hook wiring require PROVE: retain one detached
element, suppress one owned disposal, or break one hook guard separately, confirm
the intended assertion fails, then restore. Do not weaken source hash verification,
drop ambiguous-locator cases or erase a failure with automatic retries.

## Commands and prerequisites

Prerequisites: 04–08 evidence, verified Free, actual local fixture/display/TLS
capabilities. Add `lifecycle` development reporting selector.

```bash
rtk proxy npm exec -- vitest run tests/unit/humanize-compatibility.test.ts tests/unit/humanize-compatibility-registration.test.ts tests/unit/humanize-init-page.test.ts
rtk proxy npm run test:e2e:npm-package
rtk proxy npm exec -- vitest run --config vitest.distribution-e2e.config.mjs tests/e2e/browser-lifecycle.manual.ts
rtk proxy npm run test:report -- --suite lifecycle
rtk proxy npm run check
```

Record actual child/socket/profile outcomes and iterations, not a broad claim that
one heap sample proves memory safety. Failed download, cleanup or browser capability
is required evidence still missing and leaves the packet incomplete.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.


## Execution evidence — 2026-10-10

Completed in the existing release worktree, preserving previous packets and
unrelated work. Four real Free-browser lifecycle cases perform five cycles each:
normal deletion, raw browser close/generation replacement, upstream termination,
and seed-read failure with profile reacquisition. Actual Chromium/upstream PIDs,
CDP ports and profile-lock removal are observed under a whole-operation 10-second
close deadline. Humanize verifies both presets, the selected duplicate and Shift,
iframe visibility, expected MCP errors, collected detached references and a live
reference after collection. Cold-cache coverage verifies two real downloaders,
stdout, cache leftovers and actual navigation with the exact downloaded binary.

Review corrections: fixture close covers launch rejection; profile and extension
close have whole-operation deadlines and retained owned PIDs; ambiguous selection
has distinct fixture effects and explicit assertions. Two new deadline unit tests
check forced termination and timer removal. No runtime/upstream contract changes.

The reported lifecycle run `packet09-reviewed-20261010` failed one lock assertion:
HTTP DELETE finishes its response before `src/http/server.ts:516` completes disposal.
Processes and CDP port had already closed. The immediate lock check did not match
the approved eventual 10-second disposal contract. It now polls actual directory
entries within the existing aggregate deadline, without increasing the bound.
The failed HTML remains available (three passed, one failed); the corrected run
`packet09-complete-20261010` passes all four cases and generates truthful Allure HTML.

Verification: 28 focused humanize/runtime/report CLI tests passed; full `check`
passed 652 unit/integration cases and four unchanged skips plus six fake-upstream
CLI E2E. The preceding unchanged npm E2E passed eight cases; real extension E2E
passed seven cases. These results are reused because their inputs remain unchanged.
Final lifecycle report has four passes, zero skips, twenty cycles and 30.9 seconds.
Scoped ESLint passed. No automatic retries or weakened acceptance assertions.

PROVE evidence from implementation/rework: suppressed session deletion fails the
10-second deadline; retained detached element references fail actual humanize;
selecting the first duplicate fails `Humanize selected the wrong duplicate`.
All mutations were restored. An earlier npm run failed with unavailable diagnostic
output; its cause remains unknown, and the later complete run passed. It is not
reported as a diagnosed or successful run.

Linux x64, Node 24.20.0, Free Chromium 146.0.7680.177.5, DISPLAY :1. No license use.
Native macOS/Windows/arm64, Docker, coverage rerun and general heap/RSS measurements
remain unexecuted here, assigned to subsequent acceptance work. PID/port/lock and
DOM-reference observations are not proof of general memory-leak freedom.
Specification freshness is pass/reviewed/Approved with unchanged pins.
Next packet: 10 on a separate explicit invocation. No commit, push, remote CI,
publication or downstream packet was executed.
