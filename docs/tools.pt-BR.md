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

Como referência estável para Playwright MCP `@playwright/mcp@0.0.83`, consulte o teste de capacidades fixado no commit desse pacote: [ferramentas padrão e ferramentas habilitadas por capacidades](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). A dependência instalada define a superfície atual de ferramentas.

Este projeto trata o upstream Playwright MCP como fonte autorizada e não mantém uma referência de esquemas copiada.

O conjunto padrão contém 25 ferramentas upstream, incluindo `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
passa a capacidade `devtools` ao processo filho sem uma opção `--caps` da
ponte; as ferramentas e os esquemas upstream resultantes são encaminhados sem
alterações, incluindo `browser_start_recording` e `browser_stop_recording`.

!!! warning "Limitação de gravação com o binário público CloakBrowser v146"
    As ferramentas de gravação estão disponíveis, mas o binário público do Chromium 146 sem chave desativa intencionalmente a ligação do Playwright entre a página e o host para preservar a furtividade. Por isso, `browser_stop_recording` pode retornar código parcial: a navegação é gravada, mas entradas e cliques concluídos com sucesso são omitidos. Revise as gravações geradas antes de reutilizá-las.

    A compatibilidade com ativação explícita é acompanhada em [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    A decisão subjacente sobre a ligação é discutida em
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) e
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Ferramentas WebMCP dinâmicas

O suporte a WebMCP depende da build do navegador e dos recursos habilitados. O Playwright MCP instalado espera `document.modelContext` ou `navigator.modelContext` com o método `getTools()`. Quando WebMCP for necessário, use uma build compatível do CloakBrowser ou `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

[A documentação do Chrome sobre WebMCP](https://developer.chrome.com/docs/ai/webmcp) descreve um origin trial desde o Chrome 149, uma flag para testes locais e limitações do modo headless. O número da versão do Chromium, por si só, não garante compatibilidade com a API esperada pelo Playwright MCP.

Quando o Chromium é iniciado com `--enable-features=WebMCP`, o Playwright MCP pode adicionar ferramentas fornecidas pela página com nomes `webmcp_*` enquanto ela estiver aberta. Essas ferramentas são dinâmicas: a ponte anuncia `tools.listChanged`, invalida todo o cache paginado de ferramentas quando o servidor upstream envia `notifications/tools/list_changed` e encaminha a notificação ao cliente MCP da sessão correspondente. Os clientes devem escutar essa notificação e chamar `tools/list` novamente. Um cliente Streamable HTTP só a recebe enquanto o fluxo de notificações da sua sessão estiver aberto; a próxima chamada a `tools/list` continua retornando informações atualizadas mesmo que nenhum fluxo estivesse aberto.

As ferramentas dinâmicas pertencem somente à sessão MCP e à geração atual do navegador com CDP gerenciado que as descobriu. Seus nomes, descrições, esquemas, anotações e resultados são conteúdo não confiável da página e são encaminhados sem alterações pela ponte. Revise-os antes de chamar as ferramentas. Defina `PLAYWRIGHT_MCP_WEBMCP=false` para desativar a coleta. A ponte nunca habilita o Chromium WebMCP automaticamente.

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

O objeto adicional `structuredContent.cdp` informa o estado do CDP gerenciado da sessão que faz a chamada:

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

`generation` aumenta e `discoveryUrl` muda após a substituição do navegador. `activeConnections` conta as conexões WebSocket aceitas por meio do proxy sem expor identidades dos clientes, identificadores dos alvos ou conteúdo do protocolo. Trate cada URL de descoberta não nula como uma credencial.

Use a URL de descoberta com um cliente compatível com CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

O CDP gerenciado não é o protocolo Playwright Server. O método `chromium.connect()` do Playwright e a integração atual do Open WebUI `PLAYWRIGHT_WS_URL` esperam um endpoint Playwright Server e não são compatíveis com essa URL.

Com a versão fixada do cliente Playwright, foi verificado que `browser.close()` em um navegador retornado por `connectOverCDP()` desconecta esse cliente e mantém o Chromium e a geração do navegador prontos. Essa observação é específica do cliente e não é uma garantia para outras bibliotecas CDP. Enviar diretamente o comando CDP `Browser.close` é destrutivo: encerra a geração compartilhada do Chromium, invalida a capability e afeta os clientes que chamam o MCP. Coordene as operações MCP e CDP, pois a ponte não serializa operações conflitantes de navegação, fechamento de páginas, entrada ou alteração do armazenamento.

A superfície local continua limitada a estas duas ferramentas de diagnóstico. `SessionSeats` e `getSessionSeats` não são expostos como ferramenta MCP porque o ponto de entrada público suportado do CloakBrowser não exporta essa API.

## Paridade

O CI constrói a imagem Docker e executa `npm run bridge:compare`. Esse script inicia em paralelo a imagem oficial do Playwright MCP e a imagem da ponte CloakBrowser, compara a lista de ferramentas upstream e exercita as ferramentas de navegador upstream padrão contra a mesma página fixture.

Use `--report` para gravar um relatório JSON legível por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

O CI envia esse relatório como artefato para builds Docker e builds de release.
