---
description: Execute a imagem Docker do CloakBrowser MCP para automação repetível do navegador Playwright MCP com perfis persistentes em /data, montagens de extensões e CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

A imagem publicada mostra o tempo de execução recomendado para o uso repetível do MCP.

Use a [receita de Docker Streamable HTTP com proxy reverso](recipes/docker-streamable-http-reverse-proxy.md) para uma implantação breve de um servidor HTTP já em execução atrás de TLS e autenticação.

## Correr

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Os artefatos são gravados em `/data` no contêiner. Monte esse caminho para armazenar capturas de tela, instantâneos, downloads e saídas de rede.

A imagem já executa o Tini como PID 1 e subreaper, portanto os comandos normais não precisam de um processo init adicional do Docker.

As mesmas tags de lançamento são publicadas no Docker Hub como `swimmwatch/cloakbrowser-mcp` e no GHCR como `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Sessões com interface gráfica e tela virtual { #headed-sessions-and-virtual-display }

A imagem usa `PLAYWRIGHT_MCP_HEADLESS=true` por padrão; sessões sem interface gráfica não iniciam o Xvfb. Quando uma sessão solicita `headless: false`, o inicializador inicia sob demanda uma única tela Xvfb privada do contêiner, aguarda sua disponibilidade e a mantém até o encerramento do contêiner. Sessões HTTP simultâneas com interface gráfica compartilham essa tela, enquanto seus contextos de navegador Playwright, páginas, perfis e artefatos permanecem isolados.

Para uma sessão stdio com interface gráfica, defina a variável padrão do Playwright MCP:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Isso não é uma área de trabalho visível nem um serviço de transmissão de interface gráfica: a imagem não fornece VNC, noVNC, RDP, acesso ao X11 do host nem captura de tela. Não trate o foco nativo do X11, a área de transferência ou a captura de tela como limites de isolamento entre locatários. O inicializador encerra a tela durante o desligamento; uma falha de inicialização ou o encerramento de MCP CLI desliga o contêiner em vez de deixar uma ponte utilizável.

Fora desta imagem, um navegador com interface gráfica ainda exige um ambiente de exibição utilizável. Defina `PLAYWRIGHT_MCP_HEADLESS=true` quando nenhuma tela estiver disponível.

## Estado do contêiner e ambiente de execução restrito { #container-health-and-restricted-runtime }

O `HEALTHCHECK` do Docker usa um socket Unix privado e verifica ativamente se o loop de eventos de MCP CLI responde. Se o Xvfb tiver sido iniciado, também verifica a tela X11; um contêiner sem interface gráfica cuja tela nunca foi solicitada permanece healthy. A inicialização, o desligamento ou a falha da tela implica o estado unhealthy. A verificação da resposta X11 é limitada a 1 segundo, a resposta de CLI a 750 milissegundos, a solicitação privada de estado a 2,5 segundos, e o Docker encerra cada comando de verificação após 3 segundos. Com o intervalo do Docker de 2 segundos e duas tentativas adicionais, as transições de estado dependem do agendamento do Docker e não constituem um objetivo de nível de serviço de disponibilidade. Essa verificação é separada dos endpoints HTTP públicos `/healthz` e `/readyz` e nunca envia tráfego por MCP stdio. Ela não comprova que um navegador, uma sessão MCP ou um site remoto seja utilizável; um orquestrador externo é responsável pela reinicialização e recuperação.

O inicializador concede a cada processo filho até 8 segundos para encerrar após `SIGTERM` e depois até 2 segundos após `SIGKILL`; o tempo limite de parada do Docker deve permitir o desligamento sequencial de CLI e Xvfb. A imagem é executada como o usuário não privilegiado `node` e admite um sistema de arquivos raiz somente para leitura. Mantenha `/data` montado para os artefatos e forneça montagens temporárias graváveis para `/tmp` e `/tmp/.X11-unix` quando sessões com interface gráfica forem possíveis. O socket de estado só é acessível pelo proprietário (`0600`). O socket X11 local do contêiner é compartilhado entre o processo `node` e o Xvfb, portanto não é um limite de isolamento entre locatários. Não monte nenhum desses sockets a partir do host nem os compartilhe entre contêineres.

## Perfis persistentes { #persistent-profiles }

O Docker não habilita um perfil de navegador persistente por padrão. Use o
volume existente `/data` como raiz de persistência quando quiser que cookies,
armazenamento local, cache ou estado de extensões sobrevivam às reinicializações
do contêiner:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Variáveis de ambiente dentro do Docker devem usar caminhos do contêiner, como
`/data/profiles/default`, não caminhos do host. A ponte cria o diretório de
perfil se ele estiver ausente, verifica se é gravável, grava o caminho do
contêiner na configuração gerada do Playwright MCP e rejeita diretórios de perfil
ativos duplicados dentro de um mesmo processo do servidor.

## Cache de licença do CloakBrowser

A imagem armazena binários do CloakBrowser, o estado da licença e o cache de
validação em `/home/node/.cloakbrowser`. Monte um volume nomeado nesse local
para manter um login do nível gratuito do GitHub ou Pro entre substituições do
contêiner:

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use o mesmo volume com o comando upstream `info` ou `logout` para inspecionar
ou remover o login salvo. Como alternativa, injete
`CLOAKBROWSER_LICENSE_KEY` por meio do gerenciamento de segredos do contêiner.
Não coloque chaves de licença em camadas da imagem, arquivos Compose
versionados ou saídas de comandos capturadas como evidência de build.

## Binário personalizado do CloakBrowser

Monte um executável de navegador compatível no contêiner e passe o caminho dentro
do contêiner por `--binary-path` (ou `CLOAKBROWSER_BINARY_PATH`):

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

O arquivo deve ser um executável Linux legível compatível com a arquitetura de CPU
da imagem, e as bibliotecas necessárias devem estar disponíveis no contêiner. O
caminho se aplica a todas as sessões Streamable HTTP do contêiner; execute
contêineres separados para binários de navegador diferentes.

## Extensões do Chrome { #chrome-extensions }

Extensões do Chrome exigem um perfil persistente e devem ser montadas
separadamente. Use caminhos do contêiner nas variáveis de ambiente, não caminhos
do host. A montagem da extensão pode ser somente leitura:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use uma matriz JSON para `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` quando um caminho
contiver vírgulas ou ao passar vários diretórios de extensões. Reinicie o
contêiner depois de alterar arquivos ou caminhos de extensões.

O modo de conexão Playwright Extension é diferente da montagem de uma extensão descompactada mostrada acima. Ele exige a extensão oficial em um persistent Chrome/Edge profile e `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Monte cada profile em um writable path separado, injete o token por um secret manager e não combine `PLAYWRIGHT_MCP_EXTENSION=true` com `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP com transmissão contínua { #streamable-http }

Para uso local do Streamable HTTP, publique a porta do contêiner no loopback:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para sessões HTTP com interface gráfica, defina `PLAYWRIGHT_MCP_HEADLESS=false` no contêiner. Solicitações initialize individuais ainda podem selecionar o modo sem interface gráfica pelos metadados MCP compatíveis.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Para acessar diretamente via HTTPS a partir do contêiner, monte seus arquivos de certificado e selecione HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

A ligação `127.0.0.1:3000` no lado do host mantém o endpoint local. Se você publicar o Streamable HTTP em uma interface que não seja de loopback, use HTTPS com autenticação ou coloque o servidor atrás de um proxy reverso confiável com terminação TLS, autenticação e controles de rede.
O Streamable HTTP expõe as sondas fixas `GET /healthz` e `GET /readyz` no mesmo host e na mesma porta. Se `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` estiverem configuradas, as sondas exigem o mesmo cabeçalho `Authorization: Bearer ...` que as solicitações MCP.
Consulte a [Referência da CLI](generated/cli.md) gerada para obter todas as flags de transporte HTTP e variáveis de ambiente.

## Gerenciado CDP { #managed-cdp }

Publique o intervalo gerenciado CDP configurado de um para um. Este exemplo stdio habilita um
sessão e mantém cada porta do host vinculada ao loopback:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0` é necessário para o encaminhamento de portas do Docker, então o explícito
A participação voluntária `--cdp-allow-remote` e o concreto `--cdp-advertised-host` também são necessários.
Não remapeie o intervalo para números de porta do host diferentes: URLs de descoberta contêm o
Porta arrendada e cada porta publicada devem direcionar de forma direta para sua sessão proprietária.

Para Streamable HTTP multi-sessão, configure e publique o pool sem definir o
processar por padrão se os clientes devem optar individualmente:

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Uma solicitação `initialize` autenticada com `cdpEnabled: true` aluga um publicado
port. Um valor omitido herda o padrão do processo, enquanto `cdpEnabled: false`
explicitamente opta por não participar e não consome nenhuma porta CDP. O esgotamento do pool rejeita apenas uma nova
Sessão habilitada para CDP; não reduz a capacidade de sessões desabilitadas.

Leia o URL portador de capacidade do `cloakbrowser_bridge_info`. Não o coloque dentro
logs de contêiner ou verificações de integridade. Conecte-se com um CDP API como
`chromium.connectOverCDP()`; o URL não é compatível com Playwright
`chromium.connect()` ou o fluxo atual Open WebUI.

`--cdp-advertised-scheme https` altera URLs publicados para `https`/`wss`, mas o
a ponte não fornece TLS para CDP gerenciado. Use um terminador TLS de propriedade do operador que
ocupa a mesma porta anunciada no namespace de rede externo, preserva
`Host`/`Origin`, e encaminha um a um para o ouvinte da ponte em texto simples. O
o salto bridge-to-Chromium também mantém o tráfego de loopback em texto simples.

## Correspondência de proxy por GeoIP { #geoip-proxy-matching }

O Docker utiliza as mesmas variáveis de ambiente de proxy e GeoIP que o npm. Habilite
a correspondência de proxy GeoIP quando o controle de qualidade regional precisar que as impressões digitais de fuso horário, idioma e
localidade do CloakBrowser sigam a localização do proxy configurada:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Para proxies autenticados, inclua as credenciais na URL do proxy e codifique com percentagem
os caracteres especiais presentes no nome de usuário ou na senha.

Binários compatíveis do CloakBrowser usam autenticação nativa de proxy
incorporada à URL; binários antigos recorrem ao objeto de proxy do Playwright.

Quando o contêiner executa o Streamable HTTP, os clientes também podem escolher diferentes
proxies por sessão do MCP por meio dos metadados `initialize`. Consulte
[Correspondência de proxy por GeoIP](geoip-proxy-matching.md) para metadados de proxy em tempo de execução,
casos de uso em várias regiões e limitações.

## Valores padrão

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## Configuração do cliente MCP

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Compilar localmente { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

O Dockerfile utiliza a imagem oficial fixada do Playwright MCP como base de execução, aplica as atualizações de segurança disponíveis do Debian durante a compilação, remove o payload global do npm não utilizado da imagem de execução e instala a ponte sob `/opt/cloakbrowser-mcp`.

O fluxo de trabalho de lançamento publica os atestados de SBOM e de proveniência, inclui rótulos OCI para fonte, revisão, versão, licença, nome da imagem base e hash da imagem base, e verifica a imagem compilada com o Trivy antes da publicação.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
