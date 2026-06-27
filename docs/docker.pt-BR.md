---
description: Execute a imagem do Docker do CloakBrowser MCP para obter uma automação repetível do navegador Playwright MCP com o CloakBrowser.
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
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
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
