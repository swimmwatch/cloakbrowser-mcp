---
title: "Carregar extensão do Chrome"
description: Carregue uma extensão do Chrome descompactada no CloakBrowser MCP com um perfil persistente.
icon: material/puzzle
tags:
  - User Guide
---

# Carregar extensão do Chrome

Extensões do Chrome exigem um diretório descompactado e um perfil persistente.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Use um array JSON para vários paths, vírgulas ou Windows drive-letter paths.

## Docker

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Reinicie o servidor depois de alterar arquivos ou caminhos da extensão.

## Verificar

Use the MCP client to open a page where the extension should be active, then inspect behavior or capture a screenshot.

## Relacionado

- [Configuration](../configuration.md)
- [Docker](../docker.md)
- [Perfil de login persistente](persistent-login-profile.md)
