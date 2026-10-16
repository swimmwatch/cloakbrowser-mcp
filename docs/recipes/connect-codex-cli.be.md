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

Папрасіце Codex паказаць інструменты MCP сервера `cloakbrowser` або выканаць браўзерную навігацыю. Зыходныя браўзерныя інструменты Playwright MCP павінны адлюстроўвацца разам з `cloakbrowser_binary_info` і `cloakbrowser_bridge_info`.

## ЗВЯЗАНАЕ

- [Пачатак працы](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP за зваротным праксі](docker-streamable-http-reverse-proxy.md)
- [Інструменты](../tools.md)
