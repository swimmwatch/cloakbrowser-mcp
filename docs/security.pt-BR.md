---
description: Orientação sobre o modelo de segurança e riscos de automação do navegador para o CloakBrowser MCP, isolamento do Docker, artefatos, segredos e exposição de rede.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Segurança

Este projeto é uma ponte de automação para navegadores. Considere-o como uma infraestrutura de execução de código confiável.

## Segurança Gerenciada CDP { #managed-cdp-security }

O CDP gerenciado está desativado por padrão. Ele fornece controle arbitrário do Chromium DevTools,
não é uma ferramenta de navegador reduzida API. Ative-a apenas para clientes confiáveis. A capacidade em
`cloakbrowser_bridge_info.cdp.discoveryUrl` é uma credencial de portador: não a registre,
armazená-lo em tickets, ou compartilhá-lo entre sessões. Ele gira após a substituição do navegador
e um velho URL nunca é movido para a geração de substituição.

Um bind CDP não-loopback requer tanto `--cdp-allow-remote` quanto um anunciado concreto
host. Adicione controles de acesso à rede ao redor da porta publicada. Selecionando
`--cdp-advertised-scheme https` não fornece TLS. O ouvinte gerenciado e
Chromium hop permanece em texto simples; um terminador TLS de mesma porta de propriedade do operador deve preservar
a autoridade anunciada `Host` e `Origin` e mantém o roteamento um-para-um para o
sessão de posse.

Os logs de tempo de execução nunca incluem caminhos de capacidade, IDs de destino, cargas CDP, dados do navegador,
cookies, valores crus `Host` ou `Origin`, ou caminhos de perfil. Verificações de segurança rejeitadas são
relatado apenas como um aviso `cdp_security_rejections` com escopo de sessão com 60 segundos
contagens de saturação para `capability`, `host` e `origin`; a limpeza libera qualquer restante
contagens. Verificações bem-sucedidas não criam registros de auditoria por solicitação.

### Limites Fixos

Os limites se aplicam independentemente a cada sessão CDP habilitada para MCP:

| Fronteira | Limite |
| --- | --- |
| Conexões WebSocket ativas e proxy, incluindo handshakes em andamento | 8 |
| Solicitações concorrentes de pré-atualização HTTP | 16 |
| Cabeçalhos da solicitação | 16 KiB |
| Corpo da requisição nas rotas suportadas | Não permitido |
| Resposta em buffer Chromium HTTP | 4 MiB |
| Mensagem WebSocket de entrada ou saída | 16 MiB |
| Dados WebSocket não enviados enfileirados por direção | 16 MiB |
| Cabeçalhos de solicitação, resposta upstream HTTP, ou handshake WebSocket | 10 segundos |
| Encerramento elegante do proxy antes do fechamento forçado | 5 segundos |
| Corpo de resposta de erro local | 8 KiB |

### Erros HTTP

Falhas locais usam JSON `{"error":{"code":"...","message":"..."}}` com
`Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`, e um
exato `Content-Length`. Falhas de método também incluem `Allow`. Os mapeamentos estáveis são:

| Status | Código |
| --- | --- |
| `400` | `bad_request` |
| `403` | `forbidden` |
| `404` | `not_found` |
| `405` | `method_not_allowed` |
| `408` | `request_timeout` |
| `413` | `payload_too_large` |
| `431` | `headers_too_large` |
| `500` | `internal_error` |
| `502` | `bad_gateway` |
| `503` | `unavailable` |
| `504` | `gateway_timeout` |
| Chromium `400..499` | `upstream_error`, preservando o status |

Chromium redirecionamentos, erros de servidor, respostas malformadas e falhas de transporte são
normalizado em vez de expor corpos de resposta Chromium. Uma rejeição gerada por ponte
antes que o despacho a montante tenha nenhum efeito colateral Chromium. Uma solicitação de descoberta somente leitura pode
será tentado novamente após corrigir a condição. Para falhas ambíguas que alteram o estado,
releia `/json/list` e reconcilie o estado do aplicativo; não assuma `Retry-After` ou
idempotência automática.

### WebSocket Fecha

Fechamentos gerados localmente usam pares redigidos fixos. Fechamentos válidos de pares são retransmitidos.

| Código | Razão | Usar |
| --- | --- | --- |
| `1001` | `going_away` | Encerramento de sessão, geração ou proxy |
| `1002` | `protocol_error` | Entrada de protocolo WebSocket malformada |
| `1009` | `message_too_big` | Mensagem excede o limite configurado |
| `1011` | `internal_error` | Desconexão inesperada a montante ou falha de retransmissão |
| `1013` | `try_again_later` | Limite de fila não enviada por direção excedido |

## Limite de confiança

O servidor externo oferece suporte a stdio e Streamable HTTP. Ele inicia o Playwright MCP (upstream) como um processo filho e encaminha as chamadas da ferramenta. A automação do navegador, a saída de arquivos, o acesso à rede e o comportamento de avaliação não segura são controlados pelo Playwright MCP (upstream).

Não exponha o servidor stdio por meio de um wrapper de rede não autenticado. Qualquer cliente capaz de chamar ferramentas pode controlar o navegador, ler dados da página acessíveis ao navegador e solicitar artefatos.

O Streamable HTTP se vincula ao `127.0.0.1` via HTTP por padrão para clientes locais. Se você o vincular ao `0.0.0.0` ou publicá-lo fora do loopback, exigirá `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou autenticação de proxy reverso equivalente, use HTTPS direto com `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` e arquivos TLS ou termine a conexão TLS em uma borda de rede confiável e restrinja o acesso a clientes confiáveis.

## Ferramentas perigosas

O Upstream Playwright MCP inclui ferramentas como `browser_evaluate` e `browser_run_code_unsafe`. Elas podem executar JavaScript no navegador ou no contexto do servidor do Playwright. Conecte este servidor apenas a clientes do MCP em que você confia.

As ferramentas `webmcp_*` são definidas pela página atual. Trate nome, descrição, schema, annotations e output como dados não confiáveis; a ponte os encaminha sem alterações. Use `PLAYWRIGHT_MCP_WEBMCP=false` quando a coleta não for necessária.

## Token do Playwright Extension

Forneça `PLAYWRIGHT_MCP_EXTENSION_TOKEN` somente pelo ambiente do processo ou por um gerenciador de segredos. A ponte não aceita o token em metadata HTTP nem o grava em config, bridge metadata, logs, erros ou diagnostic snapshots. Proteja o persistent profile e não reutilize um `userDataDir` ativo entre sessões.

## Configuração

Utilize opções de nível superior para controles de acesso e medidas de proteção:

- `PLAYWRIGHT_MCP_ALLOWED_ORIGINS`
- `PLAYWRIGHT_MCP_BLOCKED_ORIGINS`
- `PLAYWRIGHT_MCP_ALLOW_UNRESTRICTED_FILE_ACCESS`
- `PLAYWRIGHT_MCP_SECRETS_FILE`

Essas são medidas de segurança de conveniência, não um substituto para o isolamento de processos, contêineres, redes e sistemas de arquivos.

Sempre que possível, utilize listas de permissão para destinos confiáveis. Trate o acesso irrestrito a arquivos e os arquivos de segredos como recursos confidenciais e mantenha-os fora dos perfis compartilhados de clientes MCP.

## Modo Sandbox

A imagem do Docker é configurada por padrão como `CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=true`, pois o sandboxing do navegador frequentemente não está disponível em ambientes de execução de CI e MCP em contêineres. Trata-se de uma escolha de compatibilidade. Se o seu host e o ambiente de execução do contêiner suportarem o sandboxing do Chromium, defina:

```bash
CLOAK_PLAYWRIGHT_MCP_NO_SANDBOX=false
```

Ao executar o programa sem a sandbox do Chromium, use o Docker ou outro mecanismo de isolamento de processos e evite montar diretórios amplos do host.

## Artefatos e segredos

Capturas de tela, instantâneos, downloads, registros de rede, registros de console e rastreamentos podem conter credenciais ou conteúdo privado de páginas. Monte apenas o diretório de artefatos de que você precisa, limpe-o após o uso e evite compartilhar pacotes de artefatos publicamente.

Se o seu cliente MCP inserir credenciais nas sessões do navegador, dê preferência a credenciais de curta duração, restritas ao site de destino. Não inclua tokens de longa duração em capturas de tela, respostas de rede ou perfis persistentes do navegador.

## Docker

O Docker é recomendado para isolamento e dependências reprodutíveis do navegador. Monte apenas o diretório de artefatos necessário; a imagem já inclui o Tini, que coleta corretamente os processos filhos do navegador. Em um contêiner reforçado e somente leitura, mantenha `/data` montado e forneça montagens temporárias graváveis em `/tmp` e `/tmp/.X11-unix` caso sejam possíveis sessões com interface gráfica.


Ao publicar um Streamable HTTP a partir do Docker, dê preferência a `-p 127.0.0.1:3000:3000`. A publicação direta em uma interface pública concede a qualquer navegador cliente acessível a capacidade de automação, a menos que você adicione autenticação e controles de rede.

A imagem do Docker é verificada com o Trivy na integração contínua (CI) e antes da publicação da versão. O verificador analisa vulnerabilidades de alto risco e críticas no sistema operacional e nas bibliotecas e, quando ativado, envia os resultados SARIF para a verificação de código do GitHub.

## Verificações da cadeia de suprimentos

O repositório utiliza verificações gratuitas, nativas do GitHub e de código aberto:

- CodeQL para análise estática de JavaScript e TypeScript.
- Dependency Review para alterações de dependências em pull requests.
- `npm audit --omit=dev --audit-level=high` para dependências do npm em tempo de execução.
- OpenSSF Scorecard para sinais da cadeia de suprimentos do repositório.
- zizmor para verificação de segurança no GitHub Actions.
- Trivy para varredura de vulnerabilidades em imagens do Docker.

Essas verificações não substituem a análise manual do comportamento da automação do navegador nem das alterações de versão.

## Relatórios

Relate vulnerabilidades usando [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
