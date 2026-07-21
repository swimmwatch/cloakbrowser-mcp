# Specification And Planning Interview

Use this checklist to make discovery comprehensive. Create a private question ledger, mark each applicable item as answered, not applicable, or blocked, and use repeated Prompt MCP `ask_user` calls until no unanswered applicable item remains. Ask bounded multiple-choice questions when possible, allow clarification where needed, and derive follow-ups from earlier answers. Do not copy the ledger or question history into final artifacts.

## Specification Questions

- **Outcome and stakeholders:** users, operators, owners, affected parties, problem evidence, desired outcome, success measures, priorities, and competing goals.
- **Current state:** existing behavior, supported workflows, pain points, constraints, dependencies, precedents, migrations in progress, and behavior that must remain unchanged.
- **Scope:** required capabilities, optional capabilities, non-goals, exclusions, tenant boundaries, environments, platforms, regions, and lifecycle phase.
- **User and operator flows:** entry points, normal flow, alternate flow, administrative flow, manual intervention, overrides, cancellation, retry, resumption, cleanup, and recovery.
- **Behavioral edges:** invalid input, missing dependencies, partial failure, timeouts, concurrency, races, idempotency, duplication, ordering, limits, quotas, defaults, empty states, and degraded modes.
- **Interfaces and contracts:** CLI flags, environment variables, APIs, MCP tools, HTTP semantics, events, schemas, types, units, identifiers, naming, validation, errors, compatibility, versioning, and deprecation.
- **Data and artifacts:** ownership, sources, destinations, storage, isolation, consistency, transactions, caching, retention, expiration, deletion, migration, backup, restoration, provenance, privacy, and retrieval.
- **Architecture:** component responsibilities, boundaries, dependency direction, provider choices, extension points, deployment topology, state placement, scaling, availability, performance, resource budgets, and portability.
- **Security and compliance:** trust boundaries, threat actors, authentication, authorization, secrets, credentials, certificates, encryption, network access, filesystem access, supply chain, auditability, sensitive-data handling, abuse limits, and regulatory requirements.
- **Configuration and operations:** defaults, secure versus secret configuration, environment differences, installation, upgrades, rollbacks, feature gates, manual gates, disaster recovery, support ownership, and destructive actions.
- **Observability:** logs, metrics, traces, health, readiness, status, dashboards, alerts, SLOs, diagnostic data, cardinality, retention, and redaction.
- **Quality and acceptance:** unit, property, integration, end-to-end, compatibility, performance, security, failure-injection, upgrade, rollback, manual, and acceptance tests; fixtures, environments, thresholds, evidence, and explicit rejection cases.
- **Documentation and distribution:** user docs, operator docs, examples, localization, generated references, release notes, packaging, registries, publication, support, and troubleshooting.
- **Alternatives and evolution:** rejected alternatives, tradeoffs, future providers, extension constraints, backward compatibility, rollout stages, exit strategy, and conditions for revisiting decisions.

## Planning Questions

- **Readiness:** specification gaps, unresolved identifiers, missing acceptance criteria, external prerequisites, environment availability, and blocking decisions.
- **Implementation approach:** selected design, alternatives, library or provider choices, compatibility exceptions, migrations, feature flags, temporary states, and removal work.
- **Task boundaries:** independently verifiable outcomes, owned files or symbols, cross-task interfaces, non-goals, packet size, and review boundary.
- **Dependencies and sequence:** prerequisite tasks, critical path, safe parallel work, integration order, generated artifacts, migration order, and rollback points.
- **Ownership and coordination:** implementer, reviewer, operator, secret owner, external maintainer, approval authority, and handoff recipient.
- **Verification:** exact commands, fixtures, test data, environments, versions, negative cases, security checks, performance thresholds, artifact inspection, and required evidence.
- **Manual gates:** exact action, target, command preview, responsible operator, prerequisites, approval needed, expected result, failure response, and cleanup authorization.
- **Rollout and recovery:** deployment order, canary or staging needs, monitoring window, rollback trigger, recovery procedure, compatibility window, data restoration, and destructive cleanup.
- **Constraints:** time, cost, CI capacity, cluster or service access, credentials that must remain operator-managed, tool availability, publication authority, and prohibited actions.
- **Completion and continuation:** definition of done, documentation updates, requirement coverage, review presentation, `todo.md` state, `handoff.md` context, next packet, and blockers.

## Final Gap Pass

Before finalizing, ask:

- What could an implementer still have to invent?
- What could a tester be unable to verify objectively?
- What could fail in production without a specified response?
- What could expose data, secrets, the filesystem, or the network?
- What could break an existing user, client, package, deployment, or workflow?
- What external or destructive action still lacks an owner and approval gate?
- What answer introduced a new dependency, exception, or follow-up decision?
