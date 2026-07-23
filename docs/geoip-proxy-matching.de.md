---
title: GeoIP-Proxy-Zuordnung
description: Abgleich der Zeitzonen-, Sprach- und Ländereinstellungs-Fingerabdrücke von CloakBrowser mit einem konfigurierten Proxy-Standort für regionale Qualitätssicherung und „Streamable“-HTTP-Sitzungen.
icon: material/map-marker-radius
tags:
  - Configuration
  - GeoIP
  - Proxy
  - User Guide
---

# GeoIP-Proxy-Abgleich

Durch den GeoIP-Proxy-Abgleich werden die Browser-Fingerprint-Einstellungen an den
vom vorgelagerten Playwright MCP verwendeten Proxy-Standort angepasst. Dies ist nützlich, wenn die regionale Qualitätssicherung
auf einen konsistenten Proxy, eine konsistente Zeitzone, Sprache und ein konsistentes Ländereinstellungsprofil angewiesen ist.

Die Bridge erzeugt oder leitet keinen Proxy-Datenverkehr selbst weiter. Sie
übergibt `PLAYWRIGHT_MCP_PROXY_SERVER` an die Startvorbereitung von
CloakBrowser. Wenn das Matching aktiviert ist, ermittelt CloakBrowser den
Ausgangsstandort des konfigurierten Proxys und fügt passende Startflags für
Zeitzone, Browsersprache, Fingerprint-Lokalisierung und WebRTC-IP hinzu.

## Was sich dadurch ändert

Wenn `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` gesetzt ist, kann die Bridge diese
Startparameter für CloakBrowser hinzufügen:

- `--fingerprint-timezone`
- `--lang`
- `--fingerprint-locale`
- `--fingerprint-webrtc-ip`

Dadurch wird sichergestellt, dass das Browserprofil intern mit der Proxy-Region übereinstimmt.
Die Schemata des übergeordneten Playwright-MCP-Tools und die Browser-Tools werden weiterhin
unverändert weitergeleitet.

## Globale Einstellungen

Verwenden Sie Umgebungsvariablen auf Prozessebene für stdio-Clients und als Standard für
Streamable-HTTP-Sitzungen:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Fügen Sie eine Bypass-Liste hinzu, wenn bestimmte Hosts den Proxy umgehen sollen:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
PLAYWRIGHT_MCP_PROXY_BYPASS=".internal,localhost" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
npx -y cloakbrowser-mcp@latest
```

Authentifizierte HTTP-Proxys werden durch die Einbettung von Anmeldedaten in
`PLAYWRIGHT_MCP_PROXY_SERVER` unterstützt. Sonderzeichen in den Anmeldedaten müssen perzent-kodiert werden,
verwenden Sie beispielsweise `p%40ssword` für `p@ssword`.

Unterstützte CloakBrowser-Binärdateien verwenden die native
Inline-Authentifizierung in der URL und melden die tatsächliche Ausgangs-IP des
Proxys, selbst wenn dieser eine strikte authentifizierte CONNECT-Anfrage
verlangt. Ältere Binärdateien behalten das Playwright-Proxyobjekt als
Kompatibilitäts-Fallback bei.

## Docker-Einrichtung

Übergeben Sie dieselben Variablen an den Container. Speichern Sie die Proxy-Anmeldedaten nach Möglichkeit in Ihrem Secret
Manager oder in Ihrer MCP-Client-Umgebung.

```bash
docker run --rm --init -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Für Streamable HTTP in Docker veröffentlichen Sie den HTTP-Port wie gewohnt und behalten Sie die Proxy-Variablen
als Standardwerte der Containerumgebung bei:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Sitzungsbezogener HTTP-Proxy mit Stream-Unterstützung

Streamfähige HTTP-Clients können bei der Initialisierung der MCP-Sitzung einen Proxy auswählen.
Dadurch kann ein einziger, lang laufender MCP-Server verschiedene regionale Szenarien bewältigen, ohne
neu gestartet werden zu müssen.

Senden Sie die Bridge-Metadaten in der Anfrage `initialize`:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true
      }
    }
  }
}
```

`proxyServer` hat für diese HTTP-Sitzung Vorrang vor `PLAYWRIGHT_MCP_PROXY_SERVER`.
`proxyBypass` überschreibt `PLAYWRIGHT_MCP_PROXY_BYPASS` nur dann, wenn `proxyServer`
vorhanden ist. Wenn `proxyServer` vorhanden ist und `proxyBypass` weggelassen wird, wird die geerbte
Proxy-Bypass-Konfiguration für diese Sitzung zurückgesetzt.

`geoipProxyMatch` überschreibt die GeoIP-Einstellung auf Prozessebene für diese HTTP-
Sitzung. Verwenden Sie `true`, um den Abgleich für die Sitzung zu aktivieren, oder `false`, um ihn zu deaktivieren,
selbst wenn der Server mit aktiviertem Abgleich gestartet wurde.

Bestehende HTTP-Sitzungen sind unveränderlich. Erstellen Sie eine weitere „Streamable“-HTTP-Sitzung, um
zu einem anderen Proxy oder Standort zu wechseln.

Wenn `proxyServer` Anmeldedaten enthält, sollten diese URL-kodiert bleiben und der Wert
über Geheimnisse oder die Client-Laufzeitkonfiguration übergeben werden, anstatt ihn in
Projektdateien festzuschreiben.

## Anwendungsfälle

<div class="grid cards" markdown>

- :material-cart-check: **QA für lokalisierten Handel**

  Teste Checkout, Steuern, Versandmeldungen, Währung und regionale Katalogregeln
  mit Browser-Zeitzone und Locale passend zum Proxy-Standort.

- :material-web: **Regionale Landingpages**

  Prüfe Sprache, Einwilligung, Kampagnen und Inhaltsvarianten, die von der Region
  des Besuchers abhängen.

- :material-lifebuoy: **Reproduktion für Supportfälle**

  Reproduziere eine Meldung aus einer Kundenregion, ohne den gesamten MCP-Server
  für jeden Proxy-Standort neu zu starten.

- :material-clock-check: **Zeitzonensensible Abläufe**

  Prüfe Datumsauswahl, Buchungsfenster, Erinnerungen und Planungsseiten, bei denen
  Zeitzone und Locale zur Netzwerkregion passen müssen.

- :material-source-branch-sync: **Parallele regionale Sitzungen**

  Führe getrennte Streamable-HTTP-Sitzungen mit verschiedenen Proxys aus, damit ein Agent
  mehrere Regionen in einem Serverprozess vergleichen kann.

</div>

## Rangfolge und Grenzen

| Bereich | Verhalten |
| --- | --- |
| Stdio | Verwendet nur Umgebungsvariablen und CLI-Flags auf Prozessebene. |
| Streamable-HTTP-Standard | Verwendet Umgebungsvariablen und CLI-Flags auf Prozessebene, wenn keine runtime-Metadaten angegeben sind. |
| Streamable-HTTP-Metadaten | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"]` kann Proxy und GeoIP-Abgleich für eine Sitzung überschreiben. |
| Bestehende Sitzungen | Behalten Proxy und GeoIP-Einstellung, die während `initialize` erfasst wurden. |
| Authentifizierter HTTP-Proxy | Verwendet bei unterstützten Binärdateien die native Inline-Authentifizierung von CloakBrowser in der URL und bei älteren Binärdateien das Playwright-Proxyobjekt. |
| Unverarbeitete Zeitzonen-/Ländereinstellungs-Flags | Explizite Werte für `--fingerprint-timezone`, `--lang` und `--fingerprint-locale` in `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` haben Vorrang vor GeoIP-abgeleiteten Werten und werden nicht dupliziert. |
| Browser geolocation API | Wird von dieser Funktion nicht konfiguriert; sie gleicht nur die Fingerprint-Werte für Zeitzone, Sprache, Ländereinstellung und WebRTC-IP von CloakBrowser ab. |

GeoIP-Standortdaten sind ungefähre Angaben und hängen von der Proxy-IP sowie der
GeoIP-Datenbank von CloakBrowser ab. CloakBrowser lädt diese Offline-Datenbank bei der ersten
Nutzung herunter und speichert sie im Cache, sobald sie benötigt wird.

Die folgende Konfiguration behält beispielsweise die explizite Zeitzone und
Ländereinstellung bei, verwendet aber weiterhin den GeoIP-Abgleich, um die
Ausgangs-IP des Proxys zu ermitteln:

```bash
PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS='["--fingerprint-timezone=America/New_York","--lang=en-US","--fingerprint-locale=en-US"]' \
npx -y cloakbrowser-mcp@latest
```

Nutzen Sie diese Funktion für legitime Qualitätssicherung, Lokalisierung und Tests zur
Konsistenz der Umgebungen. Sie sollte nicht als Möglichkeit zur Umgehung von Zugriffskontrollen oder regionalen
Richtlinienprüfungen betrachtet werden.

## Zugehörige Konfiguration

- [Konfiguration](configuration.md) listet alle Bridge- und Upstream-Umgebungsvariablen auf.
- [Docker](docker.md) erläutert die Standardwerte für die Container-Laufzeit und die Streamable-HTTP-Veröffentlichung.
- [Tools](tools.md) erläutert, warum die Upstream-Browser-Tools von Playwright MCP unverändert weitergeleitet werden.

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
