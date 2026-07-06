---
title: Correspondência de proxy por GeoIP
description: Correlaciona as impressões digitais de fuso horário, idioma e localidade do CloakBrowser com um local de proxy configurado para controle de qualidade regional e sessões HTTP transmissíveis.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# Correspondência de proxy por GeoIP

A correspondência de proxy por GeoIP mantém as configurações de impressão digital do navegador alinhadas com a localização
do proxy utilizado pelo MCP do Playwright a montante. Isso é útil quando o controle de qualidade regional depende
de um proxy, fuso horário, idioma e perfil de localização consistentes.

A ponte não cria nem roteia o tráfego de proxy por conta própria. O roteamento de proxy continua
sendo de responsabilidade do Playwright MCP upstream por meio do `PLAYWRIGHT_MCP_PROXY_SERVER`. Quando
a correspondência está habilitada, o MCP do CloakBrowser resolve a localização do proxy configurada e
adiciona os parâmetros de inicialização correspondentes do CloakBrowser para fuso horário, idioma do navegador e
localidade da impressão digital.

## O que muda

Quando `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true`, a ponte pode adicionar esses
parâmetros de inicialização para o CloakBrowser:

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`

Isso ajuda a garantir que o perfil do navegador pareça internamente consistente com a região do proxy.
Os esquemas da ferramenta MCP do Playwright e as ferramentas do navegador ainda são encaminhados
sem alterações.

## Configuração geral

Utilize variáveis de ambiente no nível do processo para clientes stdio e como padrão para
sessões HTTP do Streamable:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Adicione uma lista de exceções para os hosts que devem evitar o proxy:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Proxies HTTP autenticados são suportados por meio da incorporação de credenciais em
`PLAYWRIGHT_MCP_PROXY_SERVER`. Codifique os caracteres especiais nas credenciais usando a codificação percentual;
por exemplo, use `p%40ssword` para `p@ssword`.

## Configuração do Docker

Passe as mesmas variáveis para o contêiner. Mantenha as credenciais de proxy no seu gerenciador de segredos
ou no ambiente do cliente MCP, sempre que possível.

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Para o Streamable HTTP no Docker, publique a porta HTTP como de costume e mantenha as variáveis de proxy
como padrões do ambiente do contêiner:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Proxy HTTP com transmissão por sessão

Os clientes HTTP com suporte a stream podem escolher um proxy no momento da inicialização da sessão do MCP.
Isso permite que um servidor MCP em execução contínua lide com diferentes cenários regionais sem
precisar ser reiniciado.

Envie os metadados da ponte na solicitação `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` substitui `PLAYWRIGHT_MCP_PROXY_SERVER` para essa sessão HTTP.
`proxyBypass` substitui `PLAYWRIGHT_MCP_PROXY_BYPASS` somente quando `proxyServer` estiver
presente. Se `proxyServer` estiver presente e `proxyBypass` for omitido, a
configuração herdada de ignorar o proxy é desativada para essa sessão.

`geoipProxyMatch` substitui a configuração de GeoIP no nível do processo para essa sessão HTTP.
Use `true` para habilitar a correspondência para a sessão ou `false` para desabilitá-la
mesmo que o servidor tenha sido iniciado com a correspondência habilitada.

As sessões HTTP existentes são imutáveis. Crie outra sessão HTTP do Streamable para
mudar para um proxy ou local diferente.

Se `proxyServer` contiver credenciais, mantenha-as codificadas em URL e passe o valor
por meio de segredos ou da configuração de tempo de execução do cliente, em vez de incluí-lo nos
arquivos do projeto.

## Casos de uso

<div class="grid cards" markdown>

- :material-cart-check: **QA de comércio localizado**

  Teste checkout, impostos, mensagens de envio, moeda e regras regionais de catálogo
  com o fuso horário e a localidade do navegador alinhados ao local do proxy.

- :material-web: **Landing pages regionais**

  Verifique idioma, consentimento, campanhas e variantes de conteúdo que dependem da região
  do visitante.

- :material-lifebuoy: **Reprodução para suporte**

  Reproduza um relato da região de um cliente sem reiniciar todo o servidor MCP
  para cada local de proxy.

- :material-clock-check: **Fluxos sensíveis a fuso horário**

  Valide seletores de data, janelas de reserva, lembretes e páginas de agendamento em que
  fuso horário e localidade precisam corresponder à região de rede.

- :material-source-branch-sync: **Sessões regionais paralelas**

  Execute sessões Streamable HTTP separadas com proxies diferentes para que um agente possa
  comparar várias regiões em um único processo de servidor.

</div>

## Prioridade e limites

| Área | Comportamento |
| --- | --- |
| Stdio | Usa apenas variáveis de ambiente e flags de CLI no nível do processo. |
| Padrão de Streamable HTTP | Usa variáveis de ambiente e flags de CLI no nível do processo quando nenhum metadado runtime é fornecido. |
| Metadados Streamable HTTP | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` pode sobrescrever proxy e correspondência GeoIP para uma sessão. |
| Sessões existentes | Mantêm o proxy e a configuração GeoIP capturados durante `initialize`. |
| Roteamento do proxy | Continua delegado ao upstream Playwright MCP. |
| Browser geolocation API | Não é configurada por este recurso; ele apenas alinha fuso horário, idioma e locale fingerprint flags do CloakBrowser. |

Os dados de localização do GeoIP são aproximados e dependem do IP do proxy e do
banco de dados do GeoIP do CloakBrowser. O CloakBrowser baixa e armazena em cache esse banco de dados offline na primeira
vez em que for utilizado, quando necessário.

Utilize esse recurso para testes legítimos de controle de qualidade, localização e consistência de ambiente.
Ele não deve ser tratado como uma forma de contornar controles de acesso ou verificações de políticas regionais.

## Configuração relacionada

- [Configuração](configuration.md) lista todas as variáveis de ambiente da ponte e do upstream.
- [Docker](docker.md) explica os padrões de tempo de execução do contêiner e a publicação HTTP do Streamable.
- [Ferramentas](tools.md) explica por que as ferramentas de navegador do Playwright MCP a montante são encaminhadas sem alterações.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
