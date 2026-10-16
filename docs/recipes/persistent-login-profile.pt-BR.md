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
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use caminhos do contêiner nas variáveis de ambiente; o caminho do host aparece apenas no volume mount.

## Verificar

1. Peça ao cliente MCP para abrir uma página de login e entre na conta.
2. Pare o servidor corretamente.
3. Inicie-o novamente com o mesmo `PLAYWRIGHT_MCP_USER_DATA_DIR`.
4. Peça ao cliente para revisitar o site e confirme que o estado de login foi preservado.

## Relacionado

- [Configuração](../configuration.md#streamable-http-runtime-metadata)
- [Docker](../docker.md#persistent-profiles)
- [Carregar extensão do Chrome](load-chrome-extension.md)

## CloakBrowser 0.6.0

Com o modo stealth do CloakBrowser ativado, um perfil persistente configurado explicitamente mantém sua semente de impressão digital em `.cloakbrowser-seed`. A primeira inicialização após a atualização atribui uma semente se o arquivo não existir. Um `--fingerprint` explícito, incluindo `--fingerprint=off`, tem prioridade e mantém o arquivo intacto. Com stealth desativado, o arquivo não muda. Arquivos corrompidos são regenerados com um aviso; erros de acesso interrompem a inicialização.
