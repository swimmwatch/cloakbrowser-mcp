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

O CI executa testes unitários, de integração e E2E da CLI empacotada no Node.js 22 e 24-26 para Linux x64, Linux arm64, macOS arm64, macOS x64 e Windows x64.

## Verificação do pacote

```bash
npm run package:verify
```

Isso compila o pacote, executa `npm pack`, verifica a lista de arquivos do tarball, instala o tarball em um projeto temporário e valida `--version` e `--help` da CLI.

A verificação do pacote também valida `server.json` contra o esquema publicado de servidor MCP.

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

O CI envia o relatório JSON de paridade como artefato para jobs de build Docker e jobs de release. A paridade do navegador atualmente roda em `linux/amd64`; jobs Docker arm64 usam smoke tests e verificações de vulnerabilidades.

## Verificações de segurança

```bash
npm run audit:prod
npm run server:validate
```

O CI também executa CodeQL, Dependency Review, OpenSSF Scorecard, zizmor e Trivy. Essas ferramentas são gratuitas para repositórios públicos e não exigem contas externas.
