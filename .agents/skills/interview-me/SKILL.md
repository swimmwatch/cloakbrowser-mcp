---
name: interview-me
description: Run a structured requirements interview only when the user explicitly asks to be interviewed, grilled, or guided through unresolved cloakbrowser-mcp decisions. Use for API behavior, MCP tools, configuration, transport, packaging, Docker, compatibility, security, release, or developer-experience choices.
---

# Interview Me

Elicit decisions that repository evidence cannot answer.

1. Read the relevant docs and implementation first. List known facts, unknowns, and the decisions blocked by each unknown.
2. Ask one high-impact question, or a tightly coupled set of at most three. Explain the decision affected if it is not obvious.
3. Offer examples only to make the tradeoff clear, not to steer the answer.
4. Reflect the answer, reconcile conflicts with existing evidence, and update the working requirements before continuing.
5. Stop as soon as the requested artifact can be produced without inventing material behavior.

Do not use an interview for ordinary ambiguity that code or documentation can resolve.
