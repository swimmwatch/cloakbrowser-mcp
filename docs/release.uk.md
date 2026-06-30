---
description: Процес випуску пакета CloakBrowser MCP для npm, образу Docker, сайту документації, запису в реєстрі MCP та розгортання на GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Випуск

Випуски базуються на опублікованому релізі на GitHub, тег якого є значенням за стандартом SemVer
з префіксом `v`, наприклад `v1.2.7`.

Уніфікований робочий процес `Release` вирішує тег один раз, а потім передає похідні `version`,
`version_tag` та безпечний для Docker тег образу через пакетування npm, аргументи збірки Docker
, мітки образів, метадані сервера, маркери README та маркери документації
.

## Налаштування репозиторію GitHub

Налаштуйте ці параметри перед першим випуском.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Додайте необхідних рецензентів до `npm-production`, `docker-production` та
`mcp-registry-production`, якщо для релізів має бути необхідним ручне затвердження після
публікації релізу на GitHub. Середовище `github-pages` використовується
вбудованим завданням розгортання GitHub Pages.

## Публікація в npm

Робочий процес випуску npm здійснює публікацію через npm Trusted Publishing за допомогою GitHub
Actions OIDC. Для публікації він не використовує `NPM_TOKEN`.

Налаштуйте надійного видавця на сайті npmjs.com, вказавши саме такі значення:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

Завдання `npm` виконується на бігунах, розміщених на GitHub, використовує Node.js 24 та зберігає
`id-token: write`, щоб npm міг обміняти токен OIDC GitHub Actions на
короткочасні облікові дані для публікації. Для npm Trusted Publishing потрібні npm CLI
`>=11.5.1` та Node.js `>=22.14.0`.

Використання у видавничій справі:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Під час публікації через Trusted Publishing npm автоматично генерує інформацію про
походження публічних пакетів із публічних репозиторіїв. Не додавайте до цього робочого процесу
довгостроковий токен публікації npm.

Версія пакета береться з тегу релізу GitHub, що передує `npm pack`
та `npm publish`, і завдання завершується з помилкою, якщо `package.json` не відповідає
визначеній версії релізу.

## Публікація в Docker

Образи Docker публікуються за адресою:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

Завдання `docker` використовує репозиторій `GITHUB_TOKEN` із
`packages: write` для GHCR. Для публікації на Docker Hub потрібні
`DOCKERHUB_USERNAME` та `DOCKERHUB_TOKEN` у секретах середовища `docker-production`
або репозиторію.

Цей робочий процес оновлює огляд репозиторію Docker Hub після успішного
завантаження образу. Docker Hub не завантажує кореневий `README.md` автоматично для
цього циклу випуску GitHub Actions; огляд, специфічний для Docker Hub,
зберігається в `docs/dockerhub-readme.md`.

Перед злиттям release PR CI перевіряє:

- виконує перевірки TypeScript, lint, форматування, збірки, тестів і покриття;
- перевіряє метадані та вміст npm-пакета;
- збирає Docker-образи для `linux/amd64` і `linux/arm64`;
- запускає smoke-перевірки Docker `--help`;
- порівнює образ `linux/amd64` з upstream Playwright MCP за допомогою скрипта
  перевірки паритету моста;
- сканує Docker-образи за допомогою Trivy на наявність високих і критичних
  вразливостей ОС та бібліотек.

Під час публікації релізу Docker workflow:

- застосовує версію релізу;
- під час збірки Docker застосовує доступні оновлення безпеки Debian поверх зафіксованого базового образу Playwright MCP;
- видаляє невикористані глобальні дані npm з образу середовища виконання;
- публікує мультиплатформовий образ;
- оновлює огляд Docker Hub після успішного надсилання образу.

У процесі побудови Docker отримує аргументи `RELEASE_VERSION`, `RELEASE_VERSION_TAG` та
`VCS_REF`. Робочий процес також визначає дайджест базового образу Playwright
MCP з вищого рівня та передає його як `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

У фінальному образі зберігаються ті самі значення, що й у мітках OCI та метаданих середовища виконання
у вигляді змінних середовища. Опубліковані образи містять мітки для назви, опису,
джерела, документації, версії, редакції, ліцензії, авторів, постачальника, назви базового образу,
хешу базового образу та імені сервера MCP.

Trivy є безкоштовним програмним забезпеченням з відкритим кодом і не вимагає зовнішнього токена для публічного
сканування зображень. Результати SARIF завантажуються до сервісу сканування коду GitHub, якщо
сканування коду увімкнено.

Після першої публікації переконайтеся, що пакет GHCR є загальнодоступним і пов’язаний із цим
репозиторієм, а також переконайтеся, що репозиторій на Docker Hub є загальнодоступним.

Docker публікує багатоплатформовий маніфест для `linux/amd64` та
`linux/arm64`. PR CI виконує smoke-перевірки обох платформ перед злиттям і
зберігає порівняння паритету браузерних інструментів для `linux/amd64`.

## Публікація реєстру MCP

Завдання `mcp-registry` публікує `server.json` до офіційного
реєстру за адресою:

```text
https://registry.modelcontextprotocol.io
```

Для публікації на сервері використовується локальний композитний GitHub Action `MCP Registry Publish`,
офіційний `mcp-publisher` CLI та GitHub Actions OIDC. Не створюйте запит на злиття
до `modelcontextprotocol/registry` для додавання цього сервера до списку; це репозиторій
явно вимагає від авторів пакетів публікувати їх за допомогою `mcp-publisher`.

Цей робочий процес не потребує Glama, білінгу, PAT для GitHub, облікових даних DNS або
довготривалих секретних даних реєстру. У ньому використовуються:

- `id-token: write` для аутентифікації GitHub OIDC;
- `mcp-publisher login github-oidc`;
- існуючий простір імен GitHub `io.github.swimmwatch/cloakbrowser-mcp`;
- значення npm-пакета `mcpName` для підтвердження права власності на npm-пакет;
- мітку образу Docker `io.modelcontextprotocol.server.name` для підтвердження права власності на образ OCI
  .

Завдання MCP Registry запускається з тієї самої події GitHub Release, що й npm, Docker,
а також публікація документації. Воно оголошує `needs: [npm, docker]`, тому публікація в npm та
Docker завершується до початку публікації в реєстрі. Розгортання документації оголошує
`needs: [docs-build, npm, docker, mcp-registry]`, тому GitHub Pages оновлюється лише
після успішної публікації npm, Docker та офіційного MCP Registry. Ця складена
дія навмисно орієнтована на реєстр: вона перевіряє `server.json` локально,
потім перевіряє її за допомогою `mcp-publisher`, перевіряє, чи точна версія реєстру
вже доступна, проходить автентифікацію за допомогою `mcp-publisher login github-oidc`, публікує
метадані сервера та перевіряє остаточний запис у реєстрі.

У разі тимчасового збою реєстру запустіть знову завдання `mcp-registry`, яке завершилося з помилкою, у
первісному циклі випуску після того, як завдання npm та Docker отримають статус «зелений». Ручний
тригер `workflow_dispatch` на `Release` призначений для повних запусків конвеєра релізу з
явно вказаним тегом.

Перевірте опублікований запис реєстру за допомогою:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

Реєстр GitHub `https://github.com/mcp` — це окрема, ретельно відібрана
платформа для пошуку. Публікація в офіційному реєстрі MCP є обов’язковою, але це не
гарантує негайної видимості на сторінці `/mcp` на GitHub. Вважайте `npm run
registry:check` інструментом перевірки релізу для офіційного реєстру, npm,
GHCR, Docker Hub та засобом перевірки видимості на GitHub MCP, що працює за принципом «найкращих зусиль». Використовуйте `npm run
registry:check:strict` лише після того, як видимість у GitHub MCP стане обов’язковою
умовою.

## Перелік вимог до каталогу Glama

Оцінка в каталозі Glama не пов’язана з релізами на GitHub та офіційною публікацією в MCP
Registry. Репозиторій містить `glama.json`, тому
обліковий запис адміністратора `swimmwatch` може заявити або підтвердити право власності в Glama.

Перед публікацією стабільної версії заповніть безкоштовний контрольний список Glama:

- синхронізувати сервер через інтерфейс адміністратора сервера Glama MCP після того, як `glama.json`
  буде об'єднано з `main`;
- відкрити
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`;
- налаштувати Glama для побудови Dockerfile цього репозиторію та запуску існуючої
  точки входу stdio без додаткових секретів;
- зберегти сумісність середовища виконання зі стандартними налаштуваннями CloakBrowser: `cloak` браузерний
  , режим без графічного інтерфейсу, вивід у stdout та сховище артефактів `/data`;
- натисніть «Розгорнути» та дочекайтеся успішного завершення тесту збірки;
- створіть та опублікуйте реліз Glama з тією ж версією, що й реліз на GitHub,
  наприклад `1.2.7`;
- після випуску один раз скористайтеся функцією Glama «Спробувати в браузері», щоб запустити початкове
  використання;
- вручну додайте пов’язані сервери, як мінімум офіційний сервер Playwright MCP,
  а також, за бажанням, альтернативні сервіси для автоматизації браузерів, що тісно пов’язані з ним.

Не додавайте спосіб оплати або платний хостинг Glama лише для того, щоб підвищити рейтинг каталогу.
Якщо Glama вимагає оплати за обов’язковий пункт контрольного списку, розглядайте це як
перешкоду для випуску, яка потребує чіткого рішення куратора.

## Робочі процеси з безпеки

У репозиторії використовуються безкоштовні засоби забезпечення безпеки:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / npm release | `npm audit --omit=dev --audit-level=high` | PR CI and npm publish job | No external account or token. |

Фіксація SHA-кодів дій відстежується як один із майбутніх етапів зміцнення безпеки. У поточних робочих процесах використовуються
посилання на дії з версіями, завдяки чому оновлення залишаються керованими, поки інфраструктура
випуску ще перебуває на початковому етапі розвитку.

## Публікація документації

`docs-build` та `docs-deploy` розгортають MkDocs за допомогою вбудованого потоку
розгортання GitHub Pages Actions. У налаштуваннях Pages репозиторію як джерело
слід вказати `GitHub Actions`.

Цей робочий процес створює документацію у строгому режимі, завантажує згенерований каталог `site/`
у каталог `actions/upload-pages-artifact` та розгортає його разом із
`actions/deploy-pages` у середовище `github-pages` лише після успішної публікації npm,
Docker і MCP Registry.

Під час публікації документації також запускається валідатор SEO після завершення збірки MkDocs.
Опціональні токени для підтвердження веб-майстра використовують офіційні безкоштовні інструменти для веб-майстрів і можуть
надаватися у вигляді змінних репозиторію або секретних даних:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Для опціональних сповіщень IndexNow потрібен секретний ключ репозиторію з назвою
`INDEXNOW_KEY`. Якщо його вказано, робочий процес публікує необхідний файл ключа та
надсилає згенеровані URL-адреси карти сайту після розгортання на GitHub Pages.

Не додавайте платні послуги з індексації, рекламні продукти або сторонні
аналітичні інструменти до процесу випуску документації без окремого явного
рішення.

## Моніторинг на верхньому рівні

Робочий процес моніторингу upstream виконується щодня, а також може бути запущений вручну з
GitHub Actions. Він перевіряє обидва канали розповсюдження Playwright MCP з upstream:

- пакет npm: `@playwright/mcp`;
- образ Docker: `mcr.microsoft.com/playwright/mcp`.

Коли виявляється новіша версія з основного репозиторію, робочий процес створює завдання на GitHub,
призначене `swimmwatch`. Це завдання містить поточні та найновіші версії npm/Docker
версії, короткий виклад приміток до випуску від
`microsoft/playwright-mcp`, а також посилання на повний журнал змін у вихідному коді, пакет npm
та теги Docker.

Виконайте ту саму перевірку локально за допомогою команди:

```bash
npm run upstream:check
```

## Теги випуску

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Контрольний список

Перед публікацією прес-релізу:

- Зливати можна лише після того, як `Actionlint` та `CI` стануть зеленими.
- Створіть реліз на GitHub на основі тегу, наприклад `v1.2.7`.
- Позначте реліз як попередній під час публікації версії npm `next`.
- Переконайтеся, що для `release.yml` та
  `npm-production`.
- Переконайтеся, що `npm-production`, `docker-production`, `github-pages` та
  `mcp-registry-production`.
- Переконайтеся, що сканування коду на GitHub увімкнено, якщо потрібна видимість завантаження SARIF.
- Переконайтеся, що видимість пакета GHCR є публічною після першої публікації в Docker.
- Переконайтеся, що сервер Glama було синхронізовано, протестовано через адміністративну
  сторінку Dockerfile та випущено з тією самою стабільною версією.

`SUPPORT.md` навмисно відкладено доти, доки для проєкту не буде запроваджено стабільну політику підтримки,
яка виходитиме за межі проблем на GitHub та рекомендацій з безпеки.
