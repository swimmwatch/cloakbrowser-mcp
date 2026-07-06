---
description: Instale e execute o CloakBrowser MCP a partir do npm ou do Docker.
icon: material/rocket-launch
tags:
  - User Guide
---

# Introdução

Use o pacote npm publicado ou a imagem do Docker. A instalação a partir do código-fonte só é necessária para fins de desenvolvimento.

Escolha o npm quando o cliente MCP já estiver em execução na sua máquina e o Node.js estiver disponível. Escolha o Docker quando desejar um ambiente de execução padronizável com a imagem base do Playwright MCP (upstream) e o cache do CloakBrowser já configurado dentro do contêiner.

Para uma visão geral rápida das dúvidas mais comuns sobre configuração, consulte o [FAQ](faq.md).

## npm

```bash
npx -y cloakbrowser-mcp@latest --help
npx -y cloakbrowser-mcp@latest doctor
npx -y cloakbrowser-mcp@latest doctor --json
npx -y cloakbrowser-mcp@latest
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
npx -y cloakbrowser-mcp@latest --transport streamable-http --http-protocol https --https-cert ./cert.pem --https-key ./key.pem
```

Marque uma versão quando a reprodutibilidade for importante:

```bash
npx -y {{ project.npm_pin }}
```

O pacote npm requer o Node.js 22.12 ou uma versão mais recente. O CloakBrowser baixa seu binário do Chromium na primeira vez em que é usado, a menos que ele já esteja armazenado em cache.

Use `doctor` para verificar o ambiente de execução local do Node.js, os metadados do pacote, a resolução da CLI do Playwright MCP (upstream) e os metadados do binário do CloakBrowser antes de conectar um cliente. O comando não inicia a ponte nem baixa um navegador.

O transporte padrão é o stdio. Use `--transport streamable-http` quando seu cliente MCP se conectar a um endpoint HTTP, em vez de iniciar um processo stdio. O endpoint HTTP é, por padrão, `http://127.0.0.1:3000/mcp`, com sondas fixas `GET /healthz` e `GET /readyz` no mesmo host e porta. Use `--http-protocol https` com `--https-cert` e `--https-key` ou `--https-pfx` quando a ponte precisar encerrar o TLS diretamente.
Consulte a [Referência da CLI](generated/cli.md) gerada para obter a lista completa de sinalizadores e as variáveis de ambiente correspondentes.

## Docker

```bash
docker pull swimmwatch/cloakbrowser-mcp:latest
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

O Docker é o ambiente de execução mais reproduzível, pois a imagem é baseada na imagem oficial fixada do Playwright MCP e inclui um cache do navegador CloakBrowser já preparado. As imagens publicadas oferecem suporte a `linux/amd64` e `linux/arm64`.
As mesmas tags também são publicadas em `ghcr.io/swimmwatch/cloakbrowser-mcp`.

Para executar o Streamable HTTP localmente com o Docker, publique a porta no loopback e vincule o servidor dentro do contêiner:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000

curl http://127.0.0.1:3000/healthz
curl http://127.0.0.1:3000/readyz
```

Para acessar diretamente via HTTPS a partir do Docker, monte seus arquivos de certificado e selecione HTTPS:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -v "$PWD/artifacts:/data" \
  -v "$PWD/certs:/certs:ro" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000 \
  --http-protocol https --https-cert /certs/cert.pem --https-key /certs/key.pem
```

O modo HTTP streamable grava a URL do endpoint MCP em escuta e os registros de solicitações na saída padrão (stdout). O modo stdio não emite registros operacionais de rotina, de modo que a saída padrão (stdout) do MCP JSON-RPC permanece livre de dados de protocolo.

Marque uma versão quando a reprodutibilidade for importante:

```bash
docker pull {{ project.docker_image }}
docker run --rm --init -i \
  -v "$PWD/artifacts:/data" \
  {{ project.docker_image }}
```

## Configuração do cliente MCP

A maioria dos clientes locais do MCP funciona melhor com o stdio e o npm:

```bash
npx -y cloakbrowser-mcp@latest
```

Use o Docker quando quiser um ambiente de execução repetível. Mantenha `-i` para que o stdio permaneça conectado e adicione `--init` para que os processos filhos do navegador sejam encerrados corretamente.

Para clientes HTTP do Streamable, inicie o servidor separadamente e configure a URL do cliente como `http://127.0.0.1:3000/mcp` ou `https://127.0.0.1:3000/mcp`. Se `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou `--http-auth-token` estiver definido, envie o mesmo token Bearer para `/mcp`, `/healthz` e `/readyz`.

=== “Codex CLI”

    Registre o servidor stdio local:

    ```bash
    codex mcp add cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Ou conecte o Codex a um servidor HTTP do Streamable que já esteja em execução:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    codex mcp add cloakbrowser --url http://127.0.0.1:3000/mcp
    ```

=== “Claude Code” ===

    Registre o servidor stdio local:

    ```bash
    claude mcp add --transport stdio cloakbrowser -- npx -y cloakbrowser-mcp@latest
    ```

    Ou conecte o Claude Code a um servidor HTTP do Streamable que já esteja em execução:

    ```bash
    npx -y cloakbrowser-mcp@latest --transport streamable-http --http-port 3000
    claude mcp add --transport http cloakbrowser http://127.0.0.1:3000/mcp
    ```

=== “Claude Desktop”

    Adicione o servidor sob `mcpServers` em `claude_desktop_config.json` e, em seguida, reinicie o Claude Desktop:

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

=== “Cursor / Cline”

    Adicione o servidor à configuração JSON do MCP do cliente:

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

=== “VS Code”

    Adicione o servidor ao espaço de trabalho `.vscode/mcp.json` ou ao seu nível de usuário `mcp.json`:

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

=== “Continuar”

    Criar `.continue/mcpServers/cloakbrowser-mcp.yaml`:

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

=== “Windsurf / Cascade”

    No Windsurf, acesse Configurações > Ferramentas > Configurações do Windsurf > Adicionar servidor ou edite `~/.codeium/mcp_config.json`:

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

    Para um servidor HTTP do Streamable que já esteja em execução, use `serverUrl`:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "serverUrl": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== “Goose”

    Adicione uma extensão MCP personalizada e use este comando:

    ```bash
    npx -y cloakbrowser-mcp@latest
    ```

    Use `cloakbrowser` como nome da extensão e stdio como meio de transporte.

=== “Warp” ===

    No Warp, abra Configurações > Agentes > Servidores MCP, selecione Adicionar e, em seguida, cole:

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

    Para um servidor HTTP do Streamable que já esteja em execução, use uma entrada de URL:

    ```json
    {
      "mcpServers": {
        "cloakbrowser": {
          "url": "http://127.0.0.1:3000/mcp"
        }
      }
    }
    ```

=== “Docker”

    Use isso quando seu cliente puder executar um comando local do Docker:

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

## Verificar

Peça ao cliente MCP para listar as ferramentas. Você deverá ver as ferramentas do navegador do Playwright MCP do upstream, além de:

- `cloakbrowser_binary_info`
- `cloakbrowser_bridge_info`

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
