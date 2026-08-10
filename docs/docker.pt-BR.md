---
description: Execute a imagem Docker do CloakBrowser MCP para automação repetível do navegador Playwright MCP com perfis persistentes em /data, montagens de extensões e CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

A imagem publicada mostra o tempo de execução recomendado para o uso repetível do MCP.

## Correr

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Os artefatos são gravados em `/data` no contêiner. Monte esse caminho para armazenar capturas de tela, instantâneos, downloads e saídas de rede.

`--init` é recomendado porque a automação do navegador pode criar processos filhos de curta duração. O processo de inicialização do Docker encerra esses processos filhos de forma adequada.

As mesmas tags de lançamento são publicadas no Docker Hub como `swimmwatch/cloakbrowser-mcp` e no GHCR como `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Perfis persistentes

O Docker não habilita um perfil de navegador persistente por padrão. Use o
volume existente `/data` como raiz de persistência quando quiser que cookies,
armazenamento local, cache ou estado de extensões sobrevivam às reinicializações
do contêiner:

```bash
docker run --rm --init -i \
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

docker run --rm --init -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use o mesmo volume com o comando upstream `info` ou `logout` para inspecionar
ou remover o login salvo. Como alternativa, injete
`CLOAKBROWSER_LICENSE_KEY` por meio do gerenciamento de segredos do contêiner.
Não coloque chaves de licença em camadas da imagem, arquivos Compose
versionados ou saídas de comandos capturadas como evidência de build.

## Extensões do Chrome

Extensões do Chrome exigem um perfil persistente e devem ser montadas
separadamente. Use caminhos do contêiner nas variáveis de ambiente, não caminhos
do host. A montagem da extensão pode ser somente leitura:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Use uma matriz JSON para `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` quando um caminho
contiver vírgulas ou ao passar vários diretórios de extensões. Reinicie o
contêiner depois de alterar arquivos ou caminhos de extensões.

## HTTP com transmissão contínua

Para uso local do Streamable HTTP, publique a porta do contêiner no loopback:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para acessar diretamente via HTTPS a partir do contêiner, monte seus arquivos de certificado e selecione HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

A ligação `127.0.0.1:3000` no lado do host mantém o endpoint local. Se você publicar o Streamable HTTP em uma interface que não seja de loopback, use HTTPS com autenticação ou coloque o servidor atrás de um proxy reverso confiável com terminação TLS, autenticação e controles de rede.
O Streamable HTTP expõe as sondas fixas `GET /healthz` e `GET /readyz` no mesmo host e na mesma porta. Se `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` estiverem configuradas, as sondas exigem o mesmo cabeçalho `Authorization: Bearer ...` que as solicitações MCP.
Consulte a [Referência da CLI](generated/cli.md) gerada para obter todas as flags de transporte HTTP e variáveis de ambiente.

## Correspondência de proxy por GeoIP

O Docker utiliza as mesmas variáveis de ambiente de proxy e GeoIP que o npm. Habilite
a correspondência de proxy GeoIP quando o controle de qualidade regional precisar que as impressões digitais de fuso horário, idioma e
localidade do CloakBrowser sigam a localização do proxy configurada:

```bash
docker run --rm --init -i \
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
        "--init",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Compilar localmente

```bash
npm run docker:build
npm run docker:smoke
```

O Dockerfile utiliza a imagem oficial fixada do Playwright MCP como base de execução, aplica as atualizações de segurança disponíveis do Debian durante a compilação, remove o payload global do npm não utilizado da imagem de execução e instala a ponte sob `/opt/cloakbrowser-mcp`.

O fluxo de trabalho de lançamento publica os atestados de SBOM e de proveniência, inclui rótulos OCI para fonte, revisão, versão, licença, nome da imagem base e hash da imagem base, e verifica a imagem compilada com o Trivy antes da publicação.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
