---
description: Servidor de automação de navegador compatível com Playwright MCP como drop-in, com ferramentas upstream sem alterações, CloakBrowser Chromium e empacotamento pronto para npm, Docker e Streamable HTTP.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Primeiros passos</a>
  <a class="md-button" href="comparison/">Comparação</a>
  <a class="md-button" href="recipes/">Receitas</a>
</p>

# Servidor MCP do CloakBrowser

`cloakbrowser-mcp` é um servidor de automação de navegador compatível com Playwright MCP como drop-in, com ferramentas upstream sem alterações, CloakBrowser Chromium e empacotamento pronto para npm, Docker e Streamable HTTP. Ele executa o upstream `@playwright/mcp` como superfície canônica de ferramentas de navegador e adiciona recursos de execução CloakBrowser orientados a implantação.

## Demo de 30 segundos

<div class="clb-demo-video">
<video controls preload="metadata" poster="assets/videos/30-second-demo-poster.png" aria-label="Demo de 30 segundos do CloakBrowser MCP">
<source src="assets/videos/30-second-demo.mp4" type="video/mp4">
</video>
</div>

<p class="clb-demo-caption">Veja a primeira execução: inicie o pacote npm, conecte um cliente MCP, peça pesquisa na web, automação ou testes e inspecione o resultado em um navegador real.</p>

Use quando quiser ferramentas de navegador compatíveis com Playwright MCP junto com perfis persistentes, carregamento de extensões, validação de contexto, correspondência GeoIP de proxy para QA regional ou entrada humanizada.

Versão atual: {{ project.version_tag }}.

## Compatibilidade de versões

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.9.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`    | stdio, Streamable HTTP | Comparado no CI |
| `1.8.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`    | stdio, Streamable HTTP | Comparado no CI |
| `1.7.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | Comparado no CI |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Comparado no CI |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Comparado no CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Comparado no CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Comparado no CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Comparado no CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparado no CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparado no CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Comparado no CI |

<!-- compatibility-table:end -->

Consulte [Compatibilidade de versões](version-compatibility.md) para ver a correspondência atualizada entre as versões SemVer deste projeto e as versões do Playwright MCP de origem.

## O que é isso?

<div class="grid cards" markdown>

- :material-connection: **Runtime da ponte**

  Inicia o upstream Playwright MCP como processo filho e encaminha chamadas de ferramentas do navegador sem alterações.

- :material-incognito: **Execução do CloakBrowser**

  Gera uma configuração do Playwright MCP com `launchOptions.executablePath` apontando para o CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Publicado como um pacote CLI leve em Node.js para clientes MCP via stdio e Streamable HTTP.

- :fontawesome-brands-docker: **Imagem Docker**

  Baseado na imagem oficial do Playwright MCP e com pré-carregamento do cache do binário do CloakBrowser.

- :material-map-marker-radius: **Correspondência GeoIP do proxy**

  Alinha o fuso horário, o idioma e a localidade da impressão digital do CloakBrowser com o local do proxy configurado.

- :material-gesture-tap: **Comportamento de entrada humanizado**

  Encaminha as interações da página pela camada de mouse, teclado e rolagem humanizada do CloakBrowser.

</div>

## Superfície da ferramenta

Os contratos da ferramenta Playwright MCP, de nível superior, são os que prevalecem. Este projeto adiciona apenas duas ferramentas locais de introspecção:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Próximos passos

- [Introdução](getting-started.md) para a configuração do npm, do Docker e do cliente MCP.
- [Configuração](configuration.md) para variáveis de ambiente compatíveis.
- [Correspondência de proxy por GeoIP](geoip-proxy-matching.md) para controle de qualidade regional, metadados de proxy em tempo de execução e sessões HTTP Streamable em vários locais.
- [Comportamento de entrada humanizado](humanized-input-behavior.md) para realismo na interação, configuração e casos de uso.
- [Ferramentas](tools.md) para expectativas de interface de ferramentas e paridade com o upstream.
- [Perguntas frequentes](faq.md) para dúvidas comuns sobre instalação, Docker, paridade e segurança.
- [Guia do colaborador](contributor-guide.md) com detalhes sobre desenvolvimento, testes, arquitetura e lançamentos.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
