---
description: Laufzeitkonfiguration für die Playwright-MCP-Brücke, einschließlich Streamable-HTTP-Sitzungen, persistenten Profilen, validierten Kontextoptionen, Erweiterungspfaden, GeoIP-Proxy-Zuordnung und humanisierter Eingabe.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Konfiguration

Verwenden Sie die Upstream-Variablen `PLAYWRIGHT_MCP_*` für das Playwright-MCP-Verhalten. Verwenden Sie `CLOAK_PLAYWRIGHT_MCP_*` ausschließlich für das Cloak-spezifische Bridge-Verhalten.

Die alten `CLOAKBROWSER_MCP_*`-Variablen werden nicht unterstützt.
Die generierte [CLI-Referenz](generated/cli.md) ist die maßgebliche Liste der Bridge-CLI-Flags und der dazugehörigen Umgebungsvariablen.

## Brückenoptionen

| Variable | Default | Description |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Bridge transport: `stdio` or `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Streamable HTTP listener protocol: `http` or `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Streamable HTTP bind host. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Streamable HTTP bind port. Use `0` for an ephemeral port in tests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Streamable HTTP endpoint path. `/healthz` and `/readyz` are reserved for probes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optional Bearer token required on Streamable HTTP requests. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Session metadata backend. Only `memory` is implemented in this release. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Idle TTL for Streamable HTTP sessions. Expired sessions dispose their bridge and upstream child process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximum active Streamable HTTP sessions in one process. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | TLS certificate PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | TLS private key PEM path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | TLS PFX/PKCS12 path for HTTPS Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase for an encrypted HTTPS key or PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Streamable HTTP operational log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Upstream Playwright MCP proxy server. Used as the GeoIP source when matching is enabled. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream proxy bypass list for hosts that should not use `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Resolves `PLAYWRIGHT_MCP_PROXY_SERVER` GeoIP and matches CloakBrowser timezone and locale fingerprint flags to that proxy location. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Enables CloakBrowser human-like mouse, keyboard, and scroll behavior. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | CloakBrowser human behavior preset: `default` or `careful`. Used only when humanize is enabled. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | CloakBrowser-Binär-Release-Kanal: `stable` oder das nur für Pro verfügbare `preview`. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Zielsprache für die Codegenerierung: `typescript`, `python`, `java`, `csharp` oder `none`. Die Bridge validiert den Wert und schreibt `codegen` in ihre erzeugte Playwright-MCP-Konfiguration. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` oder `false`; fügt den Begrenzungsrahmen jedes Elements als `[box=x,y,width,height]` in Snapshots ein. Die Bridge validiert den Wert und schreibt `snapshot.boxes` in ihre erzeugte Playwright-MCP-Konfiguration. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Upstream-Wartezeit in Millisekunden nach einer Aktion, damit angestoßene Arbeit zur Ruhe kommt. Wird direkt an Playwright MCP weitergeleitet. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Verzeichnis für ein persistentes Chromium-Profil. Die Bridge löst es zu einem absoluten Pfad auf, erstellt es bei Bedarf, prüft die Schreibbarkeit und schreibt es in das generierte `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-Objekt mit validierten Kontextoptionen. Die unterstützten Felder sind unten aufgeführt. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-Array oder kommagetrennte Liste vorhandener Chrome-Erweiterungsverzeichnisse. Erfordert `PLAYWRIGHT_MCP_USER_DATA_DIR`. Verwenden Sie JSON-Arrays für Windows-Pfade oder Pfade mit Kommas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## CloakBrowser-Lizenz und GitHub-Anmeldung

Die Lizenzeinrichtung erfolgt über die vorgelagerte CloakBrowser-CLI;
`cloakbrowser-mcp` fügt keine An- oder Abmeldebefehle hinzu:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

`login` akzeptiert einen kostenpflichtigen Schlüssel oder startet die
GitHub-Anmeldung für einen Schlüssel der kostenlosen Stufe. Der validierte
Schlüssel wird in `~/.cloakbrowser/license.key` gespeichert; `logout` entfernt
diese Datei. `info` meldet die aktive Lizenzstufe und bei Pro-Lizenzen die
Anzahl der aktiven Sitzungen.

Alternativ können Sie `CLOAKBROWSER_LICENSE_KEY` in der Umgebung des
MCP-Servers setzen. Die Bridge leitet die Variable an den
Upstream-/Browser-Kindprozess weiter, ohne sie zu protokollieren. Wenn
`CLOAKBROWSER_CACHE_DIR` auf einen benutzerdefinierten Cache mit `license.key`
verweist, löst CloakBrowser den Schlüssel auf und die Bridge leitet aus der
generierten Browserumgebung nur diesen aufgelösten Schlüssel weiter. Andere
generierte Umgebungseinträge werden nicht kopiert.

Wenn CloakBrowser einen bereitgestellten Lizenzschlüssel ablehnt, ihn nicht
prüfen kann oder den Lizenzserver nicht erreicht, schlägt der Start mit dem
eindeutigen CloakBrowser-Fehler fehl. Die Bridge bewahrt diesen Fehler; sie
maskiert ihn nicht und wechselt nicht stillschweigend zu einem anderen Browser
oder einer anderen Lizenzstufe.

## CloakBrowser-Release-Kanal

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` wählt den Release-Kanal des CloakBrowser-Binärprogramms. Die Vorgabe ist `stable`. `preview` fordert einen Pro-Preview-Browser-Build an und ist nur mit einer Pro-Lizenz verfügbar. Eine explizite Festlegung von `CLOAKBROWSER_VERSION` hat Vorrang. Ist Preview für die Plattform nicht verfügbar, fällt CloakBrowser auf Stable zurück.

Der Release-Kanal wird beim Start des Bridge-Prozesses gewählt. Er gilt für alle Streamable-HTTP-Sitzungen und kann nicht in initialize-Metadaten gesetzt oder überschrieben werden. Starten Sie die Bridge neu, um ihn zu ändern.

## GeoIP-Proxy-Zuordnung

Setzen Sie `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` zusammen mit
`PLAYWRIGHT_MCP_PROXY_SERVER`, um die Zeitzonen-, Sprach- und
Ländereinstellungs-Fingerprint-Flags von CloakBrowser anhand des
Proxy-Ausgangsstandorts abzuleiten. CloakBrowser wählt bei unterstützten
Binärdateien die native Inline-Authentifizierung in der URL und behält bei
älteren Binärdateien das Playwright-Proxyobjekt als Fallback bei.

Beispiele zur Konfiguration, zur Laufzeit
von „Streamable HTTP Proxy“-Metadaten, Anwendungsfälle, Prioritätsregeln und Einschränkungen finden Sie unter [GeoIP Proxy Matching](geoip-proxy-matching.md).

Die Zuordnung arbeitet fail-closed: Kann CloakBrowser die Proxy-Ausgangs-IP,
die GeoIP-Datenbank, die Zeitzone oder das Gebietsschema nicht auflösen, startet
der Browser nicht mit einem nur teilweise passenden Fingerabdruck. Die
GeoIP-Auflösung ist auf höchstens 20 Sekunden begrenzt; der erste Download der
Offline-GeoIP-Datenbank erfolgt getrennt und kann länger dauern.

## Menschliches Eingabeverhalten

Setzen Sie `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, um die menschenähnliche
Maus-, Tastatur- und Scroll-Ebene von CloakBrowser für Seiteninteraktionen zu aktivieren. Die Bridge wendet dies
über den Hook zur Seiteninitialisierung von Playwright MCP an, sodass die Schemata der übergeordneten Browser-Tools
unverändert bleiben.

Beispiele für die Einrichtung,
Streamable-HTTP-Metadaten zur Laufzeit, Anwendungsfälle und Einschränkungen finden Sie unter [Humanized Input Behavior](humanized-input-behavior.md).

## Chrome-Erweiterungen

Chrome-Erweiterungen werden beim Start des Browsers geladen. Konfigurieren Sie
sie daher vor dem Start der Bridge oder vor dem Erstellen einer
Streamable-HTTP-Sitzung. Erweiterungen müssen entpackte Verzeichnisse sein und
erfordern ein persistentes Profil:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Für Streamable HTTP übergeben Sie die Profil- und Erweiterungsverzeichnisse in
den `initialize`-Metadaten:

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

Starten Sie die Bridge neu oder erstellen Sie eine neue HTTP-Sitzung, nachdem
Sie Erweiterungsdateien oder Erweiterungspfade geändert haben. Verwenden Sie ein
JSON-Array für `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, wenn Pfade Kommas
enthalten, wenn mehrere Erweiterungen übergeben werden oder wenn Windows-Pfade
mit Laufwerksbuchstaben verwendet werden.

## Streamfähige HTTP-Laufzeit-Metadaten

Streamable-HTTP-Clients können pro MCP-Sitzung bestimmte Laufzeitoptionen auswählen, indem sie
brückenbezogene Metadaten zur Anfrage `initialize` hinzufügen:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "proxyServer": "http://user:pass@proxy.example:8080",
        "proxyBypass": ".internal,localhost",
        "geoipProxyMatch": true,
        "headless": false,
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

`proxyServer` hat für diese HTTP-Sitzung Vorrang vor `PLAYWRIGHT_MCP_PROXY_SERVER`.
`proxyBypass` überschreibt `PLAYWRIGHT_MCP_PROXY_BYPASS` nur dann, wenn `proxyServer`
vorhanden ist. `geoipProxyMatch` kann den GeoIP-Abgleich für diese Sitzung aktivieren oder deaktivieren,
ohne den MCP-Server neu zu starten. Bestehende Sitzungen behalten ihren Start-Proxy;
um den Standort zu wechseln, muss eine neue HTTP-Sitzung erstellt werden.

`humanize` kann das humanisierte Eingabeverhalten für diese Sitzung aktivieren oder deaktivieren,
ohne andere Sitzungen zu beeinflussen. `humanPreset` kann für diese Sitzung zwischen `default` oder `careful`
für diese Sitzung auswählen, aktiviert das humanisierte Verhalten jedoch nicht von selbst. Bestehende
Sitzungen behalten das während `initialize` erfasste Verhalten bei.

`headless` kann den Headless-Browser-Modus für diese Sitzung aktivieren oder deaktivieren. Die Einstellung
`headless` auf `false` erfordert eine funktionsfähige Anzeigeumgebung, insbesondere bei
Docker- oder Linux-Server-Bereitstellungen.

`userDataDir` aktiviert für diese Sitzung ein persistentes Chromium-Profil und
überschreibt `PLAYWRIGHT_MCP_USER_DATA_DIR`. Die Bridge löst das Verzeichnis als
absoluten, plattformnativen Pfad auf, erstellt es bei Bedarf, prüft die
Schreibbarkeit und schreibt es in das generierte `browser.userDataDir`. Ein
persistentes Profil deaktiviert das standardmäßige isolierte Streamable-HTTP-Profil
für diese Sitzung. Die Bridge weist doppelte aktive Profilverzeichnisse
innerhalb eines Prozesses zurück; prozessübergreifende Profilkonflikte bleiben
Chromium/Playwright-Fehler.

`contextOptions` werden validiert und flach über
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` zusammengeführt; verschachtelte Objekte
ersetzen ganze Werte. Unterstützte Felder sind `userAgent`, `viewport`,
`locale`, `timezoneId`, `colorScheme`, `permissions`, `geolocation`,
`extraHTTPHeaders`, `httpCredentials`, `ignoreHTTPSErrors`, `offline`,
`deviceScaleFactor`, `isMobile` und `hasTouch`. Eine beliebige Weitergabe von
`BrowserContextOptions` wird in dieser Version nicht unterstützt.

`extensionPaths` müssen auf vorhandene Verzeichnisse zeigen und erfordern ein
persistentes `userDataDir`. Die Bridge löst Erweiterungspfade als absolute,
plattformnative Pfade auf, übergibt sie an CloakBrowser und schreibt die
generierten Chromium-Argumente `--load-extension` und
`--disable-extensions-except` in die generierte Playwright-MCP-Konfiguration.

Authentifizierte HTTP-Proxy-Anmeldedaten können in `proxyServer` eingebettet werden, zum
Beispiel `http://user:pass@proxy.example:8080`. Führen Sie eine Prozent-Kodierung für Anmeldeinformationen
durch, die URL-Bedeutung haben, wie z. B. `@`, `:`, `/`, `?`, `#` und `%`.

Bei unterstützten CloakBrowser-Binärdateien verwenden authentifizierte
HTTP-Proxys die native Inline-Authentifizierung in der URL, und die Bridge
entfernt das doppelte Playwright-Proxyobjekt. Ältere Binärdateien behalten das
Playwright-Proxyobjekt als Kompatibilitäts-Fallback bei.

Informationen zu QA-Mustern für mehrere Standorte finden Sie unter [GeoIP-Proxy-Abgleich](geoip-proxy-matching.md).
Informationen zu Mustern für realistische Interaktionen finden Sie unter [Humanisiertes Eingabeverhalten](humanized-input-behavior.md).

## Optionen für den Upstream

Die Bridge leitet die Einstellungen von `PLAYWRIGHT_MCP_*` an den vorgelagerten Playwright MCP weiter. Dazu gehören auch vorgelagerte Optionen wie:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

Die vollständige Übersicht über die Optionen des Upstream-Projekts finden Sie in der Playwright-MCP-Dokumentation des Upstream-Projekts.

`PLAYWRIGHT_MCP_CAPS=devtools` wird an den Upstream-Kindprozess vererbt und
aktiviert die von dieser Fähigkeit gesteuerten Tools ohne bridge-eigene
Option `--caps`.

## Protokollierung

Im „Streamable HTTP“-Modus werden für Menschen lesbare Start- und Anforderungsprotokolle an stdout ausgegeben. Im „Stdio“-Modus werden keine routinemäßigen Betriebsprotokolle ausgegeben, sodass die stdout-Ausgabe von MCP JSON-RPC protokollkonform bleibt. Schwerwiegende Fehler beim Start der Befehlszeilenschnittstelle werden weiterhin an stderr ausgegeben.

## HTTPS

Streamable HTTP verwendet standardmäßig lokales HTTP. Wählen Sie „Direct TLS“ mit `--http-protocol https` oder `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` aus und geben Sie anschließend entweder ein Zertifikat/Schlüsselpaar oder eine PFX-Datei an:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Für den externen Zugriff oder den Zugriff außerhalb des Loopback-Modus verwenden Sie HTTPS in Kombination mit `--http-auth-token` oder lassen Sie TLS an einem vertrauenswürdigen Reverse-Proxy enden, der ebenfalls Authentifizierung und Netzwerkzugriffskontrollen durchführt.

## Streamfähige HTTP-Sitzungen

Jede Streamable-HTTP-MCP-Sitzung verfügt über eine eigene Bridge-Laufzeitumgebung und einen eigenen vorgelagerten Playwright-MCP-Kindprozess. HTTP-Sitzungen führen das vorgelagerte Playwright-MCP mit einem isolierten Browserprofil aus, sodass gleichzeitige Benutzer nicht um dasselbe persistente Chromium-Profil konkurrieren. Das integrierte `memory`-Sitzungs-Backend speichert ausschließlich Metadaten wie Sitzungs-ID, Zeitstempel, Ablaufzeit und Status. Der Browserstatus verbleibt im aktiven Upstream-Kindprozess, und die Artefakte werden weiterhin von `PLAYWRIGHT_MCP_OUTPUT_DIR` verwaltet.

Für die horizontale Skalierung sollten Sie mehrere Server-Replikate hinter einem Load Balancer betreiben, wobei die Sticky-Sessions über den Header `mcp-session-id` zugeordnet werden. Zukünftige Redis-, Postgres- oder SQLite-Backends können Metadaten und Sperren koordinieren, sind jedoch nicht in der Lage, eine aktive Browsersitzung wiederherzustellen, nachdem der Prozess, dem sie gehört, beendet wurde.

## Streamfähige HTTP-Probes

Wenn die Brücke mit `--transport streamable-http` betrieben wird, stellt sie feste Probe-Endpunkte auf demselben Host und Port wie der MCP-Endpunkt bereit:

- `GET /healthz` gibt Metadaten zum Prozesszustand zurück: `status`, `version`, `transport` und `uptimeMs`.
- `GET /readyz` gibt Metadaten zur Betriebsbereitschaft und zur Sitzungskapazität zurück: `sessions.active`, `sessions.pending`, `sessions.max` und `sessions.available`.

Die Bereitschaft gibt HTTP `200` zurück, solange Sitzungskapazität verfügbar ist, und HTTP `503`, wenn `active + pending >= max` ist.
Wenn `--http-auth-token` oder `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` konfiguriert ist, benötigen beide Probes denselben `Authorization: Bearer ...`-Header wie MCP-Anfragen. Ohne Authentifizierungstoken sind die Probes auf der konfigurierten HTTP-Bind-Adresse offen.

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
