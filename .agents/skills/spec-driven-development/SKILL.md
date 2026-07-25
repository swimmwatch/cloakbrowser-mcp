---
name: spec-driven-development
description: Author the authoritative `/spec` workflow for a substantial cloakbrowser-mcp change when the user invokes `/spec`, explicitly requests a specification, or authorizes specification work that lacks a durable contract. Establish repository facts, use the globally installed Prompt MCP for every material decision, persist recoverable decisions under docs/specs, require separate explicit draft approval, and stop before planning or implementation; do not use for a small already-defined fix.
---

# Spec-Driven Development

Write the smallest complete contract that prevents implementation from
inventing behavior. Keep the entire workflow specification-only.

1. Read `AGENTS.md`, `.agents/references/specification-interview.md`, the
   closest relevant public docs, affected code/tests/configuration, package and
   workflow contracts, and existing specification bundle. Use CodeGraph before
   broad source search when indexed.
2. Select a stable slug and create `docs/specs/<slug>/decisions.yaml` before
   the first material question. Keep `spec.md` separate from interview state.
3. Establish repository-observable facts first. Record evidence-backed facts
   as `observed`, explicit request decisions as `answered`, reversible defaults
   as visible `assumed` entries, and irrelevant categories as
   `not_applicable`.
4. Inspect the Prompt MCP schemas. Start or reopen the persistent workspace
   interview `spec:<slug>`. Checkpoint pending ledger entries before
   displaying them, use stable semantic IDs, and save each returned status and
   committed result immediately.
5. Use `ask_user_batch` for one to five related decisions or `ask_user` for one
   focused decision. Choose `single`, `multiple`, or `text` from answer
   semantics. Do not substitute plain-chat multiple choice while Prompt MCP is
   callable.
6. Cover outcome and stakeholders; scope and non-goals; normal and alternate
   flows; invalid input and failures; interfaces and data; architecture and
   dependencies; security and privacy; configuration and operations;
   compatibility and migration; and objective automated/manual acceptance.
7. Derive follow-ups for implications, limits, exceptions, concurrency,
   cleanup, rollback, contradictions, and external effects. A cancelled,
   timed-out, unavailable, invalid, conflicting, failed, paused, or unresolved
   result is not an answer.
8. After interruption or compaction, reload the ledger, inspect the persistent
   interview, reconcile revisions, and resume unresolved questions only.
   Preserve superseded answers as new revisions; never overwrite or repeat a
   committed decision unnecessarily.
9. Run the reference's gap analysis from user, operator, implementer, tester,
   security reviewer, and maintainer perspectives. A deferred material
   decision is a blocker, not an implementation assumption.
10. Normalize active decisions into numbered requirements, defaults,
    constraints, non-goals, compatibility duties, and objective acceptance
    criteria. Map every active ledger item to requirement IDs.
11. Write `docs/specs/<slug>/spec.md` with `Status: Draft`. Exclude raw
    transcript, model reasoning, task sequence, estimates, and implementation
    packets.
12. After the complete draft is inspectable, checkpoint `approval.spec` and
    ask a separate Prompt MCP `single` question with `approve`,
    `request-changes`, and `leave-draft`.
13. Set `Status: Approved` only after an explicit committed `approve` answer.
    Custom text requests changes and cannot implicitly approve.
14. Report the specification, ledger, unresolved blockers, and evidence, then
    stop. Recommend `/plan` only as a separate next invocation.

This skill is the single authoritative `/spec` route. Never begin planning,
implementation, commit, push, PR, release, or publication automatically, and
never request or persist secrets.
