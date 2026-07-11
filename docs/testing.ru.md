---
description: Стратегия тестирования CloakBrowser MCP: модульные тесты, интеграционные тесты с фальшивым upstream, Docker smoke-тесты и проверки совместимости с Playwright MCP.
icon: material/test-tube
tags:
  - Тестирование
  - Внутреннее устройство проекта
---

# Тестирование

## Модульные тесты

```bash
npm run test:unit
```

Модульные тесты покрывают разбор переменных среды, генерацию конфигурации моста, обработку аргументов запуска и локальные инструменты интроспекции Cloak.

## Интеграционные тесты

```bash
npm run test:integration
```

Интеграционные тесты используют фальшивый дочерний процесс upstream MCP и проверяют, что мост объединяет локальные инструменты и пересылает upstream-вызовы без изменений.

CI запускает модульные, интеграционные и пакетные E2E-тесты CLI на Node.js 22 и 24-26 для Linux x64, Linux arm64, macOS arm64, macOS x64 и Windows x64.

## Проверка пакета

```bash
npm run package:verify
```

Эта команда собирает пакет, запускает `npm pack`, проверяет список файлов tarball, устанавливает tarball во временный проект и проверяет `--version` и `--help` CLI.

Проверка пакета также валидирует `server.json` по опубликованной схеме MCP-сервера.

## Docker smoke-тест

```bash
npm run docker:build
npm run docker:smoke
```

Smoke-тест проверяет, что собранный образ запускается и выводит справку CLI. CI выполняет smoke-тесты Docker-образов для `linux/amd64` и `linux/arm64`.

## Совместимость с upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Скрипт совместимости запускает официальный Docker-образ Playwright MCP и образ моста CloakBrowser, сравнивает имена upstream-инструментов, выполняет стандартный набор браузерных инструментов на одной fixture-странице и проверяет локальные инструменты интроспекции Cloak.

CI загружает JSON-отчет совместимости как артефакт для Docker-сборок и релизных задач. Browser parity сейчас запускается на `linux/amd64`; arm64 Docker-задачи используют smoke-тесты и проверки уязвимостей.

## Проверки безопасности

```bash
npm run audit:prod
npm run server:validate
```

CI также запускает CodeQL, Dependency Review, OpenSSF Scorecard, zizmor и Trivy. Эти инструменты бесплатны для публичных репозиториев и не требуют внешних аккаунтов.
