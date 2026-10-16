---
title: "रेसिपी"
description: Profiles, extensions, Streamable HTTP, regional QA, MCP clients और CI smoke tests के लिए छोटे CloakBrowser MCP recipes।
icon: material/book-open-variant
tags:
  - User Guide
---

# रेसिपी

जब आपको पता हो कि CloakBrowser MCP से कौन सा काम करवाना है, तो इन संक्षिप्त गाइड का उपयोग करें। विकल्पों की जानकारी के लिए [विन्यास](../configuration.md), [डॉकर](../docker.md) और जनरेट की गई [CLI संदर्भ गाइड](../generated/cli.md) साथ रखें।

## Browser state और extensions

- [स्थायी लॉगिन प्रोफ़ाइल](persistent-login-profile.md)
- [Chrome एक्सटेंशन लोड करें](load-chrome-extension.md)

## Deployment

- [रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [प्रॉक्सी के माध्यम से क्षेत्रीय QA](regional-qa-through-proxy.md)
- [CI स्मोक टेस्ट](ci-smoke-test.md)

## MCP clients

- [Claude Desktop से कनेक्ट करें](connect-claude-desktop.md)
- [Codex CLI से कनेक्ट करें](connect-codex-cli.md)

यदि आप अभी तय कर रहे हैं कि यह पैकेज आपके लिए उपयुक्त है या नहीं, तो [`@playwright/mcp` और `cloakbrowser-mcp` की तुलना](../comparison.md) से शुरू करें।