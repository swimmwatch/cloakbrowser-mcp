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

| Зменная | Па змаўчанні | Апісанне |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Транспарт моста: `stdio` або `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Пратакол слухача Streamable HTTP: `http` або `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Адрас прывязкі слухача Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Порт прывязкі слухача Streamable HTTP. Выкарыстоўвайце `0` для часовага порта ў тэстах. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Шлях канчатковай кропкі Streamable HTTP. `/healthz` і `/readyz` зарэзерваваныя для праверак стану. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Неабавязковы Bearer-токен, які пры наладжванні патрабуецца ў запытах Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Сховішча метаданых сеансаў. У гэтым выпуску рэалізавана толькі `memory`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Тэрмін дзеяння неактыўных сеансаў Streamable HTTP. Пасля заканчэння тэрміну вызваляюцца рэсурсы моста і завяршаецца даччыны працэс upstream. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Максімальная колькасць актыўных сеансаў Streamable HTTP у адным працэсе. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Шлях да TLS-сертыфіката ў фармаце PEM для Streamable HTTP праз HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Шлях да закрытага TLS-ключа ў фармаце PEM для Streamable HTTP праз HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Шлях да файла TLS PFX/PKCS12 для Streamable HTTP праз HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Парольная фраза для зашыфраванага HTTPS-ключа або PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Узровень працоўных журналаў Streamable HTTP: `trace`, `debug`, `info`, `warn`, `error`, `fatal` або `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Проксі-сервер upstream Playwright MCP. Выкарыстоўваецца як крыніца GeoIP, калі супастаўленне ўключана. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Спіс выключэнняў проксі upstream для хостаў, якія не павінны выкарыстоўваць `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Вызначае GeoIP для `PLAYWRIGHT_MCP_PROXY_SERVER` і ўзгадняе параметры часавога пояса і лакалі ў адбітку CloakBrowser з месцазнаходжаннем гэтага проксі. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Уключае чалавекападобныя дзеянні мышы, клавіятуры і пракруткі ў CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Прэсет паводзін CloakBrowser: `default` або `careful`. Выкарыстоўваецца толькі пры ўключаным humanize. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Канал выпуску бінарнага файла CloakBrowser: `stable` або даступны толькі для Pro `preview`. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Шлях да ўласнага выканальнага файла CloakBrowser. Параметр CLI `--binary-path` мае прыярытэт. |
| `CLOAKBROWSER_VERSION` | unset | Замацаваная версія, якая перадаецца механізму вызначэння кэша CloakBrowser, калі ўласны выканальны файл не выбраны. Сапраўдны ключ бясплатнага тарыфу ігнаруе замацаванне; CloakBrowser можа паўторна выкарыстоўваць бінарны файл з кэша. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` выкарыстоўвае выканальны файл CloakBrowser. `playwright` прапускае замену выканальнага файла, спецыфічную для Cloak. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Запускае Chromium без графічнага інтэрфейсу. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Каталог артэфактаў для npm. У Docker зададзены `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Мэтавая мова генерацыі коду: `typescript`, `python`, `java`, `csharp` або `none`. Мост правярае значэнне і запісвае `codegen` у згенераваную канфігурацыю Playwright MCP. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` або `false`; дадае ў здымкі межы кожнага элемента як `[box=x,y,width,height]`. Мост правярае значэнне і запісвае `snapshot.boxes` у згенераваную канфігурацыю Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Час чакання ў мілісекундах пасля дзеяння, пакуль запушчаная праца не стабілізуецца. Непасрэдна перадаецца ў Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Тайм-аўт дзеянняў па змаўчанні ў мілісекундах. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Тайм-аўт навігацыі па змаўчанні ў мілісекундах. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Памер вобласці прагляду браўзера ў фармаце `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог пастаяннага профілю Chromium. Мост пераўтварае яго ў абсалютны шлях, стварае пры адсутнасці, правярае доступ на запіс і запісвае ў згенераванае `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-аб'ект з праверанымі параметрамі кантэксту. Падтрыманыя палі пералічаны ніжэй. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-масіў або спіс праз коску з існуючымі каталогамі пашырэнняў Chrome. Патрабуе `PLAYWRIGHT_MCP_USER_DATA_DIR`. Выкарыстоўвайце JSON-масівы для шляхоў Windows або шляхоў з коскамі. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Уключае выпраўленне сумяшчальнасці паведамленняў кансолі. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Дадае стандартныя аргументы запуску CloakBrowser для ўтоенасці. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Дадатковыя аргументы Chromium у выглядзе спіса праз коску або масіва JSON. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Дадае `--no-sandbox` і адключае пясочніцу Chromium. |

## Кіраваны CDP { #managed-cdp }

Кіраваны доступ да Chrome DevTools Protocol (CDP) з'яўляецца выразным выбарам карыстальніка. Ён адкрывае
та самая генерацыя браўзэраў Chromium, кантраляваная MCP праз магчымасці
адкрыццё URL. Налада портавай групы адна неабавязкова ўключае CDP.

| Варыянт CLI | Зменная асяроддзя | Па змоўчанні | Мэта |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Усталюйце значэнне stdio і па змаўчанні сесіі Streamable HTTP. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | не ўстаноўлена | Наладзьце лакальны пул портаў знешняга праксі для працэсу. Адна ўключаная сесія арандзе адзін порт. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Прывяжыце кіруемы праксі CDP. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Дазваляць або адмаўляць ненакруткавую сувязь. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | не ўстаноўлена | Усталюйце канкрэтны знешне даступны хост у URL-адрасах для выяўлення. Гэта неабходна для дзікіх прылікаў. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Апублікуйце URL-адрасы `http`/`ws` або `https`/`wss`. Гэта не ўключае TLS. |

Кожнае значэнне CLI перазапісвае толькі адпаведную зменную асяроддзя. У прыватнасці,
`--no-cdp-enabled` замяшчае `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, і
`--no-cdp-allow-remote` перакрывае `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Сесія з уключаным станам без пула портаў адхіляецца да таго, як пачнецца яе upstream-падраздзяленне.
Эфектыўнае ілжывае значэнне не стварае слухача, арэнды порта ці магчымасці.

Для stdio значэнне працэсу прымяняецца непасрэдна:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Для Streamable HTTP плоскі `cdpEnabled` булева значэнне ў аўтэнтыфікаваным
Метаданыя `initialize` замяняюць стандартныя налады працэсу для гэтай сесіі. Прапуск
поле спадчыняе значэнне працэсу. Гэтыя прыклады выразна выбіраюць адну сесію і
яшчэ адзін аўт:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": true
      }
    }
  }
}
```

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": false
      }
    }
  }
}
```

Адна сесія CDP з функцыяй HTTP мае адзін арэндавы знешні порт. Адключаныя сесіі гэтага не маюць
выкарыстоўваць пэўную частку памяці. Прывязка адбываецца лакальна для працэсу, выбіраецца найменшы непрывязаны кандыдат
і неадкладна правальвае гэтую сесію, калі выбраны знешні порт ужо заняты.
Закрыць сесіі для вызвалення портаў або наладзіць большы дыяпазон, калі пул вычарпаны.

Атрымаць бягучы URL з `cloakbrowser_bridge_info`, затым перадаць яго
`structuredContent.cdp.discoveryUrl` для кліента CDP, такога як Playwright
`chromium.connectOverCDP()`. Разглядайце URL як уліковыя дадзеныя: ён утрымлівае выпадковы элемент
магчымасць на пакаленне і састарэвае пасля замены браўзера. Кіраваны CDP
не з'яўляецца канечным пунктам сервера Playwright. `chromium.connect()` і бягучы Open WebUI
Патокі `PLAYWRIGHT_WS_URL` не падтрымліваюцца.

`--cdp-advertised-scheme https` публікуе адкрыццё `https` і URL-адрасы `wss` WebSocket
толькі. Мост не прадастаўляе TLS для кіраванага CDP: яго знешні слухач і
Chromium поддержка захоўваць адкрыты тэкст HTTP/WebSocket. Кантакт, які ўласнасць аператара, TLS тэрмінатар павінна
слухаць на тым жа аб'яўленым арандованым порце, захоўваць аб'яўленыя `Host` і `Origin`
улада і перасылаць уніз аднаму адпаведна на прамога слухача гэтай сесіі.

Уключэнне CDP пачынаецца Chromium падчас ініцыялізацыі MCP, каб устанавіць права ўласнасці і доступ звонку.
можна праверыць гатоўнасць. Наладзьце час ініцыялізацыі кліента MCP на не менш за 60
секунд. Калі ўключаны кіраваны CDP, пададзены карыстальнікам
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` не павінен утрымліваць `--remote-debugging-port`,
`--remote-debugging-address` або `--remote-debugging-pipe` (уключаючы формы `=`).
Уласны ўнутраны `--remote-debugging-pipe` кампанента Playwright застаецца ўключаным разам з
TCP-канец зваротнага злучэння, кіраваны мостам.

Глядзі [Інструменты](tools.md#cloakbrowser_bridge_info), [Докер](docker.md#managed-cdp),
[Бяспека](security.md#managed-cdp-security), і
[Архітэктура](architecture.md#managed-cdp-ownership) для стану выяўлення, разгортвання
мяжы і паводзіны пры перазапуску

## Ліцэнзія CloakBrowser і ўваход праз GitHub

Для наладжвання ліцэнзіі выкарыстоўваецца CLI зыходнага праекта CloakBrowser;
`cloakbrowser-mcp` не дадае каманды ўваходу або выхаду:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

Каманда `login` прымае платны ключ або запускае ўваход праз GitHub для
атрымання ключа бясплатнага ўзроўню. Правераны ключ захоўваецца ў
`~/.cloakbrowser/license.key`; каманда `logout` выдаляе гэты файл. Каманда
`info` паказвае актыўны ўзровень ліцэнзіі, а для ліцэнзій Pro — колькасць
актыўных сеансаў.

Замест гэтага можна задаць `CLOAKBROWSER_LICENSE_KEY` у асяроддзі MCP-сервера.
Мост перадае гэту зменную даччынаму працэсу верхняга ўзроўню/браўзера, не
запісваючы яе ў журнал. Калі `CLOAKBROWSER_CACHE_DIR` паказвае на карыстальніцкі
кэш з файлам `license.key`, CloakBrowser вызначае ключ, а мост перадае са
згенераванага асяроддзя браўзера толькі гэты вызначаны ключ. Іншыя
згенераваныя запісы асяроддзя не капіруюцца.

Калі CloakBrowser адхіляе перададзены ліцэнзійны ключ або не можа праверыць яго праз сервер ліцэнзій ці захаваны вынік праверкі, запуск завяршаецца з відавочнай памылкай CloakBrowser. Мост захоўвае гэтую памылку: не хавае яе і не пераходзіць моўчкі на іншы браўзер ці ліцэнзійны тарыф.

Калі сервер ліцэнзій недаступны, CloakBrowser можа паўторна выкарыстоўваць захаваны вынік праверкі. Гэта не гарантуе запуск без сеткі: спампоўка бінарнага файла або запуск браўзера ўсё яшчэ могуць завяршыцца памылкай.

## Канал выпуску CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` выбірае канал выпуску бінарнага файла CloakBrowser. Па змаўчанні выкарыстоўваецца `stable`. `preview` запытвае папярэднюю Pro-зборку браўзера і даступны толькі з ліцэнзіяй Pro. Яўна зададзеная версія `CLOAKBROWSER_VERSION` мае прыярытэт пры спампоўцы без ключа або з платным ключом. Сапраўдны ключ бясплатнага тарыфу ігнаруе замацаванне і можа паўторна выкарыстоўваць бінарны файл з кэша. Калі Preview недаступны для платформы, CloakBrowser вяртаецца да Stable.

Канал выпуску выбіраецца пры запуску працэсу моста. Ён прымяняецца да ўсіх сеансаў Streamable HTTP і не можа задавацца або пераазначацца ў метададзеных initialize. Каб змяніць яго, перазапусціце мост.

## Уласны бінарны файл CloakBrowser

`--binary-path <path>` выбірае ўласны выканальны файл CloakBrowser для бягучага
працэсу моста. `CLOAKBROWSER_BINARY_PATH` задае тое ж значэнне праз асяроддзе;
параметр CLI мае прыярытэт. Мост нармалізуе шлях, патрабуе звычайны файл, даступны
для чытання, і запісвае яго ў `browser.launchOptions.executablePath` створанай
канфігурацыі Playwright MCP.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

Мост не спампоўвае і не абнаўляе ўласны выканальны файл. Калі шлях не зададзены,
`CLOAKBROWSER_VERSION` можа замацаваць версію бінарнага файла, якім кіруе CloakBrowser.

Для Streamable HTTP выбраны бінарны файл належыць працэсу моста і выкарыстоўваецца
ва ўсіх створаных ім сесіях MCP. Метададзеныя `initialize` не могуць выбраць або
перавызначыць шлях; запускайце асобныя працэсы моста для розных бінарных файлаў.

Калі выбраная зборка прадастаўляе `document.modelContext` або `navigator.modelContext` з метадам `getTools()`, upstream Playwright MCP можа дадаваць інструменты `webmcp_<page-tool>` пасля здымка старонкі. Ён адпраўляе `tools/list_changed`; мост перасылае апавяшчэнне і абноўлены спіс інструментаў. Старонка вызначае імя і схему кожнага дынамічнага інструмента.

## Супастаўленне GeoIP-праксі

Усталюйце `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` разам з
`PLAYWRIGHT_MCP_PROXY_SERVER`, каб атрымаць сцягі часавага пояса, мовы і лакалі
CloakBrowser з месца выхаду праксі. Для падтрымліваемых бінарных файлаў
CloakBrowser выбірае ўбудаваную аўтэнтыфікацыю ў URL, а для старых бінарных
файлаў захоўвае аб'ект праксі Playwright як запасны варыянт.

Глядзіце [Супастаўленне праз GeoIP-праксі](geoip-proxy-matching.md) для прыкладаў наладкі, працоўнага часу
Метаданыя струменевага HTTP-праксі, выпадкі выкарыстання, правілы прыярытэту і абмежаванні.

Кароткі сцэнарый: [рэгіянальнае QA праз проксі](recipes/regional-qa-through-proxy.md).

## Ачалавечанае паводзіны ўводу

Усталюйце `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` каб уключыць для ўзаемадзеяння з старонкай у CloakBrowser пласт мышы, клавіятуры і пракруткі, падобны да чалавечага. Масток прымяняе гэта праз хук ініцыялізацыі старонкі Playwright MCP, таму схемы інструментаў браўзера зыходнага кода застаюцца без змен.

Глядзіце [Гуманізаваная паводзіна ўводу](humanized-input-behavior.md) для прыкладаў наладкі, метаданых HTTP Streamable у часе выканання, выпадкаў выкарыстання і абмежаванняў.

## Пашырэнні Chrome { #chrome-extensions }

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

Кароткая налада з гатовымі прыкладамі: [загрузка пашырэння Chrome](recipes/load-chrome-extension.md).

## Рэжым падключэння Playwright Extension { #playwright-extension-connection-mode }

Рэжым падключэння праз Playwright Extension адрозніваецца ад загрузкі распакаванага пашырэння праз `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Ён падключаецца праз афіцыйнае Playwright Extension, ужо ўсталяванае ў профілі Chrome або Edge; мост не ўсталёўвае гэтае пашырэнне.

Для stdio наладзьце зменныя асяроддзя працэсу:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP метаданыя initialize `extensionMode` і `profileDirName` перавызначаюць адпаведныя значэнні ўзроўню працэсу. `userDataDir` таксама задаецца асобна для кожнай сесіі. Токен прымаецца толькі з асяроддзя працэсу:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "extensionMode": true,
        "profileDirName": "Profile 1",
        "userDataDir": "/absolute/path/to/profile"
      }
    }
  }
}
```

Рэжым пашырэння патрабуе непустога токена і пастаяннага профілю. Адначасовыя HTTP-сесіі пашырэння павінны выкарыстоўваць розныя значэнні `userDataDir`. Да запуску даччынага працэсу upstream мост адхіляе канчатковыя кропкі managed або знешняга CDP, канчатковыя кропкі аддаленага браўзера, налады запуску без графічнага інтэрфейсу або ў ізаляваным рэжыме, параметры проксі і GeoIP, імітацыю чалавечых паводзін, змяненне кантэксту, распакаваныя `extensionPaths` і яўна зададзеныя параметры запуску CloakBrowser. Праверка паспяховага скразнога сцэнарыя выконваецца ўручную, бо афіцыйнае Playwright Extension павінна быць загадзя ўсталявана ў выбраным профілі браўзера.

## Метаданыя выканання HTTP для струменевага перадавання { #streamable-http-runtime-metadata }

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
        "extensionMode": false,
        "profileDirName": "Profile 1",
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

`headless` можа ўключаць або адключаць рэжым браўзера без графічнага інтэрфейсу для гэтай сесіі. У вобразе Docker значэнне `headless`, роўнае `false`, па патрабаванні запускае прыватны віртуальны дысплей кантэйнера. Па-за вобразам сесіі з графічным інтэрфейсам па-ранейшаму патрэбнае працаздольнае асяроддзе адлюстравання.

`extensionMode` і `profileDirName` перавызначаюць `PLAYWRIGHT_MCP_EXTENSION` і `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` для гэтай сесіі. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` ніколі не прымаецца ў метаданых.

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

У падтрымліваемых бінарных файлах CloakBrowser аўтэнтыфікаваныя HTTP-праксі
выкарыстоўваюць убудаваную аўтэнтыфікацыю ў URL, а мост выдаляе дубляваны аб'ект
праксі Playwright. Старыя бінарныя файлы захоўваюць аб'ект праксі Playwright як
запасны варыянт сумяшчальнасці.

Для шматлакацыйных шаблонаў QA гл. [Супастаўленне праз GeoIP-праксі](geoip-proxy-matching.md).
Для патэрнаў рэалізму ўзаемадзеяння гл. [Гуманізаваная паводзіна ўводу](humanized-input-behavior.md).


Для паўторнага выкарыстання ўваходу і налады пашырэнняў глядзіце [пастаянны профіль уваходу](recipes/persistent-login-profile.md) і [загрузку пашырэння Chrome](recipes/load-chrome-extension.md).

## Параметры upstream Playwright MCP

Масток перадае налады `PLAYWRIGHT_MCP_*` вышэйпатокаваму Playwright MCP. Гэта ўключае ў сябе вышэйпатокавыя опцыі, такія як:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_FILE_PATHS`
- `PLAYWRIGHT_MCP_IDLE_TIMEOUT`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_PROFILE_DIR_NAME`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_WEBMCP`

Звярніцеся да дакументацыі арыгінальнага MCP Playwright, каб атрымаць поўны спіс опцый.

`PLAYWRIGHT_MCP_CAPS=devtools` атрымліваецца даччыным upstream-працэсам і
ўключае інструменты гэтай магчымасці без асобнага флага моста `--caps`.

## Запіс логаў

У рэжыме HTTP Streamable у stdout запісваюцца зразумелыя для чалавека логі запуску і запытаў. Рэжым Stdio не выводзіць звычайныя аперацыйныя логі, таму stdout MCP JSON-RPC застаецца «чыстым» з пункту гледжання пратакола. Смяротныя памылкі пры запуску CLI ўсё яшчэ запісваюцца ў stderr.

## HTTPS { #https }

Streamable HTTP па змаўчанні выкарыстоўвае лакальны HTTP. Выберыце прамы TLS з дапамогай `--http-protocol https` або `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, затым прадастаўце альбо пару сертыфіката/ключа, альбо файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для знешняга доступу або доступу не праз петлю (non-loopback), выкарыстоўвайце HTTPS разам з `--http-auth-token`, або завяршайце TLS на надзейным зваротным праксі-серверы, які таксама забяспечвае аўтэнтыфікацыю і кантроль доступу да сеткі.

## Струменевыя HTTP-сесіі

Кожны сеанс Streamable HTTP MCP мае ўласнае асяроддзе выканання моста і даччыны працэс upstream Playwright MCP. Па змаўчанні HTTP-сеансы выкарыстоўваюць ізаляваныя профілі браўзера, калі пастаянны профіль не наладжаны. Яўны пастаянны профіль блакуецца; адначасовым сеансам патрэбныя розныя каталогі профіляў. Убудаваны бэкэнд `memory` захоўвае толькі метаданыя: ідэнтыфікатар сеанса, часавыя меткі, тэрмін дзеяння і статус. Стан браўзера застаецца ў актыўным даччыным працэсе upstream, а артэфакты кантралююцца `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для гарызантальнага маштабавання запускайце некалькі серверных рэплік за праграмным балансавальнікам з прывязанымі сеансамі, ключамі якіх з'яўляецца загаловак `mcp-session-id`. Будучыя бэкенды Redis, Postgres або SQLite могуць каардынаваць метаданыя і замкі, але яны не могуць аднавіць сесію браўзера ў рэальным часе пасля спынення працэсу, які ёй валодае.

## Праверкі стану Streamable HTTP

Калі мост працуе з `--transport streamable-http`, ён адкрывае фіксаваныя канчатковыя кропкі праверкі на тым жа хосце і порце, што і канчатковая кропка MCP:

- `GET /healthz` вяртае метаданыя стану працэсу: `status`, `version`, `transport` і `uptimeMs`.
- `GET /readyz` вяртае метаданыя гатоўнасці і ёмістасць сесій: `sessions.active`, `sessions.pending`, `sessions.max` і `sessions.available`.

Праверка гатоўнасці вяртае HTTP `200`, пакуль ёсць вольная ёмістасць для сесій, і HTTP `503`, калі `active + pending >= max`.
Калі наладжаны `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, абедзве праверкі патрабуюць той жа загаловак `Authorization: Bearer ...`, што і запыты MCP. Без токена аўтэнтыфікацыі праверкі даступныя на наладжаным адрасе прывязкі HTTP.

## Дадатковыя практычныя сцэнарыі

Каб выбраць паміж upstream Playwright MCP і гэтым пакетам, глядзіце [параўнанне](comparison.md). Для хуткіх задач выкарыстоўвайце [рэцэпты](recipes/index.md): пастаянны профіль, пашырэнні, reverse proxy, рэгіянальнае QA, Claude Desktop, Codex CLI і smoke-тэст CI.
