---
name: incremental-implementation
description: Implement exactly one self-contained cloakbrowser-mcp task packet from the repository's specs directory per explicit invocation, then stop for user review. Use for substantial TypeScript, MCP bridge, CLI, HTTP, Docker, CI, or documentation work; do not invoke merely because several files change.
---

# Incremental Implementation

Deliver one self-contained task packet, verify it, present it, and stop.

1. Read applicable `AGENTS.md` files, the current `specs/<slug>/tasks/todo.md` entry, its linked task packet, and `.agents/references/task-packets.md`.
2. Read `handoff.md` only when continuing prior work. Do not read the full specification, full plan, or unrelated packets unless the current packet identifies a conditional detail or a material conflict.
3. Confirm the packet outcome, non-goals, contracts, owned boundaries, risks, manual gates, and verification before editing. If the packet is incomplete, return it to planning instead of reconstructing the task from the full specification.
4. Implement only that packet in focused internal slices. Preserve upstream Playwright MCP contracts and avoid unrelated cleanup.
5. Run the packet's focused checks and `npm run check` for a broad public or runtime change. Stop before a `MANUAL GATE` or an external-state action and request instructions.
6. After verification, update the linked `todo.md` and `handoff.md`, summarize the result and evidence, and stop for review. Do not begin the next packet.

Do not commit unless the user explicitly authorizes a commit. A later explicit incremental-implementation request may resume only the next unchecked packet.
