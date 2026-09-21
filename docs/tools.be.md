---
description: Паверхня інструментаў, якую адкрывае CloakBrowser MCP.
icon: material/tools
tags:
  - Інструменты
  - Кіраўніцтва карыстальніка
---

# Інструменты

`cloakbrowser-mcp` адкрывае upstream-інструменты Playwright MCP без змен. Імёны інструментаў, апісанні, схемы, анатацыі і адказы паступаюць з `@playwright/mcp`.

## Upstream-інструменты

Чакаецца, што стандартная паверхня upstream-інструментаў браузера адпавядае замацаванай залежнасці Playwright MCP. Яна ўключае асноўныя браузерныя інструменты: навігацыю, snapshot, клікі, увод тэксту, скрыншоты, укладкі, паведамленні кансолі, праверку сеткі, загрузку файлаў, дыялогі і небяспечныя інструменты выканання.

Для стабільнай upstream-спасылкі глядзіце capability test Playwright MCP `{{ project.playwright_mcp_package_tag }}`, замацаваны на дакладным каміце пакета: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/f1257a5a67aff872f947fae274759f7d54853862/tests/capabilities.spec.ts#L19-L77).

Гэты праект лічыць upstream Playwright MCP аўтарытэтнай крыніцай і не падтрымлівае скапіяваны даведнік схем.

Базавы набор змяшчае 25 upstream-інструментаў, уключаючы `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
перадае магчымасць `devtools` даччыному працэсу без флага моста `--caps`;
атрыманыя upstream-інструменты і схемы перадаюцца без змен, уключаючы
`browser_start_recording` і `browser_stop_recording`.

!!! warning "Абмежаванне запісу з публічным бінарным файлам CloakBrowser v146"
    Інструменты запісу даступныя, але публічны бінарны файл Chromium 146 без ключа,
    які выкарыстоўвае CloakBrowser 0.5.10, наўмысна адключае сувязь Playwright паміж
    старонкай і хостам дзеля ўтоенасці. Таму `browser_stop_recording` можа вяртаць
    няпоўны код: навігацыя запісваецца, а паспяховыя ўвод і націсканні прапускаюцца.
    Правярайце створаныя запісы перад паўторным выкарыстаннем.

    Сумяшчальнасць з яўным уключэннем адсочваецца ў [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    Рашэнне аб адключэнні базавай сувязі абмяркоўваецца ў
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) і
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Дынамічныя інструменты WebMCP

Chromium падтрымлівае WebMCP пачынаючы з версіі 154. Больш старыя зборкі CloakBrowser ігнаруюць feature flag; калі WebMCP абавязковы, выкарыстоўвайце сумяшчальную зборку браўзера або `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

Калі Chromium запушчаны з `--enable-features=WebMCP`, старонкі могуць абвяшчаць інструменты `webmcp_*`. Мост перадае `notifications/tools/list_changed`, ачышчае ўвесь кэш `tools/list`, а кліент павінен зноў запытаць спіс. У Streamable HTTP апавяшчэнне атрымлівае толькі адкрыты паток адпаведнай сесіі; наступны `tools/list` застаецца актуальным і без патоку. Лічыце імя, апісанне, схему, annotations і output недаверанымі данымі старонкі. Мост не ўключае WebMCP аўтаматычна; `PLAYWRIGHT_MCP_WEBMCP=false` адключае збор.

## Лакальныя інструменты

### `cloakbrowser_binary_info`

Вяртае структураваную інфармацыю пра пакет CloakBrowser, бягучую платформу, каталог кэша, чаканы шлях да бінарнага файла, стан усталёўкі і resolved executable path, які выкарыстоўвае мост.

### `cloakbrowser_bridge_info`

Вяртае структураваныя метаданыя моста:

Аб'ект дадатку `structuredContent.cdp` паведамляе пра кіраваную CDP выкліканай сесіі
дзяржава

```json
{ "enabled": false }
```

```json
{
  "enabled": true,
  "state": "ready",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": "http://127.0.0.1:9222/cdp/<capability>",
  "activeConnections": 0
}
```

```json
{
  "enabled": true,
  "state": "unavailable",
  "generation": 1,
  "bindHost": "127.0.0.1",
  "port": 9222,
  "advertisedHost": null,
  "discoveryUrl": null,
  "activeConnections": 0
}
```

`generation` павялічваецца, а `discoveryUrl` круціцца пасля замены браўзера.
`activeConnections` падлічвае прынятыя праксіяныя злучэнні WebSocket без раскрыцця
ідэнтыфікацыі кліентаў, мэты ID або змесціва пратаколу. Разглядайце кожнае ненулявое адкрыццё URL
як кваліфікацыя.

Выкарыстоўвайце адкрыццё URL з кліентам, які падтрымлівае CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Кіраваны CDP не з'яўляецца пратаколам сервера Playwright. Playwright
`chromium.connect()` і бягучая інтэграцыя Open WebUI `PLAYWRIGHT_WS_URL` чакаецца
канцавы пункт сервера Playwright і не сумяшчальныя з гэтым URL.

- імя і версію MCP-сервера;
- рэжым выканання;
- пакет і версію upstream Playwright MCP;
- колькасць upstream-інструментаў;
- імёны лакальных Cloak-specific інструментаў.

Набор лакальных інструментаў застаецца абмежаваны гэтымі двума інструментамі
дыягностыкі. `SessionSeats` і `getSessionSeats` не прадастаўляюцца як
MCP-інструмент, бо CloakBrowser 0.5.10 не экспартуе гэты API са сваёй
публічнай кропкі ўваходу.

## Сумяшчальнасць

CI збірае Docker-вобраз і запускае `npm run bridge:compare`. Гэты скрыпт паралельна запускае афіцыйны вобраз Playwright MCP і вобраз моста CloakBrowser, параўноўвае спіс upstream-інструментаў і выконвае стандартныя upstream-браузерныя інструменты на адной fixture-старонцы.

Выкарыстоўвайце `--report`, каб запісаць машыначытальны JSON-справаздачу:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI загружае гэтую справаздачу як артэфакт для Docker-зборак і рэлізных зборак.
