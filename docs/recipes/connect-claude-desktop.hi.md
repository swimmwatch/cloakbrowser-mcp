---
title: "Claude Desktop से कनेक्ट करें"
description: stdio mcpServers configuration से CloakBrowser MCP को Claude Desktop में जोड़ें।
icon: material/chat
tags:
  - User Guide
---

# Claude Desktop से कनेक्ट करें

जब Claude Desktop server को on demand start करे, stdio का उपयोग करें।

## Server जोड़ें

यह प्रविष्टि `claude_desktop_config.json` में जोड़ें, फिर Claude Desktop दोबारा शुरू करें:

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"]
    }
  }
}
```

## Optional persistent profile

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "npx",
      "args": ["-y", "cloakbrowser-mcp@latest"],
      "env": {
        "PLAYWRIGHT_MCP_USER_DATA_DIR": "/absolute/path/to/profile"
      }
    }
  }
}
```

## सत्यापन

Claude Desktop से `cloakbrowser` सर्वर द्वारा पेज खोलने और ब्राउज़र स्नैपशॉट लेने को कहें। मूल Playwright MCP ब्राउज़र टूल बिना बदलाव उपलब्ध होने चाहिए।

## संबंधित

- [आरंभ करना](../getting-started.md#mcp-client-config)
- [स्थायी लॉगिन प्रोफ़ाइल](persistent-login-profile.md)
- [टूल](../tools.md)
