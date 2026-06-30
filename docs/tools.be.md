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

Для стабільнай upstream-спасылкі глядзіце capability test Playwright MCP `{{ project.playwright_mcp_package_tag }}`, замацаваны на дакладным каміце пакета: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/36ec986b8b1fc6b4d11f2b6971147755e1b0bc84/tests/capabilities.spec.ts#L19-L77).

Гэты праект лічыць upstream Playwright MCP аўтарытэтнай крыніцай і не падтрымлівае скапіяваны даведнік схем.

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

## Сумяшчальнасць

CI збірае Docker-вобраз і запускае `npm run bridge:compare`. Гэты скрыпт паралельна запускае афіцыйны вобраз Playwright MCP і вобраз моста CloakBrowser, параўноўвае спіс upstream-інструментаў і выконвае стандартныя upstream-браузерныя інструменты на адной fixture-старонцы.

Выкарыстоўвайце `--report`, каб запісаць машыначытальны JSON-справаздачу:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI загружае гэтую справаздачу як артэфакт для Docker-зборак і рэлізных зборак.
