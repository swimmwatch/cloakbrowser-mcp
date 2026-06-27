---
description: Processo de lançamento do pacote npm do CloakBrowser MCP, da imagem do Docker, do site de documentação, da listagem no MCP Registry e da implantação no GitHub Pages.
icon: material/tag-check
tags:
  - Project Internals
  - Release
---

# Lançamento

Os lançamentos são orientados por um lançamento publicado no GitHub cuja tag é um valor semver
prefixado com `v`, por exemplo, `v1.2.7`.

O fluxo de trabalho unificado `Release` resolve a tag uma vez e, em seguida, passa a tag derivada `version`,
`version_tag` e a tag de imagem compatível com o Docker por meio do empacotamento npm, argumentos de compilação do Docker,
rótulos de imagem, metadados do servidor, marcadores README e marcadores de documentação.
>

## Configurações do repositório do GitHub

Configure essas opções antes da primeira versão.

| Area | Required setting |
| --- | --- |
| Actions | Enable GitHub Actions for the repository. |
| Actions token | Allow workflows to request the permissions declared in each workflow. |
| Branch protection | Require `Actionlint`, `CI`, `CodeQL`, and `Dependency Review` before merging to `main`. |
| Pages | Set `Build and deployment -> Source` to `GitHub Actions`. |
| Packages | Allow GitHub Actions to publish packages to GitHub Packages. |
| Environments | Create `npm-production`, `docker-production`, `github-pages`, and `mcp-registry-production`. |
| Code scanning | Enable code scanning to view CodeQL, Scorecard, and Trivy SARIF results. |

Adicione os revisores necessários a `npm-production`, `docker-production` e
`mcp-registry-production` caso as versões precisem de aprovação manual após a
publicação de um GitHub Release. O ambiente `github-pages` é usado pela
tarefa de implantação nativa do GitHub Pages.

## Publicação no npm

O fluxo de trabalho de lançamento do npm realiza a publicação por meio do npm Trusted Publishing com o GitHub
Actions OIDC. Ele não utiliza `NPM_TOKEN` para a publicação.

Configure o editor confiável no npmjs.com com exatamente estes valores:

| npm Trusted Publisher field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Repository | `swimmwatch/cloakbrowser-mcp` |
| Workflow filename | `release.yml` |
| Environment | `npm-production` |
| Allowed action | `npm publish` |

A tarefa `npm` é executada em runners hospedados no GitHub, usa o Node.js 24 e mantém
`id-token: write` para que o npm possa trocar o token OIDC do GitHub Actions por uma
credencial de publicação de curta duração. A Publicação Confiável do npm requer a CLI do npm
`>=11.5.1` e o Node.js `>=22.14.0`.

Aplicações na área editorial:

```bash
npm publish <tarball> --access public --tag <latest|next>
```

Ao publicar por meio do Trusted Publishing, o npm gera automaticamente a
proveniência dos pacotes públicos a partir de repositórios públicos. Não inclua um
token de publicação do npm de longa duração neste fluxo de trabalho.

A versão do pacote é aplicada a partir da tag de lançamento do GitHub anterior a `npm pack`
e `npm publish`, e a tarefa falha se `package.json` não corresponder à
versão de lançamento resolvida.

## Publicação no Docker

As imagens do Docker são publicadas em:

```text
ghcr.io/swimmwatch/cloakbrowser-mcp
docker.io/swimmwatch/cloakbrowser-mcp
```

A tarefa `docker` utiliza o repositório `GITHUB_TOKEN` com
`packages: write` para o GHCR. A publicação no Docker Hub requer
`DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` nos segredos do ambiente ou do repositório `docker-production`.

O fluxo de trabalho atualiza a visão geral do repositório no Docker Hub após um
envio bem-sucedido da imagem. O Docker Hub não baixa automaticamente a raiz `README.md` para
esse fluxo de lançamento do GitHub Actions; a visão geral específica do Docker Hub é
mantida em `docs/dockerhub-readme.md`.

Antes de enviar a imagem de lançamento, o fluxo de trabalho é o seguinte:

- aplica a versão de lançamento;
- executa as verificações de TypeScript, lint, formatação, compilação, teste e cobertura;
- compila uma imagem local de teste de lançamento;
- aplica as atualizações de segurança do Debian disponíveis sobre a imagem base fixada do Playwright MCP
  durante a compilação do Docker;
- remove a carga global do npm não utilizada da imagem de tempo de execução;
- executa `--help` na imagem;
- compara a imagem com o Playwright MCP upstream usando o script de paridade
  da ponte;
- envia o relatório de paridade da ponte em JSON como um artefato do fluxo de trabalho;
- verifica a imagem com o Trivy em busca de vulnerabilidades graves e críticas no sistema operacional e nas bibliotecas.

A compilação do Docker recebe `RELEASE_VERSION`, `RELEASE_VERSION_TAG` e
`VCS_REF`. O fluxo de trabalho também resolve o resumo da imagem base do Playwright
MCP upstream e o passa como `PLAYWRIGHT_MCP_IMAGE_DIGEST`.

A imagem final armazena os mesmos valores que as etiquetas OCI e as variáveis de ambiente de metadados de tempo de execução.
As imagens publicadas incluem etiquetas para título, descrição,
fonte, documentação, versão, revisão, licença, autores, fornecedor, nome da imagem base,
digest da imagem base e nome do servidor MCP.

O Trivy é gratuito e de código aberto e não requer um token externo para a
análise de imagens públicas. Os resultados do SARIF são enviados para a verificação de código do GitHub quando a
verificação de código está ativada.

Após a primeira publicação, verifique se o pacote GHCR está público e vinculado a este
repositório, e verifique se o repositório do Docker Hub está público.

A Docker publica um manifesto multiplataforma para `linux/amd64` e
`linux/arm64`. O fluxo de trabalho de lançamento realiza testes de verificação em ambas as plataformas antes da publicação
e mantém a comparação de compatibilidade entre navegadores no `linux/amd64`.

## Publicação no Registro MCP

A tarefa `mcp-registry` publica `server.json` no
registro oficial em:

```text
https://registry.modelcontextprotocol.io
```

A publicação no servidor utiliza a ação composta local do GitHub `MCP Registry Publish`,
a CLI oficial `mcp-publisher` e o OIDC do GitHub Actions. Não abra uma solicitação de pull
para `modelcontextprotocol/registry` para listar este servidor; esse repositório
exige explicitamente que os autores de pacotes publiquem com `mcp-publisher`.

O fluxo de trabalho não requer o Glama, faturamento, uma autorização de acesso ao GitHub (PAT), credenciais de DNS nem
segredos de registro de longa duração. Ele utiliza:

- `id-token: write` para autenticação OIDC no GitHub;
- `mcp-publisher login github-oidc`;
- o namespace existente do GitHub `io.github.swimmwatch/cloakbrowser-mcp`;
- o valor do pacote npm `mcpName` para comprovar a propriedade do pacote npm;
- o rótulo da imagem do Docker `io.modelcontextprotocol.server.name` para comprovar a propriedade da imagem OCI
  .

A tarefa do Registro MCP é iniciada a partir do mesmo evento de lançamento do GitHub que o npm, o Docker
e a publicação da documentação. Ela declara `needs: [npm, docker]`, de modo que a publicação do npm e
do GHCR seja concluída antes do início da publicação no registro. A ação composta
é intencionalmente focada no registro: ela valida `server.json` localmente,
valida-a com `mcp-publisher`, verifica se a versão exata do registro já está
visível, autentica com `mcp-publisher login github-oidc`, publica
os metadados do servidor e verifica a entrada final no registro.

Caso ocorra uma falha temporária no registro, execute novamente a tarefa `mcp-registry` que falhou na
execução original da versão, após as tarefas do npm e do Docker apresentarem status verde. O acionamento manual
`workflow_dispatch` no `Release` destina-se a execuções completas do pipeline de lançamento com
uma tag explícita.

Verifique a entrada do Registro publicada com:

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.swimmwatch/cloakbrowser-mcp"
npm run registry:check
```

O registro `https://github.com/mcp` do GitHub é uma plataforma de descoberta
separada e com curadoria. A publicação no Registro MCP oficial é obrigatória, mas não
garante visibilidade imediata na página `/mcp` do GitHub. Trate o `npm run
registry:check` como uma ferramenta de verificação de lançamento para o registro oficial, o npm,
o GHCR, o Docker Hub e como uma tentativa de obter visibilidade no GitHub MCP, dentro do possível. Use `npm run
registry:check:strict` somente depois que a visibilidade no GitHub MCP se tornar um
requisito obrigatório.

## Lista de verificação do Diretório Glama

A pontuação no diretório Glama é independente das versões do GitHub e das publicações oficiais no MCP
Registry. O repositório inclui `glama.json`, de modo que a
conta de mantenedor `swimmwatch` possa reivindicar ou confirmar a propriedade no Glama.

Antes de publicar uma versão estável, preencha a lista de verificação gratuita do Glama:

- sincronize o servidor a partir da interface de administração do servidor Glama MCP após `glama.json`
  for mesclado com `main`;
- abra
  `https://glama.ai/mcp/servers/swimmwatch/cloakbrowser-mcp/admin/dockerfile`;
- configurar o Glama para compilar o Dockerfile deste repositório e iniciar o
  ponto de entrada stdio existente sem segredos adicionais;
- manter o ambiente de execução compatível com os padrões do CloakBrowser: `cloak` navegador
  , modo headless, saída stdout e `/data` armazenamento de artefatos;
- clique em “Deploy” e aguarde até que o teste de compilação seja aprovado;
- crie e publique uma versão do Glama com a mesma versão da versão do GitHub,
  por exemplo, `1.2.7`;
- use o recurso “Experimentar no navegador” do Glama uma vez após o lançamento para estimular o
  uso inicial;
- adicione servidores relacionados manualmente, no mínimo o servidor oficial do Playwright MCP,
  e, opcionalmente, alternativas de automação de navegador intimamente relacionadas.

Não adicione um método de cobrança ou uma hospedagem paga no Glama apenas para melhorar a pontuação
do diretório. Se o Glama exigir cobrança para um item obrigatório da lista de verificação, considere isso como um
impedimento para o lançamento que requer uma decisão explícita do mantenedor.

## Fluxos de trabalho de segurança

O repositório utiliza ferramentas de segurança gratuitas:

| Workflow | Tool | Trigger | User setup |
| --- | --- | --- | --- |
| `CodeQL` | GitHub CodeQL | push, pull request, weekly, manual | Enable code scanning to view SARIF results. |
| `Dependency Review` | GitHub Dependency Review | pull request | No external account or token. |
| `OpenSSF Scorecard` | OpenSSF Scorecard | push, weekly, manual | Enable code scanning to view SARIF results. |
| `Zizmor` | zizmor | workflow changes, manual | No external account or token. |
| `CI` / `Release` | Trivy | Docker build and release | Enable code scanning to view SARIF results. |
| `CI` / releases | `npm audit --omit=dev --audit-level=high` | CI and release checks | No external account or token. |

O fixação do SHA da ação é monitorada como uma etapa futura de fortalecimento. Os fluxos de trabalho atuais utilizam
referências de ação versionadas para que as atualizações permaneçam gerenciáveis enquanto a infraestrutura de lançamento
ainda estiver em fase inicial.

## Publicação de documentação

As tarefas `docs-build` e `docs-deploy` implantam o MkDocs usando o fluxo de implantação nativo do GitHub Pages Actions
. As configurações das Páginas do repositório devem usar `GitHub Actions` como
fonte.

O fluxo de trabalho gera a documentação no modo estrito, envia o diretório gerado `site/`
com o `actions/upload-pages-artifact` e o implanta com
`actions/deploy-pages` no ambiente `github-pages`.

A publicação da documentação também executa o validador de SEO após a compilação do MkDocs.
Os tokens opcionais de verificação para webmasters utilizam ferramentas oficiais e gratuitas para webmasters e podem
ser fornecidos como variáveis do repositório ou segredos:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`
- `YANDEX_SITE_VERIFICATION`
- `BAIDU_SITE_VERIFICATION`
- `NAVER_SITE_VERIFICATION`

As notificações opcionais do IndexNow exigem um segredo de repositório chamado
`INDEXNOW_KEY`. Quando ele é definido, o fluxo de trabalho publica o arquivo de chave necessário e
envia as URLs do mapa do site geradas após a implantação no GitHub Pages.

Não inclua serviços de indexação pagos, produtos publicitários ou ferramentas de análise de terceiros
no fluxo de lançamento da documentação sem uma decisão explícita e separada
.

## Monitoramento a montante

O fluxo de trabalho do monitor upstream é executado diariamente e também pode ser iniciado manualmente a partir do
GitHub Actions. Ele verifica os dois canais de distribuição do Playwright MCP upstream:

- Pacote npm: `@playwright/mcp`;
- Imagem do Docker: `mcr.microsoft.com/playwright/mcp`.

Quando uma versão mais recente do upstream é detectada, o fluxo de trabalho cria uma issue no GitHub
atribuída a `swimmwatch`. A issue inclui as versões atual e mais recente do npm/Docker
, um breve resumo das notas de lançamento de
`microsoft/playwright-mcp` e links para o changelog completo do upstream, o pacote npm
e as tags do Docker.

Execute a mesma verificação localmente com:

```bash
npm run upstream:check
```

## Tags de lançamento

| Release type | GitHub Release setting | npm dist-tag | Docker tags |
| --- | --- | --- | --- |
| Stable | Not prerelease | `latest` | `vX.Y.Z`, `X.Y.Z`, `X.Y`, `latest` |
| Prerelease | Prerelease | `next` | `vX.Y.Z-prerelease`, `X.Y.Z-prerelease` |

## Lista de verificação

Antes de publicar um comunicado:

- Faça a fusão somente depois que `Actionlint` e `CI` estiverem em verde.
- Crie uma versão no GitHub a partir de uma tag como `v1.2.7`.
- Marque a versão como pré-lançamento ao publicar uma versão npm `next`.
- Confirme se o “npm Trusted Publisher” está configurado para `release.yml` e
  `npm-production`.
- Confirme se `npm-production`, `docker-production`, `github-pages` e
  `mcp-registry-production`.
- Confirme se a verificação de código do GitHub está habilitada, caso seja necessária visibilidade para o upload no SARIF.
- Confirme se a visibilidade do pacote GHCR é pública após a primeira publicação no Docker.
- Confirme se o servidor Glama foi sincronizado, testado por meio da página de administração do Dockerfile
  e lançado com a mesma versão estável.

`SUPPORT.md` foi adiado intencionalmente até que o projeto tenha uma política de suporte estável
que vá além das issues do GitHub e dos alertas de segurança.
