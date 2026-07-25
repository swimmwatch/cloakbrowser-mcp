---
name: incremental-implementation
description: Implement exactly one self-contained, explicitly authorized cloakbrowser-mcp task packet per invocation, verify it, update its checklist and handoff, then stop. Use for substantial TypeScript, MCP bridge, CLI, Streamable HTTP, packaging, Docker, CI, security, or documentation work planned under docs/specs; do not use for unplanned routine edits, begin another packet, commit without explicit authorization, or push, open a PR, publish, or release.
---

# Incremental Implementation

1. Read `AGENTS.md`, `.agents/references/task-packets.md`, the active
   `docs/specs/<slug>/tasks/todo.md` item, its linked packet, and
   `handoff.md` only when continuing.
2. Do not read the full specification, full plan, or unrelated packets unless
   the packet identifies a material conflict. Return incomplete or
   contract-changing packets to `/plan` or `/spec`.
3. Before a newly authorized packet, inspect the worktree for the completed
   previous packet. If its changes remain uncommitted:
   - verify completion and match them to the handoff;
   - use Prompt MCP to obtain explicit commit authorization if not already
     recorded;
   - after authorization, scan Conventional Commits 1.0.0 and commit only the
     previous packet's changes;
   - preserve and exclude unrelated worktree changes;
   - do not start the new packet until this gate is resolved.
4. Confirm outcome, non-goals, owned requirement IDs, public contracts,
   expected files, risks, rollback, manual gates, and verification before
   editing.
5. Implement only that packet. Preserve strict TypeScript/ESM, unchanged
   upstream tools, the two local tools, stdout safety, process cleanup, HTTP
   session isolation, and unrelated user changes.
6. Run the packet's focused commands and applicable `npm run check`. Stop
   before any external-state `MANUAL GATE`.
7. Update the packet checklist, `todo.md`, and `handoff.md` with files, checks,
   blockers, unrelated worktree state, and the next packet.
8. Present the evidence and stop for review. Leave the current packet
   uncommitted unless the user explicitly authorized an earlier commit.

Never infer authorization from approval of the specification or plan. Commit,
push, PR, merge, tag, publish, release, and the next packet are separate gates.
