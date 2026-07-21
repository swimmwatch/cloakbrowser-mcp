---
name: spec-driven-development
description: Define or revise an implementation-ready cloakbrowser-mcp specification in the repository's specs directory when the user requests a spec or approves significant work lacking a contract. Run a comprehensive Prompt MCP interview with repeated follow-ups across behavior, interfaces, data, architecture, security, operations, observability, compatibility, and acceptance; encode the answers as contract requirements and stop without planning or implementation. Do not invoke for a small already-defined fix.
---

# Spec-Driven Development

Write the smallest complete contract that prevents implementation from inventing behavior. Treat `/spec` as contract authoring; do not put delivery steps or task descriptions in `spec.md`.

1. Read `AGENTS.md`, `.agents/references/specification-interview.md`, the closest relevant documentation, affected code/tests, and public interfaces. Use CodeGraph before broad code search when indexed.
2. Keep the turn specification-only. Build a question ledger from every applicable specification category in the interview reference. Mark repository-observable facts from evidence, then use Prompt MCP's `ask_user` tool for all remaining decisions and preferences.
3. Define the user or operator, problem, current behavior, desired outcome, scope, non-goals, constraints, risks, and unresolved choices. Separate implemented behavior from planned technology assumptions.
4. Ask repeated focused batches with explicit answer options whenever choices can be bounded. After every response, add follow-up questions for implications, exceptions, failure cases, limits, and contradictions. Continue until each applicable ledger item is answered or marked not applicable; an intentionally deferred material decision remains a blocker.
5. Run a final gap pass from the perspectives of an end user, operator, implementer, tester, security reviewer, and maintainer. Ask every newly exposed question through Prompt MCP before drafting.
6. Convert answers into normalized requirements, defaults, constraints, non-goals, and acceptance criteria. Do not include the ledger, interview questions, answer options, answer labels, or conversation history in the specification.
7. Specify the relevant behavior, validation, errors, cancellation, retry, cleanup, recovery, observability, security, compatibility, and rollback boundaries. Define CLI, environment, MCP, HTTP, child-process, artifact, Docker, package, and Kubernetes contracts when applicable.
8. Define focused automated checks, manual verification, documentation/localization impact, and explicit non-acceptance cases.
9. For a substantial workstream, create or update `specs/<slug>/spec.md`. Keep external research and settled cross-workstream decisions in their established documentation locations and link them rather than copying them into the specification.
10. When planning has not been requested, do not create task descriptions. If task-state files are needed, leave only short planning-pending stubs. If task packets already exist, identify those affected by the revision for focused replanning.
11. Finish with the specification and stop. Recommend `planning-and-task-breakdown` for execution sequencing; never begin implementation automatically.

The specification owns durable behavior, architecture, constraints, and acceptance requirements. It must not contain delivery order, estimates, task status, task-owned file lists, or duplicated task packets. A request to create or revise a specification never authorizes implementation.

Do not limit discovery to the first obvious questions or stop after one Prompt MCP call. Ask broadly, avoid duplicates, never request secrets, and do not ask the user for facts that can be established safely from the repository. If Prompt MCP is unavailable or a material item remains deferred, state the blocker and stop before producing a final specification.
