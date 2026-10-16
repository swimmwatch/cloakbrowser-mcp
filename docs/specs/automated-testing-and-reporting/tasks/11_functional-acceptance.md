# 11 — Complete functional and platform acceptance

Status: Planned; execution requires explicit packet authorization
Requirements: TEST-001 through TEST-011
Dependencies: 10 and 13 complete; reconciled specification, functional and report-delivery evidence available

## Remote CI observation policy

The agent must not wait for remote CI completion, poll it repeatedly, or schedule
background monitoring. Inspect remote run/job status only when the user requests
it. If required jobs are pending or running, report that state and leave their
acceptance evidence unresolved. When all relevant jobs have finished, inspect
conclusions, logs and artifacts before drawing conclusions or making authorized
corrections. A cancelled, skipped or failed required check is not a pass.
CI workflows may still aggregate results automatically through job dependencies;
this policy governs agent observation, not workflow execution. Local checks remain
part of their authorized implementation packets.

## Pinned inputs

- `source_version`: `785424ba80d8dbf709c51901135a288276377b0a5aa08958d25c7d6ba2988a83`
- `specification_version`: `9eb3ca847f6421bd03834981a659066362922abcffcd79605c63d04cd9e30a7e`
- `review_ref`: `28b4daa7-1f0e-4286-ace1-eace5f685e70`
- CWD for every command: `/home/dmitry-vasiliev/.codex/worktrees/release-v1-15-0/cloakbrowser-mcp`
- Recheck pins through scenario MCP, Git status including staged/untracked files,
  and the source evidence below before editing. Preserve unrelated changes.

## Outcome and evidence

Establish actual completion of every key scenario and required environment, with
runner-derived counts, coverage and usable reports. A configured job, collected
definition, fake upstream or successful tool response is not browser evidence.

Evidence baseline: `vitest.config.ts:15`, `:20`, `:26`;
`vitest.e2e.config.ts:15`; `vitest.distribution-e2e.config.mjs:15`;
`.github/workflows/ci.yml:18`, `:33`, `:187`, `:303`.
Installed npm uses MCP 0.0.83 at `package-lock.json:991`; current Docker base
remains MCP 0.0.82. Exact container readback, not npm metadata, owns Docker evidence.

## Scope and ownership

Allowed: scenario/count/environment evidence in `tasks/plan.md`,
`todo.md`, `handoff.md`, and narrowly necessary fixes to an incorrect test
harness within already authorized packet ownership. Public-delivery acceptance
verifies packet 13's output without authorizing a new deployment or PR comment.
No runtime redesign, new scenario scope, version bump or Docker base upgrade.
A newly exposed implementation defect returns to the owning packet for correction;
do not silently widen acceptance-packet source ownership.

Acceptance owns the evidence map, not test implementation. Record each scenario's
test identifier, level, fake/real classification, engine, OS/architecture/Node,
exact command/run reference, observed assertion, executed/skipped outcome and
blocker. No duplicated counts for reruns/parameterized definitions.

## Acceptance sequence

1. Recheck specification and all dependencies. List tests, then execute required
   suites; distinguish collection from execution and intentional skips.
2. Run full unit/integration/fast CLI checks, real npm tools/state, transports/CDP,
   proxy/GeoIP, both extensions, humanize and repeated lifecycle checks.
3. Exercise successful and failed report probes, import/hook/unhandled errors,
   retry and two-launch history. Merge multiple producers, verify summary and
   locally generated HTML/attachments. Confirm failure exit propagation and
   synthetic canary exclusion.
   Verify the separately authorized Pages deployment opens by its immutable link,
   the current-commit PR comment points to the merged matrix report, failed runs
   remain visible and stale completion cannot replace a newer link. Confirm the
   project documentation deployment and site are preserved. Without live evidence,
   public delivery remains unverified rather than passed.
4. Record lines/statements/functions/branches from actual coverage output.
   Preserve 85/85/85/75 thresholds and Codecov; report statements unmeasured if
   no actual output provides it. Existing coverage instruments runtime `src`,
   not every reporting script; scenario completeness is a separate matrix.
5. Verify package/archive exclusion, Docker build/entrypoint/smoke/CDP and bridge
   parity. Read actual container MCP CLI and playwright-core versions. Old-image
   evidence cannot prove npm MCP 0.0.83 or stable release readiness.
6. Collect actual native Linux amd64/arm64, macOS arm64/Intel, Windows x64 and
   configured Node 22/24/25/26 reporter/quick-check evidence. Heavy periodic/manual
   scenarios provide real native-browser and Docker amd64/arm64 evidence without
   adding mandatory PR load.
7. Update actual pyramid, complete coverage matrix, retained duplicate rationale,
   flakes/resource findings, implemented test list and remaining gaps.

All applicable TEST-011 rows require executable tests and observed outcomes.
Unknown/expired/unavailable runner or Free capability is a blocker. P2 only covers
additional combinations and long trends. Deferring a key scenario requires an
explicit specification scope change; do not mark it passed or merely optional.

## Checks before evidence finalization

Before updating completion claims, run the discriminating suite/matrix. New
absence/structural claims must already carry PROVE evidence from their owning
packets. Do not mutate runtime solely to prove unchanged baseline constraints again.
Audit that negative probes really fail for the intended reason and that optional
retries did not turn infrastructure errors into functional success.

Prerequisites: supported Node, installed lockfile, verified Free/cache isolation,
local TLS/display capabilities, Docker, and authorized access to native CI runs.

```bash
rtk proxy npm run typecheck
rtk proxy npm run lint
rtk proxy npm run test:unit
rtk proxy npm run test:integration
rtk proxy npm run test:e2e
rtk proxy npm run test:e2e:npm-package
rtk proxy npm run test:e2e:cdp
rtk proxy npm exec -- vitest run --config vitest.distribution-e2e.config.mjs tests/e2e/proxy-geoip.manual.ts tests/e2e/extensions.manual.ts tests/e2e/browser-lifecycle.manual.ts
rtk proxy npm run test:coverage
rtk proxy npm run test:report:probe
rtk proxy npm run package:verify
rtk proxy npm run docker:build
rtk proxy npm run docker:smoke
rtk proxy npm run test:e2e:docker:run
rtk proxy npm run test:e2e:cdp:docker:run
rtk proxy npm run bridge:compare
rtk proxy npm run check
```

Reuse a successful check from the same unchanged tree/environment instead of
rerunning it without risk. Host-only runs cannot clear other-platform requirements.

MANUAL GATE: maintainer separately authorizes delivery/remote dispatch needed for
unavailable environments. If authorization or environment is absent, preserve
the exact missing evidence and leave this packet incomplete. Do not create a
commit, push, PR or external run to obtain it automatically.
## Completion and stop

Keep the packet incomplete if any required check fails or cannot run. Record exact
commands, results, skips, environment and blockers; update the sole checklist
`todo.md` and replace `handoff.md`. Recheck specification freshness and stop after
this packet. Review is optional and separately invoked.

MANUAL GATES: explicit authorization for this packet; commit/push/PR, remote CI
dispatch and publication remain separate. No downstream packet is authorized.
