---
description: Табліца сумяшчальнасці рэлізаў cloakbrowser-mcp з версіямі upstream Playwright MCP.
icon: material/source-branch-sync
tags:
  - Кіраўніцтва карыстальніка
---

# Сумяшчальнасць версій

`cloakbrowser-mcp` выкарыстоўвае Semantic Versioning для ўласных рэлізаў. Кантракты браузерных інструментаў прыходзяць з `@playwright/mcp`, таму кожны рэліз фіксуе версію Playwright MCP, з якой ён збіраецца і тэстуецца.

<!-- compatibility-table:start -->

| cloakbrowser-mcp | Залежнасць @playwright/mcp | Docker-база Playwright MCP                 | Залежнасць CloakBrowser | Node.js   | Транспарт              | Правераныя платформы                                                                             | Сумяшчальнасць інструментаў              |
| ---------------- | -------------------------- | ------------------------------------------ | ----------------------- | --------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `1.6.0`          | `^0.0.77`                  | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменты параўноўваюцца ў CI. |
| `1.5.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменты параўноўваюцца ў CI. |
| `1.4.0`          | `^0.0.76`                  | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`               | `>=22.12` | stdio, Streamable HTTP | Node.js 22-26; Linux x64/arm64; macOS arm64/x64; Windows x64; Docker `linux/amd64`, `linux/arm64` | Upstream-інструменты параўноўваюцца ў CI. |
| `1.3.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`               | `>=20`    | stdio, Streamable HTTP | Node.js 20-26; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.7`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.6`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.5`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.3`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.2.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.1.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio, Streamable HTTP | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.0.2`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.0.1`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |
| `1.0.0`          | `^0.0.75`                  | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`               | `>=20`    | stdio                  | Node.js 20/22; Docker `linux/amd64`                                                             | Upstream-інструменты параўноўваюцца ў CI. |

<!-- compatibility-table:end -->

## Як чытаць гэтую табліцу

- `cloakbrowser-mcp` — версія npm- і Docker-рэліза гэтага праекта.
- `@playwright/mcp` — дыяпазон npm-залежнасці, які выкарыстоўвае CLI-пакет.
- Docker-база Playwright MCP — upstream-вобраз, на якім заснаваны Docker-вобраз праекта.
- Залежнасць CloakBrowser — дыяпазон npm-залежнасці для вызначэння і ўсталявання бінарнага файла CloakBrowser Chromium.
- `Node.js` — падтрымліваемы runtime-дыяпазон для npm-пакета.
- Транспарт — MCP-транспарт, які адкрывае мост.
- Правераныя платформы — платформы, пакрытыя CI і release smoke-тэстамі.
- Сумяшчальнасць інструментаў паказвае, ці параўноўваецца стандартная upstream-паверхня Playwright MCP з афіцыйным runtime.

Калі патрэбна ўзнаўляльнасць, замацоўвайце `cloakbrowser-mcp` дакладнай версіяй замест `latest`.

Docker-рэлізы цяпер публікуюцца для `linux/amd64` і `linux/arm64`. Browser parity параўноўваецца на `linux/amd64`; абедзве Docker-платформы праходзяць release smoke-тэсты перад публікацыяй multi-platform manifest.
