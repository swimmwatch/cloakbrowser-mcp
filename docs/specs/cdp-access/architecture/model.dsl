workspace "Managed CDP access" "Session-scoped Chromium CDP access through the CloakBrowser MCP bridge" {
  !identifiers hierarchical

  model {
    operator = person "Operator" "Configures process defaults, port pool, bind and advertised authority, Docker publication, and optional TLS termination."
    mcpCaller = person "MCP caller" "Owns one stdio runtime or one independently initialized Streamable HTTP session."
    cdpClient = person "CDP client" "Uses a session capability URL with connectOverCDP or another Chromium CDP client."
    tlsTerminator = softwareSystem "Operator TLS terminator" "Optional external HTTPS/WSS endpoint that preserves advertised Host, Origin authority, leased port, and one-to-one session routing."

    bridge = softwareSystem "cloakbrowser-mcp" "Forwards upstream MCP tools unchanged and optionally exposes managed session-scoped CDP access." {
      bridgeProcess = container "Bridge process" "Owns stdio or Streamable HTTP admission and one process-local CDP allocator." "Node.js / TypeScript" {
        configuration = component "CDP configuration" "Resolves CLI over environment, process defaults, HTTP overrides, pool, hosts, scheme, remote gate, and raw Chromium argument conflicts." "Pure boundary logic"
        admission = component "Session admission" "Computes effective CDP enablement and owns downstream MCP request lifecycle." "MCP bridge"
        allocator = component "External port allocator" "Leases the lowest process-local candidate and transfers an already-bound plaintext listener." "Process-local state"
        coordinator = component "CDP session coordinator" "Owns one stable external lease and proxy, at most one replaceable upstream generation owner, and one session-scoped restart single-flight." "Session state machine"
        generationOwner = component "Replaceable upstream generation owner" "Owns one internal port handoff, generated runtime, upstream client and transport, Chromium discovery client, and bounded cleanup." "Lifecycle owner"
        httpProxy = component "Capability HTTP proxy" "Validates capability, route, method, body, Host, Origin, limits, and readiness before forwarding; emits typed redacted errors." "Node HTTP"
        webSocketProxy = component "Bounded WebSocket relay" "Relays browser and page CDP sockets with backpressure, connection counts, fixed local close codes and reasons, and shutdown." "WebSocket server/client"
        discovery = component "Internal CDP discovery" "Uses a loopback plaintext Chromium endpoint, verifies browser identity, and consumes a one-use MCP-to-CDP ownership challenge." "CDP client"
        activity = component "Session activity" "Refreshes Streamable HTTP activity only for accepted CDP requests and frames; silent sockets do not refresh it." "Session lifecycle"
        bridgeInfo = component "cloakbrowser_bridge_info" "Returns the owning session's disabled, ready, or unavailable state without exposing capability parts separately or internal identifiers." "Local MCP tool"
      }

      upstreamChild = container "Current upstream Playwright MCP child" "Exactly one reachable child per enabled MCP session generation; replacement retains Playwright's remote-debugging-pipe and immutable session configuration." "@playwright/mcp"
      chromium = container "Chromium browser generation" "At most one active generation per session, shared by MCP and authorized CDP clients." "CloakBrowser Chromium or Playwright Chromium"
    }

    operator -> bridge.bridgeProcess.configuration "Sets CLI and environment configuration"
    operator -> tlsTerminator "Configures TLS and one-to-one advertised port routing"
    mcpCaller -> bridge.bridgeProcess.admission "Initializes and calls MCP tools" "MCP over stdio or Streamable HTTP"
    bridge.bridgeProcess.admission -> mcpCaller "Returns initialize and tool results" "MCP over stdio or Streamable HTTP"
    bridge.bridgeProcess.admission -> bridge.bridgeProcess.configuration "Requests effective process and session configuration"
    bridge.bridgeProcess.admission -> bridge.bridgeProcess.coordinator "Creates, calls, or disposes the session-owned CDP runtime"
    bridge.bridgeProcess.configuration -> bridge.bridgeProcess.allocator "Supplies validated pool and plaintext bind authority"
    bridge.bridgeProcess.allocator -> bridge.bridgeProcess.httpProxy "Transfers the bound listener and lease"
    bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "Creates, replaces, and disposes one current owner"
    bridge.bridgeProcess.generationOwner -> bridge.upstreamChild "Connects, lists tools, and forwards exactly once after readiness" "MCP over stdio"
    bridge.upstreamChild -> bridge.chromium "Controls the current browser generation" "Playwright pipe"
    bridge.bridgeProcess.generationOwner -> bridge.bridgeProcess.discovery "Bootstraps and validates a generation"
    bridge.bridgeProcess.discovery -> bridge.chromium "Discovers, proves ownership, and controls" "Loopback plaintext HTTP/WebSocket CDP"
    bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "Publishes or invalidates the capability generation"
    bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.webSocketProxy "Invalidates generation sockets and controls shutdown"
    bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.allocator "Releases the external lease after reachability closes"
    bridge.bridgeProcess.httpProxy -> bridge.bridgeProcess.webSocketProxy "Upgrades accepted browser and page targets"
    bridge.bridgeProcess.httpProxy -> bridge.bridgeProcess.activity "Reports accepted HTTP activity"
    bridge.bridgeProcess.webSocketProxy -> bridge.bridgeProcess.activity "Reports accepted frame activity and connection counts"
    bridge.bridgeProcess.bridgeInfo -> bridge.bridgeProcess.coordinator "Reads current state and probes liveness"
    mcpCaller -> bridge.bridgeProcess.bridgeInfo "Calls the local discovery tool" "MCP"
    cdpClient -> bridge.bridgeProcess.httpProxy "Uses advertised http/ws capability URLs" "Plaintext HTTP/WebSocket"
    bridge.bridgeProcess.httpProxy -> cdpClient "Returns discovery, control, and typed failure responses" "HTTP/WebSocket"
    cdpClient -> tlsTerminator "Uses advertised https/wss capability URLs" "TLS HTTP/WebSocket"
    tlsTerminator -> bridge.bridgeProcess.httpProxy "Forwards plaintext on the same advertised leased port and preserves authority" "Plaintext HTTP/WebSocket"
    bridge.bridgeProcess.httpProxy -> bridge.chromium "Forwards allowed discovery and control HTTP" "Loopback plaintext HTTP"
    bridge.bridgeProcess.webSocketProxy -> bridge.chromium "Relays allowed browser and page CDP" "Loopback plaintext WebSocket"
  }

  views {
    systemContext bridge "cdp-context" {
      include *
      autolayout lr
    }

    container bridge "cdp-runtime-containers" {
      include *
      include operator
      include mcpCaller
      include cdpClient
      include tlsTerminator
      autolayout lr
    }

    component bridge.bridgeProcess "cdp-bridge-components" {
      include *
      include bridge.upstreamChild
      include bridge.chromium
      include mcpCaller
      include cdpClient
      include tlsTerminator
      autolayout lr
    }

    dynamic bridge "cdp-initial-admission" "A CDP-enabled session completes initialization only after external readiness and ownership proof." {
      mcpCaller -> bridge.bridgeProcess.admission "1. Initialize; HTTP metadata may explicitly enable, disable, or inherit"
      bridge.bridgeProcess.admission -> bridge.bridgeProcess.configuration "2. Resolve CLI over environment and compute the effective session value"
      bridge.bridgeProcess.configuration -> bridge.bridgeProcess.allocator "3. Validate pool, hosts, scheme, remote gate, and raw arguments"
      bridge.bridgeProcess.allocator -> bridge.bridgeProcess.httpProxy "4. Atomically bind the lowest available external plaintext listener"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "5. Create the initial owner with a reserved loopback debugging port"
      bridge.bridgeProcess.generationOwner -> bridge.upstreamChild "6. Spawn the child and call browser_tabs(action=list)"
      bridge.bridgeProcess.discovery -> bridge.chromium "7. Match identity and consume the one-use ownership challenge"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "8. Publish a fresh capability only after readiness"
      bridge.bridgeProcess.httpProxy -> bridge.chromium "9. Verify rewritten /json/version/ and WebSocket reachability"
      bridge.bridgeProcess.admission -> mcpCaller "10. Complete initialize before the absolute 60-second deadline"
      autolayout lr
    }

    dynamic bridge "cdp-https-request" "HTTPS/WSS is advertised by the bridge but terminated only by an operator-owned component." {
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "1. Publish https/wss URLs while the owned listener remains plaintext"
      cdpClient -> tlsTerminator "2. Connect with the capability URL over TLS on the advertised leased port"
      tlsTerminator -> bridge.bridgeProcess.httpProxy "3. Preserve Host, Origin authority, port, path, and one-to-one session routing"
      bridge.bridgeProcess.httpProxy -> bridge.chromium "4. Forward only an accepted request over loopback plaintext CDP"
      autolayout lr
    }

    dynamic bridge "cdp-local-rejection" "Invalid requests and upgrades are rejected before Chromium with bounded redacted semantics." {
      cdpClient -> bridge.bridgeProcess.httpProxy "1. Send an invalid or unavailable request or upgrade"
      bridge.bridgeProcess.httpProxy -> cdpClient "2. Return a typed HTTP envelope or fixed post-upgrade WebSocket close"
      autolayout lr
    }

    dynamic bridge "cdp-generation-replacement" "Browser loss starts no child; the first later browser tool shares one bounded restart before exact-once forwarding." {
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "1. On browser loss mark unavailable, reject the old capability, and close old sockets"
      mcpCaller -> bridge.bridgeProcess.admission "2. Invoke the first later browser tool; concurrent callers may join"
      bridge.bridgeProcess.admission -> bridge.bridgeProcess.coordinator "3. Enter or join the session restart single-flight"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "4. Make the old child unreachable and complete bounded owner cleanup"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "5. Create one replacement owner with the same session configuration and a fresh internal port"
      bridge.bridgeProcess.generationOwner -> bridge.upstreamChild "6. Connect the replacement child and perform browser_tabs bootstrap"
      bridge.bridgeProcess.discovery -> bridge.chromium "7. Verify replacement ownership and external readiness"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "8. Increment generation and publish a fresh capability"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "9. Forward each waiting browser tool exactly once"
      bridge.bridgeProcess.admission -> mcpCaller "10. Return each upstream success or failure unchanged"
      autolayout lr
    }

    dynamic bridge "cdp-session-cleanup" "Cleanup cancels restart and closes external reachability before returning the port to the process-local pool." {
      mcpCaller -> bridge.bridgeProcess.admission "1. DELETE, stdio EOF, signal, or idle expiry starts shutdown"
      bridge.bridgeProcess.admission -> bridge.bridgeProcess.coordinator "2. Stop admission, cancel restart, and invalidate capability"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.webSocketProxy "3. Close generation sockets with 1001/going_away"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.httpProxy "4. Close the external listener after the graceful budget"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.generationOwner "5. Dispose the current or provisional owner"
      bridge.bridgeProcess.coordinator -> bridge.bridgeProcess.allocator "6. Release the external lease exactly once"
      autolayout lr
    }

    styles {
      element "Person" {
        shape person
      }
      element "Software System" {
        background #355c7d
        color #ffffff
      }
      element "Container" {
        background #4f7cac
        color #ffffff
      }
      element "Component" {
        background #6c9bcf
        color #ffffff
      }
    }
  }

  properties {
    "requirements" "CDP-001,CDP-002,CDP-003,CDP-004,CDP-005,CDP-006,CDP-007,CDP-008,CDP-009,CDP-010,CDP-011,CDP-012,CDP-013,CDP-014,CDP-015"
    "sourceVersion" "2188bfd27a0e17211a046f2653cd820636ce6cf36bf3d0a3593a12552c03efcf"
    "specificationVersion" "d8e7076dc352609d000ebb95568ad104aae6e4b84ce145113dfbdc285d9d5a58"
    "reviewRef" "f008baec-bf84-4454-88db-dab9801e85df"
  }
}
