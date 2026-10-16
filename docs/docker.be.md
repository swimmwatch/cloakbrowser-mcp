---
description: Запусціце Docker-вобраз CloakBrowser MCP для паўтаральнай аўтаматызацыі браўзера Playwright MCP з пастаяннымі профілямі /data, мантаваннем пашырэнняў і CloakBrowser.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Докер

Апублікаванае выява — гэта рэкамендаваны час працы для паўторнага выкарыстання MCP.

Для кароткага разгортвання ўжо запушчанага HTTP-сервера за TLS і аўтэнтыфікацыяй выкарыстоўвайце [рэцэпт Docker Streamable HTTP са зваротным проксі](recipes/docker-streamable-http-reverse-proxy.md).

## Бягчы

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Артыфакты запісваюцца ў `/data` у кантэйнеры. Маўнтніце гэты шлях, каб захоўваць скрыншоты, снэпшоты, спампоўкі і сеткавы вывад.

Вобраз ужо запускае Tini як PID 1 і subreaper, таму звычайным камандам не патрэбны дадатковы init-працэс Docker.

Тыя ж тэгі рэлізу публікуюцца на Docker Hub як `swimmwatch/cloakbrowser-mcp` і на GHCR як `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Сесіі з графічным інтэрфейсам і віртуальны дысплей { #headed-sessions-and-virtual-display }

У вобразе па змаўчанні зададзена `PLAYWRIGHT_MCP_HEADLESS=true`; сесіі без графічнага інтэрфейсу не запускаюць Xvfb. Калі сесія запытвае `headless: false`, launcher па патрабаванні запускае адзін прыватны для кантэйнера дысплей Xvfb, чакае яго гатоўнасці і захоўвае яго да завяршэння кантэйнера. Адначасовыя HTTP-сесіі з графічным інтэрфейсам выкарыстоўваюць гэты дысплей сумесна, а іх кантэксты браўзера Playwright, старонкі, профілі і артэфакты застаюцца ізаляванымі.

Для stdio-сесіі з графічным інтэрфейсам задайце стандартную зменную Playwright MCP:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Гэта не бачны працоўны стол і не сэрвіс перадачы графічнага інтэрфейсу: вобраз не прадастаўляе VNC, noVNC, RDP, доступ да X11 хоста або захоп экрана. Не лічыце натыўны фокус X11, буфер абмену або захоп экрана межамі ізаляцыі арандатараў. Launcher спыняе дысплей пры завяршэнні працы; памылка запуску або завяршэнне MCP CLI спыняе кантэйнер, а не пакідае працаздольны мост.

Па-за гэтым вобразам браўзеру з графічным інтэрфейсам па-ранейшаму патрэбнае працаздольнае асяроддзе адлюстравання. Задайце `PLAYWRIGHT_MCP_HEADLESS=true`, калі дысплей недаступны.

## Стан кантэйнера і абмежаванае асяроддзе выканання { #container-health-and-restricted-runtime }

Docker `HEALTHCHECK` выкарыстоўвае прыватны Unix-сокет і актыўна правярае, ці адказвае цыкл падзей MCP CLI. Калі Xvfb быў запушчаны, правяраецца таксама дысплей X11; кантэйнер без графічнага інтэрфейсу, у якім дысплей ніколі не запытваўся, застаецца healthy. Запуск, спыненне або збой дысплея азначае unhealthy. Адказ X11 правяраецца ў межах 1 секунды, адказ CLI — 750 мілісекунд, прыватны запыт праверкі стану — 2,5 секунды, а Docker завяршае адну каманду праверкі праз 3 секунды. Пры інтэрвале Docker 2 секунды і дзвюх паўторных спробах пераходы стану залежаць ад планавання Docker і не з’яўляюцца мэтавым узроўнем даступнасці сэрвісу. Гэтая праверка аддзеленая ад публічных HTTP-кропак `/healthz` і `/readyz` і ніколі не перадае трафік праз MCP stdio. Яна не даказвае працаздольнасць браўзера, MCP-сесіі або аддаленага сайта; перазапускам і аднаўленнем кіруе знешні аркестратар.

Launcher дае кожнаму даччынаму працэсу да 8 секунд на завяршэнне пасля `SIGTERM`, затым да 2 секунд пасля `SIGKILL`; тайм-аўт спынення Docker павінен улічваць паслядоўнае завяршэнне CLI і Xvfb. Вобраз працуе ад непрывілеяванага карыстальніка `node` і дапускае каранёвую файлавую сістэму толькі для чытання. Захавайце мантаванне `/data` для артэфактаў і прадастаўце часовыя мантаванні з доступам на запіс для `/tmp` і `/tmp/.X11-unix`, калі магчымыя сесіі з графічным інтэрфейсам. Сокет праверкі стану даступны толькі ўладальніку (`0600`). Лакальны X11-сокет кантэйнера выкарыстоўваецца сумесна працэсам `node` і Xvfb, таму ён не з’яўляецца мяжой ізаляцыі арандатараў. Не мантуйце ніводны з гэтых сокетаў з хоста і не выкарыстоўвайце іх сумесна паміж кантэйнерамі.

## Пастаянныя профілі { #persistent-profiles }

Docker не ўключае пастаянны профіль браўзера па змаўчанні. Выкарыстоўвайце
існуючы том `/data` як корань захавання, калі хочаце, каб cookie, лакальнае
сховішча, кэш або стан пашырэнняў захоўваліся пасля перазапускаў кантэйнера:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Пераменныя асяроддзя ў Docker павінны выкарыстоўваць шляхі кантэйнера, такія як
`/data/profiles/default`, а не шляхі хоста. Мост стварае каталог профілю пры
адсутнасці, правярае доступ на запіс, запісвае шлях кантэйнера ў згенераваную
канфігурацыю Playwright MCP і адхіляе дубліраваныя актыўныя каталогі профілю
ўнутры аднаго сервернага працэсу.

## Кэш ліцэнзіі CloakBrowser

Вобраз захоўвае бінарныя файлы CloakBrowser, стан ліцэнзіі і кэш праверкі ў
`/home/node/.cloakbrowser`. Прымантуйце да гэтага каталога найменаваны том, каб
захоўваць уваход бясплатнага ўзроўню GitHub або Pro пры замене кантэйнера:

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

Выкарыстоўвайце той жа том з зыходнай камандай `info` або `logout`, каб
праверыць або выдаліць захаваны ўваход. Замест гэтага можна перадаць
`CLOAKBROWSER_LICENSE_KEY` праз сістэму кіравання сакрэтамі кантэйнера. Не
змяшчайце ліцэнзійныя ключы ў слаях вобраза, файлах Compose у сістэме кантролю
версій або ў вывадзе каманд, захаваным як сведчанне зборкі.

## Уласны бінарны файл CloakBrowser

Падмантуйце сумяшчальны выканальны файл браўзера ў кантэйнер і перадайце шлях у
кантэйнеры праз `--binary-path` (ці `CLOAKBROWSER_BINARY_PATH`):

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/custom-chrome:/browser/chrome:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --binary-path /browser/chrome
```

Файл павінен быць чытэльным выканальным файлам Linux, сумяшчальным з архітэктурай
CPU вобраза, а патрэбныя яму бібліятэкі павінны быць у кантэйнеры. Шлях дзейнічае
для ўсіх Streamable HTTP-сесій у кантэйнеры; для розных бінарных файлаў запускайце
асобныя кантэйнеры.

## Пашырэнні Chrome { #chrome-extensions }

Пашырэнні Chrome патрабуюць пастаяннага профілю і павінны манціравацца асобна.
Выкарыстоўвайце шляхі кантэйнера ў пераменных асяроддзя, а не шляхі хоста.
Мантаванне пашырэння можа быць толькі для чытання:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Выкарыстоўвайце JSON-масіў для `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, калі шлях
змяшчае коскі або пры перадачы некалькіх каталогаў пашырэнняў. Перазапусціце
кантэйнер пасля змены файлаў пашырэнняў або шляхоў пашырэнняў.

Рэжым падключэння Playwright Extension адрозніваецца ад мантавання распакаванага пашырэння вышэй. Ён патрабуе афіцыйнага пашырэння ў persistent Chrome/Edge profile і `PLAYWRIGHT_MCP_EXTENSION_TOKEN`. Мантавайце кожную profile ў асобны writable path, перадавайце token праз secret manager і не спалучайце `PLAYWRIGHT_MCP_EXTENSION=true` з `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`.

## HTTP для струменевага перадавання { #streamable-http }

Для лакальнага выкарыстання Streamable HTTP апублікуйце порт кантэйнера на лупбэку:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Для HTTP-сесій з графічным інтэрфейсам задайце кантэйнеру `PLAYWRIGHT_MCP_HEADLESS=false`. Асобныя запыты initialize па-ранейшаму могуць выбіраць рэжым без графічнага інтэрфейсу праз падтрыманыя метаданыя MCP.

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_HEADLESS=false \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

Для прамога HTTPS з кантэйнера прывяжыце вашыя файлы сертыфікатаў і выберыце HTTPS:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Злучэнне `127.0.0.1:3000` на баку хоста захоўвае канцавую кропку лакальнай. Калі вы публікуеце Streamable HTTP на інтэрфейсе, які не з'яўляецца петлявым, выкарыстоўвайце HTTPS разам з аўтэнтыфікацыяй або размяшчайце сервер за давераным зваротным праксі-серверам, які завяршае TLS-злучэнне, з аўтэнтыфікацыяй і сеткавымі кантролямі.
Streamable HTTP адкрывае фіксаваныя пробы `GET /healthz` і `GET /readyz` на тым жа хосце і порце. Калі настроены `--http-auth-token` або `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN`, пробы патрабуюць той жа загаловак `Authorization: Bearer ...`, што і запыты MCP.
Глядзіце згенераваную [Даведку па CLI](generated/cli.md) для ўсіх транспартных сцягоў HTTP і зменных асяроддзя.

## Кіраваны CDP { #managed-cdp }

Апублікуйце наладжаны дыяпазон managed-CDP адзін да аднаго. Гэты прыклад stdio дазваляе адзін
сесія і захоўвае ўсе порты хаста, прывязаныя да loopback:

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

Для пераадрасацыі портаў Docker патрабуецца `--cdp-host 0.0.0.0`, таму трэба дакладна
таксама патрабуюцца яўная згода `--cdp-allow-remote` і канкрэтны
`--cdp-advertised-host`.
Не пераназначайце дыяпазон на іншыя нумары порта гаспадара: URL-адрасы для выяўлення ўтрымліваюць
Арандаваны порт і кожны апублікаваны порт павінны мець адно-да-аднаму маршрутызацыю да сваёй уласніцкай сесіі.

Для мульцісэсійнага Streamable HTTP наладзьце і апублікуйце пул без усталёўкі
апрацоўваць па змаўчанні, калі кліенты павінны выбраць асобна:

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

Аўтэнтыфікаваны запыт `initialize` з арыенцірамі `cdpEnabled: true` арандуе адзін апублікаваны
порт. Прапушчанае значэнне атрымлівае па змоўчанні працэсу, у той час як `cdpEnabled: false`
адназначна адмаўляецца і не выкарыстоўвае порт CDP. Вычарпанне пула адхіляе толькі новы
Сесія з падтрымкай CDP; гэта не памяншае ёмістасць для сесій з адключанымі функцыямі.

Прочытайце URL, які нясе магчымасці, з `cloakbrowser_bridge_info`. Не змяшчайце яго ў
журналы кантэйнера або праверкі стану. Падключыцеся да CDP API такога, як
`chromium.connectOverCDP()`; URL не сумяшчальны з Playwright
`chromium.connect()` або цяперашні паток Open WebUI.

`--cdp-advertised-scheme https` змяняе апублікаваныя URL-адрасы на `https`/`wss`, але
мост не прадастаўляе TLS для кіраванага CDP. Выкарыстоўвайце тэрмінатар, які належыць аператару TLS
занімае той жа аб'яўлены порт у прасторы імёнаў знешняй сеткі, захоўвае
`Host`/`Origin` і перасылае адзін да аднаго на слухача адкрытага тэксту.
мост-да-Chromium перапрыгванне таксама застаецца адкрытым трафікам зваротнай петлі.

## Супастаўленне GeoIP-праксі { #geoip-proxy-matching }

Docker выкарыстоўвае тыя ж зменныя асяроддзя проксі і GeoIP, што і npm. Уключыце супадзенне проксі GeoIP, калі для рэгіянальных патрэб QA CloakBrowser патрабуецца, каб часовыя паясы, мова і адбіткі лакалі адпавядалі месцазнаходжанню наладжанага проксі:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Для аўтэнтыфікаваных праксі-сервераў убудоўвайце ўліковыя даныя ў URL-адрас праксі і персальдавайце спецыяльныя сімвалы ў імя карыстальніка або паролі.

Падтрымліваемыя бінарныя файлы CloakBrowser выкарыстоўваюць убудаваную
аўтэнтыфікацыю праксі ў URL; старыя бінарныя файлы пераходзяць на аб'ект праксі
Playwright.

Калі кантэйнер запускае Streamable HTTP, кліенты таксама могуць выбіраць розныя праксі-серверы для кожнай MCP-сесіі праз метаданыя `initialize`. Гл.
[ГеаIP-адпаведнасць праксі-сервераў](geoip-proxy-matching.md) для метаданых праксі-сервера ў часе выканання, выпадкаў шматрэгіянальнага выкарыстання і абмежаванняў.

## Па змаўчанні

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

## Канфігурацыя кліента MCP

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

## Будуй мясцова { #build-locally }

```bash
npm run docker:build
npm run docker:smoke
```

Dockerfile выкарыстоўвае замацаваны афіцыйны вобраз Playwright MCP у якасці асновы для выканання, накладвае даступныя абнаўленні бяспекі Debian падчас зборкі, выдаляе невыкарыстаны глабальны npm-пайлоўд з вобраза для выканання і ўсталёўвае мост пад `/opt/cloakbrowser-mcp`.

Працоўны працэс выпуску публікуе SBOM і пацверджанні паходжання, уключае ярлыкі OCI для крыніцы, рэвізіі, версіі, ліцэнзіі, назвы базавага выявы і хэша базавага выявы, а таксама скануе згенераванае выява з дапамогай Trivy перад публікацыяй.

## Дадатковыя практычныя сцэнарыі

Каб выбраць паміж upstream Playwright MCP і гэтым пакетам, глядзіце [параўнанне](comparison.md). Для хуткіх задач выкарыстоўвайце [рэцэпты](recipes/index.md): пастаянны профіль, пашырэнні, reverse proxy, рэгіянальнае QA, Claude Desktop, Codex CLI і smoke-тэст CI.
