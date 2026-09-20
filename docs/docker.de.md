---
description: Führe das CloakBrowser-MCP-Docker-Image für reproduzierbare Playwright-MCP-Browserautomatisierung mit persistenten /data-Profilen, Erweiterungs-Mounts und CloakBrowser aus.
icon: fontawesome/brands/docker
tags:
  - Docker
  - User Guide
---

# Docker

Das veröffentlichte Bild zeigt die empfohlene Laufzeit für eine wiederholbare Nutzung von MCP.

## Ausführen

```bash
docker run --rm -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Artefakte werden im Container unter `/data` gespeichert. Mounten Sie diesen Pfad, um Screenshots, Snapshots, Downloads und Netzwerkausgaben zu speichern.

Das Image führt Tini bereits als PID 1 und Subreaper aus, daher benötigen normale Befehle keinen zusätzlichen Docker-init-Prozess.

## Headed-Sitzungen, Health Check und eingeschränkte Laufzeit

Bei headless: false startet der Container bei Bedarf ein privates Xvfb und behält es bis zum Ende des Containers. Dies ist weder ein sichtbarer Desktop noch ein Dienst für VNC, noVNC, RDP, Host-X11 oder Bildschirmaufzeichnung. Playwright-Kontexte, Seiten, Profile und Artefakte sind isoliert, aber nativer X11-Fokus, die Zwischenablage und Bildschirmaufzeichnung sind keine Mandanten-Isolationsgrenzen. Der Docker-Health-Check verwendet einen privaten Unix-Socket, um die Event-Loop der MCP CLI und, falls Xvfb gestartet wurde, dessen Verfügbarkeit zu prüfen; er sendet keinen Datenverkehr über MCP-stdio und ersetzt weder /healthz noch /readyz. Bei einem read-only root filesystem müssen Sie /data einhängen und bei möglichen Headed-Sitzungen writable tmpfs für /tmp und /tmp/.X11-unix bereitstellen.

Die gleichen Release-Tags werden auf Docker Hub als `swimmwatch/cloakbrowser-mcp` und auf GHCR als `ghcr.io/swimmwatch/cloakbrowser-mcp`.

## Persistente Profile

Docker aktiviert standardmäßig kein persistentes Browserprofil. Verwenden Sie das
vorhandene Volume `/data` als Persistenzwurzel, wenn Cookies, lokaler Speicher,
Cache oder Erweiterungsstatus Container-Neustarts überdauern sollen:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Umgebungsvariablen innerhalb von Docker müssen Containerpfade wie
`/data/profiles/default` verwenden, keine Hostpfade. Die Bridge erstellt das
Profilverzeichnis bei Bedarf, prüft die Schreibbarkeit, schreibt den
Containerpfad in die generierte Playwright-MCP-Konfiguration und weist doppelte
aktive Profilverzeichnisse innerhalb eines Serverprozesses zurück.

## CloakBrowser-Lizenzcache

Das Image speichert CloakBrowser-Binärdateien, Lizenzstatus und
Validierungscache unter `/home/node/.cloakbrowser`. Mounten Sie dort ein
benanntes Volume, um eine kostenlose GitHub- oder Pro-Anmeldung beim Ersetzen
des Containers beizubehalten:

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

Verwenden Sie dasselbe Volume mit dem vorgelagerten Befehl `info` oder
`logout`, um die gespeicherte Anmeldung zu prüfen oder zu entfernen.
Alternativ können Sie `CLOAKBROWSER_LICENSE_KEY` über die
Secret-Verwaltung des Containers einspeisen. Legen Sie Lizenzschlüssel nicht in
Image-Layern, versionierten Compose-Dateien oder als Buildnachweis erfassten
Befehlsausgaben ab.

## Chrome-Erweiterungen

Chrome-Erweiterungen erfordern ein persistentes Profil und müssen separat
gemountet werden. Verwenden Sie Containerpfade in Umgebungsvariablen, keine
Hostpfade. Der Erweiterungs-Mount kann schreibgeschützt sein:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_USER_DATA_DIR=/data/profiles/default \
  -e CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS=/extensions/my-extension \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/extensions/my-extension:/extensions/my-extension:ro" \
  swimmwatch/cloakbrowser-mcp:latest
```

Verwenden Sie ein JSON-Array für `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`, wenn ein
Pfad Kommas enthält oder wenn mehrere Erweiterungsverzeichnisse übergeben
werden. Starten Sie den Container neu, nachdem Sie Erweiterungsdateien oder
Erweiterungspfade geändert haben.

## Streamable HTTP

Für die lokale Nutzung von Streamable HTTP veröffentlichen Sie den Container-Port über Loopback:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Für einen direkten HTTPS-Zugriff aus dem Container heraus mounten Sie Ihre Zertifikatsdateien und wählen Sie „HTTPS“ aus:

```bash
docker run --rm -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Die hostseitige Bindung `127.0.0.1:3000` sorgt dafür, dass der Endpunkt lokal bleibt. Wenn Sie Streamable HTTP über eine Nicht-Loopback-Schnittstelle veröffentlichen, verwenden Sie HTTPS mit Authentifizierung oder stellen Sie den Server hinter einem vertrauenswürdigen Reverse-Proxy mit TLS-Terminierung, Authentifizierung und Netzwerkkontrollen bereit.
Streamable HTTP stellt feste `GET /healthz` und `GET /readyz`-Probes auf demselben Host und Port. Wenn `--http-auth-token` oder `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` konfiguriert sind, benötigen die Probes denselben `Authorization: Bearer ...`-Header wie MCP-Anfragen.
Alle HTTP-Transportflags und Umgebungsvariablen finden Sie in der generierten [CLI-Referenz](generated/cli.md).

## Verwaltete CDP { #managed-cdp }

Veröffentlichen Sie den konfigurierten Managed-CDP-Bereich eins zu eins. Dieses stdio-Beispiel aktiviert eins
Sitzung und hält jeden Host-Port an die Loopback-Adresse gebunden:

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

`--cdp-host 0.0.0.0` wird für Docker-Portweiterleitung benötigt, daher die explizite
`--cdp-allow-remote` Opt-in und konkretes `--cdp-advertised-host` sind ebenfalls erforderlich.
Weisen Sie den Bereich nicht auf andere Host-Portnummern um: Discovery-URLs enthalten die
Geleaster Port und jeder veröffentlichte Port müssen eins-zu-eins zu ihrer eigenen Sitzung geleitet werden.

Für Multi-Session Streamable HTTP konfigurieren und veröffentlichen Sie den Pool, ohne das Setzen des
Standardverfahren, falls Kunden sich individuell anmelden sollen:

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

Eine authentifizierte `initialize`-Anfrage mit `cdpEnabled: true`-Leasing mietet eine veröffentlichte
Port. Ein ausgelassener Wert übernimmt den Standard des Prozesses, während `cdpEnabled: false`
weist ausdrücklich ab und verbraucht keinen CDP-Port. Poolerschöpfung lehnt nur einen neuen ab
CDP-aktivierte Sitzung; sie verringert nicht die Kapazität für deaktivierte Sitzungen.

Lesen Sie den fähigkeitsführenden URL von `cloakbrowser_bridge_info`. Legen Sie ihn nicht hinein
Container-Protokolle oder Gesundheitsprüfungen. Verbinden Sie sich mit einem CDP API wie
`chromium.connectOverCDP()`; der URL ist nicht kompatibel mit Playwright
`chromium.connect()` oder der aktuelle Open WebUI-Fluss.

`--cdp-advertised-scheme https` ändert veröffentlichte URLs zu `https`/`wss`, aber die
Die Brücke stellt TLS für verwaltete CDP nicht bereit. Verwenden Sie einen vom Betreiber betriebenen TLS-Abschluss, der
belegt denselben beworbenen Port im externen Netzwerknamensraum, bewahrt
`Host`/`Origin` und leitet eins zu eins an den Klartext-Bridge-Listener weiter. Der
bridge-to-Chromium Hop bleibt auch Klartext-Loopback-Verkehr.

## GeoIP-Proxy-Abgleich

Docker verwendet dieselben Proxy- und GeoIP-Umgebungsvariablen wie npm. Aktivieren Sie
die GeoIP-Proxy-Zuordnung, wenn die regionale Qualitätssicherung die Zeitzonen-, Sprach- und
Lokalisierungs-Fingerabdrücke von CloakBrowser benötigt, um dem konfigurierten Proxy-Standort zu folgen:

```bash
docker run --rm -i \
  -e PLAYWRIGHT_MCP_PROXY_SERVER="http://user:pass@proxy.example:8080" \
  -e CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Bei authentifizierten Proxys müssen Sie die Anmeldedaten in die Proxy-URL einbetten und Sonderzeichen
im Benutzernamen oder Passwort prozentkodieren.

Unterstützte CloakBrowser-Binärdateien verwenden die native
Inline-Proxy-Authentifizierung in der URL; ältere Binärdateien greifen auf das
Playwright-Proxyobjekt zurück.

Wenn der Container „Streamable HTTP“ ausführt, können Clients über die Metadaten `initialize` auch unterschiedliche
Proxys pro MCP-Sitzung auswählen. Siehe
[GeoIP-Proxy-Zuordnung](geoip-proxy-matching.md) für Proxy-Metadaten zur Laufzeit,
Anwendungsfälle in mehreren Regionen und Einschränkungen.

## Standardwerte

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

## MCP-Client-Konfiguration

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

## Lokal erstellen

```bash
npm run docker:build
npm run docker:smoke
```

Das Dockerfile verwendet das festgelegte offizielle Playwright-MCP-Image als Laufzeitbasis, wendet während des Builds verfügbare Debian-Sicherheitsupdates an, entfernt die ungenutzte globale npm-Nutzlast aus dem Laufzeit-Image und installiert die Bridge unter `/opt/cloakbrowser-mcp`.

Der Release-Workflow veröffentlicht SBOM- und Herkunftsbescheinigungen, fügt OCI-Labels für Quelle, Revision, Version, Lizenz, Name des Basis-Images und Digest des Basis-Images hinzu und scannt das erstellte Image vor der Veröffentlichung mit Trivy.

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
