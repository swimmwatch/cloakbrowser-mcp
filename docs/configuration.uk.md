---
description: Конфігурація середовища виконання для моста Playwright MCP, включно зі Streamable HTTP-сеансами, постійними профілями, перевіреними параметрами контексту, шляхами розширень, зіставленням проксі за GeoIP та гуманізованим введенням.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Налаштування

Використовуйте вхідні змінні `PLAYWRIGHT_MCP_*` для забезпечення роботи Playwright MCP. Використовуйте `CLOAK_PLAYWRIGHT_MCP_*` лише для поведінки мосту, характерної для Cloak.

Старі змінні `CLOAKBROWSER_MCP_*` не підтримуються.
Створений [Довідник CLI](generated/cli.md) є авторитетним переліком прапорів CLI мосту та відповідних їм змінних середовища.

## Варіанти мостів

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
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог постійного профілю Chromium. Міст перетворює його на абсолютний шлях, створює за відсутності, перевіряє доступність для запису та записує у згенероване `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-об'єкт із перевіреними параметрами контексту. Підтримувані поля перелічено нижче. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-масив або список через кому з наявними каталогами розширень Chrome. Потребує `PLAYWRIGHT_MCP_USER_DATA_DIR`. Використовуйте JSON-масиви для шляхів Windows або шляхів із комами. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Збіг проксі-серверів за GeoIP

Встановити `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` разом із `PLAYWRIGHT_MCP_PROXY_SERVER`
для визначення прапорців часового поясу, мови та локалі CloakBrowser на основі
розташування проксі-сервера. Міст залишає маршрутизацію проксі-сервера за делегованим вищестоящим Playwright
MCP, і лише вводить вирішені прапори запуску `--fingerprint-timezone`, `--lang` та
`--fingerprint-locale`.

Див. [Збіг проксі-серверів за GeoIP](geoip-proxy-matching.md) для ознайомлення з прикладами налаштування, метаданими
HTTP-проксі-серверів, що підтримують потокову передачу даних під час виконання, сценаріями використання, правилами пріоритетності та обмеженнями.

## Гуманізована поведінка при введенні даних

Встановіть `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, щоб увімкнути в CloakBrowser імітацію
миші, клавіатури та прокрутки для взаємодії зі сторінками. Міст застосовує це
через хук ініціалізації сторінки Playwright MCP, тому схеми інструментів браузера
вищого рівня залишаються незмінними.

Див. [«Гуманізована поведінка введення даних»](humanized-input-behavior.md) для ознайомлення з прикладами налаштування,
метаданими Streamable HTTP під час виконання, сценаріями використання та обмеженнями.

## Розширення Chrome

Розширення Chrome завантажуються під час запуску браузера, тому налаштуйте їх
до запуску мосту або до створення сеансу Streamable HTTP. Розширення мають бути
розпакованими каталогами та потребують постійного профілю:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP передайте каталоги профілю та розширення в метаданих
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

Перезапустіть міст або створіть новий HTTP-сеанс після зміни файлів розширень
або шляхів розширень. Використовуйте JSON-масив для
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, коли шляхи містять коми, під час
передавання кількох розширень або під час використання шляхів Windows із
літерами дисків.

## Метадані середовища виконання Streamable HTTP

HTTP-клієнти з підтримкою потокової передачі можуть вибирати певні параметри виконання для кожного сеансу MCP, додаючи
метадані, специфічні для мосту, до запиту `initialize`:

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

`proxyServer` замінює `PLAYWRIGHT_MCP_PROXY_SERVER` для цієї сесії HTTP.
`proxyBypass` замінює `PLAYWRIGHT_MCP_PROXY_BYPASS` лише тоді, коли `proxyServer`
присутній. `geoipProxyMatch` може ввімкнути або вимкнути зіставлення за GeoIP для цієї сесії
без перезапуску сервера MCP. Існуючі сесії зберігають свій проксі-сервер запуску;
для зміни місцезнаходження створіть нову HTTP-сесію.

`humanize` може ввімкнути або вимкнути гуманізовану поведінку введення даних для цієї сесії,
не впливаючи на інші сесії. `humanPreset` дозволяє вибрати `default` або `careful`
для цієї сесії, але сам по собі не вмикає гуманізовану поведінку. Існуючі
сесії зберігають поведінку, зафіксовану під час `initialize`.

`headless` дозволяє ввімкнути або вимкнути режим браузера без графічного інтерфейсу для даного сеансу. Для зміни значення
`headless` на `false` необхідне робоче середовище з дисплеєм, особливо при
розгортаннях у Docker або на серверах під управлінням Linux.

`userDataDir` вмикає постійний профіль Chromium для цієї сесії та
перевизначає `PLAYWRIGHT_MCP_USER_DATA_DIR`. Міст перетворює каталог на
абсолютний шлях у форматі поточної платформи, створює його за відсутності,
перевіряє доступність для запису та записує у згенероване
`browser.userDataDir`. Постійний профіль вимикає стандартний ізольований
профіль Streamable HTTP для цієї сесії. Міст відхиляє дубльовані активні
каталоги профілю в межах одного процесу; конфлікти профілів між процесами
залишаються помилками Chromium/Playwright.

`contextOptions` перевіряються та поверхнево об'єднуються поверх
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; вкладені об'єкти замінюються цілком.
Підтримувані поля: `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` і `hasTouch`. Довільна передача `BrowserContextOptions` у цьому
випуску не підтримується.

`extensionPaths` мають указувати на наявні каталоги та потребують постійного
`userDataDir`. Міст перетворює шляхи розширень на абсолютні шляхи поточної
платформи, передає їх у CloakBrowser і записує згенеровані Chromium-аргументи
`--load-extension` і `--disable-extensions-except` у згенеровану конфігурацію
Playwright MCP.

Повноваження проксі-сервера HTTP з автентифікацією можна вбудувати в `proxyServer`, наприклад,
`http://user:pass@proxy.example:8080`. Символи облікових даних,
які мають значення в URL-адресі, слід кодувати у форматі «процент», наприклад `@`, `:`, `/`, `?`, `#`, та `%`.

Щодо моделей контролю якості для декількох локацій див. [GeoIP Proxy Matching](geoip-proxy-matching.md).
Щодо шаблонів реалістичності взаємодії див. [Humanized Input Behavior](humanized-input-behavior.md).

## Варіанти вибору джерела

Міст передає налаштування `PLAYWRIGHT_MCP_*` до верхнього рівня Playwright MCP. Сюди входять такі параметри верхнього рівня, як:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

Повний перелік опцій, що надаються розробниками Playwright MCP, дивіться в їхній документації.

## Ведення журналу

У режимі Streamable HTTP журнали запуску та запитів, зрозумілі для людини, записуються у stdout. У режимі stdio рутинні операційні журнали не виводяться, тому stdout MCP JSON-RPC залишається «чистим» з точки зору протоколу. Помилки запуску CLI, що призводять до збою, як і раніше, записуються у stderr.

## HTTPS

Streamable HTTP за замовчуванням використовує локальний HTTP. Виберіть прямий TLS із `--http-protocol https` або `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, а потім надайте пару сертифікат/ключ або файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для зовнішнього доступу або доступу без використання функції loopback використовуйте протокол HTTPS разом із `--http-auth-token` або завершуйте з’єднання TLS на надійному зворотньому проксі-сервері, який також забезпечує аутентифікацію та контроль доступу до мережі.

## Сесії HTTP, що підтримують потокову передачу даних

Кожен сеанс Streamable HTTP MCP має власне середовище виконання мосту та дочірній процес Playwright MCP, що працює вище за ланцюгом. Сеанси HTTP запускають Playwright MCP з ізольованим профілем браузера, щоб одночасні користувачі не змагалися за один і той самий постійний профіль Chromium. Вбудований бекенд сеансів `memory` зберігає лише метадані, такі як ідентифікатор сеансу, мітки часу, термін дії та статус. Стан браузера зберігається в активному дочірньому процесі, а артефакти як і раніше контролюються `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для горизонтального масштабування запустіть кілька реплік сервера за балансувальником навантаження з використанням «прив’язаних» сесій, що ідентифікуються за заголовком `mcp-session-id`. Майбутні бекенди Redis, Postgres або SQLite зможуть координувати метадані та блокування, але вони не зможуть відновити активну сесію браузера після завершення процесу, якому вона належить.

## HTTP-зонди, що підтримують потокову передачу даних

Коли міст працює з `--transport streamable-http`, він надає доступ до фіксованих кінцевих точок зондування на тому самому хості та порту, що й кінцева точка MCP:

- `GET /healthz` повертає метадані про стан процесу: `status`, `version`, `transport` та `uptimeMs`.
- `GET /readyz` повертає метадані готовності та ємність сеансу: `sessions.active`, `sessions.pending`, `sessions.max` та `sessions.available`.

Функція готовності повертає HTTP `200`, поки є вільні ресурси сеансу, та HTTP `503`, коли `active + pending >= max`.
Якщо налаштовано `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, обидва зонди вимагають того самого заголовка `Authorization: Bearer ...`, що й запити MCP. Без токена автентифікації зонди відкриті на налаштованій адресі прив'язки HTTP.
