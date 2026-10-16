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

## Informes de pruebas

Los informes locales generados con `test:report:generate` siguen siendo archivos HTML independientes. Los informes combinados de CI usan archivos separados de HTML, JavaScript y datos para evitar el límite de tamaño de archivo de GitHub. Descarga y extrae todo el artefacto `combined-test-report` y abre su directorio:

```bash
npm run test:report:open -- --report /path/to/extracted-report
```

Para un informe con varios archivos, este comando inicia el visor de Allure instalado. Déjalo en ejecución mientras consultas el informe; pulsa `Ctrl+C` para detenerlo. La publicación en GitHub Pages conserva los recursos del informe en el repositorio separado de informes.

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
