---
description: Стратэгія тэставання CloakBrowser MCP: модульныя тэсты, інтэграцыйныя тэсты з фальшывым upstream, Docker smoke-тэсты і праверкі сумяшчальнасці з Playwright MCP.
icon: material/test-tube
tags:
  - Тэставанне
  - Унутраная структура праекта
---

# Тэставанне

## Модульныя тэсты

```bash
npm run test:unit
```

Модульныя тэсты пакрываюць разбор зменных асяроддзя, генерацыю канфігурацыі моста, апрацоўку аргументаў запуску і лакальныя інструменты інтрасpekцыі Cloak.

## Інтэграцыйныя тэсты

```bash
npm run test:integration
```

Інтэграцыйныя тэсты выкарыстоўваюць фальшывы даччыны працэс upstream MCP і правяраюць, што мост аб'ядноўвае лакальныя інструменты і перасылае upstream-выклікі без змен.

CI запускае модульныя, інтэграцыйныя і пакетныя E2E-тэсты CLI на Node.js 22-26 для Linux x64, Linux arm64, macOS arm64, macOS x64 і Windows x64.

## Праверка пакета

```bash
npm run package:verify
```

Гэтая каманда збірае пакет, запускае `npm pack`, правярае спіс файлаў tarball, усталёўвае tarball у часовы праект і правярае `--version` і `--help` CLI.

Праверка пакета таксама валідуюць `server.json` паводле апублікаванай схемы MCP-сервера.

## Docker smoke-тэст

```bash
npm run docker:build
npm run docker:smoke
```

Smoke-тэст правярае, што сабраны вобраз запускаецца і выводзіць даведку CLI. CI выконвае smoke-тэсты Docker-вобразаў для `linux/amd64` і `linux/arm64`.

## Сумяшчальнасць з upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Скрыпт сумяшчальнасці запускае афіцыйны Docker-вобраз Playwright MCP і вобраз моста CloakBrowser, параўноўвае імёны upstream-інструментаў, выконвае стандартны набор браузерных інструментаў на адной fixture-старонцы і правярае лакальныя інструменты інтрасpekцыі Cloak.

CI загружае JSON-справаздачу сумяшчальнасці як артэфакт для Docker-зборак і рэлізных задач. Browser parity зараз запускаецца на `linux/amd64`; arm64 Docker-задачы выкарыстоўваюць smoke-тэсты і праверкі ўразлівасцяў.

## Праверкі бяспекі

```bash
npm run audit:prod
npm run server:validate
```

CI таксама запускае CodeQL, Dependency Review, OpenSSF Scorecard, zizmor і Trivy. Гэтыя інструменты бясплатныя для публічных рэпазіторыяў і не патрабуюць знешніх акаўнтаў.
