---
description: Запустіть Docker-образ CloakBrowser MCP для повторюваної автоматизації браузера Playwright MCP з постійними профілями /data, монтуванням розширень і CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

Опублікований образ є рекомендованим середовищем виконання для стабільного використання MCP.

Для короткого розгортання вже запущеного HTTP-сервера за TLS та автентифікацією використовуйте [рецепт Docker Streamable HTTP зі зворотним проксі](recipes/docker-streamable-http-reverse-proxy.md).

## Запустити

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артефакти записуються в `/data` у контейнері. Змонтуйте цей шлях, щоб зберігати знімки екрана, знімки стану, завантажені файли та вихідні дані мережі.

Образ уже запускає Tini як PID 1 і subreaper, тому звичайним командам не потрібен додатковий init-процес Docker.

Ті самі теги випусків публікуються на Docker Hub як `swimmwatch/cloakbrowser-mcp`, а на GHCR — як `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Сесії з графічним інтерфейсом і віртуальний дисплей { #headed-sessions-and-virtual-display }

В образі за замовчуванням задано `PLAYWRIGHT_MCP_HEADLESS=true`; сесії без графічного інтерфейсу не запускають Xvfb. Коли сесія запитує `headless: false`, launcher за потреби запускає один приватний для контейнера дисплей Xvfb, чекає на його готовність і зберігає його до завершення контейнера. Одночасні HTTP-сесії з графічним інтерфейсом спільно використовують цей дисплей, а їхні контексти браузера Playwright, сторінки, профілі й артефакти залишаються ізольованими.

Для stdio-сесії з графічним інтерфейсом задайте стандартну змінну Playwright MCP:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Це не видимий робочий стіл і не сервіс передавання графічного інтерфейсу: образ не надає VNC, noVNC, RDP, доступу до X11 хоста або захоплення екрана. Не вважайте нативний фокус X11, буфер обміну або захоплення екрана межами ізоляції орендарів. Launcher зупиняє дисплей під час завершення роботи; помилка запуску або завершення MCP CLI зупиняє контейнер, а не залишає працездатний міст.

Поза цим образом браузеру з графічним інтерфейсом і далі потрібне працездатне середовище відображення. Задайте `PLAYWRIGHT_MCP_HEADLESS=true`, якщо дисплей недоступний.

## Стан контейнера й обмежене середовище виконання { #container-health-and-restricted-runtime }

Docker `HEALTHCHECK` використовує приватний Unix-сокет і активно перевіряє, чи відповідає цикл подій MCP CLI. Якщо Xvfb було запущено, перевіряється також дисплей X11; контейнер без графічного інтерфейсу, у якому дисплей ніколи не запитувався, залишається healthy. Запуск, зупинка або збій дисплея означає unhealthy. Відповідь X11 перевіряється в межах 1 секунди, відповідь CLI — 750 мілісекунд, приватний запит перевірки стану — 2,5 секунди, а Docker завершує одну команду перевірки через 3 секунди. За інтервалу Docker 2 секунди й двох повторних спроб переходи стану залежать від планування Docker і не є цільовим рівнем доступності сервісу. Ця перевірка відокремлена від публічних HTTP-точок `/healthz` і `/readyz` та ніколи не передає трафік через MCP stdio. Вона не доводить працездатність браузера, MCP-сесії або віддаленого сайту; перезапуском і відновленням керує зовнішній оркестратор.

Launcher дає кожному дочірньому процесу до 8 секунд на завершення після `SIGTERM`, потім до 2 секунд після `SIGKILL`; тайм-аут зупинки Docker має враховувати послідовне завершення CLI і Xvfb. Образ працює від непривілейованого користувача `node` і допускає кореневу файлову систему лише для читання. Збережіть монтування `/data` для артефактів і надайте тимчасові монтування з доступом на запис для `/tmp` та `/tmp/.X11-unix`, якщо можливі сесії з графічним інтерфейсом. Сокет перевірки стану доступний лише власнику (`0600`). Локальний X11-сокет контейнера спільно використовується процесом `node` та Xvfb, тому він не є межею ізоляції орендарів. Не монтуйте жоден із цих сокетів із хоста й не використовуйте їх спільно між контейнерами.

## Постійні профілі { #persistent-profiles }

Docker не вмикає постійний профіль браузера за замовчуванням. Використовуйте
наявний том `/data` як корінь збереження, якщо хочете, щоб cookie, локальне
сховище, кеш або стан розширень зберігалися після перезапусків контейнера:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Змінні середовища всередині Docker мають використовувати шляхи контейнера, як-от
`/data/profiles/default`, а не шляхи хоста. Міст створює каталог профілю за
відсутності, перевіряє доступність для запису, записує шлях контейнера у
згенеровану конфігурацію Playwright MCP і відхиляє дубльовані активні каталоги
профілю всередині одного серверного процесу.

## Кеш ліцензії CloakBrowser

Образ зберігає бінарні файли CloakBrowser, стан ліцензії та кеш перевірки в
`/home/node/.cloakbrowser`. Змонтуйте в цей каталог іменований том, щоб
зберігати вхід безкоштовного рівня GitHub або Pro під час заміни контейнера:

```bash
docker volume create cloakbrowser-cache

docker run --rm -it \
  --entrypoint node \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  swimmwatch/cloakbrowser-mcp:latest \
  /opt/cloakbrowser-mcp/node_modules/cloakbrowser/dist/cli.js login

docker run --rm -i \
  -v cloakbrowser-cache:/home/node/.cloakbrowser \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Використовуйте той самий том із вихідною командою `info` або `logout`, щоб
перевірити чи видалити збережений вхід. Натомість можна передати
`CLOAKBROWSER_LICENSE_KEY` через систему керування секретами контейнера. Не
розміщуйте ліцензійні ключі в шарах образу, файлах Compose у системі контролю
версій або у виводі команд, збереженому як доказ збірки.

## Власний бінарний файл CloakBrowser

Змонтуйте сумісний виконуваний файл браузера в контейнер і передайте шлях усередині
контейнера через `--binary-path` (або `CLOAKBROWSER_BINARY_PATH`):

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

Файл має бути доступним для читання виконуваним файлом Linux, сумісним з
архітектурою CPU образу; необхідні йому бібліотеки мають бути доступні в контейнері.
Цей шлях діє для всіх Streamable HTTP-сесій контейнера; для різних бінарних файлів
браузера запускайте окремі контейнери.

## Розширення Chrome { #chrome-extensions }

Розширення Chrome потребують постійного профілю та мають монтуватися окремо.
Використовуйте шляхи контейнера в змінних середовища, а не шляхи хоста.
Монтування розширення може бути доступне лише для читання:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Використовуйте JSON-масив для `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, коли шлях
містить коми або під час передавання кількох каталогів розширень.
Перезапустіть контейнер після зміни файлів розширень або шляхів розширень.

Режим підключення Playwright Extension відрізняється від монтування розпакованого розширення вище. Він потребує офіційного розширення у persistent Chrome/Edge profile та `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Монтуйте кожну profile в окремий writable path, передавайте token через secret manager і не поєднуйте `PLAYWRIGHT_MCP_EXTENSION=true` з `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP-потік { #streamable-http }

Для локального використання Streamable HTTP опублікуйте порт контейнера на петлі зворотного зв’язку:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для HTTP-сесій з графічним інтерфейсом задайте контейнеру `PLAYWRIGHT_MCP_HEADLESS=false`. Окремі запити initialize і далі можуть вибирати режим без графічного інтерфейсу через підтримувані метадані MCP.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Щоб налаштувати прямий доступ через HTTPS з контейнера, підключіть файли сертифікатів і виберіть HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Прив’язка `127.0.0.1:3000` на стороні хоста забезпечує локальність кінцевої точки. Якщо ви публікуєте Streamable HTTP на інтерфейсі, що не є петлевим, використовуйте HTTPS з автентифікацією або розмістіть сервер за надійним зворотним проксі-сервером із завершенням TLS, що підтримує автентифікацію та мережеві засоби контролю.
Streamable HTTP відкриває фіксовані `GET /healthz` та `GET /readyz` на тому самому хості та порту. Якщо налаштовано `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, проби вимагають такого самого заголовка `Authorization: Bearer ...`, як і запити MCP.
Дивіться згенерований [Довідник CLI](generated/cli.md) для ознайомлення з усіма прапорцями HTTP-транспорту та змінними середовища.

## Керований CDP { #managed-cdp }

Опублікуйте налаштований керований діапазон CDP один до одного. Цей приклад stdio дозволяє один
сесія і тримає кожен порт хоста прив’язаним до зворотного інтерфейсу:

```bash
docker run --rm -i \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --cdp-enabled \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

`--cdp-host 0.0.0.0` потрібен для переадресації портів Docker, тому явний
`--cdp-allow-remote` опт-ін та конкретний `--cdp-advertised-host` також потрібні.
Не переналаштовуйте діапазон на інші номери портів хоста: URL-адреси для виявлення містять
Орендований порт і кожен опублікований порт повинні маршрутизувати один до одного зі своєю власною сесією.

Для багатосесійного Streamable HTTP налаштуйте та опублікуйте пул без встановлення
виконувати за замовчуванням, якщо клієнти повинні вибирати індивідуально:

```bash
docker run --rm \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:9222-9231:9222-9231 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http \
  --http-host 0.0.0.0 \
  --http-port 3000 \
  --cdp-port-range 9222-9231 \
  --cdp-host 0.0.0.0 \
  --cdp-allow-remote \
  --cdp-advertised-host 127.0.0.1
```

Аутентифікований запит `initialize` з орендами `cdpEnabled: true` одного опублікованого
порт. Пропущене значення успадковує значення за замовчуванням процесу, тоді як `cdpEnabled: false`
явно відмовляється і не використовує жодного порту CDP. Вичерпання пулу відхиляє лише новий
Сесія з увімкненим CDP; вона не зменшує потужність для відключених сесій.

Прочитайте здатний URL з `cloakbrowser_bridge_info`. Не кладіть його всередину
журнали контейнера або перевірки стану. Підключіться до CDP API, такого як
`chromium.connectOverCDP()`; URL не сумісний з Playwright
`chromium.connect()` або поточний потік Open WebUI.

`--cdp-advertised-scheme https` змінює опубліковані URL на `https`/`wss`, але
міст не забезпечує TLS для керованого CDP. Використовуйте термінатор TLS, який належить оператору, що
займає той самий рекламований порт у зовнішньому просторі імен мережі, зберігає
`Host`/`Origin`, і пересилає один до одного до слухача містка відкритого тексту. The
мост до Chromium hop також залишається відкритим текстовим тунелем зворотного трафіку.

## Збіг проксі-серверів за GeoIP { #geoip-proxy-matching }

Docker використовує ті самі змінні середовища для проксі та GeoIP, що й npm. Увімкніть
відповідність проксі GeoIP, коли регіональний відділ контролю якості потребує, щоб «відбитки» часового поясу, мови та
локалі CloakBrowser відповідали налаштованому місцезнаходженню проксі:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Для проксі-серверів, що вимагають автентифікації, вбудуйте облікові дані в URL-адресу проксі-сервера та застосуйте відсоткове кодування
спеціальних символів у імені користувача або паролі.

Підтримувані бінарні файли CloakBrowser використовують вбудовану автентифікацію
проксі в URL; старіші бінарні файли переходять на об'єкт проксі Playwright.

Коли контейнер виконує Streamable HTTP, клієнти також можуть обирати різні
проксі для кожного сеансу MCP за допомогою метаданих `initialize`. Див.
[Підбір проксі за GeoIP](geoip-proxy-matching.md) для отримання інформації про метадані проксі під час виконання,
приклади використання у різних регіонах та обмеження.

## Значення за замовчуванням

| Variable | Default |
| --- | --- |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `/data` |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` |

## Конфігурація клієнта MCP

```json
{
  "mcpServers": {
    "cloakbrowser": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Скомпілювати локально { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

Файл Dockerfile використовує зафіксований офіційний образ Playwright MCP як основу для середовища виконання, застосовує доступні оновлення безпеки Debian під час збірки, видаляє невикористані глобальні компоненти npm з образу середовища виконання та встановлює міст під `/opt/cloakbrowser-mcp`.

У рамках робочого процесу випуску публікуються SBOM та сертифікати походження, додаються мітки OCI для вказівки джерела, редакції, версії, ліцензії, назви базового образу та дайджесту базового образу, а також перед публікацією збірно образ перевіряється за допомогою Trivy.

## Додаткові практичні сценарії

Щоб обрати між upstream Playwright MCP і цим пакетом, перегляньте [порівняння](comparison.md). Для швидких задач використовуйте [рецепти](recipes/index.md): постійний профіль, розширення, reverse proxy, регіональне QA, Claude Desktop, Codex CLI і smoke-тест CI.
