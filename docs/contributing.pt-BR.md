---
description: Lista de verificação de contribuições e orientações para pull requests no desenvolvimento do CloakBrowser MCP.
icon: material/source-pull
tags:
  - Project Internals
---

# Como contribuir

Antes de abrir uma solicitação de pull, execute as verificações locais e leia a página sobre a arquitetura da ponte.

```bash
npm install
npm run check
```

## Lista de verificação para pull requests

- [ ] `npm run check` foi aprovado.
- [ ] O novo comportamento da ponte possui testes.
- [ ] Os esquemas, descrições e respostas do MCP do Playwright upstream permanecem inalterados.
- [ ] As alterações visíveis ao usuário estão documentadas.
- [ ] `CHANGELOG.md` foi atualizado para refletir as alterações visíveis ao usuário.
- [ ] As alterações relacionadas à segurança estão indicadas na descrição do PR.

## O que não se deve fazer

- Não reintroduza o adaptador nativo do navegador, o registro de ferramentas ou o modelo de capacidade que foram removidos.
- Não grave logs de tempo de execução em `stdout`; o stdio está reservado para o MCP JSON-RPC.
- Não adicione uma dependência, a menos que ela seja importada pelo tempo de execução ou pelos testes.
- Não enfraqueça as configurações do TypeScript, ESLint ou Prettier para que uma alteração seja aprovada.
- Não faça commit de `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, ou `node_modules/`.

## Questões de segurança

Relate vulnerabilidades por meio dos Alertas de Segurança do GitHub, e não por meio de issues públicos. Consulte [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
