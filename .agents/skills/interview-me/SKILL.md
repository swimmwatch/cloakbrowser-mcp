---
name: interview-me
description: Run a structured cloakbrowser-mcp requirements or decision interview only when the user explicitly asks to be interviewed, grilled, or guided through unresolved choices. Inspect repository evidence first and use the globally installed Prompt MCP for all material questions across bridge behavior, CLI/configuration, transports, security, compatibility, packaging, documentation, or delivery; do not use plain-chat multiple choice, request secrets, or continue after the requested artifact can be produced without invented behavior.
---

# Interview Me

1. Read `AGENTS.md`, relevant implementation, tests, docs, and existing
   decisions. Use CodeGraph before broad source search when indexed.
2. List established facts, unresolved material choices, and the artifact or
   decision each answer will unblock. Do not ask repository-observable facts.
3. Inspect Prompt MCP schemas. Start or reopen a persistent workspace interview
   with a stable ID such as `interview:<topic-slug>`.
4. Use `ask_user_batch` for one to five related questions or `ask_user` for one
   focused decision. Give questions, categories, options, revisions, and
   idempotency keys stable semantic IDs.
5. Use `single`, `multiple`, and `text` according to answer semantics. Label an
   evidence-backed recommendation `(Recommended)`; do not add `Other` or steer
   the user when evidence is inconclusive.
6. Treat only committed answers as decisions. Handle cancellation, timeout,
   unavailability, invalid input, conflict, failure, pause, and recovery
   explicitly without inference.
7. Reflect each answer against repository evidence and save normalized,
   non-sensitive decisions in the requested durable artifact. When the
   interview feeds `/spec`, follow
   `.agents/references/specification-interview.md` and its ledger.
8. After interruption, inspect the stored interview and resume unresolved
   questions only. Never repeat a committed question unnecessarily.

Stop when the requested artifact can be produced without inventing material
behavior. Do not automatically create a specification, plan, implementation,
commit, PR, or release.
