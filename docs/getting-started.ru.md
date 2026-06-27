---
description: Установите и запустите CloakBrowser MCP с помощью npm или Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Начало работы

Используйте опубликованный пакет npm или образ Docker. Установка из исходного кода требуется только для разработки.

Выберите npm, если клиент MCP уже запущен на вашем компьютере и установлен Node.js. Выберите Docker, если вам нужна воспроизводимая среда выполнения с базовым образом Playwright MCP из исходного репозитория и кэшем CloakBrowser, подготовленным внутри контейнера.

Чтобы быстро ознакомиться с ответами на типичные вопросы по настройке, см. [Часто задаваемые вопросы](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Закрепите релиз, если важна воспроизводимость:

```bash
npx -y cloakbrowser-mcp@1.4.0
```

Для работы этого пакета npm требуется Node.js версии 22.12 или более поздней. При первом запуске CloakBrowser загружает бинарный файл Chromium, если он ещё не находится в кэше.

Используйте `doctor` для проверки локальной среды выполнения Node.js, метаданных пакета, определения версии исходного CLI Playwright MCP и метаданных бинарного файла CloakBrowser перед подключением клиента. Эта команда не запускает мост и не загружает браузер.

Транспортным каналом по умолчанию является stdio. Используйте `--transport streamable-http`, если ваш клиент MCP подключается к HTTP-конечной точке вместо запуска процесса stdio. По умолчанию конечной точкой HTTP является `http://127.0.0.1:3000/mcp`, с фиксированными зондами `GET /healthz` и `GET /readyz` на одном и том же хосте и порту. Используйте `--http-protocol https` вместе с `--https-cert` и `--https-key` или `--https-pfx`, если мост должен завершать соединение TLS напрямую.
См. сгенерированное [руководство по CLI](generated/cli.md) для полного списка флагов и соответствующих переменных среды.

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker является наиболее воспроизводимой средой выполнения, поскольку образ основан на зафиксированном официальном образе Playwright MCP и включает в себя подготовленный кэш браузера CloakBrowser. Опубликованные образы поддерживают `linux/amd64` и `linux/arm64`.
Те же теги также опубликованы в `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Для локального HTTP-сервера Streamable с использованием Docker необходимо открыть порт на loopback и привязать сервер внутри контейнера:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для прямого подключения по HTTPS из Docker подключите файлы сертификатов и выберите HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

В режиме Streamable HTTP URL-адрес конечной точки MCP, находящейся в режиме прослушивания, а также журналы запросов записываются в stdout. В режиме stdio текущие операционные журналы не выводятся, поэтому stdout MCP JSON-RPC остается «чистым» с точки зрения протокола.

Закрепите релиз, если важна воспроизводимость:

```bash
docker pull swimmwatch/cloakbrowser-mcp:1.4.0
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:1.4.0
```

## Настройки клиента MCP

Большинство локальных клиентов MCP наиболее эффективно работают с stdio и npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Используйте Docker, если вам нужна воспроизводимая среда выполнения. Сохраните `-i`, чтобы stdio оставалось подключенным, и добавьте `--init`, чтобы дочерние процессы браузера правильно завершались.

Для HTTP-клиентов Streamable запустите сервер отдельно и настройте URL-адрес клиента в виде `http://127.0.0.1:3000/mcp` или `https://127.0.0.1:3000/mcp`. Если установлен параметр `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` или `--http-auth-token`, отправьте тот же токен Bearer в `/mcp`, `/healthz` и `/readyz`.

=== «Codex CLI»

    Зарегистрируйте локальный сервер stdio:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Или подключите Codex к уже запущенному HTTP-серверу Streamable:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== «Код Клода»

    Зарегистрируйте локальный сервер stdio:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Или подключите Claude Code к уже запущенному HTTP-серверу Streamable:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== «Claude Desktop»

    Добавьте сервер под `mcpServers` в `claude_desktop_config.json`, а затем перезапустите Claude Desktop:

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

=== «Курсор / Клайн»

    Добавьте сервер в конфигурацию MCP клиента в формате JSON:

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

=== «VS Code»

    Добавить сервер в рабочую область `.vscode/mcp.json` или в рабочую область на уровне пользователя `mcp.json`:

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

=== «Продолжить»

    Создать `.continue/mcpServers/cloakbrowser-mcp.yaml`:

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

=== «Виндсерфинг / Каскад»

    В Windsurf откройте «Настройки» > «Инструменты» > «Настройки Windsurf» > «Добавить сервер» или отредактируйте `~/.codeium/mcp_config.json`:

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

    Для уже запущенного HTTP-сервера Streamable используйте `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== «Гусь»

    Добавьте пользовательское расширение MCP и выполните следующую команду:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    В качестве имени расширения используйте `cloakbrowser`, а в качестве транспорта — stdio.

=== «Warp»

    В Warp откройте «Настройки» > «Агенты» > «Серверы MCP», выберите «Добавить», а затем вставьте:

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

    Для уже запущенного HTTP-сервера Streamable используйте URL-адрес:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== «Docker»

    Используйте это, если ваш клиент может запустить локальную команду Docker:

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

## Проверить

Попросите клиент MCP вывести список инструментов. Вы должны увидеть стандартные браузерные инструменты Playwright MCP, а также:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
