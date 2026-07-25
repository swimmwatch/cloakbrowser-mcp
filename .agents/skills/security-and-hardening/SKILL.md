---
name: security-and-hardening
description: Audit or harden a concrete cloakbrowser-mcp trust boundary only when the user explicitly requests security work, threat analysis, or a fix for an identified security defect. Cover MCP and HTTP input, upstream child processes, generated config and temporary files, browser profiles, filesystem/network access, unsafe upstream tools, dependencies, workflows, artifacts, secrets, Docker, and publishing; do not run harmful proofs, expose secrets, weaken checks, or change public contracts without authorization.
---

# Security And Hardening

1. Read `AGENTS.md`, `SECURITY.md`, target code/configuration, affected tests,
   and the public contract. Use CodeGraph before broad source search when
   indexed.
2. Define the protected asset, trust boundary, actor, capability, entry point,
   security property, expected impact, and whether the behavior belongs to this
   bridge or upstream Playwright MCP.
3. Trace data and authority through CLI/environment parsing, HTTP requests and
   sessions, MCP validation, temporary config, upstream child execution,
   browser/profile/filesystem/network access, output and logs, Docker mounts
   and sandboxing, dependencies, workflows, artifacts, OIDC/tokens, and
   registries as applicable.
4. Check allow-lists, path containment, argument construction, environment
   inheritance, transport binding/TLS, session isolation, cancellation,
   cleanup, redaction, least privilege, action/image pinning, dependency
   provenance, artifact immutability, and release gates.
5. Account for unchanged upstream unsafe tools such as `browser_evaluate` and
   `browser_run_code_unsafe`; do not misrepresent the bridge as a browser
   sandbox or access-control layer.
6. Recommend the smallest effective mitigation and positive/negative
   verification while preserving contracts. Use Prompt MCP for a material
   security-versus-compatibility choice that evidence cannot settle.
7. Run focused tests plus applicable `npm run check`, audit, package, Docker,
   actionlint, zizmor, or parity checks. Never disable or broadly suppress a
   check merely to pass.

Report evidence, exploit preconditions without harmful payloads, impact,
mitigation, verification, residual risk, upstream-reporting needs, and release
implications. Do not publish vulnerability details or release a fix without
separate authorization.
