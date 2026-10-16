---
description: Estratégia de testes do CloakBrowser MCP com testes unitários, integração com upstream falso, smoke tests de Docker e verificações de paridade com Playwright MCP.
icon: material/test-tube
tags:
  - Testes
  - Internos do projeto
---

# Testes

## Testes unitários

```bash
npm run test:unit
```

Os testes unitários cobrem análise de ambiente, geração da configuração da ponte, tratamento de argumentos de inicialização e ferramentas locais de introspecção do Cloak.

## Testes de integração

```bash
npm run test:integration
```

Os testes de integração usam um processo filho MCP upstream falso e verificam que a ponte mescla ferramentas locais e encaminha chamadas upstream sem alterações.

`npm run check` inclui verificações estáticas, testes unitários/de integração e do CLI empacotado com upstream MCP simulado, sem Chromium. Nos PRs, os testes unitários/de integração e do CLI são executados uma vez por combinação de plataforma e Node.js: {{ project.node_check_versions }} em Linux x64/arm64, macOS x64/arm64 e Windows x64. Linux x64 coleta a cobertura para Codecov nessa mesma execução. As verificações estáticas e do pacote são executadas uma vez em Linux x64/Node.js {{ project.node_minimum_version }}.

A matriz de CI, o inventário de resultados esperados e a documentação leem as versões do Node.js de `.github/workflows/ci.yml`. Atualize esse arquivo quando as linhas de versões testadas mudarem.

## Testes com navegador real e distribuições

```bash
npm run test:e2e
npm run test:e2e:playwright-console
npm run test:e2e:cdp
npm run test:e2e:npm-package
npm run test:e2e:docker
npm run test:e2e:cdp:docker
```

`test:e2e` combina testes de CLI com fake upstream e testes de console com Playwright Chromium real. `test:e2e:playwright-console` verifica métodos de console em sessões novas. `test:e2e:cdp` verifica acesso gerenciado por Chrome DevTools Protocol (CDP) com Free CloakBrowser e Playwright Chromium controlado.

`test:e2e:npm-package` empacota e instala o pacote em um projeto temporário. O teste do contrato de encaminhamento usa fake upstream; os cenários de navegador usam CloakBrowser real e páginas locais para verificar ferramentas padrão, estado persistente e ambos os presets de humanização. Outro teste verifica downloads concorrentes em um cache vazio e stdout sem texto adicional. A verificação do pacote, sozinha, não valida o navegador.

A matriz de navegador do PR verifica o console do Playwright e o CDP gerenciado com Node.js {{ project.node_current_version }} nas mesmas cinco plataformas, além de Linux x64/Node.js {{ project.node_minimum_version }} para CDP. Uma matriz paralela de Node.js {{ project.node_primary_version }} executa as suítes do pacote npm, proxy/GeoIP, extensões e ciclo de vida nas cinco plataformas, incluindo ambos os presets de humanização. A aceitação de Docker e CDP cobre ambos os motores em `linux/amd64` e `linux/arm64`.

`required-ci` exige o sucesso de todas as suítes e do relatório agregado completo antes do merge. O mesmo workflow `CI` também é executado semanalmente e manualmente. `Release` compila e publica artefatos da revisão testada.

## Relatórios de testes

Cada célula da matriz CI envia resultados sanitizados e anexos de diagnóstico. O job de agregação combina tudo em um relatório HTML do Allure, mantendo as etiquetas de suite e ambiente. Produtores esperados ausentes e testes com falha fazem a agregação falhar; os resultados originais e o HTML continuam disponíveis como artefatos do Actions.

PRs elegíveis podem publicar um link por meio do repositório separado de relatórios configurado. A publicação exige entrega habilitada, evidências validadas da execução e verificação bem-sucedida do Pages. O site de documentação é implantado separadamente. Relatórios públicos contêm apenas diagnósticos permitidos e sanitizados de fixtures controladas.

```bash
npm run test:report -- --suite unit --run-id local
npm run test:report:generate -- --input artifacts/test-results --output artifacts/test-report/local
npm run test:report:open -- --report artifacts/test-report/local
```

Use o diretório real de saída do coletor como entrada do gerador. Consulte [Contribuindo](contributing.md) para formatos, anexos e entrega pelo CI.

## Verificação do pacote

```bash
npm run package:verify
```

Isso compila o pacote, executa `npm pack`, verifica a lista de arquivos do tarball, instala o tarball em um projeto temporário e valida `--version` e `--help` da CLI.

A verificação do pacote também valida `server.json` contra o esquema publicado de servidor MCP.

A montagem da versão usa `npm run package:pack` para criar o arquivo e validar seus metadados e arquivos incluídos. A instalação e a execução do CLI são verificadas antes do merge por `package:verify`.

## Smoke test de Docker

```bash
npm run docker:build
npm run docker:smoke
```

O smoke test verifica que a imagem criada inicia e imprime a ajuda da CLI. O CI executa smoke tests das imagens Docker para `linux/amd64` e `linux/arm64`.

## Paridade com upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

O script de paridade inicia a imagem Docker oficial do Playwright MCP e a imagem da ponte CloakBrowser, compara os nomes das ferramentas upstream, exercita a superfície padrão de ferramentas de navegador em uma mesma página fixture e verifica as ferramentas locais de introspecção do Cloak.

CI envia o relatório JSON de paridade a partir dos jobs de Docker. A paridade do navegador é verificada em `linux/amd64`; ambas as arquiteturas executam testes básicos, análise de vulnerabilidades, testes de distribuição e CDP. A paridade cobre a versão fixada do Docker MCP; a suíte npm verifica npm MCP separadamente.

## Verificações de segurança

```bash
npm run audit:prod
npm run server:validate
```

O CI também executa CodeQL, Dependency Review, OpenSSF Scorecard, zizmor e Trivy. Essas ferramentas são gratuitas para repositórios públicos e não exigem contas externas.
