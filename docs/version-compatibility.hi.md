---
description: cloakbrowser-mcp releases और upstream Playwright MCP versions के बीच compatibility mapping.
icon: material/source-branch-sync
tags:
  - उपयोगकर्ता गाइड
---

# Version compatibility

`cloakbrowser-mcp` अपने releases के लिए Semantic Versioning का पालन करता है। Browser tool contracts `@playwright/mcp` से आते हैं, इसलिए हर release उस Playwright MCP version को रिकॉर्ड करता है जिसके साथ उसे build और test किया गया है।

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp dependency | Playwright MCP Docker base                 | CloakBrowser dependency | Node.js   | Transport              | Tested platforms                                                                                | Tool parity                    |
| ---------------- | -------------------------- | ------------------------------------------ | ----------------------- | --------- | ---------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------ |
| `1.13.0` | `^0.0.80` | `mcr.microsoft.com/playwright/mcp:v0.0.80` | `^0.5.10` | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.12.0`          | `^0.0.79`                  | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.7`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.11.0`          | `^0.0.79`                  | `mcr.microsoft.com/playwright/mcp:v0.0.79` | `^0.5.6`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.10.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.9.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.8.0`          | `^0.0.78`                  | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`              | `^22.13.0 || >=24.0.0` | stdio, Streamable HTTP | Node.js 22 और 24-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.7.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.6.1`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.6.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.5.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.4.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream tools CI में तुलना किए गए। |
| `1.3.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`               | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.7`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.6`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.5`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.3`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.2.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.1.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.0.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.0.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |
| `1.0.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream tools CI में तुलना किए गए। |

<!-- compatibility-table:end -->

## इस table को कैसे पढ़ें

- `cloakbrowser-mcp` इस project का npm और Docker release version है।
- `@playwright/mcp` CLI package द्वारा उपयोग किया गया npm dependency range है।
- Playwright MCP Docker base वह upstream image है जिसका उपयोग project की Docker इमेज करती है।
- CloakBrowser dependency वह npm range है जिससे CloakBrowser Chromium binary resolve और install होती है।
- `Node.js` npm package के लिए supported runtime range है।
- Transport वह MCP transport है जिसे यह bridge expose करता है।
- Tested platforms वे platforms हैं जिन्हें CI और release smoke tests cover करते हैं।
- Tool parity बताता है कि default upstream Playwright MCP tool surface को official runtime से compare किया गया है या नहीं।

जब reproducibility महत्वपूर्ण हो, तो `latest` के बजाय `cloakbrowser-mcp` को exact version से pin करें।

Docker releases अभी `linux/amd64` और `linux/arm64` publish करते हैं। Browser parity `linux/amd64` पर compare होती है; multi-platform manifest publish होने से पहले दोनों Docker platforms release smoke tests पाते हैं।
