import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { CloakMcpError } from '@/errors/index.js';
import type { ResolvedConfig } from '@/config/schema.js';
import type {
  AccessibilityNode,
  BrowserAdapter,
  ClickOptions,
  ClearStorageOptions,
  ConsoleEntry,
  CookieSpec,
  DialogDecision,
  DropPayload,
  FillFormField,
  MouseClickOptions,
  MouseDragOptions,
  MouseMoveOptions,
  MouseWheelOptions,
  NavigateOptions,
  NetworkRouteInfo,
  NetworkRouteRule,
  NetworkRequestRecord,
  PageAdapter,
  PdfOptions,
  ScreenshotOptions,
  SelectOptions,
  TraceOptions,
  TypeOptions,
  WaitForOptions,
} from './adapter.js';

const execFileAsync = promisify(execFile);
const requireFromHere = createRequire(import.meta.url);

/**
 * Minimal Playwright surface we depend on. Typed loosely so this file compiles
 * without a hard dependency on `playwright-core` at consumer-install time.
 */
type AnyFn = (...args: unknown[]) => unknown;
interface PwLocator {
  click: AnyFn;
  hover: AnyFn;
  dragTo?: AnyFn;
  dispatchEvent?: AnyFn;
  evaluate?: AnyFn;
  fill: AnyFn;
  pressSequentially: AnyFn;
  selectOption: AnyFn;
  waitFor: AnyFn;
  textContent?: AnyFn;
}
interface PwAccessibility {
  snapshot(opts?: unknown): Promise<unknown>;
}
interface PwKeyboard {
  press(key: string): Promise<void>;
}
interface PwMouse {
  click(x: number, y: number, opts?: unknown): Promise<void>;
  move(x: number, y: number, opts?: unknown): Promise<void>;
  down(opts?: unknown): Promise<void>;
  up(opts?: unknown): Promise<void>;
  wheel?(deltaX: number, deltaY: number): Promise<void>;
}
interface PwDialog {
  type(): string;
  message(): string;
  defaultValue(): string;
  accept(text?: string): Promise<void>;
  dismiss(): Promise<void>;
}
interface PwConsoleMessage {
  type(): string;
  text(): string;
}
interface PwRequest {
  url(): string;
  method(): string;
  resourceType(): string;
  headers(): Record<string, string>;
  allHeaders?: () => Promise<Record<string, string>>;
  postData?: () => string | null;
}
interface PwResponse {
  request(): PwRequest;
  status(): number;
  statusText(): string;
  headers(): Record<string, string>;
  allHeaders?: () => Promise<Record<string, string>>;
  body?: () => Promise<Uint8Array>;
}
interface PwFileChooser {
  setFiles(files: string | string[]): Promise<void>;
}
interface PwHandle {
  dispose?: () => Promise<void>;
}
interface PwRoute {
  request(): PwRequest;
  abort(errorCode?: string): Promise<void>;
  continue(opts?: unknown): Promise<void>;
  fulfill(opts?: unknown): Promise<void>;
}
interface PwVideo {
  saveAs(path: string): Promise<void>;
}
interface PwPage {
  url(): string;
  title(): Promise<string>;
  evaluate: AnyFn;
  evaluateHandle: AnyFn;
  goto: AnyFn;
  goBack: AnyFn;
  waitForSelector: AnyFn;
  waitForFunction: AnyFn;
  waitForTimeout: AnyFn;
  locator(sel: string): PwLocator;
  accessibility?: PwAccessibility;
  keyboard: PwKeyboard;
  mouse: PwMouse;
  screenshot(opts?: unknown): Promise<Uint8Array>;
  pdf?: (opts?: unknown) => Promise<Uint8Array>;
  setViewportSize?: AnyFn;
  route?: (url: string | RegExp, handler: (route: PwRoute) => Promise<void> | void) => Promise<void>;
  unroute?: (url: string | RegExp, handler?: (route: PwRoute) => Promise<void> | void) => Promise<void>;
  video?: () => PwVideo | null;
  isClosed(): boolean;
  close(opts?: unknown): Promise<void>;
  on(event: string, cb: (...a: unknown[]) => void): void;
  off(event: string, cb: (...a: unknown[]) => void): void;
  once(event: string, cb: (...a: unknown[]) => void): void;
}
interface PwBrowserContext {
  newPage(): Promise<PwPage>;
  pages(): PwPage[];
  addCookies?: (cookies: CookieSpec[]) => Promise<void>;
  clearCookies?: () => Promise<void>;
  tracing?: {
    start(opts?: unknown): Promise<void>;
    stop(opts?: unknown): Promise<void>;
  };
  close(): Promise<void>;
  on(event: string, cb: (...a: unknown[]) => void): void;
}
interface PwBrowser {
  newContext(opts?: unknown): Promise<PwBrowserContext>;
  close(): Promise<void>;
  isConnected(): boolean;
  version(): string;
}

interface CloakModule {
  launch?: (opts?: unknown) => Promise<PwBrowser>;
  launchContext?: (opts?: unknown) => Promise<PwBrowserContext>;
}

let pageIdCounter = 0;
const nextPageId = () => `cp${++pageIdCounter}`;

interface InternalNetworkRequestRecord extends NetworkRequestRecord {
  responseBodyPromise?: Promise<string | null>;
}

interface PwFailedRequest extends PwRequest {
  failure?: () => { errorText?: string } | null;
}

class NetworkLog {
  private readonly entries: InternalNetworkRequestRecord[] = [];
  private readonly byRequest = new WeakMap<object, InternalNetworkRequestRecord>();
  private nextIndex = 1;

  constructor(private readonly maxEntries = 1_000) {}

  recordRequest(request: PwRequest): InternalNetworkRequestRecord {
    const existing = this.byRequest.get(request as unknown as object);
    if (existing) return existing;

    const entry: InternalNetworkRequestRecord = {
      index: this.nextIndex,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      requestHeaders: request.headers(),
      requestBody: request.postData?.() ?? null,
    };
    this.nextIndex += 1;
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) this.entries.shift();
    this.byRequest.set(request as unknown as object, entry);

    if (request.allHeaders) {
      void request.allHeaders().then((headers) => {
        entry.requestHeaders = headers;
      });
    }
    return entry;
  }

  recordResponse(response: PwResponse): void {
    const entry = this.entryForRequest(response.request());
    entry.status = response.status();
    entry.statusText = response.statusText();
    entry.responseHeaders = response.headers();
    if (response.allHeaders) {
      void response.allHeaders().then((headers) => {
        entry.responseHeaders = headers;
      });
    }
    if (response.body) {
      entry.responseBodyPromise = response
        .body()
        .then((body) => Buffer.from(body).toString('utf8'))
        .catch((e: unknown) => `/* unable to read response body: ${(e as Error).message} */`);
    }
  }

  markFailed(request: PwFailedRequest): void {
    const entry = this.entryForRequest(request);
    entry.failureText = request.failure?.()?.errorText ?? 'request failed';
  }

  async list(): Promise<NetworkRequestRecord[]> {
    return await Promise.all(this.entries.map((entry) => materializeNetworkRecord(entry)));
  }

  async get(index: number): Promise<NetworkRequestRecord> {
    const entry = this.entries.find((request) => request.index === index);
    if (!entry) throw new CloakMcpError('NOT_FOUND', `network request not found: ${index}`);
    return await materializeNetworkRecord(entry);
  }

  private entryForRequest(request: PwRequest): InternalNetworkRequestRecord {
    return this.byRequest.get(request as unknown as object) ?? this.recordRequest(request);
  }
}

class CloakPage implements PageAdapter {
  readonly id = nextPageId();
  private readonly console_: ConsoleEntry[] = [];
  private readonly network = new NetworkLog();
  private readonly routes = new Map<string, { url: string; handler: (route: PwRoute) => Promise<void> }>();
  private routeCounter = 0;
  private pendingFileChooser: PwFileChooser | undefined;
  private pendingDialog: DialogDecision | undefined;
  private readonly maxConsole = 500;

  constructor(
    private readonly pw: PwPage,
    private readonly context: PwBrowserContext,
    private readonly defaultTimeoutMs: number,
  ) {
    pw.on('console', (...args: unknown[]) => {
      const msg = args[0] as PwConsoleMessage | undefined;
      if (!msg) return;
      this.console_.push({ type: msg.type(), text: msg.text(), ts: Date.now() });
      if (this.console_.length > this.maxConsole) this.console_.shift();
    });
    pw.on('request', (...args: unknown[]) => {
      const request = args[0] as PwRequest | undefined;
      if (request) this.network.recordRequest(request);
    });
    pw.on('response', (...args: unknown[]) => {
      const response = args[0] as PwResponse | undefined;
      if (response) this.network.recordResponse(response);
    });
    pw.on('requestfailed', (...args: unknown[]) => {
      const request = args[0] as PwFailedRequest | undefined;
      if (request) this.network.markFailed(request);
    });
    pw.on('filechooser', (...args: unknown[]) => {
      this.pendingFileChooser = args[0] as PwFileChooser | undefined;
    });
    pw.on('dialog', (...args: unknown[]) => {
      const dlg = args[0] as PwDialog | undefined;
      if (!dlg) return;
      const decision = this.pendingDialog;
      this.pendingDialog = undefined;
      // Default: dismiss to avoid hanging. Caller should pre-arm with prepareNextDialog.
      if (!decision || !decision.accept) void dlg.dismiss();
      else void dlg.accept(decision.promptText);
    });
  }

  url = (): string => this.pw.url();
  title = (): Promise<string> => this.pw.title();

  private timeout(opts?: { timeoutMs?: number }): number {
    return opts?.timeoutMs ?? this.defaultTimeoutMs;
  }

  async goto(url: string, opts?: NavigateOptions): Promise<void> {
    await this.pw.goto(url, { timeout: this.timeout(opts), waitUntil: opts?.waitUntil ?? 'load' });
  }

  async goBack(opts?: NavigateOptions): Promise<void> {
    await this.pw.goBack({ timeout: this.timeout(opts), waitUntil: opts?.waitUntil ?? 'load' });
  }

  async waitFor(opts: WaitForOptions): Promise<void> {
    const timeout = this.timeout(opts);
    if (opts.selector) {
      await this.pw.locator(opts.selector).waitFor({ state: opts.state ?? 'visible', timeout });
      return;
    }
    if (opts.text) {
      await this.pw.waitForFunction(bodyTextIncludes, opts.text, { timeout });
      return;
    }
    if (opts.textGone) {
      await this.pw.waitForFunction(bodyTextDoesNotInclude, opts.textGone, { timeout });
      return;
    }
    await this.pw.waitForTimeout(timeout);
  }

  async click(opts: ClickOptions): Promise<void> {
    await this.pw.locator(opts.selector).click({
      button: opts.button ?? 'left',
      clickCount: opts.clickCount ?? 1,
      modifiers: opts.modifiers,
      timeout: this.timeout(opts),
    });
  }

  async hover(selector: string, timeoutMs?: number): Promise<void> {
    await this.pw.locator(selector).hover({ timeout: timeoutMs ?? this.defaultTimeoutMs });
  }

  async drag(startSelector: string, endSelector: string, timeoutMs?: number): Promise<void> {
    const source = this.pw.locator(startSelector);
    if (typeof source.dragTo !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'drag is not supported by the installed browser backend');
    }
    await source.dragTo(this.pw.locator(endSelector), { timeout: timeoutMs ?? this.defaultTimeoutMs });
  }

  async resize(width: number, height: number): Promise<void> {
    if (typeof this.pw.setViewportSize !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'resize is not supported by the installed browser backend');
    }
    await this.pw.setViewportSize({ width, height });
  }

  async type(opts: TypeOptions): Promise<void> {
    const loc = this.pw.locator(opts.selector);
    if (opts.replace !== false) {
      await loc.fill(opts.text, { timeout: this.timeout(opts) });
    } else {
      await loc.pressSequentially(opts.text, { timeout: this.timeout(opts) });
    }
    if (opts.pressEnter) await this.pw.keyboard.press('Enter');
  }

  async pressKey(key: string): Promise<void> {
    await this.pw.keyboard.press(key);
  }

  async selectOption(opts: SelectOptions): Promise<string[]> {
    const res = await this.pw
      .locator(opts.selector)
      .selectOption(opts.values, { timeout: this.timeout(opts) });
    return Array.isArray(res) ? (res as string[]) : [String(res)];
  }

  async fillForm(fields: FillFormField[], timeoutMs?: number): Promise<void> {
    for (const f of fields) {
      await this.pw.locator(f.selector).fill(f.value, { timeout: timeoutMs ?? this.defaultTimeoutMs });
    }
  }

  async evaluate(fn: string, targetSelector?: string): Promise<unknown> {
    if (targetSelector) {
      const locator = this.pw.locator(targetSelector);
      if (typeof locator.evaluate !== 'function') {
        throw new CloakMcpError(
          'UNSUPPORTED',
          'element evaluation is not supported by the installed backend',
        );
      }
      return await locator.evaluate(fn);
    }
    return await this.pw.evaluate(fn);
  }

  async runCodeUnsafe(code: string): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- this implements the explicit unsafe code tool.
    const compiled = new Function('page', `return (${code})(page);`) as (page: PwPage) => unknown;
    return await compiled(this.pw);
  }

  async uploadFiles(paths?: string[]): Promise<void> {
    const chooser = this.pendingFileChooser;
    if (!chooser) {
      throw new CloakMcpError('NOT_FOUND', 'no pending file chooser');
    }
    this.pendingFileChooser = undefined;
    await chooser.setFiles(paths ?? []);
  }

  async drop(targetSelector: string, payload: DropPayload): Promise<void> {
    const locator = this.pw.locator(targetSelector);
    if (typeof locator.dispatchEvent !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'drop is not supported by the installed backend');
    }
    const handle = (await this.pw.evaluateHandle(createDataTransfer, payload)) as PwHandle;
    try {
      await locator.dispatchEvent('dragenter', { dataTransfer: handle });
      await locator.dispatchEvent('dragover', { dataTransfer: handle });
      await locator.dispatchEvent('drop', { dataTransfer: handle });
    } finally {
      await handle.dispose?.();
    }
  }

  async networkRequests(): Promise<NetworkRequestRecord[]> {
    return await this.network.list();
  }

  async networkRequest(index: number): Promise<NetworkRequestRecord> {
    return await this.network.get(index);
  }

  async routeNetwork(rule: NetworkRouteRule): Promise<NetworkRouteInfo> {
    if (typeof this.pw.route !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'network routing is not supported by the installed backend');
    }
    const id = `route-${++this.routeCounter}`;
    const handler = async (route: PwRoute): Promise<void> => {
      if (rule.action === 'block') {
        await route.abort('blockedbyclient');
        return;
      }
      if (rule.action === 'fulfill') {
        await route.fulfill({
          status: rule.status ?? 200,
          headers: rule.headers,
          contentType: rule.contentType,
          body: rule.body ?? '',
        });
        return;
      }
      await route.continue();
    };
    await this.pw.route(rule.url, handler);
    this.routes.set(id, { url: rule.url, handler });
    return { id, url: rule.url, action: rule.action };
  }

  async clearNetworkRoutes(id?: string): Promise<number> {
    if (typeof this.pw.unroute !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'network routing is not supported by the installed backend');
    }
    if (id) {
      const route = this.routes.get(id);
      if (!route) return 0;
      await this.pw.unroute(route.url, route.handler);
      this.routes.delete(id);
      return 1;
    }
    let count = 0;
    for (const [routeId, route] of this.routes) {
      await this.pw.unroute(route.url, route.handler);
      this.routes.delete(routeId);
      count += 1;
    }
    return count;
  }

  async accessibilitySnapshot(): Promise<AccessibilityNode> {
    if (this.pw.accessibility?.snapshot) {
      const snap = await this.pw.accessibility.snapshot({ interestingOnly: true });
      return normalizeAxNode(snap);
    }

    const body = this.pw.locator('body');
    const textContent =
      typeof body.textContent === 'function'
        ? await body.textContent({ timeout: this.defaultTimeoutMs })
        : undefined;
    const text = typeof textContent === 'string' ? textContent.trim() : '';
    const title = await this.title().catch(() => '');
    const children: AccessibilityNode[] = [];
    if (text) children.push({ role: 'text', name: compactText(text) });
    return { role: 'document', name: title || undefined, children };
  }

  async screenshot(opts: ScreenshotOptions): Promise<Uint8Array> {
    if (opts.selector) {
      const loc = this.pw.locator(opts.selector) as PwLocator & {
        screenshot: (o: { type?: 'png' | 'jpeg' }) => Promise<Uint8Array>;
      };
      return await loc.screenshot({ type: opts.format ?? 'png' });
    }
    return await this.pw.screenshot({ fullPage: opts.fullPage ?? false, type: opts.format ?? 'png' });
  }

  async pdf(opts: PdfOptions): Promise<Uint8Array> {
    if (typeof this.pw.pdf !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'PDF export is not supported by the installed backend');
    }
    return await this.pw.pdf({
      format: opts.format ?? 'A4',
      landscape: opts.landscape ?? false,
      printBackground: opts.printBackground ?? true,
    });
  }

  async selectorCount(selector: string): Promise<number> {
    const value = await this.pw.evaluate(countSelector, selector);
    return typeof value === 'number' ? value : Number(value);
  }

  async setCookies(cookies: CookieSpec[]): Promise<void> {
    if (typeof this.context.addCookies !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'cookie mutation is not supported by the installed backend');
    }
    await this.context.addCookies(cookies);
  }

  async clearStorage(opts: ClearStorageOptions): Promise<void> {
    if (opts.cookies !== false) {
      if (typeof this.context.clearCookies !== 'function') {
        throw new CloakMcpError('UNSUPPORTED', 'cookie clearing is not supported by the installed backend');
      }
      await this.context.clearCookies();
    }
    if (opts.localStorage !== false || opts.sessionStorage !== false) {
      await this.pw.evaluate(clearBrowserStorage, {
        localStorage: opts.localStorage !== false,
        sessionStorage: opts.sessionStorage !== false,
      });
    }
  }

  async saveHar(): Promise<Uint8Array> {
    return new TextEncoder().encode(JSON.stringify(buildHar(await this.network.list()), null, 2));
  }

  async saveVideo(): Promise<Uint8Array> {
    const video = this.pw.video?.();
    if (!video || typeof video.saveAs !== 'function') {
      throw new CloakMcpError(
        'UNSUPPORTED',
        'video export requires a backend page created with video recording enabled',
      );
    }
    const filePath = path.join(tmpdir(), `cloakbrowser-mcp-video-${randomUUID()}.webm`);
    try {
      await video.saveAs(filePath);
      return await readFile(filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }

  async mouseClick(opts: MouseClickOptions): Promise<void> {
    await this.pw.mouse.click(opts.x, opts.y, {
      button: opts.button ?? 'left',
      clickCount: opts.clickCount ?? 1,
    });
  }

  async mouseMove(opts: MouseMoveOptions): Promise<void> {
    await this.pw.mouse.move(opts.x, opts.y, { steps: opts.steps ?? 1 });
  }

  async mouseDrag(opts: MouseDragOptions): Promise<void> {
    await this.pw.mouse.move(opts.startX, opts.startY);
    await this.pw.mouse.down();
    await this.pw.mouse.move(opts.endX, opts.endY, { steps: opts.steps ?? 1 });
    await this.pw.mouse.up();
  }

  async mouseWheel(opts: MouseWheelOptions): Promise<void> {
    if (typeof this.pw.mouse.wheel !== 'function') {
      throw new CloakMcpError('UNSUPPORTED', 'mouse wheel is not supported by the installed backend');
    }
    await this.pw.mouse.wheel(opts.deltaX ?? 0, opts.deltaY ?? 0);
  }

  consoleMessages(clear = false): ConsoleEntry[] {
    const out = [...this.console_];
    if (clear) this.console_.length = 0;
    return out;
  }

  prepareNextDialog(decision: DialogDecision): void {
    this.pendingDialog = decision;
  }

  async close(): Promise<void> {
    if (!this.pw.isClosed()) await this.pw.close();
  }
}

function normalizeAxNode(node: unknown): AccessibilityNode {
  if (!node || typeof node !== 'object') return { role: 'none' };
  const n = node as Record<string, unknown>;
  const children = Array.isArray(n.children) ? (n.children as unknown[]).map(normalizeAxNode) : undefined;
  const out: AccessibilityNode = { role: typeof n.role === 'string' ? n.role : 'generic' };
  if (typeof n.name === 'string' && n.name) out.name = n.name;
  if (typeof n.value === 'string' && n.value) out.value = n.value;
  if (children && children.length > 0) out.children = children;
  return out;
}

function compactText(text: string): string {
  const compacted = text.replace(/\s+/g, ' ').trim();
  return compacted.length > 2000 ? `${compacted.slice(0, 2000)}...` : compacted;
}

function bodyTextIncludes(needle: string): boolean {
  const body = (globalThis as unknown as { document?: { body?: { innerText?: string } } }).document?.body;
  return Boolean(body?.innerText?.includes(needle));
}

function bodyTextDoesNotInclude(needle: string): boolean {
  const body = (globalThis as unknown as { document?: { body?: { innerText?: string } } }).document?.body;
  return !body?.innerText?.includes(needle);
}

function countSelector(selector: string): number {
  const browserGlobal = globalThis as unknown as {
    document?: { querySelectorAll(selector: string): { length: number } };
  };
  return browserGlobal.document?.querySelectorAll(selector).length ?? 0;
}

function clearBrowserStorage(opts: { localStorage: boolean; sessionStorage: boolean }): void {
  const browserGlobal = globalThis as unknown as {
    localStorage?: { clear(): void };
    sessionStorage?: { clear(): void };
  };
  if (opts.localStorage) browserGlobal.localStorage?.clear();
  if (opts.sessionStorage) browserGlobal.sessionStorage?.clear();
}

async function materializeNetworkRecord(entry: InternalNetworkRequestRecord): Promise<NetworkRequestRecord> {
  const { responseBodyPromise, ...record } = entry;
  if (responseBodyPromise) record.responseBody = await responseBodyPromise;
  return record;
}

function createDataTransfer(payload: DropPayload): unknown {
  const browserGlobal = globalThis as unknown as {
    DataTransfer: new () => {
      setData(type: string, value: string): void;
      items: { add(file: unknown): void };
    };
    File: new (bits: unknown[], name: string, opts: { type: string }) => unknown;
    atob(value: string): string;
  };
  const transfer = new browserGlobal.DataTransfer();
  for (const [type, value] of Object.entries(payload.data ?? {})) {
    transfer.setData(type, value);
  }
  for (const file of payload.files ?? []) {
    const binary = browserGlobal.atob(file.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    transfer.items.add(
      new browserGlobal.File([bytes], file.name, { type: file.mimeType ?? 'application/octet-stream' }),
    );
  }
  return transfer;
}

function buildHar(requests: NetworkRequestRecord[]): Record<string, unknown> {
  return {
    log: {
      version: '1.2',
      creator: { name: 'cloakbrowser-mcp', version: '1.0' },
      entries: requests.map((request) => ({
        startedDateTime: new Date().toISOString(),
        time: 0,
        request: {
          method: request.method,
          url: request.url,
          httpVersion: 'HTTP/1.1',
          headers: objectToNameValue(request.requestHeaders ?? {}),
          queryString: [],
          cookies: [],
          headersSize: -1,
          bodySize: request.requestBody?.length ?? 0,
          postData: request.requestBody
            ? {
                mimeType: request.requestHeaders?.['content-type'] ?? 'text/plain',
                text: request.requestBody,
              }
            : undefined,
        },
        response: {
          status: request.status ?? 0,
          statusText: request.statusText ?? '',
          httpVersion: 'HTTP/1.1',
          headers: objectToNameValue(request.responseHeaders ?? {}),
          cookies: [],
          content: {
            size: request.responseBody?.length ?? 0,
            mimeType: request.responseHeaders?.['content-type'] ?? 'application/octet-stream',
            text: request.responseBody ?? '',
          },
          redirectURL: '',
          headersSize: -1,
          bodySize: request.responseBody?.length ?? 0,
        },
        cache: {},
        timings: { send: 0, wait: 0, receive: 0 },
      })),
    },
  };
}

function objectToNameValue(headers: Record<string, string>): { name: string; value: string }[] {
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

/**
 * Real CloakBrowser adapter. Uses dynamic import so tests and consumers that
 * do not have `cloakbrowser` installed still compile and run.
 */
export class CloakBrowserAdapter implements BrowserAdapter {
  private browser: PwBrowser | undefined;
  private context: PwBrowserContext | undefined;
  private readonly pageMap = new Map<string, CloakPage>();
  private readonly pageByBackend = new WeakMap<PwPage, CloakPage>();
  private loadedVersion: string | undefined;

  constructor(private readonly config: ResolvedConfig) {}

  async launch(): Promise<void> {
    if (this.browser) return;
    let mod: CloakModule;
    try {
      // Indirect specifier avoids a hard compile-time dependency on `cloakbrowser`.
      const spec = 'cloakbrowser';
      mod = (await import(spec)) as CloakModule;
    } catch (e) {
      throw new CloakMcpError('BROWSER_UNAVAILABLE', 'cloakbrowser package not installed', {
        cause: (e as Error).message,
      });
    }
    if (!mod.launch) {
      throw new CloakMcpError(
        'BROWSER_UNAVAILABLE',
        'cloakbrowser.launch() not exported by installed version',
      );
    }
    const launchOpts: Record<string, unknown> = {
      headless: this.config.headless,
    };
    if (this.config.browserExecutablePath) launchOpts.executablePath = this.config.browserExecutablePath;
    if (this.config.userDataDir) launchOpts.userDataDir = this.config.userDataDir;

    this.browser = await mod.launch(launchOpts);
    this.loadedVersion = this.browser.version();
    this.context = await this.browser.newContext({});
    this.context.on('page', (...args: unknown[]) => {
      const pw = args[0] as PwPage | undefined;
      if (!pw) return;
      this.attachPage(pw);
    });
  }

  isLaunched(): boolean {
    return this.browser?.isConnected() ?? false;
  }

  async newPage(): Promise<PageAdapter> {
    if (!this.context) await this.launch();
    if (this.pageMap.size >= this.config.maxPages) {
      throw new CloakMcpError('LIMIT_EXCEEDED', `page limit reached: ${this.config.maxPages}`);
    }
    const pw = await this.context!.newPage();
    return this.attachPage(pw);
  }

  pages(): PageAdapter[] {
    return [...this.pageMap.values()];
  }
  page(id: string): PageAdapter | undefined {
    return this.pageMap.get(id);
  }

  async closePage(id: string): Promise<void> {
    const p = this.pageMap.get(id);
    if (!p) throw new CloakMcpError('NOT_FOUND', `page not found: ${id}`);
    await p.close();
    this.pageMap.delete(id);
  }

  async close(): Promise<void> {
    for (const p of this.pageMap.values()) {
      try {
        await p.close();
      } catch {
        /* swallow on shutdown */
      }
    }
    this.pageMap.clear();
    if (this.context) {
      try {
        await this.context.close();
      } catch {
        /* */
      }
      this.context = undefined;
    }
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        /* */
      }
      this.browser = undefined;
    }
  }

  async binaryInfo() {
    try {
      const spec = 'cloakbrowser';
      const mod = (await import(spec)) as CloakModule;
      const available = typeof mod.launch === 'function';
      const info: { version?: string; binaryPath?: string; available: boolean; notes?: string } = {
        available,
      };
      if (this.loadedVersion) info.version = this.loadedVersion;
      if (this.config.browserExecutablePath) info.binaryPath = this.config.browserExecutablePath;
      if (!available) info.notes = 'cloakbrowser package found but no launch() export';
      return info;
    } catch {
      return { available: false, notes: 'cloakbrowser package not installed' };
    }
  }

  async installBinary() {
    let cliPath: string;
    try {
      cliPath = path.join(path.dirname(requireFromHere.resolve('cloakbrowser')), 'cli.js');
    } catch (e) {
      throw new CloakMcpError('BROWSER_UNAVAILABLE', 'cloakbrowser CLI not installed', {
        cause: (e as Error).message,
      });
    }
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'install'], {
      cwd: process.cwd(),
      timeout: 10 * 60_000,
      maxBuffer: 1024 * 1024,
    });
    const info = await this.binaryInfo();
    return {
      ...info,
      notes: [stdout.trim(), stderr.trim(), info.notes].filter(Boolean).join('\n') || 'install completed',
    };
  }

  async startTrace(opts?: TraceOptions): Promise<void> {
    if (!this.context) await this.launch();
    if (!this.context?.tracing) {
      throw new CloakMcpError('UNSUPPORTED', 'tracing is not supported by the installed backend');
    }
    await this.context.tracing.start({
      screenshots: opts?.screenshots ?? true,
      snapshots: opts?.snapshots ?? true,
      sources: opts?.sources ?? false,
    });
  }

  async stopTrace(): Promise<Uint8Array> {
    if (!this.context?.tracing) {
      throw new CloakMcpError('UNSUPPORTED', 'tracing is not supported by the installed backend');
    }
    const filePath = path.join(tmpdir(), `cloakbrowser-mcp-trace-${randomUUID()}.zip`);
    try {
      await this.context.tracing.stop({ path: filePath });
      return await readFile(filePath);
    } finally {
      await rm(filePath, { force: true });
    }
  }

  private attachPage(pw: PwPage): CloakPage {
    const existing = this.pageByBackend.get(pw);
    if (existing) return existing;
    const context = this.context;
    if (!context) throw new CloakMcpError('BROWSER_UNAVAILABLE', 'browser context not initialized');
    const page = new CloakPage(pw, context, this.config.defaultTimeoutMs);
    this.pageByBackend.set(pw, page);
    this.pageMap.set(page.id, page);
    return page;
  }
}
