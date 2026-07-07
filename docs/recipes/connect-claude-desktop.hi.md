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

Ask Claude Desktop to open a page with the cloakbrowser server and take a browser snapshot.

## संबंधित

- [Getting Started](../getting-started.md)
- [स्थायी लॉगिन प्रोफ़ाइल](persistent-login-profile.md)
- [Tools](../tools.md)
