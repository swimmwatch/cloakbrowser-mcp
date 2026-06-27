---
description: Orientação sobre o modelo de segurança e riscos de automação do navegador para o CloakBrowser MCP, isolamento do Docker, artefatos, segredos e exposição de rede.
icon: material/shield-lock
tags:
  - Security
  - User Guide
---

# Segurança

Este projeto é uma ponte de automação para navegadores. Considere-o como uma infraestrutura de execução de código confiável.

## Limite de confiança

O servidor externo oferece suporte a stdio e Streamable HTTP. Ele inicia o Playwright MCP (upstream) como um processo filho e encaminha as chamadas da ferramenta. A automação do navegador, a saída de arquivos, o acesso à rede e o comportamento de avaliação não segura são controlados pelo Playwright MCP (upstream).

Não exponha o servidor stdio por meio de um wrapper de rede não autenticado. Qualquer cliente capaz de chamar ferramentas pode controlar o navegador, ler dados da página acessíveis ao navegador e solicitar artefatos.

O Streamable HTTP se vincula ao `127.0.0.1` via HTTP por padrão para clientes locais. Se você o vincular ao `0.0.0.0` ou publicá-lo fora do loopback, exigirá `CLOAK_PLAYWRIGHT_MCP_HTTP_AUTH_TOKEN` ou autenticação de proxy reverso equivalente, use HTTPS direto com `CLOAK_PLAYWRIGHT_MCP_HTTP_PROTOCOL=https` e arquivos TLS ou termine a conexão TLS em uma borda de rede confiável e restrinja o acesso a clientes confiáveis.

## Ferramentas perigosas

O Upstream Playwright MCP inclui ferramentas como `browser_evaluate` e `browser_run_code_unsafe`. Elas podem executar JavaScript no navegador ou no contexto do servidor do Playwright. Conecte este servidor apenas a clientes do MCP em que você confia.

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

Recomenda-se o uso do Docker quando se deseja isolamento e dependências reproduzíveis do navegador. Monte apenas o diretório de artefatos necessário e utilize `--init` para que os processos filhos do navegador sejam liberados corretamente.

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
