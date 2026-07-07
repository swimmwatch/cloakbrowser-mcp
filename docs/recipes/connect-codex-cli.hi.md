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

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## सत्यापन

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## संबंधित

- [Getting Started](../getting-started.md)
- [रिवर्स प्रॉक्सी के पीछे Docker Streamable HTTP](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
