# Security

This page is for anyone operating the MCP server. Read it before connecting the server to an MCP client with access to sensitive sites, credentials, or local files.

This server automates a real browser on behalf of an AI agent. The project now exposes the full Playwright MCP-compatible tool surface, including tools that execute caller-supplied code. Treat the MCP client as trusted code.

## Threat model

The primary trust boundary is **between the MCP client (which is driven by an LLM) and the browser**. The client is treated as semi-trusted: its requests must be validated and constrained, because the LLM driving it may be steered by hostile page content (indirect prompt injection), by an adversarial user, or simply by accident.

Concrete threats considered:

1. **Indirect prompt injection from page content.** A snapshot of a page may contain text that asks the agent to perform a different action. The server validates tool inputs, but `browser_evaluate` and `browser_run_code_unsafe` intentionally allow caller-supplied code for Playwright MCP parity.
2. **Path traversal / arbitrary file write.** Mitigation: artifacts written through `filename` go through a single `ArtifactManager` rooted at `outputDir`. Playwright-compatible upload/drop/code tools may read explicit file paths supplied by the client.
3. **Unbounded navigation / SSRF-like behavior.** Mitigation: `allowedOrigins` / `blockedOrigins` enforce a host suffix policy at every `browser_navigate` call. Only `http`, `https`, `file`, and `about:` URL schemes are accepted; `file:` additionally requires `allowFileAccess`.
4. **Arbitrary JavaScript execution.** `browser_evaluate` executes JavaScript in the page context. `browser_run_code_unsafe` executes JavaScript in the server process with access to the Playwright page object and is RCE-equivalent.
5. **stdout corruption of the JSON-RPC stream.** Mitigation: the logger writes JSON lines to `stderr` only via pino. A contract test asserts no module ever writes to `process.stdout`.
6. **Resource exhaustion.** Mitigation: `maxPages`, `maxContexts`, and per-action timeouts are enforced by the session manager and the input schemas.

## Capability model

The capability flags listed in [Configuration](configuration.md#capability-flags) are retained for project-specific extensions and deployment policy. The Playwright MCP-compatible tools are registered by default.

- **Configuration remains explicit** and visible through `browser_get_config`.
- **Project-specific extension tools** use capability gates.
- **Local file and persistent profile surfaces** are gated: `file:` navigation requires `allowFileAccess`, and `userDataDir` requires `allowPersistentProfiles`.
- **Playwright parity tools** should be considered available to the MCP client unless you remove them from the registry or run a constrained fork.

## Origin policy

See [Configuration → Origin policy](configuration.md#origin-policy). The policy is enforced in `src/security/policies.ts::assertOriginAllowed`, which is called by every tool that navigates.

## Unsafe tools

The following tools are intentionally available for Playwright MCP parity:

- `browser_evaluate` — executes JavaScript in the page or element context.
- `browser_run_code_unsafe` — executes a Playwright code function in the server process.
- `browser_file_upload` and `browser_drop` — read client-supplied file paths.
- `browser_network_request` and `browser_network_requests` — expose request/response metadata and bodies captured by the browser.

Do not expose this server to an untrusted MCP client.

## Responsible use

CloakBrowser is a stealth Chromium runtime. This project surfaces standard browser automation only. It **does not** advertise, document, or support:

- CAPTCHA solving.
- Bypassing rate limits, bot-detection mechanisms, or access controls.
- Evading Terms of Service of any third-party site.
- Credential stuffing, scraping at a scale that violates a site's policy, or any form of unauthorised access.

The user of this server is responsible for ensuring their use complies with applicable laws and with the terms of service of every site they automate. The maintainers will not accept feature requests or PRs framed around bypassing security controls.

## Logging discipline

- No secrets, cookies, full request bodies, or full page DOMs are logged.
- Tool inputs are logged at `debug` level only and after redaction by the logger's serializers.
- All logs go to `stderr` as JSON lines; `stdout` is reserved for the MCP transport.

## Reporting a vulnerability

See [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) at the repository root. Use **GitHub Security Advisories** (private vulnerability reporting) rather than public issues for anything that could compromise users.
