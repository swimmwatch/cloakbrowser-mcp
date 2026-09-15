# Packet 06 — Validate Native CI

## Outcome

Run the implemented workflows on GitHub, record immutable native Windows ARM64
quality, Free, and protected Pro evidence, and establish whether the
compatibility claim may proceed.

## Prerequisites And Dependencies

- Packets 04 and 05 are complete.
- A branch/commit containing packets 02–05 exists on GitHub through separately
  authorized delivery work.
- The `windows-arm64-pro` Environment, required reviewers, allowed ref, and
  confirmed secret identifier are configured.
- The stable upstream release remains available and unwithdrawn.

## Owned Requirements

- R1 Supported Platform
- R3 Free First-Run And Cached Flow
- R4 Pro First-Run And Cached Flow
- R5 Transparent Cache Transition
- R6 Diagnostics
- R7 Failure, Integrity, And Cleanup
- R9 Existing Compatibility
- R10 Native Free CI Gate
- R11 Protected Pro CI Gate
- R13 Rollback

## Scope

Using the same immutable commit SHA:

1. Run the normal CI workflow and confirm every existing job remains green.
2. Confirm all four `windows-11-arm` quality cells run on native ARM64 and pass
   `npm run check` plus `npm run package:verify`.
3. Confirm the public Free job runs on `windows-11-arm` and records passing
   clean-cache, warm-cache, PE `0xAA64`, loopback browser action,
   `windows-arm64`/`free` diagnostics, x64-cache transition, partial-cache, and
   concurrent-start assertions.
4. Obtain protected-environment approval and run the Pro workflow for the same
   SHA. Confirm clean/warm Pro, signed acquisition, PE `0xAA64`, loopback
   action, `windows-arm64`/`pro` diagnostics, and no Free fallback.
5. Inspect workflow summaries and failure logs for architecture and result
   evidence. Confirm the Pro credential is absent from logs, process arguments,
   annotations, caches, and artifacts without printing or retrieving its value.
6. Record workflow URLs, run IDs, commit SHA, event/ref, runner labels, Node
   versions, job conclusions, and rerun attempts in `handoff.md` and this
   packet's `Native CI Record`.

Do not edit production code in this packet. A failure routes back to the
smallest owning packet under separate authorization.

## Non-Goals

- Do not merge, publish, release, update public compatibility documentation, or
  change repository settings.
- Do not accept local-only, x64-emulated, cancelled, skipped, neutral, or
  partially successful evidence.
- Do not download workflow artifacts containing binaries or expose secret
  values for inspection.
- Do not silently rerun changed code under a different SHA and combine results.

## Relevant Contracts

- All evidence must reference one immutable commit SHA containing the exact
  candidate.
- `windows-11-arm` plus runtime `win32`/`arm64` and PE `0xAA64` are all
  required; runner label alone is insufficient.
- Free and Pro results are separate gates. Both must pass before packet 07.
- Existing platforms and all Node versions remain required.
- The Pro run is non-fork, environment-protected, least-privilege, and
  artifact-free.

## Expected Files

- `docs/specs/win32-arm64-support/tasks/06_validate_native_ci.md`
- `docs/specs/win32-arm64-support/tasks/todo.md`
- `docs/specs/win32-arm64-support/tasks/handoff.md`

No production, test, package, workflow, or public documentation file is owned
by this packet.

## Objective Acceptance

- One SHA has passing normal CI, all four native Windows ARM64 quality cells,
  public Free smoke, and protected Pro smoke.
- Runtime and PE architecture evidence is explicit for both browser tiers.
- Free cache transition/cleanup/concurrency assertions pass.
- Pro no-fallback and credential non-disclosure assertions pass.
- All existing platform jobs remain green.
- Run URLs and conclusions are recorded without sensitive data.

## Verification

After the authorized GitHub run exists:

```bash
gh run list --commit <commit-sha>
gh run view <ci-run-id>
gh run view <pro-run-id>
gh run view <ci-run-id> --log-failed
gh run view <pro-run-id> --log-failed
```

Use `--log-failed` only when failures exist. Do not print all Pro logs merely to
search for a credential. Inspect GitHub job metadata, annotations, workflow
step scoping, and the harness's redaction assertion.

Repository-state check:

```bash
git status --short
```

No repository source change is expected from this evidence-only packet.

## Failure, Rollback, And Recovery

- A failed, skipped, cancelled, timed-out, architecture-mismatched, or
  secret-ineligible job is not acceptance. Leave packet 07 blocked.
- Route deterministic code/workflow defects back to packet 03, 04, or 05 under
  a new explicit authorization, then rerun the full gate on one new SHA.
- Record transient runner/download failures and reruns; do not bypass signed
  acquisition or switch runner labels.
- If upstream `V` is withdrawn or integrity changes, invoke the coordinated R13
  rollback of dependency, workflow, and any support claim.

## Manual Gates

- **MANUAL GATE — delivery mutation:** commit, push, and PR creation/update each
  require separate explicit authorization and are outside this packet.
- **MANUAL GATE — workflow dispatch:** manual CI or Pro dispatch requires
  explicit authorization for the exact ref.
- **MANUAL GATE — protected environment:** an authorized reviewer must approve
  the Pro deployment.
- Merge, publication, and release are not authorized.

## Completion Checklist

- [ ] One immutable candidate SHA recorded.
- [ ] Existing CI jobs and platform matrix pass.
- [ ] Four native Windows ARM64 quality cells pass.
- [ ] Public Free native smoke passes with required evidence.
- [ ] Protected Pro native smoke passes with required evidence.
- [ ] Credential non-disclosure and no-artifact boundary confirmed.
- [ ] Run URLs, IDs, refs, runners, Nodes, and conclusions recorded.
- [ ] Handoff updated and packet 07 explicitly unblocked.
- [ ] `todo.md` packet link checked.

## Native CI Record

Populate during execution:

- Candidate commit SHA:
- CI event/ref:
- Normal CI run URL/ID:
- Windows ARM64 quality job results:
- Free smoke job result and architecture evidence:
- Pro workflow run URL/ID:
- Pro environment approval and job result:
- Credential/artifact boundary result:
- Reruns/transient failures:
- Final gate result:

## Handoff

If every acceptance item passes, name packet 07 as the only next eligible
packet. Otherwise record the smallest failed owning packet and keep the public
support claim blocked.

