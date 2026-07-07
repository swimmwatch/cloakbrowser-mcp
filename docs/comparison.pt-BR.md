---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compare o Playwright MCP upstream com o CloakBrowser MCP em paridade de ferramentas, execução do CloakBrowser, empacotamento, Streamable HTTP, perfis, extensões, QA regional e entrada humanizada.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

O upstream @playwright/mcp é o servidor canônico das ferramentas de navegador do Playwright MCP. cloakbrowser-mcp mantém essa superfície sem alterações, mas a executa com CloakBrowser Chromium e fluxos de implantação empacotados.

## Recurso

| Recurso | @playwright/mcp | cloakbrowser-mcp |
| --- | --- | --- |
| Upstream tools | Canonical browser tool surface. | Forwarded unchanged with parity checks. |
| CloakBrowser Chromium | Uses upstream selected browser runtime. | Runs upstream tools with CloakBrowser Chromium. |
| npm / Docker | Use upstream package and image. | Adds package and image paths for CloakBrowser deployment. |
| Streamable HTTP | Follows upstream transport behavior. | Adds packaged health, readiness, auth, HTTPS, and session metadata options. |
| Profiles / extensions | Use upstream browser state options. | Adds validated persistent profiles and extension paths. |
| Regional QA / humanized input | Standard Playwright MCP behavior. | Adds GeoIP helpers and optional humanized interactions. |

## Escolha upstream quando

- você quer a instalação mais simples de Playwright MCP;
- não precisa do CloakBrowser Chromium;
- prefere seguir diretamente o empacotamento upstream do Playwright MCP.

## Escolha CloakBrowser MCP quando

- as ferramentas do Playwright MCP devem rodar com CloakBrowser Chromium;
- você quer caminhos documentados para npm, Docker ou Streamable HTTP;
- precisa de perfis persistentes, extensões, validação de contexto, QA regional ou entrada humanizada.

## Próximos passos

- [Getting Started](getting-started.md)
- [Recipes](recipes/index.md)
- [Tools](tools.md)
