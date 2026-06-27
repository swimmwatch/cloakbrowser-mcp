---
description: Усталюйце і запусціце CloakBrowser MCP з дапамогай npm або Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Пачатак працы

Выкарыстоўвайце апублікаваны npm-пакет або Docker-абраз. Усталёўка са зыходнага кода патрэбна толькі для распрацоўкі.

Выбірайце npm, калі ваш кліент MCP ужо запушчаны на вашым камп'ютары і Node.js даступны. Выбірайце Docker, калі вы хочаце атрымаць паўторнае асяроддзе запуску з базавым вобразам Playwright MCP ад арыгінальных распрацоўшчыкаў і кэшам CloakBrowser, падрыхтаваным у кантэйнеры.

Каб хутка азнаёміцца з распаўсюджанымі пытаннямі па наладцы, глядзіце [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Прышпіліць рэліз, калі важная паўтаральнасць:

```bash
npx -y {{ project.npm_pin }}
```

Пакет npm патрабуе Node.js 22.12 або больш новага. CloakBrowser спампоўвае свой бінарнік Chromium пры першым выкарыстанні, калі ён яшчэ не кэшаваны.

Выкарыстоўвайце `doctor` для праверкі лакальнага асяроддзя выканання Node.js, метаданых пакета, вызначэння верхняга ўзроўню каманды CLI Playwright MCP і метаданых бінарнага файла CloakBrowser перад падключэннем кліента. Каманда не запускае брыдж і не спампоўвае браўзер.

Па змаўчанні транспартам з'яўляецца stdio. Выкарыстоўвайце `--transport streamable-http`, калі ваш кліент MCP падключаецца да HTTP-эндпойнта замест запуску працэсу stdio. Па змаўчанні HTTP-эндпойнт — `http://127.0.0.1:3000/mcp`, з фіксаваным `GET /healthz` і `GET /readyz`-праверкі на тым жа хосце і порце. Выкарыстоўвайце `--http-protocol https` з `--https-cert` і `--https-key` або `--https-pfx` пры тым, што брыдж павінен завяршаць TLS непасрэдна.
Глядзіце згенераваную [Даведку па CLI](generated/cli.md) для поўнага спісу сцягоў і адпаведных зменных асяроддзя.

## Докер

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker — гэта найбольш рэпрадукцыйная асяроддзе выканання, таму што вобраз заснаваны на замацаваным афіцыйным вобразе Playwright MCP і ўключае падрыхтаваны кэш браўзера CloakBrowser. Апублікаваныя вобразы падтрымліваюць `linux/amd64` і `linux/arm64`.
Тыя ж тэгі таксама публікуюцца ў `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Для лакальнага Streamable HTTP з Docker апублікуйце порт на лупбэку і прывяжыце сервер унутры кантэйнера:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для прамога HTTPS з Docker замацуйце файлы сертыфікатаў і выберыце HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

У рэжыме HTTP для перадачы па патоках URL служачага канцавага пункта MCP і логі запытаў выводзяцца на stdout. Рэжым Stdio не выводзіць звычайныя аперацыйныя логі, таму stdout MCP JSON-RPC застаецца «чыстым» з пункту гледжання пратакола.

Прышпіліць рэліз, калі важная паўтаральнасць:

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## Канфігурацыя кліента MCP

Большасць лакальных кліентаў MCP найлепш працуюць са stdio і npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Выкарыстоўвайце Docker, калі вам патрэбна паўторнае асяроддзе выканання. Захавайце `-i`, каб stdio заставаўся злучаным, і дадайце `--init`, каб дзіцячыя працэсы браўзера правільна завяршаліся.

Для HTTP-кліентаў з патокавай перадачай запускайце сервер асобна і наладзьце URL-адрас кліента як `http://127.0.0.1:3000/mcp` або `https://127.0.0.1:3000/mcp`. Калі `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` або `--http-auth-token` усталяваны, адпраўце той жа Bearer-токен на `/mcp`, `/healthz`, і `/readyz`.

=== "Кодэкс CLI"

    Зарэгістраваць лакальны stdio-сервер:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Або падключыце Codex да ўжо запушчанага Streamable HTTP-сервера:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== "Клод Код"

    Зарэгістраваць лакальны stdio-сервер:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Або падключыце Claude Code да ўжо запушчанага сервера Streamable HTTP:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== "Клод Дэсктоп"

    Дадайце сервер пад `mcpServers` у `claude_desktop_config.json`, затым перазапусціце Claude Desktop:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

Курсор / Клайн

    Дадайце сервер у канфігурацыю MCP JSON кліента:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== "VS Code"

    Дадаць сервер у працоўную прастору `.vscode/mcp.json` або на ўзроўні карыстальніка `mcp.json`:

    ```json
    {
      "servers": {
        "cloakbrowser": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== "Працягнуць"

    Стварыць `.continue/mcpServers/cloakbrowser-mcp.yaml`:

    ```yaml
    name: CloakBrowser MCP
    version: 0.0.1
    schema: v1
    mcpServers:
      - name: CloakBrowser
        type: stdio
        command: npx
        args:
          - -y
          - cloakbrowser-mcp@latest
    ```

Віндсёрф / Каскад

    У Windsurf адкрыйце Налады > Інструменты > Налады Windsurf > Дадаць сервер, або адрэдагуйце `~/.codeium/mcp_config.json`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Для ўжо запушчанага Streamable HTTP-сервера выкарыстоўвайце `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

Гусь

    Дадайце карыстальніцкае пашырэнне MCP і выкарыстайце гэту каманду:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Выкарыстоўвайце `cloakbrowser` у якасці назвы пашырэння і stdio у якасці транспарту.

=== «Змяшчэнне»

    У Warp адкрыйце Налады > Агенты > Серверы MCP, выберыце Дадаць, а затым устаўце:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Для ўжо запушчанага сервера Streamable HTTP выкарыстоўвайце URL-запіс:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== "Дакер"

    Выкарыстоўвайце гэта, калі ваш кліент можа запускаць лакальную каманду Docker:

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

## Праверыць

Папрасіце кліент MCP пералічыць інструменты. Вы павінны ўбачыць асноўныя інструменты браўзера Playwright MCP, а таксама:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
