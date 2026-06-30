---
description: Veröffentlichungsprozess für das CloakBrowser-MCP-npm-Paket, das Docker-Image, die Dokumentationsseite, den Eintrag im MCP-Register und die Bereitstellung auf GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Veröffentlichung

Veröffentlichungen basieren auf einer veröffentlichten GitHub-Version, deren Tag aus einem Semver-Wert besteht,
dem das Präfix `v` vorangestellt ist, zum Beispiel `v1.2.7`.

Der einheitliche `Release`-Workflow löst das Tag einmal auf und übergibt anschließend das abgeleitete `version`,
`version_tag` sowie den Docker-sicheren Image-Tag an npm-Pakete, Docker-Build-Argumente,
Image-Labels, Server-Metadaten, README-Marker und Dokumentationsmarker
weiter.

## Einstellungen für GitHub-Repositorys

Nehmen Sie diese Einstellungen vor der ersten Freigabe vor.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Fügen Sie die erforderlichen Prüfer zu `npm-production`, `docker-production` und
`mcp-registry-production`, falls Releases nach der Veröffentlichung eines
GitHub-Releases eine manuelle Genehmigung erfordern sollen. Die Umgebung `github-pages` wird vom
nativen GitHub-Pages-Bereitstellungsjob verwendet.

## Veröffentlichung über npm

Der npm-Release-Workflow erfolgt über „npm Trusted Publishing“ mit GitHub
Actions OIDC. Für die Veröffentlichung wird `NPM_TOKEN` nicht verwendet.

Konfigurieren Sie den vertrauenswürdigen Herausgeber auf npmjs.com mit genau diesen Werten:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

Der Job `npm` wird auf von GitHub gehosteten Runners ausgeführt, verwendet Node.js 24 und behält
`id-token: write` bei, damit npm das GitHub-Actions-OIDC-Token gegen eine
kurzlebige Veröffentlichungsberechtigung austauschen kann. Für npm Trusted Publishing ist die npm-CLI erforderlich
`>=11.5.1` und Node.js `>=22.14.0`.

Verwendungszwecke im Verlagswesen:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Bei der Veröffentlichung über Trusted Publishing generiert npm automatisch die
Herkunftsangaben für öffentliche Pakete aus öffentlichen Repositorys. Fügen Sie diesem Workflow kein langfristig gültiges
npm-Veröffentlichungstoken hinzu.

Die Paketversion stammt aus dem GitHub-Release-Tag vor `npm pack`
und `npm publish` angewendet, und der Job schlägt fehl, wenn `package.json` nicht mit der
aufgelösten Release-Version übereinstimmt.

## Veröffentlichung von Docker-Images

Docker-Images werden unter folgender Adresse veröffentlicht:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

Der Job `docker` verwendet das Repository `GITHUB_TOKEN` mit
`packages: write` für GHCR. Für die Veröffentlichung auf Docker Hub sind
`DOCKERHUB_USERNAME` und `DOCKERHUB_TOKEN` in den `docker-production`
Umgebungs- oder Repository-Geheimnissen.

Der Workflow aktualisiert die Repository-Übersicht auf Docker Hub nach einem erfolgreichen
Image-Push. Docker Hub ruft das Stamm-Image `README.md` für
diesen GitHub-Actions-Release-Ablauf nicht automatisch ab; die Docker-Hub-spezifische Übersicht wird
in `docs/dockerhub-readme.md` gepflegt.

Vor dem Mergen eines Release-PR validiert CI:

- führt die TypeScript-, Lint-, Format-, Build-, Test- und Coverage-Prüfungen durch;
- überprüft die Metadaten und Inhalte des npm-Pakets;
- baut Docker-Images für `linux/amd64` und `linux/arm64`;
- führt Docker-`--help`-Smoke-Prüfungen aus;
- vergleicht das `linux/amd64`-Image mithilfe des Bridge-Parity-Skripts
  mit dem Upstream-Playwright-MCP;
- scannt Docker-Images mit Trivy auf schwerwiegende und kritische Schwachstellen im Betriebssystem und in Bibliotheken.

Während der Release-Veröffentlichung führt der Docker-Workflow Folgendes aus:

- wendet die Release-Version an;
- wendet während des Docker-Builds die verfügbaren Debian-Sicherheitsupdates auf das festgelegte Playwright-MCP-
  Basis-Image an;
- entfernt die ungenutzte globale npm-Nutzlast aus dem Laufzeit-Image;
- veröffentlicht das Multi-Plattform-Image;
- aktualisiert die Docker-Hub-Übersicht nach erfolgreichem Push des Images.

Der Docker-Build erhält die Build-Argumente `RELEASE_VERSION`, `RELEASE_VERSION_TAG` und
`VCS_REF` als Build-Argumente. Der Workflow ermittelt außerdem den Digest des Upstream-Playwright-
MCP-Basisimages und übergibt ihn als `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

Das endgültige Image enthält dieselben Werte wie OCI-Labels und Laufzeit-Metadaten
sowie Umgebungsvariablen. Veröffentlichte Images enthalten Labels für Titel, Beschreibung,
Quelle, Dokumentation, Version, Revision, Lizenz, Autoren, Anbieter, Name des Basis-Images,
Digest des Basis-Images und Name des MCP-Servers.

Trivy ist kostenlos und Open Source und benötigt kein externes Token für öffentliche
Bildscans. SARIF-Ergebnisse werden an GitHub Code Scanning hochgeladen, wenn die
Code-Prüfung aktiviert ist.

Vergewissern Sie sich nach der ersten Veröffentlichung, dass das GHCR-Paket öffentlich ist und mit diesem
Repository verknüpft ist, und stellen Sie sicher, dass das Docker-Hub-Repository öffentlich ist.

Docker veröffentlicht ein plattformübergreifendes Manifest für `linux/amd64` und
`linux/arm64`. PR CI führt vor dem Merge Smoke-Prüfungen auf beiden Plattformen durch
und behält den Browser-Tool-Paritätsvergleich auf `linux/amd64` bei.

## Veröffentlichung im MCP-Register

Der Job `mcp-registry` veröffentlicht `server.json` im offiziellen
Register unter:

```text
https://registry.modelcontextprotocol.io
```

Bei der Server-Veröffentlichung wird die lokale `MCP Registry Publish` Composite-GitHub-Action,
die offizielle `mcp-publisher`-CLI sowie GitHub Actions OIDC. Eröffne keinen Pull-
Request für `modelcontextprotocol/registry`, um diesen Server aufzulisten; dieses Repository
verlangt ausdrücklich, dass Paketautoren mit `mcp-publisher` veröffentlichen.

Für den Workflow sind weder Glama noch Abrechnungsdaten, ein GitHub-PAT, DNS-Zugangsdaten noch
langfristige Registry-Geheimnisse erforderlich. Er nutzt:

- `id-token: write` für die GitHub-OIDC-Authentifizierung;
- `mcp-publisher login github-oidc`;
- den bestehenden GitHub-Namespace `io.github.swimmwatch/cloakbrowser-mcp`;
- den Wert des npm-Pakets `mcpName` zum Nachweis der Eigentumsrechte am npm-Paket;
- das Docker-Image-Label `io.modelcontextprotocol.server.name` zum Nachweis der OCI-
  Image-Eigentümerschaft.

Der MCP-Registry-Job startet mit demselben GitHub-Release-Ereignis wie npm, Docker
und die Veröffentlichung der Dokumentation. Er deklariert `needs: [npm, docker]`, sodass die Veröffentlichung über npm und
Docker abgeschlossen ist, bevor die Veröffentlichung in der Registry beginnt. Die Dokumentationsbereitstellung deklariert
`needs: [docs-build, npm, docker, mcp-registry]`, sodass GitHub Pages erst aktualisiert wird,
nachdem npm, Docker und die offizielle MCP Registry erfolgreich veröffentlicht wurden. Die zusammengesetzte
Aktion ist bewusst auf die Registry ausgerichtet: Sie validiert `server.json` lokal,
validiert sie mit `mcp-publisher`, prüft, ob die exakte Registrierungsversion
bereits sichtbar ist, authentifiziert sich mit `mcp-publisher login github-oidc`, veröffentlicht
die Server-Metadaten und überprüft den endgültigen Registrierungseintrag.

Sollte ein vorübergehender Registrierungsfehler auftreten, führen Sie den fehlgeschlagenen Job `mcp-registry` im
ursprünglichen Release-Lauf erneut aus, nachdem die npm- und Docker-Jobs den Status „grün“ erreicht haben. Der manuelle
`workflow_dispatch`-Trigger auf `Release` ist für vollständige Release-Pipeline-Durchläufe mit
einem expliziten Tag vorgesehen.

Überprüfen Sie den veröffentlichten Registrierungseintrag mit:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

Das `https://github.com/mcp`-Register von GitHub ist eine separate, kuratierte
Suchoberfläche. Die Veröffentlichung in der offiziellen MCP-Registry ist erforderlich, garantiert jedoch keine
sofortige Sichtbarkeit auf der `/mcp`-Seite von GitHub. Betrachten Sie `npm run
registry:check` als Tool zur Verifizierung von Veröffentlichungen für die offizielle Registry, npm,
GHCR, Docker Hub sowie als Best-Effort-Prüfung der Sichtbarkeit auf GitHub MCP. Verwenden Sie `npm run
registry:check:strict` erst, wenn die Sichtbarkeit auf GitHub MCP zu einer zwingenden
Voraussetzung geworden ist.

## Checkliste für das Glama-Verzeichnis

Die Bewertung im Glama-Verzeichnis erfolgt unabhängig von GitHub-Releases und der Veröffentlichung im offiziellen MCP
Registry. Das Repository enthält `glama.json`, sodass das
`swimmwatch` in Glama die Eigentumsrechte beanspruchen oder bestätigen.

Bevor Sie eine stabile Version veröffentlichen, füllen Sie bitte die kostenlose Glama-Checkliste aus:

- Synchronisieren Sie den Server über die Glama-MCP-Server-Verwaltungsoberfläche, nachdem `glama.json`
  in `main` zusammengeführt wurde;
- `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile` öffnen;
- Glama so konfigurieren, dass es das Dockerfile dieses Repositorys erstellt und den vorhandenen
  stdio-Einstiegspunkt ohne zusätzliche Geheimnisse startet;
- die Laufzeitumgebung mit den CloakBrowser-Standardeinstellungen kompatibel halten: `cloak` Browser-Engine
  Engine, Headless-Modus, stdout-Ausgabe und `/data`-Artefaktspeicher;
- Klicken Sie auf „Deploy“ und warten Sie, bis der Build-Test erfolgreich abgeschlossen ist;
- Erstellen und veröffentlichen Sie eine Glama-Version mit derselben Versionsnummer wie die GitHub-
  Version, zum Beispiel `1.2.7`;
- Nutzen Sie die Glama-Funktion „Try in Browser“ einmal nach der Veröffentlichung, um die erste
  Nutzung anzukurbeln;
- Fügen Sie zugehörige Server manuell hinzu, mindestens den offiziellen Playwright-MCP-Server
  sowie optional eng verwandte Alternativen zur Browser-Automatisierung.

Fügen Sie keine Abrechnungsmethode oder ein kostenpflichtiges Glama-Hosting hinzu, nur um die Bewertung des Verzeichnisses
zu verbessern. Wenn Glama für einen erforderlichen Checklistenpunkt eine Abrechnung verlangt, betrachten Sie dies als
Release-Blockierer, der eine ausdrückliche Entscheidung des Betreuers erfordert.

## Sicherheitsabläufe

Das Repository nutzt kostenlose Sicherheitstools:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / npm release | `npm audit --omit=dev --audit-level=high` | PR CI and npm publish job | No external account or token. |

Die SHA-Fixierung von Aktionen wird als zukünftiger Sicherheitsoptimierungsschritt verfolgt. Aktuelle Workflows verwenden
versionsverwaltete Aktionsverweise, damit Updates überschaubar bleiben, solange die Release-Infrastruktur
noch in den Kinderschuhen steckt.

## Veröffentlichung von Dokumentationen

Die Jobs `docs-build` und `docs-deploy` stellen MkDocs über den nativen GitHub Pages Actions-Bereitstellungsablauf bereit.
In den Pages-Einstellungen des Repositorys muss `GitHub Actions` als Quelle angegeben werden.

Der Workflow erstellt die Dokumentation im strengen Modus, lädt das generierte `site/`
Verzeichnis mit `actions/upload-pages-artifact` hoch und stellt es mit
`actions/deploy-pages` erst nach erfolgreicher npm-, Docker- und MCP-Registry-Veröffentlichung
in der `github-pages`-Umgebung bereit.

Bei der Veröffentlichung der Dokumentation wird nach dem MkDocs-Build außerdem der SEO-Validator ausgeführt.
Optionale Webmaster-Verifizierungstoken nutzen offizielle, kostenlose Webmaster-Tools und können
als Repository-Variablen oder Geheimnisse bereitgestellt werden:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

Für optionale IndexNow-Benachrichtigungen ist ein Repository-Secret mit dem Namen
`INDEXNOW_KEY` erforderlich. Ist dieses festgelegt, veröffentlicht der Workflow die erforderliche Schlüsseldatei und
übermittelt die generierten Sitemap-URLs nach der Bereitstellung auf GitHub Pages.

Fügen Sie keine kostenpflichtigen Indexierungsdienste, Werbeprodukte oder
Analysetools von Drittanbietern in den Dokumentations-Release-Prozess ein, ohne dass zuvor eine gesonderte, ausdrückliche
Entscheidung getroffen wurde.

## Überwachung der vorgelagerten Prozesse

Der Upstream-Monitor-Workflow wird täglich ausgeführt und kann auch manuell über
GitHub Actions gestartet werden. Er überprüft beide Upstream-Verteilungskanäle von Playwright MCP:

- npm-Paket: `@playwright/mcp`;
- Docker-Image: `mcr.microsoft.com/playwright/mcp`.

Wenn eine neuere Upstream-Version erkannt wird, erstellt der Workflow ein GitHub-Issue,
das `swimmwatch` zugewiesen ist. Das Issue enthält die aktuellen und neuesten npm-/Docker-Versionen
Versionen, eine kurze Zusammenfassung der Release-Notes von
`microsoft/playwright-mcp` sowie Links zum vollständigen Upstream-Changelog, zum npm-
Paket und zu den Docker-Tags.

Führen Sie dieselbe Überprüfung lokal mit folgendem Befehl durch:

```bash
npm run upstream:check
```

## Release-Tags

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Checkliste

Vor der Veröffentlichung einer Pressemitteilung:

- Erst zusammenführen, wenn `Actionlint` und `CI` grün sind.
- Erstellen Sie ein GitHub-Release anhand eines Tags wie `v1.2.7`.
- Markieren Sie das Release als Vorabversion, wenn Sie eine npm-Version `next` veröffentlichen.
- Vergewissern Sie sich, dass der „npm Trusted Publisher“ für `release.yml` und
  `npm-production` konfiguriert ist.
- Überprüfen Sie, ob `npm-production`, `docker-production`, `github-pages` sowie
  `mcp-registry-production` vorhanden sind.
- Vergewissern Sie sich, dass das GitHub-Code-Scanning aktiviert ist, falls die Sichtbarkeit für den SARIF-Upload erforderlich ist.
- Vergewissern Sie sich, dass die Sichtbarkeit des GHCR-Pakets nach der ersten Docker-Veröffentlichung öffentlich ist.
- Vergewissern Sie sich, dass der Glama-Server synchronisiert, über die Dockerfile-Verwaltungsseite getestet
  und mit derselben stabilen Version veröffentlicht wurde.

`SUPPORT.md` wird bewusst zurückgestellt, bis für das Projekt eine stabile Support-Richtlinie
vorliegt, die über GitHub-Issues und Sicherheitshinweise hinausgeht.
