---
description: Lista de comprobación de contribuciones y guía para solicitudes de incorporación de cambios (pull requests) para el desarrollo de CloakBrowser MCP.
icon: material/source-pull
tags:
  - Project Internals
---

# Cómo colaborar

Antes de abrir una solicitud de incorporación de cambios, ejecuta las comprobaciones locales y lee la página sobre la arquitectura del puente.

```bash
npm install
npm run check
```

## Lista de comprobación para las solicitudes de incorporación de cambios

- [ ] `npm run check` supera las pruebas.
- [ ] El nuevo comportamiento del puente cuenta con pruebas.
- [ ] Los esquemas, descripciones y respuestas del MCP de Playwright de origen permanecen sin cambios.
- [ ] Se han documentado los cambios visibles para el usuario.
- [ ] `CHANGELOG.md` se ha actualizado para reflejar los cambios visibles para el usuario.
- [ ] Los cambios relacionados con la seguridad se indican en la descripción de la solicitud de incorporación de cambios (PR).

## Cosas que no hay que hacer

- No vuelvas a introducir el adaptador nativo del navegador, el registro de herramientas o el modelo de capacidades que se han eliminado.
- No escribas registros de tiempo de ejecución en `stdout`; stdio está reservado para MCP JSON-RPC.
- No añadas ninguna dependencia a menos que sea importada por el tiempo de ejecución o por las pruebas.
- No rebajes la configuración de TypeScript, ESLint o Prettier para que se apruebe un cambio.
- No realices el commit de `dist/`, `coverage/`, `artifacts/`, `site/`, `.venv-docs/`, o `node_modules/`.

## Cuestiones de seguridad

Notifica las vulnerabilidades a través de los avisos de seguridad de GitHub, no mediante incidencias públicas. Consulta [SECURITY.md](https://github.com/swimmwatch/cloakbrowser-mcp/blob/main/SECURITY.md).
