---
name: project-pull-request
description: Use when creating, updating, or reviewing a cloakbrowser-mcp GitHub Pull Request. Defines branch, base/head, assignee, title, required PR body template, mandatory local checks before commit/push, checklist, security review, test evidence, and post-create reporting rules.
---

# Project Pull Request

Use this skill for `cloakbrowser-mcp` Pull Request work. The repository's
`.github/PULL_REQUEST_TEMPLATE.md` is the required PR body format; do not
replace it with a second template.

## Preconditions

- Inspect `git status`, current branch, upstream tracking, and diff before
  creating or updating a PR.
- Do not open a PR from `main`.
- Use `main` as the base branch unless the user explicitly gives another base.
- Before creating a commit for the PR, open and scan
  `https://www.conventionalcommits.org/en/v1.0.0/`.
- Run `npm run check` locally after the final edits and before creating a
  commit. If it fails, fix the failure or report the blocker; do not commit.
- If any file changes after `npm run check`, rerun `npm run check` before
  committing.
- Push the current feature branch to `origin` before creating the PR.
- Run `npm run check` again on the committed branch before pushing. If it
  fails, fix the failure or report the blocker; do not push or create/update
  the PR.
- Create PRs ready for review by default. Use draft only when the user
  explicitly asks for a draft PR.

## Assignee

- Assign the PR to the authenticated GitHub user by default. Resolve the login
  with `gh api user --jq .login` or the equivalent GitHub connector identity.
- For this repository, the expected default assignee is `swimmwatch` unless the
  user explicitly requests another assignee.
- If the assignee cannot be resolved or GitHub rejects it, report the blocker
  and leave the PR otherwise complete.

## Title

- Use a concise Conventional-style title, such as
  `build(deps): bump cloakbrowser to 0.3.31`.
- Use imperative or present-tense wording after the conventional prefix.
- Make the title describe the main branch change, not a test result or
  implementation detail.

## Body

Fill every section from `.github/PULL_REQUEST_TEMPLATE.md`:

- `Summary`: include 2-4 bullets explaining what changed and why.
- `Checklist`: keep every template item. Mark `[x]` only when completed. If an
  item is not applicable, keep it visible and add a short reason.
- `Security review`: write explicit notes even when there is no new risk.
  Mention bridge, child-process, filesystem, Docker, logging, secrets/tokens,
  OIDC, and registry publishing when relevant.
- `Test evidence`: list exact commands and outcomes. If a relevant check was
  skipped, state why.
- Do not mark `npm run check` complete unless it passed locally on the branch
  being pushed.

Do not leave HTML comments or placeholder text in the submitted PR body.

## Create Or Update

- Prefer the available GitHub app or connector. Use `gh` when connector support
  is unavailable or insufficient.
- If a PR already exists for the branch, update its title/body instead of
  creating a duplicate.
- After creating or updating the PR, report the PR URL, base/head branches,
  title, assignee, whether it is draft or ready for review, and any skipped
  checks.
