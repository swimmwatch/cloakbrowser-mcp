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

## Propriedade Gerenciada CDP { #managed-cdp-ownership }

CDP gerenciado é uma superfície de controle opcional secundária para a mesma geração de navegador:

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

A sessão MCP possui o arrendamento da porta externa, proxy de capacidade, gerado a montante
configuração, filho substituível a montante e geração atual Chromium. Um CDP
o cliente nunca se conecta diretamente ao endpoint de loopback interno. O Bootstrap coloca um
desafio de página de navegador de uso único através de MCP e o consome através de CDP antes do
a capacidade externa é publicada. O pipe de depuração remota interna do Playwright permanece
ativo junto ao endpoint TCP gerenciado pela ponte.

O aluguel da porta externa é estável para a sessão MCP, enquanto o processo filho,
endpoint interno, número de geração e capacidade URL são substituíveis. Navegador
a perda invalida a capacidade atual e fecha seus sockets proxy, mas não
inicie uma criança em segundo plano. A primeira chamada posterior `browser_*` MCP aplica-se à
regra de reinício antes do avanço:

1. chamadas concorrentes do navegador compartilham uma reinicialização limitada;
2. a criança antiga se torna inacessível e é descartada;
3. uma criança substituta usa a mesma configuração de sessão e uma nova porta interna;
4. a propriedade e a prontidão externa são verificadas antes da publicação;
5. As chamadas de navegador em espera são encaminhadas exatamente uma vez para a substituição pronta.

Se a prontidão falhar, nenhuma chamada de navegador em espera chega a um filho upstream, nenhuma capacidade
é publicado, e uma chamada posterior do navegador pode iniciar uma nova tentativa limitada. Estado do navegador
como abas e armazenamento em memória não são restaurados após a substituição. Ferramentas locais,
listagem de ferramentas, leituras de descoberta e desconexões comuns CDP não acionam reinício.

A limpeza inverte a alcançabilidade: pare a admissão, invalide a capacidade, feche o proxy
soquetes, descarte o filho e o navegador a montante, feche o ouvinte externo, então
libere o aluguel da porta. Isso impede que um antigo URL se mova silenciosamente para um novo navegador.

Os comandos MCP e CDP podem ser executados simultaneamente. A ponte não adiciona cross-protocol
transações ou inferir qual chamador possui uma página; os chamadores devem coordenar destrutivos ou
operações conflitantes.

## Docker

A imagem do Docker utiliza a imagem oficial fixada do Playwright MCP como imagem base. A ponte está instalada em `/opt/cloakbrowser-mcp`, enquanto o Playwright MCP upstream continua disponível em `/app/cli.js`.

## Configuração

A ponte cria um arquivo de configuração JSON temporário com as opções de inicialização do CloakBrowser. As variáveis de ambiente `PLAYWRIGHT_MCP_*` do upstream continuam sendo encaminhadas para o Playwright MCP do upstream.

## Transporte

O transporte padrão é o stdio. O HTTP streamable é habilitado explicitamente com `--transport streamable-http` ou `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

No stdio, cada servidor externo é responsável por um processo filho do Playwright MCP upstream e mantém o comportamento padrão do perfil do Playwright MCP upstream. Para o Streamable HTTP, cada sessão do MCP possui seu próprio servidor externo, processo filho upstream, configuração gerada e estado de transporte na memória. As sessões HTTP iniciam o MCP do Playwright upstream com perfis de navegador isolados, de modo que usuários simultâneos não compartilhem nem disputem o mesmo perfil persistente do Chromium.

O backend de sessão armazena apenas metadados. O backend integrado é `memory`; futuros adaptadores Redis, Postgres ou SQLite poderão coordenar metadados e bloqueios, mas não poderão restaurar um processo de navegador ativo a montante após o encerramento do processo do servidor ao qual ele pertence. O escalonamento horizontal deve usar sessões persistentes indexadas por `mcp-session-id`.

A ponte utiliza o MCP SDK `StreamableHTTPServerTransport` para Streamable HTTP. Ela não expõe o endpoint obsoleto do MCP `SSEServerTransport`, que está obsoleto, nem um endpoint legado `/sse`.
