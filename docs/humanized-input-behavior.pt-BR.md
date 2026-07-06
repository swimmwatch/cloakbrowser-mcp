---
title: Comportamento de entrada humanizado
description: Ative o comportamento humanizado do mouse, teclado e rolagem do CloakBrowser para sessões de QA sensíveis à interação e sessões HTTP transmissíveis.
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# Comportamento de entrada humanizado

O comportamento de entrada humanizado direciona as interações da página por meio da
camada de mouse, teclado e rolagem do CloakBrowser, que simula o comportamento humano. Isso é útil quando a equipe de controle de qualidade precisa de um
ritmo, movimento do ponteiro, cadência de digitação e comportamento de rolagem mais realistas do que
os oferecidos pela automação padrão.

A ponte não adiciona novas ferramentas ao navegador nem altera os esquemas do Playwright MCP
originais. Ela aplica o patch de interação com a página do CloakBrowser durante a inicialização da página do Playwright MCP,
de modo que as ferramentas existentes continuam funcionando com as mesmas entradas.

## O que muda

Quando `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, o CloakBrowser pode humanizar ações comuns da página,
incluindo:

- movimentos e cliques do mouse;
- digitação e pressionamento de teclas;
- preenchimento de formulários e alternância entre campos;
- rolagem e comportamento de “rolar até o elemento”.

Isso afeta o tempo de interação e os padrões de movimento. Não altera o
conteúdo da página, o roteamento de rede, as configurações de proxy nem a geolocalização do navegador.

## Configuração geral

Utilize a variável de ambiente sempre que uma sessão stdio ou uma sessão HTTP Streamable padrão
dever adotar um comportamento mais intuitivo:

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

Essa mesma configuração funciona com o sinalizador explícito da CLI:

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Configuração do Docker

Passe a mesma variável de ambiente para o contêiner:

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

No Streamable HTTP no Docker, a variável de ambiente passa a ser o padrão para
novas sessões HTTP:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Configuração de HTTP streamable por sessão

Os clientes HTTP compatíveis com stream podem optar por um comportamento humanizado no momento da
inicialização da sessão MCP. Isso permite que um servidor compare o comportamento de interação padrão com o humanizado
sem precisar ser reiniciado.

Envie os metadados da ponte na solicitação `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` substitui a configuração no nível do processo para essa sessão HTTP. Use
`true` para habilitar o comportamento humanizado ou `false` para desativá-lo, mesmo que o
servidor tenha sido iniciado com `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.

`humanPreset` aceita `default` ou `careful` e seleciona a predefinição de comportamento humano do CloakBrowser
para a sessão. Ele não habilita o comportamento humanizado por
si só; defina `humanize: true` ou ative `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.
A predefinição `careful` é mais lenta e cautelosa do que `default`.

As sessões HTTP existentes são imutáveis. Crie outra sessão HTTP do Streamable para
alternar entre o comportamento padrão e o humanizado.

## Casos de uso

<div class="grid cards" markdown>

- :material-form-textbox: **QA de formulários**

  Exercite digitação, preenchimento, mudanças de foco e fluxos de validação com uma cadência
  de teclado mais realista.

- :material-cart-check: **Fluxos de checkout**

  Teste caminhos de compra com muitas interações onde o tempo de digitação, cliques e
  troca de campos pode afetar a validação do cliente.

- :material-shield-search: **Verificações de UI sensíveis à interação**

  Compare automação padrão com interação humanizada quando uma página reage
  de forma diferente a entradas muito rápidas ou perfeitamente lineares.

- :material-mouse-scroll-wheel: **Páginas com muita rolagem**

  Valide páginas longas, feeds, listas de produtos e conteúdo lazy-loading com
  rolagem mais suave.

- :material-presentation-play: **Demonstrações e gravações**

  Produza sessões de navegador que pareçam menos mecânicas durante demos de produto,
  walkthroughs ou evidências de QA gravadas.

</div>

## Prioridade e limites

| Área | Comportamento |
| --- | --- |
| Stdio | Usa apenas variáveis de ambiente e flags de CLI no nível do processo. |
| Padrão de Streamable HTTP | Usa variáveis de ambiente e flags de CLI no nível do processo quando nenhum metadado runtime é fornecido. |
| Metadados Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` pode sobrescrever o comportamento humanizado para uma sessão. `humanPreset` pode selecionar `default` ou `careful`. |
| Sessões existentes | Mantêm a configuração humanize capturada durante `initialize`. |
| Motor de navegador | Aplica-se apenas quando `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak`. |
| Esquemas de ferramentas | Os esquemas das ferramentas de navegador do upstream Playwright MCP permanecem inalterados. |
| Configuração personalizada | `humanConfig` ainda não é aceito intencionalmente; configuração estruturada precisa de um esquema explícito de validação. |

Esse recurso destina-se a testes legítimos de controle de qualidade, realismo de interação e consistência.
Ele não deve ser utilizado como forma de contornar controles de acesso ou verificações de política.
>

## Configuração relacionada

- [Configuração](configuration.md) lista todas as variáveis de ambiente da ponte e do upstream.
- [Correspondência de proxy GeoIP](geoip-proxy-matching.md) explica os perfis de proxy consistentes por região.
- [Ferramentas](tools.md) explica por que as ferramentas de navegador do Playwright MCP upstream são encaminhadas sem alterações.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
