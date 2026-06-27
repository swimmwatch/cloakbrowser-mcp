---
description: Поверхня інструментів, яку надає CloakBrowser MCP.
icon: material/tools
tags:
  - Інструменти
  - Посібник користувача
---

# Інструменти

`cloakbrowser-mcp` надає upstream-інструменти Playwright MCP без змін. Імена інструментів, описи, схеми, анотації та відповіді надходять із `@playwright/mcp`.

## Upstream-інструменти

Очікується, що стандартна поверхня upstream-інструментів браузера відповідає закріпленій залежності Playwright MCP. Вона включає основні браузерні інструменти: навігацію, snapshot, кліки, введення тексту, скриншоти, вкладки, повідомлення консолі, перевірку мережі, завантаження файлів, діалоги та небезпечні інструменти виконання.

Для стабільного upstream-посилання див. capability test Playwright MCP `@playwright/mcp@0.0.76`, закріплений на точному коміті пакета: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/b301c372ec741289eff1cf6aab9d3bec553f31e2/tests/capabilities.spec.ts#L19-L77).

Цей проект вважає upstream Playwright MCP авторитетним джерелом і не підтримує скопійований довідник схем.

## Локальні інструменти

### `cloakbrowser_binary_info`

Повертає структуровану інформацію про пакет CloakBrowser, поточну платформу, каталог кешу, очікуваний шлях до бінарного файлу, стан встановлення та resolved executable path, який використовує міст.

### `cloakbrowser_bridge_info`

Повертає структуровані метадані моста:

- ім'я та версію MCP-сервера;
- режим виконання;
- пакет і версію upstream Playwright MCP;
- кількість upstream-інструментів;
- імена локальних Cloak-specific інструментів.

## Сумісність

CI збирає Docker-образ і запускає `npm run bridge:compare`. Цей скрипт паралельно запускає офіційний образ Playwright MCP і образ моста CloakBrowser, порівнює список upstream-інструментів і виконує стандартні upstream-браузерні інструменти на одній fixture-сторінці.

Використовуйте `--report`, щоб записати машиночитаний JSON-звіт:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI завантажує цей звіт як артефакт для Docker-збірок і релізних збірок.
