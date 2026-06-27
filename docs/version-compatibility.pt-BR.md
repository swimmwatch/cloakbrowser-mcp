---
description: Mapeamento de compatibilidade entre releases do cloakbrowser-mcp e versões upstream do Playwright MCP.
icon: material/source-branch-sync
tags:
  - Guia do usuário
---

# Compatibilidade de versões

`cloakbrowser-mcp` segue Semantic Versioning para seus próprios releases. Os contratos de ferramentas de navegador vêm de `@playwright/mcp`, então cada release registra a versão do Playwright MCP usada para build e testes.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Dependência @playwright/mcp | Base Docker do Playwright MCP              | Dependência CloakBrowser | Node.js   | Transporte             | Plataformas testadas                                                                           | Paridade de ferramentas                   |
| ---------------- | --------------------------- | ------------------------------------------ | ------------------------ | --------- | ---------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `1.5.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Ferramentas upstream comparadas no CI. |
| `1.4.0`          | `^0.0.76`                   | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`                | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Ferramentas upstream comparadas no CI. |
| `1.3.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`                | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.7`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.6`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.5`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.3`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.2.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.1.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.0.2`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.0.1`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |
| `1.0.0`          | `^0.0.75`                   | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`                | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                            | Ferramentas upstream comparadas no CI. |

<!-- compatibility-table:end -->

## Como ler esta tabela

- `cloakbrowser-mcp` é a versão de release npm e Docker deste projeto.
- `@playwright/mcp` é o intervalo de dependência npm usado pelo pacote CLI.
- A base Docker do Playwright MCP é a imagem upstream usada pela imagem Docker do projeto.
- A dependência CloakBrowser é o intervalo npm usado para resolver e instalar o binário Chromium do CloakBrowser.
- `Node.js` é o intervalo de runtime suportado pelo pacote npm.
- Transporte é o transporte MCP exposto pela ponte.
- Plataformas testadas são cobertas por CI e smoke tests de release.
- Paridade de ferramentas indica se a superfície upstream padrão do Playwright MCP é comparada com o runtime oficial.

Quando a reprodutibilidade for importante, fixe `cloakbrowser-mcp` por versão exata em vez de usar `latest`.

Releases Docker publicam atualmente `linux/amd64` e `linux/arm64`. A paridade do navegador é comparada em `linux/amd64`; ambas as plataformas Docker recebem smoke tests de release antes da publicação de um multi-platform manifest.
