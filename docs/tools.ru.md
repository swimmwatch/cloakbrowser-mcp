---
description: Поверхность инструментов, которую предоставляет CloakBrowser MCP.
icon: material/tools
tags:
  - Инструменты
  - Руководство пользователя
---

# Инструменты

`cloakbrowser-mcp` предоставляет upstream-инструменты Playwright MCP без изменений. Имена инструментов, описания, схемы, аннотации и ответы поступают из `@playwright/mcp`.

## Upstream-инструменты

Ожидается, что стандартная поверхность upstream-инструментов браузера соответствует закрепленной зависимости Playwright MCP. Она включает основные браузерные инструменты: навигацию, snapshot, клики, ввод текста, скриншоты, вкладки, сообщения консоли, проверку сети, загрузку файлов, диалоги и небезопасные инструменты выполнения.

Для стабильной upstream-ссылки см. capability test Playwright MCP `{{ project.playwright_mcp_package_tag }}`, закрепленный на точном коммите пакета: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Этот проект считает upstream Playwright MCP авторитетным источником и не поддерживает копию справочника схем.

Базовый набор содержит 24 upstream-инструмента. `PLAYWRIGHT_MCP_CAPS=devtools`
передаёт возможность `devtools` дочернему процессу без флага моста `--caps`;
результирующие upstream-инструменты и схемы передаются без изменений, включая
`browser_start_recording` и `browser_stop_recording`.

## Локальные инструменты

### `cloakbrowser_binary_info`

Возвращает структурированную информацию о пакете CloakBrowser, текущей платформе, каталоге кэша, ожидаемом пути к бинарному файлу, состоянии установки и разрешенном executable path, который использует мост.

### `cloakbrowser_bridge_info`

Возвращает структурированные метаданные моста:

- имя и версию MCP-сервера;
- режим выполнения;
- пакет и версию upstream Playwright MCP;
- количество upstream-инструментов;
- имена локальных Cloak-specific инструментов.

Набор локальных инструментов по-прежнему ограничен этими двумя инструментами
диагностики. `SessionSeats` и `getSessionSeats` не предоставляются как
MCP-инструмент, потому что CloakBrowser 0.5.10 не экспортирует этот API из
своей публичной точки входа.

## Совместимость

CI собирает Docker-образ и запускает `npm run bridge:compare`. Этот скрипт параллельно запускает официальный образ Playwright MCP и образ моста CloakBrowser, сравнивает список upstream-инструментов и выполняет стандартные upstream-браузерные инструменты на одной fixture-странице.

Используйте `--report`, чтобы записать машиночитаемый JSON-отчет:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI загружает этот отчет как артефакт для Docker-сборок и релизных сборок.
