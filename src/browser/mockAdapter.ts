import { CloakMcpError } from '@/errors/index.js';
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

/**
 * Deterministic in-memory adapter used in tests and for offline development.
 * Pages "navigate" against a script of preconfigured fixtures keyed by URL.
 */
export interface MockPageFixture {
  title: string;
  text: string;
  /** Selectors that "exist" on this page. */
  elements: Record<string, { name?: string; role?: string; value?: string }>;
  /** Selectors that should resolve <select> options. */
  selects?: Record<string, string[]>;
}

export type MockFixtureMap = Record<string, MockPageFixture>;

let pageCounter = 0;
const nextPageId = () => `p${++pageCounter}`;

interface MockUnsafePage {
  url(): string;
  title(): Promise<string>;
}

class MockPage implements PageAdapter {
  readonly id: string;
  private currentUrl = 'about:blank';
  private history: string[] = ['about:blank'];
  private console_: ConsoleEntry[] = [];
  private network_: NetworkRequestRecord[] = [];
  private routeCounter = 0;
  private routes = new Map<string, NetworkRouteInfo>();
  private cookies: CookieSpec[] = [];
  private pendingFileChooser = false;
  private pendingDialog: DialogDecision | undefined;
  private closed = false;

  constructor(private readonly fixtures: MockFixtureMap) {
    this.id = nextPageId();
  }

  url = (): string => this.currentUrl;
  title = async (): Promise<string> => this.fixture()?.title ?? '';

  private fixture(): MockPageFixture | undefined {
    return this.fixtures[this.currentUrl];
  }

  private ensureOpen() {
    if (this.closed) throw new CloakMcpError('NOT_FOUND', 'page is closed');
  }

  async goto(url: string, _opts?: NavigateOptions): Promise<void> {
    this.ensureOpen();
    this.currentUrl = url;
    this.history.push(url);
    this.console_.push({ type: 'log', text: `navigated to ${url}`, ts: Date.now() });
    this.network_.push({
      index: this.network_.length + 1,
      url,
      method: 'GET',
      resourceType: 'document',
      status: this.fixture() ? 200 : 404,
      statusText: this.fixture() ? 'OK' : 'Not Found',
      requestHeaders: {},
      requestBody: null,
      responseHeaders: { 'content-type': 'text/html; charset=utf-8' },
      responseBody: this.fixture()?.text ?? 'not found',
    });
  }

  async goBack(_opts?: NavigateOptions): Promise<void> {
    this.ensureOpen();
    if (this.history.length < 2) {
      throw new CloakMcpError('NOT_FOUND', 'no previous page in history');
    }
    this.history.pop();
    this.currentUrl = this.history[this.history.length - 1] ?? 'about:blank';
  }

  async waitFor(opts: WaitForOptions): Promise<void> {
    this.ensureOpen();
    if (opts.selector) {
      if (!this.fixture()?.elements[opts.selector]) {
        throw new CloakMcpError('TIMEOUT', `selector not found: ${opts.selector}`);
      }
      return;
    }
    if (opts.text) {
      if (!this.fixture()?.text.includes(opts.text)) {
        throw new CloakMcpError('TIMEOUT', `text not found: ${opts.text}`);
      }
      return;
    }
    if (opts.textGone) {
      if (this.fixture()?.text.includes(opts.textGone)) {
        throw new CloakMcpError('TIMEOUT', `text still present: ${opts.textGone}`);
      }
      return;
    }
    // Pure timeout: resolve immediately in mock.
  }

  private assertSelector(sel: string): void {
    if (!this.fixture()?.elements[sel]) {
      throw new CloakMcpError('NOT_FOUND', `selector not found: ${sel}`);
    }
  }

  async click(opts: ClickOptions): Promise<void> {
    this.ensureOpen();
    this.assertSelector(opts.selector);
    if (this.fixture()?.elements[opts.selector]?.role === 'file') this.pendingFileChooser = true;
    this.console_.push({ type: 'log', text: `click ${opts.selector}`, ts: Date.now() });
  }

  async hover(selector: string): Promise<void> {
    this.ensureOpen();
    this.assertSelector(selector);
  }

  async drag(startSelector: string, endSelector: string): Promise<void> {
    this.ensureOpen();
    this.assertSelector(startSelector);
    this.assertSelector(endSelector);
    this.console_.push({ type: 'log', text: `drag ${startSelector} -> ${endSelector}`, ts: Date.now() });
  }

  async resize(width: number, height: number): Promise<void> {
    this.ensureOpen();
    this.console_.push({ type: 'log', text: `resize ${width}x${height}`, ts: Date.now() });
  }

  async type(opts: TypeOptions): Promise<void> {
    this.ensureOpen();
    this.assertSelector(opts.selector);
    const el = this.fixture()!.elements[opts.selector]!;
    el.value = opts.replace ? opts.text : (el.value ?? '') + opts.text;
  }

  async pressKey(key: string): Promise<void> {
    this.ensureOpen();
    this.console_.push({ type: 'log', text: `key:${key}`, ts: Date.now() });
  }

  async selectOption(opts: SelectOptions): Promise<string[]> {
    this.ensureOpen();
    const valid = this.fixture()?.selects?.[opts.selector];
    if (!valid) throw new CloakMcpError('NOT_FOUND', `select not found: ${opts.selector}`);
    const accepted = opts.values.filter((v) => valid.includes(v));
    if (accepted.length === 0) throw new CloakMcpError('INVALID_INPUT', 'no matching options');
    return accepted;
  }

  async fillForm(fields: FillFormField[]): Promise<void> {
    this.ensureOpen();
    for (const f of fields) {
      this.assertSelector(f.selector);
      this.fixture()!.elements[f.selector]!.value = f.value;
    }
  }

  async evaluate(fn: string, targetSelector?: string): Promise<unknown> {
    this.ensureOpen();
    if (targetSelector) this.assertSelector(targetSelector);
    if (fn.includes('document.title')) return await this.title();
    if (fn.includes('location.href')) return this.currentUrl;
    if (targetSelector)
      return { target: targetSelector, name: this.fixture()?.elements[targetSelector]?.name ?? null };
    return null;
  }

  async runCodeUnsafe(code: string): Promise<unknown> {
    this.ensureOpen();
    const page: MockUnsafePage = {
      url: () => this.currentUrl,
      title: async () => this.title(),
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- mirrors browser_run_code_unsafe semantics.
    const compiled = new Function('page', `return (${code})(page);`) as (page: MockUnsafePage) => unknown;
    return await compiled(page);
  }

  async uploadFiles(paths?: string[]): Promise<void> {
    this.ensureOpen();
    if (!this.pendingFileChooser) {
      throw new CloakMcpError('NOT_FOUND', 'no pending file chooser');
    }
    this.pendingFileChooser = false;
    this.console_.push({ type: 'log', text: `upload ${paths?.join(',') ?? 'cancel'}`, ts: Date.now() });
  }

  async drop(targetSelector: string, payload: DropPayload): Promise<void> {
    this.ensureOpen();
    this.assertSelector(targetSelector);
    const dataCount = Object.keys(payload.data ?? {}).length;
    const fileCount = payload.files?.length ?? 0;
    this.console_.push({
      type: 'log',
      text: `drop ${targetSelector} data=${dataCount} files=${fileCount}`,
      ts: Date.now(),
    });
  }

  async networkRequests(): Promise<NetworkRequestRecord[]> {
    this.ensureOpen();
    return this.network_.map((entry) => ({ ...entry }));
  }

  async networkRequest(index: number): Promise<NetworkRequestRecord> {
    this.ensureOpen();
    const entry = this.network_.find((request) => request.index === index);
    if (!entry) throw new CloakMcpError('NOT_FOUND', `network request not found: ${index}`);
    return { ...entry };
  }

  async routeNetwork(rule: NetworkRouteRule): Promise<NetworkRouteInfo> {
    this.ensureOpen();
    const info: NetworkRouteInfo = {
      id: `route-${++this.routeCounter}`,
      url: rule.url,
      action: rule.action,
    };
    this.routes.set(info.id, info);
    this.console_.push({ type: 'log', text: `route ${rule.action} ${rule.url}`, ts: Date.now() });
    return info;
  }

  async clearNetworkRoutes(id?: string): Promise<number> {
    this.ensureOpen();
    if (id) {
      const existed = this.routes.delete(id);
      return existed ? 1 : 0;
    }
    const count = this.routes.size;
    this.routes.clear();
    return count;
  }

  async accessibilitySnapshot(): Promise<AccessibilityNode> {
    this.ensureOpen();
    const fx = this.fixture();
    const children: AccessibilityNode[] = fx
      ? Object.entries(fx.elements).map(([selector, el]) => {
          const node: AccessibilityNode = { role: el.role ?? 'generic', selector };
          if (el.name !== undefined) node.name = el.name;
          if (el.value !== undefined) node.value = el.value;
          return node;
        })
      : [];
    const root: AccessibilityNode = {
      role: 'document',
      name: fx?.title ?? '',
      children,
    };
    return root;
  }

  async screenshot(_opts: ScreenshotOptions): Promise<Uint8Array> {
    this.ensureOpen();
    return new TextEncoder().encode(`mock-screenshot:${this.currentUrl}`);
  }

  async pdf(_opts: PdfOptions): Promise<Uint8Array> {
    this.ensureOpen();
    return new TextEncoder().encode(`mock-pdf:${this.currentUrl}`);
  }

  async selectorCount(selector: string): Promise<number> {
    this.ensureOpen();
    return this.fixture()?.elements[selector] ? 1 : 0;
  }

  async setCookies(cookies: CookieSpec[]): Promise<void> {
    this.ensureOpen();
    this.cookies = [...cookies];
    this.console_.push({ type: 'log', text: `cookies ${cookies.length}`, ts: Date.now() });
  }

  async clearStorage(opts: ClearStorageOptions): Promise<void> {
    this.ensureOpen();
    const removedCookies = this.cookies.length;
    if (opts.cookies !== false) this.cookies = [];
    this.console_.push({
      type: 'log',
      text: `clear-storage cookies=${opts.cookies !== false ? removedCookies : 0} local=${opts.localStorage !== false} session=${opts.sessionStorage !== false}`,
      ts: Date.now(),
    });
  }

  async saveHar(): Promise<Uint8Array> {
    this.ensureOpen();
    return new TextEncoder().encode(JSON.stringify(buildHar(this.network_), null, 2));
  }

  async saveVideo(): Promise<Uint8Array> {
    this.ensureOpen();
    return new TextEncoder().encode(`mock-video:${this.currentUrl}`);
  }

  async mouseClick(opts: MouseClickOptions): Promise<void> {
    this.ensureOpen();
    this.console_.push({
      type: 'log',
      text: `mouse-click ${opts.x},${opts.y} ${opts.button ?? 'left'} ${opts.clickCount ?? 1}`,
      ts: Date.now(),
    });
  }

  async mouseMove(opts: MouseMoveOptions): Promise<void> {
    this.ensureOpen();
    this.console_.push({
      type: 'log',
      text: `mouse-move ${opts.x},${opts.y} steps=${opts.steps ?? 1}`,
      ts: Date.now(),
    });
  }

  async mouseDrag(opts: MouseDragOptions): Promise<void> {
    this.ensureOpen();
    this.console_.push({
      type: 'log',
      text: `mouse-drag ${opts.startX},${opts.startY}->${opts.endX},${opts.endY} steps=${opts.steps ?? 1}`,
      ts: Date.now(),
    });
  }

  async mouseWheel(opts: MouseWheelOptions): Promise<void> {
    this.ensureOpen();
    this.console_.push({
      type: 'log',
      text: `mouse-wheel ${opts.deltaX ?? 0},${opts.deltaY ?? 0}`,
      ts: Date.now(),
    });
  }

  consoleMessages(clear = false): ConsoleEntry[] {
    const out = [...this.console_];
    if (clear) this.console_ = [];
    return out;
  }

  prepareNextDialog(decision: DialogDecision): void {
    this.pendingDialog = decision;
  }

  /** Test helper, not part of the adapter contract. */
  consumePendingDialog(): DialogDecision | undefined {
    const d = this.pendingDialog;
    this.pendingDialog = undefined;
    return d;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export class MockBrowserAdapter implements BrowserAdapter {
  private launched = false;
  private pageList: MockPage[] = [];
  private traceStarted = false;

  constructor(private readonly fixtures: MockFixtureMap = {}) {}

  async launch(): Promise<void> {
    this.launched = true;
  }
  isLaunched(): boolean {
    return this.launched;
  }

  async newPage(): Promise<PageAdapter> {
    if (!this.launched) await this.launch();
    const p = new MockPage(this.fixtures);
    this.pageList.push(p);
    return p;
  }

  pages(): PageAdapter[] {
    return [...this.pageList];
  }

  page(id: string): PageAdapter | undefined {
    return this.pageList.find((p) => p.id === id);
  }

  async closePage(id: string): Promise<void> {
    const idx = this.pageList.findIndex((p) => p.id === id);
    if (idx < 0) throw new CloakMcpError('NOT_FOUND', `page not found: ${id}`);
    const removed = this.pageList[idx];
    if (removed) await removed.close();
    this.pageList.splice(idx, 1);
  }

  async close(): Promise<void> {
    for (const p of this.pageList) await p.close();
    this.pageList = [];
    this.launched = false;
  }

  async binaryInfo() {
    return { available: true, version: 'mock-0.0.0', notes: 'mock adapter — not a real browser' };
  }

  async installBinary() {
    return { available: true, version: 'mock-0.0.0', notes: 'mock install completed' };
  }

  async startTrace(_opts?: TraceOptions): Promise<void> {
    this.traceStarted = true;
  }

  async stopTrace(): Promise<Uint8Array> {
    if (!this.traceStarted) throw new CloakMcpError('INVALID_INPUT', 'trace has not been started');
    this.traceStarted = false;
    return new TextEncoder().encode('mock-trace');
  }
}

function buildHar(requests: NetworkRequestRecord[]): Record<string, unknown> {
  return {
    log: {
      version: '1.2',
      creator: { name: 'cloakbrowser-mcp', version: 'mock' },
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
