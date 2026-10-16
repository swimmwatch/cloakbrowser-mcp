---
title: "Mit Codex CLI verbinden"
description: Registrieren Sie CloakBrowser MCP in Codex CLI über stdio oder Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Mit Codex CLI verbinden

Nutzen Sie stdio, wenn Codex CloakBrowser MCP auf dieser Maschine starten soll.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Starten Sie den Server:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Registrieren Sie den bereits laufenden Endpunkt:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Prüfen

Bitten Sie Codex, die MCP-Tools des Servers `cloakbrowser` aufzulisten oder ein Browser-Navigationstool zu verwenden. Die Upstream-Playwright-MCP-Browsertools sollten zusammen mit `cloakbrowser_binary_info` und `cloakbrowser_bridge_info` erscheinen.

## Verwandt

- [Erste Schritte](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP hinter Reverse Proxy](docker-streamable-http-reverse-proxy.md)
- [Werkzeuge](../tools.md)
