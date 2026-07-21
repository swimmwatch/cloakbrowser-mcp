---
name: context-engineering
description: Improve cloakbrowser-mcp agent instructions, skill routing, task context, or handoffs when the user explicitly requests context optimization, stale-guidance repair, or session recovery. Keep durable guidance aligned with the TypeScript MCP bridge and repository policies; do not invoke merely because a session starts.
---

# Context Engineering

Give future agents the smallest authoritative context that supports the work.

1. Establish authority: user request, applicable `AGENTS.md`, stable docs, current code/tests/configuration, then transient task notes.
2. Identify duplicated, stale, conflicting, or missing guidance with concrete file evidence.
3. Use CodeGraph before broad code search when it is indexed. Load only the closest documentation and code required to resolve the conflict.
4. Put durable repository rules in the narrowest relevant `AGENTS.md` or skill; put public behavior in docs; keep temporary decisions in the handoff or task.
5. Preserve existing valid project-specific instructions. Do not replace them with generic guidance.

Report the context map, edits, remaining uncertainty, and the next agent’s starting point.
