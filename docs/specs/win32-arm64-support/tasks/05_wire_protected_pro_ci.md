# Packet 05 — Wire Protected Pro CI

## Outcome

Add a repeatable native Windows ARM64 Pro smoke that can receive a license only
after protected-environment approval and can never expose it to fork pull
requests, non-Pro steps, logs, arguments, caches, or artifacts.

## Prerequisites And Dependencies

- Packet 03 is complete.
- `npm run test:e2e:windows-arm64:pro` passes in a protected native environment.
- A maintainer has completed both manual gates below, including supplying the
  exact non-sensitive secret identifier.
- The selected protection model remains same-repository PR/manual CI with the
  `windows-arm64-pro` GitHub Environment.

## Owned Requirements

- R1 Supported Platform
- R4 Pro First-Run And Cached Flow
- R6 Diagnostics
- R7 Failure, Integrity, And Cleanup
- R11 Protected Pro CI Gate
- R13 Rollback

## Scope

Add a dedicated workflow for the Pro gate, expected at
`.github/workflows/windows-arm64-pro.yml`, with these boundaries:

- Triggers may support `pull_request` and `workflow_dispatch`; never use
  `pull_request_target`.
- A pull-request job is eligible only when the head repository equals the base
  repository. Fork pull requests must skip before environment access.
- Manual dispatch is limited to the repository's default/protected branch.
- The job uses `runs-on: windows-11-arm`, native Node.js 24,
  `environment: windows-arm64-pro`, bounded timeout, and least-privilege
  `contents: read`.
- Checkout, setup, `npm ci --ignore-scripts`, and build steps receive no Pro
  secret.
- Only the single smoke step maps the maintainer-supplied
  `secrets.<IDENTIFIER>` to the existing process variable
  `CLOAKBROWSER_LICENSE_KEY` and runs
  `npm run test:e2e:windows-arm64:pro`.
- The workflow does not echo environment variables, place the secret in a
  command argument, persist the CloakBrowser cache, or upload logs/binaries.
- External actions are pinned by full commit SHA with readable version
  comments.

The secret identifier is not `CLOAKBROWSER_LICENSE_KEY` unless a maintainer
explicitly selects that non-sensitive identifier in a new Prompt MCP decision.
Record the supplied identifier—not its value—as a new revision of
`planning.pro-secret-identifier` before editing the workflow.

## Non-Goals

- Do not request, read back, store, validate, or print the credential value.
- Do not create repository/environment secrets through code or CLI.
- Do not run untrusted fork code with secrets, use `pull_request_target`, grant
  write permissions, upload artifacts, share Pro caches, or fall back to Free.
- Do not change public documentation, runtime interfaces, release workflows, or
  repository protection settings from the worktree.

## Relevant Contracts

- Environment name is exactly `windows-arm64-pro`.
- Secret expression uses the separately confirmed identifier and is scoped only
  to the Pro smoke step as `CLOAKBROWSER_LICENSE_KEY`.
- A missing secret fails generically without printing the identifier or value.
- Protected-environment reviewers are the approval boundary for same-repository
  PR code and manual default-branch execution.
- Job permissions remain `contents: read`; no credential-bearing artifact is
  produced.

## Expected Files

- `.github/workflows/windows-arm64-pro.yml`
- `docs/specs/win32-arm64-support/decisions.yaml`, only for the non-sensitive
  secret identifier decision revision
- Packet/checklist/handoff state under
  `docs/specs/win32-arm64-support/tasks/`

No runtime or test file is owned by this packet.

## Objective Acceptance

- Fork PRs cannot reach the protected environment or secret expression.
- Same-repository PR/manual runs require `windows-arm64-pro` approval.
- Only the smoke step receives the mapped credential.
- The Pro harness proves signed native Pro resolution, PE `0xAA64`,
  `windows-arm64`/`pro` diagnostics, browser action, warm cache, and no Free
  fallback.
- Workflow permissions, action pins, syntax, actionlint, and high-severity
  zizmor checks pass.
- No secret value or credential-bearing artifact is present in the diff or
  task records.

## Verification

Focused protected check:

```bash
npm run test:e2e:windows-arm64:pro
```

Run only in a protected native Windows ARM64 process with the credential in its
environment.

Workflow checks:

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
npm run format:check
npm run check
git diff -- .github/workflows/windows-arm64-pro.yml
```

Inspect the diff for secret scope and prohibited triggers. Do not search or
print the process environment.

## Failure, Rollback, And Recovery

- If the identifier or environment is unavailable, leave this packet unchecked
  and stop; do not invent a placeholder expression.
- If fork filtering, environment protection, or step scoping cannot be proven,
  remove the workflow and redesign before any protected run.
- A failed Pro smoke never falls back to Free and blocks packets 06 and 07.
- Rollback deletes the dedicated workflow and coordinates dependency/public
  claim rollback under R13; it does not delete user caches or environment
  secrets.

## Manual Gates

- **MANUAL GATE — secret identifier:** a maintainer must supply the exact
  non-sensitive GitHub secret identifier through Prompt MCP. The current
  decision is `defer-binding`; this packet is blocked until revised.
- **MANUAL GATE — repository settings:** a maintainer must create/configure the
  `windows-arm64-pro` Environment, required reviewers, allowed default branch,
  and access to the separately confirmed existing secret. Record only
  completion, never the value.
- **MANUAL GATE — protected execution:** each Pro run requires reviewer
  approval.
- Commit, push, PR, merge, publication, and release remain separate
  **MANUAL GATE** actions.

## Completion Checklist

- [ ] Secret identifier decision revised through Prompt MCP.
- [ ] `windows-arm64-pro` environment setup confirmed without credential data.
- [ ] Dedicated workflow added without `pull_request_target`.
- [ ] Fork and manual-ref guards implemented.
- [ ] Credential scoped only to the Pro smoke step.
- [ ] No cache/log/binary artifacts uploaded.
- [ ] Actionlint, zizmor, focused, and repository checks recorded.
- [ ] Handoff updated.
- [ ] `todo.md` packet link checked.

## Handoff

Record the non-sensitive identifier, environment-policy confirmation, workflow
job name, trigger guards, checks, and remaining protected-run approval in
`handoff.md`. Packet 06 becomes eligible only after packet 04 is also complete.
