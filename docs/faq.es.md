---
description: Preguntas frecuentes sobre la instalación de CloakBrowser MCP, el uso de Docker, la compatibilidad con Playwright MCP y la seguridad.
icon: material/help-circle
tags:
  - User Guide
---

# Preguntas frecuentes

## ¿Qué es CloakBrowser MCP?

CloakBrowser MCP es un servidor [Model Context Protocol](https://modelcontextprotocol.io/) para la automatización de navegadores a través de stdio o Streamable HTTP. Se ejecuta en la fase previa a [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) y dirige la configuración de inicio del navegador MCP de Playwright hacia el binario Chromium [CloakBrowser](https://github.com/CloakHQ/CloakBrowser).

## ¿En qué se diferencia del MCP de Playwright de origen?

El servidor MCP de Playwright, situado en la parte superior de la cadena, es el responsable de los esquemas, las descripciones y las respuestas de las herramientas del navegador. CloakBrowser MCP mantiene esas herramientas sin cambios y solo añade dos herramientas de introspección locales: `cloakbrowser_binary_info` y `cloakbrowser_bridge_info`.

## ¿Debería instalarlo desde npm o desde Docker?

Utiliza npm si tu cliente MCP ya se ejecuta en tu equipo y tienes disponible Node.js 22.12 o una versión posterior. Utiliza Docker si deseas una imagen repetible basada en Playwright MCP con la caché de CloakBrowser preparada dentro del contenedor.

## ¿Qué clientes de MCP pueden utilizarlo?

Cualquier cliente MCP que admita servidores stdio o Streamable HTTP puede utilizar CloakBrowser MCP. La guía [Primeros pasos](getting-started.md) incluye ejemplos JSON de stdio para Codex, Claude Desktop, Claude Code, Cursor, clientes tipo VS Code/Cline, Continue, Windsurf, Goose y configuraciones tipo Warp.

## ¿Es compatible con las mismas herramientas de navegador que Playwright MCP?

Sí. Las herramientas del navegador de Playwright MCP se reenvían sin modificaciones. El proyecto también realiza una comparación de paridad en la integración continua (CI), de modo que los cambios en el puente puedan contrastarse con el comportamiento oficial de Playwright MCP.

## ¿Mejora Docker la seguridad?

Docker te ofrece un entorno de ejecución más repetible y aislado, pero no elimina los riesgos de la automatización del navegador. Trata la navegación automatizada como una ejecución no fiable: evita compartir información confidencial con páginas desconocidas, guarda los artefactos y las capturas de pantalla en directorios controlados y revisa la guía de [Seguridad](security.md) antes de exponer el servidor a otros sistemas.

## ¿Este proyecto utiliza herramientas de análisis o seguimiento?

No. El sitio de documentación no tiene activadas las funciones de análisis de forma predeterminada. La visibilidad en los motores de búsqueda se gestiona mediante metadatos estándar, `robots.txt`, la generación de mapas del sitio, etiquetas opcionales de verificación para webmasters y notificaciones opcionales de IndexNow.

## Más rutas prácticas

Para elegir entre Playwright MCP upstream y este paquete, consulta la [comparación](comparison.md). Para tareas rápidas, usa las [recetas](recipes/index.md): perfil persistente, extensiones, reverse proxy, QA regional, Claude Desktop, Codex CLI y prueba smoke de CI.
