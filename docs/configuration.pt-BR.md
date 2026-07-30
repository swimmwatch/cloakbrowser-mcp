---
description: Configuração de tempo de execução para a ponte Playwright MCP, incluindo sessões Streamable HTTP, perfis persistentes, opções de contexto validadas, caminhos de extensões, correspondência de proxy por GeoIP e entrada humanizada.
icon: material/tune
tags:
  - Configuration
  - User Guide
---

# Configuração

Utilize as variáveis `PLAYWRIGHT_MCP_*` do upstream para o comportamento do MCP do Playwright. Use `CLOAK_PLAYWRIGHT_MCP_*` apenas para o comportamento da ponte específico do Cloak.

As antigas variáveis `CLOAKBROWSER_MCP_*` não são mais suportadas.
A [Referência da CLI](generated/cli.md) gerada é a lista oficial dos sinalizadores da CLI da ponte e suas variáveis de ambiente correspondentes.

## Opções de ponte

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
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Canal de lançamento do binário do CloakBrowser: `stable` ou `preview`, disponível apenas no Pro. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` uses the CloakBrowser binary. `playwright` skips Cloak-specific executable replacement. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Runs Chromium in headless mode. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Artifact directory for npm. Docker sets `/data`. |
| `PLAYWRIGHT_MCP_OUTPUT_MODE` | `stdout` | Upstream output mode, either `stdout` or `file`. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Default action timeout in milliseconds. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Default navigation timeout in milliseconds. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Browser viewport in `WIDTHxHEIGHT` format. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Diretório de perfil persistente do Chromium. A ponte resolve para um caminho absoluto, cria se estiver ausente, verifica se é gravável e grava no `browser.userDataDir` gerado. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | Objeto JSON com opções de contexto validadas. Os campos compatíveis estão listados abaixo. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | Matriz JSON ou lista separada por vírgulas de diretórios existentes de extensões do Chrome. Requer `PLAYWRIGHT_MCP_USER_DATA_DIR`. Use matrizes JSON para caminhos do Windows ou caminhos que contenham vírgulas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Enables the console message compatibility patch. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adds CloakBrowser default stealth launch arguments. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Comma-separated or JSON array of extra Chromium arguments. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adds `--no-sandbox` and disables Chromium sandboxing. |

## Licença do CloakBrowser e login com GitHub

A configuração da licença usa a CLI original do CloakBrowser;
`cloakbrowser-mcp` não adiciona comandos de login ou logout:

```bash
npx -y cloakbrowser@latest login
npx -y cloakbrowser@latest info
npx -y cloakbrowser@latest logout
```

`login` aceita uma chave paga ou inicia o login com GitHub para obter uma chave
do nível gratuito. A chave validada é armazenada em
`~/.cloakbrowser/license.key`; `logout` remove esse arquivo. `info` informa o
nível de licença ativo e, para licenças Pro, a quantidade de sessões ativas.

Como alternativa, defina `CLOAKBROWSER_LICENSE_KEY` no ambiente do servidor
MCP. A ponte encaminha essa variável ao processo filho upstream/do navegador
sem registrá-la em logs. Quando `CLOAKBROWSER_CACHE_DIR` aponta para um cache
personalizado que contém `license.key`, o CloakBrowser resolve a chave e a
ponte encaminha apenas essa chave resolvida a partir do ambiente gerado do
navegador. Outras entradas de ambiente geradas não são copiadas.

## Canal de lançamento do CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` seleciona o canal de lançamento do binário do CloakBrowser. O padrão é `stable`. `preview` solicita uma versão de prévia do navegador Pro e está disponível apenas com uma licença Pro. Uma versão fixada explicitamente em `CLOAKBROWSER_VERSION` tem precedência. Se o Preview não estiver disponível para a plataforma, o CloakBrowser volta para Stable.

O canal de lançamento é selecionado quando o processo da ponte é iniciado. Ele se aplica a todas as sessões de Streamable HTTP e não pode ser definido nem substituído nos metadados de initialize. Reinicie a ponte para alterá-lo.

## Correspondência de proxy GeoIP

Defina `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` com
`PLAYWRIGHT_MCP_PROXY_SERVER` para derivar os sinalizadores de fuso horário,
idioma e localidade do CloakBrowser a partir da localização de saída do proxy.
O CloakBrowser seleciona a autenticação nativa incorporada à URL para binários
compatíveis e mantém o objeto de proxy do Playwright como fallback para
binários antigos.

Consulte [Correspondência de proxy GeoIP](geoip-proxy-matching.md) para exemplos de configuração, metadados de proxy HTTP
transmissíveis em tempo de execução, casos de uso, regras de precedência e limitações.

## Comportamento humanizado de entrada

Defina `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` para ativar a camada de interação com o mouse,
teclado e rolagem do CloakBrowser, que simula o comportamento humano, para interações com a página. A ponte aplica isso
por meio do gancho de inicialização de página do Playwright MCP, de modo que os esquemas das ferramentas de navegador
originais permanecem inalterados.

Consulte [Comportamento de Entrada Humanizado](humanized-input-behavior.md) para exemplos de configuração,
metadados HTTP do Streamable em tempo de execução, casos de uso e limitações.

## Extensões do Chrome

Extensões do Chrome são carregadas quando o navegador inicia, então configure-as
antes de iniciar a ponte ou antes de criar uma sessão Streamable HTTP. As
extensões devem ser diretórios descompactados e exigem um perfil persistente:

```bash
PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/default" \
  CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS='["/absolute/path/to/my-extension"]' \
  npx -y cloakbrowser-mcp@latest
```

Para Streamable HTTP, passe os diretórios do perfil e da extensão nos metadados
de `initialize`:

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

Reinicie a ponte ou crie uma nova sessão HTTP depois de alterar arquivos ou
caminhos de extensões. Use uma matriz JSON para
`CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` quando os caminhos contiverem vírgulas,
ao passar várias extensões ou ao usar caminhos do Windows com letras de unidade.

## Metadados de tempo de execução HTTP transmitíveis

Os clientes HTTP compatíveis com stream podem selecionar opções de tempo de execução específicas para cada sessão MCP, adicionando
metadados específicos da ponte à solicitação `initialize`:

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

`proxyServer` substitui `PLAYWRIGHT_MCP_PROXY_SERVER` para essa sessão HTTP.
`proxyBypass` substitui `PLAYWRIGHT_MCP_PROXY_BYPASS` somente quando `proxyServer` estiver
presente. `geoipProxyMatch` pode ativar ou desativar a correspondência por GeoIP para essa sessão
sem reiniciar o servidor MCP. As sessões existentes mantêm seu proxy de inicialização;
crie uma nova sessão HTTP para alterar a localização.

`humanize` pode ativar ou desativar o comportamento de entrada humanizado para essa sessão
sem alterar outras sessões. `humanPreset` pode selecionar `default` ou `careful`
para essa sessão, mas não habilita o comportamento humanizado por si só. As
sessões existentes mantêm o comportamento capturado durante `initialize`.

`headless` pode ativar ou desativar o modo de navegador sem interface gráfica para essa sessão. Configurar
`headless` para `false` requer um ambiente de exibição funcional, especialmente em
implantações no Docker ou em servidores Linux.

`userDataDir` habilita um perfil persistente do Chromium para essa sessão e
substitui `PLAYWRIGHT_MCP_USER_DATA_DIR`. A ponte resolve o diretório como um
caminho absoluto nativo da plataforma, cria se estiver ausente, verifica se é
gravável e grava no `browser.userDataDir` gerado. Um perfil persistente
desabilita o perfil isolado padrão do Streamable HTTP para essa sessão. A ponte
rejeita diretórios de perfil ativos duplicados dentro de um mesmo processo;
conflitos de perfil entre processos continuam sendo erros do Chromium/Playwright.

`contextOptions` são validadas e mescladas superficialmente sobre
`CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS`; objetos aninhados substituem valores
inteiros. Os campos compatíveis são `userAgent`, `viewport`, `locale`,
`timezoneId`, `colorScheme`, `permissions`, `geolocation`, `extraHTTPHeaders`,
`httpCredentials`, `ignoreHTTPSErrors`, `offline`, `deviceScaleFactor`,
`isMobile` e `hasTouch`. A passagem arbitrária de `BrowserContextOptions` não é
compatível nesta versão.

`extensionPaths` devem apontar para diretórios existentes e exigem um
`userDataDir` persistente. A ponte resolve os caminhos das extensões como
caminhos absolutos nativos da plataforma, passa-os para o CloakBrowser e grava
os argumentos Chromium gerados `--load-extension` e
`--disable-extensions-except` na configuração gerada do Playwright MCP.

As credenciais autenticadas do proxy HTTP podem ser incorporadas em `proxyServer`, por
exemplo `http://user:pass@proxy.example:8080`. Codifique em formato percentual os caracteres de credenciais
que tenham significado em URLs, como `@`, `:`, `/`, `?`, `#`, e `%`.

Nos binários compatíveis do CloakBrowser, proxies HTTP autenticados usam
autenticação nativa incorporada à URL, e a ponte remove o objeto de proxy
duplicado do Playwright. Binários antigos mantêm o objeto de proxy do Playwright
como fallback de compatibilidade.

Para padrões de controle de qualidade (QA) em múltiplas localizações, consulte [Correspondência de proxy GeoIP](geoip-proxy-matching.md).
Para padrões de realismo de interação, consulte [Comportamento de Entrada Humanizado](humanized-input-behavior.md).

## Opções de upstream

A ponte encaminha as configurações de `PLAYWRIGHT_MCP_*` para o Playwright MCP a montante. Isso inclui opções a montante, tais como:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_CAPS`
- `PLAYWRIGHT_MCP_CONSOLE_LEVEL`
- `PLAYWRIGHT_MCP_IMAGE_RESPONSES`
- `PLAYWRIGHT_MCP_SNAPSHOT_MODE`
- `PLAYWRIGHT_MCP_STORAGE_STATE`

Consulte a documentação do Playwright MCP do projeto original para conhecer todas as opções disponíveis.

## Registro

O modo HTTP streamable grava logs de inicialização e de solicitações legíveis por humanos no stdout. O modo stdio não emite logs operacionais de rotina, de modo que o stdout do MCP JSON-RPC permanece livre de detalhes do protocolo. Falhas fatais na inicialização da CLI continuam sendo gravadas no stderr.

## HTTPS

O Streamable HTTP usa HTTP local por padrão. Selecione TLS direto com `--http-protocol https` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` e, em seguida, forneça um par de certificado/chave ou um arquivo PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Para exposição externa ou sem loopback, utilize HTTPS junto com `--http-auth-token`, ou termine a conexão TLS em um proxy reverso confiável que também imponha autenticação e controles de acesso à rede.

## Sessões HTTP transmitíveis

Cada sessão do Streamable HTTP MCP possui seu próprio ambiente de execução de ponte e um processo filho do Playwright MCP a montante. As sessões HTTP executam o Playwright MCP a montante com um perfil de navegador isolado, de modo que usuários simultâneos não disputem o mesmo perfil persistente do Chromium. O backend de sessão integrado `memory` armazena apenas metadados, como ID da sessão, carimbos de data/hora, validade e status. O estado do navegador permanece no processo filho ativo a montante, e os artefatos continuam sendo controlados pelo `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Para escalonamento horizontal, execute várias réplicas de servidor atrás de um balanceador de carga com sessões fixas identificadas pelo cabeçalho `mcp-session-id`. Futuros back-ends como Redis, Postgres ou SQLite poderão coordenar metadados e bloqueios, mas não poderão restaurar uma sessão ativa do navegador após o encerramento do processo responsável por ela.

## Sondas HTTP com transmissão contínua

Quando a ponte opera com `--transport streamable-http`, ela expõe pontos de extremidade de sonda fixos no mesmo host e na mesma porta que o ponto de extremidade do MCP:

- `GET /healthz` retorna metadados sobre o estado do processo: `status`, `version`, `transport` e `uptimeMs`.
- `GET /readyz` retorna metadados de prontidão e capacidade de sessão: `sessions.active`, `sessions.pending`, `sessions.max` e `sessions.available`.

A disponibilidade retorna HTTP `200` enquanto houver capacidade de sessão disponível e HTTP `503` quando `active + pending >= max`.
Se `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` estiverem configurados, ambas as sondas exigem o mesmo cabeçalho `Authorization: Bearer ...` que as solicitações MCP. Sem um token de autenticação, as sondas ficam abertas no endereço de ligação HTTP configurado.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
