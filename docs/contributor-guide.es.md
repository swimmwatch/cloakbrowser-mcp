---
description: Punto de entrada de colaboradores para CloakBrowser MCP.
icon: material/source-branch
tags:
  - Project Internals
---

# Guía para colaboradores

La documentación para el usuario se centra específicamente en la instalación y el uso del servidor MCP. Aquí se agrupa el material de desarrollo.

## Secciones

- [Desarrollo](development.md) para la configuración local y la estructura del paquete.
- [Pruebas](testing.md) para pruebas unitarias, de integración, de Docker, de paquetes npm y de paridad.
- [Arquitectura](architecture.md) para el diseño del tiempo de ejecución del puente.
- [Lanzamiento](release.md) para la configuración del repositorio y los flujos de trabajo de publicación.
- [Colaboración](contributing.md) para el flujo de trabajo del proyecto.

## Comprobación local obligatoria

```bash
npm run check
```

Ejecuta la comprobación completa antes de realizar el commit. La comprobación de paridad de Docker es más pesada y se puede ejecutar con:

```bash
npm run docker:build
npm run bridge:compare -- cloakbrowser-mcp:dev --report bridge-parity-report.json
```

Las comprobaciones de metadatos y de dependencias de producción se pueden ejecutar directamente con:

```bash
npm run server:validate
npm run audit:prod
```
