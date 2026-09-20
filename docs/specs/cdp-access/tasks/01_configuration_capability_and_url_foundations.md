---
render_macros: false
---

# Packet 01 — Configuration, Capability, And URL Foundations

Status: Ready for one explicit implementation invocation against the pinned specification.

## Outcome

Create pure, transport-independent CDP configuration, capability, authority, and URL primitives. This packet does not register public CLI/environment/initialize options and does not create a listener or browser.

Requirements: CDP-001, CDP-005, CDP-006, CDP-008, CDP-011, CDP-012, CDP-014.

## Pinned Inputs

- Source version: `2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf`.
- Specification version: `d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58`.
- Review reference: `f008baec-bf84-4454-88db-dab9801e85df`.

Before editing, reopen the specification and require `specification_check_state(expected_source_version=2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf)` to report the pinned Approved/pass/reviewed state. Stop on drift.

## Prerequisite Evidence

- `src/bridge/config.ts:224-248` owns generated runtime configuration and failure cleanup.
- `src/bridge/config.ts:408-437` owns the disposable runtime and current Chromium argument assembly.
- `src/cli/options.ts:22-40`, `src/cli/options.ts:63-210`, and `src/cli/options.ts:231-239` own public option parsing but remain unchanged in this packet.
- `src/http/requests.ts:70-120` owns flat initialize metadata but remains unchanged in this packet.
- `tests/unit/config.test.ts:41` is the existing bridge-configuration test boundary.
- `package.json` already supplies `fast-check` and Node crypto types; no dependency is required.

Recheck every line immediately before execution and inspect `git status --short`, including staged and untracked files.

## Scope

Allowed production paths:

- `src/cdp/config.ts`
- `src/cdp/capability.ts`
- `src/cdp/urls.ts`

Allowed test paths:

- `tests/unit/cdp-config.test.ts`
- `tests/unit/cdp-capability.test.ts`
- `tests/unit/cdp-urls.test.ts`

Required planning updates: `tasks/todo.md`, `tasks/handoff.md`.

Non-goals: public option registration, initialize metadata wiring, listeners, allocator, proxy, browser bootstrap, bridge-info, built-in TLS, documentation, dependencies, commits, or publication.

## Planned Boundaries

- `CdpPortRange` parses one port or an inclusive `start-end` range and represents no invalid state.
- Pure resolution accepts source-presence information and resolves each CLI value over its corresponding environment value and documented default. Explicit negative CLI forms resolve to false and positive plus negative forms are rejected.
- Process-level enablement is separate from an optional HTTP session override: stdio uses the process value; HTTP `undefined` inherits it and literal true/false overrides it.
- `CdpEndpointConfig` owns the pool, bind host, advertised host, advertised `http|https` scheme, remote gate, and process enabled default. It cannot represent an enabled wildcard/non-loopback endpoint without the required advertised authority and remote permission.
- Raw argument validation rejects bridge-conflicting `--remote-debugging-port`, `--remote-debugging-address`, and `--remote-debugging-pipe` only when managed CDP is effectively enabled. Disabled sessions preserve existing passthrough.
- `CdpCapability` generates at least 32 random bytes with `node:crypto`, encodes one path-safe segment, and validates equal-length decoded material through constant-time comparison. Missing, malformed, wrong-length, expired, and stale values share one public rejection class.
- URL primitives format IPv4, bracketed IPv6, hostnames, authorities, capability paths, and discovery/WebSocket URLs. `http` maps only to `ws`; `https` maps only to `wss`.
- Selecting `https` changes only published URLs. The future external listener and internal Chromium endpoint remain plaintext; the bridge does not create or validate a TLS terminator.
- Discovery rewriting targets only `webSocketDebuggerUrl` and authority-bearing `ws=` values in `devtoolsFrontendUrl`; page URLs and arbitrary payload strings remain unchanged.

Dependency direction: these pure modules may use Node standard library APIs but must not import CLI, HTTP server, session-store, or upstream MCP lifecycle modules.

## Test-First Execution

### RED

1. Add `fast-check` properties for valid port boundaries and invalid lexical classes: Unicode whitespace, duplicate separators, signs, exponent notation, junk, descending ranges, and out-of-range values.
2. Add table tests for loopback IPv4/IPv6, hostname, wildcard, private/public bind, advertised-host validation, remote opt-in, and remote-gate failures.
3. Add the precedence matrix for CLI over environment over default, explicit `--no-*` false values, positive/negative conflicts, stdio process defaults, and HTTP absent/true/false overrides.
4. Add advertised-scheme tests for absent/http/https/invalid values and exact `http->ws` / `https->wss` publication without a TLS-listener side effect.
5. Add raw-argument tests for split and assignment forms, false-positive lookalikes, managed-disabled passthrough, and redacted errors.
6. Add capability tests for entropy length, alphabet, malformed/wrong/stale equivalence, and comparison behavior through an injected comparator spy rather than timing assertions.
7. Add URL/rewrite tests for IPv4, IPv6, hostname, both scheme pairs, encoded target IDs, `/json/version/`, `devtoolsFrontendUrl`, and unrelated payload preservation.

Run tests before production modules exist and record a relevant failed behavioral assertion. Missing imports or collection errors alone are not sufficient RED evidence; repair the harness and rerun.

### GREEN

Implement only the pure modules above with explicit types and Node standard library APIs. Error messages may name a setting or flag but must never contain environment values, capabilities, target IDs, internal endpoints, credentials, or browser data.

### PROVE

- Temporarily allow port `65536`; confirm the range property fails, then restore.
- Temporarily treat `--remote-debugging-portx` as conflicting; confirm the false-positive test fails, then restore.
- Bypass the injected constant-time comparator; confirm the comparator-observation test fails, then restore.
- Make `https` publish `ws`; confirm scheme-pair assertions fail, then restore.
- Rewrite an unrelated payload string; confirm byte-preservation fails, then restore.
- Omit IPv6 brackets; confirm the authority test fails, then restore.

## Focused Verification

From the repository root:

```bash
npx vitest run tests/unit/cdp-config.test.ts tests/unit/cdp-capability.test.ts tests/unit/cdp-urls.test.ts
npm run typecheck
npm run lint
npm run format:check
git diff --check
```

Expected evidence: deterministic pure checks pass; existing public CLI/help/config output is unchanged; no listener, lease, child, or browser is created.

## Completion Boundary

Complete only after RED, GREEN, every named PROVE mutation, and focused verification pass. Update `todo.md`, replace `handoff.md` with current evidence, and stop. Do not register public options or begin Packet 02 without a new explicit invocation.
