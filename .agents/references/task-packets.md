# Task Packet Contract

Use task packets to keep substantial workstreams executable without loading an entire specification into an implementation session.

## Bundle Layout

```text
specs/<slug>/
  spec.md
  tasks/
    plan.md
    todo.md
    handoff.md
    01_<slug>.md
    02_<slug>.md
```

- `spec.md` owns durable behavior, architecture, constraints, and acceptance requirements; it does not contain delivery steps.
- `plan.md` is a compact ordered index linking each packet and recording only outcome, dependencies, and covered requirement or acceptance identifiers.
- `todo.md` is the only completion-state checklist and links packets instead of repeating their contents.
- `handoff.md` contains only current continuation state: completed packets, changed files, checks, exact next packet, and blockers.
- `NN_<slug>.md` is the complete execution contract for one independently verifiable task.

## Planning With Progressive Disclosure

1. Inspect the specification outline and identifiers before reading prose.
2. Build a preliminary packet-to-section map.
3. Read only the sections needed to write one packet at a time.
4. Restate every task-local requirement, exact value, path, boundary, and acceptance assertion needed for implementation. Do not write “implement as described in `spec.md`”.
5. Add targeted source anchors for traceability, not as mandatory pre-reading.
6. Map every applicable requirement and acceptance criterion to at least one packet before finalizing the plan.
7. Split packets that are too large for a focused implementation session.

## Task Packet Contents

```markdown
# NN Task Title

## Outcome

## Prerequisites

## In Scope

## Out Of Scope

## Task Contract

## Architecture And File Boundaries

## Acceptance Criteria

## Verification

## References

## Completion And Handoff
```

Make every packet self-contained. Include its implementation requirements, non-goals, owned boundaries, applicable failure/security/migration/compatibility/recovery behavior, concrete tests, manual checks, and rollback notes. Require `todo.md` and `handoff.md` updates after verification. Do not copy unrelated specification prose or requirements assigned to other packets.

## Review And Execution Boundary

Implement one packet only after an explicit implementation request. After verification, update `todo.md` and `handoff.md`, present the completed packet for review, and stop. Do not commit or begin another packet without separate user authorization.

## Execution Context

For implementation, read the applicable `AGENTS.md`, current `todo.md` entry and linked packet, `handoff.md` when continuing, and task-scoped files and references. Do not read the entire `spec.md`, full `plan.md`, or unrelated packets unless the packet identifies a necessary unresolved conditional detail or a conflict. Repair an incomplete packet rather than replacing it with broad specification loading.
