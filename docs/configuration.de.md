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

| Variable | Standardwert | Beschreibung |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Transport der Bridge: `stdio` oder `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Protokoll des Streamable-HTTP-Listeners: `http` oder `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Hostadresse, an die der Streamable-HTTP-Listener gebunden wird. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Port, an den der Streamable-HTTP-Listener gebunden wird. Verwenden Sie in Tests `0` für einen temporär zugewiesenen Port. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Pfad des Streamable-HTTP-Endpunkts. `/healthz` und `/readyz` sind für Probes reserviert. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Optionaler Bearer-Token. Wenn gesetzt, muss er bei Streamable-HTTP-Anfragen mitgesendet werden. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Backend für Sitzungsmetadaten. In diesem Release ist nur `memory` implementiert. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Gültigkeitsdauer inaktiver Streamable-HTTP-Sitzungen. Bei abgelaufenen Sitzungen werden die Ressourcen der Bridge freigegeben und der Upstream-Kindprozess beendet. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Maximale Anzahl aktiver Streamable-HTTP-Sitzungen in einem Prozess. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Pfad zur TLS-Zertifikatsdatei im PEM-Format für Streamable HTTP über HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Pfad zum privaten TLS-Schlüssel im PEM-Format für Streamable HTTP über HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Pfad zur TLS-Datei im PFX/PKCS12-Format für Streamable HTTP über HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Passphrase für einen verschlüsselten HTTPS-Schlüssel oder eine PFX-Datei. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Betriebslog-Level für Streamable HTTP: `trace`, `debug`, `info`, `warn`, `error`, `fatal` oder `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Proxyserver für Upstream Playwright MCP. Bei aktiviertem Abgleich dient er als Quelle für GeoIP-Informationen. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Upstream-Liste der Hosts, für die `PLAYWRIGHT_MCP_PROXY_SERVER` umgangen werden soll. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Ermittelt die GeoIP-Informationen von `PLAYWRIGHT_MCP_PROXY_SERVER` und gleicht die Fingerprint-Argumente für Zeitzone und Locale von CloakBrowser mit dem Proxystandort ab. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Aktiviert menschenähnliche Maus-, Tastatur- und Scrollaktionen von CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Preset für menschenähnliches Verhalten von CloakBrowser: `default` oder `careful`. Wird nur bei aktiviertem humanize verwendet. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | CloakBrowser-Binär-Release-Kanal: `stable` oder das nur für Pro verfügbare `preview`. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Pfad zu einer benutzerdefinierten CloakBrowser-Binärdatei. Die CLI-Option `--binary-path` hat Vorrang. |
| `CLOAKBROWSER_VERSION` | unset | Versionsfestlegung für den Cache-Resolver von CloakBrowser, wenn kein eigenes ausführbares Programm gewählt ist. Ein gültiger Lizenzschlüssel des kostenlosen Tarifs ignoriert die Festlegung; CloakBrowser kann ein zwischengespeichertes Binärprogramm wiederverwenden. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` verwendet die CloakBrowser-Binärdatei. `playwright` überspringt den Cloak-spezifischen Austausch der ausführbaren Datei. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Führt Chromium im Headless-Modus aus. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artefaktverzeichnis für npm. Docker setzt `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Zielsprache für die Codegenerierung: `typescript`, `python`, `java`, `csharp` oder `none`. Die Bridge validiert den Wert und schreibt `codegen` in ihre erzeugte Playwright-MCP-Konfiguration. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` oder `false`; fügt den Begrenzungsrahmen jedes Elements als `[box=x,y,width,height]` in Snapshots ein. Die Bridge validiert den Wert und schreibt `snapshot.boxes` in ihre erzeugte Playwright-MCP-Konfiguration. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Upstream-Wartezeit in Millisekunden nach einer Aktion, damit angestoßene Arbeit zur Ruhe kommt. Wird direkt an Playwright MCP weitergeleitet. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Standardzeitlimit für Aktionen in Millisekunden. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Standardzeitlimit für Navigationen in Millisekunden. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser-Viewport im Format `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Verzeichnis für ein persistentes Chromium-Profil. Die Bridge löst es zu einem absoluten Pfad auf, erstellt es bei Bedarf, prüft die Schreibbarkeit und schreibt es in das generierte `browser.userDataDir`. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | JSON-Objekt mit validierten Kontextoptionen. Die unterstützten Felder sind unten aufgeführt. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | JSON-Array oder kommagetrennte Liste vorhandener Chrome-Erweiterungsverzeichnisse. Erfordert `PLAYWRIGHT_MCP_USER_DATA_DIR`. Verwenden Sie JSON-Arrays für Windows-Pfade oder Pfade mit Kommas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Aktiviert den Kompatibilitätspatch für Konsolenmeldungen. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Fügt die standardmäßigen Stealth-Startargumente von CloakBrowser hinzu. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Zusätzliche Chromium-Argumente als kommagetrennte Liste oder JSON-Array. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Fügt `--no-sandbox` hinzu und deaktiviert die Chromium-Sandbox. |

## Verwaltet CDP { #managed-cdp }

Der verwaltete Zugriff auf das Chrome-DevTools-Protokoll (CDP) ist eine explizite Zustimmung. Es macht das
derselbe Chromium-Browser-Generation, kontrolliert von MCP durch eine fähigkeitsbasierte
Entdeckung URL. Das Konfigurieren eines Portpools allein aktiviert CDP nicht.

| CLI-Option | Umgebungsvariable | Standard | Zweck |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Setzen Sie den stdio-Wert und die Streamable HTTP-Sitzungsstandard. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | nicht gesetzt | Konfigurieren Sie den prozesslokalen externen Proxy-Port-Pool. Eine aktivierte Sitzung nutzt einen Port. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Binden Sie den verwalteten CDP-Proxy. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Erlaube oder verweigere eine Nicht-Loopback-Bindung. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | nicht gesetzt | Setzen Sie einen konkret extern erreichbaren Host in den Discovery-URLs ein. Für Wildcard-Bindungen erforderlich. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Veröffentlichen Sie `http`/`ws` oder `https`/`wss` URLs. Dies aktiviert TLS nicht. |

Jeder CLI-Wert überschreibt nur seine passende Umgebungsvariable. Insbesondere,
`--no-cdp-enabled` überschreibt `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, und
`--no-cdp-allow-remote` überschreibt `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Eine aktivierte Sitzung ohne einen Portpool wird abgelehnt, bevor ihr übergeordnetes Kind startet.
Ein effektiver falscher Wert erzeugt keinen Listener, keine Port-Lease und keine Berechtigung.

Für stdio gilt der Prozesswert direkt:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Für Streamable HTTP, das flache `cdpEnabled`-Boolean im authentifizierten
`initialize`-Metadaten überschreiben den Prozessstandard für diese Sitzung. Das Auslassen der
Das Feld erbt den Prozesswert. Diese Beispiele wählen explizit eine Sitzung aus und
noch einer raus:

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

Eine CDP-fähige HTTP-Sitzung besitzt eine externe Port-Miete. Deaktivierte Sitzungen tun dies nicht
den Pool verbrauchen. Die Zuweisung ist prozesslokal, wählt den niedrigsten nicht vermieteten Kandidaten aus,
und bricht diese Sitzung sofort ab, wenn der ausgewählte externe Port bereits belegt ist.
Sitzungen schließen, um Ports freizugeben, oder einen größeren Bereich konfigurieren, wenn der Pool erschöpft ist.

Rufen Sie den aktuellen URL von `cloakbrowser_bridge_info` ab, und geben Sie ihn dann weiter
`structuredContent.cdp.discoveryUrl` an einen CDP-Kunden wie den von Playwright
`chromium.connectOverCDP()`. Behandle dieses URL als Anmeldeinformation: es enthält ein Zufallselement
Pro-Generation-Fähigkeit und wird nach dem Austausch des Browsers veraltet. Verwaltetes CDP ist
kein Playwright Server-Endpunkt. `chromium.connect()` und der aktuelle Open WebUI
`PLAYWRIGHT_WS_URL`-Flüsse werden nicht unterstützt.

`--cdp-advertised-scheme https` veröffentlicht `https` Entdeckung und `wss` WebSocket URLs
nur. Die Brücke bietet kein TLS für verwaltete CDP: ihren externen Listener und
Chromium hop bleibt Klartext HTTP/WebSocket. Ein von einem Betreiber besessener TLS-Terminator muss
auf demselben beworbenen gemieteten Port lauschen, die beworbenen `Host` und `Origin` beibehalten
Behörde und leitet es eins zu eins an den Klartext-Listener dieser Sitzung weiter.

Die Aktivierung von CDP beginnt Chromium während der MCP-Initialisierung, sodass Eigentum und extern
Die Bereitschaft kann überprüft werden. Konfigurieren Sie das Timeout für die Initialisierung des MCP-Clients auf mindestens 60.
Sekunden. Wenn verwaltet CDP aktiviert ist, vom Benutzer bereitgestellt
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` darf `--remote-debugging-port` nicht enthalten,
`--remote-debugging-address` oder `--remote-debugging-pipe` (einschließlich `=`-Formen).
Die eigene interne `--remote-debugging-pipe` von Playwright bleibt zusammen mit der aktiviert
Bridge-verwalteter Loopback-TCP-Endpunkt.

Siehe [Werkzeuge](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Sicherheit](security.md#managed-cdp-security), und
[Architektur](architecture.md#managed-cdp-ownership) für den Entdeckungszustand, die Bereitstellung,
Grenzen und Neustartverhalten.

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

Wenn CloakBrowser den angegebenen Lizenzschlüssel ablehnt oder ihn weder über den Lizenzserver noch über eine zwischengespeicherte Validierung prüfen kann, schlägt der Start mit dem ausdrücklichen CloakBrowser-Fehler fehl. Die Bridge bewahrt diesen Fehler; sie verbirgt ihn nicht und wechselt nicht stillschweigend zu einem anderen Browser oder einer anderen Lizenzstufe.

CloakBrowser kann eine zwischengespeicherte Validierung wiederverwenden, wenn der Lizenzserver nicht verfügbar ist. Das garantiert keinen Offline-Start: Der Download des Binärprogramms oder der Browserstart kann weiterhin fehlschlagen.

## CloakBrowser-Release-Kanal

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` wählt den Release-Kanal des CloakBrowser-Binärprogramms. Die Vorgabe ist `stable`. `preview` fordert einen Pro-Preview-Browser-Build an und ist nur mit einer Pro-Lizenz verfügbar. Eine explizite Festlegung von `CLOAKBROWSER_VERSION` hat bei Downloads ohne Schlüssel oder mit einem kostenpflichtigen Schlüssel Vorrang. Ein gültiger Schlüssel des kostenlosen Tarifs ignoriert die Festlegung und kann ein zwischengespeichertes Binärprogramm wiederverwenden. Ist Preview für die Plattform nicht verfügbar, fällt CloakBrowser auf Stable zurück.

Der Release-Kanal wird beim Start des Bridge-Prozesses gewählt. Er gilt für alle Streamable-HTTP-Sitzungen und kann nicht in initialize-Metadaten gesetzt oder überschrieben werden. Starten Sie die Bridge neu, um ihn zu ändern.

## Benutzerdefinäre CloakBrowser-Binärdatei

`--binary-path <path>` wählt eine benutzerdefinierte CloakBrowser-Binärdatei für
den aktuellen Bridge-Prozess. `CLOAKBROWSER_BINARY_PATH` bietet dieselbe Einstellung
für umgebungsbasierte Bereitstellungen; die CLI-Option hat Vorrang. Die Bridge löst
den Pfad auf, verlangt eine lesbare reguläre Datei und schreibt ihn in
`browser.launchOptions.executablePath` der erzeugten Playwright-MCP-Konfiguration.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

Die Bridge lädt eine benutzerdefinierte Binärdatei nicht herunter und aktualisiert
sie nicht. Ohne benutzerdefinierten Pfad kann `CLOAKBROWSER_VERSION` stattdessen die
von CloakBrowser verwaltete Binärversion festlegen.

Bei Streamable HTTP gehört die gewählte Binärdatei zum Bridge-Prozess und wird von
jeder erzeugten MCP-Sitzung verwendet. `initialize`-Metadaten können keinen
Ausführungspfad auswählen oder überschreiben; verwenden Sie getrennte Prozesse für
unterschiedliche Binärdateien.

Wenn der gewählte Build `document.modelContext` oder `navigator.modelContext` mit der Methode `getTools()` bereitstellt, kann Upstream Playwright MCP nach einem Seitensnapshot `webmcp_<page-tool>`-Tools hinzufügen. Es sendet `tools/list_changed`; die Bridge leitet die Benachrichtigung und die aktualisierte Liste weiter. Die Seite definiert Namen und Schema jedes dynamischen Tools.

## GeoIP-Proxy-Zuordnung

Setzen Sie `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` zusammen mit
`PLAYWRIGHT_MCP_PROXY_SERVER`, um die Zeitzonen-, Sprach- und
Ländereinstellungs-Fingerprint-Flags von CloakBrowser anhand des
Proxy-Ausgangsstandorts abzuleiten. CloakBrowser wählt bei unterstützten
Binärdateien die native Inline-Authentifizierung in der URL und behält bei
älteren Binärdateien das Playwright-Proxyobjekt als Fallback bei.

Beispiele zur Konfiguration, zur Laufzeit
von „Streamable HTTP Proxy“-Metadaten, Anwendungsfälle, Prioritätsregeln und Einschränkungen finden Sie unter [GeoIP-Proxy-Abgleich](geoip-proxy-matching.md).

Eine kurze Anleitung finden Sie unter [Regionale QA über einen Proxy](recipes/regional-qa-through-proxy.md).

## Menschliches Eingabeverhalten

Setzen Sie `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, um die menschenähnliche
Maus-, Tastatur- und Scroll-Ebene von CloakBrowser für Seiteninteraktionen zu aktivieren. Die Bridge wendet dies
über den Hook zur Seiteninitialisierung von Playwright MCP an, sodass die Schemata der übergeordneten Browser-Tools
unverändert bleiben.

Beispiele für die Einrichtung,
Streamable-HTTP-Metadaten zur Laufzeit, Anwendungsfälle und Einschränkungen finden Sie unter [Menschliches Eingabeverhalten](humanized-input-behavior.md).

## Chrome-Erweiterungen { #chrome-extensions }

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

Eine kurze Konfiguration zum Kopieren finden Sie unter [Chrome-Erweiterung laden](recipes/load-chrome-extension.md).

## Playwright-Extension-Verbindungsmodus { #playwright-extension-connection-mode }

Der Playwright-Extension-Verbindungsmodus unterscheidet sich vom Laden einer entpackten Erweiterung über `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Er verbindet sich über die offizielle Playwright Extension, die bereits in einem Chrome- oder Edge-Profil installiert ist. Die Bridge installiert diese Erweiterung nicht.

Konfigurieren Sie für stdio die Prozessumgebung:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Bei Streamable HTTP überschreiben `extensionMode` und `profileDirName` in den `initialize`-Metadaten die entsprechenden Prozesswerte. Auch `userDataDir` ist sitzungsspezifisch. Der Token wird weiterhin ausschließlich über die Prozessumgebung angenommen:

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

Der Erweiterungsmodus erfordert einen nicht leeren Token und ein persistentes Profil. Gleichzeitige HTTP-Erweiterungssitzungen müssen unterschiedliche `userDataDir`-Werte verwenden. Vor dem Start des Upstream-Kindprozesses lehnt die Bridge folgende Einstellungen ab: verwaltete oder externe CDP-Endpunkte, entfernte Browserendpunkte, Headless- oder isolierte Startkonfiguration, Proxy- und GeoIP-Optionen, Humanisierung, Kontextänderungen, `extensionPaths` für entpackte Erweiterungen sowie explizit angegebene CloakBrowser-Startoptionen. Die erfolgreiche Verbindung wird manuell durchgängig geprüft, da die offizielle Playwright Extension bereits im gewählten Browserprofil installiert sein muss.

## Streamfähige HTTP-Laufzeit-Metadaten { #streamable-http-runtime-metadata }

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

`proxyServer` hat für diese HTTP-Sitzung Vorrang vor `PLAYWRIGHT_MCP_PROXY_SERVER`.
`proxyBypass` überschreibt `PLAYWRIGHT_MCP_PROXY_BYPASS` nur dann, wenn `proxyServer`
vorhanden ist. `geoipProxyMatch` kann den GeoIP-Abgleich für diese Sitzung aktivieren oder deaktivieren,
ohne den MCP-Server neu zu starten. Bestehende Sitzungen behalten ihren Start-Proxy;
um den Standort zu wechseln, muss eine neue HTTP-Sitzung erstellt werden.

`humanize` kann das humanisierte Eingabeverhalten für diese Sitzung aktivieren oder deaktivieren,
ohne andere Sitzungen zu beeinflussen. `humanPreset` kann für diese Sitzung zwischen `default` oder `careful`
für diese Sitzung auswählen, aktiviert das humanisierte Verhalten jedoch nicht von selbst. Bestehende
Sitzungen behalten das während `initialize` erfasste Verhalten bei.

`headless` kann den Headless-Browsermodus für diese Sitzung aktivieren oder deaktivieren. Im Docker-Image startet `headless` mit dem Wert `false` bei Bedarf eine containerinterne virtuelle Anzeige. Außerhalb des Images benötigt eine Sitzung mit grafischer Oberfläche weiterhin eine nutzbare Anzeigeumgebung.

`extensionMode` und `profileDirName` überschreiben `PLAYWRIGHT_MCP_EXTENSION` und `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` für diese Sitzung. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` wird niemals aus Metadaten angenommen.

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

Für die Wiederverwendung einer Anmeldung und die Einrichtung von Erweiterungen siehe [Persistentes Anmeldeprofil](recipes/persistent-login-profile.md) und [Chrome-Erweiterung laden](recipes/load-chrome-extension.md).

## Optionen für den Upstream

Die Bridge leitet die Einstellungen von `PLAYWRIGHT_MCP_*` an den vorgelagerten Playwright MCP weiter. Dazu gehören auch vorgelagerte Optionen wie:

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

Die vollständige Übersicht über die Optionen des Upstream-Projekts finden Sie in der Playwright-MCP-Dokumentation des Upstream-Projekts.

`PLAYWRIGHT_MCP_CAPS=devtools` wird an den Upstream-Kindprozess vererbt und
aktiviert die von dieser Fähigkeit gesteuerten Tools ohne bridge-eigene
Option `--caps`.

## Protokollierung

Im „Streamable HTTP“-Modus werden für Menschen lesbare Start- und Anforderungsprotokolle an stdout ausgegeben. Im „Stdio“-Modus werden keine routinemäßigen Betriebsprotokolle ausgegeben, sodass die stdout-Ausgabe von MCP JSON-RPC protokollkonform bleibt. Schwerwiegende Fehler beim Start der Befehlszeilenschnittstelle werden weiterhin an stderr ausgegeben.

## HTTPS { #https }

Streamable HTTP verwendet standardmäßig lokales HTTP. Wählen Sie „Direct TLS“ mit `--http-protocol https` oder `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` aus und geben Sie anschließend entweder ein Zertifikat/Schlüsselpaar oder eine PFX-Datei an:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Für den externen Zugriff oder den Zugriff außerhalb des Loopback-Modus verwenden Sie HTTPS in Kombination mit `--http-auth-token` oder lassen Sie TLS an einem vertrauenswürdigen Reverse-Proxy enden, der ebenfalls Authentifizierung und Netzwerkzugriffskontrollen durchführt.

## Streamfähige HTTP-Sitzungen

Jede Streamable-HTTP-MCP-Sitzung hat eine eigene Bridge-Laufzeitumgebung und einen eigenen Upstream-Playwright-MCP-Kindprozess. HTTP-Sitzungen verwenden standardmäßig isolierte Browserprofile, sofern kein persistentes Profil konfiguriert ist. Ein explizites persistentes Profil wird gesperrt; parallele Sitzungen benötigen unterschiedliche Profilverzeichnisse. Das integrierte Backend `memory` speichert nur Metadaten: Sitzungs-ID, Zeitstempel, Ablaufzeit und Status. Der Browserzustand verbleibt im aktiven Upstream-Kindprozess, und Artefakte werden durch `PLAYWRIGHT_MCP_OUTPUT_DIR` verwaltet.

Für die horizontale Skalierung sollten Sie mehrere Server-Replikate hinter einem Load Balancer betreiben, wobei die Sticky-Sessions über den Header `mcp-session-id` zugeordnet werden. Zukünftige Redis-, Postgres- oder SQLite-Backends können Metadaten und Sperren koordinieren, sind jedoch nicht in der Lage, eine aktive Browsersitzung wiederherzustellen, nachdem der Prozess, dem sie gehört, beendet wurde.

## Streamfähige HTTP-Probes

Wenn die Brücke mit `--transport streamable-http` betrieben wird, stellt sie feste Probe-Endpunkte auf demselben Host und Port wie der MCP-Endpunkt bereit:

- `GET /healthz` gibt Metadaten zum Prozesszustand zurück: `status`, `version`, `transport` und `uptimeMs`.
- `GET /readyz` gibt Metadaten zur Betriebsbereitschaft und zur Sitzungskapazität zurück: `sessions.active`, `sessions.pending`, `sessions.max` und `sessions.available`.

Die Bereitschaft gibt HTTP `200` zurück, solange Sitzungskapazität verfügbar ist, und HTTP `503`, wenn `active + pending >= max` ist.
Wenn `--http-auth-token` oder `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` konfiguriert ist, benötigen beide Probes denselben `Authorization: Bearer ...`-Header wie MCP-Anfragen. Ohne Authentifizierungstoken sind die Probes auf der konfigurierten HTTP-Bind-Adresse offen.

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
