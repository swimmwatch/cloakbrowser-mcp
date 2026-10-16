# 02 — Safe evidence persistence and merge

Status: Complete — executed on explicit invocation, 2026-10-10
Requirements: TEST-006, TEST-007, TEST-009, TEST-010
Dependencies: 01 complete; fixture cleanup and inventory evidence available

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Provide one safe boundary for structured results, diagnostic attachments and
cross-job merging before enabling any reporter output.

Existing script imports use `package.json:17`; TypeScript tooling scope includes
`tsconfig.json:28`. Runtime logs/tool contracts stay owned by `src/server.ts:98`.
Existing package files allowlist is `package.json:28`; it must exclude reports.

## Scope and ownership

Allowed: `scripts/lib/test-results.mjs`, `scripts/lib/test-diagnostics.mjs`,
`tests/unit/test-results.test.ts`, `tests/unit/test-diagnostics.test.ts`,
`tests/integration/test-results-merge.test.ts`, and plan/checklist/handoff.
No runtime, workflow, dependencies or production CLI changes.

User-authorized scope extension (2026-10-10): `eslint.config.js`, solely increasing
the default-project file-count budget from 40 to 42 for these two new `.mjs`
helpers. All lint rules remain unchanged. The original full check demonstrated
that the existing budget was exceeded; this is a tooling-budget adjustment.

`sanitizeDiagnostic` accepts structured metadata/text and explicitly registered
controlled-local PNG bytes. It returns bounded safe evidence, never reads arbitrary
file paths and never serializes the complete environment. Reject unknown binary or
untrusted screenshot provenance. Text limit: 128 KiB; PNG: 2 MiB; total per test: 6 MiB.

`writeTestResult` receives validated identity, environment, status, timing/errors,
retry evidence and safe attachments. It atomically writes standard Allure JSON,
UUID-named attachments and a producer manifest inside one run/producer directory.
Flush completes before reporting succeeds. Validation/I/O/empty-result failures
are actionable developer diagnostics without copying rejected input.

`mergeTestResults` reads producer manifests and bounded allowlisted result fields.
Validate contained paths with real paths and reject symlinks/traversal. Preserve
environment variants and attachment references; identical UUID+content may be
deduplicated, different content with the same UUID must fail without overwriting.
Reject malformed/unsupported metadata, missing producers and incomplete flushes
as incomplete evidence. Inputs are data, never executable code.
Writer/merger depend on diagnostics; runtime does not import either.

## Test-first acceptance

| Criterion        | RED test                                                                                                              | GREEN / required PROVE                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Usable evidence  | Write pass/fail/broken/skip records with timestamps, stack and environment                                            | Parse emitted Allure JSON, preserving safe errors/statuses without mirroring internals                                    |
| Secret exclusion | Synthetic bearer/cookie/key/password/proxy userinfo/CDP URL and known secret-value canaries in labels/logs/errors     | Canary strings absent before persistence; remove one redaction rule and prove the intended absence assertion fails        |
| Safe attachments | Controlled local PNG/text succeed; unsupported binary, remote provenance, oversized content fail                      | No rejected bytes persist; mutate provenance/size check separately and prove failures                                     |
| Merge integrity  | Two producers with repeated test identities but distinct environment variants, referenced attachments and one failure | All results survive; conflicting UUID/missing producer/symlink/traversal fail. Disable one validation to prove protection |
| Atomic cleanup   | Fault injection during write/flush and repeated disposal                                                              | No partial producer marked complete, no leaked temporary files; observable filesystem assertion                           |

Use `tmpdir()` roots, synthetic values and explicit cleanup. Do not log raw canaries
or attach external-page screenshots. Redact again on merge even if a producer says
its results were sanitized.

## Commands and prerequisites

Prerequisites: packet 01 ownership helper; locked dependencies. Add tests first.

```bash
rtk proxy npm exec -- vitest run tests/unit/test-results.test.ts tests/unit/test-diagnostics.test.ts
rtk proxy npm exec -- vitest run tests/integration/test-results-merge.test.ts
rtk proxy npm run check
rtk proxy npm run package:verify
```

No Allure installation yet. JSON compatibility is validated by actual Allure
generation in packet 03; until then do not describe this writer as proven end-to-end.

## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
