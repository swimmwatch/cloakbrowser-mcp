---
description: Конфігурація середовища виконання для моста Playwright MCP, включно зі Streamable HTTP-сеансами, постійними профілями, перевіреними параметрами контексту, шляхами розширень, зіставленням проксі за GeoIP та гуманізованим введенням.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Налаштування

Використовуйте вхідні змінні `PLAYWRIGHT_MCP_*` для забезпечення роботи Playwright MCP. Використовуйте `CLOAK_PLAYWRIGHT_MCP_*` лише для поведінки мосту, характерної для Cloak.

Старі змінні `CLOAKBROWSER_MCP_*` не підтримуються.
Створений [Довідник CLI](generated/cli.md) є авторитетним переліком прапорів CLI мосту та відповідних їм змінних середовища.

## Варіанти мостів

| Змінна | За замовчуванням | Опис |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Транспорт мосту: `stdio` або `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Протокол слухача Streamable HTTP: `http` або `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Адреса прив’язки слухача Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Порт прив’язки слухача Streamable HTTP. Використовуйте `0` для тимчасового порту в тестах. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Шлях кінцевої точки Streamable HTTP. `/healthz` і `/readyz` зарезервовані для перевірок стану. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Необов’язковий Bearer-токен, який після налаштування потрібен у запитах Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Сховище метаданих сеансів. У цьому випуску реалізовано лише `memory`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Строк дії неактивних сеансів Streamable HTTP. Після його закінчення звільняються ресурси мосту й завершується дочірній процес upstream. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Максимальна кількість активних сеансів Streamable HTTP в одному процесі. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Шлях до TLS-сертифіката у форматі PEM для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Шлях до закритого TLS-ключа у форматі PEM для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Шлях до файла TLS PFX/PKCS12 для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Парольна фраза для зашифрованого HTTPS-ключа або PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Рівень робочих журналів Streamable HTTP: `trace`, `debug`, `info`, `warn`, `error`, `fatal` або `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Проксі-сервер upstream Playwright MCP. Використовується як джерело GeoIP, коли зіставлення ввімкнено. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Список винятків проксі upstream для хостів, які не повинні використовувати `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Визначає GeoIP для `PLAYWRIGHT_MCP_PROXY_SERVER` і узгоджує параметри часового поясу та локалі у відбитку CloakBrowser з розташуванням цього проксі. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Вмикає людиноподібну поведінку миші, клавіатури й прокручування в CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Пресет поведінки CloakBrowser: `default` або `careful`. Використовується лише за ввімкненого humanize. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Канал випуску двійкового файла CloakBrowser: `stable` або доступний лише для Pro `preview`. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Шлях до власного виконуваного файла CloakBrowser. Параметр CLI `--binary-path` має пріоритет. |
| `CLOAKBROWSER_VERSION` | unset | Закріплена версія, що передається механізму визначення кешу CloakBrowser, якщо власний виконуваний файл не вибрано. Дійсний ключ безкоштовного тарифу ігнорує закріплення; CloakBrowser може повторно використати бінарний файл із кешу. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` використовує виконуваний файл CloakBrowser. `playwright` пропускає заміну виконуваного файла, специфічну для Cloak. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Запускає Chromium без графічного інтерфейсу. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Каталог артефактів для npm. У Docker задано `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Цільова мова генерації коду: `typescript`, `python`, `java`, `csharp` або `none`. Міст перевіряє значення й записує `codegen` до згенерованої конфігурації Playwright MCP. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` або `false`; додає до знімків межі кожного елемента як `[box=x,y,width,height]`. Міст перевіряє значення й записує `snapshot.boxes` до згенерованої конфігурації Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Час очікування в мілісекундах після дії, доки спричинена робота не стабілізується. Передається безпосередньо до Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Тайм-аут дій за замовчуванням у мілісекундах. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Тайм-аут навігації за замовчуванням у мілісекундах. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Розмір області перегляду браузера у форматі `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог постійного профілю Chromium. Міст перетворює його на абсолютний шлях, створює за відсутності, перевіряє доступність для запису та записує у згенероване `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-об'єкт із перевіреними параметрами контексту. Підтримувані поля перелічено нижче. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-масив або список через кому з наявними каталогами розширень Chrome. Потребує `PLAYWRIGHT_MCP_USER_DATA_DIR`. Використовуйте JSON-масиви для шляхів Windows або шляхів із комами. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Вмикає виправлення сумісності повідомлень консолі. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Додає стандартні аргументи запуску CloakBrowser для прихованості. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Додаткові аргументи Chromium як список через кому або масив JSON. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Додає `--no-sandbox` і вимикає пісочницю Chromium. |

## Керований CDP { #managed-cdp }

Керований доступ до Chrome DevTools Protocol (CDP) здійснюється лише за явним вибором. Він відкриває
такий самий браузер Chromium, що генерується і контролюється MCP через можливість
виявлення URL. Налаштування лише пулу портів не активує CDP.

| опція CLI | Змінна середовища | За замовчуванням | Мета |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Встановіть значення stdio та стандартне значення сесії Streamable HTTP. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | скинути | Налаштуйте пул портів зовнішнього проксі для локального процесу. Одна активна сесія орендує один порт. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Прив'яжіть керований проксі CDP. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Дозволити або заборонити прив'язку, що не є петлею. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | скинути | Вкажіть конкретний зовні доступний хост у URL-адресах для виявлення. Необхідно для прив’язки з підстановочними символами. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Опублікуйте URL-адреси `http`/`ws` або `https`/`wss`. Це не активує TLS. |

Кожне значення CLI перекриває лише відповідну змінну середовища. Зокрема,
`--no-cdp-enabled` замінює `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, і
`--no-cdp-allow-remote` перевизначає `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Увімкнена сесія без пулу портів відхиляється до того, як її upstream-дитина почне працювати.
Ефективне хибне значення не створює слухача, оренду порту або можливості.

Для stdio значення процесу застосовується безпосередньо:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Для Streamable HTTP, плоский логічний `cdpEnabled` у автентифікованому
Метадані `initialize` перевизначають стандартні налаштування процесу для цієї сесії. Пропуск
поле успадковує значення процесу. Ці приклади явно вибирають одну сесію та
ще один вихід:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": true
      }
    }
  }
}
```

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "cdpEnabled": false
      }
    }
  }
}
```

Одна сесія CDP з підтримкою HTTP має одну оренду зовнішнього порту. Вимкнені сесії не мають.
споживати пул. Виділення є локальним для процесу, вибирає найнижчого незадіяного кандидата,
і негайно скасовує ту сесію, якщо обраний зовнішній порт вже зайнятий.
Закрийте сеанси, щоб звільнити порти, або налаштуйте більший діапазон, коли пул вичерпано.

Отримайте поточний URL з `cloakbrowser_bridge_info`, потім передайте його
`structuredContent.cdp.discoveryUrl` клієнту CDP, наприклад, Playwright
`chromium.connectOverCDP()`. Ставтеся до цього URL як до облікових даних: він включає випадковий
здібність на одне покоління і стає застарілою після заміни браузера. Керований CDP є
не кінцева точка сервера Playwright. `chromium.connect()` та поточний Open WebUI
Потоки `PLAYWRIGHT_WS_URL` не підтримуються.

`--cdp-advertised-scheme https` публікує відкриття `https` та URL-адреси `wss` WebSocket
тільки. Міст не забезпечує TLS для керованого CDP: його зовнішній слухач та
Chromium hop залишатися у відкритому тексті HTTP/WebSocket. Закінчувач TLS, що належить оператору, повинен
слухати на тому ж рекламованому орендованому порту, зберігати рекламовані `Host` і `Origin`
повноваження і пересилати один на один тому прозорому слухачеві сесії.

Увімкнення CDP починається Chromium під час ініціалізації MCP, тому що власність і зовнішні
готовність можна перевірити. Налаштуйте таймаут ініціалізації клієнта MCP не менше ніж на 60
секунди. Коли увімкнено керування CDP, надане користувачем
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` не повинно містити `--remote-debugging-port`,
`--remote-debugging-address` або `--remote-debugging-pipe` (включаючи форми `=`).
Власна внутрішня `--remote-debugging-pipe` Playwright залишається увімкненою разом із
TCP-термінал з керованим мостом зворотного зв'язку.

Див. [Інструменти](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Безпека](security.md#managed-cdp-security), та
[Архітектура](architecture.md#managed-cdp-ownership) для стану виявлення, розгортання,
обмеження та поведінка при перезапуску.

## Ліцензія CloakBrowser і вхід через GitHub

Для налаштування ліцензії використовується CLI вихідного проєкту CloakBrowser;
`cloakbrowser-mcp` не додає команд входу або виходу:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

Команда `login` приймає платний ключ або запускає вхід через GitHub для
отримання ключа безкоштовного рівня. Перевірений ключ зберігається у
`~/.cloakbrowser/license.key`; команда `logout` видаляє цей файл. Команда
`info` повідомляє активний рівень ліцензії, а для ліцензій Pro — кількість
активних сеансів.

Натомість можна задати `CLOAKBROWSER_LICENSE_KEY` у середовищі MCP-сервера.
Міст передає цю змінну дочірньому процесу верхнього рівня/браузера, не
записуючи її до журналу. Якщо `CLOAKBROWSER_CACHE_DIR` указує на користувацький
кеш із файлом `license.key`, CloakBrowser визначає ключ, а міст передає зі
згенерованого середовища браузера лише цей визначений ключ. Інші згенеровані
записи середовища не копіюються.

Якщо CloakBrowser відхиляє переданий ліцензійний ключ або не може перевірити його через сервер ліцензій чи збережений результат перевірки, запуск завершується з явною помилкою CloakBrowser. Міст зберігає цю помилку: не приховує її та не переходить мовчки на інший браузер або рівень ліцензії.

Якщо сервер ліцензій недоступний, CloakBrowser може повторно використати збережений результат перевірки. Це не гарантує запуск без мережі: завантаження бінарного файла або запуск браузера все ще можуть завершитися помилкою.

## Канал випуску CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` вибирає канал випуску бінарного файла CloakBrowser. Типове значення — `stable`. `preview` запитує попередню Pro-збірку браузера та доступний лише з ліцензією Pro. Явно задана версія `CLOAKBROWSER_VERSION` має пріоритет під час завантаження без ключа або з платним ключем. Дійсний ключ безкоштовного тарифу ігнорує закріплення та може повторно використати бінарний файл із кешу. Якщо Preview недоступний для платформи, CloakBrowser повертається до Stable.

Канал випуску вибирається під час запуску процесу моста. Він застосовується до всіх сеансів Streamable HTTP і не може задаватися чи перевизначатися в метаданих initialize. Щоб змінити його, перезапустіть міст.

## Власний бінарний файл CloakBrowser

`--binary-path <path>` вибирає власний виконуваний файл CloakBrowser для поточного
процесу моста. `CLOAKBROWSER_BINARY_PATH` надає те саме налаштування для розгортань
через середовище; параметр CLI має пріоритет. Міст нормалізує шлях, вимагає доступний
для читання звичайний файл і записує його в `browser.launchOptions.executablePath`
створеної конфігурації Playwright MCP.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

Міст не завантажує та не оновлює власний виконуваний файл. Якщо шлях не задано,
`CLOAKBROWSER_VERSION` може закріпити версію бінарного файла, яким керує CloakBrowser.

Для Streamable HTTP вибраний бінарний файл належить процесу моста та
використовується всіма створеними ним сесіями MCP. Метадані `initialize` не можуть
вибирати або перевизначати виконуваний шлях; для різних бінарних файлів запускайте
окремі процеси моста.

Якщо вибрана збірка надає `document.modelContext` або `navigator.modelContext` з методом `getTools()`, upstream Playwright MCP може додавати інструменти `webmcp_<page-tool>` після знімка сторінки. Він надсилає `tools/list_changed`; міст пересилає сповіщення та оновлений список інструментів. Сторінка визначає ім’я та схему кожного динамічного інструмента.

## Збіг проксі-серверів за GeoIP

Установіть `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` разом із
`PLAYWRIGHT_MCP_PROXY_SERVER`, щоб визначити прапорці часового поясу, мови та
локалі CloakBrowser за місцем виходу проксі. Для підтримуваних бінарних файлів
CloakBrowser вибирає вбудовану автентифікацію в URL, а для старіших бінарних
файлів зберігає об'єкт проксі Playwright як резервний варіант.

Див. [Збіг проксі-серверів за GeoIP](geoip-proxy-matching.md) для ознайомлення з прикладами налаштування, метаданими
HTTP-проксі-серверів, що підтримують потокову передачу даних під час виконання, сценаріями використання, правилами пріоритетності та обмеженнями.

Короткий сценарій: [регіональне QA через проксі](recipes/regional-qa-through-proxy.md).

## Гуманізована поведінка при введенні даних

Встановіть `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, щоб увімкнути в CloakBrowser імітацію
миші, клавіатури та прокрутки для взаємодії зі сторінками. Міст застосовує це
через хук ініціалізації сторінки Playwright MCP, тому схеми інструментів браузера
вищого рівня залишаються незмінними.

Див. [«Гуманізована поведінка введення даних»](humanized-input-behavior.md) для ознайомлення з прикладами налаштування,
метаданими Streamable HTTP під час виконання, сценаріями використання та обмеженнями.

## Розширення Chrome { #chrome-extensions }

Розширення Chrome завантажуються під час запуску браузера, тому налаштуйте їх
до запуску мосту або до створення сеансу Streamable HTTP. Розширення мають бути
розпакованими каталогами та потребують постійного профілю:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP передайте каталоги профілю та розширення в метаданих
`initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "userDataDir": "/absolute/path/to/profile",
        "extensionPaths": ["/absolute/path/to/my-extension"]
      }
    }
  }
}
```

Перезапустіть міст або створіть новий HTTP-сеанс після зміни файлів розширень
або шляхів розширень. Використовуйте JSON-масив для
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, коли шляхи містять коми, під час
передавання кількох розширень або під час використання шляхів Windows із
літерами дисків.

Коротке налаштування з готовими прикладами: [завантаження розширення Chrome](recipes/load-chrome-extension.md).

## Режим підключення Playwright Extension { #playwright-extension-connection-mode }

Режим підключення через Playwright Extension відрізняється від завантаження розпакованого розширення через `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Він підключається через офіційне Playwright Extension, уже встановлене в профілі Chrome або Edge; міст не встановлює це розширення.

Для stdio налаштуйте змінні середовища процесу:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP метадані initialize `extensionMode` і `profileDirName` перевизначають відповідні значення рівня процесу. `userDataDir` також задається окремо для кожної сесії. Токен приймається лише із середовища процесу:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "extensionMode": true,
        "profileDirName": "Profile 1",
        "userDataDir": "/absolute/path/to/profile"
      }
    }
  }
}
```

Режим розширення потребує непорожнього токена й постійного профілю. Одночасні HTTP-сесії розширення повинні використовувати різні значення `userDataDir`. До запуску дочірнього процесу upstream міст відхиляє кінцеві точки managed або зовнішнього CDP, кінцеві точки віддаленого браузера, налаштування запуску без графічного інтерфейсу або в ізольованому режимі, параметри проксі та GeoIP, імітацію людської поведінки, зміну контексту, розпаковані `extensionPaths` і явно задані параметри запуску CloakBrowser. Перевірка успішного наскрізного сценарію виконується вручну, оскільки офіційне Playwright Extension має бути заздалегідь встановлене у вибраному профілі браузера.

## Метадані середовища виконання Streamable HTTP { #streamable-http-runtime-metadata }

HTTP-клієнти з підтримкою потокової передачі можуть вибирати певні параметри виконання для кожного сеансу MCP, додаючи
метадані, специфічні для мосту, до запиту `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
        "extensionMode": false,
        "profileDirName": "Profile 1",
        "humanize": true,
        "humanPreset": "careful",
        "userDataDir": "/absolute/path/to/profile",
        "contextOptions": {
          "viewport": { "width": 1280, "height": 720 },
          "locale": "en-US",
          "timezoneId": "America/New_York"
        },
        "extensionPaths": ["/absolute/path/to/extension"]
      }
    }
  }
}
```

`proxyServer` замінює `PLAYWRIGHT_MCP_PROXY_SERVER` для цієї сесії HTTP.
`proxyBypass` замінює `PLAYWRIGHT_MCP_PROXY_BYPASS` лише тоді, коли `proxyServer`
присутній. `geoipProxyMatch` може ввімкнути або вимкнути зіставлення за GeoIP для цієї сесії
без перезапуску сервера MCP. Існуючі сесії зберігають свій проксі-сервер запуску;
для зміни місцезнаходження створіть нову HTTP-сесію.

`humanize` може ввімкнути або вимкнути гуманізовану поведінку введення даних для цієї сесії,
не впливаючи на інші сесії. `humanPreset` дозволяє вибрати `default` або `careful`
для цієї сесії, але сам по собі не вмикає гуманізовану поведінку. Існуючі
сесії зберігають поведінку, зафіксовану під час `initialize`.

`headless` може вмикати або вимикати режим браузера без графічного інтерфейсу для цієї сесії. В образі Docker значення `headless`, рівне `false`, за потреби запускає приватний віртуальний дисплей контейнера. Поза образом сесії з графічним інтерфейсом і далі потрібне працездатне середовище відображення.

`extensionMode` і `profileDirName` перевизначають `PLAYWRIGHT_MCP_EXTENSION` і `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` для цієї сесії. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` ніколи не приймається в метаданих.

`userDataDir` вмикає постійний профіль Chromium для цієї сесії та
перевизначає `PLAYWRIGHT_MCP_USER_DATA_DIR`. Міст перетворює каталог на
абсолютний шлях у форматі поточної платформи, створює його за відсутності,
перевіряє доступність для запису та записує у згенероване
`browser.userDataDir`. Постійний профіль вимикає стандартний ізольований
профіль Streamable HTTP для цієї сесії. Міст відхиляє дубльовані активні
каталоги профілю в межах одного процесу; конфлікти профілів між процесами
залишаються помилками Chromium/Playwright.

`contextOptions` перевіряються та поверхнево об'єднуються поверх
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; вкладені об'єкти замінюються цілком.
Підтримувані поля: `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` і `hasTouch`. Довільна передача `BrowserContextOptions` у цьому
випуску не підтримується.

`extensionPaths` мають указувати на наявні каталоги та потребують постійного
`userDataDir`. Міст перетворює шляхи розширень на абсолютні шляхи поточної
платформи, передає їх у CloakBrowser і записує згенеровані Chromium-аргументи
`--load-extension` і `--disable-extensions-except` у згенеровану конфігурацію
Playwright MCP.

Повноваження проксі-сервера HTTP з автентифікацією можна вбудувати в `proxyServer`, наприклад,
`http://user:pass@proxy.example:8080`. Символи облікових даних,
які мають значення в URL-адресі, слід кодувати у форматі «процент», наприклад `@`, `:`, `/`, `?`, `#`, та `%`.

У підтримуваних бінарних файлах CloakBrowser автентифіковані HTTP-проксі
використовують вбудовану автентифікацію в URL, а міст видаляє дубльований об'єкт
проксі Playwright. Старіші бінарні файли зберігають об'єкт проксі Playwright як
резервний варіант сумісності.

Щодо моделей контролю якості для декількох локацій див. [Збіг проксі-серверів за GeoIP](geoip-proxy-matching.md).
Щодо шаблонів реалістичності взаємодії див. [Гуманізована поведінка при введенні даних](humanized-input-behavior.md).


Для повторного використання входу й налаштування розширень див. [постійний профіль входу](recipes/persistent-login-profile.md) і [завантаження розширення Chrome](recipes/load-chrome-extension.md).

## Параметри upstream Playwright MCP

Міст передає налаштування `PLAYWRIGHT_MCP_*` до верхнього рівня Playwright MCP. Сюди входять такі параметри верхнього рівня, як:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_FILE_PATHS`
- `PLAYWRIGHT_MCP_IDLE_TIMEOUT`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_PROFILE_DIR_NAME`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`
- `PLAYWRIGHT_MCP_WEBMCP`

Повний перелік опцій, що надаються розробниками Playwright MCP, дивіться в їхній документації.

`PLAYWRIGHT_MCP_CAPS=devtools` успадковується дочірнім upstream-процесом і
вмикає інструменти цієї можливості без окремого прапорця моста `--caps`.

## Ведення журналу

У режимі Streamable HTTP журнали запуску та запитів, зрозумілі для людини, записуються у stdout. У режимі stdio рутинні операційні журнали не виводяться, тому stdout MCP JSON-RPC залишається «чистим» з точки зору протоколу. Помилки запуску CLI, що призводять до збою, як і раніше, записуються у stderr.

## HTTPS { #https }

Streamable HTTP за замовчуванням використовує локальний HTTP. Виберіть прямий TLS із `--http-protocol https` або `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, а потім надайте пару сертифікат/ключ або файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для зовнішнього доступу або доступу без використання функції loopback використовуйте протокол HTTPS разом із `--http-auth-token` або завершуйте з’єднання TLS на надійному зворотньому проксі-сервері, який також забезпечує аутентифікацію та контроль доступу до мережі.

## Сесії HTTP, що підтримують потокову передачу даних

Кожен сеанс Streamable HTTP MCP має власне середовище виконання мосту та дочірній процес upstream Playwright MCP. Типово сеанси HTTP використовують ізольовані профілі браузера, якщо постійний профіль не налаштовано. Явний постійний профіль блокується; одночасним сеансам потрібні різні каталоги профілів. Вбудований бекенд `memory` зберігає лише метадані: ідентифікатор сеансу, часові мітки, термін дії та статус. Стан браузера залишається в активному дочірньому процесі upstream, а артефакти контролюються `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для горизонтального масштабування запустіть кілька реплік сервера за балансувальником навантаження з використанням «прив’язаних» сесій, що ідентифікуються за заголовком `mcp-session-id`. Майбутні бекенди Redis, Postgres або SQLite зможуть координувати метадані та блокування, але вони не зможуть відновити активну сесію браузера після завершення процесу, якому вона належить.

## HTTP-зонди, що підтримують потокову передачу даних

Коли міст працює з `--transport streamable-http`, він надає доступ до фіксованих кінцевих точок зондування на тому самому хості та порту, що й кінцева точка MCP:

- `GET /healthz` повертає метадані про стан процесу: `status`, `version`, `transport` та `uptimeMs`.
- `GET /readyz` повертає метадані готовності та ємність сеансу: `sessions.active`, `sessions.pending`, `sessions.max` та `sessions.available`.

Функція готовності повертає HTTP `200`, поки є вільні ресурси сеансу, та HTTP `503`, коли `active + pending >= max`.
Якщо налаштовано `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, обидва зонди вимагають того самого заголовка `Authorization: Bearer ...`, що й запити MCP. Без токена автентифікації зонди відкриті на налаштованій адресі прив'язки HTTP.

## Додаткові практичні сценарії

Щоб обрати між upstream Playwright MCP і цим пакетом, перегляньте [порівняння](comparison.md). Для швидких задач використовуйте [рецепти](recipes/index.md): постійний профіль, розширення, reverse proxy, регіональне QA, Claude Desktop, Codex CLI і smoke-тест CI.
