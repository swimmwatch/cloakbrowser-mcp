---
description: Стратегія тестування CloakBrowser MCP: модульні тести, інтеграційні тести з фальшивим upstream, Docker smoke-тести та перевірки сумісності з Playwright MCP.
icon: material/test-tube
tags:
  - Тестування
  - Внутрішній устрій проекту
---

# Тестування

## Модульні тести

```bash
npm run test:unit
```

Модульні тести покривають розбір змінних середовища, генерацію конфігурації моста, обробку аргументів запуску та локальні інструменти інтроспекції Cloak.

## Інтеграційні тести

```bash
npm run test:integration
```

Інтеграційні тести використовують фальшивий дочірній процес upstream MCP і перевіряють, що міст об'єднує локальні інструменти та пересилає upstream-виклики без змін.

CI запускає модульні, інтеграційні та пакетні E2E-тести CLI на Node.js 22-26 для Linux x64, Linux arm64, macOS arm64, macOS x64 і Windows x64.

## Перевірка пакета

```bash
npm run package:verify
```

Ця команда збирає пакет, запускає `npm pack`, перевіряє список файлів tarball, встановлює tarball у тимчасовий проект і перевіряє `--version` та `--help` CLI.

Перевірка пакета також валідує `server.json` за опублікованою схемою MCP-сервера.

## Docker smoke-тест

```bash
npm run docker:build
npm run docker:smoke
```

Smoke-тест перевіряє, що зібраний образ запускається та виводить довідку CLI. CI виконує smoke-тести Docker-образів для `linux/amd64` і `linux/arm64`.

## Сумісність з upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Скрипт сумісності запускає офіційний Docker-образ Playwright MCP і образ моста CloakBrowser, порівнює імена upstream-інструментів, виконує стандартний набір браузерних інструментів на одній fixture-сторінці та перевіряє локальні інструменти інтроспекції Cloak.

CI завантажує JSON-звіт сумісності як артефакт для Docker-збірок і релізних задач. Browser parity зараз запускається на `linux/amd64`; arm64 Docker-задачі використовують smoke-тести та перевірки вразливостей.

## Перевірки безпеки

```bash
npm run audit:prod
npm run server:validate
```

CI також запускає CodeQL, Dependency Review, OpenSSF Scorecard, zizmor і Trivy. Ці інструменти безкоштовні для публічних репозиторіїв і не потребують зовнішніх облікових записів.
