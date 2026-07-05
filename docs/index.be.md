---
description: Мост Playwright MCP для аўтаматызацыі браўзера з CloakBrowser, Docker, Streamable HTTP, пастаяннымі профілямі, праверанымі параметрамі кантэксту, загрузкай пашырэнняў, супастаўленнем проксі па GeoIP і чалавекападобным уводам.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Пачаць</a>
  <a class="md-button" href="tools/">Інструменты</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# КлоакБраўзер МС Сервер

`cloakbrowser-mcp` — гэта сервер аўтаматызацыі браузера на аснове Model Context Protocol, які запускае upstream `@playwright/mcp` з бінарным файлам CloakBrowser Chromium. Выкарыстоўвайце яго, калі патрэбныя браузерныя інструменты, сумяшчальныя з Playwright MCP, запуск CloakBrowser, усталёўка праз npm, Docker-вобразы, сеансы Streamable HTTP, супастаўленне проксі па GeoIP для рэгіянальнага QA або чалавекападобныя паводзіны ўводу для сцэнарыяў, адчувальных да ўзаемадзеяння.

Бягучая версія: {{ project.version_tag }}.

## Сумяшчальнасць версій

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Параўноўваецца ў CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Параўноўваецца ў CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Параўноўваецца ў CI |

<!-- compatibility-table:end -->

Глядзіце [Сумяшчальнасць версій](version-compatibility.md) для падтрыманай сувязі паміж выданнямі SemVer гэтага праекта і версіямі MCP асноўнага праекта Playwright.

## Што гэта такое

<div class="grid cards" markdown>

- :material-connection: **Асяроддзе выканання моста**

  Запускае upstream Playwright MCP як даччыны працэс і перасылае выклікі браузерных інструментаў без змен.

- :material-incognito: **Запуск CloakBrowser**

  Стварае канфігурацыю Playwright MCP, дзе `launchOptions.executablePath` указвае на CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Пастаўляецца як лёгкі CLI-пакет Node.js для MCP-кліентаў stdio і Streamable HTTP.

- :fontawesome-brands-docker: **Вобраз Docker**

  Заснаваны на афіцыйным вобразе Playwright MCP і папярэдне загружае кэш бінарнага файла CloakBrowser.

- :material-map-marker-radius: **Супастаўленне GeoIP проксі**

  Узгадняе часавы пояс, мову і лакальныя параметры адбітка CloakBrowser з наладжаным месцазнаходжаннем проксі.

- :material-gesture-tap: **Чалавекападобныя паводзіны ўводу**

  Накіроўвае ўзаемадзеянні са старонкай праз слой CloakBrowser для чалавекападобнай працы мышы, клавіятуры і пракруткі.

</div>

## Паверхня інструмента

Кантракты інструмента MCP Playwright верхняга ўзроўню з'яўляюцца аўтарытэтнымі. Гэты праект дадае толькі два мясцовыя інструменты інтраспекцыі:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Далейшыя крокі

- [Пачатак працы](getting-started.md) для канфігурацыі npm, Docker і кліента MCP.
- [Канфігурацыя](configuration.md) для падтрымліваемых зменных асяроддзя.
- [Супастаўленне проксі па GeoIP](geoip-proxy-matching.md) для рэгіянальнага кантролю якасці, метаданых проксі ў часе выканання і шматкаардынатных HTTP-сесій з магчымасцю струменевага перадавання.
- [Адаптаванае паводзінне ўваходу](humanized-input-behavior.md) для рэалізму ўзаемадзеяння, наладкі і выпадкаў выкарыстання.
- [Інструменты](tools.md) для чаканняў адносна працоўнага асяроддзя інструментаў і супастаўнасці з вышэйстаячым кодам.
- [Пытанні і адказы](faq.md) па распаўсюджаных пытаннях усталявання, Docker, супастаўнасці і бяспекі.
- [Кіраўніцтва для ўдзельнікаў](contributor-guide.md) з інфармацыяй пра распрацоўку, тэсціраванне, архітэктуру і выпускі.
