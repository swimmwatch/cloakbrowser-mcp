---
description: CloakBrowser MCP द्वारा उपलब्ध कराई गई tool surface.
icon: material/tools
tags:
  - टूल
  - उपयोगकर्ता गाइड
---

# टूल

`cloakbrowser-mcp` upstream Playwright MCP tools को बिना बदले expose करता है। Tool names, descriptions, schemas, annotations और responses `@playwright/mcp` से आते हैं।

## Upstream tools

Default upstream browser tool surface को pinned Playwright MCP dependency से मेल खाना चाहिए। इसमें navigation, snapshot, click, typing, screenshots, tabs, console messages, network inspection, file upload, dialogs और unsafe evaluation tools जैसे core browser tools शामिल हैं।

स्थिर upstream reference के लिए exact package commit पर pinned Playwright MCP `{{ project.playwright_mcp_package_tag }}` capability test देखें: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/36ec986b8b1fc6b4d11f2b6971147755e1b0bc84/tests/capabilities.spec.ts#L19-L77)।

यह project upstream Playwright MCP को authoritative मानता है और copied schema reference maintain नहीं करता।

## स्थानीय tools

### `cloakbrowser_binary_info`

CloakBrowser package, current platform, cache directory, expected binary path, install status और bridge द्वारा उपयोग किए गए resolved executable path की structured जानकारी लौटाता है।

### `cloakbrowser_bridge_info`

Structured bridge metadata लौटाता है:

- MCP server name और version;
- runtime mode;
- upstream Playwright MCP package और version;
- upstream tool count;
- local Cloak-specific tool names.

## Parity

CI Docker इमेज build करता है और `npm run bridge:compare` चलाता है। यह script official Playwright MCP image और CloakBrowser bridge image को parallel शुरू करता है, upstream tool list की तुलना करता है और same fixture page पर default upstream browser tools चलाता है।

Machine-readable JSON parity report लिखने के लिए `--report` उपयोग करें:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI इस report को Docker builds और release builds के लिए artifact के रूप में upload करता है।
