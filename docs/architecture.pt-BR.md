---
description: Arquitetura de ponte para o CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Arquitetura

## Tempo de execução

`cloakbrowser-mcp` é um servidor MCP externo capaz de expor stdio ou Streamable HTTP. Ao iniciar, ele:

1. resolve ou instala o binário do CloakBrowser Chromium;
2. cria um arquivo de configuração temporário do Playwright MCP;
3. inicia o processo upstream `@playwright/mcp` como um processo filho via stdio;
4. se conecta a esse processo filho usando o transporte do cliente do MCP SDK;
5. expõe um servidor MCP externo ao cliente MCP do usuário por meio do transporte selecionado;
6. encaminha a lista de ferramentas e as chamadas de ferramentas do upstream sem alterações;
7. acrescenta `cloakbrowser_binary_info` e `cloakbrowser_bridge_info`.

## Por que esse design?

O projeto Playwright MCP, que está na fase inicial, já possui os contratos das ferramentas de navegador e evolui rapidamente. O modelo de ponte mantém esse projeto enxuto e evita a duplicação da lógica de automação do navegador.

## Docker

A imagem do Docker utiliza a imagem oficial fixada do Playwright MCP como imagem base. A ponte está instalada em `/opt/cloakbrowser-mcp`, enquanto o Playwright MCP upstream continua disponível em `/app/cli.js`.

## Configuração

A ponte cria um arquivo de configuração JSON temporário com as opções de inicialização do CloakBrowser. As variáveis de ambiente `PLAYWRIGHT_MCP_*` do upstream continuam sendo encaminhadas para o Playwright MCP do upstream.

## Transporte

O transporte padrão é o stdio. O HTTP streamable é habilitado explicitamente com `--transport streamable-http` ou `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

No stdio, cada servidor externo é responsável por um processo filho do Playwright MCP upstream e mantém o comportamento padrão do perfil do Playwright MCP upstream. Para o Streamable HTTP, cada sessão do MCP possui seu próprio servidor externo, processo filho upstream, configuração gerada e estado de transporte na memória. As sessões HTTP iniciam o MCP do Playwright upstream com perfis de navegador isolados, de modo que usuários simultâneos não compartilhem nem disputem o mesmo perfil persistente do Chromium.

O backend de sessão armazena apenas metadados. O backend integrado é `memory`; futuros adaptadores Redis, Postgres ou SQLite poderão coordenar metadados e bloqueios, mas não poderão restaurar um processo de navegador ativo a montante após o encerramento do processo do servidor ao qual ele pertence. O escalonamento horizontal deve usar sessões persistentes indexadas por `mcp-session-id`.

A ponte utiliza o MCP SDK `StreamableHTTPServerTransport` para Streamable HTTP. Ela não expõe o endpoint obsoleto do MCP `SSEServerTransport`, que está obsoleto, nem um endpoint legado `/sse`.
