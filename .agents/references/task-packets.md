# Task Packet Contract

Use this reference with `planning-and-task-breakdown` and
`incremental-implementation` for substantial cloakbrowser-mcp work. A packet
must be executable without loading the entire specification.

## Bundle Layout

```text
docs/specs/<slug>/
  spec.md
  decisions.yaml
  tasks/
    plan.md
    todo.md
    handoff.md
    01_<task>.md
```

- `spec.md` owns approved behavior, constraints, and acceptance requirements.
- `decisions.yaml` owns normalized decision evidence and revision history.
- `plan.md` is a compact packet index, dependency graph, risk summary, manual
  gates, and requirement coverage map.
- `todo.md` is the sole linked completion checklist.
- `handoff.md` contains current completion state, changed files, checks, next
  packet, unrelated worktree state, and blockers.
- Each numbered packet is the complete contract for one independently
  verifiable task.

## Required Packet Content

Every numbered packet must contain:

1. outcome;
2. prerequisites and dependency packets;
3. owned requirement IDs;
4. exact scope and non-goals;
5. relevant CLI, environment, MCP, HTTP, process, filesystem, logging,
   package, Docker, documentation, or workflow contracts;
6. expected files or components, without granting authority over unrelated
   worktree changes;
7. objective acceptance criteria;
8. exact focused and repository-level verification commands;
9. failure behavior and rollback or recovery;
10. external or destructive actions labelled `MANUAL GATE`;
11. completion checklist and handoff instructions.

Restate task-local values, defaults, boundaries, rejection cases, and
compatibility duties. Never write only “implement as described in `spec.md`”.
Reference the specification for provenance, not as a substitute for the local
contract.

Use real repository commands. Select from the applicable surface:

- source and tests: `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `npm test`, `npm run test:unit`, `npm run test:integration`;
- full repository: `npm run check`;
- packages and containers: `npm run package:verify`, `npm run docker:build`,
  `npm run docker:smoke`, `npm run bridge:compare`;
- documentation: `npm run docs:build`, `npm run docs:seo:validate`,
  `npm run docs:translations:check`,
  `npm run docs:compatibility:check`;
- workflow security when applicable: the pinned actionlint and zizmor commands
  in `AGENTS.md`.

Do not claim an optional or environment-dependent check passed unless it ran.

## Planning

1. Require `Status: Approved` in `spec.md` for substantial work.
2. Inspect requirement identifiers, the decision ledger, and current
   repository evidence.
3. Return contract-changing questions to `/spec`.
4. Use Prompt MCP for unresolved planning or authorization decisions.
5. Map every requirement to at least one packet and identify dependencies,
   sequencing, risks, verification, rollback, and manual gates.
6. Checkpoint a separate plan approval or execution authorization when
   required.
7. Stop before implementation.

## Execution

1. Execute exactly one explicitly authorized packet.
2. Read `AGENTS.md`, `todo.md`, the linked packet, this reference, and
   `handoff.md` only when continuing.
3. Do not load unrelated packets or the full specification unless the packet
   exposes a material conflict.
4. Preserve unrelated worktree changes and stop if file ownership overlaps
   cannot be resolved safely.
5. Complete the packet's focused checks and applicable `npm run check`.
6. Update only the packet checklist, `todo.md`, and `handoff.md`.
7. Stop before the next packet, commit, push, PR, release, publish, or other
   external action unless that exact action was separately authorized.
