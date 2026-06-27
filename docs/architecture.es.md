---
description: Arquitectura de puente para CloakBrowser MCP.
icon: material/graph
tags:
  - Project Internals
---

# Arquitectura

## Tiempo de ejecución

`cloakbrowser-mcp` es un servidor MCP externo que puede exponer stdio o Streamable HTTP. Al iniciarse:

1. resuelve o instala el binario de CloakBrowser Chromium;
2. crea un archivo de configuración temporal de Playwright MCP;
3. inicia el proceso principal `@playwright/mcp` como proceso secundario a través de stdio;
4. se conecta a ese proceso hijo mediante el transporte del cliente del SDK de MCP;
5. expone un servidor MCP externo al cliente MCP del usuario a través del transporte seleccionado;
6. reenvía la lista de herramientas y las llamadas a herramientas de origen sin modificaciones;
7. añade `cloakbrowser_binary_info` y `cloakbrowser_bridge_info`.

## ¿Por qué este diseño?

El proyecto Playwright MCP, situado en una fase anterior, ya cuenta con los contratos de las herramientas del navegador y evoluciona rápidamente. El modelo de puente permite que este proyecto siga siendo pequeño y evita tener que copiar la lógica de automatización del navegador.

## Docker

La imagen de Docker utiliza como imagen base la imagen oficial fijada de Playwright MCP. El puente se instala en `/opt/cloakbrowser-mcp`, mientras que el Playwright MCP de origen sigue estando disponible en `/app/cli.js`.

## Configuración

El puente crea un archivo de configuración JSON temporal con las opciones de inicio de CloakBrowser. Las variables de entorno `PLAYWRIGHT_MCP_*` del servidor de origen siguen reenviándose al MCP de Playwright del servidor de origen.

## Transporte

El transporte predeterminado es stdio. El HTTP transmisible se habilita explícitamente con `--transport streamable-http` o `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

En el caso de stdio, cada servidor externo gestiona un proceso hijo del MCP de Playwright en el servidor principal y mantiene el comportamiento predeterminado del perfil del MCP de Playwright en el servidor principal. En el caso de Streamable HTTP, cada sesión de MCP cuenta con su propio servidor externo, proceso hijo de Playwright MCP, configuración generada y estado de transporte en memoria. Las sesiones HTTP inician el MCP de Playwright con perfiles de navegador aislados, de modo que los usuarios simultáneos no comparten ni compiten por el mismo perfil persistente de Chromium.

El backend de sesión solo almacena metadatos. El backend integrado es `memory`; los futuros adaptadores de Redis, Postgres o SQLite podrán coordinar metadatos y bloqueos, pero no podrán restaurar un proceso de navegador activo en el lado de origen una vez que el proceso del servidor al que pertenece haya finalizado. El escalado horizontal debe utilizar sesiones persistentes identificadas por `mcp-session-id`.

El puente utiliza el SDK de MCP `StreamableHTTPServerTransport` para Streamable HTTP. No expone el punto final obsoleto de MCP `SSEServerTransport`, ni un punto final heredado `/sse`.
