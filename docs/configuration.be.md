---
description: Канфігурацыя асяроддзя выканання для моста Playwright MCP, уключаючы Streamable HTTP-сеансы, пастаянныя профілі, правераныя параметры кантэксту, шляхі пашырэнняў, супастаўленне проксі па GeoIP і чалавекападобны ўвод.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Канфігурацыя

Выкарыстоўвайце зменныя `PLAYWRIGHT_MCP_*` з верхняга патоку для паводзін MCP Playwright. Выкарыстоўвайце `CLOAK_PLAYWRIGHT_MCP_*` толькі для спецыфічнага паводзін маста Cloak.

Старыя зменныя `CLOAKBROWSER_MCP_*` не падтрымліваюцца.
Згенераваны [Даведнік па CLI](generated/cli.md) з'яўляецца афіцыйным спісам сцягоў CLI маста і адпаведных ім зменных асяроддзя.

## Параметры маста

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
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог пастаяннага профілю Chromium. Мост пераўтварае яго ў абсалютны шлях, стварае пры адсутнасці, правярае доступ на запіс і запісвае ў згенераванае `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-аб'ект з праверанымі параметрамі кантэксту. Падтрыманыя палі пералічаны ніжэй. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-масіў або спіс праз коску з існуючымі каталогамі пашырэнняў Chrome. Патрабуе `PLAYWRIGHT_MCP_USER_DATA_DIR`. Выкарыстоўвайце JSON-масівы для шляхоў Windows або шляхоў з коскамі. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Супастаўленне GeoIP-праксі

Усталюйце `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` з `PLAYWRIGHT_MCP_PROXY_SERVER`
каб атрымаць флагi адбітку пальцаў CloakBrowser для часавага пояса, мовы і лакалі з месцазнаходжання праксі. Мост захоўвае маршрутызацыю праксі, дэлегаваную верхняму Playwright
MCP і ўстаўляе толькі разблакіраваныя `--fingerprint-timezone`, `--lang`, і
`--fingerprint-locale` сцягі запуску.

Глядзіце [GeoIP Proxy Matching](geoip-proxy-matching.md) для прыкладаў наладкі, працоўнага часу
Метаданыя струменевага HTTP-праксі, выпадкі выкарыстання, правілы прыярытэту і абмежаванні.

## Ачалавечанае паводзіны ўводу

Усталюйце `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` каб уключыць для ўзаемадзеяння з старонкай у CloakBrowser пласт мышы, клавіятуры і пракруткі, падобны да чалавечага. Масток прымяняе гэта праз хук ініцыялізацыі старонкі Playwright MCP, таму схемы інструментаў браўзера зыходнага кода застаюцца без змен.

Глядзіце [Humanized Input Behavior](humanized-input-behavior.md) для прыкладаў наладкі, метаданых HTTP Streamable у часе выканання, выпадкаў выкарыстання і абмежаванняў.

## Пашырэнні Chrome

Пашырэнні Chrome загружаюцца пры запуску браўзера, таму наладзьце іх да запуску
моста або да стварэння сеанса Streamable HTTP. Пашырэнні павінны быць
распакаванымі каталогамі і патрабуюць пастаяннага профілю:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP перадайце каталогі профілю і пашырэння ў метаданых
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

Перазапусціце мост або стварыце новы HTTP-сеанс пасля змены файлаў пашырэнняў
або шляхоў пашырэнняў. Выкарыстоўвайце JSON-масіў для
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, калі шляхі змяшчаюць коскі, пры
перадачы некалькіх пашырэнняў або пры выкарыстанні шляхоў Windows з літарамі
дыскаў.

Метаданыя выканання HTTP для струменевага перадавання

Стрымеблыя HTTP-кліенты могуць выбраць пэўныя опцыі выканання для кожнай MCP-сесіі, дадаючы метаданыя, спецыфічныя для брыджа, у запыт `initialize`:

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

`proxyServer` перавышае `PLAYWRIGHT_MCP_PROXY_SERVER` для гэтай HTTP-сесіі.
`proxyBypass` перавышае `PLAYWRIGHT_MCP_PROXY_BYPASS` толькі калі `proxyServer`
прысутнічае. `geoipProxyMatch` можа ўключыць або выключыць супастаўленне GeoIP для гэтай сесіі без перазапуску сервера MCP. Існуючыя сесіі захоўваюць свой пачатковы праксі; стварыце новую HTTP-сесію, каб змяніць месцазнаходжанне.

`humanize` дазваляе ўключыць або выключыць адаптаванае для чалавека ўвядзенне для гэтай сесіі, не змяняючы іншыя сесіі. `humanPreset` можа выбраць `default` або `careful` для гэтай сесіі, але сама па сабе не ўключае гуманізаваную паводзіны. Існуючыя сесіі захоўваюць паводзіны, зафіксаваныя падчас `initialize`.

`headless` можа ўключыць або выключыць рэжым бяздысплейнага браўзера для гэтай сесіі. Усталяванне `headless` на `false` патрабуе прыдатнага асяроддзя адлюстравання, асабліва ў
разгортваннях Docker або сервераў Linux.

`userDataDir` уключае пастаянны профіль Chromium для гэтай сесіі і
перавызначае `PLAYWRIGHT_MCP_USER_DATA_DIR`. Мост пераўтварае каталог у
абсалютны шлях у фармаце бягучай платформы, стварае яго пры адсутнасці,
правярае доступ на запіс і запісвае ў згенераванае `browser.userDataDir`.
Пастаянны профіль адключае стандартны ізаляваны профіль Streamable HTTP для
гэтай сесіі. Мост адхіляе дубліраваныя актыўныя каталогі профілю ўнутры аднаго
працэсу; канфлікты профіляў паміж працэсамі застаюцца памылкамі
Chromium/Playwright.

`contextOptions` правяраюцца і павярхоўна аб'ядноўваюцца з
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; укладзеныя аб'екты замяняюцца цалкам.
Падтрыманыя палі: `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` і `hasTouch`. Адвольная перадача `BrowserContextOptions` у гэтым
рэлізе не падтрымліваецца.

`extensionPaths` павінны паказваць на існуючыя каталогі і патрабуюць пастаянны
`userDataDir`. Мост пераўтварае шляхі пашырэнняў у абсалютныя шляхі бягучай
платформы, перадае іх у CloakBrowser і запісвае згенераваныя аргументы Chromium
`--load-extension` і `--disable-extensions-except` у згенераваную канфігурацыю
Playwright MCP.

Пацверджаныя крэдэнцыялы HTTP-праксі-сервера можна ўбудаваць у `proxyServer`, напрыклад `http://user:pass@proxy.example:8080`. Працэнтны код для сімвалаў пароля, якія маюць URL-значэнне, такіх як `@`, `:`, `/`, `?`, `#`, і `%`.

Для шматлакацыйных шаблонаў QA гл. [GeoIP Proxy Matching](geoip-proxy-matching.md).
Для патэрнаў рэалізму ўзаемадзеяння гл. [Humanized Input Behavior](humanized-input-behavior.md).

## Вышэйплыўныя варыянты

Масток перадае налады `PLAYWRIGHT_MCP_*` вышэйпатокаваму Playwright MCP. Гэта ўключае ў сябе вышэйпатокавыя опцыі, такія як:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

Звярніцеся да дакументацыі арыгінальнага MCP Playwright, каб атрымаць поўны спіс опцый.

## Запіс логаў

У рэжыме HTTP Streamable у stdout запісваюцца зразумелыя для чалавека логі запуску і запытаў. Рэжым Stdio не выводзіць звычайныя аперацыйныя логі, таму stdout MCP JSON-RPC застаецца «чыстым» з пункту гледжання пратакола. Смяротныя памылкі пры запуску CLI ўсё яшчэ запісваюцца ў stderr.

## HTTPS

Streamable HTTP па змаўчанні выкарыстоўвае лакальны HTTP. Выберыце прамы TLS з дапамогай `--http-protocol https` або `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, затым прадастаўце альбо пару сертыфіката/ключа, альбо файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для знешняга доступу або доступу не праз петлю (non-loopback), выкарыстоўвайце HTTPS разам з `--http-auth-token`, або завяршайце TLS на надзейным зваротным праксі-серверы, які таксама забяспечвае аўтэнтыфікацыю і кантроль доступу да сеткі.

## Струменевыя HTTP-сесіі

Кожная сеансавая сесія Streamable HTTP MCP мае свой уласны выканальны асяроддзе моста і дадатковы дзіцячы працэс Playwright MCP. HTTP-сеансы запускаюць дадатковы працэс Playwright MCP з ізаляваным профілем браўзера, каб карыстальнікі, якія працуюць адначасова, не канкурыравалі за адзін і той жа пастаянны профіль Chromium. Убудаваны бэкэнд сеансаў `memory` захоўвае толькі метаданыя, такія як ідэнтыфікатар сеанса, часовыя штампы, тэрмін прыдатнасці і статус. Стан браўзера застаецца ў жывым вышэйстаячым даччыстым працэсе, і артыфакты па-ранейшаму кіруюцца `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для гарызантальнага маштабавання запускайце некалькі серверных рэплік за праграмным балансавальнікам з прывязанымі сеансамі, ключамі якіх з'яўляецца загаловак `mcp-session-id`. Будучыя бэкенды Redis, Postgres або SQLite могуць каардынаваць метаданыя і замкі, але яны не могуць аднавіць сесію браўзера ў рэальным часе пасля спынення працэсу, які ёй валодае.

Стрымінгавыя HTTP-запыты

Калі брыдж працуе з `--transport streamable-http`, ён адкрывае фіксаваныя кропкі ўводу на тым жа хосце і порце, што і кропка ўводу MCP:

`GET /healthz` вяртае метаданыя аб стане працэсу: `status`, `version`, `transport`, і `uptimeMs`.
- `GET /readyz` вяртае метаданыя гатоўнасці і ёмістасць сеансу: `sessions.active`, `sessions.pending`, `sessions.max`, і `sessions.available`.

Гатоўнасць вяртае HTTP `200`, пакуль даступная ёмістасць сеансу, і HTTP `503` калі `active + pending >= max`.
Калі `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` наладжаны, абодва проба патрабуюць аднолькавага `Authorization: Bearer ...` загалоўка, як і ў запытах MCP. Без аўтэнтыфікацыйнага токена пробы адкрыты на наладжаным HTTP-адрасе злучэння.
