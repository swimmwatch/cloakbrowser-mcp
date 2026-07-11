---
description: Playwright MCP drop-in compatible browser automation server, unchanged upstream tools, CloakBrowser Chromium और npm, Docker, Streamable HTTP packaging के साथ।
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">शुरू करें</a>
  <a class="md-button" href="comparison/">तुलना</a>
  <a class="md-button" href="recipes/">रेसिपी</a>
</p>

# क्लोकब्राउज़र एमसीपी सर्वर

`cloakbrowser-mcp` Playwright MCP drop-in compatible browser automation server है, जिसमें upstream tools unchanged रहते हैं, CloakBrowser Chromium चलता है, और npm, Docker तथा Streamable HTTP packaging मिलती है। यह upstream `@playwright/mcp` को canonical browser tool surface की तरह चलाता है और उसके आसपास deployment-oriented CloakBrowser चलाने वाली सुविधाएँ जोड़ता है।

## 30-सेकंड का डेमो

<div class="clb-demo-video">
<video controls preload="metadata" poster="assets/videos/30-second-demo-poster.png" aria-label="CloakBrowser MCP का 30-सेकंड डेमो">
<source src="assets/videos/30-second-demo.mp4" type="video/mp4">
</video>
</div>

<p class="clb-demo-caption">पहला रन देखें: npm पैकेज शुरू करें, MCP क्लाइंट कनेक्ट करें, वेब रिसर्च, ऑटोमेशन या टेस्टिंग के लिए कहें, और वास्तविक ब्राउज़र परिणाम देखें।</p>

इसे तब उपयोग करें जब आपको Playwright MCP-compatible browser tools के साथ persistent profiles, extension loading, context validation, regional QA के लिए GeoIP proxy मिलान या मानवीय input चाहिए।

वर्तमान संस्करण: {{ project.version_tag }}.

## संस्करण अनुकूलता

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.8.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.7.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | CI में तुलना की गई |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI में तुलना की गई |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI में तुलना की गई |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | CI में तुलना की गई |

<!-- compatibility-table:end -->

इस प्रोजेक्ट की SemVer रिलीज़ों और अपस्ट्रीम Playwright MCP वर्ज़नों के बीच बनाए गए मैपिंग के लिए [संस्करण अनुकूलता](version-compatibility.md) देखें।

## यह क्या है

<div class="grid cards" markdown>

- :material-connection: **ब्रिज रनटाइम**

  upstream Playwright MCP को child process के रूप में शुरू करता है और browser tool calls को बिना बदले आगे भेजता है।

- :material-incognito: **CloakBrowser निष्पादन**

  `launchOptions.executablePath` को CloakBrowser पर सेट करके Playwright MCP configuration बनाता है।

- :fontawesome-brands-node-js: **npm CLI**

  stdio और Streamable HTTP MCP clients के लिए हल्के Node.js CLI package के रूप में प्रकाशित है।

- :fontawesome-brands-docker: **Docker इमेज**

  आधिकारिक Playwright MCP image पर आधारित है और CloakBrowser binary cache को पहले से load करता है।

- :material-map-marker-radius: **GeoIP प्रॉक्सी मिलान**

  CloakBrowser के timezone, language और locale fingerprint flags को configured proxy location से मिलाता है।

- :material-gesture-tap: **मानवीय इनपुट व्यवहार**

  Page interactions को CloakBrowser की human-like mouse, keyboard और scroll layer से गुजारता है।

</div>

## टूल सतह

अपस्ट्रीम Playwright MCP टूल कॉन्ट्रैक्ट्स प्रामाणिक हैं। यह प्रोजेक्ट केवल दो स्थानीय अंतर्दृष्टि टूल्स जोड़ता है:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

अगले कदम

- npm, Docker, और MCP क्लाइंट कॉन्फ़िगरेशन के लिए [शुरुआत करना](getting-started.md).
- समर्थित पर्यावरण चर के लिए [कॉन्फ़िगरेशन](configuration.md).
- [GeoIP प्रॉक्सी मिलान](geoip-proxy-matching.md) क्षेत्रीय QA, रनटाइम प्रॉक्सी मेटाडेटा, और बहु-स्थान स्ट्रीम करने योग्य HTTP सत्रों के लिए।
- [मानवीकृत इनपुट व्यवहार](humanized-input-behavior.md) इंटरैक्शन यथार्थवाद, सेटअप, और उपयोग के मामलों के लिए।
- [टूल्स](tools.md) टूल-सर्फेस अपेक्षाओं और अपस्ट्रीम समता के लिए।
- [FAQ](faq.md) सामान्य इंस्टॉलेशन, डॉकर, पेरिटी और सुरक्षा प्रश्नों के लिए।
- [योगदानकर्ता गाइड](contributor-guide.md) विकास, परीक्षण, वास्तुकला, और रिलीज़ विवरण के लिए।

## अतिरिक्त व्यावहारिक रास्ते

upstream Playwright MCP और इस package में चुनने के लिए [तुलना](comparison.md) देखें। तेज tasks के लिए [रेसिपी](recipes/index.md) उपयोग करें: persistent profile, extensions, reverse proxy, regional QA, Claude Desktop, Codex CLI और CI smoke test.
