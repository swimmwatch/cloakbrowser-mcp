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

Стабільне джерело для Playwright MCP `@playwright/mcp@0.0.83` — тест можливостей на коміті цього пакета: [стандартні інструменти та інструменти додаткових можливостей](https://github.com/microsoft/playwright-mcp/blob/f183dad4a52965583e3cc1d59b88cdc279e2e57d/tests/capabilities.spec.ts#L19-L74). Поточний набір інструментів визначає встановлена залежність.

Цей проект вважає upstream Playwright MCP авторитетним джерелом і не підтримує скопійований довідник схем.

Базовий набір містить 25 upstream-інструментів, включно з `browser_emulate_media`. `PLAYWRIGHT_MCP_CAPS=devtools`
передає можливість `devtools` дочірньому процесу без прапорця моста `--caps`;
отримані upstream-інструменти та схеми передаються без змін, зокрема
`browser_start_recording` і `browser_stop_recording`.

!!! warning "Обмеження записування з публічним бінарним файлом CloakBrowser v146"
    Інструменти записування доступні, але публічний бінарний файл Chromium 146 без ключа навмисно вимикає зв’язок Playwright між сторінкою та хостом заради прихованості. Тому `browser_stop_recording` може повертати неповний код: навігація записується, а успішні введення та натискання пропускаються. Перевіряйте згенеровані записи перед повторним використанням.

    Сумісність із явним увімкненням відстежується в [CloakBrowser #532](https://github.com/CloakHQ/CloakBrowser/issues/532).
    Рішення про вимкнення базового зв'язку обговорюється в
    [#340](https://github.com/CloakHQ/CloakBrowser/issues/340) і
    [#176](https://github.com/CloakHQ/CloakBrowser/issues/176).

### Динамічні інструменти WebMCP

Підтримка WebMCP залежить від вибраної збірки браузера та ввімкнених можливостей. Встановлений Playwright MCP очікує `document.modelContext` або `navigator.modelContext` з методом `getTools()`. Якщо потрібен WebMCP, використовуйте сумісну збірку CloakBrowser або `PLAYWRIGHT_MCP_BROWSER_ENGINE=playwright`.

[Документація Chrome щодо WebMCP](https://developer.chrome.com/docs/ai/webmcp) описує origin trial починаючи з Chrome 149, прапорець для локальної перевірки та обмеження headless-режиму. Сам номер версії Chromium не гарантує сумісність з API, який очікує Playwright MCP.

Коли Chromium запускається з `--enable-features=WebMCP`, Playwright MCP може додавати надані сторінкою інструменти з іменами `webmcp_*`, поки сторінка відкрита. Ці інструменти динамічні: міст оголошує `tools.listChanged`, скидає весь кеш посторінкового списку інструментів, коли upstream надсилає `notifications/tools/list_changed`, і пересилає сповіщення MCP-клієнту відповідної сесії. Клієнтам слід слухати це сповіщення й повторно викликати `tools/list`. Клієнт Streamable HTTP отримує його лише за відкритого потоку сповіщень своєї сесії; наступний виклик `tools/list` усе одно повертає актуальний список, навіть якщо потік не був відкритий.

Динамічні інструменти належать лише MCP-сесії та поточному поколінню браузера managed CDP, яке їх виявило. Їхні імена, описи, схеми, анотації та результати є недовіреним вмістом сторінки й пересилаються без змін із боку мосту. Перевіряйте їх перед викликом. Задайте `PLAYWRIGHT_MCP_WEBMCP=false`, щоб вимкнути збір. Міст ніколи не вмикає Chromium WebMCP автоматично.

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

Додатковий об’єкт `structuredContent.cdp` повідомляє стан managed CDP сесії, яка здійснює виклик:

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

`generation` збільшується, а `discoveryUrl` змінюється після заміни браузера. `activeConnections` рахує прийняті проксовані з’єднання WebSocket, не розкриваючи ідентифікатори клієнтів, ідентифікатори цілей або вміст протоколу. Вважайте кожен URL виявлення, відмінний від null, обліковими даними.

Використовуйте URL виявлення з клієнтом, що підтримує CDP:

```ts
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP(discoveryUrl);
```

Managed CDP не є протоколом Playwright Server. Метод Playwright `chromium.connect()` і поточна інтеграція Open WebUI `PLAYWRIGHT_WS_URL` очікують кінцеву точку Playwright Server і несумісні із цим URL.

Для зафіксованої версії клієнта Playwright перевірено, що виклик `browser.close()` у браузера, повернутого `connectOverCDP()`, від’єднує цього клієнта, залишаючи Chromium і покоління браузера готовими до роботи. Це спостереження стосується конкретного клієнта й не є гарантією для інших бібліотек CDP. Надсилання команди CDP `Browser.close` безпосередньо є руйнівним: вона завершує спільне покоління Chromium, анулює capability та впливає на клієнтів, які викликають MCP. Координуйте операції MCP і CDP, оскільки міст не впорядковує конфліктні операції навігації, закриття сторінок, введення або зміни сховища.

Набір локальних інструментів обмежений цими двома інструментами діагностики. `SessionSeats` і `getSessionSeats` не надаються як MCP-інструмент, оскільки підтримувана публічна точка входу CloakBrowser не експортує цей API.

## Сумісність

CI збирає Docker-образ і запускає `npm run bridge:compare`. Цей скрипт паралельно запускає офіційний образ Playwright MCP і образ моста CloakBrowser, порівнює список upstream-інструментів і виконує стандартні upstream-браузерні інструменти на одній fixture-сторінці.

Використовуйте `--report`, щоб записати машиночитаний JSON-звіт:

```bash
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

CI завантажує цей звіт як артефакт для Docker-збірок і релізних збірок.
