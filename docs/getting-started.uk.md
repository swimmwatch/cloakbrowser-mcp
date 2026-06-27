---
description: Встановіть та запустіть CloakBrowser MCP з npm або Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Початок роботи

Використовуйте опублікований пакет npm або образ Docker. Встановлення з вихідного коду потрібне лише для розробки.

Виберіть npm, якщо ваш клієнт MCP вже працює на вашому комп’ютері та на ньому встановлено Node.js. Виберіть Docker, якщо вам потрібне відтворюване середовище виконання з базовим образом Playwright MCP від авторів та кешем CloakBrowser, підготовленим усередині контейнера.

Щоб швидко ознайомитися з поширеними питаннями щодо налаштування, перейдіть до розділу [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Додайте реліз до списку, якщо важлива відтворюваність:

```bash
npx -y cloakbrowser-mcp@1.4.0
```

Для роботи цього пакета npm необхідна версія Node.js 22.12 або новіша. CloakBrowser завантажує свій бінарний файл Chromium під час першого запуску, якщо він ще не збережений у кеші.

Використовуйте `doctor` для перевірки локального середовища виконання Node.js, метаданих пакета, правильності визначення CLI Playwright MCP з вихідного коду та метаданих бінарного файлу CloakBrowser перед підключенням клієнта. Ця команда не запускає міст і не завантажує браузер.

Транспортним засобом за замовчуванням є stdio. Використовуйте `--transport streamable-http`, якщо ваш клієнт MCP підключається до кінцевої точки HTTP замість запуску процесу stdio. За замовчуванням кінцевою точкою HTTP є `http://127.0.0.1:3000/mcp`, з фіксованими зондами `GET /healthz` та `GET /readyz` на тому самому хості та порту. Використовуйте `--http-protocol https` разом із `--https-cert` та `--https-key` або `--https-pfx`, якщо міст повинен безпосередньо завершувати TLS.
Повний перелік прапорів та відповідних змінних середовища наведено у згенерованому [Довіднику CLI](generated/cli.md).

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker є найбільш відтворюваним середовищем виконання, оскільки образ базується на зафіксованому офіційному образі Playwright MCP і містить готовий кеш браузера CloakBrowser. Опубліковані образи підтримують `linux/amd64` та `linux/arm64`.
Ці ж теги також опубліковано для `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Для локального HTTP-сервера Streamable з використанням Docker опублікуйте порт на петльовому інтерфейсі та прив’яжіть сервер усередині контейнера:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для прямого підключення через HTTPS із Docker підключіть файли сертифікатів і виберіть HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

У режимі Streamable HTTP URL-адреса кінцевої точки MCP, що перебуває в режимі прослуховування, та журнали запитів записуються у stdout. У режимі stdio журнали поточної роботи не виводяться, тому stdout MCP JSON-RPC залишається «чистим» від протокольних даних.

Додайте реліз до списку, якщо важлива відтворюваність:

```bash
docker pull swimmwatch/cloakbrowser-mcp:1.4.0
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:1.4.0
```

## Налаштування клієнта MCP

Більшість локальних клієнтів MCP найкраще працюють із stdio та npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Використовуйте Docker, якщо вам потрібне середовище виконання, яке можна відтворити. Залиште `-i`, щоб stdio залишалося підключеним, і додайте `--init`, щоб дочірні процеси браузера правильно завершувалися.

Для HTTP-клієнтів Streamable запустіть сервер окремо та налаштуйте URL-адресу клієнта у вигляді `http://127.0.0.1:3000/mcp` або `https://127.0.0.1:3000/mcp`. Якщо встановлено `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` або `--http-auth-token`, надішліть той самий токен Bearer на `/mcp`, `/healthz` та `/readyz`.

=== «Codex CLI»

    Зареєструйте локальний сервер stdio:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Або підключіть Codex до вже запущеного HTTP-сервера Streamable:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== «Код Клода»

    Зареєструйте локальний сервер stdio:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Або підключіть Claude Code до вже запущеного HTTP-сервера Streamable:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== «Claude Desktop»

    Додайте сервер під `mcpServers` у `claude_desktop_config.json`, а потім перезапустіть Claude Desktop:

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

=== «Cursor / Cline»

    Додайте сервер до конфігурації MCP у форматі JSON клієнта:

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

    Додати сервер до робочої області `.vscode/mcp.json` або до робочого простору на рівні користувача `mcp.json`:

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

=== «Продовжити»

    Створити `.continue/mcpServers/cloakbrowser-mcp.yaml`:

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

=== «Віндсерфінг / Каскад»

    У Windsurf відкрийте «Налаштування» > «Інструменти» > «Налаштування Windsurf» > «Додати сервер» або відредагуйте `~/.codeium/mcp_config.json`:

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

    Для вже запущеного HTTP-сервера Streamable використовуйте `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== «Гуска»

    Додайте власне розширення MCP і скористайтеся цією командою:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Вкажіть `cloakbrowser` як ім’я розширення та stdio як транспорт.

=== «Warp»

    У Warp відкрийте «Налаштування» > «Агенти» > «Сервери MCP», виберіть «Додати», а потім вставте:

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

    Для вже запущеного HTTP-сервера Streamable скористайтеся URL-адресою:

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

    Використовуйте це, коли ваш клієнт може запустити локальну команду Docker:

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

## Перевірити

Попросіть клієнт MCP перелічити інструменти. Ви повинні побачити інструменти браузера Playwright MCP з основного репозиторію, а також:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`
