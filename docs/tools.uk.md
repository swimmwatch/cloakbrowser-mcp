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

Для стабільного upstream-посилання див. capability test Playwright MCP `{{ project.playwright_mcp_package_tag }}`, закріплений на точному коміті пакета: [default and capability-gated tool names](https://github.com/microsoft/playwright-mcp/blob/4c1fb03bad3bae379b0ae0e3d81d2660de56bd91/tests/capabilities.spec.ts#L19-L77).

Цей проект вважає upstream Playwright MCP авторитетним джерелом і не підтримує скопійований довідник схем.

Базовий набір містить 24 upstream-інструменти. `PLAYWRIGHT_MCP_CAPS=devtools`
передає можливість `devtools` дочірньому процесу без прапорця моста `--caps`;
отримані upstream-інструменти та схеми передаються без змін, зокрема
`browser_start_recording` і `browser_stop_recording`.

!!! warning "Обмеження записування з публічним бінарним файлом CloakBrowser v146"
    Інструменти записування доступні, але публічний бінарний файл Chromium 146 без ключа,
    який використовує CloakBrowser 0.5.10, навмисно вимикає зв'язок Playwright між
    сторінкою та хостом заради прихованості. Тому `browser_stop_recording` може повертати
    неповний код: навігація записується, а успішні введення та натискання пропускаються.
    Перевіряйте згенеровані записи перед повторним використанням.

    Сумісність із явним увімкненням відстежується в [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    Рішення про вимкнення базового зв'язку обговорюється в
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) і
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

## Локальні інструменти

### `cloakbrowser_binary_info`

Повертає структуровану інформацію про пакет CloakBrowser, поточну платформу, каталог кешу, очікуваний шлях до бінарного файлу, стан встановлення та resolved executable path, який використовує міст.

### `cloakbrowser_bridge_info`

Повертає структуровані метадані моста:

Об'єкт додатку `structuredContent.cdp` повідомляє про керований CDP викликаної сесії
стан:

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

`generation` збільшується, а `discoveryUrl` обертається після заміни браузера.
`activeConnections` рахує прийняті проксовані WebSocket з’єднання, не піддаючи їх загрозі
ідентичності клієнтів, цільові ідентифікатори або вміст протоколу. Обробляйте кожне ненульове відкриття URL
як документ, що підтверджує кваліфікацію.

Використовуйте відкриття URL з клієнтом, що підтримує CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Керований CDP не є протоколом сервера Playwright. Playwright
`chromium.connect()` та поточна інтеграція Open WebUI `PLAYWRIGHT_WS_URL` очікують
кінцева точка сервера Playwright і не сумісна з цим URL.

- ім'я та версію MCP-сервера;
- режим виконання;
- пакет і версію upstream Playwright MCP;
- кількість upstream-інструментів;
- імена локальних Cloak-specific інструментів.

Набір локальних інструментів і далі обмежений цими двома інструментами
діагностики. `SessionSeats` і `getSessionSeats` не надаються як MCP-інструмент,
оскільки CloakBrowser 0.5.10 не експортує цей API зі своєї публічної точки
входу.

## Сумісність

CI збирає Docker-образ і запускає `npm run bridge:compare`. Цей скрипт паралельно запускає офіційний образ Playwright MCP і образ моста CloakBrowser, порівнює список upstream-інструментів і виконує стандартні upstream-браузерні інструменти на одній fixture-сторінці.

Використовуйте `--report`, щоб записати машиночитаний JSON-звіт:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI завантажує цей звіт як артефакт для Docker-збірок і релізних збірок.
