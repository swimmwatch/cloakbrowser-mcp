---
description: npm または Docker から CloakBrowser MCP をインストールして実行してください。
icon: material/rocket-launch
tags:
  - User Guide
---

# はじめに

公開されている npm パッケージまたは Docker イメージを使用してください。ソースからのインストールは、開発時のみ必要です。

お使いのマシンですでにMCPクライアントが動作しており、Node.jsが利用可能な場合は、npmを選択してください。アップストリームのPlaywright MCPベースイメージを使用し、コンテナ内にCloakBrowserのキャッシュが事前に準備された、再現性のある実行環境が必要な場合は、Dockerを選択してください。

設定に関するよくある質問の概要については、[FAQ](faq.md)をご覧ください。

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

再現性が重要な場合は、リリースをピン留めしてください：

```bash
npx -y {{ project.npm_pin }}
```

この npm パッケージには、Node.js 22.12 以降が必要です。CloakBrowser は、Chromium バイナリがすでにキャッシュされていない限り、初回使用時にそれをダウンロードします。

クライアントを接続する前に、`doctor` を使用して、ローカルの Node.js ランタイム、パッケージのメタデータ、上流の Playwright MCP CLI の解決状況、および CloakBrowser バイナリのメタデータを確認します。 このコマンドでは、ブリッジの起動やブラウザのダウンロードは行われません。

デフォルトのトランスポートは stdio です。MCP クライアントが stdio プロセスを起動する代わりに HTTP エンドポイントに接続する場合は、`--transport streamable-http` を使用してください。 HTTPエンドポイントのデフォルトは `http://127.0.0.1:3000/mcp` であり、同じエンドポイント上で `GET /healthz` および `GET /readyz` プローブが同じホストおよびポートで実行されます。`--http-protocol https` を、`--https-cert` および `--https-key` または `--https-pfx` を指定して、ブリッジが TLS を直接終了させるようにします。
完全なフラグ一覧および対応する環境変数については、生成された [CLI リファレンス](generated/cli.md) を参照してください。

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

Dockerは、イメージが固定化された公式のPlaywright MCPイメージに基づいており、あらかじめ準備されたCloakBrowserのブラウザキャッシュが含まれているため、最も再現性の高いランタイムです。 公開されているイメージは、`linux/amd64` および `linux/arm64` をサポートしています。
同じタグは `ghcr.io/swimmwatch/cloakbrowser-mcp` にも公開されています。

Docker を使用したローカルの Streamable HTTP の場合、ポートをループバックに公開し、コンテナ内でサーバーをバインドします：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Dockerから直接HTTPSを利用するには、証明書ファイルをマウントし、「HTTPS」を選択してください：

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

ストリーマブルHTTPモードでは、リスニング中のMCPエンドポイントのURLとリクエストログがstdoutに出力されます。stdioモードでは、通常の運用ログは出力されないため、MCP JSON-RPCのstdoutはプロトコル上クリーンな状態が保たれます。

再現性が重要な場合は、リリースをピン留めしてください：

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## MCP クライアント設定

ほとんどのローカル MCP クライアントは、stdio と npm を使用すると最も快適に動作します：

```bash
npx -y cloakbrowser-mcp@latest
```

再現性のある実行環境が必要な場合は、Docker を使用してください。stdio の接続を維持するために `-i` を保持し、ブラウザの子プロセスが正しく回収されるように `--init`を追加して、ブラウザの子プロセスが正しく回収されるようにしてください。

Streamable HTTP クライアントの場合は、サーバーを別途起動し、クライアントの URL を `http://127.0.0.1:3000/mcp` または `https://127.0.0.1:3000/mcp` のように設定してください。 `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` または `--http-auth-token`が設定されている場合は、同じBearerトークンを`/mcp`、 `/healthz`、および `/readyz` に同じベアラートークンを送信します。

=== 「Codex CLI」

    ローカルの stdio サーバーを登録します：

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    あるいは、Codexをすでに稼働中のStreamable HTTPサーバーに接続することもできます：

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== 「クロード・コード」

    ローカルの stdio サーバーを登録します：

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    あるいは、すでに実行中のStreamable HTTPサーバーにClaude Codeを接続することもできます：

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== 「Claude Desktop」

    `mcpServers` の下にサーバーを追加し、`claude_desktop_config.json` 内で、その後 Claude Desktop を再起動してください：

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

=== 「カーソル／クライン」

    クライアントの MCP JSON 設定にサーバーを追加します：

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

=== 「VS Code」

    サーバーをワークスペース `.vscode/mcp.json` またはユーザーレベルの `mcp.json` にサーバーを追加します:

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

=== 「続行」

    `.continue/mcpServers/cloakbrowser-mcp.yaml` を作成：

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

=== 「ウィンドサーフィン／カスケード」

    Windsurfでは、[設定] > [ツール] > [Windsurf設定] > [サーバーの追加] を開くか、`~/.codeium/mcp_config.json` を編集してください：

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

    すでに実行中のStreamable HTTPサーバーについては、`serverUrl`を使用してください：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== 「グース」

    カスタムMCP拡張機能を追加し、次のコマンドを実行します：

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    拡張子名には `cloakbrowser` を、トランスポートには stdio を使用してください。

=== 「ワープ」

    Warpで、「設定」＞「エージェント」＞「MCPサーバー」を開き、「追加」を選択して、以下を貼り付けてください：

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

    すでに実行中の Streamable HTTP サーバーの場合は、URL を入力してください：

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== 「Docker」

    クライアントがローカルの Docker コマンドを実行できる場合は、以下を使用してください：

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

## 確認

MCPクライアントにツールのリストを表示するよう依頼してください。Playwright MCPの標準ブラウザツールに加え、以下のツールが表示されるはずです：

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## 追加の実用パス

upstream Playwright MCP とこのパッケージのどちらを使うかは[比較](comparison.md)を参照してください。短い作業手順には[レシピ](recipes/index.md)を使います: 永続プロファイル、拡張機能、reverse proxy、リージョン QA、Claude Desktop、Codex CLI、CI スモークテスト。
