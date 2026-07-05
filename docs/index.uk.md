---
description: Міст Playwright MCP для автоматизації браузера з CloakBrowser, Docker, Streamable HTTP, постійними профілями, перевіреними параметрами контексту, завантаженням розширень, зіставленням проксі за GeoIP та гуманізованим введенням.
icon: material/home
tags:
  - User Guide
---

<div class="clb-hero-logo" align="center" markdown>
![CloakBrowser MCP](assets/brand/logo-wordmark.svg){ width="620" }
</div>

<p class="clb-hero-actions" align="center">
  <a class="md-button md-button--primary" href="getting-started/">Почати</a>
  <a class="md-button" href="tools/">Інструменти</a>
  <a class="md-button" href="docker/">Docker</a>
</p>

# Сервер CloakBrowser MCP

`cloakbrowser-mcp` — це сервер автоматизації браузера на базі Model Context Protocol, який працює на верхньому рівні `@playwright/mcp` із бінарним файлом CloakBrowser Chromium. Використовуйте його, якщо вам потрібні інструменти для браузера, сумісні з Playwright MCP, виконання CloakBrowser, установка через npm, образи Docker, HTTP-сесії, що підтримують потокову передачу даних, підбір проксі-серверів з урахуванням GeoIP для регіонального контролю якості або імітація поведінки користувача при введенні даних для процесів, чутливих до взаємодії.

Поточна версія: {{ project.version_tag }}.

## Сумісність версій

<!-- compatibility-table:start -->

| cloakbrowser-mcp | @playwright/mcp | Playwright MCP Docker base                 | CloakBrowser | Transport              | Parity         |
| ---------------- | --------------- | ------------------------------------------ | ------------ | ---------------------- | -------------- |
| `1.6.1`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Порівнюється в CI |
| `1.6.0`          | `^0.0.77`       | `mcr.microsoft.com/playwright/mcp:v0.0.77` | `^0.4.7`     | stdio, Streamable HTTP | Порівнюється в CI |
| `1.5.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.4.3`     | stdio, Streamable HTTP | Порівнюється в CI |
| `1.4.0`          | `^0.0.76`       | `mcr.microsoft.com/playwright/mcp:v0.0.76` | `^0.3.32`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.3.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.31`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.7`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.6`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.5`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.3`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.2.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.1.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio, Streamable HTTP | Порівнюється в CI |
| `1.0.2`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Порівнюється в CI |
| `1.0.1`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Порівнюється в CI |
| `1.0.0`          | `^0.0.75`       | `mcr.microsoft.com/playwright/mcp:v0.0.75` | `^0.3.30`    | stdio                  | Порівнюється в CI |

<!-- compatibility-table:end -->

Дивіться [Сумісність версій](version-compatibility.md), щоб ознайомитися з актуальним переліком відповідності між релізами цього проєкту за стандартом SemVer та версіями Playwright MCP з основного репозиторію.

## Що це таке

<div class="grid cards" markdown>

- :material-connection: **Середовище виконання моста**

  Запускає upstream Playwright MCP як дочірній процес і пересилає виклики браузерних інструментів без змін.

- :material-incognito: **Запуск CloakBrowser**

  Створює конфігурацію Playwright MCP, де `launchOptions.executablePath` вказує на CloakBrowser.

- :fontawesome-brands-node-js: **npm CLI**

  Постачається як тонкий CLI-пакет Node.js для MCP-клієнтів stdio і Streamable HTTP.

- :fontawesome-brands-docker: **Образ Docker**

  Базується на офіційному образі Playwright MCP і попередньо завантажує кеш бінарного файлу CloakBrowser.

- :material-map-marker-radius: **Зіставлення GeoIP проксі**

  Узгоджує часовий пояс, мову та локаль відбитка CloakBrowser із налаштованим розташуванням проксі.

- :material-gesture-tap: **Людиноподібна поведінка введення**

  Спрямовує взаємодії зі сторінкою через шар CloakBrowser для людиноподібної роботи миші, клавіатури й прокручування.

</div>

## Поверхня інструменту

Визначальними є контракти інструменту Playwright MCP, що знаходяться вище за ланцюжком. Цей проєкт додає лише два локальні інструменти інтроспекції:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Наступні кроки

- [Початок роботи](getting-started.md) — налаштування npm, Docker та клієнта MCP.
- [Налаштування](configuration.md) для підтримуваних змінних середовища.
- [Збіг проксі за GeoIP](geoip-proxy-matching.md) для регіонального контролю якості, метаданих проксі під час виконання та сеансів Streamable HTTP у кількох локаціях.
- [Гуманізована поведінка введення даних](humanized-input-behavior.md) для реалістичності взаємодії, налаштування та сценаріїв використання.
- [Інструменти](tools.md) для відповідності очікуванням щодо інтерфейсу інструментів та узгодженості з вищими рівнями.
- [FAQ](faq.md) для відповідей на типові запитання щодо встановлення, Docker, сумісності та безпеки.
- [Посібник для учасників](contributor-guide.md) з детальною інформацією щодо розробки, тестування, архітектури та випуску версій.
