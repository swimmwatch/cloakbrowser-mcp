---
title: "@playwright/mcp बनाम cloakbrowser-mcp"
description: Playwright MCP upstream और CloakBrowser MCP की तुलना tool parity, CloakBrowser चलाने, packaging, Streamable HTTP, profiles, extensions, regional QA और मानवीय input पर करें।
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp बनाम cloakbrowser-mcp

Upstream @playwright/mcp Playwright MCP browser tools का canonical server है। cloakbrowser-mcp उस tool surface को बदले बिना CloakBrowser Chromium और packaged deployment paths के साथ चलाता है।

## फ़ीचर

| फ़ीचर | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## upstream चुनें जब

- आपको सबसे छोटा Playwright MCP setup चाहिए;
- आपको CloakBrowser Chromium की ज़रूरत नहीं है;
- आप Playwright MCP upstream packaging को सीधे follow करना चाहते हैं।

## CloakBrowser MCP चुनें जब

- Playwright MCP tools को CloakBrowser Chromium के साथ चलना है;
- आपको npm, Docker या Streamable HTTP deployment paths चाहिए;
- आपको persistent profiles, extensions, context validation, regional QA या humanized input चाहिए।

## अगले कदम

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
