import { CloakMcpError } from '@/errors/index.js';
import type { ResolvedConfig } from '@/config/schema.js';
import type { BrowserAdapter, PageAdapter } from './adapter.js';

/**
 * Owns the BrowserAdapter, enforces resource limits, and tracks the "current"
 * page for tools that operate without an explicit target.
 */
export class SessionManager {
  private currentPageId: string | undefined;

  constructor(
    private readonly adapter: BrowserAdapter,
    private readonly config: ResolvedConfig,
  ) {}

  get backend(): BrowserAdapter {
    return this.adapter;
  }

  async ensureLaunched(): Promise<void> {
    if (!this.adapter.isLaunched()) await this.adapter.launch();
  }

  /** Returns the current page, opening a new one if none exists yet. */
  async currentOrNewPage(): Promise<PageAdapter> {
    await this.ensureLaunched();
    if (this.currentPageId) {
      const p = this.adapter.page(this.currentPageId);
      if (p) return p;
      this.currentPageId = undefined;
    }
    const existing = this.adapter.pages()[0];
    if (existing) {
      this.currentPageId = existing.id;
      return existing;
    }
    return this.newPage();
  }

  async newPage(): Promise<PageAdapter> {
    await this.ensureLaunched();
    if (this.adapter.pages().length >= this.config.maxPages) {
      throw new CloakMcpError('LIMIT_EXCEEDED', `page limit reached: ${this.config.maxPages}`);
    }
    const p = await this.adapter.newPage();
    this.currentPageId = p.id;
    return p;
  }

  getPage(id?: string): PageAdapter {
    const targetId = id ?? this.currentPageId;
    if (!targetId) throw new CloakMcpError('NOT_FOUND', 'no active page');
    const p = this.adapter.page(targetId);
    if (!p) throw new CloakMcpError('NOT_FOUND', `page not found: ${targetId}`);
    return p;
  }

  selectPage(id: string): PageAdapter {
    const p = this.adapter.page(id);
    if (!p) throw new CloakMcpError('NOT_FOUND', `page not found: ${id}`);
    this.currentPageId = id;
    return p;
  }

  listPages() {
    return this.adapter.pages().map((p) => ({
      id: p.id,
      url: p.url(),
      active: p.id === this.currentPageId,
    }));
  }

  async closePage(id: string): Promise<void> {
    await this.adapter.closePage(id);
    if (this.currentPageId === id) this.currentPageId = undefined;
  }

  async shutdown(): Promise<void> {
    await this.adapter.close();
    this.currentPageId = undefined;
  }
}
