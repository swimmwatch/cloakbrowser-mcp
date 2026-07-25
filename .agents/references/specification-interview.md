# Specification Interview

Use this reference only with `spec-driven-development`. It owns the Prompt MCP
question protocol, the repository decision ledger, discovery coverage,
recovery, and draft approval. It does not own implementation planning.

## Authority And Workspace

Resolve conflicts in this order:

1. the user's current request;
2. the applicable `AGENTS.md`;
3. current code, tests, configuration, and public contracts;
4. stable project documentation and settled decisions;
5. imported skill guidance;
6. temporary notes and conversation history.

Use this absolute path for every Prompt MCP `workspace_path`:

`/home/dmitry-vasiliev/PycharmProjects/open-source/cloakbrowser-mcp`

Use stable semantic identifiers:

- interview: `spec:<spec-slug>`;
- batch: `<category>-round-NN`;
- question: `<category>.<decision>`;
- idempotency: `<category>.<decision>:v<revision>`.

Use `workspace` persistence. Use `ephemeral` only when the workflow is
intentionally disposable and no handoff or recovery is required.

## Prompt MCP Contract

Inspect the callable schemas before every workflow that first uses Prompt MCP.
The globally installed server can expose:

- `ask_user`;
- `start_interview`;
- `ask_user_batch`;
- `get_interview`;
- `list_interview_questions`;
- `get_interview_answer`;
- `resume_interview`;
- `export_interview`;
- `delete_interview`.

Use only tools exposed by the current client and follow their advertised
schemas. Do not guess a generated namespace or downgrade to a plain-chat
multiple-choice question while Prompt MCP is callable.

For a persistent specification:

```json
{
  "workspace_path": "/home/dmitry-vasiliev/PycharmProjects/open-source/cloakbrowser-mcp",
  "interview_id": "spec:<spec-slug>",
  "persistence": "workspace"
}
```

Call `start_interview` to create or reopen the namespace. Prefer
`ask_user_batch` for one to five related questions. Use `ask_user` for a
single focused decision or when batch registration is unavailable.

Example batch:

```json
{
  "workspace_path": "/home/dmitry-vasiliev/PycharmProjects/open-source/cloakbrowser-mcp",
  "interview_id": "spec:<spec-slug>",
  "batch_id": "compatibility-round-01",
  "timeout_seconds": 1800,
  "questions": [
    {
      "question_id": "compatibility.policy",
      "category": "compatibility",
      "idempotency_key": "compatibility.policy:v1",
      "question": "Which compatibility policy should this change follow?",
      "kind": "single",
      "options": [
        {
          "id": "backward-compatible",
          "label": "Preserve compatibility (Recommended)",
          "description": "Keep existing CLI, environment, MCP, transport, and package behavior and make only additive changes."
        },
        {
          "id": "breaking-change",
          "label": "Allow a breaking change",
          "description": "Permit an existing public contract to change with explicit migration and release handling."
        }
      ]
    }
  ]
}
```

Question rules:

- Use `single` for mutually exclusive options.
- Use `multiple` for independent selections.
- Use `text` when bounded choices would distort the answer.
- Ask one to five related questions per batch.
- Separate decisions that could have different answers.
- Give every option a stable ID, concise label, and implementation-oriented
  description.
- Put an evidence-backed recommendation first and label it `(Recommended)`.
  Do not invent a recommendation when evidence is insufficient.
- Do not add an `Other` option; Prompt MCP supplies custom-response input.
- Use a practical explicit timeout within the callable tool's limits.
- Never request credentials, tokens, passwords, secrets, or unrelated personal
  information.

## Decision Ledger

Create `docs/specs/<slug>/decisions.yaml` before the first material question.
Prompt MCP persistence recovers interaction state; it does not replace
repository-owned specification evidence.

Store normalized, non-sensitive decisions rather than transcripts or model
reasoning. Use this shape:

```yaml
schema_version: 1
spec_slug: example-feature
decisions:
  - id: compatibility.policy
    revision: 1
    category: compatibility
    state: needs_user
    provenance: null
    evidence: []
    question:
      text: Which compatibility policy should this change follow?
      kind: single
      options:
        - id: backward-compatible
          label: Preserve compatibility
          description: Keep existing public behavior and make only additive changes.
        - id: breaking-change
          label: Allow a breaking change
          description: Change an existing contract with explicit migration and release handling.
    answer:
      selected_ids: []
      text: ""
    rationale: ""
    last_tool_status: pending
    supersedes_revision: null
    requirement_ids: []
```

Allowed states:

- `observed`: established from repository or authoritative evidence;
- `assumed`: low-risk reversible default supported by evidence and exposed in
  the draft;
- `needs_user`: material decision awaiting an answer;
- `answered`: committed authoritative user answer;
- `not_applicable`: category item does not apply, with rationale;
- `blocked`: material decision cannot currently be resolved;
- `superseded`: older revision replaced by a later explicit revision.

Use `user`, `repository`, `authoritative-doc`, or `agent-default` as provenance
for resolved records. Leave provenance `null` for `needs_user`. Record material
choices already explicit in the request as `answered` with `user` provenance;
do not ask them again.

Before displaying a question, save its definition, revision, option snapshot,
and `needs_user` state. After the tool returns, immediately save
`last_tool_status`. Store selected IDs and custom text only for a committed
answer, then set state and provenance. Do not hold several answers only in
model context.

For a changed or contradictory answer, append a new revision, set
`supersedes_revision`, and mark the prior revision `superseded`. Reconcile
conflicts explicitly. Never silently overwrite history.

Do not persist secrets, unrelated personal data, raw transcripts, or model
reasoning. If an answer includes sensitive data, omit the value, mark the
decision blocked, and request a non-sensitive restatement.

## Result Handling

Treat only a committed answer as authoritative.

| Result | Required action |
| --- | --- |
| Answered or committed | Save the normalized answer and continue. |
| Cancelled | Record the status; leave the material decision blocked. |
| Timed out | Record the status; retry only with user direction or evidence the timeout was insufficient. |
| Unavailable | Record and report the blocker; do not infer a choice. |
| Invalid request | Correct the call against the advertised schema. |
| Conflict | Reconcile stored and requested revisions; do not overwrite either. |
| Failed | Record and report a sanitized failure without inferring a choice. |
| Paused or pending | Keep the question eligible for `resume_interview`. |

Deletion is destructive. Use `delete_interview` only when the user explicitly
requests deletion and confirms the exact interview ID. An export is a
recoverable snapshot, not the decision authority.

## Discovery Coverage

Establish repository-observable facts before asking questions. Evaluate every
category, but ask only decisions that materially change the contract.

- **Outcome and stakeholders:** user, operator, problem evidence, desired
  outcome, success measure, priorities, and competing goals.
- **Scope and current state:** existing behavior, required capabilities,
  exclusions, supported platforms, environments, and non-goals.
- **Flows and failure behavior:** normal and alternate flows, invalid input,
  cancellation, retry, timeout, partial failure, concurrency, ordering,
  idempotency, limits, defaults, cleanup, and recovery.
- **Interfaces and data:** CLI flags, environment variables, MCP tools,
  Streamable HTTP, child processes, files, artifacts, schemas, validation,
  errors, ownership, retention, migration, and deletion.
- **Architecture and dependencies:** bridge/upstream ownership, generated
  config, stdio and session boundaries, dependency direction, state placement,
  resource budgets, availability, portability, and extension constraints.
- **Security and privacy:** upstream unsafe browser tools, process execution,
  environment and temporary files, HTTP exposure, profiles, filesystem and
  network access, Docker sandboxing, supply chain, secrets, publishing, and
  destructive actions.
- **Operations and observability:** installation, configuration, upgrades,
  probes, logs, diagnostics, redaction, support ownership, manual gates,
  rollback, and recovery.
- **Compatibility and evolution:** Node and platform support, unchanged
  upstream tool contracts, local tool stability, transport compatibility,
  package/image/registry delivery, migration, deprecation, and rollback.
- **Quality and acceptance:** unit, integration, E2E, package, Docker, parity,
  documentation, security, and objective manual checks.

Implementation-local choices such as file names, task order, or routine
techniques belong in `/plan`, unless they alter a public contract.

## Recovery And Gap Analysis

After interruption, compaction, or handoff:

1. Reload `decisions.yaml`.
2. Call `get_interview` and `list_interview_questions`.
3. Reconcile active ledger revisions with stored question revisions by stable
   IDs.
4. Use `get_interview_answer` when one stored answer needs inspection.
5. Use `resume_interview` only for unresolved pending questions.
6. Never repeat a committed question unnecessarily.

Before drafting, map every active decision to requirement IDs or a documented
`not_applicable` rationale. Do not draft while material decisions,
supersession chains, security choices, or acceptance prerequisites remain
unresolved.

Run a final pass from these perspectives:

- user: Is the outcome and rejection behavior clear?
- operator: Are configuration, diagnostics, recovery, and rollback clear?
- implementer: Would implementation have to invent behavior?
- tester: Is every acceptance claim objectively verifiable?
- security reviewer: Are trust boundaries and external effects explicit?
- maintainer: Are compatibility, documentation, and delivery obligations clear?

## Draft Approval

Normalize the resolved decisions into numbered requirements, defaults,
constraints, non-goals, and acceptance criteria in `spec.md`. Keep
`Status: Draft` until the user can inspect the complete draft.

Checkpoint `approval.spec` in the ledger, then ask a separate `single` Prompt
MCP question:

- `approve`: approve the draft as the implementation contract;
- `request-changes`: reopen affected decisions and revise the draft;
- `leave-draft`: stop without approval.

Treat custom approval text as requested changes, never implicit approval. Set
`Status: Approved` only after an explicit `approve` answer. Stop without
planning or implementation.
