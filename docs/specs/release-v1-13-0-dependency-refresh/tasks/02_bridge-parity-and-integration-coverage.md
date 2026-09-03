# 02 — Bridge parity and integration coverage

## Outcome

Adapt only proven compatibility points for CloakBrowser 0.5.10 and Playwright
MCP 0.0.80, then extend the regression coverage that protects their public
integration boundaries.

## Prerequisites and ownership

Requires completed packet 01. Owns CLOAK-01, CLOAK-02, CLOAK-03, PW-01,
PW-02, PW-03, and COMP-01.

## Scope and contracts

- Preserve public use of `ensureBinary`, `binaryInfo`, `buildLaunchOptions`,
  `getDefaultStealthArgs`, and `humanizeBrowser`; never use private
  CloakBrowser internals.
- Add a unit case proving a `buildLaunchOptions` rejection is propagated as-is
  and that the prepared temporary runtime is disposed.
- Extend the humanization smoke to run an action after navigation and exercise
  `browser_select_option`.
- Update parity baselines and the referenced upstream commit to Playwright MCP
  `0.0.80` / `4c1fb03bad3bae379b0ae0e3d81d2660de56bd91`.
- Add a `PLAYWRIGHT_MCP_CAPS=devtools` schema-parity path that compares the
  baseline and bridge and requires `browser_start_recording` and
  `browser_stop_recording`. Default parity remains exactly the 24 upstream
  tools; no upstream tool schema may be rewritten.
- Do not add a `--caps` bridge flag: the child already inherits
  `PLAYWRIGHT_MCP_*`. Do not add SessionSeats/getSessionSeats or alter the two
  local tools. Do not claim Windows ARM64 support.

## Expected files

Likely `src/bridge/config.ts`, `tests/unit/config.test.ts`,
`scripts/compare-playwright-mcp-bridge.mjs`,
`scripts/lib/playwright-mcp-parity.mjs`, and the closest test fixtures. Amend
only evidence-required files.

## Acceptance and verification

- The new unit test observes the original error object/message and a removed
  temporary runtime path.
- Humanization smoke executes an action after navigation and `selectOption`.
- Default parity asserts 24 unchanged upstream tools; devtools parity asserts
  identical schemas and both recording tools.
- Run `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm run test:unit`, `npm run test:integration`, and the relevant parity
  command after packet 01's Docker image exists.

## Failure handling and manual gates

Fail closed on unmatched schemas or upstream errors; keep cleanup behavior.
Do not weaken assertions, alter MCP contracts, or publish artifacts. Commit,
push, PR, GitHub mutations, merge, tag, and publication are MANUAL GATE.

## Completion checklist and handoff

- [ ] CloakBrowser public integration and cleanup error regression covered.
- [ ] Default and devtools upstream parity covered.
- [ ] Focused checks completed.
- [ ] `todo.md` and `handoff.md` updated; packet 03 is next.
