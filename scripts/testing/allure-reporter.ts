import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import type { Reporter, SerializedError, TestCase, TestModule, TestRunEndReason } from 'vitest/node';
import type { ReportOptions } from './report-configuration.js';

declare module 'vitest' {
  interface TaskMeta {
    cloakScreenshot?: string;
  }
}

type Evidence = {
  uuid: string;
  file: string;
  name: string;
  project: string;
  feature: string;
  level: 'unit' | 'integration' | 'e2e';
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  start: number;
  stop: number;
  retry: number;
  flaky?: boolean;
  environment: { os: string; arch: string; node: string; browser: string; lane: string };
  error?: { message: string; stack?: string };
  attachments: { name: string; type: 'text/plain' | 'image/png'; data: unknown }[];
};
interface Writer {
  writeTestResult: (options: {
    root: string;
    runId: string;
    producerId: string;
    results: Evidence[];
    secretValues: string[];
  }) => Promise<string>;
}

function errorEvidence(errors: readonly SerializedError[]): Evidence['error'] {
  if (!errors.length) return undefined;
  const messages = errors.map((error) => error.message || error.name || 'Runner error');
  const stacks = errors.map((error) => error.stack || error.message || 'Runner error');
  const message = messages.join('\n').slice(0, 4000);
  const stack = stacks.join('\n\n').slice(0, 120000);
  return { message, stack };
}
function errorKey(error: SerializedError): string {
  return `${error.message || error.name}\n${error.stack || ''}`;
}

/** Adapt only public Vitest run-end entities to one atomically persisted batch. */
export default class SafeAllureReporter implements Reporter {
  private readonly observed = new Map<string, number>();
  private readonly options: ReportOptions;
  private started = Date.now();

  constructor(options: ReportOptions) {
    if (
      !options ||
      ![
        'unit',
        'integration',
        'cli',
        'npm',
        'cdp',
        'docker',
        'proxy-geoip',
        'extensions',
        'lifecycle',
        'console',
        'docker-cdp',
      ].includes(options.suite)
    ) {
      throw new Error('Test reporting: invalid reporter options');
    }
    this.options = options;
  }

  onTestRunStart(): void {
    this.started = Date.now();
  }
  onTestCaseResult(test: TestCase): void {
    this.observed.set(test.id, Date.now());
  }

  private base(file: string, name: string, project: string): Evidence {
    const { suite } = this.options;
    const relative = path.relative(process.cwd(), file).split(path.sep).join('/');
    let level: Evidence['level'] = suite === 'unit' || suite === 'integration' ? suite : 'e2e';
    if (this.options.splitLevels) {
      if (relative.startsWith('tests/integration/')) level = 'integration';
      else if (relative.startsWith('tests/e2e/')) level = 'e2e';
    }
    const uuid = randomUUID();
    const now = Date.now();
    const stem = path.basename(relative).replace(/\.(?:test|manual|fixture)\.[cm]?[jt]s$/, '');
    return {
      uuid,
      file: relative,
      name,
      project: project || 'default',
      feature: stem,
      level,
      status: 'broken',
      start: this.started,
      stop: now,
      retry: 0,
      environment: {
        os: process.platform,
        arch: process.arch,
        node: process.versions.node.split('.')[0] || 'unknown',
        browser:
          this.options.browser ??
          (['npm', 'cdp', 'docker', 'proxy-geoip', 'extensions', 'lifecycle', 'docker-cdp'].includes(suite)
            ? 'cloakbrowser'
            : 'none'),
        lane: this.options.lane ?? suite,
      },
      attachments: [],
    };
  }

  private async testEvidence(test: TestCase): Promise<Evidence | undefined> {
    const result = test.result();
    if (result.state === 'pending') return undefined;
    const evidence = this.base(test.module.moduleId, test.fullName, test.project.name);
    evidence.status = result.state;
    const diagnostic = test.diagnostic();
    if (diagnostic) {
      evidence.start = Math.floor(diagnostic.startTime);
      evidence.stop = Math.floor(diagnostic.startTime + diagnostic.duration);
      evidence.retry = diagnostic.retryCount;
      evidence.flaky = diagnostic.flaky;
    } else {
      // Skipped cases have no execution diagnostic; use callback observation time.
      evidence.start = this.observed.get(test.id) || evidence.stop;
      evidence.stop = evidence.start;
    }
    if ('errors' in result && result.errors?.length) evidence.error = errorEvidence(result.errors);
    const logs = test.logs();
    if (logs.length) {
      const data = logs
        .map((log) => log.content)
        .join('\n')
        .slice(0, 120000);
      evidence.attachments.push({ name: 'Runner console', type: 'text/plain', data });
    }
    const url = new URL('../lib/test-diagnostics.mjs', import.meta.url);
    const diagnostics = (await import(url.href)) as {
      screenshotAnnotation: (message: string) => unknown;
    };
    const screenshot = test.meta().cloakScreenshot;
    if (screenshot !== undefined) {
      if (typeof screenshot !== 'string') throw new Error('Test evidence: invalid screenshot metadata');
      const data = diagnostics.screenshotAnnotation(screenshot);
      evidence.attachments.push({ name: 'Controlled local page', type: 'image/png', data });
    }
    for (const annotation of test.annotations()) {
      if (annotation.type === 'cloak:process-diagnostics') {
        const data = annotation.message.slice(0, 120000);
        evidence.attachments.push({ name: 'Owned process diagnostics', type: 'text/plain', data });
      }
    }
    return evidence;
  }

  /** Flush completed tests and distinct runner failures; persistence errors fail the run. */
  async onTestRunEnd(
    modules: ReadonlyArray<TestModule>,
    unhandled: ReadonlyArray<SerializedError>,
    reason: TestRunEndReason,
  ): Promise<void> {
    const results: Evidence[] = [];
    const seen = new Set<string>();
    for (const module of modules) {
      for (const test of module.children.allTests()) {
        const evidence = await this.testEvidence(test);
        if (evidence) results.push(evidence);
        const outcome = test.result();
        if ('errors' in outcome) for (const error of outcome.errors || []) seen.add(errorKey(error));
      }
    }
    const synthetic = (errors: readonly SerializedError[], module?: TestModule, suite?: string): void => {
      for (const error of errors) {
        const key = errorKey(error);
        if (seen.has(key)) continue;
        seen.add(key);
        const filename = module?.moduleId || path.join(process.cwd(), 'vitest-runner');
        const fingerprint = createHash('sha256').update(key).digest('hex').slice(0, 16);
        const evidence = this.base(
          filename,
          `Runner failure: ${suite || 'unhandled'} [${fingerprint}]`,
          module?.project.name || 'default',
        );
        evidence.error = errorEvidence([error]);
        results.push(evidence);
      }
    };
    for (const module of modules) {
      synthetic(module.errors(), module, 'module');
      for (const suite of module.children.allSuites()) synthetic(suite.errors(), module, suite.fullName);
    }
    synthetic(unhandled);
    if (
      reason !== 'passed' &&
      !results.some((result) => ['failed', 'broken'].includes(result.status)) &&
      results.length
    ) {
      const error = { message: `Vitest run ended with ${reason}` } as SerializedError;
      synthetic([error]);
    }
    const url = new URL('../lib/test-results.mjs', import.meta.url);
    const writer = (await import(url.href)) as Writer;
    await this.persist(results, writer);
  }

  private async persist(results: Evidence[], writer: Writer): Promise<void> {
    if (this.options.splitLevels) {
      const levels = new Set(results.map((result) => result.level));
      for (const level of levels) {
        const selected = results.filter((result) => result.level === level);
        const producerId = `${this.options.producerId}-${level}`;
        const options = { ...this.options, producerId, results: selected };
        await writer.writeTestResult(options);
      }
      if (!results.length) throw new Error('Test reporting: empty CI producer');
    } else {
      const options = { ...this.options, results };
      await writer.writeTestResult(options);
    }
  }
}
