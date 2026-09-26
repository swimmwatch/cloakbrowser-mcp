# Packet 03 — Add The Native Windows ARM64 Smoke Harness

## Outcome

Add an opt-in packaged-candidate E2E harness that runs the real upstream
Playwright MCP bridge with the default CloakBrowser engine on native Windows
ARM64 and independently proves the required Free and Pro flows.

## Prerequisites And Dependencies

- Packet 02 is complete and installs the stable qualified dependency.
- The executor has a native Windows ARM64 environment for acceptance.
- The Free smoke requires network access to signed public artifacts.
- The Pro smoke requires a credential only through the manual gate below.

## Owned Requirements

- R1 Supported Platform
- R3 Free First-Run And Cached Flow
- R4 Pro First-Run And Cached Flow
- R5 Transparent Cache Transition
- R6 Diagnostics
- R7 Failure, Integrity, And Cleanup
- R8 Public Interface Stability
- R10 Native Free CI Gate, for its executable harness
- R11 Protected Pro CI Gate, for its executable harness

## Scope

Create separate Free and Pro manual E2E entry points backed by shared helpers:

- Pack the current repository with `npm pack`, install the tarball into a
  temporary project, and invoke its installed `cloakbrowser-mcp` executable.
- Require and assert `process.platform === "win32"` and
  `process.arch === "arm64"` before any acceptance scenario.
- Use the installed package's real `@playwright/mcp` child and leave
  `PLAYWRIGHT_MCP_BROWSER_ENGINE` and `PLAYWRIGHT_MCP_CLI_PATH` unset. The
  existing fake-upstream distribution E2E remains unchanged.
- Serve a deterministic page from a loopback-only Node HTTP server, call the
  existing upstream browser tools through stdio MCP, and prove a browser action
  against that page.
- Set `CLOAKBROWSER_CACHE_DIR` to a test-owned `tmpdir()` directory. Clean up
  only paths created by the test.
- Inspect the resolved executable from the existing
  `cloakbrowser_binary_info` result. Validate DOS `MZ`, PE signature, and the
  little-endian COFF Machine field at `e_lfanew + 4`; it must equal `0xAA64`.

The Free entry point must:

1. remove `CLOAKBROWSER_LICENSE_KEY` from the child environment;
2. start from a clean cache, resolve the signed Free binary, launch it, perform
   the loopback browser action, and assert diagnostics report
   `windows-arm64`, tier `free`, and `installed: true`;
3. start a second bridge with the same cache, prove the same verified native
   binary is reused, and repeat the browser action;
4. seed a same-version x64 PE cache entry using the qualified upstream
   package's own `binaryInfo()` paths for fixture placement, then prove a native
   start replaces or isolates it without a manual purge and without removing an
   unrelated sentinel cache entry;
5. exercise concurrent clean-cache starts and a partial/unverified cache
   fixture, proving no partial or wrong-architecture executable is treated as
   installed.

The Pro entry point must:

1. read the existing `CLOAKBROWSER_LICENSE_KEY` only from its process
   environment and fail generically if absent;
2. use a distinct clean temporary cache, resolve Pro without Free fallback,
   launch it, perform the browser action, and assert diagnostics report
   `windows-arm64`, tier `pro`, and `installed: true`;
3. repeat with the warm Pro cache;
4. collect child stderr only for assertions, verify it does not contain the
   exact credential, and redact the value before constructing any failure
   message.

Add explicit package scripts for the two manual entry points. They are CI-facing
test scripts, not public runtime environment or CLI contracts.

## Non-Goals

- Do not change bridge runtime code or duplicate upstream platform/download
  logic in production.
- Do not modify upstream browser tool names or schemas.
- Do not make real binary downloads part of the default local `npm test` or
  fake-upstream distribution suites.
- Do not use the system CloakBrowser cache, a remote test page, x64 emulation,
  `CLOAKBROWSER_BINARY_PATH`, or the Playwright fallback engine.
- Do not log, persist, snapshot, upload, or pass a Pro credential as a command
  argument.

## Relevant Contracts

- The runtime remains a thin stdio/HTTP bridge; the smoke uses stdio only to
  prove the packaged default launch path.
- Existing local tool output shapes are asserted, not changed.
- The test may import the packaged `cloakbrowser` dependency for fixture path
  discovery only; production code must not reproduce its cache layout.
- All test files and caches live under unique `tmpdir()` roots and are removed
  in `finally`/cleanup hooks.
- Missing manifest, invalid signature, checksum mismatch, and corrupt archive
  rejection remain upstream-owned and must already be evidenced by packet 01.
  This packet adds consumer evidence for partial, concurrent, and
  wrong-architecture cache behavior.

## Expected Files

- `package.json`
- `tests/e2e/windowsArm64NativeHarness.ts`
- `tests/e2e/windows-arm64-free.manual.ts`
- `tests/e2e/windows-arm64-pro.manual.ts`
- Existing E2E helpers only if a small reusable extraction is necessary
- Packet/checklist/handoff state under
  `docs/specs/win32-arm64-support/tasks/`

Prefer the existing `vitest.distribution-e2e.config.mjs`; add no new config
unless the current manual-test include and timeouts cannot express the native
smokes. Do not rewrite `tests/e2e/distributionHarness.ts` around the real
browser path.

## Objective Acceptance

- The two scripts target distinct Free and Pro entry points.
- A non-Windows or non-ARM64 run fails clearly and cannot produce a false pass.
- Free clean, Free warm, Pro clean, Pro warm, loopback browser actions,
  diagnostics, and `0xAA64` PE checks pass on native Windows ARM64.
- The x64 cache fixture is not launched or reported installed, requires no
  manual purge, and does not erase the unrelated sentinel.
- Concurrent/partial-cache coverage leaves only a verified ARM64 executable.
- Pro never falls back to Free, and captured output/failures contain no
  credential.
- Existing fake-upstream packaged E2E and public interfaces are unchanged.

## Verification

Focused platform-neutral checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:e2e:npm-package
```

Focused native Windows ARM64 checks:

```bash
npm run test:e2e:windows-arm64:free
npm run test:e2e:windows-arm64:pro
```

The Pro command is run only inside an approved protected process with
`CLOAKBROWSER_LICENSE_KEY` in the process environment. Do not include the value
in a command line or report.

Repository checks:

```bash
npm run package:verify
npm test
npm run test:integration
npm run check
```

Record environment-dependent commands as not run unless they actually ran on
native hardware. The known translation-service failure may be recorded as in
packet 02, but no other failure is waived.

## Failure, Rollback, And Recovery

- On any test failure, close MCP clients, stop the loopback server and child
  processes, and remove only explicit test temp roots.
- Never call the upstream global cache-clear operation against the default
  cache.
- If the qualified upstream API cannot support isolated fixtures without
  production duplication, stop and return the conflict to packet 01/spec
  review.
- Rollback removes only the new scripts and E2E files; the packet 02 dependency
  remains until a coordinated R13 rollback is authorized.

## Manual Gates

- **MANUAL GATE — Pro credential:** make the existing credential available only
  in a protected process environment. Never request or persist its value.
- Commit, push, PR, workflow execution, publication, and release are separate
  **MANUAL GATE** actions and are not authorized.

## Completion Checklist

- [ ] Shared packaged-candidate native harness added.
- [ ] Free clean/warm and loopback action covered.
- [ ] Pro clean/warm and no-fallback action covered.
- [ ] PE `0xAA64` and existing diagnostics asserted.
- [ ] x64 transition, sentinel preservation, concurrency, and partial cache covered.
- [ ] Credential redaction and temp/process cleanup covered.
- [ ] Existing fake-upstream distribution E2E remains green.
- [ ] Focused and repository checks recorded.
- [ ] Handoff updated.
- [ ] `todo.md` packet link checked.

## Handoff

Record the exact script names, files, native environment, cache scenarios,
credential-safety result, and all command outcomes in `handoff.md`. Packets 04
and 05 become independently eligible after this packet.

