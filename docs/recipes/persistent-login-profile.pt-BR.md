---
title: "Perfil de login persistente"
description: Reutilize cookies, local storage, cache e estado de extensões do CloakBrowser com um diretório de perfil persistente.
icon: material/account-key
tags:
  - User Guide
---

# Perfil de login persistente

Um perfil persistente mantém o estado de login entre sessões do navegador.

## npm

```bash
mkdir -p .profiles/default

PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  npx -y cloakbrowser-mcp@latest
```

Configure o cliente MCP com o mesmo comando. Não compartilhe um diretório de perfil entre servidores ativos.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use caminhos do contêiner nas variáveis de ambiente; o caminho do host aparece apenas no volume mount.

## Verificar

1. Sign in once.
2. Restart with the same PLAYWRIGHT_MCP_USER_DATA_DIR.
3. Confirm the session remains active.

## Relacionado

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Carregar extensão do Chrome](load-chrome-extension.md)
