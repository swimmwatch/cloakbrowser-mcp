# Testing

This page is for contributors and maintainers. Users who only want to run the server do not need the test suite.

The suite is split into four tiers. The first three run by default in CI and never require a real browser.

## Tiers

| Tier | Location | Default suite | Real browser | Command |
| --- | --- | --- | --- | --- |
| Unit | `tests/unit/` | yes | no | `npm run test:unit` |
| Integration | `tests/integration/` | yes | no, uses `MockBrowserAdapter` | `npm run test:integration` |
| Contract | `tests/contract/` | yes | no | `npm run test:contract` |
| Real | `tests/real/` | **no** | **yes**, requires a launchable CloakBrowser runtime | `npm run test:real` (gated by `CLOAKBROWSER_MCP_REAL_BROWSER=1`) |

```bash
npm test                  # unit + integration + contract
npm run test:coverage     # default suite with v8 coverage
```

## Vitest

Runner: [Vitest](https://vitest.dev) 2.x.

- Default suite excludes `tests/real`.
- Coverage provider: v8.
- Coverage reporters: `text`, `lcov`.
- Coverage thresholds: **lines 85 / functions 85 / statements 85 / branches 75**.
- Excluded from coverage: `src/cli.ts`, `src/index.ts`, `src/browser/cloakAdapter.ts`, and `src/tools/index.ts`. The first three are exercised via the Docker `--help` smoke and the gated real-browser test; the last is a pure registration barrel.

## Mock browser adapter

`MockBrowserAdapter` (in `src/browser/mockAdapter.ts`) is an in-memory implementation of the `BrowserAdapter` contract. It is the default backend for integration and contract tests, and it should be the default for any new tool test. Real-browser tests must opt in explicitly.

## Fixture HTTP server

A dependency-free fixture HTTP server lives at `tests/fixtures/httpServer.ts` (call `startFixtureServer()`). It binds on an ephemeral port and serves a handful of static pages used to exercise navigation, snapshot, click, type, select, screenshot, and dialog flows.

## Contract tests

`tests/contract/` asserts the MCP boundary itself, independent of any specific tool implementation:

- The tool roster matches what is registered (28 default tools today, plus capability-gated tools in the all-tools integration scenario).
- Error responses use the MCP error shape (`isError: true` + a content block).
- Capability gating: disabled capabilities cause tools to be absent from the list.
- Non-Playwright alias names that are not part of the public surface are rejected at registration.
- The logger never writes to `process.stdout` — writes to `stdout` would corrupt the JSON-RPC stream.

## Real-browser tests

`tests/real/` exercises the `CloakBrowserAdapter` against an actual Chromium runtime. They are skipped unless `CLOAKBROWSER_MCP_REAL_BROWSER=1` is set in the environment, and they require the local environment to support launching CloakBrowser. They are **not** run in CI today; that is a deferred roadmap item.

## CI

[`.github/workflows/ci.yml`](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/.github/workflows/ci.yml) runs on every push and PR:

- **quality** — matrix Node 20 + 22 on `ubuntu-latest`. `npm ci --ignore-scripts`, typecheck, lint, format:check, build, then `test:unit`, `test:integration`, `test:contract`.
- **coverage** — Node 20 only, runs `test:coverage` and uploads `coverage/` as an artifact.
- **docker** — builds the image and runs `--help` as a smoke check.
