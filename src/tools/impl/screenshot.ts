import { z } from 'zod';
import { targetSelector } from '@/tools/compat.js';
import { jsonResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const screenshotInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().optional(),
  target: z.string().optional(),
  element: z.string().optional(),
  fullPage: z.boolean().optional(),
  format: z.enum(['png', 'jpeg']).optional(),
  type: z.enum(['png', 'jpeg']).optional(),
  filename: z.string().optional(),
});

export const takeScreenshotTool: ToolDefinition<typeof screenshotInput> = {
  name: 'browser_take_screenshot',
  description:
    "Take a screenshot of the current page. You can't perform actions based on the screenshot, use browser_snapshot for actions.",
  inputSchema: screenshotInput,
  capabilities: ['allowScreenshots'],
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const opts: Parameters<typeof page.screenshot>[0] = {};
    if (input.selector !== undefined || input.target !== undefined) opts.selector = targetSelector(input);
    if (input.fullPage !== undefined) opts.fullPage = input.fullPage;
    const format = input.format ?? input.type;
    if (format !== undefined) opts.format = format;
    const bytes = await page.screenshot(opts);
    const ext = format ?? 'png';
    const name = input.filename ?? ctx.artifacts.uniqueName('screenshot', ext);
    const ref = await ctx.artifacts.write(name, bytes, ext === 'png' ? 'image/png' : 'image/jpeg');
    return jsonResult({ pageId: page.id, artifact: ref });
  },
};
