---
description: Ponto de entrada do colaborador para o CloakBrowser MCP.
icon: material/source-branch
tags:
  - Project Internals
---

# Guia do colaborador

A documentação do usuário concentra-se intencionalmente na instalação e no uso do servidor MCP. O material de desenvolvimento está agrupado aqui.

## Seções

- [Desenvolvimento](development.md) para configuração local e estrutura do pacote.
- [Testes](testing.md) para testes unitários, de integração, no Docker, do pacote npm e de verificação de paridade.
- [Arquitetura](architecture.md) para o projeto do tempo de execução da ponte.
- [Lançamento](release.md) para configurações do repositório e fluxos de trabalho de publicação.
- [Contribuição](contributing.md) para o fluxo de trabalho do projeto.

## Verificação local obrigatória

```bash
npm run check
```

Execute a verificação completa antes de fazer o commit. A verificação de paridade do Docker é mais pesada e pode ser executada com:

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

As verificações de metadados e dependências de produção podem ser executadas diretamente com:

```bash
npm run server:validate
npm run audit:prod
```
