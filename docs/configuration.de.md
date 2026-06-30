---
description: Laufzeitkonfiguration für die Playwright-MCP-Brücke, einschließlich streamfähiger HTTP-Sitzungen, GeoIP-basierter Proxy-Zuordnung und humanisiertem Eingabeverhalten.
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
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
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

## GeoIP-Proxy-Zuordnung

Setze `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` zusammen mit `PLAYWRIGHT_MCP_PROXY_SERVER`
um die Zeitzonen-, Sprach- und Ländereinstellungs-Fingerprint-Flags von CloakBrowser anhand des
Proxy-Standorts abzuleiten. Die Bridge behält das an den vorgelagerten Playwright
MCP delegiert und fügt lediglich die aufgelösten Startflags `--fingerprint-timezone`, `--lang` und
`--fingerprint-locale` ein.

Beispiele zur Konfiguration, zur Laufzeit
von „Streamable HTTP Proxy“-Metadaten, Anwendungsfälle, Prioritätsregeln und Einschränkungen finden Sie unter [GeoIP Proxy Matching](geoip-proxy-matching.md).

## Menschliches Eingabeverhalten

Setzen Sie `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, um die menschenähnliche
Maus-, Tastatur- und Scroll-Ebene von CloakBrowser für Seiteninteraktionen zu aktivieren. Die Bridge wendet dies
über den Hook zur Seiteninitialisierung von Playwright MCP an, sodass die Schemata der übergeordneten Browser-Tools
unverändert bleiben.

Beispiele für die Einrichtung,
Streamable-HTTP-Metadaten zur Laufzeit, Anwendungsfälle und Einschränkungen finden Sie unter [Humanized Input Behavior](humanized-input-behavior.md).

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
