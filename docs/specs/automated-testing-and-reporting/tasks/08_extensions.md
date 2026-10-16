# 08 — Real extension attachment

Status: Complete; both real extension mechanisms and required host checks passed
Requirements: TEST-007, TEST-010, TEST-011
Dependencies: 01 and 03 complete; Free ownership, safe reports and local pages available

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Automate both existing mechanisms: unpacked extension loading and connection
through the official Playwright Extension. Configuration mocks alone are insufficient.

Evidence: `src/bridge/config.ts:364` validates connection mode/conflicts;
`tests/unit/config.test.ts:1145` covers unpacked configuration;
`docs/recipes/load-chrome-extension.md:11` distinguishes mechanisms;
`docs/configuration.md:281` owns token/profile restrictions;
installed upstream relay at
`node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js:75016`,
`:75025`, `:75075` selects executable/profile, token and connection timeout.
The source commit matching upstream core is
`e8149b8257d32dcf8f72573ecc43e72439da7080`:
`packages/extension/` and the
[upstream extension fixture](https://github.com/microsoft/playwright/blob/e8149b8257d32dcf8f72573ecc43e72439da7080/tests/extension/extension-fixtures.ts#L49).

## Scope and ownership

Allowed: `tests/e2e/extensions.manual.ts`, `tests/helpers/browser-extension.ts`,
`tests/fixtures/extensions/`, existing extension/config/HTTP tests,
distribution/TLS helpers as narrowly needed, reporter selector and
plan/checklist/handoff. Official extension build/download data live only in
owned temporary directories; retain Apache-2.0 notices/pin metadata.
No project dependency additions for its build, Web Store install/update,
personal profile, runtime relay rewrite or new public options.

Prepare official extension 0.4.0 from the exact pinned Playwright tree and its
lockfile in a disposable checkout; run the upstream Vite extension build there.
Derive extension ID from the pinned manifest. Fixture starts headed known Free
Chromium with an explicit persistent profile and official unpacked extension;
preserve singleton behavior as the official fixture does by omitting
`--enable-automation`. Register actual extension/profile installation state
following upstream's test fixture, not a fake relay handshake.

Read the synthetic profile token through the real extension UI, pass it only via
existing process-level token configuration, and select profile using the existing
bridge userDataDir/profileDirName settings. Harness owns token, browser, worker,
client and checkout; screenshots may show only the controlled local page, never
extension connect URLs/token UI. Linux headed runs use an available display/Xvfb;
other native runners require their actual display capability.

## Test-first acceptance and early feasibility

Run an early real attachment probe before implementing the full suite. It must
show actual official extension readiness, client attachment and a local-page action
through the installed package. Record Free version/platform and display evidence.
If Free/singleton/extension support is unavailable, leave the packet blocked;
do not replace attachment with mocks, Pro or private test adapters.

| Mechanism | Required assertions |
| --- | --- |
| Unpacked launch | Controlled content script changes local page marker; persistent-profile requirement and unsupported config combinations remain tested |
| Official attachment | Client binds to controlled browser tab; MCP click/navigation changes actual page; no separate competing browser launches |
| Token/pairing rejection | Missing/wrong token is explicitly rejected or times out with documented error; browser/page remains usable and no unauthorized action occurs |
| Disconnect/recovery | Extension-side disconnect becomes an explicit client failure; supported fresh pairing/restart acts on the page again |
| Isolation/cleanup | Dedicated profiles remain isolated; browser/worker/relay sockets/clients/checkout close on success, wrong token and partial startup |

RED: write action/rejection/cleanup assertions first, then make fixture executable.
PROVE newly written existing-behavior and absence assertions by withholding
extension loading, changing synthetic token or suppressing the controlled effect
one at a time. Restore all mutations. Match exposed errors without hardcoding
private implementation strings.

## Commands and prerequisites

Prerequisites: 01/03, known Free, actual headed display, locked upstream extension
build prepared in a temp root. Declare `extensions` reporter selector.

```bash
rtk proxy npm exec -- vitest run tests/unit/config.test.ts
rtk proxy npm exec -- vitest run --config vitest.distribution-e2e.config.mjs tests/e2e/extensions.manual.ts
rtk proxy npm run test:report -- --suite extensions
rtk proxy npm run check
```

Recheck required native-platform execution in packets 10/11; a Linux success does
not prove macOS/Windows. Positive/negative attachment must precede final docs
removing the old manual-only statement.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.

## Execution evidence — 2026-10-10

Completed on explicit context-scouting/incremental-implementation invocation.
Production code, upstream contracts, dependencies, release version and workflows
remain unchanged. The previous packet's Approved pins and completed evidence were
rechecked. Only this packet was executed.

Seven real Free Chromium checks run through the installed npm package:

| Scenario | Observable evidence |
| --- | --- |
| Unpacked content script | Persistent-profile page exposes the controlled dataset marker and a real click changes its output; actual browser PID terminates after bridge shutdown |
| Official attachment | Source-built Extension 0.4.0 worker and UI token; local navigation/click changes a page observed independently in the owned browser; original browser PID unchanged |
| Missing token | Process initialization fails with the documented non-empty token requirement; origin request count unchanged; browser stays usable and valid pairing works |
| Wrong token | Actual official rejection UI and upstream connection timeout; origin request count unchanged; browser stays usable and fresh valid pairing works |
| Disconnection/recovery | Actual pending-page marker observed before official UI Disconnect; pending MCP call fails explicitly; fresh client pairs and changes the page |
| Profile isolation | Two headed profiles expose distinct synthetic UI tokens; neighbouring token rejected without origin traffic; both valid pairings act independently |
| Partial startup | Headed browser starts without extension loading, actual PID is captured, worker readiness times out, browser terminates and profile is removed |

The official source/lockfile is fetched at the pinned commit into an owned temporary
checkout, installed with lifecycle scripts disabled and built with upstream Vite.
Apache-2.0 source notices remain in that checkout until disposal. ID derives from
its manifest key. The fixture preserves browser singleton behavior by omitting
`--enable-automation`, creates the upstream-described installation directory, and
uses the existing `PLAYWRIGHT_MCP_EXECUTABLE_PATH` to choose the verified Free binary
for relay attachment. The relay engine remains Playwright; this is not Cloak
launch-option injection. Automatic token pairing creates a controlled grouped tab,
so the independent observation checks the owned context rather than assuming the
initial page was selected. No private relay adapter or Web Store install.

Controlled content source uses the existing TypeScript dependency to emit a classic
content script in temporary data; no ESLint budget, dependency or check weakened.
The owner closes clients/browser contexts, verifies actual PIDs and observed relay
ports, and checks runtime removal before the distribution fallback cleanup.
Tokens are read only from synthetic profiles, redacted from bounded messages and
original stack traces; extension/token UI is never captured in screenshots.

Initial helper absence was a collection failure, not behavioral RED. New reporter
suite test observed behavioral RED (`unknown suite`) before selector implementation.
Three isolated PROVE mutations detected: wrong content-script effect, replacing the
wrong token with a valid one, and omitted profile removal. All were restored.
An intermediate cleanup mutation first exposed lost error text after sanitization;
that diagnostic was repaired and the rerun failed at the intended surviving-profile
assertion. Scoped lint/type issues were corrected without rule suppression.

Final report run: `packet08-complete-20261010`, seven passes, no skips; Allure 3.20.1
summary matches seven passes and complete HTML. No synthetic invalid-token canary
in 42 raw/report files. `npm run check`: 649 unit/integration passes, four unchanged
skips across 57 files, and six fast fake-upstream CLI E2E passes. Focused config/CLI:
103 passes. Package verification: 177 files. Final typecheck/scoped ESLint and
`git diff --check` pass; repository lint retains ten existing warnings.
Specification MCP remains pass/reviewed/Approved with unchanged pins.

Linux x64 / Node 24.20.0 / DISPLAY :1 / Free Chromium 146.0.7680.177.5. Native
macOS/Windows/arm64, Docker, coverage rerun and general heap/RSS measurements were
not executed here. Missing/wrong-token and partial-startup resources are verified,
but this does not establish platform compatibility or general memory-leak freedom.
Preparation needs Git/npm network access; browser scenarios use local fixture pages.
Wrong-token relay failure uses upstream's standard 30-second timeout.

See current handoff for commands and report. Stop here; packet 09 requires a new
explicit invocation. No commit, push, PR, remote CI or publication performed.
