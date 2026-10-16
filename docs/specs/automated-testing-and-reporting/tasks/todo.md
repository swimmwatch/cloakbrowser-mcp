# Execution checklist

Status: Packets 01–10 are complete locally. Packet 13 remains open; publication evidence exists for a previous PR head. Packets 11 and 12 remain planned.

This is the sole completion checklist. A checked packet means all its required
criteria and checks passed with evidence in the current handoff and plan.
Dependency completion and plan approval do not authorize execution.

| Packet                                                               | Dependency eligibility                                        | Completion |
| -------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [01 — Inventory and Free fixtures](01_inventory-and-fixtures.md)     | Approved specification; executed on explicit skill invocation | [x]        |
| [02 — Safe evidence and merge](02_safe-results.md)                   | 01; executed on explicit skill invocation                     | [x]        |
| [03 — Public Vitest / Allure](03_vitest-and-allure.md)               | 02; executed on explicit skill invocation                      | [x]        |
| [04 — Real browser tools](04_browser-tools.md)                       | 01, 03                                                        | [x]        |
| [05 — Profiles and state](05_profiles-and-state.md)                  | 04                                                            | [x]        |
| [06 — Transports / CDP](06_transports-and-cdp.md)                    | 01, 03                                                        | [x]        |
| [07 — Proxy / GeoIP](07_proxy-and-geoip.md)                          | 04                                                            | [x]        |
| [08 — Both extension mechanisms](08_extensions.md)                   | 01, 03                                                        | [x]        |
| [09 — Humanize / resources](09_humanize-and-resources.md)            | 04–08                                                         | [x]        |
| [10 — CI / periodic lanes](10_ci-reporting.md)                       | 03–09                                                         | [x]        |
| [13 — Separate Pages / PR report link](13_public-report-delivery.md) | 10; approved external setup                                   | [ ]        |
| [11 — Functional / platform acceptance](11_functional-acceptance.md) | 10, 13                                                        | [ ]        |
| [12 — Developer docs / translations](12_developer-documentation.md)  | 11                                                            | [ ]        |

Failed or unavailable required checks leave the owning row unchecked.
Missing native runners, real extension capability and Docker execution remain
blockers; only explicitly approved scope changes can remove a key requirement.
Review is optional, and commit/push/PR/publication require separate authorization.

Selected delivery components are explicit in `plan.md` and packet 13:
Allure Report 3, `peaceiris/actions-gh-pages` and
the project-owned guarded PR comment handler. The configured destination is
`swimmwatch/cloakbrowser-mcp-reports`. External setup and activation are recorded
in `handoff.md`; publication evidence is tied to the verified source SHA and run.

Specification reconciliation is complete: independent review passed 24/24 current items;
MCP reports pass/reviewed and Approved. All packet pins were refreshed.
Packet 01 is complete: 12 new controlled tests, inventory and cleanup verification;
`npm run check` passed. Packet 02 is complete: 43 new controlled tests and atomic, sanitized evidence
persistence/merge; `check` and `package:verify` passed. The next implementation
packet is 13, owned by the main agent on the next explicit invocation. Packet 03 is complete:
24 new controlled tests, actual Allure HTML/history, default reporter preservation,
and validated aggregate generation; check and package verification passed.
No downstream packet or external setup
is authorized by completion of packet 01.

Packet 04 is complete: real tool outcomes and recovery, exact upload/download and
network bytes, verified Free ownership, portable npm launching and controlled PNG
reporting. Four new unit/integration regressions; check and all 6 npm E2E passed.
See the current handoff for commands, retained report and unexecuted platforms.

Packet 05 is complete: persistent cookies/localStorage and seed survive restart,
independent profiles and concurrent temporary sessions stay isolated, and profile
contention/setup failure leave the original owner usable and permit reacquisition.
All 8 npm E2E and required checks passed. See current handoff for exact evidence.

Packet 06 is complete: three new HTTP failure/expiry/cancellation tests and a
Free/isolated CDP setup guard. All 14 CDP cases run without skips. Required host
checks and full E2E with the explicit controlled Playwright executable passed;
initial environment/deadline failures and both Allure reports are preserved in
current handoff. Native platforms and default revision 1247 remain unverified.

Packet 07 is complete: all 15 controlled Proxy/GeoIP checks pass with Free Chromium.
The authorized public-builder bridge guard rejects unresolved exit IP independently
of explicit WebRTC spoofing. Seven unit regressions and two restored mutations
verify validation, precedence and profile cleanup. Required check, package
verification and Allure generation pass. See current handoff for evidence and
unexecuted platforms. Packet 08 requires a separate invocation.

Packet 08 is complete: seven real Free Chromium E2E scenarios cover unpacked loading,
official attachment, token rejection/no origin action, UI disconnect/recovery,
profile isolation and partial-startup cleanup. Allure `extensions` is available;
required checks and report generation pass. Native platforms/Docker and general
heap measurements remain unverified. Packet 09 requires a separate invocation.


Packet 09 is complete: twenty real lifecycle cycles and both humanize presets
are verified, with whole-operation teardown deadlines, explicit duplicate/Shift
outcomes and actual detached-reference collection. The asynchronous profile-lock
observation was corrected to the unchanged 10-second contract. Failed and passed
Allure lifecycle reports are retained. Final check: 652 passes, four unchanged
skips and six fast CLI E2E passes. Next: packet 10 on a separate invocation; current
handoff records reused npm/extension evidence and remaining platform limitations.


Packet 10 is complete: safe existing-CI producers and combined Allure artifacts,
trusted default-branch history and scheduled/manual native/Docker functional lanes.
Seventeen CI integration cases, reporting probe, final reported check, local actual
producer aggregation, actionlint and zizmor passed. The retained HTML has 675
passes/four unchanged skips. Remote/platform execution remains unverified in 11;
separate report repository/publication remains 13. Next: 13, separately invoked.


Packet 13 remains unchecked pending its remaining acceptance gates. Local publisher implementation, 31 focused tests, check (700 passed / 4 skipped plus six CLI cases), actionlint, offline zizmor and controlled Free Chromium rendering pass. Setup/rollback instructions are in packet 13. External setup and activation were performed; publication was verified for the previous PR head. The current handoff owns remaining gates.
