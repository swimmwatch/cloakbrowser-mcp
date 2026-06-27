---
description: Perguntas frequentes sobre a instalação do CloakBrowser MCP, o uso do Docker, a compatibilidade com o Playwright MCP e a segurança.
icon: material/help-circle
tags:
  - User Guide
---

# Perguntas frequentes

## O que é o CloakBrowser MCP?

O CloakBrowser MCP é um servidor [Model Context Protocol](https://modelcontextprotocol.io/) para automação de navegadores via stdio ou Streamable HTTP. Ele é executado a montante do [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) e direciona a configuração de inicialização do navegador do Playwright MCP para o binário do [CloakBrowser](https://github.com/CloakHQ/CloakBrowser) baseado no Chromium.

## Em que ponto ele difere do Playwright MCP original?

O servidor MCP do Playwright, localizado a montante, é responsável pelos esquemas, descrições e respostas das ferramentas do navegador. O MCP do CloakBrowser mantém essas ferramentas inalteradas e adiciona apenas duas ferramentas de introspecção locais: `cloakbrowser_binary_info` e `cloakbrowser_bridge_info`.

## Devo instalá-lo pelo npm ou pelo Docker?

Use o npm quando o cliente MCP já estiver em execução na sua máquina e o Node.js 22.12 ou uma versão mais recente estiver disponível. Use o Docker quando desejar uma imagem repetível do Playwright baseada no MCP, com o cache do CloakBrowser já configurado dentro do contêiner.

## Quais clientes do MCP podem utilizá-lo?

Qualquer cliente MCP compatível com servidores stdio ou Streamable HTTP pode usar o CloakBrowser MCP. O guia [Introdução](getting-started.md) inclui exemplos de JSON stdio para o Codex, Claude Desktop, Claude Code, Cursor, clientes no estilo VS Code/Cline, Continue, Windsurf, Goose e configurações no estilo Warp.

## Ele oferece suporte às mesmas ferramentas de navegador que o Playwright MCP?

Sim. As ferramentas do navegador do Playwright MCP são encaminhadas sem alterações. O projeto também executa uma comparação de paridade na integração contínua (CI), para que as alterações na ponte possam ser verificadas em relação ao comportamento oficial do Playwright MCP.

## O Docker melhora a segurança?

O Docker oferece um ambiente de execução mais repetível e isolado, mas não torna a automação do navegador isenta de riscos. Trate a navegação automatizada como uma execução não confiável: evite compartilhar informações confidenciais com páginas desconhecidas, mantenha artefatos e capturas de tela em diretórios controlados e consulte o guia de [Segurança](security.md) antes de expor o servidor a outros sistemas.

## Este projeto utiliza ferramentas de análise ou rastreamento?

Não. O site de documentação não habilita análises por padrão. A indexação pelos mecanismos de busca é feita por meio de metadados padrão, `robots.txt`, geração de mapa do site, tags opcionais de verificação para webmasters e notificações opcionais do IndexNow.
