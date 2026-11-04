# Standard-Mode CloakBrowser MCP Working-Tree Audit

## 1. Executive Summary

**Audit status: completed, with a failed repository quality gate.** The native Workflow executed all five stages and all eight agents returned results. Its historical result was `NEEDS_REVIEW`: the Report Writer and Final Validator returned `PARTIAL`, not execution failures. The principal agent subsequently corrected the three report defects identified by Final Validator and finalized the measured execution metadata. The failed quality gate is preserved, not represented as passed.

This read-only audit covers the on-disk working tree, including pre-existing changes, on `feature/cdp-protocol` at `477923fc22968b904af3ea1da39c396429262960`, not HEAD alone. The verified candidate set contains **11 distinct confirmed findings**: 2 High, 7 Medium, 2 Low; no Critical findings. No source-code fixes were applied.

The highest-impact issues are HTTP initialization failures that permanently consume session capacity, missing Host/Origin validation on the outer Streamable HTTP endpoint, and proxy credentials appearing in upstream browser-launch errors. Other confirmed findings cover stdio EOF cleanup, shutdown/startup ownership leaks, release-channel selection, CDP liveness with zero pages, dropped request cancellation, Node-version diagnostics, and incorrect HTTP logging documentation. Each finding below includes evidence, a reproducible scenario, impact, and a remediation direction. Expected trust-model behavior and optional improvements are separated from defects.

**Required gate is failed:** QA ran `npm run check`; typecheck and lint completed, but Prettier failed on four pre-existing untracked JSON artifacts: [result 51085fb5](<results/51085fb5-b8c4-4f07-a3d2-b45ae4d8d507-result.json>), [result 825a28fd](<results/825a28fd-2ca3-4797-94eb-5ef06b749e40-result.json>), [result db1929ab](<results/db1929ab-c0c4-4974-932c-df70eba75376-result.json>), and [result fc7ddb88](<results/fc7ddb88-026a-4121-bf2c-c1195d380bca-result.json>). Final Validator independently reran the gate and reproduced the same failure. All other executed QA gates passed individually; the complete chained command did not pass. No artifact was reformatted or excluded. Next action: resolve the four artifacts' formatting/exclusion decision, then rerun `npm run check`; the responsible owner has not been established.

## 2. Repository Overview

- **Scope/baseline:** branch `feature/cdp-protocol`, commit `477923fc22968b904af3ea1da39c396429262960`; the principal independently verified origin as `https://github.com/swimmwatch/cloakbrowser-mcp.git`. The working tree was reported seven commits behind its remote-tracking branch. Pre-existing dirty tracked paths: [README.md:1–5](<README.md#L1-L5>), [src/cdp/httpProxy.ts:169–191](<src/cdp/httpProxy.ts#L169-L191>), [src/docker/control.ts:37–72](<src/docker/control.ts#L37-L72>), [src/http/server.ts:292–395](<src/http/server.ts#L292-L395>), [tests/integration/cdp-http-proxy.test.ts:390–446](<tests/integration/cdp-http-proxy.test.ts#L390-L446>), and [tests/integration/streamable-http.test.ts:977–1020](<tests/integration/streamable-http.test.ts#L977-L1020>). The pre-existing untracked test [tests/unit/docker-control.test.ts:1–70](<tests/unit/docker-control.test.ts#L1-L70>) and five existing report/result artifacts were preserved. Supplied and independently reported baseline hashes were unchanged; tracked-file inventory was 569.
- **Stack:** Node.js v24.20.0, npm 11.19.0, RTK 0.46.0; package engine is `^22.13.0 || >=24.0.0` ([package.json:7–12](<package.json#L7-L12>)). Installed direct/runtime versions included MCP SDK 1.30.0, Playwright MCP 0.0.82, CloakBrowser 0.5.10, Playwright/Core 1.64.0-alpha-1789764292000, TypeScript native alias 7.0.2 (the `tsc` executable), and Vitest 5.0.0. Runtime declarations and CLI entry are in [package.json:14–32](<package.json#L14-L32>); the toolchain aliases are in [package.json:107–128](<package.json#L107-L128>).
- **Architecture map:** CLI selects stdio or Streamable HTTP and owns shutdown; the bridge creates generated browser configuration and starts the upstream MCP child; the outer server forwards upstream tools and adds two local diagnostic tools ([src/cli.ts:21–73](<src/cli.ts#L21-L73>), [src/server.ts:101–181](<src/server.ts#L101-L181>), [src/bridge/config.ts:228–255](<src/bridge/config.ts#L228-L255>)). HTTP creates per-session owners and stores initialized session metadata; managed CDP adds a port lease, capability proxy, browser-generation ownership and recovery ([src/http/server.ts:292–395](<src/http/server.ts#L292-L395>), [src/cdp/session.ts:253–305](<src/cdp/session.ts#L253-L305>)). Docker uses a non-root runtime and lifecycle supervisor ([Dockerfile:59–88](<Dockerfile#L59-L88>), [src/docker/launcher.ts:82–225](<src/docker/launcher.ts#L82-L225>)).
- **Inventory and dirtiness:** mapper inventory reported 569 tracked files and six pre-existing dirty tracked paths above, with six pre-existing untracked paths (one test, one report, four result JSON files). Aggregate tracked and untracked fingerprints and working-diff SHA-256 matched the provided baseline; no repository source, dependencies, lockfiles or Git state were changed by the audit. This report is the authorized new deliverable.
- **Skills/tool availability:** `project-docs-maintainer` was loaded independently in every agent context. Generic Code Review, Security, Architecture, Testing, TypeScript/Node.js, and documentation-and-ADRs skills were unavailable in the active catalog and were not invented or installed. Tools included native `workflow`, `read`, `glob`, `grep`, `bash`, `tool_search`, `codegraph_explore`, `skill`, `write`/`edit`, Git and the installed Node/npm/Vitest toolchain; shell checks were prefixed with `rtk`. No delegation outside the native Workflow was used.

### Dependencies and operating boundaries

Declared runtime dependencies are SDK `^1.30.0`, Playwright MCP `^0.0.82`, CloakBrowser `^0.5.10`, Commander `^15.0.0`, MMDB library `^3.0.3`, Pino `^10.3.1`, SOCKS proxy agent `^10.1.0`, and exact WebSocket library `8.21.3` ([manifest:93–101](<package.json#L93-L101>)). Discovery compared manifests, lockfile and `npm ls`: installed SDK/MCP/CloakBrowser were 1.30.0/0.0.82/0.5.10, with Commander 15.0.0, MMDB 3.0.3, Pino 10.3.1 and SOCKS agent 10.1.0. The TypeScript 7.0.2 `tsc` alias is separate from the TypeScript 6.0.2 API alias; fast-check resolved to 4.10.0, not merely the declared lower bound ([toolchain:103–128](<package.json#L103-L128>)).

The CLI, not a supported server-library API, is the public package boundary. Configuration/profile locks and generated files belong to the bridge; upstream owns browser tools and automation. Stdio protocol output must stay on stdout while runtime logs use stderr. HTTP owns isolated per-session upstream processes; CDP adds capability URLs and managed generations, not another Playwright Server. Docker uses a non-root user, Tini and a process-group supervisor; headed sessions intentionally share one display. These distinctions prevent attributing documented browser privileges or shared-display behavior to accidental MCP session-isolation defects.

### Build, tests and CI/CD

| Area | Declared implementation / inspected evidence | Locally established scope |
|---|---|---|
| Build and quality | TypeScript build plus runtime-asset copy; chained check includes typecheck, lint, formatting, docs metadata, schema, build, tests and packaged CLI ([scripts:38–91](<package.json#L38-L91>)). | Build and downstream gates passed separately; complete check failed at formatting. |
| Unit/integration | Vitest Node environment, unit/property tests and real SDK fake-upstream process fixtures; V8 thresholds are 85% lines/functions/statements and 75% branches ([Vitest configuration](<vitest.config.ts>), [fixture](<tests/fixtures/fake-upstream-mcp.mjs>)). | 432 unit + 70 integration tests passed; 4 intentional Windows-only skips. Coverage gate not executed. |
| Distribution acceptance | Packaged CLI and separate manual npm, console, CDP and Docker suites ([script selection:46–57](<package.json#L46-L57>)). | Six packaged CLI tests passed. Focused installed-Chromium proofs ran, but full distribution/browser/container acceptance did not. |
| Quality matrix | Node 22/24/25/26 over Ubuntu x64/ARM, macOS ARM/Intel and Windows; package verification follows the quality check ([CI matrix:14–69](<.github/workflows/ci.yml#L14-L69>)). | Inspected declarations only; this Linux run does not establish remote or cross-platform success. |
| Security/deployment CI | Read-only default workflow permissions, SHA-pinned Actions, digest-pinned base images; separate npm audit, browser/CDP, Docker, parity, documentation and security workflows ([CI:11–47](<.github/workflows/ci.yml#L11-L47>), [browser jobs:71–120](<.github/workflows/ci.yml#L71-L120>), [Dockerfile](<Dockerfile>)). | No remote CI, live advisory scan, container pull/build, registry or publication operation executed. |
| Release and docs | Separate publication/deployment orchestration and strict MkDocs build; generated CLI and compatibility data have owning scripts ([release workflow](<.github/workflows/release.yml>), [docs pre-build hook:8–25](<docs/hooks/generate_cli_docs.py#L8-L25>)). | Release was read-only inspected. Strict docs build was skipped because its hook writes tracked documentation. |

## 3. Audit Methodology

This was a read-only audit of current disk contents rather than a HEAD-only review. The Report Writer first read the required DSH tool-search instructions and applicable repository and DSH agent instructions, loaded the relevant documentation skill, then used CodeGraph for source discovery. Specialist audits inspected implementation, tests, docs, dependency versions and selected runtime behaviors. The Independent Verifier independently reproduced all 11 candidate defects using isolated loopback/fake-upstream or already-installed-browser proofs, and consolidated overlapping hypotheses. Temporary proofs were restricted to fresh `/tmp` paths; no project file was changed during proof execution.

Evidence levels are explicit: findings in Section 5 are only those marked **CONFIRMED** by the Independent Verifier. Section 6 keeps unverified/likely candidates separate; Section 7 records rejected claims and reasons. High-impact security cases were reproduced against self-owned loopback services with synthetic credentials; the report does not claim external DNS-rebinding exploitation or use of real secrets. Exact file/line citations point to current on-disk paths and are included in a final read-only link/range validation check.

The method was targeted rather than a line-by-line review of every tracked file. No external attacker, paid browser download, publication path, or real deployment was tested. Findings and severities below preserve the verifier's decisions; speculative performance claims are excluded.

## 4. Multi-Agent Configuration

Provider was `openai-codex` for each role. Preflight inspected every advertised candidate: `gpt-6.1-sol` and `gpt-6-luna` support `low`, `medium`, `high`, `xhigh`, `max`; `gpt-5.6-terra` additionally supports `off` and `minimal`. The Workflow `agent()` interface does not accept a reasoning-effort option, so none was supplied; the effective adapter default/inherited effort is **N/A**, not inferred from model capabilities.

The current principal model was selected for high-consequence architecture, code/security review and verification; Luna handled QA/report synthesis and Terra handled bounded documentation comparison. These are task-fit allocations, not claims of measured specialization, context capacity, speed or cost superiority. Each child loaded and used `project-docs-maintainer` in its own context for canonical behavior/documentation checks. No generic review, security, testing, TypeScript or architecture skill was available or invented. The statuses below preserve actual returned values, including partial results.

| Agent | Provider | Model | Reasoning | Skills | Status |
|---|---|---|---|---|---|
| Architect | openai-codex | gpt-6.1-sol | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| Code Reviewer | openai-codex | gpt-6.1-sol | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| Security Auditor | openai-codex | gpt-6.1-sol | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| QA Engineer | openai-codex | gpt-6-luna | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| Documentation Reviewer | openai-codex | gpt-5.6-terra | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| Independent Verifier | openai-codex | gpt-6.1-sol | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | COMPLETED |
| Report Writer | openai-codex | gpt-6-luna | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | PARTIAL returned; report corrections completed by principal |
| Final Validator | openai-codex | gpt-6.1-sol | N/A (adapter default/inherited, not exposed) | project-docs-maintainer | PARTIAL returned; three report errors corrected; repository gate still failed |

The native `workflow` call used `await` for discovery → one `parallel()` call containing all four audits → `await` verification → `await` writing → `await` final validation. `phase()` displayed stages but did not control dependencies. Four-way overlap was proven from actual role start/end records. `pipeline()` was intentionally unused because verification requires a barrier over all audit results. There were eight first attempts, no execution failures and no retries. Six roles returned `COMPLETED`; the last two returned `PARTIAL`. The principal repaired the report without repeating the audit or rewriting those historical statuses. A failed repository quality gate is a recorded audit outcome, not evidence that the specialist investigations did not execute.

## 5. Confirmed Findings

Only independently verified findings appear here. Candidate IDs are preserved; mapper/code-review overlaps are consolidated rather than counted twice. All 11 named specialist candidates were independently confirmed with High confidence; DOC-001 was downgraded from Medium to Low by the verifier. Confidence describes the evidenced defect, not unexecuted attack/deployment variants.

| ID | Category | Severity | Status | Confidence |
|---|---|---|---|---|
| SEC-001 | Availability / initialization ownership | High | CONFIRMED | High |
| SEC-002 | Transport security / authority admission | High, conditional | CONFIRMED | High |
| SEC-003 | Secret handling / launch diagnostics | Medium | CONFIRMED | High |
| CODE-001 | Resource lifecycle / stdio termination | Medium | CONFIRMED | High |
| CODE-002 | Resource lifecycle / shutdown race | Medium | CONFIRMED | High |
| CODE-003 | Resource lifecycle / startup rollback | Medium | CONFIRMED | High |
| CODE-004 | Configuration / release-channel selection | Medium | CONFIRMED | High |
| CODE-005 | Browser lifecycle / liveness | Medium | CONFIRMED | High |
| CODE-006 | Protocol semantics / cancellation | Medium | CONFIRMED | High |
| CODE-007 | Diagnostics / supported runtime range | Low | CONFIRMED | High |
| DOC-001 | Documentation / logging sink | Low | CONFIRMED | High |

### SEC-001 — High: rejected HTTP initialization permanently consumes capacity

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** HTTP allocates and registers the per-session owner before SDK-level media type, `Accept`, and initialization-batch rejection; normal SDK error responses do not enter rollback. The outer media-type check also accepts a JSON substring in a misleading media type ([src/http/requests.ts:43–46](<src/http/requests.ts#L43-L46>), [src/http/server.ts:362–394](<src/http/server.ts#L362-L394>), [src/http/server.ts:423–456](<src/http/server.ts#L423-L456>)). Expiry enumerates initialized metadata records, so an owner rejected before metadata creation is not reclaimed ([src/http/sessionStore.ts:75–78](<src/http/sessionStore.ts#L75-L78>)).

**Failure and consequence.** With `sessionMax=1`, a request rejected with 400/406/415 leaves one owner but no session ID; later valid initialization receives 503 even after the idle TTL. Verifier reproduced four rejection variants and observed active=1, pending=0, no metadata, then 503. This is persistent capacity exhaustion, distinct from normal temporary occupancy by an initialized client.

**Safe verification.** Start an isolated loopback bridge with the existing fake upstream and a fresh temporary directory; send an initialize request with invalid `Accept`, misleading `text/plain;charset=application/json`, or an initialize-plus-tools/list batch; wait beyond a short idle TTL and issue a valid initialize. No external target is needed.

**Recommended fix.** Validate protocol admission before allocating runtime resources, or keep ownership provisional until initialization completes; dispose every owner whose request completes without successful initialization and ensure expiry can see any retained owner. Add capacity/cleanup regressions for 400/406/415 and MIME parsing.

### SEC-002 — High: outer HTTP accepts hostile Host and Origin

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** The MCP endpoint checks route and optional bearer authentication but does not validate authority; transport construction omits Host/Origin allowlists and DNS-rebinding protection ([src/http/server.ts:192–204](<src/http/server.ts#L192-L204>), [src/http/server.ts:448–460](<src/http/server.ts#L448-L460>)). The HTTP option defaults include loopback/no token ([src/http/options.ts:70–79](<src/http/options.ts#L70-L79>)). CDP authority checks do not secure this separate MCP listener.

**Failure and consequence.** A self-owned loopback initialize with `Host: attacker.invalid:3000` and matching hostile `Origin` received 200 and a session; the same authority then successfully called `cloakbrowser_bridge_info`. A bearer-protected control returned 401. Actual browser DNS rebinding/private-network bypass was not attempted. Exploitation is conditional on unauthenticated HTTP and browser/network conditions; this does not prove theft of another session.

**Safe verification.** Against a self-owned loopback fake-upstream instance only, send hostile Host/Origin headers with valid MCP headers, then repeat against a bearer-protected control. Do not send requests to third-party hosts.

**Recommended fix.** Enforce maintained SDK Host/Origin validation before allocating a runtime; explicitly configure local and reverse-proxy authorities, permit Origin-less non-browser clients as appropriate, and retain authentication for network exposure. Add outer-HTTP authority tests.

### SEC-003 — Medium: proxy credentials leak in browser launch errors

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** CloakBrowser-generated proxy arguments are merged into launch config and `--proxy-server` values are retained ([src/bridge/config.ts:614–627](<src/bridge/config.ts#L614-L627>), [src/bridge/config.ts:1102–1115](<src/bridge/config.ts#L1102-L1115>)). Installed CloakBrowser builds authenticated proxy URLs into arguments ([node_modules/cloakbrowser/dist/proxy.js:211–240](<node_modules/cloakbrowser/dist/proxy.js#L211-L240>)); installed Playwright logs launch arguments and embeds browser logs in startup errors ([node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js:9453–9456](<node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js#L9453-L9456>), [node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js:40597–40602](<node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js#L40597-L40602>)). The bridge returns ordinary tool results unchanged ([src/server.ts:175–181](<src/server.ts#L175-L181>)).

**Failure and consequence.** A safe proof used an immediately failing temporary browser executable and synthetic SOCKS5 credentials pointed at loopback. A real installed upstream tool returned an error containing the complete synthetic credential-bearing launch argument. This can copy server-configured proxy secrets into MCP conversation/model/client logs; no real credentials or external destination were used. Native HTTP credential disclosure is supported by source inspection but was not separately executed.

**Safe verification.** Repeat only with synthetic credentials, fresh temporary HOME/cache/output, and an executable that exits immediately; assert that the returned error either exposes or does not expose the synthetic marker without printing actual secrets.

**Recommended fix.** Prevent proxy authentication material from entering client-visible launch diagnostics, preferably via protected upstream authentication or narrowly scoped raw/encoded secret redaction. Add synthetic-secret startup-failure tests for SOCKS5 and supported native HTTP paths, preserving useful non-secret diagnostics.

### CODE-001 — Medium: stdio EOF does not dispose bridge ownership

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** CLI cleanup is registered for signals ([src/cli.ts:65–69](<src/cli.ts#L65-L69>)); transport startup and owner disposal are distinct ([src/server.ts:184–206](<src/server.ts#L184-L206>)). Installed SDK stdio server transport listens for data/error but not stdin end ([node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js:32–39](<node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js#L32-L39>)).

**Failure and consequence.** After initializing the source CLI against the fake upstream, ending stdin without a signal left both processes alive after 700 ms. SIGTERM then cleaned them. EOF-only clients can retain upstream/browser ownership, generated config and persistent-profile locks; SDK clients that later kill the child can mask the defect.

**Safe verification.** Spawn the source CLI with piped stdio and isolated temporary paths, initialize it, end stdin without sending a signal, and observe process/owned-resource cleanup. Do not rely on a parent SDK's forced termination.

**Recommended fix.** Route stdin EOF and transport termination through one idempotent disposal path shared with signal handling; test upstream exit and profile/config cleanup.

### CODE-002 — Medium: HTTP shutdown misses initialization completing after its snapshot

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Shutdown snapshots registered sessions and then closes the listener without draining provisional initialization ([src/http/server.ts:155–159](<src/http/server.ts#L155-L159>)); an in-flight initialize can register after awaits without checking shutdown state ([src/http/server.ts:362–383](<src/http/server.ts#L362-L383>)).

**Failure and consequence.** Initialization completed with 200 after shutdown began; shutdown then resolved with one upstream still alive. A second close disposed that owner. Final Validator independently instrumented the order as `shutdown-started → initialize-response-complete → shutdown-resolved`. The defect is the retained owner after shutdown, not a response occurring after shutdown resolution; it differs from SEC-001's rejected initialization.

**Safe verification.** Gate display/runtime preparation in an isolated fake-upstream HTTP instance, begin close, release the gate and verify that shutdown cannot resolve with a live late owner.

**Recommended fix.** Stop admission synchronously, track provisional initialization, cancel or drain it before final disposal, and reject/dispose any owner completing after shutdown begins. Keep close idempotent.

### CODE-003 — Medium: failed ordinary startup retains runtime/profile ownership

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Ordinary startup obtains runtime ownership then awaits fallible stages without rollback ([src/server.ts:85–95](<src/server.ts#L85-L95>)); profile lock is acquired during preparation ([src/bridge/config.ts:314–324](<src/bridge/config.ts#L314-L324>)) and released only by runtime disposal ([src/bridge/config.ts:580–584](<src/bridge/config.ts#L580-L584>)).

**Failure and consequence.** An injected `beforeConnect` failure left generated configuration present and prevented preparing the same profile again. Explicit disposal restored reuse. Other handoff failures were source-inspected, not all independently injected.

**Safe verification.** Use isolated temporary profile/output paths and the Playwright engine, inject a `beforeConnect` rejection, then inspect only the fresh proof directory and test same-process profile reuse.

**Recommended fix.** Keep ownership provisional until startup succeeds and dispose exactly once after each failed handoff, including internally acquired server runtimes; avoid double-disposal of caller-owned resources.

### CODE-004 — Medium: bridge release channel is not used for binary acquisition

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Binary acquisition runs without the resolved channel, which is obtained afterward for launch-option construction ([src/bridge/config.ts:471–487](<src/bridge/config.ts#L471-L487>)). Later option construction forces the already selected executable ([src/bridge/config.ts:1230–1237](<src/bridge/config.ts#L1230-L1237>)); installed CloakBrowser's resolver accepts a release channel ([node_modules/cloakbrowser/dist/download.js:47–74](<node_modules/cloakbrowser/dist/download.js#L47-L74>)).

**Failure and consequence.** An isolated hook proof requested `preview`: the binary resolver received no argument, while launch options received `preview` and were forced to use the prior executable. For eligible Pro/no-pin configuration this can select Stable instead of Preview. No licensed download was performed.

**Safe verification.** Instrument existing preparation hooks with an explicit Preview request and no native channel/version override; assert the channel reaches binary acquisition and the selected executable matches the requested channel. Do not initiate a paid/network download.

**Recommended fix.** Resolve effective channel before binary acquisition and pass it to the SDK resolver; test selection, not only later launch-option forwarding.

### CODE-005 — Medium: zero-page live Chromium is treated as a lost generation

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Discovery and liveness both use page-requiring discovery ([src/cdp/chromium.ts:36–40](<src/cdp/chromium.ts#L36-L40>)); empty page targets cause discovery failure ([src/cdp/chromium.ts:101–109](<src/cdp/chromium.ts#L101-L109>)), and probe failure invalidates the generation ([src/cdp/session.ts:199–208](<src/cdp/session.ts#L199-L208>)).

**Failure and consequence.** With already-installed Chromium, closing the sole page left the browser connected and `/json/version` identity unchanged, but `probeGeneration` returned false and state became unavailable. CDP forwarding can then be blocked, and a later browser request can replace a healthy browser unnecessarily.

**Safe verification.** Use only the already-installed local browser with a temporary profile and loopback CDP port; close its last page, compare version identity and page targets, then probe managed generation. Close browser/session afterward.

**Recommended fix.** Separate browser-identity liveness from page discovery/challenge bootstrap; an empty page list alone must not indicate browser loss or prohibit target creation.

### CODE-006 — Medium: downstream tool cancellation is not forwarded

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** The outer call handler forwards without downstream request signal ([src/server.ts:151–176](<src/server.ts#L151-L176>)); managed forwarding similarly omits cancellation ([src/server.ts:506–508](<src/server.ts#L506-L508>), [src/cdp/types.ts:28–31](<src/cdp/types.ts#L28-L31>)). Installed upstream supports `extra.signal` ([node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js:73330–73333](<node_modules/@playwright/mcp/node_modules/playwright-core/lib/coreBundle.js#L73330-L73333>)).

**Failure and consequence.** With linked SDK transports and a gated upstream handler, cancelling downstream rejected the caller but did not notify upstream; releasing the gate completed one side effect. This is lost cancellation notification, not a promise that cancellation can undo committed work.

**Safe verification.** Use linked in-memory SDK transports and a controlled upstream abort listener; cancel after start, then assert upstream signal and prevent the gated operation from continuing where supported.

**Recommended fix.** Carry request context through ordinary and managed call APIs into SDK `callTool` options, and cover both forwarding paths. Do not claim transaction rollback.

### CODE-007 — Low: doctor accepts unsupported versions for compound engine range

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Doctor evaluates the package engine declaration ([src/cli/doctor.ts:111–118](<src/cli/doctor.ts#L111-L118>)) but treats unrecognized range syntax as supported ([src/cli/doctor.ts:460–469](<src/cli/doctor.ts#L460-L469>)); the actual range is `^22.13.0 || >=24.0.0` ([package.json:11–12](<package.json#L11-L12>)).

**Failure and consequence.** Mocked Node versions 22.12.0, 22.13.0, 23.0.0 and 24.0.0 all reported supported, including the two excluded versions. This is false diagnostic reassurance, not proof those runtimes cannot otherwise work.

**Safe verification.** In an isolated process override `process.versions.node` for excluded and allowed boundary values, invoke doctor report, then restore it.

**Recommended fix.** Evaluate the full declared compound range and add lower-bound and excluded-major tests; unknown syntax must not silently mean supported.

### DOC-001 — Low: HTTP logging docs identify stdout instead of stderr

**Verification:** CONFIRMED. **Confidence:** High.

**Evidence and cause.** Canonical configuration and getting-started pages say stdout ([docs/configuration.md:393–395](<docs/configuration.md#L393-L395>), [docs/getting-started.md:75](<docs/getting-started.md#L75>)), while CLI uses stderr ([src/cli.ts:106–115](<src/cli.ts#L106-L115>)) and packaged assertions expect empty stdout/logs on stderr ([tests/e2e/packaged-cli.test.ts:115–121](<tests/e2e/packaged-cli.test.ts#L115-L121>)). Localized copies repeat the incorrect source text.

**Failure and consequence.** Capturing stdout as directed misses listener/request diagnostics. Verifier independently observed listener and health-request logs on stderr and zero stdout bytes. This is documentation misdirection, not a runtime protocol defect.

**Safe verification.** Run the source CLI in local Streamable HTTP mode, capture both streams and request `/healthz`; no external listener is needed.

**Recommended fix.** Correct the two English canonical statements, then surgically update the affected localized pages and translation manifest. Do not alter runtime logging.

## 6. Likely and Unverified Findings

No finding in this section is counted as confirmed or included in severity counts.

- **Optional closed-session metadata retention:** verifier observed 20 closed records remaining until store-wide `clear`; closed records are not selected by active-expiry listing ([src/http/sessionStore.ts:54–64](<src/http/sessionStore.ts#L54-L64>), [src/http/sessionStore.ts:75–87](<src/http/sessionStore.ts#L75-L87>)). This is a potential bounded-retention improvement for long-lived/high-churn deployments, not a demonstrated resource-exhaustion defect; no production cardinality, memory use or scale threshold was measured. Consider an explicit tombstone retention policy only if deployment requirements warrant it.
- **Preview licensed selection:** code path and hooks show the release-channel argument is dropped (confirmed CODE-004), but actual licensed Preview binary acquisition was deliberately not run. Do not treat an observed wrong downloaded binary as established runtime evidence.
- **HTTP-authenticated native proxy secret leak:** installed source supports credential-bearing HTTP arguments, but dynamic launch-failure proof used synthetic SOCKS5 credentials. Validate the HTTP variant with synthetic-only credentials before claiming it reproduced dynamically.
- **Browser exploitation of SEC-002:** hostile authority headers were reproduced locally, but real DNS rebinding and browser private-network restrictions were not tested. The attack preconditions remain conditional.

## 7. Rejected Findings

**Formal candidate disposition:** 11 CONFIRMED, 0 LIKELY, 0 REJECTED, 0 NOT_VERIFIED. No named specialist finding was rejected. The four follow-up notes in Section 6 concern evidence scope or optional improvements, not four additional candidate findings. The Report Writer's returned summary counts for likely/rejected/unverified notes were not a validated candidate inventory and are not used here.

No duplicate candidate was counted again. The following qualitative mapper concerns or possible interpretations were rejected as current defects, consolidated, or retained as expected trust behavior; they must not be reported as an invented count of rejected specialist findings:

- The mapper's concerns matching CODE-002 (shutdown race), CODE-003 (startup rollback), CODE-007 (doctor range), and DOC-001 (logging prose) are consolidated under those verifier-confirmed IDs, not separate findings.
- **Future upstream console compatibility break:** the current installed `tools.Tab` exposes the methods patched by the bridge. A future upstream-internal change is a compatibility risk, not a demonstrated current defect; use version-matched parity/distribution checks ([src/runtime/consoleFallback.ts:54–92](<src/runtime/consoleFallback.ts#L54-L92>)).
- **Documented trust model:** trusted MCP clients can invoke upstream capabilities; page-defined WebMCP schemas are untrusted; possession of a CDP capability grants browser control; advertised HTTPS requires operator-managed TLS; cross-protocol operations are not transactional; Docker headed sessions share X11. These are documented deployment/trust boundaries, not findings of accidental privilege escalation ([docs/security.md:11–34](<docs/security.md#L11-L34>), [docs/security.md:99–118](<docs/security.md#L99-L118>), [docs/architecture.md:65–67](<docs/architecture.md#L65-L67>), [docs/docker.md:29–50](<docs/docker.md#L29-L50>)).
- **Current dirty HTTP/CDP/Docker changes:** client-abort handling and transient CDP forwarding errors have regression assertions; Docker display IPC waits for replies and handles send/disconnect errors ([src/http/server.ts:309–394](<src/http/server.ts#L309-L394>), [tests/integration/cdp-http-proxy.test.ts:390–446](<tests/integration/cdp-http-proxy.test.ts#L390-L446>), [src/docker/control.ts:37–72](<src/docker/control.ts#L37-L72>)). Those behaviors were not reported as defects. Assertions were not all run by every audit role; QA's broad suites did pass.
- **Historical compatibility row:** released compatibility history records an older released dependency, while changelog labels the newer integration Unreleased; this is not evidence the published compatibility row is stale ([docs/data/version-compatibility.json:3–6](<docs/data/version-compatibility.json#L3-L6>), [CHANGELOG.md:7–34](<CHANGELOG.md#L7-L34>)).

## 8. Testing Gaps

**Checks actually reported by QA:**

| Check | Exit/result | Notes |
|---|---:|---|
| `npm run check` | 1 | Typecheck passed; ESLint had two warnings and no errors; Prettier failed on the four pre-existing untracked `results/*.json` artifacts. Later chained checks did not run in this command. |
| `npm run test:unit` | 0 | 37 files; 432 passed, 4 skipped. |
| `npm run test:integration` | 0 | 8 files; 70 passed. |
| `npm run build` | 0 | Distribution TypeScript build and runtime asset copy passed. |
| `npm run docs:compatibility:check` | 0 | Passed. |
| `npm run docs:translations:check` | 0 | Passed. |
| `npm run server:validate` | 0 | Schema validation passed. |
| `npm run test:e2e:run` | 0 | Packaged CLI: 1 file, 6 tests passed. |
| Targeted security suites | 0 | Security role reports 11 suites and 277 tests passed, including dirty integrations and untracked Docker-control test. |
| `npm run docs:seo:validate` | 0 | Documentation reviewer reports passed. |
| Generated CLI reference comparison | 0 | Documentation reviewer reports exact match. |
| Pre-existing result JSON Prettier subset | 1 | Independent verifier reproduced formatting failure on all four exact artifacts. |

Results above are agent-reported checks with their attribution; broad checks were not repeated by the Report Writer. No real-browser distribution matrix, Docker image acceptance, cross-platform CI matrix, coverage gate, live advisory scan or external publication was run. Manual distribution suites were skipped because they may install packages, pull/build containers or run external/browser paths. Documentation build was skipped because its [pre-build hook:8–25](<docs/hooks/generate_cli_docs.py#L8-L25>) rewrites tracked [llms.txt](<docs/llms.txt>). Final Validator identified the four skips as the explicitly Windows-only `cleanStaleSingletonLocks (windows lock format)` suite: `removes a windows-format lock whose PID is dead`, `keeps a windows-format lock whose PID is alive`, `keeps a windows-format lock whose PID status is unknown`, and `skips a windows-format lock with a non-positive PID`. The platform gate intentionally skips this suite on Linux; its focused rerun passed 26 cases and skipped these four ([platform gate:9–11](<tests/unit/singleton-lock-cleanup.test.ts#L9-L11>), [Windows cases:255–310](<tests/unit/singleton-lock-cleanup.test.ts#L255-L310>)). These skips are not test failures or evidence that Windows behavior was dynamically validated.

### Concrete regression cases

These are proposed assertions, not tests added by this audit. Reuse existing fixtures and harnesses; no additional dependency is required by the proposal.

| Finding / scenario | Existing harness | Specific test and acceptance assertion |
|---|---|---|
| SEC-001: rejected initialization | [HTTP integration suite](<tests/integration/streamable-http.test.ts>) and [fake upstream](<tests/fixtures/fake-upstream-mcp.mjs>) | Set `sessionMax=1`, TTL=100 ms. Parameterize invalid Accept (406), misleading MIME type (415), and initialize batch (400). After rejection and >TTL, require zero active/pending owners, child exit, config removal, and successful valid initialize. Include valid MIME parameters and malformed JSON controls. |
| SEC-002: authority admission | [HTTP integration suite](<tests/integration/streamable-http.test.ts>) | Reject hostile Host and browser Origin before starting an upstream child. Permit explicitly configured local/reverse-proxy authorities and valid Origin-less SDK clients. Preserve 401 for missing/wrong bearer tokens; independently test the CDP policy rather than assuming shared protection. |
| SEC-003: synthetic-secret diagnostics | [Proxy integration suite](<tests/integration/proxy.test.ts>) and [configuration tests](<tests/unit/config.test.ts>) | Use a fresh immediately exiting executable and synthetic SOCKS5/native-HTTP credentials. Require an actionable startup error without raw or encoded username/password markers in tool text, logs or introspection. Never use real credentials or an external proxy. |
| CODE-001: EOF-only shutdown | [Packaged CLI E2E](<tests/e2e/packaged-cli.test.ts>) | Spawn the packaged CLI with fake upstream; initialize, end stdin and do not send a signal or use SDK kill escalation. Require both PIDs to exit within a bounded deadline, profile reuse and generated-config removal. Retain signal and repeated-close controls. |
| CODE-002: initialization/shutdown race | [HTTP integration suite](<tests/integration/streamable-http.test.ts>) | Gate display/preparation for ordinary and managed paths, begin close, then release. After close resolves, require zero owners/children, no late registration and no accepted new initialization. Do not assert the response must finish after shutdown; that chronology was not reproduced. |
| CODE-003: startup rollback | [Server tests](<tests/unit/server.test.ts>) and [configuration tests](<tests/unit/config.test.ts>) | Inject `beforeConnect`, upstream connect and outer-transport start failures separately. Require exactly-once cleanup, no generated config and reusable profile. Distinguish internally acquired ownership from caller-owned runtimes. |
| CODE-004: channel acquisition | [Configuration tests](<tests/unit/config.test.ts>) | With eligible Pro Preview, no explicit binary/version pin and instrumented hooks, require Preview to reach binary acquisition and the final executable to match the selected channel. Cover Stable and intentional explicit-pin precedence without downloading. |
| CODE-005: live zero-page browser | [CDP Chromium tests](<tests/unit/cdp-chromium.test.ts>) and [CDP session tests](<tests/unit/cdp-session.test.ts>) | With an already installed browser and loopback CDP, close the last page while retaining browser identity. Require published generation/lease to stay valid and allow target creation; still invalidate changed identity or a genuinely disconnected browser. |
| CODE-006: cancellation | [Proxy integration suite](<tests/integration/proxy.test.ts>) and [server tests](<tests/unit/server.test.ts>) | Use linked SDK transports, an abort-aware upstream and a gated side effect. Cancel after start; require the upstream signal to abort and supported work to stop in ordinary and managed paths. No rollback promise for already committed effects. |
| CODE-007: runtime boundaries | [Doctor tests](<tests/unit/doctor.test.ts>) | Mock Node 22.12.0, 22.13.0, 23.0.0 and 24.0.0; expect unsupported, supported, unsupported, supported. Include later supported majors and unknown range syntax. |
| DOC-001: canonical logging contract | [Packaged CLI E2E](<tests/e2e/packaged-cli.test.ts>) and [translation checker](<scripts/update-doc-translations.mjs>) | Keep the existing stdout-empty/stderr-log assertion; correct canonical prose and only affected locales/manifest hashes. Fresh translation hashes alone must not be treated as validation of behavioral truth. |

For deployment coverage, run authorized package-install, real CloakBrowser, Docker/CDP, coverage and cross-platform acceptance in their intended environments. Linux-only local results cannot certify Windows/macOS behavior. Run the focused regressions after fixes; then rerun `npm run check` once the artifact-formatting decision is resolved. The responsible owner is not established.

## 9. Architecture Improvements

1. **Make resource ownership provisional and explicit.** HTTP admission, server shutdown and ordinary startup have distinct leak triggers (SEC-001, CODE-002, CODE-003); share a lifecycle discipline without conflating their regression cases. Stop admission before shutdown sweeps and dispose every failed/uninitialized handoff.
2. **Keep secrets out of errors at the launch boundary.** Avoid forwarding credential-bearing command lines to MCP output; redact narrowly and preserve actionable non-secret diagnostics. This boundary is consistent with the repository's explicit treatment of proxy credentials as lifecycle-owned resources ([AGENTS.md:60–72](<AGENTS.md#L60-L72>)).
3. **Preserve protocol semantics across forwarding.** Forward request cancellation into upstream `callTool`; keep stdout reserved for stdio protocol and maintain documented stderr behavior ([AGENTS.md:20–28](<AGENTS.md#L20-L28>)).
4. **Separate browser liveness from target discovery.** Browser identity may remain stable when the page list is empty; use distinct checks for ownership bootstrap and ongoing liveness.
5. **Keep diagnostics aligned with declared compatibility.** Evaluate the package engine range as declared rather than a simplified subset; test excluded versions.
6. **Treat HTTP transport authority separately from browser-navigation policy.** Host/Origin validation and authentication belong at the outer listener. Do not mistake upstream navigation guardrails or CDP proxy checks for listener admission controls.
7. **Optional retention policy:** closed-session tombstones may need a bounded retention policy for some long-running deployments, but current evidence does not justify a severity or performance claim.

These are remediation directions only; no source change was authorized or made.

## 10. Prioritized Action Plan

| Priority | Findings / task | Recommended action | Acceptance / dependency | Assigned owner |
|---|---|---|---|---|
| P1 | SEC-001, SEC-002 | Enforce outer HTTP protocol/authority admission before resource acquisition; dispose SDK-rejected initialization owners. | All 400/406/415 variants reclaim capacity; hostile authority is rejected before spawning; configured bearer and valid SDK clients still work. | Not established |
| P1 | SEC-003 | Prevent credential-bearing proxy arguments from reaching client-visible startup diagnostics. | Real installed upstream failure with synthetic secrets produces no raw/encoded secret markers. | Not established |
| P2 | CODE-001, CODE-002, CODE-003 | Unify idempotent owner disposal; stop admission and drain pending initialization; roll back startup handoffs. | EOF, startup-failure and shutdown-race tests assert child exit, profile reuse and temp-resource cleanup. | Not established |
| P2 | CODE-004, CODE-005, CODE-006 | Pass channel into acquisition, separate identity from page liveness, and preserve request cancellation. | Selection/liveness/cancellation regressions pass in ordinary and managed paths where applicable. | Not established |
| P3 | CODE-007, DOC-001 | Correct compound engine-range diagnostics and canonical logging prose; update only affected locales. | Boundary tests, existing stderr assertions and surgical documentation consistency checks pass. | Not established |
| Required validation | Four pre-existing result artifacts | Resolve formatting/exclusion ownership without changing artifacts as part of this audit. | Rerun the complete `npm run check`; do not infer success from individually passing later stages. | Unknown; no ownership assigned by audit |
| Follow-up validation | Coverage, package/browser/Docker/platform and strict docs build | Execute the applicable acceptance paths in authorized environments after remediation. | No new dependencies, container downloads or tracked docs generation without appropriate authorization. | Not established |

Priorities are recommendations, not delivery commitments or authorization to implement them. No code remediation or pre-existing-file mutation was performed. Next action remains resolution of the protected result artifacts' formatting decision and rerunning the required check; its responsible owner is unknown.

## 11. Workflow Performance Metrics

These are final wall-clock values returned by the native Workflow. They measure this execution, not model throughput or production performance. Preflight and post-Workflow report corrections are excluded. Principal-agent waiting and tool use overlapped the native execution; their separate time/token costs were not measured and must not be added to the phase-duration sum.

| Metric | Actual value / limitation |
|---|---|
| Workflow name | `cloakbrowser-mcp-comprehensive-audit` |
| Native background execution/job ID | `workflow-ce33939b7b3e4cad` |
| Separate internal Workflow ID | N/A; not exposed by script hooks |
| Historical native result | `NEEDS_REVIEW`; all five stages executed; principal corrected report errors afterward |
| Start time | 2026-10-25T23:00:31.469Z / 2026-10-26 02:00:31.469 Europe/Moscow |
| End time | 2026-10-26T00:03:37.879Z / 2026-10-26 03:03:37.879 Europe/Moscow |
| Total native duration | **3786.410 seconds / 63 minutes 6.410 seconds** |
| Agents launched | **8**, one attempt per role; no retries |
| Returned statuses | 6 COMPLETED; 2 PARTIAL; 0 execution failures |
| Configured models | `openai-codex/gpt-6.1-sol`, `openai-codex/gpt-6-luna`, `openai-codex/gpt-5.6-terra` |
| Skills actually used | `project-docs-maintainer`, independently loaded by all eight roles and the principal |
| LLM request count | N/A; no complete request aggregate collected |
| Input tokens | N/A; per-response metadata is not a complete run aggregate |
| Output tokens | N/A; per-response metadata is not a complete run aggregate |
| Tool calls | N/A; no complete deduplicated run aggregate collected |
| Examined paths | 150 unique paths reported across discovery, the four audits and independent verification before writing; includes dependency/instruction paths and selective reads, not an independently measured count of fully read repository files |
| Confirmed findings | **11: Critical 0, High 2, Medium 7, Low 2** |
| Formal rejected / likely / not-verified findings | **0 / 0 / 0**; four scoped follow-up notes are not candidate findings |

### Stage timing and dependency evidence

| Phase | Start (UTC) | End (UTC) | Duration, seconds |
|---|---|---|---:|
| 1 — Discovery | 2026-10-25 23:00:31.469 | 2026-10-25 23:13:26.163 | 774.694 |
| 2 — Parallel Audit | 2026-10-25 23:13:26.164 | 2026-10-25 23:39:11.118 | 1544.954 |
| 3 — Independent Verification | 2026-10-25 23:39:11.119 | 2026-10-25 23:54:34.473 | 923.354 |
| 4 — Report Generation | 2026-10-25 23:54:34.473 | 2026-10-25 23:56:12.085 | 97.612 |
| 5 — Final Validation | 2026-10-25 23:56:12.085 | 2026-10-26 00:03:37.879 | 445.794 |

| Agent | Start (UTC) | End (UTC) | Duration, seconds |
|---|---|---|---:|
| Architect | 23:00:31.469 | 23:13:26.163 | 774.694 |
| Code Reviewer | 23:13:26.164 | 23:39:11.118 | 1544.954 |
| Security Auditor | 23:13:26.164 | 23:25:57.348 | 751.184 |
| QA Engineer | 23:13:26.165 | 23:15:04.428 | 98.263 |
| Documentation Reviewer | 23:13:26.166 | 23:15:31.151 | 124.985 |
| Independent Verifier | 23:39:11.119 | 23:54:34.473 | 923.354 |
| Report Writer | 23:54:34.473 | 23:56:12.085 | 97.612 |
| Final Validator | 23:56:12.085 | 00:03:37.879 next day | 445.794 |

All four audit agents were simultaneously active from **23:13:26.166 to 23:15:04.428 UTC**. The verifier started only after the last audit ended; writing started only after verification, and validation only after writing. Sum of stage durations is 3786.408 seconds; the 0.002-second difference from the total is orchestration overhead/clock sampling, not another execution stage.

### Final validation and preservation

Final Validator checked every original citation and finding count, independently reproduced SEC-001, SEC-002 and CODE-002, and reported three correctable report defects: missing explicit finding confidence, reversed CODE-002 completion chronology, and unspecified skipped-test identities. The principal corrected all three in this report and finalized statuses/metrics without repeating the full audit. The historical `PARTIAL` results and failed `npm run check` are retained transparently.

Content fingerprints independently matched preflight at discovery, after parallel audit, and in final validation:

| Protected data | SHA-256 |
|---|---|
| All 569 tracked file contents, including pre-existing edits | `487ab8cbae84bd63ebb1494303c389daefec26fed2b4c6a32d59a56d034c1895` |
| Exact six pre-existing untracked files | `e9e75e4038626c26f64dda1b1bcbb4d363a998a194acf4810c881c10969182e9` |
| `git diff --binary HEAD` | `16de5ebe78a55d84c6997b871c121fa1512c5a289be1624fdfb50313cd964723` |

Only this authorized report was added as a nonignored file. Ordinary ignored build/test artifacts may have been refreshed. No source code, pre-existing artifact, dependency, lockfile, configuration, Git index or commit was modified; no installation, publication, commit or pull request was performed. Every relevant background job was collected.

**Outstanding required check:** resolve the four protected result artifacts' formatting/exclusion decision, then rerun `npm run check`. The responsible owner remains unknown; audit completion does not make this quality gate pass.
