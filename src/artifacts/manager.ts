import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { CloakMcpError } from '../errors/index.js';

export interface ArtifactRef {
  path: string;
  relativePath: string;
  bytes: number;
  contentType: string;
  createdAt: string;
}

const SAFE_NAME = /^[A-Za-z0-9_.-]+$/;

export class ArtifactManager {
  private readonly root: string;
  private initialized = false;

  constructor(outputDir: string) {
    this.root = path.resolve(outputDir);
  }

  /** Idempotent. Creates the output directory if missing. */
  async init(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(this.root, { recursive: true });
    this.initialized = true;
  }

  /**
   * Resolve a (possibly user-provided) relative path under the artifact root.
   * Rejects absolute paths, traversal, and unsafe characters.
   */
  resolveSafe(relName: string): string {
    if (!relName || relName.length > 255) {
      throw new CloakMcpError('INVALID_INPUT', 'artifact name required (1-255 chars)');
    }
    if (path.isAbsolute(relName)) {
      throw new CloakMcpError('PATH_DENIED', 'absolute paths not allowed');
    }
    const segments = relName.split(/[\\/]+/);
    for (const s of segments) {
      if (!s || s === '.' || s === '..' || !SAFE_NAME.test(s)) {
        throw new CloakMcpError('PATH_DENIED', `unsafe path segment: ${s}`);
      }
    }
    const resolved = path.resolve(this.root, ...segments);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    if (resolved !== this.root && !resolved.startsWith(rootWithSep)) {
      throw new CloakMcpError('PATH_DENIED', 'path escapes artifact root');
    }
    return resolved;
  }

  /** Build a unique filename like `screenshot-2026-05-21T17-23-00-ab12cd.png`. */
  uniqueName(prefix: string, ext: string): string {
    if (!SAFE_NAME.test(prefix)) throw new CloakMcpError('INVALID_INPUT', 'bad artifact prefix');
    const cleanExt = ext.replace(/^\.+/, '');
    if (!SAFE_NAME.test(cleanExt)) throw new CloakMcpError('INVALID_INPUT', 'bad artifact extension');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const rand = randomBytes(3).toString('hex');
    return `${prefix}-${ts}-${rand}.${cleanExt}`;
  }

  /** Write bytes under the artifact root. Returns a metadata ref. */
  async write(name: string, data: Uint8Array, contentType: string): Promise<ArtifactRef> {
    await this.init();
    const abs = this.resolveSafe(name);
    await fs.writeFile(abs, data);
    const stat = await fs.stat(abs);
    return {
      path: abs,
      relativePath: path.relative(this.root, abs),
      bytes: stat.size,
      contentType,
      createdAt: new Date().toISOString(),
    };
  }

  get rootDir(): string {
    return this.root;
  }
}
