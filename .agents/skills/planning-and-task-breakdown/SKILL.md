---
name: planning-and-task-breakdown
description: Create a review-gated cloakbrowser-mcp task breakdown in separate Markdown task packets under the repository's specs directory when the user explicitly requests planning, decomposition, milestones, or execution packets. Run a comprehensive Prompt MCP interview with repeated follow-ups across implementation approach, ownership, dependencies, sequencing, verification, review gates, rollout, recovery, and handoff; record the answers as task constraints and stop without execution. Do not use for a small fully specified edit.
---

# Planning And Task Breakdown

Create the smallest plan that makes execution safe and reviewable. Treat `/plan` as decomposition: its primary artifacts are separate self-contained task packets; `plan.md` is only their compact index.

1. Read `AGENTS.md`, `.agents/references/specification-interview.md`, `.agents/references/task-packets.md`, the request, the current worktree, relevant documentation, code, and tests. Use CodeGraph before broad code search when indexed.
2. Keep the turn planning-only. Build a question ledger from every applicable planning category in the interview reference. Mark repository-observable facts from evidence, preserve decisions already settled by the specification, then use Prompt MCP's `ask_user` tool for all remaining implementation and delivery decisions.
3. When a specification exists, inspect its outline, size, and requirement or acceptance identifiers first. Read only the targeted sections needed to construct each packet; do not load a long specification wholesale.
4. Ask repeated focused batches with explicit answer options whenever choices can be bounded. After every response, add follow-up questions for dependencies, ownership gaps, integration points, failure recovery, test evidence, manual intervention, and contradictions. Continue until each applicable ledger item is answered or marked not applicable; an intentionally deferred material decision remains a blocker.
5. Run a final gap pass from the perspectives of an implementer, reviewer, tester, release operator, security reviewer, and future continuation agent. Ask every newly exposed question through Prompt MCP before writing packets.
6. State the measurable outcome, non-goals, affected contracts, settled decisions, assumptions, risks, verification requirements, and manual gates. Record answers as plan constraints rather than conversation history.
7. Create one `specs/<slug>/tasks/NN_<slug>.md` packet for every executable task. Each packet must be independently verifiable and include outcome, prerequisites, in scope, out of scope, task contract, architecture and file boundaries, acceptance criteria, verification, references, and completion/handoff instructions.
8. Put all task-local requirements, exact values, security boundaries, failure behavior, recovery notes, tests, and manual checks in the packet itself. Link only targeted specification sections for traceability; never require the implementer to read all of `spec.md`.
9. Create or update `tasks/plan.md` with only the ordered task index, dependencies, and requirement coverage; `tasks/todo.md` with only linked task state; and `tasks/handoff.md` with completed work, changed files, checks, exact next task, and blockers. Map every applicable requirement and acceptance criterion to at least one packet.
10. Sequence dependencies explicitly and mark review gates and external/manual actions as `MANUAL GATE`. A packet completes at a review pause; do not plan automatic progression into the next packet.
11. Finish the task packets and stop. Wait for explicit implementation authorization in a later execution-enabled turn; do not begin the first task, simulate execution, or continue automatically.

Do not include interview questions, answer options, answer labels, or unresolved-choice prompts in the plan or packets. Record only the selected approach and actionable work. Approval to create or revise a plan is not approval to execute it.

Do not limit discovery to the first obvious questions or stop after one Prompt MCP call. Ask broadly, avoid duplicates, never request secrets, and do not ask the user for facts that can be established safely from the repository. If Prompt MCP is unavailable or a material item remains deferred, state the blocker and stop before producing a final task breakdown.
