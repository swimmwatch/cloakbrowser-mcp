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

Стабільная крыніца для Playwright MCP `@playwright/mcp@0.0.83` — тэст магчымасцяў на каміце гэтага пакета: [стандартныя інструменты і інструменты дадатковых магчымасцяў](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). Бягучы набор інструментаў вызначае ўсталяваная залежнасць.

Гэты праект лічыць upstream Playwright MCP аўтарытэтнай крыніцай і не падтрымлівае скапіяваны даведнік схем.

Базавы набор змяшчае 25 upstream-інструментаў, уключаючы `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
перадае магчымасць `devtools` даччыному працэсу без флага моста `--caps`;
атрыманыя upstream-інструменты і схемы перадаюцца без змен, уключаючы
`browser_start_recording` і `browser_stop_recording`.

!!! warning "Абмежаванне запісу з публічным бінарным файлам CloakBrowser v146"
    Інструменты запісу даступныя, але публічны бінарны файл Chromium 146 без ключа наўмысна адключае сувязь Playwright паміж старонкай і хостам дзеля ўтоенасці. Таму `browser_stop_recording` можа вяртаць няпоўны код: навігацыя запісваецца, а паспяховыя ўвод і націсканні прапускаюцца. Правярайце створаныя запісы перад паўторным выкарыстаннем.

    Сумяшчальнасць з яўным уключэннем адсочваецца ў [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    Рашэнне аб адключэнні базавай сувязі абмяркоўваецца ў
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) і
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Дынамічныя інструменты WebMCP

Падтрымка WebMCP залежыць ад выбранай зборкі браўзера і ўключаных магчымасцяў. Усталяваны Playwright MCP чакае `document.modelContext` або `navigator.modelContext` з метадам `getTools()`. Калі патрэбны WebMCP, выкарыстоўвайце сумяшчальную зборку CloakBrowser або `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

[Дакументацыя Chrome па WebMCP](https://developer.chrome.com/docs/ai/webmcp) апісвае origin trial пачынаючы з Chrome 149, сцяг для лакальнай праверкі і абмежаванні headless-рэжыму. Адзін нумар версіі Chromium не гарантуе сумяшчальнасць з API, які чакае Playwright MCP.

Калі Chromium запускаецца з `--enable-features=WebMCP`, Playwright MCP можа дадаваць інструменты, якія прадастаўляе старонка, з імёнамі `webmcp_*`, пакуль старонка адкрытая. Гэтыя інструменты дынамічныя: мост абвяшчае `tools.listChanged`, скідае ўвесь кеш пастаронкавага спіса інструментаў, калі upstream адпраўляе `notifications/tools/list_changed`, і перасылае апавяшчэнне MCP-кліенту адпаведнай сесіі. Кліентам варта слухаць гэтае апавяшчэнне і паўторна выклікаць `tools/list`. Кліент Streamable HTTP атрымлівае яго толькі пры адкрытым патоку апавяшчэнняў сваёй сесіі; наступны выклік `tools/list` усё роўна вяртае актуальны спіс, нават калі паток не быў адкрыты.

Дынамічныя інструменты належаць толькі MCP-сесіі і бягучаму пакаленню браўзера managed CDP, якое іх выявіла. Іх імёны, апісанні, схемы, анатацыі і вынікі з’яўляюцца недавераным змесцівам старонкі і перасылаюцца без змен з боку моста. Правярайце іх перад выклікам. Задайце `PLAYWRIGHT_MCP_WEBMCP=false`, каб адключыць збор. Мост ніколі не ўключае Chromium WebMCP аўтаматычна.

## Лакальныя інструменты

### `cloakbrowser_binary_info`

Вяртае структураваную інфармацыю пра пакет CloakBrowser, бягучую платформу, каталог кэша, чаканы шлях да бінарнага файла, стан усталёўкі і resolved executable path, які выкарыстоўвае мост.

### `cloakbrowser_bridge_info`

Вяртае структураваныя метаданыя моста:

- імя і версію MCP-сервера;
- рэжым выканання;
- пакет і версію upstream Playwright MCP;
- колькасць upstream-інструментаў;
- імёны лакальных Cloak-specific інструментаў.

Дадатковы аб’ект `structuredContent.cdp` паведамляе стан managed CDP сесіі, якая робіць выклік:

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

`generation` павялічваецца, а `discoveryUrl` змяняецца пасля замены браўзера. `activeConnections` падлічвае прынятыя злучэнні WebSocket праз проксі, не раскрываючы ідэнтыфікатары кліентаў, ідэнтыфікатары мэт або змесціва пратаколу. Разглядайце кожны URL выяўлення, адрозны ад null, як уліковыя даныя.

Выкарыстоўвайце URL выяўлення з кліентам, які падтрымлівае CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Managed CDP не з’яўляецца пратаколам Playwright Server. Метад Playwright `chromium.connect()` і бягучая інтэграцыя Open WebUI `PLAYWRIGHT_WS_URL` чакаюць канчатковую кропку Playwright Server і несумяшчальныя з гэтым URL.

Для замацаванай версіі кліента Playwright праверана, што выклік `browser.close()` у браўзера, вернутага `connectOverCDP()`, адключае гэтага кліента, пакідаючы Chromium і пакаленне браўзера гатовымі да працы. Гэта назіранне датычыцца канкрэтнага кліента і не з’яўляецца гарантыяй для іншых бібліятэк CDP. Адпраўка каманды CDP `Browser.close` наўпрост разбуральная: яна завяршае агульнае пакаленне Chromium, анулюе capability і ўплывае на кліентаў, якія выклікаюць MCP. Каардынуйце аперацыі MCP і CDP, бо мост не ўпарадкоўвае канфліктныя аперацыі навігацыі, закрыцця старонак, уводу або змянення сховішча.

Набор лакальных інструментаў абмежаваны гэтымі двума інструментамі дыягностыкі. `SessionSeats` і `getSessionSeats` не прадастаўляюцца як MCP-інструмент, бо падтрымліваемая публічная кропка ўваходу CloakBrowser не экспартуе гэты API.

## Сумяшчальнасць

CI збірае Docker-вобраз і запускае `npm run bridge:compare`. Гэты скрыпт паралельна запускае афіцыйны вобраз Playwright MCP і вобраз моста CloakBrowser, параўноўвае спіс upstream-інструментаў і выконвае стандартныя upstream-браузерныя інструменты на адной fixture-старонцы.

Выкарыстоўвайце `--report`, каб запісаць машыначытальны JSON-справаздачу:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI загружае гэтую справаздачу як артэфакт для Docker-зборак і рэлізных зборак.
