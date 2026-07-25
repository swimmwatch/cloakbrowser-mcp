---
name: planning-and-task-breakdown
description: Author the authoritative `/plan` workflow for substantial cloakbrowser-mcp work when the user invokes `/plan` or explicitly requests implementation planning, decomposition, milestones, or review-gated task packets. Require an approved specification, use Prompt MCP for unresolved material planning and authorization choices, create self-contained packets under docs/specs, and stop before implementation; do not use for a small fully specified edit or to change production code.
---

# Planning And Task Breakdown

Create the smallest safe, reviewable plan. Task packets are the executable
artifacts; `plan.md` is only their compact index.

1. Read `AGENTS.md`, `.agents/references/task-packets.md`, the request, current
   worktree, approved `docs/specs/<slug>/spec.md`, its decision ledger, and
   relevant code, tests, docs, package metadata, and workflows. Use CodeGraph
   before broad source search when indexed.
2. For substantial work, require `Status: Approved`. If the specification is
   missing, draft, materially incomplete, or contradicted by current public
   contracts, return the work to `/spec`.
3. Inspect requirement identifiers and repository evidence before reading
   targeted prose. Do not edit production, test, public documentation, package,
   Docker, or workflow implementation while planning.
4. Use explicit user decisions and repository evidence. Start or reopen a
   persistent Prompt MCP interview such as `plan:<spec-slug>` for unresolved
   material planning choices. Return contract-changing questions to `/spec`.
5. State outcome, non-goals, relevant contracts, assumptions, risks,
   dependency order, rollback, verification, and manual gates.
6. Create and maintain:
   - `docs/specs/<slug>/tasks/plan.md`;
   - `docs/specs/<slug>/tasks/todo.md`;
   - `docs/specs/<slug>/tasks/handoff.md`;
   - one `docs/specs/<slug>/tasks/NN_<task>.md` per independent task.
7. Make each packet self-contained according to
   `.agents/references/task-packets.md`. Map every requirement to at least one
   packet; map shared requirements deliberately rather than leaving them
   implicit.
8. Separate changes so each packet has one outcome, owned file boundaries,
   objective acceptance, focused checks, failure/rollback behavior, and a
   useful stopping point. Label external, destructive, credentialed, merge,
   publish, and release actions `MANUAL GATE`.
9. Checkpoint `approval.plan` or `authorization.execution` and ask a separate
   Prompt MCP question when plan approval or implementation authorization is
   required. An approved specification does not authorize implementation.
10. Finish the packet set and stop. Do not implement, format unrelated files,
    commit, push, open a PR, publish, release, or start the first packet.

This skill is the single authoritative `/plan` route. Do not create a second
slash-command implementation.
