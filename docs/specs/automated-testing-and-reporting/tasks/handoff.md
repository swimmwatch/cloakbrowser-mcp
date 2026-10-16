# Current handoff

## Reporting evidence checkpoint — 2026-10-12

PR 169 CI run [38252904268](https://github.com/swimmwatch/cloakbrowser-mcp/actions/runs/38252904268)
completed successfully for SHA `4a800b8d5d313676b39dc5a141dc367f5d442adb`.
The combined report and publisher passed. The [published report](https://swimmwatch.github.io/cloakbrowser-mcp-reports/pr/169/run/38252904268-attempt-1/4a800b8d5d313676b39dc5a141dc367f5d442adb/)
index and `widgets/statistic.json` returned HTTP 200: 20,559 total,
20,375 passed, 184 skipped, and 48 retries. The [PR report comment](https://github.com/swimmwatch/cloakbrowser-mcp/pull/169#issuecomment-6109862289)
points to that exact SHA/run/attempt. `TEST_REPORT_PUBLICATION_ENABLED` was true.

At the inspection snapshot, the current PR head was
`5c2ceba44526a2630dbf8b46ab4d20ce9399b7af` and
[run 38298716895](https://github.com/swimmwatch/cloakbrowser-mcp/actions/runs/38298716895)
was in progress. The previous run does not establish acceptance of that head
or complete packet 13. Packets 11 and 12 remain planned. This checkpoint
supersedes the setup status below; dated implementation evidence is retained.

## Packet 13 external setup in progress — 2026-10-11

Only packet 13 is authorized. Packets 01–10 are complete; 13 stays unchecked.
The user confirmed the proposed destination and authorized external setup, Pages/App and publication/comment activation on 2026-10-11. No downstream packet is authorized; do not launch or poll remote CI.

- Worktree: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`.
- Branch: `release/v1.15.0`; main `feature/cdp-protocol` untouched.
- Source: `b5768150e20c92ec9131fc4c767229b1f076ed86e089fc5f9829e737eb09f9ba`.
- Specification: `bce84e8b28612a6db2d677395921717b37003dab1f993d0ec867dee1dc2b7627`.
- Review: `10107cff-c8d4-488d-9294-ccb07412a357`.
- Scenario MCP: pass/reviewed/Approved. Preserve preceding dirty packets and
  skill cleanup. Managed workflow YAML was not edited during implementation.

## Changes and evidence

`scripts/publish-test-report.mjs` and
`.github/workflows/publish-test-report.yml` implement the trusted default-branch
publisher, disabled by default. API-derived identity; validated matrix merge and
Allure regeneration; immutable separate-repository paths; exact deployment/hash
verification; bot-author/marker/current-head/run guards; idempotency; unavailable
fallback; scoped 14-day cleanup. Public tree contains only generated HTML and
publication metadata, never producer HTML/raw results/history.

`tests/unit/test-report-publisher.test.ts` and
`tests/integration/test-report-publisher.test.ts`: 31 cases pass (15/16).
`eslint.config.js`: approved technical limit 44 → 45, rules preserved.
Plan and packet pins/components now match the approved handler amendment.
Packet 13 contains concrete setup/rollback instructions and audited Action pins.

Working directory for all checks is the worktree above:

- `npm run check`: exit 0; 700 passed, 4 unchanged skips, 60 files; six fast CLI
  E2E passed. Log `/tmp/packet13-check-final.log`.
- Focused publisher run: 31 passed; `/tmp/packet13-final-focused.log`.
- Pinned Docker actionlint: exit 0; `/tmp/packet13-actionlint-final.log`.
- `python3 -m pipx run zizmor --min-severity high .`: exit 0, offline.
  One documented inline exception for the intentional privileged trigger;
  no global suppression or weakened source permissions.
  `/tmp/packet13-zizmor-final.log`.
- RED/GREEN/PROVE detail is in packet 13. Six new restored mutations detected
  author/idempotency/API/retention/source-rights/checkout regressions.
- Actual malicious-result rendering probe on verified Free Chromium
  `146.0.7680.177.5` opened a test detail, found no executed attack, executable
  handler node or synthetic secret. Browser and temporary files cleaned.

Local evidence is Linux x64 / Node 24. No native macOS/Windows or new Docker
functional run, coverage rerun, general memory-leak pass or public deployment
is claimed. Packet 10's CI producers/history/Codecov and source documentation
deployment remain outside these changes.

## External setup performed — 2026-10-11

- Created public reports-only repository:
  https://github.com/swimmwatch/cloakbrowser-mcp-reports
- Initialized gh-pages with .nojekyll, commit
  ebfb24051d2e792983794dee8f6ec2479ff33bbf.
- Pages GET confirms build_type legacy, source gh-pages/root, URL:
  https://swimmwatch.github.io/cloakbrowser-mcp-reports/
  Creation POST returned 409 because gh-pages had already enabled Pages; GET
  confirms the intended configuration. Public URL rendering is not verified.
- Source Pages GET still confirms build_type workflow and the original
  documentation URL, source main/root and no CNAME. No source Pages write occurred.
- Source variable TEST_REPORT_REPOSITORY is swimmwatch/cloakbrowser-mcp-reports;
  TEST_REPORT_PUBLICATION_ENABLED is false pending functional prerequisites.
- Created GitHub App CloakBrowser MCP Reports (App ID 5267277), installed only
  on swimmwatch/cloakbrowser-mcp-reports (installation 170077714). The user
  confirmed the exact access and generated the private key through GitHub.
- Saved TEST_REPORT_APP_CLIENT_ID and Actions secret TEST_REPORT_APP_PRIVATE_KEY.
  RSA validation passed. A short-lived installation token confirmed exactly one
  accessible repository, Contents write, Pages read and Metadata read; the token
  was revoked after verification. No key or token was printed.
- Existing gh CLI OAuth access cannot list GitHub App user installations
  (403); no credential substitution or broader token was introduced.
- Live origin/main SHA: 7e5ddd045e82f8ed1d8ddd8d37b9598393d9ae43.
  It lacks the publisher and reporting dependencies (scripts/test-report.mjs,
  scripts/lib/test-results.mjs, scripts/lib/test-diagnostics.mjs, allure.config.mjs
  and scripts/testing). Source delivery must include the necessary reporting
  prerequisites and producers; publisher-only delivery is unusable.
  The scout's claim that the integration test was absent was disproved by local
  ls; tests/integration/test-report-publisher.test.ts exists.
- No source commit/push/PR/merge, remote CI launch/polling or real report/comment
  publication occurred in this activation step. Previous local tests are reused,
  not reported as newly executed.

## Remaining required work and owners

Packet 13 stays unchecked until App/credentials, trusted default-branch workflow
delivery, activation and the approved live proof are complete. Permission for
external setup has been received; do not ask for it again. Browser-specific
action-time confirmation rules still apply to security-sensitive access creation.

## Source delivery consolidated into release — 2026-10-11

The user authorized completing all remaining delivery actions. An isolated
reporting-only worktree was prepared at
`/home/dmitry-vasiliev/.codex/worktrees/report-publication/cloakbrowser-mcp`.
Commit `d6213f25bc6f98107ca2ceadc3094090f4795f87` was pushed on
`feature/test-report-publication`; PR 167 was closed at the user's request on 2026-10-11:
https://github.com/swimmwatch/cloakbrowser-mcp/pull/167. Its squash auto-merge
was disabled. Delivery now belongs to `release/v1.15.0`; no replacement PR
was created. Reporting implementation and CI fixes remain in that worktree.

The delivery includes existing PR-matrix reporting, its full implementation and
tests, and patched production SDK/proxy-addr dependencies. Extended periodic
browser suites remain excluded because their release/runtime prerequisites are
not in main. Existing CloakBrowser, Playwright MCP, Docker and project versions
are preserved. Release worktree changes remain intact.

On the exact delivery tree, final check passed (643 tests, four existing skips,
six CLI E2E); coverage passed (statements 86.75%, branches 80.52%, functions
89.01%, lines 89.44%); package verification, Allure probe, docs build/SEO,
production audit, actionlint and zizmor passed. Production audit retains eight
moderate findings. Logs are `/tmp/report-publication-*.log`.

Repository auto-merge was enabled earlier; PR 167 auto-merge is now disabled. Existing rules are unchanged: six required CI contexts and one independent
approval with last-push approval. No admin bypass was used.

Publication variable is now true, ready to take effect when trusted workflow
delivery reaches main; no publication code exists in current main yet. This
avoids a second manual activation step without executing PR code. Source Pages
configuration was read back and remains unchanged. No remote CI was manually
dispatched, polled or awaited; push/PR events naturally trigger existing workflows.

Next action: an eligible independent repository reviewer supplies the required
approval; GitHub merges automatically once all required checks pass. The main
agent inspects live report/SHA/run/attempt and documentation only when the user
requests inspection of completed CI. Packet 13 stays unchecked until that live
acceptance. Do not start packets 11/12 or wait for remote CI.

## CI fixes — 2026-10-11

The OS-variant regression now checks Linux, macOS and Windows with distinct
labels. Reporting fixtures use a fixed synthetic canary rather than logging
environment values. Both worktrees contain the fixes. On the reporting tree,
`npm run check` passed (645 tests, four existing skips, six CLI E2E); the Allure
probe passed. The release-tree reporting suite passed all 27 tests. Remote
CodeQL and native Windows validation remain unverified for these local changes.
The agent owns source preparation and checks; the user authorized commit and push on 2026-10-11. Completed remote CI will be inspected only when requested.

## CI gap fixes — 2026-10-11

Run 38130650831 exposed three setup/contract defects: a missing cold Cloak cache,
console Chromium revision mismatch, and an unconditional npm-only filename
expectation against Docker MCP 0.0.82. Local production E2E additionally exposed
CloakBrowser humanization's missing optional `playwright-core` peer.

Managed CDP now belongs to the E2E matrix on all five native environments with
Node 26; an additional Linux Node 22 cell preserves minimum-major coverage.
The required E2E gate includes all six CDP cells. The report inventory is 90
producers. Cold-cache acquisition is shared by npm, CDP, proxy, extensions and
lifecycle suites; downloads use isolated caches without inherited licenses.
Windows/macOS inspect only the owned browser PID using native OS commands.

Console tests explicitly select the installed Chromium executable. npm declares
a compatible stable `playwright-core` production peer for humanization; the
Docker package links that peer to the core from the official base image.
Docker parity checks complete upstream schemas and records optional filename
support; npm E2E separately requires filename persistence. Docker 0.0.82 success
must never be presented as 0.0.83 validation. Release/Docker version blockers
remain in force. Native Windows/macOS acceptance requires a new CI run; the
agent will inspect completed remote results only when the user requests it.
