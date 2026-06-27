---
description: Працэс выпуску пакета CloakBrowser MCP для npm, Docker-образа, сайта дакументацыі, запісу ў рэестры MCP і разгортвання на GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Выпуск

Выпускі ініцыююцца апублікаваным на GitHub рэлізам, тэгам якога з'яўляецца значэнне semver з прэфіксам `v`, напрыклад `v1.2.7`.

Адзіны `Release` працоўны працэс развязвае тэг адзін раз, а затым перадае вытворны `version`,
`version_tag`, і тэгі вобраза, бяспечныя для Docker, праз npm-пакаванне, аргументы Docker build, тэгі вобраза, метаданыя сервера, маркіроўкі README і маркіроўкі дакументацыі.

## Налады рэпазіторыя GitHub

Наладзьце гэтыя налады перад першым выпускам.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Дадайце неабходных рэцэнзентаў у `npm-production`, `docker-production`, і
`mcp-registry-production` для таго, каб выпускі патрабавалі ручнога зацвярджэння пасля публікацыі выпуску ў GitHub. Асяроддзе `github-pages` выкарыстоўваецца задачай разгортвання
натыўнай службы GitHub Pages.

## Публікацыя ў npm

Працоўны працэс рэлізу npm публікуе праз npm Trusted Publishing з дапамогай GitHub Actions OIDC. Ён не выкарыстоўвае `NPM_TOKEN` для публікацыі.

Наладзьце давераны выдавец на npmjs.com з гэтымі дакладнымі значэннямі:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

Задача `npm` запускаецца на выканаўцах, размешчаных на GitHub, выкарыстоўвае Node.js 24 і захоўвае
`id-token: write`, каб npm мог абмяняць токен OIDC GitHub Actions на кароткатэрміновую крэдэнцыял для публікацыі. npm Trusted Publishing патрабуе npm CLI
`>=11.5.1` і Node.js `>=22.14.0`.

Выкарыстанне ў выданні:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Пры публікацыі праз Trusted Publishing npm аўтаматычна стварае паходжанне пакета для публічных пакетаў з публічных рэпазіторыяў. Не дадавайце доўгатэрміновы токен публікацыі npm назад у гэты працоўны працэс.

Версія пакета прымяняецца з тэгі выпуску GitHub перад `npm pack`
і `npm publish`, і задача правальваецца, калі `package.json` не супадае з
вызначанай версіяй рэлізу.

## Публікацыя ў Docker

Добра, што вы ўсё разумееце.

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

Задача `docker` выкарыстоўвае рэпазіторый `GITHUB_TOKEN` з
`packages: write` для GHCR. Для публікацыі ў Docker Hub патрабуюцца `DOCKERHUB_USERNAME` і `DOCKERHUB_TOKEN` у `docker-production`
асяроддзі або сакрэтах рэпазіторыя.

Працоўны працэс абнаўляе агляд рэпазіторыя Docker Hub пасля паспяховага загрузкі (push) вобраза. Docker Hub не атрымлівае каранёвы `README.md` аўтаматычна для гэтага працоўнага працэсу выпуску GitHub Actions; Агляд, спецыфічны для Docker Hub, падтрымліваецца ў `docs/dockerhub-readme.md`.

Перад адпраўкай здымку на выпуск, працоўны працэс:

- прымяняе версію рэлізу;
- запускае TypeScript, lint, format, build, test і coverage-праверкі;
- стварае лакальны smoke-імідж рэлізу;
- падчас зборкі Docker прымяняе даступныя бяспекавыя абнаўленні Debian на базе замацаванага базавага вобраза Playwright MCP;
- выдаляе невыкарыстаны глабальны npm-пайлоуд з runtime-іміджы;
- запускае `--help` у іміджы;
- параўноўвае імідж з арыгінальным Playwright MCP з дапамогай скрыпты bridge parity;
- загружае справаздачу JSON пра брыджавы парытэт у якасці артыфакта рабочага працэсу;
- скануе вобраз з дапамогай Trivy на наяўнасць сур'ёзных і крытычных уразлівасцей АС/бібліятэк.

Зборка Docker атрымлівае `RELEASE_VERSION`, `RELEASE_VERSION_TAG`, і
`VCS_REF` аргументы зборкі. Рабочы працэс таксама вызначае хэш базавага вобраза MCP ад upstream Playwright і перадае яго як `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

Канчатковы вобраз захоўвае тыя ж значэнні, што і меткавыя зменныя OCI і зменныя асяроддзя метаданых выканання. Апублікаваныя вобразы ўключаюць меткі для назвы, апісання, крыніцы, дакументацыі, версіі, рэдакцыі, ліцэнзіі, аўтараў, пастаўшчыка, назвы базавага вобраза, хэша базавага вобраза і назвы сервера MCP.

Trivy бясплатны і з адкрытым зыходным кодам, і не патрабуе знешняга токена для публічнага сканавання выяў. Вынікі SARIF загружаюцца ў GitHub для сканавання коду, калі сканаванне коду ўключана.

Пасля першай публікацыі пераканайцеся, што пакет GHCR з'яўляецца публічным і звязаны з гэтым рэпазіторыем, а таксама што рэпазіторый Docker Hub з'яўляецца публічным.

Docker публікуе шматплатформавы маніфест для `linux/amd64` і
`linux/arm64`. Пакет выпуску правярае на працаздольнасць абедзве платформы перад публікацыяй і падтрымлівае параўнанне сумяшчальнасці з браўзерамі для `linux/amd64`.

## Публікацыя рэестра MCP

Задача `mcp-registry` публікуе `server.json` у афіцыйны рэестр па адрасе:

```text
https://registry.modelcontextprotocol.io
```

Публікацыя на сервер выкарыстоўвае лакальны `MCP Registry Publish` кампазітны GitHub Action,
афіцыйны `mcp-publisher` CLI і GitHub Actions OIDC. Не адкрывайце pull-запыт на `modelcontextprotocol/registry` для пералічэння гэтага сервера; той рэпазіторый
адкрыта патрабуе ад аўтараў пакетаў публікаваць з дапамогай `mcp-publisher`.

Працоўны працэс не патрабуе Glama, выстаўлення рахункаў, GitHub PAT, DNS-уліковых даных або доўгатэрміновых сакрэтаў рэестра. Ён выкарыстоўвае:

- `id-token: write` для аўтэнтыфікацыі OIDC у GitHub;
- `mcp-publisher login github-oidc`;
- існуючая прастора імёнаў GitHub `io.github.swimmwatch/cloakbrowser-mcp`;
- значэнне пакета npm `mcpName` для даказу валодання пакетам npm;
- метка Docker-абраза `io.modelcontextprotocol.server.name` для даказвання валодання OCI-абразам.

Праца рэестра MCP пачынаецца з таго ж падзеі выпуску ў GitHub, што і ў npm, Docker і публікацыі дакументацыі. Яна дэкларуе `needs: [npm, docker]`, таму публікацыя npm і GHCR завяршаецца, перш чым пачнецца публікацыя ў рэестры. Складаная
аперацыя наўмысна сканцэнтравана на рэестры: яна правярае `server.json` лакальна,
правярае яе з дапамогай `mcp-publisher`, правярае, ці бачная ўжо дакладная версія рэестра, аўтэнтыфікуецца з дапамогай `mcp-publisher login github-oidc`, публікуе метаданыя сервера і правярае канчатковы запіс у рэестры.

Калі адбываецца часовая памылка рэгістра, перазапусціце няўдалую працу `mcp-registry` у
арыгінальны запуск пасля таго, як задачы npm і Docker стануць зялёнымі. Рукаводства
`workflow_dispatch` запускаецца на `Release` для поўных запускаў трубаправода выпуску з
Відавочны тэг.

Праверце запіс у апублікаваным рэестры з дапамогай:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

Рэестр `https://github.com/mcp` GitHub — гэта асобная ўпарадкаваная прастора для пошуку. Публікацыя ў афіцыйным рэестры MCP з'яўляецца абавязковай, але гэта не гарантуе неадкладнай бачнасці на старонцы `/mcp` GitHub. Разглядайце `npm run registry:check` як інструмент праверкі рэлізу для афіцыйнага рэестра, npm, GHCR, Docker Hub і як сродак для максімальна магчымай праверкі бачнасці на GitHub MCP. Выкарыстоўвайце `npm run
registry:check:strict` толькі пасля таго, як бачнасць у GitHub MCP павінна стаць абавязковым
крокам.

## Кантрольны спіс для каталога Глама

Ацэнка каталога Glama асобная ад рэлізаў на GitHub і афіцыйнага публікавання ў рэестры MCP. Рэпазіторый уключае `glama.json` так што `swimmwatch` можа заявіць пра валоданне або пацвердзіць яго ў Glama.

Перад публікацыяй стабільнага рэлізу, запоўніце бясплатны кантрольны спіс Glama:

- сінхранізаваць сервер з адміністратарскага інтэрфейсу сервера Glama MCP пасля `glama.json`
  зліваецца ў `main`;
- адкрыць
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`;
- наладзіць Glama на кампіляцыю гэтага рэпазітарнага Dockerfile і запуск існуючага
  stdio-энтрынпойнта без дадатковых сакрэтаў;
- захаваць сумяшчальнасць рунтайма з па змаўчанні CloakBrowser: `cloak` браўзер
  рухавік, рэжым без візуальнага вываду, вывад на stdout і сховішча артыфактаў `/data`;
- націсніце «Разгортванне» (Deploy) і пачакайце, пакуль тэст зборкі пройдзе паспяхова;
- стварыць і выпусціць рэліз Glama з такой жа версіяй, як і ў рэлізе на GitHub, напрыклад `1.2.7`;
- пасля выпуску адзін раз скарыстайцеся функцыяй Glama «Паспрабаваць у браўзеры» для стварэння першапачатковай
  аўдыторыі;
- уручную дадайце звязаныя серверы, як мінімум афіцыйны сервер Playwright MCP,
  а таксама, па жаданні, іншыя цесна звязаныя альтэрнатывы для аўтаматызацыі браўзера.

Не дадавайце спосаб аплаты або платны хостынг Glama толькі для паляпшэння ацэнкі каталога. Калі Glama патрабуе аплаты для абавязковага пункта кантрольнага спіса, разглядайце гэта як блок выпуску, які патрабуе выразнага рашэння падтрымліваючага.

## Працоўныя працэсы бяспекі

Рэпазіторый выкарыстоўвае бясплатныя інструменты бяспекі:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

Пінінг SHA-функцый адсочваецца як будучы этап узмацнення бяспекі. У цяперашні час працоўныя працэсы выкарыстоўваюць версіённыя спасылкі на функцыі, каб абнаўленні заставаліся кіраванымі, пакуль інфраструктура рэлізаў яшчэ маладая.

## Публікацыя дакументацыі

Заданні `docs-build` і `docs-deploy` разгортваюць MkDocs з дапамогай убудаванага працэсу разгортвання GitHub Pages Actions. У наладах старонак рэпазіторыя павінен выкарыстоўвацца `GitHub Actions` у якасці
крыніцы.

Працоўны працэс стварае дакументацыю ў строгім рэжыме, загружае згенераваны `site/`
дырэкторыі з `actions/upload-pages-artifact` і разгортвае яго з
`actions/deploy-pages` у асяроддзе `github-pages`.

Публікацыя дакументацыі таксама запускае SEO-валідатар пасля зборкі MkDocs.
Факультатыўныя токены праверкі вэб-майстроў выкарыстоўваюць афіцыйныя бясплатныя інструменты для вэб-майстроў і могуць быць прадастаўлены ў выглядзе зменных рэпазіторыя або сакрэтаў:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Апцыянальныя апавяшчэнні IndexNow патрабуюць сакрэт рэпазіторыя з назвай
`INDEXNOW_KEY`. Калі ён усталяваны, рабочы працэс публікуе неабходны ключавы файл і
падае згенераваныя URL-адрасы sitemap пасля разгортвання GitHub Pages.

Не дадавайце платныя паслугі індэксацыі, рэкламныя прадукты або статыстыку трэціх бакоў у працэс выпуску дакументацыі без асобнага выразнага рашэння.

## Узрэзавы маніторынг

Пакет працоўных працэсаў моніторынгу верхняга стрыму запускаецца штодня, а таксама можа быць запушчаны ўручную з дапамогай GitHub Actions. Ён правярае абодва дыстрыбутыўныя каналы Playwright MCP з верхняга стрыму:

- npm-пакет: `@playwright/mcp`;
- Docker-абраз: `mcr.microsoft.com/playwright/mcp`.

Калі выяўляецца больш новая версія ў вышэйстаячым рэпазіторыі, працоўны працэс стварае іссу на GitHub, прызначаны для `swimmwatch`. Іссу ўключае бягучую і апошнюю версіі npm/Docker
версіі, кароткі агляд release-notes ад `microsoft/playwright-mcp` і спасылкі на поўны changelog зыходнай распрацоўкі, npm-пакет і Docker-тэгы.

Правядзіце тую ж праверку лакальна з дапамогай:

```bash
npm run upstream:check
```

## Тэгі рэлізу

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Пералік

Перад публікацыяй рэлізу:

- Аб'ядноўвайце толькі пасля таго, як `Actionlint` і `CI` стануць зялёнымі.
- Стварыце выпуск на GitHub з тэгі, напрыклад, `v1.2.7`.
- Пазначце рэліз як prerelease пры публікацыі версіі `next` npm.
- Пераканайцеся, што npm Trusted Publisher наладжаны для `release.yml` і
  `npm-production`.
- Пацвердзіце `npm-production`, `docker-production`, `github-pages`, і
  `mcp-registry-production` асяроддзі існуюць.
- Пераканайцеся, што сканаванне кода GitHub уключана, калі неабходная бачнасць загрузкі SARIF.
- Пераканайцеся, што бачнасць пакета GHCR з'яўляецца публічнай пасля першай публікацыі Docker.
- Пераканайцеся, што сервер Glama быў сінхранізаваны, пратэставаны праз адміністрацыйную старонку Dockerfile і выпушчаны з той жа стабільнай версіяй.

`SUPPORT.md` наўмысна адкладаецца, пакуль праект не атрымае стабільную палітыку падтрымкі па-за межамі GitHub-іссій і паведамленняў аб бяспецы.
