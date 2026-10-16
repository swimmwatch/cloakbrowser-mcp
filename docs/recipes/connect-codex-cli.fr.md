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

Démarrez le serveur :

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Enregistrez le point de terminaison déjà en cours d’exécution :

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Vérifier

Demandez à Codex de lister les outils MCP du serveur `cloakbrowser` ou d’utiliser un outil de navigation. Les outils navigateur Playwright MCP upstream doivent apparaître avec `cloakbrowser_binary_info` et `cloakbrowser_bridge_info`.

## Liens associés

- [Pour commencer](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP derrière un proxy inverse](docker-streamable-http-reverse-proxy.md)
- [Outils](../tools.md)
