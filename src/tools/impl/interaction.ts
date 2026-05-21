import { z } from 'zod';
import { fail } from '@/errors/index.js';
import { targetSelector } from '@/tools/compat.js';
import { jsonResult, textResult } from '@/tools/responses.js';
import type { ToolDefinition } from '@/tools/types.js';

const modifierSchema = z.enum(['Alt', 'Control', 'ControlOrMeta', 'Meta', 'Shift']);

const clickInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  element: z.string().optional(),
  button: z.enum(['left', 'right', 'middle']).optional(),
  clickCount: z.number().int().min(1).max(3).optional(),
  doubleClick: z.boolean().optional(),
  modifiers: z.array(modifierSchema).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const clickTool: ToolDefinition<typeof clickInput> = {
  name: 'browser_click',
  description: 'Perform click on a web page',
  inputSchema: clickInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const selector = targetSelector(input);
    const opts: Parameters<typeof page.click>[0] = { selector };
    if (input.button !== undefined) opts.button = input.button;
    if (input.doubleClick) opts.clickCount = 2;
    else if (input.clickCount !== undefined) opts.clickCount = input.clickCount;
    if (input.modifiers !== undefined) opts.modifiers = input.modifiers;
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    await page.click(opts);
    return textResult(`clicked ${selector}`, { pageId: page.id });
  },
};

const hoverInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  element: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const hoverTool: ToolDefinition<typeof hoverInput> = {
  name: 'browser_hover',
  description: 'Hover over element on page',
  inputSchema: hoverInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const selector = targetSelector(input);
    await page.hover(selector, input.timeoutMs);
    return textResult(`hovered ${selector}`, { pageId: page.id });
  },
};

const typeInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  element: z.string().optional(),
  text: z.string(),
  replace: z.boolean().optional(),
  pressEnter: z.boolean().optional(),
  submit: z.boolean().optional(),
  slowly: z.boolean().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const typeTool: ToolDefinition<typeof typeInput> = {
  name: 'browser_type',
  description: 'Type text into editable element',
  inputSchema: typeInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const selector = targetSelector(input);
    const opts: Parameters<typeof page.type>[0] = { selector, text: input.text };
    if (input.slowly) opts.replace = false;
    else if (input.replace !== undefined) opts.replace = input.replace;
    if (input.submit !== undefined) opts.pressEnter = input.submit;
    else if (input.pressEnter !== undefined) opts.pressEnter = input.pressEnter;
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    await page.type(opts);
    return textResult(`typed into ${selector}`, { pageId: page.id });
  },
};

const pressInput = z.object({
  pageId: z.string().optional(),
  key: z.string().min(1),
});

export const pressKeyTool: ToolDefinition<typeof pressInput> = {
  name: 'browser_press_key',
  description: 'Press a key on the keyboard',
  inputSchema: pressInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    await page.pressKey(input.key);
    return textResult(`pressed ${input.key}`, { pageId: page.id });
  },
};

const selectInput = z.object({
  pageId: z.string().optional(),
  selector: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
  element: z.string().optional(),
  values: z.array(z.string()).min(1),
  timeoutMs: z.number().int().positive().optional(),
});

export const selectOptionTool: ToolDefinition<typeof selectInput> = {
  name: 'browser_select_option',
  description: 'Select one or more options on a <select> element.',
  inputSchema: selectInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const selector = targetSelector(input);
    const opts: Parameters<typeof page.selectOption>[0] = { selector, values: input.values };
    if (input.timeoutMs !== undefined) opts.timeoutMs = input.timeoutMs;
    const accepted = await page.selectOption(opts);
    return jsonResult({ pageId: page.id, selected: accepted });
  },
};

const fillFormInput = z.object({
  pageId: z.string().optional(),
  fields: z
    .array(
      z.object({
        selector: z.string().min(1).optional(),
        target: z.string().min(1).optional(),
        element: z.string().optional(),
        name: z.string().optional(),
        type: z.enum(['textbox', 'checkbox', 'radio', 'combobox', 'slider']).optional(),
        value: z.string(),
      }),
    )
    .min(1),
  timeoutMs: z.number().int().positive().optional(),
});

export const fillFormTool: ToolDefinition<typeof fillFormInput> = {
  name: 'browser_fill_form',
  description: 'Fill multiple form fields',
  inputSchema: fillFormInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const fields = input.fields.map((field) => ({
      selector: targetSelector(field, 'field selector'),
      value: field.value,
    }));
    await page.fillForm(fields, input.timeoutMs);
    return textResult(`filled ${input.fields.length} field(s)`, {
      pageId: page.id,
      count: input.fields.length,
    });
  },
};

const dragInput = z.object({
  pageId: z.string().optional(),
  startSelector: z.string().min(1).optional(),
  startTarget: z.string().min(1).optional(),
  startElement: z.string().optional(),
  endSelector: z.string().min(1).optional(),
  endTarget: z.string().min(1).optional(),
  endElement: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const dragTool: ToolDefinition<typeof dragInput> = {
  name: 'browser_drag',
  description: 'Perform drag and drop between two elements',
  inputSchema: dragInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const start = input.startSelector ?? input.startTarget;
    const end = input.endSelector ?? input.endTarget;
    if (typeof start !== 'string') fail('INVALID_INPUT', 'startSelector or startTarget is required');
    if (typeof end !== 'string') fail('INVALID_INPUT', 'endSelector or endTarget is required');
    const startSelector = start!;
    const endSelector = end!;
    await page.drag(startSelector, endSelector, input.timeoutMs);
    return textResult(`dragged ${startSelector} to ${endSelector}`, { pageId: page.id });
  },
};

const resizeInput = z.object({
  pageId: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const resizeTool: ToolDefinition<typeof resizeInput> = {
  name: 'browser_resize',
  description: 'Resize the browser window',
  inputSchema: resizeInput,
  handler: async (input, ctx) => {
    const page = input.pageId ? ctx.session.getPage(input.pageId) : await ctx.session.currentOrNewPage();
    await page.resize(input.width, input.height);
    return textResult(`resized to ${input.width}x${input.height}`, {
      pageId: page.id,
      width: input.width,
      height: input.height,
    });
  },
};

const dialogInput = z.object({
  pageId: z.string().optional(),
  accept: z.boolean(),
  promptText: z.string().optional(),
});

export const handleDialogTool: ToolDefinition<typeof dialogInput> = {
  name: 'browser_handle_dialog',
  description: 'Handle a dialog',
  inputSchema: dialogInput,
  handler: async (input, ctx) => {
    const page = ctx.session.getPage(input.pageId);
    const decision: { accept: boolean; promptText?: string } = { accept: input.accept };
    if (input.promptText !== undefined) decision.promptText = input.promptText;
    page.prepareNextDialog(decision);
    return textResult(`dialog handler armed (${input.accept ? 'accept' : 'dismiss'})`, { pageId: page.id });
  },
};
