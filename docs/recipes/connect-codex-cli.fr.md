---
title: "Connecter à Codex CLI"
description: Enregistrez CloakBrowser MCP dans Codex CLI via stdio ou Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Connecter à Codex CLI

Utilisez stdio lorsque Codex doit démarrer CloakBrowser MCP sur cette machine.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Vérifier

Ask Codex to list the cloakbrowser MCP tools or run a browser navigation tool.

## Liens associés

- [Getting Started](../getting-started.md)
- [Docker Streamable HTTP derrière un proxy inverse](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
