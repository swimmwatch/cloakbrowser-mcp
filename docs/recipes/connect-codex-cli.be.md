---
title: Падключыцца да Codex CLI
description: Рэгістрацыя CloakBrowser MCP з Codex CLI па stdio або Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Падключыцца да Codex CLI

Выкарыстоўвайце stdio, калі Кодэкс павінен запусціць CloakBrowser MCP для бягучай машыны.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Запусціць сервер:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Зарэгістраваць ужо запушчаную канчатковую кропку:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Праверыць

Папытаеце Кодэкс пералічыць інструменты MCP для `cloakbrowser` або выкарыстоўваць інструмент навігацыі браўзэра. Верхнія інструменты браўзэра Playwright MCP павінны з 'яўляцца разам з `cloakbrowser_binary_info` і `cloakbrowser_bridge_info`.

## ЗВЯЗАНАЕ

- [Getting Started](../getting-started.md)
- [Docker Streamable HTTP Behind Reverse Proxy](docker-streamable-http-reverse-proxy.md)
- [Tools](../tools.md)
