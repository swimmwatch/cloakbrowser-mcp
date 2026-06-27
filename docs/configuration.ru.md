---
description: Конфигурация среды выполнения для моста Playwright MCP, включая потоковые HTTP-сессии, сопоставление прокси с учетом GeoIP и гуманизированное поведение ввода.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Настройка

Используйте переменные `PLAYWRIGHT_MCP_*` на входе для обеспечения поведения Playwright MCP. Используйте `CLOAK_PLAYWRIGHT_MCP_*` только для поведения моста, специфичного для Cloak.

Старые переменные `CLOAKBROWSER_MCP_*` не поддерживаются.
Сгенерированный [Справочник CLI](generated/cli.md) является авторитетным списком флагов CLI моста и соответствующих им переменных среды.

## Параметры моста

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Сопоставление прокси-серверов по GeoIP

Установить `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` с `PLAYWRIGHT_MCP_PROXY_SERVER`
для определения флагов часового пояса, языка и локали CloakBrowser на основе
местоположения прокси. Мост оставляет маршрутизацию прокси за верхним уровнем Playwright
MCP и вставляет только разрешенные флаги запуска `--fingerprint-timezone`, `--lang` и
`--fingerprint-locale`.

См. раздел [Сопоставление прокси-серверов по GeoIP](geoip-proxy-matching.md) для ознакомления с примерами настройки, метаданными прокси-серверов Streamable HTTP,
вариантами использования, правилами приоритета и ограничениями.

## Поведение ввода данных, приближенное к человеческому

Установите `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, чтобы включить в CloakBrowser имитирующий человеческое поведение
уровень управления мышью, клавиатурой и прокруткой для взаимодействия со страницами. Мост применяет это
через хук инициализации страницы Playwright MCP, поэтому исходные схемы браузерных инструментов
остаются неизменными.

См. раздел [«Поведение гуманизированного ввода»](humanized-input-behavior.md) для ознакомления с примерами настройки,
метаданными Streamable HTTP во время выполнения, сценариями использования и ограничениями.

## Метаданные среды выполнения Streamable HTTP

HTTP-клиенты с поддержкой потоковой передачи данных могут выбирать определенные параметры выполнения для каждого сеанса MCP, добавляя
метаданные, специфичные для моста, в запрос `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`proxyServer` переопределяет `PLAYWRIGHT_MCP_PROXY_SERVER` для данного HTTP-сеанса.
`proxyBypass` переопределяет `PLAYWRIGHT_MCP_PROXY_BYPASS` только в том случае, если `proxyServer`
имеется. `geoipProxyMatch` может включить или отключить сопоставление по GeoIP для данного сеанса
без перезапуска сервера MCP. Существующие сеансы сохраняют свой прокси-сервер запуска;
для смены местоположения необходимо создать новый HTTP-сеанс.

`humanize` может включить или отключить «гуманизированное» поведение ввода данных для данной сессии,
не затрагивая при этом другие сессии. `humanPreset` позволяет выбрать `default` или `careful`
для данной сессии, но сам по себе не включает «гуманизированное» поведение. Существующие
сессии сохраняют поведение, зафиксированное во время `initialize`.

`headless` позволяет включить или отключить режим браузера без интерфейса для данного сеанса. Для изменения значения
`headless` на `false` требуется рабочая среда с дисплеем, особенно при
развертываниях в Docker или на серверах Linux.

Учетные данные для аутентифицированного HTTP-прокси можно встроить в тег `proxyServer`, например,
`http://user:pass@proxy.example:8080`. Символы учетных данных,
имеющие значение в URL, следует кодировать в процентах, например `@`, `:`, `/`, `?`, `#` и `%`.

Шаблоны контроля качества для нескольких местоположений см. в разделе [Сопоставление прокси-серверов по GeoIP](geoip-proxy-matching.md).
Шаблоны реалистичности взаимодействия см. в разделе [Humanized Input Behavior](humanized-input-behavior.md).

## Варианты вверх по цепочке

Мост передаёт настройки `PLAYWRIGHT_MCP_*` вышестоящему модулю Playwright MCP. Сюда входят такие параметры вышестоящего модуля, как:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_USER_DATA_DIR`

Ознакомьтесь с исходной документацией по MCP для Playwright, чтобы узнать о полном наборе доступных опций.

## Ведение журнала

В режиме Streamable HTTP в stdout записываются понятные для человека журналы запуска и запросов. В режиме stdio рутинные операционные журналы не выводятся, поэтому stdout MCP JSON-RPC остается «чистым» с точки зрения протокола. Сообщения о фатальных сбоях при запуске CLI по-прежнему записываются в stderr.

## HTTPS

Streamable HTTP по умолчанию использует локальный HTTP. Выберите прямой TLS с `--http-protocol https` или `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, после чего предоставьте либо пару «сертификат/ключ», либо файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для внешнего доступа или доступа без использования loopback следует использовать протокол HTTPS в сочетании с `--http-auth-token` либо завершать соединение TLS на доверенном обратном прокси-сервере, который также обеспечивает аутентификацию и контроль доступа к сети.

## HTTP-сессии, доступные для потоковой передачи

Каждый сеанс Streamable HTTP MCP имеет собственную среду выполнения моста и дочерний процесс Playwright MCP, запущенный выше по цепочке. HTTP-сеансы запускают Playwright MCP с изолированным профилем браузера, благодаря чему одновременно работающие пользователи не конкурируют за один и тот же постоянный профиль Chromium. Встроенный бэкэнд сеансов `memory` хранит только метаданные, такие как идентификатор сеанса, временные метки, срок действия и статус. Состояние браузера сохраняется в активном дочернем процессе вышестоящего уровня, а артефакты по-прежнему управляются `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для горизонтального масштабирования запустите несколько реплик сервера за балансировщиком нагрузки с фиксированными сессиями, ключом для которых служит заголовок `mcp-session-id`. Будущие бэкэнды Redis, Postgres или SQLite смогут координировать метаданные и блокировки, но они не смогут восстановить активную сессию браузера после завершения процесса, которому она принадлежит.

## HTTP-зонды с возможностью потоковой передачи данных

Когда мост работает с `--transport streamable-http`, он предоставляет фиксированные конечные точки проб на том же хосте и порту, что и конечная точка MCP:

- `GET /healthz` возвращает метаданные о работоспособности процесса: `status`, `version`, `transport` и `uptimeMs`.
- `GET /readyz` возвращает метаданные о готовности и емкость сеанса: `sessions.active`, `sessions.pending`, `sessions.max` и `sessions.available`.

При наличии свободных ресурсов сессии возвращается HTTP-ответ `200`, а при наличии `503`, если `active + pending >= max`.
Если настроены `--http-auth-token` или `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, оба зонда требуют того же заголовка `Authorization: Bearer ...`, что и запросы MCP. Без токена аутентификации пробы открыты на настроенном адресе привязки HTTP.
