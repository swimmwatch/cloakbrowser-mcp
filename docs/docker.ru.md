---
description: Запустите Docker-образ CloakBrowser MCP для воспроизводимой автоматизации браузера Playwright MCP с постоянными профилями /data, монтированием расширений и CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

Опубликованный образ представляет собой рекомендуемую среду выполнения для стабильного использования MCP.

## Запустить

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артефакты записываются в `/data` в контейнере. Подключите этот путь, чтобы сохранять скриншоты, моментальные снимки, загруженные файлы и сетевые выводы.

`--init` рекомендуется к использованию, поскольку при автоматизации работы браузера могут создаваться кратковременные дочерние процессы. Процесс инициализации Docker аккуратно завершает работу этих дочерних процессов.

Те же самые теги версий публикуются на Docker Hub как `swimmwatch/cloakbrowser-mcp`, а на GHCR — как `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Постоянные профили

Docker не включает постоянный профиль браузера по умолчанию. Используйте
существующий том `/data` как корень хранения, если хотите, чтобы cookie,
локальное хранилище, кэш или состояние расширений сохранялись после перезапуска
контейнера:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Переменные среды внутри Docker должны использовать пути контейнера, такие как
`/data/profiles/default`, а не пути хоста. Мост создает каталог профиля при
отсутствии, проверяет доступность для записи, записывает путь контейнера в
сгенерированную конфигурацию Playwright MCP и отклоняет дублирующиеся активные
каталоги профиля внутри одного серверного процесса.

## Кэш лицензии CloakBrowser

Образ хранит бинарные файлы CloakBrowser, состояние лицензии и кэш проверки в
`/home/node/.cloakbrowser`. Смонтируйте в этот каталог именованный том, чтобы
сохранять вход бесплатного уровня GitHub или Pro при замене контейнера:

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

Используйте тот же том с исходной командой `info` или `logout`, чтобы проверить
или удалить сохраненный вход. Вместо этого можно передать
`CLOAKBROWSER_LICENSE_KEY` через систему управления секретами контейнера. Не
помещайте лицензионные ключи в слои образа, файлы Compose в системе контроля
версий или вывод команд, сохраняемый как свидетельство сборки.

## Расширения Chrome

Расширения Chrome требуют постоянного профиля и должны монтироваться отдельно.
Используйте пути контейнера в переменных среды, а не пути хоста. Монтирование
расширения может быть доступно только для чтения:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Используйте JSON-массив для `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, если путь
содержит запятые или при передаче нескольких каталогов расширений.
Перезапустите контейнер после изменения файлов расширений или путей расширений.

## HTTP с возможностью потоковой передачи

Для локального использования Streamable по протоколу HTTP необходимо открыть доступ к порту контейнера через loopback:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для прямого подключения по HTTPS из контейнера смонтируйте файлы сертификатов и выберите HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Привязка `127.0.0.1:3000` на стороне хоста обеспечивает локальность конечной точки. Если вы публикуете Streamable HTTP на интерфейсе, отличном от loopback, используйте HTTPS с аутентификацией или разместите сервер за доверенным обратным прокси-сервером с терминацией TLS, аутентификацией и средствами управления сетью.
Streamable HTTP предоставляет фиксированные пробы `GET /healthz` и `GET /readyz` на одном и том же хосте и порту. Если настроены `--http-auth-token` или `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, пробы должны использовать тот же заголовок `Authorization: Bearer ...`, что и запросы MCP.
См. сгенерированное [Руководство по CLI](generated/cli.md) для ознакомления со всеми флагами HTTP-транспорта и переменными среды.

## Сопоставление прокси-серверов по GeoIP

Docker использует те же переменные среды прокси и GeoIP, что и npm. Включите
сопоставление прокси по GeoIP, если региональному отделу контроля качества требуется, чтобы отпечатки часового пояса, языка и
локали CloakBrowser соответствовали настроенному местоположению прокси:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Для прокси-серверов, требующих аутентификации, встройте учетные данные в URL-адрес прокси и закодируйте специальные символы в имени пользователя или пароле с помощью кодировки «процент»
.

Поддерживаемые бинарные файлы CloakBrowser используют встроенную
аутентификацию прокси в URL; старые бинарные файлы переходят на объект прокси
Playwright.

Когда контейнер запускает Streamable HTTP, клиенты также могут выбирать различные
прокси для каждого сеанса MCP с помощью метаданных `initialize`. См.
[Сопоставление прокси по GeoIP](geoip-proxy-matching.md) для получения информации о метаданных прокси во время выполнения,
сценариях использования в нескольких регионах и ограничениях.

## Значения по умолчанию

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
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

## Настройки клиента MCP

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

## Сборка локально

```bash
npm run docker:build
npm run docker:smoke
```

Файл Dockerfile использует зафиксированный официальный образ Playwright MCP в качестве базы для среды выполнения, применяет доступные обновления безопасности Debian во время сборки, удаляет неиспользуемые глобальные компоненты npm из образа среды выполнения и устанавливает мост под именем `/opt/cloakbrowser-mcp`.

В рамках рабочего процесса выпуска публикуются SBOM и сертификаты происхождения, добавляются метки OCI, содержащие информацию об источнике, ревизии, версии, лицензии, названии базового образа и хеше базового образа, а также перед публикацией выполняется сканирование скомпилированного образа с помощью Trivy.

## Дополнительные практические сценарии

Для выбора между upstream Playwright MCP и этим пакетом используйте [сравнение](comparison.md). Для быстрых задач используйте [рецепты](recipes/index.md): постоянный профиль, расширения, reverse proxy, региональное QA, Claude Desktop, Codex CLI и smoke-тест CI.
