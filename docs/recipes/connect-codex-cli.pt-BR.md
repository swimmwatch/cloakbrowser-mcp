---
title: "Conectar ao Codex CLI"
description: Registre o CloakBrowser MCP no Codex CLI via stdio ou Streamable HTTP.
icon: material/console
tags:
  - User Guide
---

# Conectar ao Codex CLI

Use stdio quando o Codex deve iniciar o CloakBrowser MCP nesta máquina.

## Stdio

```bash
codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
```

## Streamable HTTP

Inicie o servidor:

```bash
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
```

Registre o endpoint que já está em execução:

```bash
codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
```

## Verificar

Peça ao Codex para listar as ferramentas MCP do servidor `cloakbrowser` ou usar uma ferramenta de navegação. As ferramentas originais do Playwright MCP devem aparecer junto com `cloakbrowser_binary_info` e `cloakbrowser_bridge_info`.

## Relacionado

- [Introdução](../getting-started.md#mcp-client-config)
- [Docker Streamable HTTP atrás de proxy reverso](docker-streamable-http-reverse-proxy.md)
- [Ferramentas](../tools.md)
