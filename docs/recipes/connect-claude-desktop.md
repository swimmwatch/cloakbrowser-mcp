---
title: Connect To Claude Desktop
description: Add CloakBrowser MCP to Claude Desktop with a stdio mcpServers configuration.
icon: material/chat
tags:
  - User Guide
---

# Connect To Claude Desktop

Use stdio when Claude Desktop should start the server on demand.

## Add The Server

Add this entry to `claude_desktop_config.json`, then restart Claude Desktop:

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

## Optional Persistent Profile

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

## Verify

Ask Claude Desktop to use the `cloakbrowser` server to open a page and take a browser snapshot. The upstream Playwright MCP browser tools should be available unchanged.

## Related

- [Getting Started](../getting-started.md#mcp-client-config)
- [Persistent Login Profile](persistent-login-profile.md)
- [Tools](../tools.md)
