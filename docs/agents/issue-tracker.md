# Issue Tracker: GitHub

Track work in GitHub Issues for `swimmwatch/cloakbrowser-mcp`, using `gh`.
Keep durable workflow artifacts under `docs/specs/<slug>/` as required
by the repository instructions. Setup does not publish existing artifacts.

These conventions do not grant permission for external mutations.
Follow the current task's authorization and repository delivery rules.

## Common operations

Verify the target before the first write:

    gh repo view --json nameWithOwner,url

Use `--repo swimmwatch/cloakbrowser-mcp` for issue and label operations.

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view NUMBER --json number,title,body,labels,comments`
- List: `gh issue list --state open --json number,title,body,labels`
- Comment: `gh issue comment NUMBER --body "..."`
- Label: `gh issue edit NUMBER --add-label LABEL`
- Remove a label: `gh issue edit NUMBER --remove-label LABEL`
- Close: post the explanation with `gh issue comment`, then
  `gh issue close NUMBER`. This also preserves explanations on
  already-closed issues.

Use heredocs or body files for multiline text.

## Parent issues and blockers

Prefer GitHub's native sub-issues and issue dependencies.
Check CLI support before using relationship flags.

When the installed CLI lacks those flags, use GitHub's API:

- Add a sub-issue:
  `gh api --method POST repos/swimmwatch/cloakbrowser-mcp/issues/PARENT/sub_issues -F sub_issue_id=CHILD_DATABASE_ID`
- Add a blocker:
  `gh api --method POST repos/swimmwatch/cloakbrowser-mcp/issues/CHILD/dependencies/blocked_by -F issue_id=BLOCKER_DATABASE_ID`

Obtain database IDs with `gh api repos/swimmwatch/cloakbrowser-mcp/issues/NUMBER --jq .id`.
Issue numbers and node IDs are not database IDs.

If native relationships are unavailable, use `Part of #PARENT`
and `Blocked by: #NUMBER` in the child body, plus a task list
in the parent. Work is unblocked only when every blocker is closed.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Skill conventions

"Publish to the issue tracker" means create a GitHub issue,
when publication is authorized. "Fetch the relevant ticket"
means read the issue and its relevant comments.

For wayfinding, use one map issue labelled `wayfinder:map`.
Link child tickets to it and use the appropriate
`wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`
or `wayfinder:task` label. Select unassigned children with no open
blockers in map order. Claim with `gh issue edit NUMBER --add-assignee @me`.
Resolve with an explanatory comment, close the child, and update
the map's decisions. Setup creates only the five triage-role labels;
wayfinding labels belong to a separately authorized wayfinding task.
