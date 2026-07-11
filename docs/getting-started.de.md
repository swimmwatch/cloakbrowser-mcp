---
description: Installieren und starten Sie CloakBrowser MCP über npm oder Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Erste Schritte

Verwenden Sie das veröffentlichte npm-Paket oder das Docker-Image. Eine Installation aus dem Quellcode ist nur für Entwicklungszwecke erforderlich.

Wählen Sie „npm“, wenn Ihr MCP-Client bereits auf Ihrem Rechner läuft und Node.js verfügbar ist. Wählen Sie „Docker“, wenn Sie eine reproduzierbare Laufzeitumgebung mit dem Upstream-Basisimage von Playwright MCP und dem im Container vorbereiteten CloakBrowser-Cache wünschen.

Einen schnellen Überblick über häufig gestellte Fragen zur Einrichtung finden Sie in den [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Eine Version festhalten, wenn es auf die Reproduzierbarkeit ankommt:

```bash
npx -y {{ project.npm_pin }}
```

Das npm-Paket erfordert Node.js 22.13+ in der 22.x-Reihe oder Node.js 24+. CloakBrowser lädt bei der ersten Verwendung die Chromium-Binärdatei herunter, sofern diese nicht bereits im Cache vorhanden ist.

Verwenden Sie `doctor`, um die lokale Node.js-Laufzeitumgebung, die Paketmetadaten, die Auflösung der Upstream-Playwright-MCP-CLI und die Metadaten der CloakBrowser-Binärdatei zu überprüfen, bevor Sie eine Verbindung zu einem Client herstellen. Der Befehl startet weder die Bridge noch lädt er einen Browser herunter.

Der Standardtransport ist stdio. Verwenden Sie `--transport streamable-http`, wenn Ihr MCP-Client eine Verbindung zu einem HTTP-Endpunkt herstellt, anstatt einen stdio-Prozess zu starten. Der HTTP-Endpunkt ist standardmäßig auf `http://127.0.0.1:3000/mcp` eingestellt, mit festen `GET /healthz` und `GET /readyz`-Probes auf demselben Host und Port. Verwenden Sie `--http-protocol https` zusammen mit `--https-cert` und `--https-key` oder `--https-pfx`, wenn die Bridge TLS direkt beenden soll.
Die vollständige Liste der Flags und die entsprechenden Umgebungsvariablen finden Sie in der generierten [CLI-Referenz](generated/cli.md).

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Docker ist die am besten reproduzierbare Laufzeitumgebung, da das Image auf dem festgelegten offiziellen Playwright-MCP-Image basiert und einen vorbereiteten CloakBrowser-Browser-Cache enthält. Veröffentlichte Images unterstützen `linux/amd64` und `linux/arm64`.
Die gleichen Tags werden auch unter `ghcr.io/swimmwatch/cloakbrowser-mcp` veröffentlicht.

Für lokales Streamable-HTTP mit Docker müssen Sie den Port auf dem Loopback veröffentlichen und den Server innerhalb des Containers binden:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Um HTTPS direkt aus Docker heraus zu nutzen, mounten Sie Ihre Zertifikatsdateien und wählen Sie „HTTPS“ aus:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

Im Streamable-HTTP-Modus werden die URL des empfangenden MCP-Endpunkts und die Anforderungsprotokolle an stdout geschrieben. Im Stdio-Modus werden keine routinemäßigen Betriebsprotokolle ausgegeben, sodass die stdout-Ausgabe von MCP JSON-RPC protokollkonform bleibt.

Eine Version festhalten, wenn es auf die Reproduzierbarkeit ankommt:

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## MCP-Client-Konfiguration

Die meisten lokalen MCP-Clients lassen sich am besten mit stdio und npm nutzen:

```bash
npx -y cloakbrowser-mcp@latest
```

Verwenden Sie Docker, wenn Sie eine reproduzierbare Laufzeitumgebung wünschen. Behalten Sie `-i` bei, damit die Verbindung zu stdio bestehen bleibt, und fügen Sie `--init` hinzu, damit die untergeordneten Browser-Prozesse korrekt beendet werden.

Bei Streamable-HTTP-Clients starten Sie den Server separat und konfigurieren Sie die Client-URL wie folgt: `http://127.0.0.1:3000/mcp` oder `https://127.0.0.1:3000/mcp`. Wenn `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` oder `--http-auth-token` festgelegt ist, sende dasselbe Bearer-Token an `/mcp`, `/healthz` und `/readyz`.

=== „Codex CLI“

    Registrieren Sie den lokalen stdio-Server:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Oder verbinden Sie Codex mit einem bereits laufenden Streamable-HTTP-Server:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== „Claude Code“

    Registrieren Sie den lokalen stdio-Server:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Oder verbinden Sie Claude Code mit einem bereits laufenden Streamable-HTTP-Server:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== „Claude Desktop“

    Fügen Sie den Server unter `mcpServers` in `claude_desktop_config.json` hinzu und starten Sie anschließend Claude Desktop neu:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== „Cursor / Cline“

    Fügen Sie den Server zur MCP-JSON-Konfiguration des Clients hinzu:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== „VS Code“

    Fügen Sie den Server zum Arbeitsbereich `.vscode/mcp.json` oder auf Ihrer Benutzerebene `mcp.json` hinzu:

    ```json
    {
      "servers": {
        "cloakbrowser": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

=== „Weiter“

    `.continue/mcpServers/cloakbrowser-mcp.yaml` erstellen:

    ```yaml
    name: CloakBrowser MCP
    version: 0.0.1
    schema: v1
    mcpServers:
      - name: CloakBrowser
        type: stdio
        command: npx
        args:
          - -y
          - cloakbrowser-mcp@latest
    ```

=== „Windsurfen / Kaskade“

    Öffnen Sie in Windsurf „Einstellungen“ > „Extras“ > „Windsurf-Einstellungen“ > „Server hinzufügen“ oder bearbeiten Sie `~/.codeium/mcp_config.json`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Verwenden Sie für einen bereits laufenden Streamable-HTTP-Server `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== „Goose“

    Fügen Sie eine benutzerdefinierte MCP-Erweiterung hinzu und verwenden Sie diesen Befehl:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Verwenden Sie `cloakbrowser` als Erweiterungsnamen und „stdio“ als Transport.

=== „Warp“ ===

    Öffne in Warp „Einstellungen“ > „Agenten“ > „MCP-Server“, wähle „Hinzufügen“ und füge dann Folgendes ein:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "npx",
          "args": ["-y", "cloakbrowser-mcp@latest"]
        }
      }
    }
    ```

    Bei einem bereits laufenden Streamable-HTTP-Server verwenden Sie einen URL-Eintrag:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== „Docker“

    Verwenden Sie dies, wenn Ihr Client einen lokalen Docker-Befehl ausführen kann:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "command": "docker",
          "args": [
            "run",
            "--rm",
            "--init",
            "-i",
            "-v",
            "/tmp/cloakbrowser-artifacts:/data",
            "swimmwatch/cloakbrowser-mcp:latest"
          ]
        }
      }
    }
    ```

## Überprüfen

Bitten Sie den MCP-Client, die Tools aufzulisten. Sie sollten die Browser-Tools von Playwright MCP aus dem Upstream sowie folgende Tools sehen:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Weitere praktische Pfade

Für die Entscheidung zwischen upstream Playwright MCP und diesem Paket nutzen Sie den [Vergleich](comparison.md). Für kurze Aufgaben nutzen Sie die [Rezepte](recipes/index.md): persistentes Profil, Erweiterungen, reverse proxy, regionale QA, Claude Desktop, Codex CLI und CI-Smoke-Test.
