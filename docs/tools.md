# Tools

All tools are exposed via MCP. Inputs are validated with `zod`; outputs are either text content or a JSON payload, both wrapped as MCP content blocks. Every tool that mutates browser state surfaces a `pageId` in its output so the agent can track which page was affected.

The `pageId` argument is optional everywhere. When omitted, the server uses the most recently used page (or, for navigation, opens a new page on demand).

--8<-- ".generated-docs/playwright-mcp-target.md"

## Lifecycle

### `browser_get_config`

Returns the effective server configuration with secrets redacted. Does **not** launch a browser. Useful as a first call from any agent to discover capabilities, timeouts, and origin policy.

- Input: `{}`
- Output: JSON with `headless`, `outputDir`, `defaultTimeoutMs`, `navigationTimeoutMs`, `maxPages`, `maxContexts`, `logLevel`, `allowedOrigins`, `blockedOrigins`, `capabilities`, `hasUserDataDir`, `hasBrowserExecutablePath`.
- Hints: read-only, idempotent.

### `cloakbrowser_binary_info`

Reports CloakBrowser package presence, version, and binary download status.

- Input: `{}`
- Output: JSON from the active `BrowserAdapter.binaryInfo()`.
- Hints: read-only, idempotent.

### `browser_tabs`

List, create, select, or close pages.

- Input: `{ action: 'list' | 'new' | 'select' | 'close' (default 'list'), pageId?: string, index?: number, url?: string }`
- Output: For `list`, JSON `{ pages: [...] }`; for the others, a text result with the affected `pageId`.
- Compatibility notes: Playwright MCP uses `index` for `select` / `close` and `url` for `new`; both are supported. `pageId` is an additional stable handle exposed by this server.

### `browser_close`

Close a single page or the entire browser.

- Input: `{ scope: 'page' | 'browser' (default 'browser'), pageId?: string }`
- Output: text result.
- Hints: destructive.
- Compatibility notes: Playwright MCP exposes this tool with no input and closes the browser. `scope: 'page'` and `pageId` are project extensions for callers that want narrower cleanup.

## Navigation

### `browser_navigate`

Navigate the current (or specified) page to a URL. The URL is validated against the [origin policy](configuration.md#origin-policy) before the page is opened.

- Input: `{ url: string (must be a valid URL), pageId?: string, waitUntil?: 'load' | 'domcontentloaded' | 'networkidle', timeoutMs?: number }`
- Output: text result with `pageId` and resulting `url`.

### `browser_navigate_back`

Navigate the page back in history.

- Input: `{ pageId?: string, timeoutMs?: number }`
- Output: text result with `pageId` and current `url`.

### `browser_wait_for`

Wait for a selector, visible text, text disappearance, or a fixed timeout. At least one of `selector`, `text`, `textGone`, `time`, or `timeoutMs` is required.

- Input: `{ pageId?, selector?, text?, textGone?, time?: number, state?: 'visible' | 'hidden' | 'attached' | 'detached', timeoutMs? }`
- Output: text result.
- Hints: read-only.
- Compatibility notes: Playwright MCP uses `time` in seconds plus `text` / `textGone`; `timeoutMs` and selector states are project extensions.

## Inspection

### `browser_snapshot`

Capture an accessibility snapshot of the page as a compact, flattened outline (role, name, value, selector hint, depth). Optimised for LLM consumption — does **not** return the DOM. Defaults to a max of 500 nodes; truncation is reported in the response.

- Input: `{ pageId?, target?: string, filename?: string, depth?: number, boxes?: boolean, maxNodes?: number (1..5000) }`
- Output: JSON `{ pageId, url, title, truncated, nodes: [...] }`.
- Hints: read-only.
- Compatibility notes: `target`, `filename`, `depth`, and `boxes` match Playwright MCP's schema. `target` waits for the matching selector before capturing. `filename` writes a JSON artifact. `boxes` is accepted for schema compatibility and reported as `boxesRequested`; bounding boxes are not emitted yet.

### `browser_console_messages`

Return buffered console messages for the page. Pass `clear: true` to drain the buffer.

- Input: `{ pageId?, level?: 'error' | 'warning' | 'info' | 'debug' (default 'info'), all?: boolean, filename?: string, clear?: boolean }`
- Output: JSON `{ pageId, messages: [...] }`.
- Hints: read-only.
- Compatibility notes: `level`, `all`, and `filename` mirror Playwright MCP. The current implementation keeps a per-page rolling buffer; `all` is accepted but does not widen beyond that buffer. `filename` writes a text artifact.

### `browser_evaluate`

Evaluate JavaScript on the current page or on a target element.

- Input: `{ pageId?, element?: string, target?: string, function: string, filename?: string }`
- Output: text result, or an artifact reference when `filename` is provided.
- Compatibility notes: matches Playwright MCP's unsafe page/element evaluation contract. `target` is optional for page-level evaluation.

### `browser_network_requests`

Return a numbered list of network requests captured for the page.

- Input: `{ pageId?, static?: boolean (default false), filter?: string, filename?: string }`
- Output: text list, or an artifact reference when `filename` is provided.
- Hints: read-only.

### `browser_network_request`

Return full details for one network request, or one request/response part.

- Input: `{ pageId?, index: number, part?: 'request-headers' | 'request-body' | 'response-headers' | 'response-body', filename?: string }`
- Output: text or JSON-formatted text, or an artifact reference when `filename` is provided.
- Hints: read-only.

### `browser_network_route`

Add or clear a page-scoped network route. Routes can block, continue, or fulfill matching requests.

- **Capability gate:** `allowNetworkInterception` (off by default).
- Input: `{ pageId?, action: 'block' | 'continue' | 'fulfill' | 'clear', url?: string, id?: string, status?: number, contentType?: string, body?: string, headers?: Record<string, string> }`
- Output: JSON route metadata for new routes, or text result with the number of cleared routes.
- Compatibility notes: `url` is passed to the backend routing API. For Playwright-compatible backends this can be a glob-like string such as `**/*.png`. `action: 'clear'` clears all routes unless `id` is provided.

### `browser_har_save`

Save captured page network traffic as a HAR artifact.

- **Capability gate:** `allowDevtoolsExperimental` (off by default).
- Input: `{ pageId?, filename?: string }`
- Output: JSON `{ pageId, artifact }`.
- Hints: read-only.

## Verification

### `browser_verify_text`

Verify that page text is present or absent. This is a read-only convenience wrapper around the page wait behavior.

- Input: `{ pageId?, text: string, present?: boolean (default true), timeoutMs?: number }`
- Output: text result, or an `ASSERTION_FAILED` / `TIMEOUT` error response.
- Hints: read-only.

### `browser_verify_selector_count`

Verify how many elements match a selector.

- Input: `{ pageId?, selector: string, count?: number, min?: number, max?: number }`
- Output: JSON `{ pageId, selector, count }`, or an `ASSERTION_FAILED` error response.
- Hints: read-only.

### `browser_verify_url`

Verify the current page URL by exact match, substring, or regex.

- Input: `{ pageId?, url?: string, contains?: string, regex?: string }`
- Output: JSON `{ pageId, url }`, or an `ASSERTION_FAILED` error response.
- Hints: read-only.

## Interaction

### `browser_click`

Click an element by CSS selector.

- Input: `{ pageId?, selector?: string, target?: string, element?: string, button?: 'left' | 'right' | 'middle', clickCount?: 1..3, doubleClick?: boolean, modifiers?: ('Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift')[], timeoutMs? }`
- Output: text result.
- Compatibility notes: Playwright MCP sends `target`, `element`, `doubleClick`, `button`, and `modifiers`; all are accepted. `selector`, `clickCount`, `pageId`, and `timeoutMs` are project extensions.

### `browser_hover`

Hover over an element by CSS selector.

- Input: `{ pageId?, selector?: string, target?: string, element?: string, timeoutMs? }`
- Output: text result.

### `browser_drag`

Perform drag and drop between two elements.

- Input: `{ pageId?, startSelector?: string, startTarget?: string, startElement?: string, endSelector?: string, endTarget?: string, endElement?: string, timeoutMs? }`
- Output: text result.
- Compatibility notes: Playwright MCP sends `startTarget`, `startElement`, `endTarget`, and `endElement`; all are accepted. `startSelector`, `endSelector`, `pageId`, and `timeoutMs` are project extensions.

### `browser_drop`

Drop files or MIME-typed data onto an element, as if dragged from outside the page.

- Input: `{ pageId?, element?: string, target: string, selector?: string, paths?: string[], data?: Record<string, string> }`
- Output: text result.
- Compatibility notes: at least one of `paths` or `data` must be provided. File paths are read by the server process and converted to browser `File` objects.

### `browser_resize`

Resize the browser viewport.

- Input: `{ pageId?, width: number, height: number }`
- Output: text result with the affected `pageId`, `width`, and `height`.
- Compatibility notes: `width` and `height` match Playwright MCP. `pageId` is a project extension.

### `browser_type`

Type text into an input. `replace` defaults to `true` (replaces the field's value); when `false`, types sequentially. `pressEnter` optionally presses Enter at the end.

- Input: `{ pageId?, selector?: string, target?: string, element?: string, text: string, replace?: boolean, pressEnter?: boolean, submit?: boolean, slowly?: boolean, timeoutMs? }`
- Output: text result.
- Compatibility notes: Playwright MCP sends `target`, `element`, `text`, `submit`, and `slowly`; all are accepted. `slowly: true` maps to sequential typing. `replace`, `pressEnter`, `pageId`, and `timeoutMs` are project extensions.

### `browser_press_key`

Press a keyboard key using Playwright key syntax (e.g. `"Enter"`, `"Control+A"`).

- Input: `{ pageId?, key: string }`
- Output: text result.

### `browser_select_option`

Select one or more options on a `<select>` element.

- Input: `{ pageId?, selector?: string, target?: string, element?: string, values: string[] (≥1), timeoutMs? }`
- Output: JSON `{ pageId, selected: [...] }`.

### `browser_fill_form`

Fill multiple form fields in a single call.

- Input: `{ pageId?, fields: [{ selector?: string, target?: string, element?: string, name?: string, type?: 'textbox' | 'checkbox' | 'radio' | 'combobox' | 'slider', value: string }, ...] (≥1), timeoutMs? }`
- Output: text result with the field count.
- Compatibility notes: Playwright MCP requires `target`, `name`, `type`, and `value`. This server requires a locator in `selector` or `target`; `name` and `type` are accepted as metadata. Textboxes and combobox-like fields are filled through the browser backend. Checkbox/radio/slider-specific behavior is deferred until those state changes can be tested against CloakBrowser without broadening the mutation surface.

### `browser_file_upload`

Upload one or multiple files through the currently pending file chooser.

- Input: `{ pageId?, paths?: string[] }`
- Output: text result.
- Compatibility notes: if `paths` is omitted, the pending file chooser is cancelled. A previous action must have opened a file chooser.

### `browser_handle_dialog`

Pre-arm a decision (accept / dismiss + optional prompt text) for the **next** dialog raised by the page. Must be called before the action that triggers the dialog.

- Input: `{ pageId?, accept: boolean, promptText?: string }`
- Output: text result.
- Compatibility notes: the input schema matches Playwright MCP, but the call order intentionally differs. Playwright MCP handles modal state after a dialog appears; this server pre-arms the decision before the triggering action so browser actions do not hang while a dialog is open.

### `browser_run_code_unsafe`

Run a Playwright code function with the current Playwright page object.

- Input: `{ pageId?, code?: string, filename?: string }`
- Output: text result.
- Compatibility notes: if both `code` and `filename` are provided, `filename` is loaded and used. This executes JavaScript in the server process and is RCE-equivalent.

## Coordinate Input

These tools bypass selector/accessibility targeting and operate on page coordinates.

### `browser_mouse_click`

- **Capability gate:** `allowCoordinateInput` (off by default).
- Input: `{ pageId?, x: number, y: number, button?: 'left' | 'right' | 'middle', clickCount?: number }`
- Output: text result.

### `browser_mouse_move`

- **Capability gate:** `allowCoordinateInput` (off by default).
- Input: `{ pageId?, x: number, y: number, steps?: number }`
- Output: text result.

### `browser_mouse_drag`

- **Capability gate:** `allowCoordinateInput` (off by default).
- Input: `{ pageId?, startX: number, startY: number, endX: number, endY: number, steps?: number }`
- Output: text result.

### `browser_mouse_wheel`

- **Capability gate:** `allowCoordinateInput` (off by default).
- Input: `{ pageId?, deltaX?: number, deltaY?: number }`
- Output: text result.

## Storage

### `browser_set_cookies`

Set one or more browser-context cookies.

- **Capability gate:** `allowStorageMutation` (off by default).
- Input: `{ pageId?, cookies: [{ name, value, url?, domain?, path?, expires?, httpOnly?, secure?, sameSite? }] }`
- Output: text result with cookie count.

### `browser_clear_storage`

Clear cookies, localStorage, and/or sessionStorage for the current page context.

- **Capability gate:** `allowStorageMutation` (off by default).
- Input: `{ pageId?, cookies?: boolean, localStorage?: boolean, sessionStorage?: boolean }`
- Output: text result.
- Hints: destructive.

## Screenshots

### `browser_take_screenshot`

Capture a PNG or JPEG screenshot of the page or a single element and write it to the [artifact directory](configuration.md#core-options).

- **Capability gate:** `allowScreenshots` (on by default).
- Input: `{ pageId?, selector?: string, target?: string, element?: string, fullPage?: boolean, format?: 'png' | 'jpeg', type?: 'png' | 'jpeg', filename?: string }`
- Output: JSON `{ pageId, artifact: { path, relativePath, bytes, contentType, createdAt } }`.
- `filename` is sanitised: absolute paths and `..` traversal are rejected; only the basename is used.
- Compatibility notes: Playwright MCP sends `target`, `element`, `type`, `filename`, and `fullPage`; all are accepted. `selector`, `format`, and `pageId` are project extensions.

### `browser_pdf_save`

Save the current page as a PDF artifact.

- **Capability gate:** `allowPdf` (off by default).
- Input: `{ pageId?, filename?: string, format?: string (default 'A4'), landscape?: boolean, printBackground?: boolean }`
- Output: JSON `{ pageId, artifact }`.

## DevTools Artifacts

### `browser_trace_start`

Start backend tracing for the browser context.

- **Capability gate:** `allowDevtoolsExperimental` (off by default).
- Input: `{ screenshots?: boolean, snapshots?: boolean, sources?: boolean }`
- Output: text result.

### `browser_trace_stop`

Stop backend tracing and save the trace as an artifact.

- **Capability gate:** `allowDevtoolsExperimental` (off by default).
- Input: `{ filename?: string }`
- Output: JSON `{ artifact }`.

### `browser_video_save`

Save the backend page video artifact when video recording is available.

- **Capability gate:** `allowDevtoolsExperimental` (off by default).
- Input: `{ pageId?, filename?: string }`
- Output: JSON `{ pageId, artifact }`.
- Compatibility notes: real-browser support depends on the backend page having video recording enabled. If the backend cannot provide a video, the tool returns `UNSUPPORTED`.

## Maintenance

### `cloakbrowser_install_binary`

Install or repair the CloakBrowser browser binary by invoking the installed CloakBrowser CLI.

- **Capability gate:** `allowBinaryInstall` (off by default).
- Input: `{}`
- Output: JSON from the active `BrowserAdapter.installBinary()`.

## Playwright MCP compatibility

--8<-- ".generated-docs/playwright-mcp-comparison.md"

| Category | Tools |
| --- | --- |
| Implemented with the same tool name | `browser_click`, `browser_close`, `browser_console_messages`, `browser_drag`, `browser_drop`, `browser_evaluate`, `browser_file_upload`, `browser_fill_form`, `browser_handle_dialog`, `browser_hover`, `browser_navigate`, `browser_navigate_back`, `browser_network_request`, `browser_network_requests`, `browser_press_key`, `browser_resize`, `browser_run_code_unsafe`, `browser_select_option`, `browser_snapshot`, `browser_tabs`, `browser_take_screenshot`, `browser_type`, `browser_wait_for` |
| Project-specific default additions | `browser_get_config`, `cloakbrowser_binary_info`, `browser_verify_text`, `browser_verify_selector_count`, `browser_verify_url` |
| Project-specific capability-gated additions | `browser_pdf_save`, `browser_set_cookies`, `browser_clear_storage`, `browser_network_route`, `browser_har_save`, `browser_trace_start`, `browser_trace_stop`, `browser_video_save`, `browser_mouse_click`, `browser_mouse_move`, `browser_mouse_drag`, `browser_mouse_wheel`, `cloakbrowser_install_binary` |

The shared tool schemas are compatible with Playwright MCP's primary inputs. Outputs remain project-native JSON/text payloads rather than Playwright MCP's Markdown/codegen format, because this server treats artifact metadata and page handles as stable structured data.

## Rejected aliases

The following non-Playwright alias names are rejected at registration time:

- `browser_eval`
- `cloakbrowser_evaluate`

See [Configuration → Capability flags](configuration.md#capability-flags) for the generated list of gated tools and their deployment implications.
