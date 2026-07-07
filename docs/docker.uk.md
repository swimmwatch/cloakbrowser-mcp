---
description: Запустіть Docker-образ CloakBrowser MCP для повторюваної автоматизації браузера Playwright MCP з постійними профілями /data, монтуванням розширень і CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

Опублікований образ є рекомендованим середовищем виконання для стабільного використання MCP.

## Запустити

```bash
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артефакти записуються в `/data` у контейнері. Змонтуйте цей шлях, щоб зберігати знімки екрана, знімки стану, завантажені файли та вихідні дані мережі.

`--init` рекомендується, оскільки автоматизація роботи браузера може створювати короткочасні дочірні процеси. Процес ініціалізації Docker коректно завершує роботу цих дочірніх процесів.

Ті самі теги випусків публікуються на Docker Hub як `swimmwatch/cloakbrowser-mcp`, а на GHCR — як `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Постійні профілі

Docker не вмикає постійний профіль браузера за замовчуванням. Використовуйте
наявний том `/data` як корінь збереження, якщо хочете, щоб cookie, локальне
сховище, кеш або стан розширень зберігалися після перезапусків контейнера:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Змінні середовища всередині Docker мають використовувати шляхи контейнера, як-от
`/data/profiles/default`, а не шляхи хоста. Міст створює каталог профілю за
відсутності, перевіряє доступність для запису, записує шлях контейнера у
згенеровану конфігурацію Playwright MCP і відхиляє дубльовані активні каталоги
профілю всередині одного серверного процесу.

## Розширення Chrome

Розширення Chrome потребують постійного профілю та мають монтуватися окремо.
Використовуйте шляхи контейнера в змінних середовища, а не шляхи хоста.
Монтування розширення може бути доступне лише для читання:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Використовуйте JSON-масив для `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, коли шлях
містить коми або під час передавання кількох каталогів розширень.
Перезапустіть контейнер після зміни файлів розширень або шляхів розширень.

## HTTP-потік

Для локального використання Streamable HTTP опублікуйте порт контейнера на петлі зворотного зв’язку:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Щоб налаштувати прямий доступ через HTTPS з контейнера, підключіть файли сертифікатів і виберіть HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Прив’язка `127.0.0.1:3000` на стороні хоста забезпечує локальність кінцевої точки. Якщо ви публікуєте Streamable HTTP на інтерфейсі, що не є петлевим, використовуйте HTTPS з автентифікацією або розмістіть сервер за надійним зворотним проксі-сервером із завершенням TLS, що підтримує автентифікацію та мережеві засоби контролю.
Streamable HTTP відкриває фіксовані `GET /healthz` та `GET /readyz` на тому самому хості та порту. Якщо налаштовано `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, проби вимагають такого самого заголовка `Authorization: Bearer ...`, як і запити MCP.
Дивіться згенерований [Довідник CLI](generated/cli.md) для ознайомлення з усіма прапорцями HTTP-транспорту та змінними середовища.

## Збіг проксі-серверів за GeoIP

Docker використовує ті самі змінні середовища для проксі та GeoIP, що й npm. Увімкніть
відповідність проксі GeoIP, коли регіональний відділ контролю якості потребує, щоб «відбитки» часового поясу, мови та
локалі CloakBrowser відповідали налаштованому місцезнаходженню проксі:

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Для проксі-серверів, що вимагають автентифікації, вбудуйте облікові дані в URL-адресу проксі-сервера та застосуйте відсоткове кодування
спеціальних символів у імені користувача або паролі.

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
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` |
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
        "--init",
        "-i",
        "-v",
        "/tmp/cloakbrowser-artifacts:/data",
        "swimmwatch/cloakbrowser-mcp:latest"
      ]
    }
  }
}
```

## Скомпілювати локально

```bash
npm run docker:build
npm run docker:smoke
```

Файл Dockerfile використовує зафіксований офіційний образ Playwright MCP як основу для середовища виконання, застосовує доступні оновлення безпеки Debian під час збірки, видаляє невикористані глобальні компоненти npm з образу середовища виконання та встановлює міст під `/opt/cloakbrowser-mcp`.

У рамках робочого процесу випуску публікуються SBOM та сертифікати походження, додаються мітки OCI для вказівки джерела, редакції, версії, ліцензії, назви базового образу та дайджесту базового образу, а також перед публікацією збірно образ перевіряється за допомогою Trivy.

## Додаткові практичні сценарії

Щоб обрати між upstream Playwright MCP і цим пакетом, перегляньте [порівняння](comparison.md). Для швидких задач використовуйте [рецепти](recipes/index.md): постійний профіль, розширення, reverse proxy, регіональне QA, Claude Desktop, Codex CLI і smoke-тест CI.
