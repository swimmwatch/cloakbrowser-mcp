---
title: Humanized Input Behavior
description: Enable CloakBrowser human-like mouse, keyboard, and scroll behavior for interaction-sensitive QA and Streamable HTTP sessions.
icon: material/gesture-tap
tags:
  - Configuration
  - Humanize
  - User Guide
---

# Humanized Input Behavior

Humanized input behavior routes page interactions through CloakBrowser's
human-like mouse, keyboard, and scroll layer. It is useful when QA needs more
realistic pacing, pointer movement, typing cadence, and scroll behavior than
standard automation provides.

The bridge does not add new browser tools or change upstream Playwright MCP
schemas. It applies CloakBrowser's page interaction patch during Playwright MCP
page initialization, so existing tools continue to work with the same inputs.

## What It Changes

When `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`, CloakBrowser can humanize common page
actions, including:

- mouse movement and clicks;
- keyboard typing and key presses;
- form filling and field switching;
- scrolling and scroll-to-element behavior.

This affects interaction timing and movement patterns. It does not change page
content, network routing, proxy settings, or browser geolocation.

## Global Setup

Use the environment variable when every stdio session or default Streamable HTTP
session should use humanized behavior:

```bash
CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
npx -y cloakbrowser-mcp@latest
```

The same setting works with the explicit CLI flag:

```bash
npx -y cloakbrowser-mcp@latest --humanize --human-preset careful
```

## Docker Setup

Pass the same environment variable to the container:

```bash
docker run --rm --init -i \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest
```

For Streamable HTTP in Docker, the environment variable becomes the default for
new HTTP sessions:

```bash
docker run --rm --init -p 127.0.0.1:3000:3000 \
  -e CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true \
  -e CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET=careful \
  -v "$PWD/artifacts:/data" \
  swimmwatch/cloakbrowser-mcp:latest \
  --transport streamable-http --http-host 0.0.0.0 --http-port 3000
```

## Per-Session Streamable HTTP Setup

Streamable HTTP clients can choose humanized behavior at MCP session
initialization time. This lets one server compare standard and humanized
interaction behavior without being restarted.

Send bridge metadata in the `initialize` request:

```json
{
  "params": {
    "_meta": {
      "io.github.swimmwatch/cloakbrowser-mcp": {
        "humanize": true,
        "humanPreset": "careful"
      }
    }
  }
}
```

`humanize` overrides the process-level setting for that HTTP session. Use
`true` to enable humanized behavior or `false` to disable it even when the
server was started with `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.

`humanPreset` accepts `default` or `careful` and selects the CloakBrowser human
behavior preset for the session. It does not enable humanized behavior by
itself; set `humanize: true` or enable `CLOAK_PLAYWRIGHT_MCP_HUMANIZE=true`.
The `careful` preset is slower and more cautious than `default`.

Existing HTTP sessions are immutable. Create another Streamable HTTP session to
switch between standard and humanized behavior.

## Use Cases

<div class="grid cards" markdown>

- :material-form-textbox: **Form QA**

  Exercise typing, filling, focus changes, and validation flows with more
  realistic keyboard cadence.

- :material-cart-check: **Checkout flows**

  Test interaction-heavy purchase paths where typing, clicking, and field
  switching timing can affect client-side validation.

- :material-shield-search: **Interaction-sensitive UI checks**

  Compare standard automation against humanized interaction when a page reacts
  differently to very fast or perfectly linear inputs.

- :material-mouse-scroll-wheel: **Scroll-heavy pages**

  Validate long pages, feeds, product lists, and lazy-loading content with
  smoother scroll behavior.

- :material-presentation-play: **Demos and recordings**

  Produce browser sessions that look less mechanical during product demos,
  walkthroughs, or recorded QA evidence.

</div>

## Precedence And Limits

| Area | Behavior |
| --- | --- |
| Stdio | Uses process-level environment variables and CLI flags only. |
| Streamable HTTP default | Uses process-level environment variables and CLI flags when no runtime metadata is provided. |
| Streamable HTTP metadata | `initialize.params._meta["io.github.swimmwatch/cloakbrowser-mcp"].humanize` can override humanized behavior for one session. `humanPreset` can select `default` or `careful`. |
| Existing sessions | Keep the humanize setting captured during `initialize`. |
| Browser engine | Applies only when `PLAYWRIGHT_MCP_BROWSER_ENGINE=cloak`. |
| Tool schemas | Upstream Playwright MCP browser tool schemas remain unchanged. |
| Custom config | `humanConfig` is intentionally not accepted yet; structured config needs an explicit validation schema. |

This feature is intended for legitimate QA, interaction realism, and consistency
testing. It should not be treated as a way to bypass access controls or policy
checks.

## Related Configuration

- [Configuration](configuration.md) lists all bridge and upstream environment variables.
- [GeoIP Proxy Matching](geoip-proxy-matching.md) explains region-consistent proxy profiles.
- [Tools](tools.md) explains why upstream Playwright MCP browser tools are forwarded unchanged.
