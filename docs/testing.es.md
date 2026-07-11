---
description: Estrategia de pruebas de CloakBrowser MCP con pruebas unitarias, integración con upstream falso, pruebas smoke de Docker y comprobaciones de paridad con Playwright MCP.
icon: material/test-tube
tags:
  - Pruebas
  - Internos del proyecto
---

# Pruebas

## Pruebas unitarias

```bash
npm run test:unit
```

Las pruebas unitarias cubren el análisis del entorno, la generación de configuración del puente, el manejo de argumentos de lanzamiento y las herramientas locales de introspección de Cloak.

## Pruebas de integración

```bash
npm run test:integration
```

Las pruebas de integración usan un proceso hijo MCP upstream falso y verifican que el puente combine las herramientas locales y reenvíe las llamadas upstream sin cambios.

CI ejecuta las pruebas unitarias, de integración y E2E de la CLI empaquetada en Node.js 22 y 24-26 para Linux x64, Linux arm64, macOS arm64, macOS x64 y Windows x64.

## Verificación del paquete

```bash
npm run package:verify
```

Esto compila el paquete, ejecuta `npm pack`, comprueba la lista de archivos del tarball, instala el tarball en un proyecto temporal y verifica `--version` y `--help` de la CLI.

La verificación del paquete también valida `server.json` contra el esquema publicado de servidor MCP.

## Prueba smoke de Docker

```bash
npm run docker:build
npm run docker:smoke
```

La prueba smoke verifica que la imagen creada arranque e imprima la ayuda de la CLI. CI ejecuta pruebas smoke de las imágenes Docker para `linux/amd64` y `linux/arm64`.

## Paridad con upstream

```bash
npm run bridge:compare
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

El script de paridad inicia la imagen Docker oficial de Playwright MCP y la imagen del puente CloakBrowser, compara los nombres de herramientas upstream, ejercita la superficie predeterminada de herramientas de navegador en una misma página fixture y verifica las herramientas locales de introspección de Cloak.

CI sube el informe JSON de paridad como artefacto para los trabajos de construcción Docker y los trabajos de publicación. La paridad del navegador se ejecuta actualmente en `linux/amd64`; los trabajos Docker arm64 usan pruebas smoke y comprobaciones de vulnerabilidades.

## Comprobaciones de seguridad

```bash
npm run audit:prod
npm run server:validate
```

CI también ejecuta CodeQL, Dependency Review, OpenSSF Scorecard, zizmor y Trivy. Estas herramientas son gratuitas para repositorios públicos y no requieren cuentas externas.
