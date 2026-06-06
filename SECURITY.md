# Security Policy

## Supported versions

The project has not published a stable release yet. Security fixes are applied to `main`.

## Reporting a vulnerability

Please report vulnerabilities through **GitHub Security Advisories** (private reporting):

1. Open the private vulnerability report form:
   <https://github.com/swimmwatch/cloakbrowser-mcp/security/advisories/new>.
2. Or open the repository on GitHub, go to the **Security** tab, and click
   **Report a vulnerability**.
3. Submit details privately.

Do **not** open public issues for vulnerabilities.

## What to include

Please include as much of the following as possible:

- A clear description of the vulnerability and impacted components.
- Reproduction steps or a minimal proof of concept.
- Expected behavior vs actual behavior.
- Security impact assessment (confidentiality, integrity, availability).
- Any suggested mitigation.
- Environment details (OS, Node version, package version or commit SHA).

## Response process

- We will acknowledge new reports as quickly as possible.
- We will validate and triage severity.
- We will coordinate a fix and release plan with the reporter.
- We will publish a security advisory once a fix is available.

Please avoid public disclosure until a coordinated fix is released.

## Scope notes

This repository exposes upstream Playwright MCP tools unchanged, including unsafe tools such as `browser_evaluate` and `browser_run_code_unsafe`. Reports about bridge-specific process isolation, stdio transport leaks, Docker packaging, metadata, or CloakBrowser executable resolution are in scope. Reports about upstream Playwright MCP tool behavior should also be reported upstream when the issue reproduces without this bridge.

The project does not support requests for CAPTCHA-solving, anti-bot evasion, or bypassing access controls. Such requests are out of scope and will be declined.
