---
name: security-and-hardening
description: Audit or harden a concrete cloakbrowser-mcp trust boundary when the user explicitly requests security work or identifies a defect. Cover configuration, upstream child processes, MCP and HTTP transports, filesystem paths, Docker, workflows, dependencies, secrets, and package publishing.
---

# Security And Hardening

Trace untrusted data from entry to effect and focus on credible exploitation.

1. Read `AGENTS.md`, target code/configuration, relevant tests, and the affected public contract.
2. Define the protected asset, boundary, actor, capability, input, security property, and expected impact.
3. Trace data through environment parsing, generated configuration, process spawning, protocol forwarding, HTTP handling, filesystem access, Docker build/runtime, workflows, logs, and publishing as applicable.
4. Check validation, least privilege, path containment, argument construction, secrets exposure, logging redaction, image/action pinning, dependency provenance, and recovery behavior.
5. Recommend the smallest effective mitigation and a verification method. Preserve upstream browser tool contracts unless the user explicitly authorizes a change.

Report evidence, impact, minimal mitigation, verification, positive controls, and residual risk. Do not expose secrets or execute harmful proof-of-concept actions.
