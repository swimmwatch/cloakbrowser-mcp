# 05 — Profile restart and session state isolation

Status: Complete — 2026-10-10; executed on explicit skill invocation
Requirements: TEST-003, TEST-007, TEST-010, TEST-011
Dependencies: 04 complete; installed-package scenario and controlled origin pass

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Prove persistent cookie/localStorage state survives restart, separate profiles
and temporary sessions stay isolated, and failed starts release profile ownership.

Evidence: `tests/e2e/npm-package.manual.ts:194` already checks seed restart;
`src/bridge/profile-seed.ts:10` owns seed persistence;
`src/bridge/config.ts:236`, `:250`, `:878` own lock acquisition/rollback.
Existing unit boundaries: `tests/unit/config.test.ts:784` and profile-seed suites.
Real CDP isolation exists at `tests/e2e/cdp-access.manual.ts:110`; do not duplicate
it merely to increase counts.

## Scope and ownership

Allowed: `tests/e2e/npm-package.manual.ts`, existing profile-seed/config unit tests,
profile fixture template/helper and plan/checklist/handoff.
Only a demonstrated defect permits a narrow fix in `src/bridge/profile-seed.ts`
or profile lifecycle in `src/bridge/config.ts`. No profile format or public option change.

Keep one local origin and its ephemeral port alive across both process launches.
Harness owns independent temp profiles A/B, Free caches, clients and children.
Profile lock is released on failed setup and final disposal; seed belongs to the
profile and is not an artifact to regenerate at every restart. Use existing seed
filename/version helpers rather than duplicate expectations.

## Test-first acceptance

| Scenario | Required public observation |
| --- | --- |
| Profile A restart | Set synthetic cookie and localStorage using actual browser actions/API; fully stop bridge, reconnect same profile to same origin; exact values remain |
| Profile B | On same origin, cookie and localStorage values from A are absent; A values remain unchanged |
| Temporary sessions | Existing isolated-browser configuration starts independent temporary sessions; closing/recreating a session exposes neither previous value |
| Seed contract | Existing seed-reuse, explicit fingerprint/off, disabled stealth/other-engine/no-profile cases stay valid; do not rewrite sufficient unit tests |
| Lock contention | Competing owner of the same profile is rejected; first owner remains usable; after close, next legitimate launch succeeds |
| Failure cleanup | Induce a supported startup/setup failure after acquiring a profile, then start a valid runtime on that profile successfully |

Negative checks require expected diagnostic and resulting lock/state behavior.
Observe cookies through real browser context and localStorage through local page;
a successful tool response or direct profile-file inspection is not state evidence.

RED: add missing restart/isolation/error assertions first. If existing behavior
already passes, apply PROVE to the test's own controlled setup: deliberately reuse
A's profile for B or leak temporary ownership and confirm absence/reacquisition
assertions fail. Mutate one behavior at a time and restore it. Do not corrupt the
user's profile, manufacture persistent locks or patch upstream schemas.

## Commands and prerequisites

Prerequisites: 04, verified Free and temporary profile permissions. No personal
profile/home/license; cleanup on every branch.

```bash
rtk proxy npm exec -- vitest run tests/unit/profile-seed.test.ts tests/unit/profile-seed-fallback.test.ts tests/unit/config.test.ts
rtk proxy npm run test:e2e:npm-package
rtk proxy npm run test:report -- --suite npm
rtk proxy npm run check
```

Record seed stability, observed state, contention/recovery and child exit evidence.
A missing browser prerequisite or lock release leaves the packet incomplete.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.


## Execution evidence — 2026-10-10

- Installed-package tests now observe persistent cookies through `page.context().cookies()`
  and localStorage through the controlled local page. The same fixture origin stays alive
  across process restarts. Profile A retains both values and its seed; profile B starts
  empty and cannot change A. Concurrent isolated sessions start empty and recreation
  discards both values.
- Separate installed bridge processes contend for the same profile. The rejected process
  reports `Persistent profile is already active`; the original browser remains usable.
  After normal shutdown, extension mode without its required process token fails after
  lock acquisition. A normal Cloak launch then reacquires that profile and restores state.
- A test-private owner closes browsers before stopping clients, verifies owned bridge and
  Chromium PIDs terminate, and keeps bounded sanitized startup diagnostics. All profiles,
  caches and the fixture server are owned and cleaned. Only ignored report artifacts remain.
- Existing seed/config checks are retained: 107 unit tests passed. Existing cross-process
  lock unit coverage at `tests/unit/config.test.ts:784` was reverified; the packaged scenario
  adds real browser usability and failure/recovery observations rather than duplicating it.
- Initial harness failure: upstream navigation returns a snapshot-file reference, so the
  fixture marker is checked through real DOM observation. Initial state-loss failure:
  closing only the MCP client does not flush a persistent browser context; the owner now
  uses successful `browser_close` before stopping the bridge. No runtime defect was found.
- PROVE: reopening profile A as B failed at the empty cookie/localStorage assertion;
  reusing the first temporary session as the second failed at its absence assertion.
  Mutations were applied separately and restored. No mutation or backup remains.
- Host: Linux x64, Node 24.20.0, verified Free Chromium 146.0.7680.177.5,
  npm Playwright MCP 0.0.83. No license used. Project remains 1.14.1.
- Required checks passed: focused profile/config unit tests (107), full npm E2E (8),
  reported npm E2E (8), and `npm run check` (638 unit/integration passed, 4 unchanged
  skips; 6 fast fake-upstream/CLI E2E passed; 0 lint errors, 10 existing warnings).
- Allure HTML generated at `artifacts/test-report/packet05-final-20261010/index.html`;
  actual summary: total 8, passed 8. Expected contention/setup diagnostics retain PIDs.
- Specification recheck: pass/reviewed/Approved with unchanged pinned versions.
  Native macOS/Windows/arm64, Docker, coverage rerun and heap measurements were not run.
  No remote CI dispatch/polling, commit, push, PR or publication occurred.

Next eligible packet: 06, only after another explicit implementation invocation.
