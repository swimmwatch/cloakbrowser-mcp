---
description: Запустите Docker-образ CloakBrowser MCP для воспроизводимой автоматизации браузера Playwright MCP с постоянными профилями /data, монтированием расширений и CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

Опубликованный образ представляет собой рекомендуемую среду выполнения для стабильного использования MCP.

Для краткого развёртывания уже работающего HTTP-сервера за TLS и аутентификацией используйте [рецепт Docker Streamable HTTP с обратным прокси](recipes/docker-streamable-http-reverse-proxy.md).

## Запустить

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артефакты записываются в `/data` в контейнере. Подключите этот путь, чтобы сохранять скриншоты, моментальные снимки, загруженные файлы и сетевые выводы.

Образ уже запускает Tini как PID 1 и subreaper, поэтому обычным командам не требуется дополнительный init-процесс Docker.

Те же самые теги версий публикуются на Docker Hub как `swimmwatch/cloakbrowser-mcp`, а на GHCR — как `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Сессии с графическим интерфейсом и виртуальный дисплей { #headed-sessions-and-virtual-display }

В образе по умолчанию задано `PLAYWRIGHT_MCP_HEADLESS=true`; сессии без графического интерфейса не запускают Xvfb. Когда сессия запрашивает `headless: false`, launcher по требованию запускает один приватный для контейнера дисплей Xvfb, ожидает его готовности и сохраняет его до завершения контейнера. Одновременные HTTP-сессии с графическим интерфейсом используют этот дисплей совместно, при этом их контексты браузера Playwright, страницы, профили и артефакты остаются изолированными.

Для stdio-сессии с графическим интерфейсом задайте стандартную переменную Playwright MCP:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Это не видимый рабочий стол и не сервис передачи графического интерфейса: образ не предоставляет VNC, noVNC, RDP, доступ к X11 хоста или захват экрана. Не считайте нативный фокус X11, буфер обмена или захват экрана границами изоляции арендаторов. Launcher останавливает дисплей при завершении работы; ошибка запуска или завершение MCP CLI останавливает контейнер, а не оставляет работающий мост.

За пределами этого образа браузеру с графическим интерфейсом по-прежнему требуется рабочая среда отображения. Задайте `PLAYWRIGHT_MCP_HEADLESS=true`, если дисплей недоступен.

## Состояние контейнера и ограниченная среда выполнения { #container-health-and-restricted-runtime }

Docker `HEALTHCHECK` использует приватный Unix-сокет и активно проверяет, отвечает ли цикл событий MCP CLI. Если Xvfb был запущен, проверяется также дисплей X11; контейнер без графического интерфейса, в котором дисплей никогда не запрашивался, остаётся healthy. Запуск, остановка или сбой дисплея означает unhealthy. Ответ X11 проверяется в пределах 1 секунды, ответ CLI — 750 миллисекунд, приватный запрос проверки состояния — 2,5 секунды, а Docker завершает одну команду проверки через 3 секунды. При интервале Docker 2 секунды и двух повторных попытках переходы состояния зависят от планирования Docker и не являются целевым уровнем доступности сервиса. Эта проверка отделена от публичных HTTP-точек `/healthz` и `/readyz` и никогда не передаёт трафик через MCP stdio. Она не доказывает работоспособность браузера, MCP-сессии или удалённого сайта; перезапуском и восстановлением управляет внешний оркестратор.

Launcher даёт каждому дочернему процессу до 8 секунд на завершение после `SIGTERM`, затем до 2 секунд после `SIGKILL`; тайм-аут остановки Docker должен учитывать последовательное завершение CLI и Xvfb. Образ работает от непривилегированного пользователя `node` и допускает корневую файловую систему только для чтения. Сохраните монтирование `/data` для артефактов и предоставьте временные монтирования с доступом на запись для `/tmp` и `/tmp/.X11-unix`, если возможны сессии с графическим интерфейсом. Сокет проверки состояния доступен только владельцу (`0600`). Локальный X11-сокет контейнера используется совместно процессом `node` и Xvfb, поэтому он не является границей изоляции арендаторов. Не монтируйте ни один из этих сокетов с хоста и не предоставляйте их совместно нескольким контейнерам.

## Постоянные профили { #persistent-profiles }

Docker не включает постоянный профиль браузера по умолчанию. Используйте
существующий том `/data` как корень хранения, если хотите, чтобы cookie,
локальное хранилище, кэш или состояние расширений сохранялись после перезапуска
контейнера:

```bash
docker run --rm -i \
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

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Используйте тот же том с исходной командой `info` или `logout`, чтобы проверить
или удалить сохраненный вход. Вместо этого можно передать
`CLOAKBROWSER_LICENSE_KEY` через систему управления секретами контейнера. Не
помещайте лицензионные ключи в слои образа, файлы Compose в системе контроля
версий или вывод команд, сохраняемый как свидетельство сборки.

## Пользовательский бинарный файл CloakBrowser

Смонтируйте совместимый исполняемый файл браузера в контейнер и передайте путь
внутри контейнера через `--binary-path` (или `CLOAKBROWSER_BINARY_PATH`):

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

Файл должен быть доступным для чтения исполняемым файлом Linux, совместимым с
архитектурой CPU образа; необходимые ему библиотеки должны быть доступны в
контейнере. Этот путь действует для всех Streamable HTTP-сессий контейнера; для
разных бинарных файлов браузера запускайте отдельные контейнеры.

## Расширения Chrome { #chrome-extensions }

Расширения Chrome требуют постоянного профиля и должны монтироваться отдельно.
Используйте пути контейнера в переменных среды, а не пути хоста. Монтирование
расширения может быть доступно только для чтения:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Используйте JSON-массив для `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, если путь
содержит запятые или при передаче нескольких каталогов расширений.
Перезапустите контейнер после изменения файлов расширений или путей расширений.

Режим подключения Playwright Extension отличается от монтирования распакованного расширения выше. Он требует официального расширения в persistent Chrome/Edge profile и `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Монтируйте каждую profile в отдельный writable path, передавайте token через secret manager и не сочетайте `PLAYWRIGHT_MCP_EXTENSION=true` с `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP с возможностью потоковой передачи { #streamable-http }

Для локального использования Streamable по протоколу HTTP необходимо открыть доступ к порту контейнера через loopback:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для HTTP-сессий с графическим интерфейсом задайте контейнеру `PLAYWRIGHT_MCP_HEADLESS=false`. Отдельные запросы initialize всё ещё могут выбирать режим без графического интерфейса через поддерживаемые метаданные MCP.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Для прямого подключения по HTTPS из контейнера смонтируйте файлы сертификатов и выберите HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Привязка `127.0.0.1:3000` на стороне хоста обеспечивает локальность конечной точки. Если вы публикуете Streamable HTTP на интерфейсе, отличном от loopback, используйте HTTPS с аутентификацией или разместите сервер за доверенным обратным прокси-сервером с терминацией TLS, аутентификацией и средствами управления сетью.
Streamable HTTP предоставляет фиксированные пробы `GET /healthz` и `GET /readyz` на одном и том же хосте и порту. Если настроены `--http-auth-token` или `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, пробы должны использовать тот же заголовок `Authorization: Bearer ...`, что и запросы MCP.
См. сгенерированное [Руководство по CLI](generated/cli.md) для ознакомления со всеми флагами HTTP-транспорта и переменными среды.

## Управляемый CDP { #managed-cdp }

Опубликуйте настроенный управляемый диапазон CDP один к одному. Этот пример stdio включает один
сессия и удерживает каждый порт хоста привязанным к loopback:

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

`--cdp-host 0.0.0.0` требуется для переадресации портов Docker, поэтому явный
Также требуется согласие на участие `--cdp-allow-remote` и конкретный `--cdp-advertised-host`.
Не переназначайте диапазон на другие номера портов хоста: URL-адреса обнаружения содержат
Арендованный порт и каждый опубликованный порт должны маршрутизироваться один к одному к принадлежащей им сессии.

Для многосессионного Streamable HTTP настройте и опубликуйте пул, не устанавливая
процесс по умолчанию, если клиенты должны выбирать индивидуально:

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

Аутентифицированный запрос `initialize` с арендой `cdpEnabled: true` одного опубликованного
порт. Пропущенное значение наследует значение процессa по умолчанию, в то время как `cdpEnabled: false`
явно отказывается и не использует порт CDP. Истощение пула отклоняет только новый
Сессия с включённым CDP; это не уменьшает ёмкость для отключённых сессий.

Прочитайте URL, несущий возможности, из `cloakbrowser_bridge_info`. Не помещайте его внутрь
логи контейнера или проверки состояния. Подключитесь к CDP API, например
`chromium.connectOverCDP()`; URL несовместим с Playwright
`chromium.connect()` или текущий поток Open WebUI.

`--cdp-advertised-scheme https` изменяет опубликованные URL-адреса на `https`/`wss`, но
мост не обеспечивает TLS для управляемого CDP. Используйте терминатор TLS, принадлежащий оператору, который
занимает тот же заявленный порт во внешнем сетевом пространстве имен, сохраняет
`Host`/`Origin` и пересылает один к одному слушателю моста открытого текста. The
Мост к Chromium также оставляет трафик обратной петли в открытом виде.

## Сопоставление прокси-серверов по GeoIP { #geoip-proxy-matching }

Docker использует те же переменные среды прокси и GeoIP, что и npm. Включите
сопоставление прокси по GeoIP, если региональному отделу контроля качества требуется, чтобы отпечатки часового пояса, языка и
локали CloakBrowser соответствовали настроенному местоположению прокси:

```bash
docker run --rm -i \
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
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Сборка локально { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

Файл Dockerfile использует зафиксированный официальный образ Playwright MCP в качестве базы для среды выполнения, применяет доступные обновления безопасности Debian во время сборки, удаляет неиспользуемые глобальные компоненты npm из образа среды выполнения и устанавливает мост под именем `/opt/cloakbrowser-mcp`.

В рамках рабочего процесса выпуска публикуются SBOM и сертификаты происхождения, добавляются метки OCI, содержащие информацию об источнике, ревизии, версии, лицензии, названии базового образа и хеше базового образа, а также перед публикацией выполняется сканирование скомпилированного образа с помощью Trivy.

## Дополнительные практические сценарии

Для выбора между upstream Playwright MCP и этим пакетом используйте [сравнение](comparison.md). Для быстрых задач используйте [рецепты](recipes/index.md): постоянный профиль, расширения, reverse proxy, региональное QA, Claude Desktop, Codex CLI и smoke-тест CI.
