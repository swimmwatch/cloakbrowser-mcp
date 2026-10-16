import { expect, it } from 'vitest';
const moduleUrl = new URL('../../scripts/lib/playwright-mcp-parity.mjs', import.meta.url);
const { supportsFindFilename } = (await import(moduleUrl.href)) as {
  supportsFindFilename: (tools: unknown[]) => boolean;
};
it('recognizes the Docker MCP 0.0.82 find contract without filename', () => {
  const tools = [{ name: 'browser_find', inputSchema: { properties: { text: { type: 'string' } } } }];
  expect(supportsFindFilename(tools)).toBe(false);
});
it('recognizes the npm MCP 0.0.83 optional filename contract', () => {
  const tools = [{ name: 'browser_find', inputSchema: { properties: { filename: { type: 'string' } } } }];
  expect(supportsFindFilename(tools)).toBe(true);
});
it('rejects an incompatible filename contract instead of silently omitting the check', () => {
  const tools = [{ name: 'browser_find', inputSchema: { properties: { filename: { type: 'number' } } } }];
  expect(() => supportsFindFilename(tools)).toThrow('Unsupported upstream');
});
