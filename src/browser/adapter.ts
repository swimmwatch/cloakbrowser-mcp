/**
 * Browser adapter interface. Tools depend ONLY on this surface so the underlying
 * CloakBrowser/Playwright APIs can change or be probed at runtime without breaking
 * tool handlers. Two implementations live next to this file:
 *   - cloakAdapter.ts: real CloakBrowser (dynamic import)
 *   - mockAdapter.ts:  deterministic in-memory adapter used in tests
 */

export interface AccessibilityNode {
  role: string;
  name?: string;
  value?: string;
  selector?: string;
  children?: AccessibilityNode[];
}

export interface ConsoleEntry {
  type: string;
  text: string;
  ts: number;
}

export type NetworkPart = 'request-headers' | 'request-body' | 'response-headers' | 'response-body';

export interface NetworkRequestRecord {
  index: number;
  url: string;
  method: string;
  resourceType?: string;
  status?: number;
  statusText?: string;
  failureText?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string | null;
  responseHeaders?: Record<string, string>;
  responseBody?: string | null;
}

export interface DialogEvent {
  type: 'alert' | 'confirm' | 'prompt' | 'beforeunload';
  message: string;
  defaultValue?: string;
}

export interface PageInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

export interface ScreenshotOptions {
  selector?: string;
  fullPage?: boolean;
  format?: 'png' | 'jpeg';
}

export interface PdfOptions {
  format?: string;
  landscape?: boolean;
  printBackground?: boolean;
}

export interface NavigateOptions {
  timeoutMs?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface WaitForOptions {
  selector?: string;
  text?: string;
  textGone?: string;
  timeoutMs?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

export interface TypeOptions {
  selector: string;
  text: string;
  replace?: boolean;
  pressEnter?: boolean;
  timeoutMs?: number;
}

export interface ClickOptions {
  selector: string;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: ('Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift')[];
  timeoutMs?: number;
}

export interface SelectOptions {
  selector: string;
  values: string[];
  timeoutMs?: number;
}

export interface FillFormField {
  selector: string;
  value: string;
}

export interface DialogDecision {
  accept: boolean;
  promptText?: string;
}

export interface DropFilePayload {
  name: string;
  mimeType?: string;
  base64: string;
}

export interface DropPayload {
  data?: Record<string, string>;
  files?: DropFilePayload[];
}

export interface CookieSpec {
  name: string;
  value: string;
  url?: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface ClearStorageOptions {
  cookies?: boolean;
  localStorage?: boolean;
  sessionStorage?: boolean;
}

export interface NetworkRouteRule {
  url: string;
  action: 'block' | 'continue' | 'fulfill';
  status?: number;
  contentType?: string;
  body?: string;
  headers?: Record<string, string>;
}

export interface NetworkRouteInfo {
  id: string;
  url: string;
  action: NetworkRouteRule['action'];
}

export interface TraceOptions {
  screenshots?: boolean;
  snapshots?: boolean;
  sources?: boolean;
}

export interface MouseClickOptions {
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

export interface MouseMoveOptions {
  x: number;
  y: number;
  steps?: number;
}

export interface MouseDragOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  steps?: number;
}

export interface MouseWheelOptions {
  deltaX?: number;
  deltaY?: number;
}

export interface PageAdapter {
  readonly id: string;
  readonly url: () => string;
  readonly title: () => Promise<string>;
  goto(url: string, opts?: NavigateOptions): Promise<void>;
  goBack(opts?: NavigateOptions): Promise<void>;
  waitFor(opts: WaitForOptions): Promise<void>;
  click(opts: ClickOptions): Promise<void>;
  hover(selector: string, timeoutMs?: number): Promise<void>;
  drag(startSelector: string, endSelector: string, timeoutMs?: number): Promise<void>;
  resize(width: number, height: number): Promise<void>;
  type(opts: TypeOptions): Promise<void>;
  pressKey(key: string): Promise<void>;
  selectOption(opts: SelectOptions): Promise<string[]>;
  fillForm(fields: FillFormField[], timeoutMs?: number): Promise<void>;
  evaluate(fn: string, targetSelector?: string): Promise<unknown>;
  runCodeUnsafe(code: string): Promise<unknown>;
  uploadFiles(paths?: string[]): Promise<void>;
  drop(targetSelector: string, payload: DropPayload): Promise<void>;
  networkRequests(): Promise<NetworkRequestRecord[]>;
  networkRequest(index: number): Promise<NetworkRequestRecord>;
  routeNetwork(rule: NetworkRouteRule): Promise<NetworkRouteInfo>;
  clearNetworkRoutes(id?: string): Promise<number>;
  accessibilitySnapshot(): Promise<AccessibilityNode>;
  screenshot(opts: ScreenshotOptions): Promise<Uint8Array>;
  pdf(opts: PdfOptions): Promise<Uint8Array>;
  selectorCount(selector: string): Promise<number>;
  setCookies(cookies: CookieSpec[]): Promise<void>;
  clearStorage(opts: ClearStorageOptions): Promise<void>;
  saveHar(): Promise<Uint8Array>;
  saveVideo(): Promise<Uint8Array>;
  mouseClick(opts: MouseClickOptions): Promise<void>;
  mouseMove(opts: MouseMoveOptions): Promise<void>;
  mouseDrag(opts: MouseDragOptions): Promise<void>;
  mouseWheel(opts: MouseWheelOptions): Promise<void>;
  consoleMessages(clear?: boolean): ConsoleEntry[];
  /** Pre-arm the next dialog with a decision. Throws if not supported. */
  prepareNextDialog(decision: DialogDecision): void;
  close(): Promise<void>;
}

export interface BrowserAdapter {
  launch(): Promise<void>;
  isLaunched(): boolean;
  newPage(): Promise<PageAdapter>;
  pages(): PageAdapter[];
  page(id: string): PageAdapter | undefined;
  closePage(id: string): Promise<void>;
  close(): Promise<void>;
  binaryInfo(): Promise<{ version?: string; binaryPath?: string; available: boolean; notes?: string }>;
  installBinary(): Promise<{ available: boolean; version?: string; binaryPath?: string; notes?: string }>;
  startTrace(opts?: TraceOptions): Promise<void>;
  stopTrace(): Promise<Uint8Array>;
}
