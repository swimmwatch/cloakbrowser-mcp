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

## Propiedad administrada de CDP { #managed-cdp-ownership }

CDP administrado es una superficie de control secundaria opcional para la misma generación de navegador:

```text
MCP client -> outer bridge -> upstream Playwright MCP child -> Chromium
                    |                    |                    |-- Playwright pipe
                    |                    `-- generated config `-- internal loopback CDP
                    `-- external capability proxy <--------- CDP client
```

La sesión MCP posee el arrendamiento del puerto externo, el proxy de capacidad, generado aguas arriba
configuración, hijo reemplazable aguas arriba y generación actual Chromium. Un CDP
el cliente nunca se conecta directamente al punto final de bucle interno. Bootstrap coloca un
desafío de página de navegador de un solo uso a través de MCP y lo consume a través de CDP antes de la
la capacidad externa está publicada. La tubería de depuración remota interna de Playwright permanece
activo junto al endpoint TCP gestionado por el puente.

El arrendamiento del puerto externo es estable para la sesión MCP, mientras que el proceso hijo,
El punto final interno, el número de generación y la capacidad URL son reemplazables. Navegador
la pérdida invalida la capacidad actual y cierra sus sockets en proxy, pero no
iniciar un niño en segundo plano. La primera llamada posterior `browser_*` MCP aplica la
regla de reinicio antes de avanzar:

1. las llamadas concurrentes del navegador comparten un reinicio limitado;
2. el niño viejo se vuelve inalcanzable y es desechado;
3. un hijo de reemplazo utiliza la misma configuración de sesión y un nuevo puerto interno;
4. la propiedad y la preparación externa se verifican antes de la publicación;
5. Las llamadas de navegador en espera se reenvían exactamente una vez a la sustitución lista.

Si la preparación falla, ninguna llamada de navegador en espera llega a un hijo ascendente, ninguna capacidad
se publica, y una llamada posterior del navegador puede iniciar un nuevo intento acotado. Estado del navegador
tales como pestañas y almacenamiento en memoria no se restauran después del reemplazo. Herramientas locales,
listado de herramientas, lecturas de descubrimiento y desconexiones ordinarias de CDP no provocan reinicio.

La limpieza invierte la accesibilidad: detener la admisión, invalidar la capacidad, cerrar el proxy
enchufes, deseche el hijo ascendente y el navegador, cierre el oyente externo, luego
liberar la concesión del puerto. Esto evita que un antiguo URL se mueva silenciosamente a un nuevo navegador.

Los comandos MCP y CDP pueden ejecutarse concurrentemente. El puente no agrega compatibilidad entre protocolos
transacciones o inferir qué llamador posee una página; los llamadores deben coordinar destructivo o
operaciones conflictivas.

## Docker

La imagen de Docker utiliza como imagen base la imagen oficial fijada de Playwright MCP. El puente se instala en `/opt/cloakbrowser-mcp`, mientras que el Playwright MCP de origen sigue estando disponible en `/app/cli.js`.

## Configuración

El puente crea un archivo de configuración JSON temporal con las opciones de inicio de CloakBrowser. Las variables de entorno `PLAYWRIGHT_MCP_*` del servidor de origen siguen reenviándose al MCP de Playwright del servidor de origen.

## Transporte

El transporte predeterminado es stdio. El HTTP transmisible se habilita explícitamente con `--transport streamable-http` o `CLOAK_PLAYWRIGHT_MCP_TRANSPORT=streamable-http`.

En el caso de stdio, cada servidor externo gestiona un proceso hijo del MCP de Playwright en el servidor principal y mantiene el comportamiento predeterminado del perfil del MCP de Playwright en el servidor principal. En el caso de Streamable HTTP, cada sesión de MCP cuenta con su propio servidor externo, proceso hijo de Playwright MCP, configuración generada y estado de transporte en memoria. Las sesiones HTTP inician el MCP de Playwright con perfiles de navegador aislados, de modo que los usuarios simultáneos no comparten ni compiten por el mismo perfil persistente de Chromium.

El backend de sesión solo almacena metadatos. El backend integrado es `memory`; los futuros adaptadores de Redis, Postgres o SQLite podrán coordinar metadatos y bloqueos, pero no podrán restaurar un proceso de navegador activo en el lado de origen una vez que el proceso del servidor al que pertenece haya finalizado. El escalado horizontal debe utilizar sesiones persistentes identificadas por `mcp-session-id`.

El puente utiliza el SDK de MCP `StreamableHTTPServerTransport` para Streamable HTTP. No expone el punto final obsoleto de MCP `SSEServerTransport`, ni un punto final heredado `/sse`.
