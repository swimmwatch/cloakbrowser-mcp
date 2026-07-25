---
name: context-engineering
description: Improve cloakbrowser-mcp agent instructions, skill routing, durable decisions, task context, or handoffs only when the user explicitly requests context optimization, migration, stale-guidance repair, or recoverable session handoff. Align guidance with current bridge code, tests, configuration, docs, and delivery boundaries; do not invoke merely because a session starts or use it to replace task-specific implementation work.
---

# Context Engineering

1. Read `AGENTS.md` and establish authority in this order: current user
   request; applicable agent instructions; code, tests, configuration, and
   public contracts; stable docs and decisions; imported skills; transient
   notes.
2. Use CodeGraph before broad source search when indexed. Identify duplicated,
   stale, conflicting, overly broad, or missing guidance with concrete
   repository evidence.
3. Keep durable repository rules in the narrowest applicable `AGENTS.md`,
   focused routing and procedures in a skill, detailed reusable contracts in
   `.agents/references/`, public behavior in canonical docs, specification
   choices in `decisions.yaml`, and temporary execution state in
   `handoff.md`.
4. Preserve valid project-specific rules: unchanged upstream tool contracts,
   the two local tools, strict TypeScript/ESM, stdio safety, Streamable HTTP
   session isolation, localization, supply-chain pinning, and explicit
   commit/publish gates.
5. Use the global Prompt MCP contract in `AGENTS.md` when a material conflict
   cannot be resolved from evidence. Do not infer a user choice from history.
6. Update every route or reference affected by a name or ownership change and
   remove duplicate authorities.

Report the authority/context map, changed owners, resolved conflicts, remaining
uncertainty, and the next assistant's exact starting point. Do not edit
production code unless registration genuinely requires it.
