---
description: Drop-in сумяшчальны з Playwright MCP сервер браузернай аўтаматызацыі з нязменнымі upstream-інструментамі, CloakBrowser Chromium і гатовай упакоўкай npm, Docker і Streamable HTTP.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Пачаць</a>
  <a class="md-button" href="comparison/">Параўнанне</a>
  <a class="md-button" href="recipes/">Рэцэпты</a>
</p>

# КлоакБраўзер МС Сервер

`cloakbrowser-mcp` — гэта drop-in сумяшчальны з Playwright MCP сервер браузернай аўтаматызацыі з нязменнымі upstream-інструментамі, CloakBrowser Chromium і гатовай упакоўкай npm, Docker і Streamable HTTP. Ён запускае upstream `@playwright/mcp` як кананічную паверхню браузерных інструментаў і дадае вакол яе магчымасці запуску CloakBrowser для разгортвання.

## 30-секундная дэманстрацыя

<div class="clb-demo-video">
<video controls preload="metadata" poster="assets/videos/30-second-demo-poster.png" aria-label="30-секундная дэманстрацыя CloakBrowser MCP">
<source src="assets/videos/30-second-demo.mp4" type="video/mp4">
</video>
</div>

<p class="clb-demo-caption">Паглядзіце першы запуск: запусціце npm-пакет, падключыце MCP-кліент, папрасіце выканаць вэб-даследаванне, аўтаматызацыю або тэставанне і праверце вынік у сапраўдным браўзеры.</p>

Выкарыстоўвайце яго, калі патрэбныя сумяшчальныя з Playwright MCP браузерныя інструменты плюс пастаянныя профілі, загрузка пашырэнняў, праверка кантэксту, супастаўленне GeoIP проксі для рэгіянальнага QA або чалавекападобны ўвод.

Бягучая версія: {{ project.version_tag }}.

## Сумяшчальнасць версій

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.10.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.3`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.9.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.5.1`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.8.0`          | `^0.0.78`       | `mcr.microsoft.com/playwright/mcp:v0.0.78` | `^0.4.10`    | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.7.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.8`     | stdio, Streamable HTTP | Параўноўваецца ў CI |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Параўноўваецца ў CI |
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

## Дадатковыя практычныя сцэнарыі

Каб выбраць паміж upstream Playwright MCP і гэтым пакетам, глядзіце [параўнанне](comparison.md). Для хуткіх задач выкарыстоўвайце [рэцэпты](recipes/index.md): пастаянны профіль, пашырэнні, reverse proxy, рэгіянальнае QA, Claude Desktop, Codex CLI і smoke-тэст CI.
