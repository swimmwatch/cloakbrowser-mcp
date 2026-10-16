---
description: Стратэгія тэставання CloakBrowser MCP: модульныя тэсты, інтэграцыйныя тэсты з фальшывым upstream, Docker smoke-тэсты і праверкі сумяшчальнасці з Playwright MCP.
icon: material/test-tube
tags:
  - Тэставанне
  - Унутраная структура праекта
---

# Тэставанне

## Модульныя тэсты

```bash
npm run test:unit
```

Модульныя тэсты пакрываюць разбор зменных асяроддзя, генерацыю канфігурацыі моста, апрацоўку аргументаў запуску і лакальныя інструменты інтрасpekцыі Cloak.

## Інтэграцыйныя тэсты

```bash
npm run test:integration
```

Інтэграцыйныя тэсты выкарыстоўваюць фальшывы даччыны працэс upstream MCP і правяраюць, што мост аб'ядноўвае лакальныя інструменты і перасылае upstream-выклікі без змен.

`npm run check` уключае статычныя праверкі, unit/integration-тэсты і тэсты ўпакаванага CLI з імітацыяй upstream MCP, без Chromium. У PR unit/integration і CLI запускаюцца адзін раз для кожнай камбінацыі платформы і Node.js: {{ project.node_check_versions }} на Linux x64/arm64, macOS x64/arm64 і Windows x64. На Linux x64 той жа прагон збірае пакрыццё для Codecov. Статычныя праверкі і праверка пакета выконваюцца адзін раз на Linux x64/Node.js {{ project.node_minimum_version }}.

Матрыца CI, спіс чаканых вынікаў справаздачы і дакументацыя атрымліваюць версіі Node.js з `.github/workflows/ci.yml`. Абнаўляйце гэты файл пры змене правяраных галін выпуску.

## Праверкі сапраўднага браўзера і дыстрыбутываў

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` аб’ядноўвае праверкі CLI з fake upstream і праверкі кансолі сапраўднага Playwright Chromium. `test:e2e:playwright-console` правярае метады кансолі ў новых сеансах браўзера. `test:e2e:cdp` правярае кіраваны доступ праз Chrome DevTools Protocol (CDP) з Free CloakBrowser і кантраляваным Playwright Chromium.

`test:e2e:npm-package` пакуе і ўсталёўвае пакет у часовы праект. Праверка кантракту перасылкі выкарыстоўвае fake upstream; браўзерныя сцэнарыі выкарыстоўваюць сапраўдны CloakBrowser і лакальныя старонкі для праверкі стандартных інструментаў, пастаяннага стану і абодвух прэсетаў humanize. Асобны тэст правярае канкурэнтныя спампоўкі ў пусты кэш і адсутнасць пабочнага тэксту ў stdout. Адна праверка пакета не пацвярджае працу браўзера.

Браўзерная PR-матрыца правярае кансоль Playwright і кіраваны CDP на Node.js {{ project.node_current_version }} на тых жа пяці платформах; дадаткова CDP правяраецца на Linux x64/Node.js {{ project.node_minimum_version }}. Паралельная матрыца Node.js {{ project.node_primary_version }} запускае наборы npm-пакета, proxy/GeoIP, пашырэнняў і lifecycle на ўсіх пяці платформах, уключаючы абодва прэсеты humanize. Прыёмка Docker і CDP ахоплівае абодва рухавікі на `linux/amd64` і `linux/arm64`.

`required-ci` патрабуе паспяховага завяршэння кожнага набору і поўнай зводнай справаздачы да зліцця. Той жа workflow `CI` запускаецца штотыдзень і ўручную. `Release` збірае і публікуе артэфакты з праверанай версіі кода.

## Справаздачы аб тэставанні

Кожная ячэйка матрыцы CI загружае ачышчаныя вынікі і дыягнастычныя ўкладанні. Задача агрэгацыі аб’ядноўвае іх у адну HTML-справаздачу Allure, захоўваючы меткі набору тэстаў і асяроддзя. Адсутнасць чаканых крыніц вынікаў і памылкі тэстаў прыводзяць да памылкі агрэгацыі; зыходныя вынікі і HTML-справаздача застаюцца даступнымі як артэфакты Actions.

Адпаведныя запускі PR могуць публікаваць спасылку на справаздачу праз наладжаны асобны рэпазіторый справаздач. Патрэбныя ўключаная дастаўка, правераныя даныя запуску і паспяховая праверка Pages. Сайт дакументацыі разгортваецца асобна. Публічныя справаздачы змяшчаюць толькі дазволеную і ачышчаную дыягностыку з кантраляваных тэставых даных.

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

Выкарыстоўвайце фактычны выходны каталог зборшчыка як уваход генератара. Фарматы справаздач, укладанні і дастаўка праз CI апісаны ў раздзеле [Удзел у распрацоўцы](contributing.md).

## Праверка пакета

```bash
npm run package:verify
```

Гэтая каманда збірае пакет, запускае `npm pack`, правярае спіс файлаў tarball, усталёўвае tarball у часовы праект і правярае `--version` і `--help` CLI.

Праверка пакета таксама валідуюць `server.json` паводле апублікаванай схемы MCP-сервера.

Для зборкі выпуску выкарыстоўваецца `npm run package:pack`: каманда стварае архіў і правярае метаданыя і склад файлаў. Усталяванне пакета і выкананне CLI правяраюцца да зліцця камандай `package:verify`.

## Docker smoke-тэст

```bash
npm run docker:build
npm run docker:smoke
```

Smoke-тэст правярае, што сабраны вобраз запускаецца і выводзіць даведку CLI. CI выконвае smoke-тэсты Docker-вобразаў для `linux/amd64` і `linux/arm64`.

## Сумяшчальнасць з upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Скрыпт сумяшчальнасці запускае афіцыйны Docker-вобраз Playwright MCP і вобраз моста CloakBrowser, параўноўвае імёны upstream-інструментаў, выконвае стандартны набор браузерных інструментаў на адной fixture-старонцы і правярае лакальныя інструменты інтрасpekцыі Cloak.

CI загружае JSON-справаздачу аб адпаведнасці з Docker jobs. Браўзернае параўнанне запускаецца на `linux/amd64`; на абедзвюх архітэктурах выконваюцца базавыя праверкі, сканаванне ўразлівасцей, тэсты дыстрыбутыва і CDP. Параўнанне ахоплівае замацаваную версію Docker MCP; набор npm асобна правярае npm MCP.

## Праверкі бяспекі

```bash
npm run audit:prod
npm run server:validate
```

CI таксама запускае CodeQL, Dependency Review, OpenSSF Scorecard, zizmor і Trivy. Гэтыя інструменты бясплатныя для публічных рэпазіторыяў і не патрабуюць знешніх акаўнтаў.
