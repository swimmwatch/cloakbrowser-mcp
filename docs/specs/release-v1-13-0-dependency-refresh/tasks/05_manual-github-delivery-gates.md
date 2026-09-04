# 05 — Manual GitHub delivery gates

## Outcome

Document the externally visible release and cleanup sequence without executing
it automatically.

## Prerequisites and ownership

Requires a passing packet 04, an explicit authorization to commit and push,
and an explicit authorization to create the release PR. Owns GH-01, GH-02,
and GH-03.

## Scope and contracts

After explicit authorization only, create a PR to `main` titled
`chore(release): prepare v1.13.0` with `Closes #129` and `Closes #130`. After
it is green, and only with a separate cleanup authorization, close Dependabot
PRs #120, #122–#125, #127, and #128 as superseded, leaving a comment that
links the release PR and records included versions. Close #110, #119, and
#126 as superseded by #129 and the release PR. Re-read GitHub after each
mutation. Leave #89 and #107 open; do not manually close #129 or #130.

## Expected files

No repository files. GitHub effects are external and require re-query
evidence after each action.

## Acceptance and verification

- The PR is green before cleanup begins.
- Every affected PR or issue is re-read after its mutation.
- Cleanup comments name actual included dependency versions.
- #89 and #107 remain open; #129 and #130 remain open until merge.

## Failure handling and manual gates

Stop on missing authorization, failed PR checks, or an unexpected GitHub
state. This packet is entirely MANUAL GATE: commit, push, PR creation, issue
or PR closure, merge, tag, and publish each require distinct authorization.

## Completion checklist and handoff

- [ ] Separate delivery authorizations recorded.
- [ ] Green release PR verified.
- [ ] Authorized cleanup completed and re-read after every mutation.
- [ ] No merge, tag, or publication performed without its own authorization.
