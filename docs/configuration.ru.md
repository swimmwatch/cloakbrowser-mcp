---
description: Конфигурация среды выполнения для моста Playwright MCP, включая Streamable HTTP-сессии, постоянные профили, проверенные параметры контекста, пути расширений, сопоставление прокси по GeoIP и гуманизированный ввод.
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
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог постоянного профиля Chromium. Мост преобразует его в абсолютный путь, создает при отсутствии, проверяет доступность для записи и записывает в сгенерированное `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-объект с проверенными параметрами контекста. Поддерживаемые поля перечислены ниже. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-массив или список через запятую с существующими каталогами расширений Chrome. Требует `PLAYWRIGHT_MCP_USER_DATA_DIR`. Используйте JSON-массивы для путей Windows или путей с запятыми. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Лицензия CloakBrowser и вход через GitHub

Для настройки лицензии используется CLI исходного проекта CloakBrowser;
`cloakbrowser-mcp` не добавляет команды входа или выхода:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

Команда `login` принимает платный ключ или запускает вход через GitHub для
получения ключа бесплатного уровня. Проверенный ключ сохраняется в
`~/.cloakbrowser/license.key`; команда `logout` удаляет этот файл. Команда
`info` сообщает активный уровень лицензии, а для лицензий Pro — количество
активных сеансов.

Вместо этого можно задать `CLOAKBROWSER_LICENSE_KEY` в окружении MCP-сервера.
Мост передает эту переменную дочернему процессу верхнего уровня/браузера, не
записывая ее в журнал. Если `CLOAKBROWSER_CACHE_DIR` указывает на
пользовательский кэш с файлом `license.key`, CloakBrowser разрешает ключ, а мост
передает из сгенерированного окружения браузера только этот разрешенный ключ.
Другие сгенерированные записи окружения не копируются.

## Сопоставление прокси-серверов по GeoIP

Установите `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` вместе с
`PLAYWRIGHT_MCP_PROXY_SERVER`, чтобы определить флаги часового пояса, языка и
локали CloakBrowser по местоположению выхода прокси. Для поддерживаемых бинарных
файлов CloakBrowser выбирает встроенную аутентификацию в URL, а для старых
бинарных файлов сохраняет объект прокси Playwright как резервный вариант.

См. раздел [Сопоставление прокси-серверов по GeoIP](geoip-proxy-matching.md) для ознакомления с примерами настройки, метаданными прокси-серверов Streamable HTTP,
вариантами использования, правилами приоритета и ограничениями.

## Поведение ввода данных, приближенное к человеческому

Установите `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, чтобы включить в CloakBrowser имитирующий человеческое поведение
уровень управления мышью, клавиатурой и прокруткой для взаимодействия со страницами. Мост применяет это
через хук инициализации страницы Playwright MCP, поэтому исходные схемы браузерных инструментов
остаются неизменными.

См. раздел [«Поведение гуманизированного ввода»](humanized-input-behavior.md) для ознакомления с примерами настройки,
метаданными Streamable HTTP во время выполнения, сценариями использования и ограничениями.

## Расширения Chrome

Расширения Chrome загружаются при запуске браузера, поэтому настройте их до
запуска моста или до создания сеанса Streamable HTTP. Расширения должны быть
распакованными каталогами и требуют постоянного профиля:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP передайте каталоги профиля и расширения в метаданных
`initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "userDataDir": "/absolute/path/to/profile",
        "extensionPaths": ["/absolute/path/to/my-extension"]
      }
    }
  }
}
```

Перезапустите мост или создайте новый HTTP-сеанс после изменения файлов
расширений или путей расширений. Используйте JSON-массив для
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, если пути содержат запятые, при
передаче нескольких расширений или при использовании путей Windows с буквами
дисков.

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
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
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

`userDataDir` включает постоянный профиль Chromium для этой сессии и
переопределяет `PLAYWRIGHT_MCP_USER_DATA_DIR`. Мост преобразует каталог в
абсолютный путь в формате текущей платформы, создает его при отсутствии,
проверяет доступность для записи и записывает его в сгенерированное
`browser.userDataDir`. Постоянный профиль отключает стандартный изолированный
профиль Streamable HTTP для этой сессии. Мост отклоняет дублирующиеся активные
каталоги профиля внутри одного процесса; конфликты профилей между процессами
остаются ошибками Chromium/Playwright.

`contextOptions` проверяются и поверхностно объединяются поверх
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; вложенные объекты заменяются целиком.
Поддерживаемые поля: `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` и `hasTouch`. Произвольная передача `BrowserContextOptions` в этом
релизе не поддерживается.

`extensionPaths` должны указывать на существующие каталоги и требуют постоянный
`userDataDir`. Мост преобразует пути расширений в абсолютные пути текущей
платформы, передает их в CloakBrowser и записывает сгенерированные Chromium
аргументы `--load-extension` и `--disable-extensions-except` в сгенерированную
конфигурацию Playwright MCP.

Учетные данные для аутентифицированного HTTP-прокси можно встроить в тег `proxyServer`, например,
`http://user:pass@proxy.example:8080`. Символы учетных данных,
имеющие значение в URL, следует кодировать в процентах, например `@`, `:`, `/`, `?`, `#` и `%`.

В поддерживаемых бинарных файлах CloakBrowser аутентифицированные HTTP-прокси
используют встроенную аутентификацию в URL, а мост удаляет дублирующий объект
прокси Playwright. Старые бинарные файлы сохраняют объект прокси Playwright как
резервный вариант совместимости.

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

## Дополнительные практические сценарии

Для выбора между upstream Playwright MCP и этим пакетом используйте [сравнение](comparison.md). Для быстрых задач используйте [рецепты](recipes/index.md): постоянный профиль, расширения, reverse proxy, региональное QA, Claude Desktop, Codex CLI и smoke-тест CI.
