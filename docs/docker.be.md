---
description: Запусціце Docker-абraz CLB000000 для паўтаральнай аўтаматызацыі браўзера MCP з дапамогай Playwright і CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Докер

Апублікаванае выява — гэта рэкамендаваны час працы для паўторнага выкарыстання MCP.

## Бягчы

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артыфакты запісваюцца ў `/data` у кантэйнеры. Маўнтніце гэты шлях, каб захоўваць скрыншоты, снэпшоты, спампоўкі і сеткавы вывад.

`--init` рэкамендуецца, таму што аўтаматызацыя браўзера можа ствараць кароткачасовыя даччыныя працэсы. Працэс init у Docker акуратна прыбірае гэтыя даччыныя працэсы.

Тыя ж тэгі рэлізу публікуюцца на Docker Hub як `swimmwatch/cloakbrowser-mcp` і на GHCR як `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## HTTP для струменевага перадавання

Для лакальнага выкарыстання Streamable HTTP апублікуйце порт кантэйнера на лупбэку:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для прамога HTTPS з кантэйнера прывяжыце вашыя файлы сертыфікатаў і выберыце HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Злучэнне `127.0.0.1:3000` на баку хоста захоўвае канцавую кропку лакальнай. Калі вы публікуеце Streamable HTTP на інтэрфейсе, які не з'яўляецца петлявым, выкарыстоўвайце HTTPS разам з аўтэнтыфікацыяй або размяшчайце сервер за давераным зваротным праксі-серверам, які завяршае TLS-злучэнне, з аўтэнтыфікацыяй і сеткавымі кантролямі.
Streamable HTTP адкрывае фіксаваныя пробы `GET /healthz` і `GET /readyz` на тым жа хосце і порце. Калі настроены `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, пробы патрабуюць той жа загаловак `Authorization: Bearer ...`, што і запыты MCP.
Глядзіце згенераваную [Даведку па CLI](generated/cli.md) для ўсіх транспартных сцягоў HTTP і зменных асяроддзя.

## Супастаўленне GeoIP-праксі

Docker выкарыстоўвае тыя ж зменныя асяроддзя проксі і GeoIP, што і npm. Уключыце супадзенне проксі GeoIP, калі для рэгіянальных патрэб QA CloakBrowser патрабуецца, каб часовыя паясы, мова і адбіткі лакалі адпавядалі месцазнаходжанню наладжанага проксі:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Для аўтэнтыфікаваных праксі-сервераў убудоўвайце ўліковыя даныя ў URL-адрас праксі і персальдавайце спецыяльныя сімвалы ў імя карыстальніка або паролі.

Калі кантэйнер запускае Streamable HTTP, кліенты таксама могуць выбіраць розныя праксі-серверы для кожнай MCP-сесіі праз метаданыя `initialize`. Гл.
[ГеаIP-адпаведнасць праксі-сервераў](geoip-proxy-matching.md) для метаданых праксі-сервера ў часе выканання, выпадкаў шматрэгіянальнага выкарыстання і абмежаванняў.

## Па змаўчанні

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

## Канфігурацыя кліента MCP

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

## Будуй мясцова

```bash
npm run docker:build
npm run docker:smoke
```

Dockerfile выкарыстоўвае замацаваны афіцыйны вобраз Playwright MCP у якасці асновы для выканання, накладвае даступныя абнаўленні бяспекі Debian падчас зборкі, выдаляе невыкарыстаны глабальны npm-пайлоўд з вобраза для выканання і ўсталёўвае мост пад `/opt/cloakbrowser-mcp`.

Працоўны працэс выпуску публікуе SBOM і пацверджанні паходжання, уключае ярлыкі OCI для крыніцы, рэвізіі, версіі, ліцэнзіі, назвы базавага выявы і хэша базавага выявы, а таксама скануе згенераванае выява з дапамогай Trivy перад публікацыяй.
