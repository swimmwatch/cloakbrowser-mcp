---
title: "Codex CLI से कनेक्ट करें"
description: stdio या Streamable HTTP से CloakBrowser MCP को Codex CLI में register करें।
icon: material/console
tags:
  - User Guide
---

# Codex CLI से कनेक्ट करें

जब Codex इस machine पर CloakBrowser MCP start करे, stdio का उपयोग करें।

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

सर्वर शुरू करें:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

पहले से चल रहे एंडपॉइंट को पंजीकृत करें:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## सत्यापन

Codex से `cloakbrowser` सर्वर के MCP टूल की सूची मांगें या ब्राउज़र नेविगेशन टूल उपयोग करने को कहें। मूल Playwright MCP ब्राउज़र टूल `cloakbrowser_binary_info` और `cloakbrowser_bridge_info` के साथ दिखने चाहिए।

## संबंधित

- [आरंभ करना](../getting-started.md#mcp-client-config)
- [रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [टूल](../tools.md)
