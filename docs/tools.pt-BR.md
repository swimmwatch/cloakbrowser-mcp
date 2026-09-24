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

Como referência upstream estável, veja o teste de capacidades do Playwright MCP `{{ project.playwright_mcp_package_tag }}` fixado no commit exato do pacote: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77).

Este projeto trata o upstream Playwright MCP como fonte autorizada e não mantém uma referência de esquemas copiada.

O conjunto padrão contém 25 ferramentas upstream, incluindo `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
passa a capacidade `devtools` ao processo filho sem uma opção `--caps` da
ponte; as ferramentas e os esquemas upstream resultantes são encaminhados sem
alterações, incluindo `browser_start_recording` e `browser_stop_recording`.

!!! warning "Limitação de gravação com o binário público CloakBrowser v146"
    As ferramentas de gravação estão disponíveis, mas o binário público do Chromium 146
    sem chave usado pelo CloakBrowser 0.5.10 desativa intencionalmente a ligação do Playwright
    entre a página e o host para preservar a furtividade. Como resultado, `browser_stop_recording`
    pode retornar código parcial: a navegação é gravada, enquanto entradas de texto e cliques
    concluídos com sucesso são omitidos. Revise as gravações geradas antes de reutilizá-las.

    A compatibilidade com ativação explícita é acompanhada em [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    A decisão subjacente sobre a ligação é discutida em
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) e
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Ferramentas WebMCP dinâmicas

O Chromium implementa WebMCP a partir da versão 154. Builds anteriores do CloakBrowser ignoram o feature flag; quando o WebMCP for necessário, use um build de navegador compatível ou `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

Quando o Chromium é iniciado com `--enable-features=WebMCP`, as páginas podem declarar ferramentas `webmcp_*`. A ponte encaminha `notifications/tools/list_changed`, limpa todo o cache de `tools/list` e o cliente deve solicitar a lista novamente. No Streamable HTTP, somente o fluxo aberto da sessão correspondente recebe a notificação; o próximo `tools/list` continua atualizado mesmo sem fluxo. Trate nome, descrição, esquema, annotations e output como dados de página não confiáveis. A ponte não ativa o WebMCP automaticamente; `PLAYWRIGHT_MCP_WEBMCP=false` desativa a coleta.

## Ferramentas locais

### `cloakbrowser_binary_info`

Retorna informações estruturadas sobre o pacote CloakBrowser, a plataforma atual, o diretório de cache, o caminho esperado do binário, o status de instalação e o resolved executable path usado pela ponte.

### `cloakbrowser_bridge_info`

Retorna metadados estruturados da ponte:

O objeto aditivo `structuredContent.cdp` reporta o CDP gerenciado da sessão de chamada
estado:

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

`generation` aumenta e `discoveryUrl` gira após a substituição do navegador.
`activeConnections` conta conexões WebSocket aceitas por proxy sem expor
identidades de clientes, IDs de alvo ou conteúdo de protocolo. Trate toda descoberta não nula URL
como uma credencial.

Use a descoberta URL com um cliente compatível com CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

CDP gerenciado não é o protocolo do servidor Playwright. Playwright
A integração atual Open WebUI `PLAYWRIGHT_WS_URL` e `chromium.connect()` esperam
um endpoint de servidor Playwright e não são compatíveis com este URL.

- nome e versão do servidor MCP;
- modo de runtime;
- pacote e versão do upstream Playwright MCP;
- contagem de ferramentas upstream;
- nomes das ferramentas locais específicas do Cloak.

A superfície local continua limitada a estas duas ferramentas de diagnóstico.
`SessionSeats` e `getSessionSeats` não são expostos como uma ferramenta MCP
porque o CloakBrowser 0.5.10 não exporta essa API a partir de seu ponto de
entrada público.

## Paridade

O CI constrói a imagem Docker e executa `npm run bridge:compare`. Esse script inicia em paralelo a imagem oficial do Playwright MCP e a imagem da ponte CloakBrowser, compara a lista de ferramentas upstream e exercita as ferramentas de navegador upstream padrão contra a mesma página fixture.

Use `--report` para gravar um relatório JSON legível por máquina:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

O CI envia esse relatório como artefato para builds Docker e builds de release.
