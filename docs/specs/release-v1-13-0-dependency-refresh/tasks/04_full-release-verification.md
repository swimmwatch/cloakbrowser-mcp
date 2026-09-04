# 04 — Full release verification

## Outcome

Produce local, reproducible evidence that the completed v1.13.0 release
change set satisfies the required package, Docker, parity, documentation, and
supply-chain checks.

## Prerequisites and ownership

Requires packets 01–03. Owns QA-01.

## Scope and contracts

Run only the requested checks against the local release worktree. Keep bridge
reports and container artifacts local; remove `bridge-parity-report.json`
after inspecting it. Do not change a test threshold, tool contract, image pin,
or documentation claim merely to make a check pass; return an observed failure
to a targeted new packet.

## Expected files

No persistent repository files are expected. The temporary
`bridge-parity-report.json` is created for inspection and removed before the
packet completes.

## Acceptance and verification

Run, in a resource-aware sequence:

```bash
npm run check:ci
npm run package:verify
npm run docker:build
npm run docker:smoke
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
npm run docs:compatibility:check
npm run docs:build
npm run docs:seo:validate
npm run docs:translations:check
docker run --rm -v "$PWD:/repo" --workdir /repo docker.io/rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 -color
python3 -m pipx run zizmor --min-severity high .
```

Also prove the installed runtime container owns `fonts-urw-base35` with a
read-only package-query command. Inspect the parity report, confirm default
and devtools results are represented, then remove it.

## Failure handling and manual gates

Any failure blocks packet completion and all GitHub operations. Preserve the
command, output, and narrowed failure cause in the handoff; do not close PRs
or issues. Commit, push, PR, merge, tag, and publication remain MANUAL GATE.

## Completion checklist and handoff

- [ ] Every required check has a recorded result.
- [ ] Container font presence proven.
- [ ] Parity report inspected and removed.
- [ ] `todo.md` and `handoff.md` updated; packet 05 remains manual only.
