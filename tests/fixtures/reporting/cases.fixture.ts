import { afterAll, beforeAll, expect, it } from 'vitest';
import { controlledPng } from '@tests/fixtures/reporting/controlled-png.js';

const scenario = process.env.REPORT_PROBE_CASE || 'complete';
// Use a fixed synthetic value; never log caller-provided environment data.
const canary = 'reporting-synthetic-canary';
if (scenario === 'import') throw new Error(`Import failure password=${canary}`);
if (scenario === 'hook')
  beforeAll(() => {
    throw new Error('Fixture beforeAll failed');
  });
if (scenario === 'after-hook')
  afterAll(() => {
    throw new Error('Fixture afterAll failed');
  });
if (scenario === 'write-fault')
  afterAll(async () => {
    const options = JSON.parse(process.env.CLOAK_TEST_REPORT_OPTIONS || '{}') as {
      root: string;
      runId: string;
      producerId: string;
    };
    const target = path.join(options.root, options.runId, options.producerId);
    await mkdir(target);
  });
if (scenario !== 'empty' && scenario !== 'collection') {
  it('passes', () => {
    if (scenario === 'complete') console.warn(`Fixture console password=${canary}`);
    expect(true).toBe(true);
  });
  if (scenario === 'screenshot') {
    const statuses = ['passed', 'failed'];
    it.for(statuses)('browser %s', async (status, context) => {
      const png = controlledPng.toString('base64');
      const record = { fixtureUrl: 'http://127.0.0.1:1234/controlled', png };
      const screenshot = JSON.stringify(record);
      context.task.meta.cloakScreenshot = screenshot;
      const diagnostic = `pid=42 exit=0 password=${canary}`;
      await context.annotate(diagnostic, 'cloak:process-diagnostics');
      if (status === 'failed') throw new Error('Controlled browser assertion');
    });
  }
  if (scenario === 'complete') {
    it('fails', () => {
      throw new Error(`Assertion failure password=${canary}`);
    });
    it('skips', (context) => {
      context.skip();
    });
    let attempts = 0;
    it('retries successfully', { retry: 1 }, () => {
      attempts += 1;
      expect(attempts).toBe(2);
    });
  }
  if (scenario === 'unhandled') {
    it('records an unhandled rejection', async () => {
      const failure = new Error('Fixture unhandled rejection');
      void Promise.reject(failure);
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  }
}
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
