---
title: "@playwright/mcp vs cloakbrowser-mcp"
description: Compare o Playwright MCP upstream com o CloakBrowser MCP em paridade de ferramentas, execução do CloakBrowser, empacotamento, Streamable HTTP, perfis, extensões, QA regional e entrada humanizada.
icon: material/compare
tags:
  - User Guide
---

# @playwright/mcp vs cloakbrowser-mcp

O pacote original `@playwright/mcp` é o servidor de referência das ferramentas de navegador do Playwright MCP. `cloakbrowser-mcp` atende equipes que precisam dessas mesmas ferramentas com Chromium do CloakBrowser e formas de implantação empacotadas.

## Comparação de recursos

| Recurso | `@playwright/mcp` | `cloakbrowser-mcp` |
| --- | --- | --- |
| Ferramentas originais sem alterações | Define os esquemas, descrições e respostas originais das ferramentas de navegador. | Encaminha as ferramentas originais sem alterações e verifica a equivalência no CI. |
| Binário CloakBrowser | Usa o navegador selecionado pelo Playwright MCP original. | Gera a configuração upstream com Chromium do CloakBrowser como executável. |
| Distribuição npm | É publicado como pacote original do Playwright MCP. | É publicado como `cloakbrowser-mcp` para `npx` e configurações stdio de clientes MCP. |
| Imagem Docker | Fornece a imagem oficial do Playwright MCP. | É baseado na imagem oficial do Playwright MCP e prepara os padrões do ambiente CloakBrowser. |
| Streamable HTTP | Segue o comportamento de transporte do projeto original. | Inclui stdio e Streamable HTTP com verificações de saúde e prontidão, autenticação, HTTPS e metadados de sessão. |
| Perfis persistentes | Usa opções de estado do navegador suportadas pelo upstream. | Valida `PLAYWRIGHT_MCP_USER_DATA_DIR` e bloqueia o perfil ao gerar a configuração. |
| Caminhos de extensões | São configurados pelo navegador quando há suporte. | Carrega diretórios validados de extensões Chrome e exige perfil persistente. |
| Validação do contexto | Depende da estrutura da configuração upstream. | Valida opções de contexto suportadas antes de escrever a configuração do Playwright MCP. |
| QA regional com GeoIP | O roteamento por proxy continua sob responsabilidade do upstream. | Pode alinhar os sinais de fuso horário, idioma e localidade do CloakBrowser à localização do proxy configurado. |
| Interações humanizadas | Usa o comportamento padrão de interação do Playwright MCP. | Pode encaminhar interações suportadas para a entrada humanizada do CloakBrowser. |

## Quando escolher o Playwright MCP original

- você quer a instalação mais simples de Playwright MCP;
- não precisa do CloakBrowser Chromium;
- prefere seguir diretamente o empacotamento upstream do Playwright MCP.

## Quando escolher o CloakBrowser MCP

- as ferramentas do Playwright MCP devem rodar com CloakBrowser Chromium;
- você quer caminhos documentados para npm, Docker ou Streamable HTTP;
- precisa de perfis persistentes, extensões, validação de contexto, QA regional ou entrada humanizada.

## Próximos passos

- [Introdução](getting-started.md)
- [Receitas](recipes/index.md)
- [Ferramentas](tools.md)
