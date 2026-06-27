---
description: CloakBrowser MCP, Docker isolation, artifacts, secrets और network exposure के लिए security model और browser automation risk guidance.
icon: material/shield-lock
tags:
  - सुरक्षा
  - उपयोगकर्ता गाइड
---

# सुरक्षा

यह project browser automation bridge है। इसे trusted-code execution infrastructure की तरह treat करें।

## Trust boundary

Outer server stdio और Streamable HTTP support करता है। यह upstream Playwright MCP को child process के रूप में शुरू करता है और tool calls forward करता है। Browser automation, file output, network access और unsafe evaluation behavior upstream Playwright MCP द्वारा governed होते हैं।

stdio server को unauthenticated network wrapper के जरिए expose न करें। कोई भी client जो tools call कर सकता है, browser चला सकता है, browser-observable page data पढ़ सकता है और artifacts मांग सकता है।

Streamable HTTP local clients के लिए default रूप से HTTP पर `127.0.0.1` से bind होता है। यदि आप इसे `0.0.0.0` से bind करते हैं या loopback से बाहर publish करते हैं, तो `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` या equivalent reverse proxy authentication require करें, `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` और TLS files के साथ direct HTTPS उपयोग करें या trusted network edge पर TLS terminate करें, और access को trusted clients तक सीमित रखें।

## Unsafe tools

Upstream Playwright MCP में `browser_evaluate` और `browser_run_code_unsafe` जैसे tools शामिल हैं। ये browser या Playwright server context में JavaScript execute कर सकते हैं। इस server को केवल trusted MCP clients से connect करें।

## Configuration

Access controls और guardrails के लिए upstream options उपयोग करें:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

ये convenience guardrails हैं, process, container, network और filesystem isolation का substitute नहीं।

जहां संभव हो trusted targets के लिए allowlists उपयोग करें। Unrestricted file access और secrets files को sensitive capabilities मानें और shared MCP client profiles से बाहर रखें।

## Sandbox mode

Docker इमेज default रूप से `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true` उपयोग करती है, क्योंकि containerized CI और MCP runtimes में browser sandboxing अक्सर उपलब्ध नहीं होती। यह compatibility tradeoff है। यदि आपका host और container runtime Chromium sandboxing support करते हैं, तो सेट करें:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Chromium sandbox के बिना run करते समय Docker या कोई अन्य process isolation boundary उपयोग करें और broad host directories mount करने से बचें।

## Artifacts और secrets

Screenshots, snapshots, downloads, network logs, console logs और traces में credentials या private page content हो सकते हैं। केवल आवश्यक artifact directory mount करें, उपयोग के बाद साफ करें और artifact bundles सार्वजनिक रूप से share न करें।

यदि आपका MCP client browser sessions में credentials inject करता है, तो target site तक scoped short-lived credentials prefer करें। Long-lived tokens को screenshots, network responses या persistent browser profiles में न रखें।

## Docker

जब isolation और reproducible browser dependencies चाहिए हों, Docker recommended है। केवल आवश्यक artifact directory mount करें और `--init` उपयोग करें ताकि browser child processes सही तरह cleanup हों।

Docker से Streamable HTTP publish करते समय `-p 127.0.0.1:3000:3000` prefer करें। Public interface पर direct publish करने से कोई भी reachable client browser automation capability पा सकता है, जब तक आप authentication और network controls न जोड़ें।

Docker इमेज CI में और release publishing से पहले Trivy से scan होती है। Scanner high और critical OS/library vulnerabilities check करता है और enabled होने पर SARIF results GitHub code scanning में upload करता है।

## Supply chain checks

Repository free GitHub-native और open source checks उपयोग करती है:

- JavaScript और TypeScript static analysis के लिए CodeQL.
- Pull request dependency changes के लिए Dependency Review.
- Runtime npm dependencies के लिए `npm audit --omit=dev --audit-level=high`.
- Repository supply-chain signals के लिए OpenSSF Scorecard.
- GitHub Actions security linting के लिए zizmor.
- Docker इमेज vulnerability scanning के लिए Trivy.

ये checks browser automation behavior या release changes की manual review को replace नहीं करते।

## Reporting

Vulnerabilities [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md) के माध्यम से report करें।
