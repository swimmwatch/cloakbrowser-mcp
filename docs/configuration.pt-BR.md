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

| Variável | Valor padrão | Descrição |
| --- | --- | --- |
| `CLOAK_PLAYWRIGHT_MCP_TRANSPORT` | `stdio` | Transporte da ponte: `stdio` ou `streamable-http`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL` | `http` | Protocolo do serviço de escuta Streamable HTTP: `http` ou `https`. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_HOST` | `127.0.0.1` | Endereço de vinculação do serviço de escuta Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_PORT` | `3000` | Porta de vinculação do serviço de escuta Streamable HTTP. Use `0` para uma porta efêmera nos testes. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_ENDPOINT` | `/mcp` | Caminho do endpoint Streamable HTTP. `/healthz` e `/readyz` são reservados para verificações de estado. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` | unset | Token Bearer opcional que, quando configurado, é exigido nas solicitações Streamable HTTP. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_BACKEND` | `memory` | Armazenamento de metadados de sessão. Apenas `memory` está implementado nesta versão. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_IDLE_TTL_MS` | `3600000` | Tempo de vida das sessões Streamable HTTP inativas. Sessões expiradas liberam os recursos da sua ponte e encerram o processo filho upstream. |
| `CLOAK_PLAYWRIGHT_MCP_HTTP_SESSION_MAX` | `32` | Número máximo de sessões Streamable HTTP ativas em um processo. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_CERT` | unset | Caminho do certificado TLS no formato PEM para Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_KEY` | unset | Caminho da chave privada TLS no formato PEM para Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PFX` | unset | Caminho do arquivo TLS PFX/PKCS12 para Streamable HTTP via HTTPS. |
| `CLOAK_PLAYWRIGHT_MCP_HTTPS_PASSPHRASE` | unset | Frase secreta para uma chave HTTPS criptografada ou um arquivo PFX. |
| `CLOAK_PLAYWRIGHT_MCP_LOG_LEVEL` | `info` | Nível dos logs operacionais de Streamable HTTP: `trace`, `debug`, `info`, `warn`, `error`, `fatal` ou `silent`. |
| `PLAYWRIGHT_MCP_PROXY_SERVER` | unset | Servidor proxy do Playwright MCP upstream. Usado como origem do GeoIP quando a correspondência está habilitada. |
| `PLAYWRIGHT_MCP_PROXY_BYPASS` | unset | Lista de exceções do proxy upstream para hosts que não devem usar `PLAYWRIGHT_MCP_PROXY_SERVER`. |
| `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH` | `false` | Determina a localização GeoIP de `PLAYWRIGHT_MCP_PROXY_SERVER` e ajusta os parâmetros de fuso horário e configuração regional da impressão digital do CloakBrowser à localização desse proxy. |
| `CLOAK_PLAYWRIGHT_MCP_HUMANIZE` | `false` | Habilita comportamento semelhante ao humano para mouse, teclado e rolagem no CloakBrowser. |
| `CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET` | `default` | Predefinição de comportamento humano do CloakBrowser: `default` ou `careful`. Usada apenas quando a humanização está habilitada. |
| `CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` | `stable` | Canal de lançamento do binário do CloakBrowser: `stable` ou `preview`, disponível apenas no Pro. |
| `CLOAKBROWSER_BINARY_PATH` | unset | Caminho para um executável personalizado do CloakBrowser. A opção CLI `--binary-path` tem precedência. |
| `CLOAKBROWSER_VERSION` | unset | Versão fixada enviada ao resolvedor de cache do CloakBrowser quando nenhum executável personalizado é selecionado. Uma chave válida do plano gratuito ignora a versão fixada; o CloakBrowser pode reutilizar um binário em cache. |
| `PLAYWRIGHT_MCP_BROWSER_ENGINE` | `cloak` | `cloak` usa o executável do CloakBrowser. `playwright` ignora a substituição do executável específica do Cloak. |
| `PLAYWRIGHT_MCP_HEADLESS` | `true` | Executa o Chromium sem interface gráfica. |
| `PLAYWRIGHT_MCP_OUTPUT_DIR` | `.playwright-mcp` | Diretório de artefatos para npm. O Docker define `/data`. |
| `PLAYWRIGHT_MCP_CODEGEN` | `typescript` | Destino da geração de código: `typescript`, `python`, `java`, `csharp` ou `none`. A ponte valida o valor e grava `codegen` na configuração gerada do Playwright MCP. |
| `PLAYWRIGHT_MCP_SNAPSHOT_BOXES` | `false` | `true` ou `false`; inclui a caixa delimitadora de cada elemento como `[box=x,y,width,height]` nos snapshots. A ponte valida o valor e grava `snapshot.boxes` na configuração gerada do Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_SETTLE` | `500` | Espera upstream em milissegundos após uma ação para que o trabalho acionado se estabilize. Encaminhada diretamente ao Playwright MCP. |
| `PLAYWRIGHT_MCP_TIMEOUT_ACTION` | `5000` | Tempo limite padrão para ações, em milissegundos. |
| `PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION` | `60000` | Tempo limite padrão para navegação, em milissegundos. |
| `PLAYWRIGHT_MCP_VIEWPORT_SIZE` | upstream default | Área de visualização do navegador no formato `WIDTHxHEIGHT`. |
| `PLAYWRIGHT_MCP_USER_DATA_DIR` | unset | Diretório de perfil persistente do Chromium. A ponte resolve para um caminho absoluto, cria se estiver ausente, verifica se é gravável e grava no `browser.userDataDir` gerado. |
| `CLOAK_PLAYWRIGHT_MCP_CONTEXT_OPTIONS` | unset | Objeto JSON com opções de contexto validadas. Os campos compatíveis estão listados abaixo. |
| `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS` | unset | Matriz JSON ou lista separada por vírgulas de diretórios existentes de extensões do Chrome. Requer `PLAYWRIGHT_MCP_USER_DATA_DIR`. Use matrizes JSON para caminhos do Windows ou caminhos que contenham vírgulas. |
| `CLOAK_PLAYWRIGHT_MCP_CONSOLE_FALLBACK` | `true` | Habilita o patch de compatibilidade das mensagens do console. |
| `CLOAK_PLAYWRIGHT_MCP_STEALTH_ARGS` | `true` | Adiciona os argumentos de inicialização padrão do CloakBrowser para operação furtiva. |
| `CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` | unset | Argumentos adicionais do Chromium como lista separada por vírgulas ou array JSON. |
| `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX` | `true` | Adiciona `--no-sandbox` e desativa a sandbox do Chromium. |

## Gerenciado CDP { #managed-cdp }

O acesso gerenciado ao Chrome DevTools Protocol (CDP) é uma opção explícita. Ele expõe o
mesma geração de navegador Chromium controlada por MCP através de uma capacidade
descoberta URL. Configurar apenas um conjunto de portas não habilita CDP.

| opção CLI | Variável de ambiente | Padrão | Propósito |
| --- | --- | --- | --- |
| `--cdp-enabled`, `--no-cdp-enabled` | `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED` | `false` | Defina o valor de stdio e o padrão de sessão Streamable HTTP. |
| `--cdp-port-range <port\|start-end>` | `CLOAK_PLAYWRIGHT_MCP_CDP_PORT_RANGE` | não definido | Configure a piscina de portas do proxy externo local do processo. Uma sessão habilitada aloca uma porta. |
| `--cdp-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_HOST` | `127.0.0.1` | Vincule o proxy gerenciado CDP. |
| `--cdp-allow-remote`, `--no-cdp-allow-remote` | `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE` | `false` | Permitir ou negar uma ligação não loopback. |
| `--cdp-advertised-host <host>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_HOST` | não definido | Coloque um host concreto acessível externamente nas URLs de descoberta. Necessário para ligações curinga. |
| `--cdp-advertised-scheme <http\|https>` | `CLOAK_PLAYWRIGHT_MCP_CDP_ADVERTISED_SCHEME` | `http` | Publique os URLs `http`/`ws` ou `https`/`wss`. Isso não habilita o TLS. |

Cada valor CLI substitui apenas sua variável de ambiente correspondente. Em particular,
`--no-cdp-enabled` substitui `CLOAK_PLAYWRIGHT_MCP_CDP_ENABLED=true`, e
`--no-cdp-allow-remote` substitui `CLOAK_PLAYWRIGHT_MCP_CDP_ALLOW_REMOTE=true`.
Uma sessão habilitada sem um pool de portas é rejeitada antes que seu filho a montante comece.
Um valor falso eficaz não cria nenhum ouvinte, aluguel de porta ou capacidade.

Para stdio, o valor do processo se aplica diretamente:

```bash
cloakbrowser-mcp \
  --cdp-enabled \
  --cdp-port-range 9222
```

Para Streamable HTTP, o booleano plano `cdpEnabled` no autenticado
Os metadados `initialize` substituem o padrão do processo para essa sessão. Omitindo o
o campo herda o valor do processo. Esses exemplos optam explicitamente por uma sessão e
outro para fora:

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

Uma sessão habilitada para CDP HTTP possui um aluguel de porta externa. Sessões desabilitadas não possuem
consome a piscina. A alocação é local ao processo, seleciona o candidato não alugado mais baixo,
e falha nessa sessão imediatamente se a porta externa selecionada já estiver ocupada.
Feche sessões para liberar portas ou configure uma faixa maior quando o pool estiver esgotado.

Recupere o URL atual de `cloakbrowser_bridge_info`, então passe seu
`structuredContent.cdp.discoveryUrl` para um cliente CDP como o de Playwright
`chromium.connectOverCDP()`. Trate aquele URL como uma credencial: ele inclui um aleatório
capacidade por geração e se torna obsoleta após a substituição do navegador. CDP gerenciado é
não é um endpoint de servidor Playwright. `chromium.connect()` e o atual Open WebUI
O fluxo `PLAYWRIGHT_WS_URL` não é suportado.

`--cdp-advertised-scheme https` publica `https` descoberta e `wss` WebSocket URLs
somente. A ponte não fornece TLS para CDP gerenciado: seu ouvinte externo e
Chromium hop permanece em texto simples HTTP/WebSocket. Um terminador TLS de propriedade do operador deve
ouvir na mesma porta locada anunciada, preservar os `Host` e `Origin` anunciados
autoridade, e encaminhar um a um para o ouvinte de texto simples daquela sessão.

A ativação do CDP começa Chromium durante a inicialização do MCP para que a propriedade e o externo
a prontidão pode ser verificada. Configure o tempo limite de inicialização do cliente MCP para pelo menos 60
segundos. Quando o CDP gerenciado está ativado, fornecido pelo usuário
`CLOAK_PLAYWRIGHT_MCP_EXTRA_ARGS` não deve conter `--remote-debugging-port`,
`--remote-debugging-address`, ou `--remote-debugging-pipe` (incluindo as formas `=`).
O próprio Playwright interno do `--remote-debugging-pipe` permanece ativado junto com o
endpoint TCP de loopback gerenciado por bridge.

Veja [Ferramentas](tools.md#cloakbrowser_bridge_info), [Docker](docker.md#managed-cdp),
[Segurança](security.md#managed-cdp-security), e
[Arquitetura](architecture.md#managed-cdp-ownership) para estado de descoberta, implantação,
limites e comportamento de reinício.

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

Se o CloakBrowser rejeitar a chave de licença fornecida ou não puder validá-la pelo servidor de licenças nem pela validação em cache, a inicialização falha com o erro explícito do CloakBrowser. A ponte preserva esse erro: não o oculta nem muda silenciosamente para outro navegador ou nível de licença.

O CloakBrowser pode reutilizar a validação em cache quando o servidor de licenças estiver indisponível. Isso não garante uma inicialização offline: o download do binário ou a inicialização do navegador ainda podem falhar.

## Canal de lançamento do CloakBrowser

`CLOAK_PLAYWRIGHT_MCP_RELEASE_CHANNEL` seleciona o canal de lançamento do binário do CloakBrowser. O padrão é `stable`. `preview` solicita uma build de prévia do navegador Pro e só está disponível com licença Pro. Uma versão explicitamente fixada por `CLOAKBROWSER_VERSION` tem prioridade em downloads sem chave ou com chave paga. Uma chave válida do plano gratuito ignora a versão fixada e pode reutilizar um binário em cache. Se Preview não estiver disponível para a plataforma, o CloakBrowser retorna ao Stable.

O canal de lançamento é selecionado quando o processo da ponte é iniciado. Ele se aplica a todas as sessões de Streamable HTTP e não pode ser definido nem substituído nos metadados de initialize. Reinicie a ponte para alterá-lo.

## Binário personalizado do CloakBrowser

`--binary-path <path>` seleciona um executável personalizado do CloakBrowser para
o processo atual da ponte. `CLOAKBROWSER_BINARY_PATH` fornece a mesma configuração
para implantações baseadas em ambiente; a opção da CLI tem precedência. A ponte
resolve o caminho, exige um arquivo regular legível e o escreve em
`browser.launchOptions.executablePath` da configuração gerada do Playwright MCP.

```bash
npx -y cloakbrowser-mcp@latest --binary-path /opt/cloakbrowser/chrome
```

A ponte não baixa nem atualiza um executável personalizado. Sem um caminho
personalizado, `CLOAKBROWSER_VERSION` pode fixar a versão do binário gerenciado pelo
CloakBrowser.

No Streamable HTTP, o binário selecionado pertence ao processo da ponte e é usado
por todas as sessões MCP que ele cria. Os metadados de `initialize` não podem
selecionar nem substituir um caminho executável; execute processos separados para
binários diferentes.

Se a build selecionada fornece `document.modelContext` ou `navigator.modelContext` com o método `getTools()`, o upstream Playwright MCP pode adicionar ferramentas `webmcp_<page-tool>` após um snapshot da página. Ele envia `tools/list_changed`; a ponte encaminha a notificação e a lista atualizada. A página define o nome e o esquema de cada ferramenta dinâmica.

## Correspondência de proxy GeoIP

Defina `CLOAK_PLAYWRIGHT_MCP_GEOIP_PROXY_MATCH=true` com
`PLAYWRIGHT_MCP_PROXY_SERVER` para derivar os sinalizadores de fuso horário,
idioma e localidade do CloakBrowser a partir da localização de saída do proxy.
O CloakBrowser seleciona a autenticação nativa incorporada à URL para binários
compatíveis e mantém o objeto de proxy do Playwright como fallback para
binários antigos.

Consulte [Correspondência de proxy GeoIP](geoip-proxy-matching.md) para exemplos de configuração, metadados de proxy HTTP
transmissíveis em tempo de execução, casos de uso, regras de precedência e limitações.

Para um procedimento breve, consulte [QA regional por proxy](recipes/regional-qa-through-proxy.md).

## Comportamento humanizado de entrada

Defina `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true` para ativar a camada de interação com o mouse,
teclado e rolagem do CloakBrowser, que simula o comportamento humano, para interações com a página. A ponte aplica isso
por meio do gancho de inicialização de página do Playwright MCP, de modo que os esquemas das ferramentas de navegador
originais permanecem inalterados.

Consulte [Comportamento de Entrada Humanizado](humanized-input-behavior.md) para exemplos de configuração,
metadados HTTP do Streamable em tempo de execução, casos de uso e limitações.

## Extensões do Chrome { #chrome-extensions }

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

Para uma configuração breve com exemplos prontos para copiar, consulte [Carregar uma extensão do Chrome](recipes/load-chrome-extension.md).

## Modo de conexão Playwright Extension { #playwright-extension-connection-mode }

O modo de conexão por Playwright Extension é separado do carregamento de uma extensão descompactada com `CLOAK_PLAYWRIGHT_MCP_EXTENSION_PATHS`. Ele se conecta pela extensão oficial Playwright Extension já instalada em um perfil do Chrome ou Edge; a ponte não instala essa extensão.

Para stdio, configure o ambiente do processo:

```bash
PLAYWRIGHT_MCP_EXTENSION=true \
  PLAYWRIGHT_MCP_EXTENSION_TOKEN='<secret-from-the-extension>' \
  PLAYWRIGHT_MCP_USER_DATA_DIR="$PWD/.profiles/playwright-extension" \
  PLAYWRIGHT_MCP_PROFILE_DIR_NAME='Profile 1' \
  npx -y cloakbrowser-mcp@latest
```

Para Streamable HTTP, os metadados de initialize `extensionMode` e `profileDirName` substituem os respectivos valores no nível do processo. `userDataDir` também é específico de cada sessão. O token continua sendo aceito somente pelo ambiente do processo:

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

O modo de extensão exige um token não vazio e um perfil persistente. Sessões HTTP de extensão simultâneas devem usar valores diferentes de `userDataDir`. Antes de iniciar o processo filho upstream, a ponte rejeita endpoints CDP gerenciados ou externos, endpoints de navegadores remotos, configurações de inicialização sem interface gráfica ou isolada, opções de proxy e GeoIP, humanização, alteração do contexto, `extensionPaths` descompactadas e opções de inicialização do CloakBrowser fornecidas explicitamente. A verificação de um cenário completo bem-sucedido é manual, porque a extensão oficial Playwright Extension já deve estar instalada no perfil de navegador selecionado.

## Metadados de tempo de execução HTTP transmitíveis { #streamable-http-runtime-metadata }

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

`proxyServer` substitui `PLAYWRIGHT_MCP_PROXY_SERVER` para essa sessão HTTP.
`proxyBypass` substitui `PLAYWRIGHT_MCP_PROXY_BYPASS` somente quando `proxyServer` estiver
presente. `geoipProxyMatch` pode ativar ou desativar a correspondência por GeoIP para essa sessão
sem reiniciar o servidor MCP. As sessões existentes mantêm seu proxy de inicialização;
crie uma nova sessão HTTP para alterar a localização.

`humanize` pode ativar ou desativar o comportamento de entrada humanizado para essa sessão
sem alterar outras sessões. `humanPreset` pode selecionar `default` ou `careful`
para essa sessão, mas não habilita o comportamento humanizado por si só. As
sessões existentes mantêm o comportamento capturado durante `initialize`.

`headless` pode habilitar ou desabilitar o modo do navegador sem interface gráfica para essa sessão. Na imagem Docker, definir `headless` como `false` inicia sob demanda uma tela virtual privada do contêiner. Fora da imagem, uma sessão com interface gráfica ainda exige um ambiente de exibição utilizável.

`extensionMode` e `profileDirName` substituem `PLAYWRIGHT_MCP_EXTENSION` e `PLAYWRIGHT_MCP_PROFILE_DIR_NAME` para essa sessão. `PLAYWRIGHT_MCP_EXTENSION_TOKEN` nunca é aceito nos metadados.

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


Para reutilizar o login e configurar extensões, consulte [Perfil de login persistente](recipes/persistent-login-profile.md) e [Carregar uma extensão do Chrome](recipes/load-chrome-extension.md).

## Opções do Playwright MCP upstream

A ponte encaminha as configurações de `PLAYWRIGHT_MCP_*` para o Playwright MCP a montante. Isso inclui opções a montante, tais como:

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

Consulte a documentação do Playwright MCP do projeto original para conhecer todas as opções disponíveis.

`PLAYWRIGHT_MCP_CAPS=devtools` é herdado pelo processo filho upstream e habilita
as ferramentas controladas por essa capacidade sem uma opção `--caps` própria
da ponte.

## Registro

O modo HTTP streamable grava logs de inicialização e de solicitações legíveis por humanos no stdout. O modo stdio não emite logs operacionais de rotina, de modo que o stdout do MCP JSON-RPC permanece livre de detalhes do protocolo. Falhas fatais na inicialização da CLI continuam sendo gravadas no stderr.

## HTTPS { #https }

O Streamable HTTP usa HTTP local por padrão. Selecione TLS direto com `--http-protocol https` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` e, em seguida, forneça um par de certificado/chave ou um arquivo PFX:

```bash
cloakbrowser-mcp --transport streamable-http \
  --http-protocol https \
  --https-cert ./cert.pem \
  --https-key ./key.pem
```

Para exposição externa ou sem loopback, utilize HTTPS junto com `--http-auth-token`, ou termine a conexão TLS em um proxy reverso confiável que também imponha autenticação e controles de acesso à rede.

## Sessões HTTP transmitíveis

Cada sessão do Streamable HTTP MCP tem seu próprio ambiente de execução da ponte e processo filho upstream do Playwright MCP. Por padrão, as sessões HTTP usam perfis isolados, salvo quando um perfil persistente é configurado. Um perfil persistente explícito é bloqueado; sessões simultâneas precisam de diretórios de perfil diferentes. O backend integrado `memory` armazena apenas metadados: ID da sessão, timestamps, expiração e status. O estado do navegador permanece no processo filho upstream ativo e os artefatos são controlados por `PLAYWRIGHT_MCP_OUTPUT_DIR`.

Para escalonamento horizontal, execute várias réplicas de servidor atrás de um balanceador de carga com sessões fixas identificadas pelo cabeçalho `mcp-session-id`. Futuros back-ends como Redis, Postgres ou SQLite poderão coordenar metadados e bloqueios, mas não poderão restaurar uma sessão ativa do navegador após o encerramento do processo responsável por ela.

## Sondas HTTP com transmissão contínua

Quando a ponte opera com `--transport streamable-http`, ela expõe pontos de extremidade de sonda fixos no mesmo host e na mesma porta que o ponto de extremidade do MCP:

- `GET /healthz` retorna metadados sobre o estado do processo: `status`, `version`, `transport` e `uptimeMs`.
- `GET /readyz` retorna metadados de prontidão e capacidade de sessão: `sessions.active`, `sessions.pending`, `sessions.max` e `sessions.available`.

A disponibilidade retorna HTTP `200` enquanto houver capacidade de sessão disponível e HTTP `503` quando `active + pending >= max`.
Se `--http-auth-token` ou `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` estiverem configurados, ambas as sondas exigem o mesmo cabeçalho `Authorization: Bearer ...` que as solicitações MCP. Sem um token de autenticação, as sondas ficam abertas no endereço de ligação HTTP configurado.

## Mais caminhos práticos

Para escolher entre o Playwright MCP upstream e este pacote, consulte a [comparação](comparison.md). Para tarefas rápidas, use as [receitas](recipes/index.md): perfil persistente, extensões, reverse proxy, QA regional, Claude Desktop, Codex CLI e teste smoke de CI.
