---
description: Конфигурация среды выполнения для моста Playwright MCP, включая Streamable HTTP-сессии, постоянные профили, проверенные параметры контекста, пути расширений, сопоставление прокси по GeoIP и гуманизированный ввод.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Настройка

Используйте переменные `PLAYWRIGHT_MCP_*` на входе для обеспечения поведения Playwright MCP. Используйте `CLOAK_PLAYWRIGHT_MCP_*` только для поведения моста, специфичного для Cloak.

Старые переменные `CLOAKBROWSER_MCP_*` не поддерживаются.
Сгенерированный [Справочник CLI](generated/cli.md) является авторитетным списком флагов CLI моста и соответствующих им переменных среды.

## Параметры моста

| Переменная | По умолчанию | Описание |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Транспорт моста: `stdio` или `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Протокол слушателя Streamable HTTP: `http` или `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Адрес привязки слушателя Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Порт привязки слушателя Streamable HTTP. Используйте `0` для временного порта в тестах. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Путь конечной точки Streamable HTTP. `/healthz` и `/readyz` зарезервированы для проверок состояния. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Необязательный Bearer-токен, который при настройке требуется в запросах Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Хранилище метаданных сеансов. В этом выпуске реализовано только `memory`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Срок действия неактивных сеансов Streamable HTTP. При истечении срока освобождаются ресурсы моста и завершается дочерний процесс upstream. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Максимальное число активных сеансов Streamable HTTP в одном процессе. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Путь к TLS-сертификату в формате PEM для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Путь к закрытому TLS-ключу в формате PEM для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Путь к файлу TLS PFX/PKCS12 для Streamable HTTP через HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Парольная фраза для зашифрованного HTTPS-ключа или PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Уровень рабочих журналов Streamable HTTP: `trace`, `debug`, `info`, `warn`, `error`, `fatal` или `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Прокси-сервер upstream Playwright MCP. Используется как источник GeoIP, когда сопоставление включено. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Список исключений прокси upstream для хостов, которые не должны использовать `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Определяет GeoIP для `PLAYWRIGHT_MCP_PROXY_SERVER` и согласует параметры часового пояса и локали в отпечатке CloakBrowser с расположением этого прокси. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Включает человекоподобное поведение мыши, клавиатуры и прокрутки в CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Пресет поведения CloakBrowser: `default` или `careful`. Используется только при включённом humanize. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Канал выпуска двоичного файла CloakBrowser: `stable` или доступный только для Pro `preview`. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Путь к пользовательскому исполняемому файлу CloakBrowser. Параметр CLI `--binary-path` имеет приоритет. |
| `CLOAKBROWSER_VERSION` | unset | Закреплённая версия, передаваемая механизму разрешения кэша CloakBrowser, если пользовательский исполняемый файл не выбран. Действительный ключ бесплатного тарифа игнорирует закрепление; CloakBrowser может повторно использовать бинарный файл из кэша. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` использует исполняемый файл CloakBrowser. `playwright` пропускает замену исполняемого файла, специфичную для Cloak. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Запускает Chromium без графического интерфейса. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Каталог артефактов для npm. В Docker задан `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Целевой язык генерации кода: `typescript`, `python`, `java`, `csharp` или `none`. Мост проверяет значение и записывает `codegen` в сгенерированную конфигурацию Playwright MCP. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` или `false`; добавляет в снимки границы каждого элемента как `[box=x,y,width,height]`. Мост проверяет значение и записывает `snapshot.boxes` в сгенерированную конфигурацию Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Время ожидания в миллисекундах после действия, пока вызванная работа не стабилизируется. Напрямую передается в Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Тайм-аут действий по умолчанию в миллисекундах. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Тайм-аут навигации по умолчанию в миллисекундах. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Размер области просмотра браузера в формате `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Каталог постоянного профиля Chromium. Мост преобразует его в абсолютный путь, создает при отсутствии, проверяет доступность для записи и записывает в сгенерированное `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-объект с проверенными параметрами контекста. Поддерживаемые поля перечислены ниже. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-массив или список через запятую с существующими каталогами расширений Chrome. Требует `PLAYWRIGHT_MCP_USER_DATA_DIR`. Используйте JSON-массивы для путей Windows или путей с запятыми. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Включает исправление совместимости сообщений консоли. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Добавляет стандартные аргументы запуска CloakBrowser для скрытности. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Дополнительные аргументы Chromium в виде списка через запятую или массива JSON. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Добавляет `--no-sandbox` и отключает песочницу Chromium. |

## Управляемый CDP { #managed-cdp }

Управляемый доступ к протоколу Chrome DevTools (CDP) является явным выбором. Он открывает
тот же браузер Chromium, управляемый MCP через обладающий возможностями
обнаружение URL. Настройка только пула портов не включает CDP.

| опция CLI | Переменная окружения | По умолчанию | Цель |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Установите значение stdio и значение по умолчанию сеанса Streamable HTTP. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | снять | Настройте локальный порт прокси для процесса. Каждая активная сессия использует один порт. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Привяжите управляемый прокси CDP. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Разрешить или запретить привязку, не являющуюся петлевой. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | снять | Укажите конкретный доступный снаружи хост в URL-адресах обнаружения. Требуется для привязки с подстановочными знаками. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Публикуйте URL-адреса `http`/`ws` или `https`/`wss`. Это не включает TLS. |

Каждое значение CLI переопределяет только соответствующую переменную окружения. В частности,
`--no-cdp-enabled` переопределяет `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, и
`--no-cdp-allow-remote` перезаписывает `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Включённая сессия без пула портов отвергается до того, как начнёт работу её дочерний поток вверх по цепочке.
Эффективное ложное значение не создаёт ни слушателя, ни аренды порта, ни возможности.

Для stdio значение процесса применяется напрямую:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Для Streamable HTTP, плоская булева переменная `cdpEnabled` в аутентифицированном
Метаданные `initialize` переопределяют настройки процесса по умолчанию для этой сессии. Пропуск
поле наследует значение процесса. Эти примеры явно выбирают одну сессию и
ещё один вариант:

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

Одна сессия CDP с включенным HTTP владеет одной арендой внешнего порта. Отключенные сессии не владеют.
потреблять пул. Выделение локально для процесса, выбирает наименьшего неарендованного кандидата,
и немедленно завершает эту сессию с ошибкой, если выбранный внешний порт уже занят.
Закрывайте сессии, чтобы освободить порты, или настройте больший диапазон, когда пул исчерпан.

Получите текущий URL из `cloakbrowser_bridge_info`, затем передайте его
`structuredContent.cdp.discoveryUrl` клиенту CDP, такому как Playwright
`chromium.connectOverCDP()`. Рассматривайте этот URL как учетные данные: он включает случайное
постоянная возможность на одно поколение и устаревает после замены браузера. Управляемый CDP является
не конечная точка сервера Playwright. `chromium.connect()` и текущая Open WebUI
Потоки `PLAYWRIGHT_WS_URL` не поддерживаются.

`--cdp-advertised-scheme https` публикует `https` открытие и `wss` WebSocket URL-адреса
только. Мост не предоставляет TLS для управляемого CDP: его внешний слушатель и
Chromium хоп остается в открытом виде HTTP/WebSocket. Стопор TLS, принадлежащий оператору, должен
слушать на том же объявленном арендованном порту, сохранять объявленные `Host` и `Origin`
власть и пересылать один к одному этому сессионному слушателю открытого текста.

Включение CDP начинается с Chromium во время инициализации MCP, поэтому владение и внешнее
готовность может быть проверена. Настройте тайм-аут инициализации клиента MCP как минимум на 60
секунды. Когда включен управляемый CDP, поставляемый пользователем
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` не должен содержать `--remote-debugging-port`,
`--remote-debugging-address` или `--remote-debugging-pipe` (включая формы `=`).
Собственная внутренняя `--remote-debugging-pipe` Playwright остается включенной вместе с
управляемая мостом петлевая TCP-точка

Смотрите [Инструменты](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Безопасность](security.md#managed-cdp-security), и
[Архитектура](architecture.md#managed-cdp-ownership) для состояния обнаружения, развертывания,
ограничения и поведение при перезапуске.

## Лицензия CloakBrowser и вход через GitHub

Для настройки лицензии используется CLI исходного проекта CloakBrowser;
`cloakbrowser-mcp` не добавляет команды входа или выхода:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

Команда `login` принимает платный ключ или запускает вход через GitHub для
получения ключа бесплатного уровня. Проверенный ключ сохраняется в
`~/.cloakbrowser/license.key`; команда `logout` удаляет этот файл. Команда
`info` сообщает активный уровень лицензии, а для лицензий Pro — количество
активных сеансов.

Вместо этого можно задать `CLOAKBROWSER_LICENSE_KEY` в окружении MCP-сервера.
Мост передает эту переменную дочернему процессу верхнего уровня/браузера, не
записывая ее в журнал. Если `CLOAKBROWSER_CACHE_DIR` указывает на
пользовательский кэш с файлом `license.key`, CloakBrowser разрешает ключ, а мост
передает из сгенерированного окружения браузера только этот разрешенный ключ.
Другие сгенерированные записи окружения не копируются.

Если CloakBrowser отклоняет переданный ключ лицензии или не может проверить его через сервер лицензий либо сохранённый результат проверки, запуск завершается с явной ошибкой CloakBrowser. Мост сохраняет эту ошибку: не скрывает её и не переключается молча на другой браузер или тариф лицензии.

Если сервер лицензий недоступен, CloakBrowser может повторно использовать сохранённый результат проверки. Это не гарантирует запуск без сети: скачивание бинарного файла или запуск браузера всё ещё могут завершиться ошибкой.

## Канал выпуска CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` выбирает канал выпуска бинарного файла CloakBrowser. По умолчанию используется `stable`. `preview` запрашивает предварительную Pro-сборку браузера и доступен только с лицензией Pro. Явное закрепление `CLOAKBROWSER_VERSION` имеет приоритет при скачивании без ключа или с платным ключом. Действительный ключ бесплатного тарифа игнорирует закрепление и может повторно использовать бинарный файл из кэша. Если Preview недоступен для платформы, CloakBrowser возвращается к Stable.

Канал выпуска выбирается при запуске процесса моста. Он применяется ко всем сеансам Streamable HTTP и не может задаваться или переопределяться в метаданных initialize. Чтобы изменить его, перезапустите мост.

## Пользовательский бинарный файл CloakBrowser

`--binary-path <path>` выбирает пользовательский исполняемый файл CloakBrowser для
текущего процесса моста. `CLOAKBROWSER_BINARY_PATH` задаёт то же значение для
развёртываний через окружение; параметр CLI имеет приоритет. Мост нормализует путь,
требует доступный для чтения обычный файл и записывает его в
`browser.launchOptions.executablePath` созданной конфигурации Playwright MCP.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

Мост не скачивает и не обновляет пользовательский исполняемый файл. Если путь не
задан, `CLOAKBROWSER_VERSION` может закрепить версию бинарного файла, которым
управляет CloakBrowser.

Для Streamable HTTP выбранный бинарный файл принадлежит процессу моста и
используется всеми созданными им сессиями MCP. Метаданные `initialize` не могут
выбирать или переопределять исполняемый путь; для разных бинарных файлов запускайте
отдельные процессы моста.

Если выбранная сборка предоставляет `document.modelContext` или `navigator.modelContext` с методом `getTools()`, upstream Playwright MCP может добавлять инструменты `webmcp_<page-tool>` после снимка страницы. Он отправляет `tools/list_changed`; мост пересылает уведомление и обновлённый список инструментов. Страница определяет имя и схему каждого динамического инструмента.

## Сопоставление прокси-серверов по GeoIP

Установите `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` вместе с
`PLAYWRIGHT_MCP_PROXY_SERVER`, чтобы определить флаги часового пояса, языка и
локали CloakBrowser по местоположению выхода прокси. Для поддерживаемых бинарных
файлов CloakBrowser выбирает встроенную аутентификацию в URL, а для старых
бинарных файлов сохраняет объект прокси Playwright как резервный вариант.

См. раздел [Сопоставление прокси-серверов по GeoIP](geoip-proxy-matching.md) для ознакомления с примерами настройки, метаданными прокси-серверов Streamable HTTP,
вариантами использования, правилами приоритета и ограничениями.

Краткий сценарий: [региональная QA через прокси](recipes/regional-qa-through-proxy.md).

## Поведение ввода данных, приближенное к человеческому

Установите `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, чтобы включить в CloakBrowser имитирующий человеческое поведение
уровень управления мышью, клавиатурой и прокруткой для взаимодействия со страницами. Мост применяет это
через хук инициализации страницы Playwright MCP, поэтому исходные схемы браузерных инструментов
остаются неизменными.

См. раздел [«Поведение гуманизированного ввода»](humanized-input-behavior.md) для ознакомления с примерами настройки,
метаданными Streamable HTTP во время выполнения, сценариями использования и ограничениями.

## Расширения Chrome { #chrome-extensions }

Расширения Chrome загружаются при запуске браузера, поэтому настройте их до
запуска моста или до создания сеанса Streamable HTTP. Расширения должны быть
распакованными каталогами и требуют постоянного профиля:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP передайте каталоги профиля и расширения в метаданных
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

Перезапустите мост или создайте новый HTTP-сеанс после изменения файлов
расширений или путей расширений. Используйте JSON-массив для
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, если пути содержат запятые, при
передаче нескольких расширений или при использовании путей Windows с буквами
дисков.

Краткая настройка с готовыми примерами: [загрузка расширения Chrome](recipes/load-chrome-extension.md).

## Режим подключения Playwright Extension { #playwright-extension-connection-mode }

Режим подключения через Playwright Extension отличается от загрузки распакованного расширения с помощью `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Он подключается через официальное Playwright Extension, уже установленное в профиле Chrome или Edge; мост не устанавливает это расширение.

Для stdio настройте переменные окружения процесса:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Для Streamable HTTP метаданные initialize `extensionMode` и `profileDirName` переопределяют соответствующие значения уровня процесса. `userDataDir` также задаётся отдельно для каждой сессии. Токен принимается только из окружения процесса:

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

Режим расширения требует непустого токена и постоянного профиля. Одновременные HTTP-сессии расширения должны использовать разные значения `userDataDir`. До запуска дочернего процесса upstream мост отклоняет конечные точки managed или внешнего CDP, конечные точки удалённого браузера, настройки запуска без графического интерфейса или в изолированном режиме, параметры прокси и GeoIP, имитацию человеческого поведения, изменение контекста, распакованные `extensionPaths` и явно заданные параметры запуска CloakBrowser. Проверка успешного сквозного сценария выполняется вручную, поскольку официальное Playwright Extension должно быть заранее установлено в выбранном профиле браузера.

## Метаданные среды выполнения Streamable HTTP { #streamable-http-runtime-metadata }

HTTP-клиенты с поддержкой потоковой передачи данных могут выбирать определенные параметры выполнения для каждого сеанса MCP, добавляя
метаданные, специфичные для моста, в запрос `initialize`:

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

`proxyServer` переопределяет `PLAYWRIGHT_MCP_PROXY_SERVER` для данного HTTP-сеанса.
`proxyBypass` переопределяет `PLAYWRIGHT_MCP_PROXY_BYPASS` только в том случае, если `proxyServer`
имеется. `geoipProxyMatch` может включить или отключить сопоставление по GeoIP для данного сеанса
без перезапуска сервера MCP. Существующие сеансы сохраняют свой прокси-сервер запуска;
для смены местоположения необходимо создать новый HTTP-сеанс.

`humanize` может включить или отключить «гуманизированное» поведение ввода данных для данной сессии,
не затрагивая при этом другие сессии. `humanPreset` позволяет выбрать `default` или `careful`
для данной сессии, но сам по себе не включает «гуманизированное» поведение. Существующие
сессии сохраняют поведение, зафиксированное во время `initialize`.

`headless` может включать или отключать режим браузера без графического интерфейса для этой сессии. В образе Docker значение `headless`, равное `false`, по требованию запускает приватный виртуальный дисплей контейнера. За пределами образа сессии с графическим интерфейсом по-прежнему требуется рабочая среда отображения.

`extensionMode` и `profileDirName` переопределяют `PLAYWRIGHT_MCP_EXTENSION` и `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` для этой сессии. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` никогда не принимается в метаданных.

`userDataDir` включает постоянный профиль Chromium для этой сессии и
переопределяет `PLAYWRIGHT_MCP_USER_DATA_DIR`. Мост преобразует каталог в
абсолютный путь в формате текущей платформы, создает его при отсутствии,
проверяет доступность для записи и записывает его в сгенерированное
`browser.userDataDir`. Постоянный профиль отключает стандартный изолированный
профиль Streamable HTTP для этой сессии. Мост отклоняет дублирующиеся активные
каталоги профиля внутри одного процесса; конфликты профилей между процессами
остаются ошибками Chromium/Playwright.

`contextOptions` проверяются и поверхностно объединяются поверх
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; вложенные объекты заменяются целиком.
Поддерживаемые поля: `userAgent`, `viewport`, `locale`, `timezoneId`,
`colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` и `hasTouch`. Произвольная передача `BrowserContextOptions` в этом
релизе не поддерживается.

`extensionPaths` должны указывать на существующие каталоги и требуют постоянный
`userDataDir`. Мост преобразует пути расширений в абсолютные пути текущей
платформы, передает их в CloakBrowser и записывает сгенерированные Chromium
аргументы `--load-extension` и `--disable-extensions-except` в сгенерированную
конфигурацию Playwright MCP.

Учетные данные для аутентифицированного HTTP-прокси можно встроить в тег `proxyServer`, например,
`http://user:pass@proxy.example:8080`. Символы учетных данных,
имеющие значение в URL, следует кодировать в процентах, например `@`, `:`, `/`, `?`, `#` и `%`.

В поддерживаемых бинарных файлах CloakBrowser аутентифицированные HTTP-прокси
используют встроенную аутентификацию в URL, а мост удаляет дублирующий объект
прокси Playwright. Старые бинарные файлы сохраняют объект прокси Playwright как
резервный вариант совместимости.

Шаблоны контроля качества для нескольких местоположений см. в разделе [Сопоставление прокси-серверов по GeoIP](geoip-proxy-matching.md).
Шаблоны реалистичности взаимодействия см. в разделе [Поведение ввода с учетом человеческих особенностей](humanized-input-behavior.md).


Для повторного использования входа и настройки расширений см. [постоянный профиль входа](recipes/persistent-login-profile.md) и [загрузку расширения Chrome](recipes/load-chrome-extension.md).

## Параметры upstream Playwright MCP

Мост передаёт настройки `PLAYWRIGHT_MCP_*` вышестоящему модулю Playwright MCP. Сюда входят такие параметры вышестоящего модуля, как:

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

Ознакомьтесь с исходной документацией по MCP для Playwright, чтобы узнать о полном наборе доступных опций.

`PLAYWRIGHT_MCP_CAPS=devtools` наследуется дочерним процессом upstream и
включает инструменты, управляемые этой возможностью, без специального флага
моста `--caps`.

## Ведение журнала

В режиме Streamable HTTP в stdout записываются понятные для человека журналы запуска и запросов. В режиме stdio рутинные операционные журналы не выводятся, поэтому stdout MCP JSON-RPC остается «чистым» с точки зрения протокола. Сообщения о фатальных сбоях при запуске CLI по-прежнему записываются в stderr.

## HTTPS { #https }

Streamable HTTP по умолчанию использует локальный HTTP. Выберите прямой TLS с `--http-protocol https` или `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https`, после чего предоставьте либо пару «сертификат/ключ», либо файл PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Для внешнего доступа или доступа без использования loopback следует использовать протокол HTTPS в сочетании с `--http-auth-token` либо завершать соединение TLS на доверенном обратном прокси-сервере, который также обеспечивает аутентификацию и контроль доступа к сети.

## HTTP-сессии, доступные для потоковой передачи

Каждый сеанс Streamable HTTP MCP имеет собственную среду выполнения моста и дочерний процесс upstream Playwright MCP. По умолчанию сеансы HTTP используют изолированные профили браузера, если постоянный профиль не настроен. Явный постоянный профиль блокируется; для одновременных сеансов нужны разные каталоги профилей. Встроенный бэкенд `memory` хранит только метаданные: идентификатор сеанса, временные метки, срок действия и статус. Состояние браузера остаётся в активном дочернем процессе upstream, а артефакты контролируются `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Для горизонтального масштабирования запустите несколько реплик сервера за балансировщиком нагрузки с фиксированными сессиями, ключом для которых служит заголовок `mcp-session-id`. Будущие бэкэнды Redis, Postgres или SQLite смогут координировать метаданные и блокировки, но они не смогут восстановить активную сессию браузера после завершения процесса, которому она принадлежит.

## HTTP-зонды с возможностью потоковой передачи данных

Когда мост работает с `--transport streamable-http`, он предоставляет фиксированные конечные точки проб на том же хосте и порту, что и конечная точка MCP:

- `GET /healthz` возвращает метаданные о работоспособности процесса: `status`, `version`, `transport` и `uptimeMs`.
- `GET /readyz` возвращает метаданные о готовности и емкость сеанса: `sessions.active`, `sessions.pending`, `sessions.max` и `sessions.available`.

При наличии свободных ресурсов сессии возвращается HTTP-ответ `200`, а при наличии `503`, если `active + pending >= max`.
Если настроены `--http-auth-token` или `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, оба зонда требуют того же заголовка `Authorization: Bearer ...`, что и запросы MCP. Без токена аутентификации пробы открыты на настроенном адресе привязки HTTP.

## Дополнительные практические сценарии

Для выбора между upstream Playwright MCP и этим пакетом используйте [сравнение](comparison.md). Для быстрых задач используйте [рецепты](recipes/index.md): постоянный профиль, расширения, reverse proxy, региональное QA, Claude Desktop, Codex CLI и smoke-тест CI.
