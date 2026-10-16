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

`npm run check` включає статичні перевірки, unit/integration-тести та тести упакованого CLI з імітацією upstream MCP, без Chromium. У PR unit/integration і CLI запускаються один раз для кожної комбінації платформи й Node.js: {{ project.node_check_versions }} на Linux x64/arm64, macOS x64/arm64 та Windows x64. На Linux x64 той самий прогін збирає покриття для Codecov. Статичні перевірки та перевірка пакета виконуються один раз на Linux x64/Node.js {{ project.node_minimum_version }}.

Матриця CI, список очікуваних результатів звіту й документація отримують версії Node.js із `.github/workflows/ci.yml`. Оновлюйте цей файл, коли змінюються перевірювані гілки випуску.

## Перевірки справжнього браузера та дистрибутивів

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` об’єднує перевірки CLI із fake upstream і перевірки консолі справжнього Playwright Chromium. `test:e2e:playwright-console` перевіряє методи консолі в нових браузерних сеансах. `test:e2e:cdp` перевіряє керований доступ через Chrome DevTools Protocol (CDP) із Free CloakBrowser і контрольованим Playwright Chromium.

`test:e2e:npm-package` пакує та встановлює пакет у тимчасовий проєкт. Перевірка контракту пересилання використовує fake upstream; браузерні сценарії використовують справжній CloakBrowser і локальні сторінки для перевірки стандартних інструментів, постійного стану та обох пресетів humanize. Окремий тест перевіряє конкурентні завантаження в порожній кеш і відсутність стороннього тексту в stdout. Сама перевірка пакета не підтверджує роботу браузера.

Браузерна PR-матриця перевіряє консоль Playwright і керований CDP на Node.js {{ project.node_current_version }} на тих самих п’яти платформах; додатково CDP перевіряється на Linux x64/Node.js {{ project.node_minimum_version }}. Паралельна матриця Node.js {{ project.node_primary_version }} запускає набори npm-пакета, proxy/GeoIP, розширень і lifecycle на всіх п’яти платформах, включно з обома пресетами humanize. Приймання Docker і CDP охоплює обидва рушії на `linux/amd64` і `linux/arm64`.

`required-ci` вимагає успішного завершення кожного набору та повного зведеного звіту до злиття. Той самий workflow `CI` запускається щотижня та вручну. `Release` збирає й публікує артефакти з перевіреної версії коду.

## Звіти про тестування

Кожна комірка матриці CI завантажує очищені результати та діагностичні вкладення. Завдання агрегації об’єднує їх в один HTML-звіт Allure зі збереженням міток набору тестів і середовища. Відсутність очікуваних джерел результатів і падіння тестів спричиняють помилку агрегації; вихідні результати та HTML-звіт залишаються доступними як артефакти Actions.

Відповідні запуски PR можуть публікувати посилання на звіт через налаштований окремий репозиторій звітів. Для публікації потрібні ввімкнена доставка, перевірені дані запуску та успішна перевірка Pages. Сайт документації розгортається окремо. Публічні звіти містять лише дозволену й очищену діагностику з контрольованих тестових даних.

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

Використовуйте фактичний вихідний каталог збирача як вхід генератора. Формати звітів, вкладення й доставка через CI описані в розділі [Участь у розробці](contributing.md).

## Перевірка пакета

```bash
npm run package:verify
```

Ця команда збирає пакет, запускає `npm pack`, перевіряє список файлів tarball, встановлює tarball у тимчасовий проект і перевіряє `--version` та `--help` CLI.

Перевірка пакета також валідує `server.json` за опублікованою схемою MCP-сервера.

Для складання релізу використовується `npm run package:pack`: команда створює архів і перевіряє метадані та склад файлів. Установлення пакета й виконання CLI перевіряються до злиття командою `package:verify`.

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

CI завантажує JSON-звіт про відповідність із Docker jobs. Браузерне порівняння запускається на `linux/amd64`; на обох архітектурах виконуються smoke-перевірки, сканування вразливостей, тести дистрибутива та CDP. Порівняння охоплює закріплену версію Docker MCP; набір npm окремо перевіряє npm MCP.

## Перевірки безпеки

```bash
npm run audit:prod
npm run server:validate
```

CI також запускає CodeQL, Dependency Review, OpenSSF Scorecard, zizmor і Trivy. Ці інструменти безкоштовні для публічних репозиторіїв і не потребують зовнішніх облікових записів.
