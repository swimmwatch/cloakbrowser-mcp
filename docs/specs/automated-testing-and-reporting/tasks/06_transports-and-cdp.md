# 06 — Transport and CDP failure recovery

Status: Complete — 2026-10-10; executed on explicit skill invocation
Requirements: TEST-001, TEST-007, TEST-010, TEST-011
Dependencies: 01 and 03 complete; owned fixtures and safe reporter pass

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Close demonstrated gaps in CLI/config, stdio, Streamable HTTP and managed CDP
failure/recovery behavior, retaining sufficient existing boundary tests.

Evidence: `src/http/server.ts:93`, `src/http/sessionStore.ts:25`;
`tests/integration/streamable-http.test.ts:617` dynamic tools/isolation,
`:710` unknown session, `:730` invalid DELETE version, `:752` child shutdown,
`:1269` capacity, `:1296` aborted initialization, `:1391` auth, `:1415` TLS.
CDP ownership: `src/cdp/session.ts:33`. Real checks:
`tests/e2e/cdp-access.manual.ts:110`, `:284`, `:655`, `:680`.
Current Pro/multi-session gating at `:25` must be reconciled with verified Free,
without deleting required concurrent scenarios for a green result.

## Scope and ownership

Allowed: existing CLI/config/server/session-store unit tests, proxy/HTTP/CDP
integration suites and fake-upstream fixture, `tests/e2e/cdp-access.manual.ts`,
bounded distribution/harness helpers and plan/checklist/handoff.
Only a proven bridge defect permits changes in `src/server.ts`, `src/http/`,
`src/cdp/`, CLI lifecycle or configuration ownership. Do not introduce a native
adapter, new authentication/origin policy, upstream tools or new transport contract.

Fake upstream owns injected protocol failure, cancellation and child disconnect.
HTTP controller owns session lifecycle; CDP runtime owns generation, challenge,
proxy sockets and browser resources. Tests observe public responses/events/ports,
not snapshots exposing mutable private state. Test harness depends on runtime,
never vice versa.

## Test-first acceptance

Packet 01 inventory identifies exactly which assertions below are missing.
Link already sufficient tests rather than recreate every boundary.

| Area | Positive/negative/failure observation |
| --- | --- |
| CLI/config | Help/version/doctor, documented CLI/env precedence and engine selection; invalid config/startup fail with actionable redacted stderr |
| Packaged stdio | Valid MCP exchange and clean stdout framing from first launch; wrong inputs/upstream errors remain explicit; shutdown closes owned child |
| Streamable HTTP | Initialization/session isolation, unknown/expired IDs and correct status; one failed session does not corrupt another |
| Cancellation/disconnect | Inject cancellation and unexpected upstream exit using fake server; response/closure matches current SDK/bridge contract, no abandoned session/child |
| Real CDP HTTP/WS | Observe real browser state shared with MCP, concurrent session isolation and generation rotation after browser close |
| CDP security | Retain actual auth/capability/origin/TLS positive and rejection paths; redacted diagnostics never reveal usable capabilities |
| Recovery/cleanup | After injected browser/upstream failure, a supported fresh session navigates local page; old owned ports/children close |

Do not invent reconnection where the existing transport contract requires a new
session. No required Free capability test is silently skipped; demonstrated upstream
or Free limitation is a blocker with evidence.

RED: write missing assertions before fixes; use fake upstream only for protocol
boundaries. Browser-facing claims require real npm CLI/Chromium. PROVE absence,
structural wiring and newly written checks of existing behavior by suppressing the
specific cleanup/isolation/security boundary once, restoring it afterward.

## Commands and prerequisites

Prerequisites: 01/03; verified Free, controlled Playwright executable for the other
supported engine, loopback/TLS helper support.

```bash
rtk proxy npm run test:unit
rtk proxy npm exec -- vitest run tests/integration/proxy.test.ts tests/integration/streamable-http.test.ts tests/integration/cdp-lifecycle.test.ts
rtk proxy npm run test:e2e
rtk proxy npm run test:e2e:cdp
rtk proxy npm run test:report -- --suite cdp
rtk proxy npm run check
```

Add changed CDP integration files to the focused command when applicable.
Report mocks, real engines, executed/skip counts and unavailable platform evidence
separately; passing fake upstream is not Chromium recovery evidence.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.


## Execution evidence — 2026-10-10

- Three new HTTP integration cases cover expired-session rejection/child termination,
  unexpected upstream exit with an unaffected neighbour and fresh-session recovery,
  and cancellation of a call proven to have reached the fake child. Cancellation uses
  the actual SDK `ErrorCode.RequestTimeout`; it does not promise upstream cancellation
  propagation or automatic reconnection. Explicit DELETE disposes the session and child.
- The fake upstream exposes opt-in started-call observations before its controlled delay.
  It closes its SDK server on stdin end before closing fake Chromium, preventing late
  delayed replies from writing to a closed stdout pipe. These are test-only controls;
  actual upstream tools/schemas are unchanged.
- CDP setup selects a cached, verified Free binary, rejects unrelated binary overrides,
  clears inherited browser configuration/license keys and owns isolated temporary caches.
  Both engines use in-memory profiles. Playwright uses an explicit installed executable.
  Pro/multi-session opt-in and its skip are removed. A new setup guard checks these inputs.
- Browser PID observation uses public CDP `SystemInfo.getProcessInfo`, never a global
  process scan. Linux reads only that owned PID's command line; other hosts use public
  `Browser.getBrowserCommandLine` (not natively executed here). Process-exit checks use
  portable signal 0 and distinguish ESRCH from other errors.
- Existing CLI/config, packaged stdio, HTTP initialization/unknown-session/delete,
  auth/origin/TLS, managed CDP HTTP/WS, concurrent isolation and generation-rotation
  tests are retained. No production fix or transport/API change was needed.
- RED/GREEN: the Free guard originally failed with a missing executable; cancellation
  start observation originally failed until the fixture exposed actual call entry.
  Corrected two harness expectations from observed SDK behaviour: DELETE clears the
  client's sessionId, and cancellation wraps the reason in `RequestTimeout`.
- Four separate PROVE mutations failed and were restored: future instead of expired
  record (HTTP 200 rather than 404), suppressed upstream exit, omitted session DELETE
  (owned child remains alive), and a synthetic license canary in the guard-only run.
  That canary was never used to launch a browser. No mutation remains.
- Focused integration command: 44 passed. Unit command: 516 passed, 4 unchanged skips,
  46 files. `npm run check`: 641 unit/integration passed, 4 unchanged skips, 57 files;
  6 fast CLI E2E passed; 0 lint errors and 10 existing warnings.
- `npm run test:e2e:cdp`: 14 passed. Final reported CDP: 14 passed without skips
  (10 real browser cases, 4 guards). Both Free CloakBrowser and Playwright exercised.
- Default `npm run test:e2e` initially failed because upstream Chromium revision 1247
  is not installed. The authorized controlled executable revision 1246 was passed via
  `PLAYWRIGHT_MCP_EXECUTABLE_PATH`; the full retry passed 6 CLI cases and 1 real
  Playwright console case with two clean sessions. Default-browser availability is
  still an environment limitation, not a passing installation check.
- Initial reported CDP had 13 passed/1 failed at the short PID-exit polling deadline.
  The final check uses the same 10-second bound as the scenario's Browser.close phase;
  it still requires the actual owned PID to disappear. Final isolated-profile report
  passed all 14. This does not establish a general heap-leak result.
- Generated and verified both HTML summaries: initial 13/14 plus 1 failed at
  `artifacts/test-report/packet06-initial-20261010/index.html`; final 14/14 at
  `artifacts/test-report/packet06-verified-20261010/index.html`.
- Host: Linux x64, Node 24.20.0; cached Free Chromium and installed Playwright Chromium
  revision 1246; npm MCP 0.0.83. Native macOS/Windows/arm64, Docker, coverage rerun
  and long-running heap checks were not executed. No remote CI or external mutation.
- Scenario MCP recheck: pass/reviewed/Approved with unchanged pins.

Next packet: 07, only on another explicit implementation invocation.
