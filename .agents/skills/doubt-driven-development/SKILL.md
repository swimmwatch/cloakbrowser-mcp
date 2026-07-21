---
name: doubt-driven-development
description: Perform an adversarial, evidence-based challenge of a named high-risk cloakbrowser-mcp product or technical decision only when the user explicitly requests it. Use for MCP contracts, child-process design, browser/runtime security, Docker supply chain, compatibility, publishing, or irreversible migrations; do not use for routine uncertainty.
---

# Doubt-Driven Development

Try to falsify the decision without arguing performatively.

1. State the decision, desired outcome, constraints, alternatives, and cost of being wrong.
2. Inspect relevant code, tests, documentation, package metadata, images, and workflows. Separate evidence from assumptions.
3. Challenge the decision through contract stability, security and trust boundaries, reliability and recovery, ecosystem compatibility, supply chain, operator burden, cost, and reversibility.
4. For each material concern, give a plausible failure scenario, affected contract, impact, evidence, and the smallest experiment that could settle it.
5. Do not invent provider guarantees, compatibility claims, benchmarks, or threat models.

End with a recommendation, unresolved risks, and explicit conditions for proceeding or deferring.
