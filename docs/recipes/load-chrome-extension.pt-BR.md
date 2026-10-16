---
title: "Carregar extensão do Chrome"
description: Carregue uma extensão do Chrome descompactada no CloakBrowser MCP com um perfil persistente.
icon: material/puzzle
tags:
  - User Guide
---

# Carregar extensão do Chrome

Extensões do Chrome exigem um diretório descompactado e um perfil persistente.

Esta receita usa o carregamento de extensão descompactada do CloakBrowser. O modo de conexão pela extensão oficial Playwright Extension instalada separadamente usa `PLAYWRIGHT_MCP_EXTENSION=true`, um `PLAYWRIGHT_MCP_EXTENSION_TOKEN` de process-level e um persistent profile dedicado. Não combine os dois mecanismos.

## npm

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Use um array JSON para vários paths, vírgulas ou Windows drive-letter paths.

## Docker

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Reinicie o servidor depois de alterar arquivos ou caminhos da extensão.

## Verificar

Peça ao cliente MCP para abrir uma página onde a extensão deve estar ativa e verifique seu comportamento ou faça uma captura de tela. Também é possível chamar `cloakbrowser_bridge_info` para confirmar a versão esperada do pacote da ponte.

## Relacionado

- [Configuração](../configuration.md#chrome-extensions)
- [Docker](../docker.md#chrome-extensions)
- [Perfil de login persistente](persistent-login-profile.md)
