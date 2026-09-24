---
render_macros: false
---

# Managed CDP Access Handoff

## Current State

Packet 08 — Operator And Developer Documentation is locally complete. The approved
specification remained current before execution:

- status: `pass`;
- coverage: `reviewed`;
- source: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`;
- specification: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`;
- review: `f008baec-bf84-4454-88db-dab9801e85df`;
- issues: none.

Packets 01 through 08 are complete locally. Pull-request and release evidence remain
manual gates because this invocation did not authorize commit, push, pull request,
release, or publication.

## Documented Contract

- `README.md` and `docs/dockerhub-readme.md` provide concise managed-CDP entry points.
- `docs/configuration.md` documents explicit opt-in, every CLI/environment option,
  per-setting precedence, negative flags, stdio behavior, Streamable HTTP
  `cdpEnabled` inheritance and override, port-pool behavior, eager initialization,
  prohibited raw Chromium arguments, and `connectOverCDP()` usage.
- `docs/tools.md` documents disabled, ready, and unavailable
  `cloakbrowser_bridge_info.cdp` states, generation and connection meanings,
  capability secrecy, Playwright Server/Open WebUI incompatibility, the observed
  pinned-client disconnect behavior, and destructive raw `Browser.close` behavior.
- `docs/docker.md` documents one-to-one range publication, multi-session allocation,
  disabled-session behavior, discovery handling, and operator-owned same-port TLS
  termination.
- `docs/security.md` documents the CDP trust boundary, redaction and rejection
  aggregation, fixed resource limits, stable HTTP status/code mappings, retry and
  reconciliation guidance, and fixed WebSocket close pairs.
- `docs/architecture.md` documents ownership of the stable external lease and
  replaceable child/generation, bootstrap proof, restart-before-forward,
  single-flight replacement, exactly-once forwarding, failure recovery, cleanup
  ordering, and caller-owned MCP/CDP coordination.

The bridge-managed listener and bridge-to-Chromium hop are explicitly documented as
plaintext even when published URLs use `https`/`wss`. The operator owns the TLS
terminator, same advertised port, preserved `Host`/`Origin`, and one-to-one routing.

## Localization And Generated Data

Changed fragments were added to `architecture`, `configuration`, `docker`, `security`,
and `tools` for `ru`, `be`, `uk`, `es`, `pt-BR`, `zh`, `ja`, `de`, `fr`, and `hi`.
Localized managed-CDP headings retain translated labels and explicit stable English
anchors used by cross-page links.

The direct DeepL attempt failed with `Quota exceeded`. A targeted machine-translation
fallback was used only for the new fragments, followed by structural review of inline
code, relative links, fenced blocks, table rows, section placement, and rendered
anchors. `docs/data/translation-manifest.json` was refreshed with current hashes and
accurate fallback provenance for all 50 affected entries.

`docs/data/version-compatibility.json` was not changed because Packet 07 produced no
new verified compatibility row or schema change. Generated CLI documentation was
refreshed through its owning script and did not require a contract change.

## RED And GREEN Evidence

Before prose edits, the managed-CDP documentation contract failed because the public
configuration, discovery, protocol, security, lifecycle, and Docker sections were
absent. The corrected contract covers the final stable HTTP statuses
`400`, `403`, `404`, `405`, `408`, `413`, `431`, `500`, `502`, `503`, and `504`, plus
all five local WebSocket close pairs.

After the canonical and localized changes, the contract passed. The localization
structure check confirmed identical protected inline-code sets, link targets, fenced
code blocks, and table-row counts for every new section. The generated site contains
the expected `managed-cdp`, `managed-cdp-security`, and `managed-cdp-ownership`
anchors in all ten locales.

## PROVE Evidence

Each mutation was applied alone, produced the intended failure, and was restored:

1. Removing `--no-cdp-enabled` failed with the missing negative-flag contract.
2. Claiming that the bridge provides managed-CDP TLS failed both the required
   plaintext statement and the forbidden built-in-TLS assertion.
3. Removing HTTP `504` failed the stable status/code completeness assertion.
4. Declaring `chromium.connect()` and Open WebUI compatible failed the protocol
   incompatibility assertion.
5. Replacing the observed Playwright-client disconnect behavior with unobserved
   Chromium termination advice failed the Packet 07 evidence assertion.
6. Removing one Russian changed paragraph without refreshing the manifest failed
   `docs:translations:check` with `localized file changed without manifest update`.

## Passing Verification

```text
npm run docs:cli
npm run docs:build
npm run docs:seo:validate
npm run docs:compatibility:check
npm run docs:translations:check
npm run check
git diff --check
```

`npm run check` passed TypeScript, ESLint, Prettier, compatibility, translation,
server-schema, build, unit/integration, and packaged E2E checks: 44 test files passed,
464 tests passed, 4 tests skipped, and 6 packaged E2E tests passed. MkDocs emitted
existing informational warnings about specification files outside navigation, current
timestamps for uncommitted files, and the Material for MkDocs 2.0 transition; the
strict build completed successfully.

## Remaining Manual Gates

- Pull-request CI results have not been observed because no push or pull request was
  authorized. The linux/amd64 default-Cloak Docker checklist item remains open.
- Native linux/arm64 runtime evidence has not been observed locally. The release
  workflow encodes the required native gate, but an emulated build cannot satisfy it.
- No commit, push, pull request, issue update, release, or publication was performed.

## Next Action

Owner: user. Decide whether to authorize a commit and pull-request workflow so the
remaining pull-request and native release gates can be observed.
