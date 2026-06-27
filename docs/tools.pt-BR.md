---
description: Superfície de ferramentas exposta pelo CloakBrowser MCP.
icon: material/tools
tags:
  - Ferramentas
  - Guia do usuário
---

# Ferramentas

`cloakbrowser-mcp` expõe as ferramentas upstream do Playwright MCP sem alterações. Nomes, descrições, esquemas, anotações e respostas das ferramentas vêm de `@playwright/mcp`.

## Ferramentas upstream

Espera-se que a superfície padrão de ferramentas de navegador upstream corresponda à dependência fixada do Playwright MCP. Ela inclui ferramentas principais como navegação, snapshots, cliques, digitação, screenshots, abas, mensagens de console, inspeção de rede, upload de arquivos, diálogos e ferramentas de avaliação insegura.

Como referência upstream estável, veja o teste de capacidades do Playwright MCP `@playwright/mcp@0.0.76` fixado no commit exato do pacote: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/b301c372ec741289eff1cf6aab9d3bec553f31e2/tests/capabilities.spec.ts#L19-L77).

Este projeto trata o upstream Playwright MCP como fonte autorizada e não mantém uma referência de esquemas copiada.

## Ferramentas locais

### `cloakbrowser_binary_info`

Retorna informações estruturadas sobre o pacote CloakBrowser, a plataforma atual, o diretório de cache, o caminho esperado do binário, o status de instalação e o resolved executable path usado pela ponte.

### `cloakbrowser_bridge_info`

Retorna metadados estruturados da ponte:

- nome e versão do servidor MCP;
- modo de runtime;
- pacote e versão do upstream Playwright MCP;
- contagem de ferramentas upstream;
- nomes das ferramentas locais específicas do Cloak.

## Paridade

O CI constrói a imagem Docker e executa `npm run bridge:compare`. Esse script inicia em paralelo a imagem oficial do Playwright MCP e a imagem da ponte CloakBrowser, compara a lista de ferramentas upstream e exercita as ferramentas de navegador upstream padrão contra a mesma página fixture.

Use `--report` para gravar um relatório JSON legível por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

O CI envia esse relatório como artefato para builds Docker e builds de release.
