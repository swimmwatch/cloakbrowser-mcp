# Reporting source delivery

Current delivery: consolidated into `release/v1.15.0` and PR 169. Publication is
enabled. Verified publication evidence covers SHA
`4a800b8d5d313676b39dc5a141dc367f5d442adb`; current-head acceptance remains open.

## Initial preparation snapshot — 2026-10-11

Prepared: 2026-10-11. No source commit, push, PR, merge or CI dispatch performed.
Verified source main: `7e5ddd045e82f8ed1d8ddd8d37b9598393d9ae43`.

## Delivery boundary

Deliver the reporting implementation from packets 02/03/10/13 together. The
publisher imports `scripts/test-report.mjs`, which imports both result validation
and diagnostic sanitization. Generation also requires the trusted Allure config
and package. CI must produce the `test-results-*` artifacts before publication.
Do not copy the entire release worktree or stage all dirty files.

### Implementation files

- `.github/workflows/publish-test-report.yml`
- `.github/workflows/test-reporting.yml`
- Reporting producer/upload/aggregation changes in `.github/workflows/ci.yml`
- `scripts/publish-test-report.mjs`
- `scripts/test-report.mjs`
- `scripts/lib/test-results.mjs`
- `scripts/lib/test-diagnostics.mjs`
- `scripts/testing/allure-reporter.ts`
- `scripts/testing/report-configuration.ts`
- `allure.config.mjs`
- Reporter integration in `vitest.config.ts`, `vitest.e2e.config.ts` and
  `vitest.distribution-e2e.config.mjs`
- Reporting npm scripts and the pinned `allure@3.20.1` development dependency
  from `package.json`; regenerate the corresponding lockfile on the delivery base
- Only the necessary reporter file matches and approved technical default-project
  limit in `eslint.config.js`; preserve all rules

### Regression tests and fixtures

- `tests/unit/test-diagnostics.test.ts`
- `tests/unit/test-results.test.ts`
- `tests/unit/test-report-cli.test.ts`
- `tests/unit/test-report-publisher.test.ts`
- `tests/integration/test-results-merge.test.ts`
- `tests/integration/test-reporting.test.ts`
- `tests/integration/test-report-ci.test.ts`
- `tests/integration/test-report-publisher.test.ts`
- `tests/fixtures/reporting/cases.fixture.ts`
- `tests/fixtures/reporting/controlled-png.ts`
- `tests/fixtures/reporting/vitest.config.ts`

Keep the existing documentation and instructions for reporting with the delivery.
Review their reporting-only hunks separately from release notes and browser changes.

## Changes excluded from this delivery

- Runtime source, CloakBrowser/Playwright dependency upgrades and release version
- CDP feature work, browser behavior changes and unrelated E2E scenario additions
- Whole-project call-argument refactoring and local skill cleanup
- Docker base, release workflow, compatibility release rows and documentation Pages
- Generated reports, caches, coverage, build output and downloaded private keys

The current package and lockfile include dependency upgrades unrelated to
reporting. Configuration files also contain call-argument refactoring. Extract
reporting changes against the verified main base; do not copy these files wholesale.

## External configuration verified

- Destination: `swimmwatch/cloakbrowser-mcp-reports`, Pages `gh-pages` / root
- App ID: `5267277`; installation: `170077714`
- Access: exactly the destination repository; Contents write, Pages read,
  Metadata read
- Source variable `TEST_REPORT_APP_CLIENT_ID` and secret
  `TEST_REPORT_APP_PRIVATE_KEY` saved and checked without printing credentials
- A temporary installation token successfully read the destination and Pages
  configuration, then was revoked
- `TEST_REPORT_PUBLICATION_ENABLED=false`
- Source documentation Pages configuration remains unchanged

## Original delivery and verification sequence — 2026-10-11

1. Obtain separate authorization for source commit, push and PR actions.
2. Prepare the reporting-only delivery against current main and inspect its full
   diff. Re-resolve the lockfile without changing runtime dependency versions.
3. Run reporting tests, `npm run check`, pinned actionlint and zizmor on that exact
   delivery tree. Prior release-worktree results do not verify a new extracted tree.
4. Deliver through the authorized PR process. Merge remains a separate action.
5. After trusted default-branch delivery, enable the already authorized report
   publication. Do not automatically dispatch, poll or wait for remote CI.
6. When the user requests inspection of completed CI, verify the report URL,
   PR head SHA, run/attempt, matrix variants and preservation of documentation.

Packet 13 stays incomplete until delivery, activation and requested live acceptance.
Original next owner: the main agent prepares the isolated delivery after the required source
delivery authorization; the user owns authorization and merge decisions.

## Execution checkpoint — 2026-10-11

The separate reporting PR [167](https://github.com/swimmwatch/cloakbrowser-mcp/pull/167)
was closed at the user's request and its squash auto-merge was disabled.
Delivery is consolidated into `release/v1.15.0`; reporting implementation,
periodic suites and the Windows/CodeQL CI fixes remain in the release worktree.
No replacement PR or commit was created in this step.

`TEST_REPORT_PUBLICATION_ENABLED=true` remains configured, but publication
requires the trusted workflow to reach main. Documentation Pages and App
configuration are unchanged. Live acceptance is pending. The agent owns
source preparation and local checks; the user authorized commit and push on 2026-10-11.
Inspect completed remote CI only when the user requests it.
