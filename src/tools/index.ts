import type { ToolRegistry } from './registry.js';
import { cloakBinaryInfoTool, closeTool, getConfigTool, tabsTool } from './impl/lifecycle.js';
import { navigateBackTool, navigateTool, waitForTool } from './impl/navigation.js';
import {
  clickTool,
  dragTool,
  fillFormTool,
  handleDialogTool,
  hoverTool,
  pressKeyTool,
  resizeTool,
  selectOptionTool,
  typeTool,
} from './impl/interaction.js';
import { consoleMessagesTool, snapshotTool } from './impl/inspection.js';
import {
  dropTool,
  evaluateTool,
  fileUploadTool,
  networkRequestTool,
  networkRequestsTool,
  runCodeUnsafeTool,
} from './impl/playwrightParity.js';
import { takeScreenshotTool } from './impl/screenshot.js';
import {
  clearStorageTool,
  harSaveTool,
  installBinaryTool,
  mouseClickTool,
  mouseDragTool,
  mouseMoveTool,
  mouseWheelTool,
  networkRouteTool,
  pdfSaveTool,
  setCookiesTool,
  traceStartTool,
  traceStopTool,
  verifySelectorCountTool,
  verifyTextTool,
  verifyUrlTool,
  videoSaveTool,
} from './impl/extensions.js';
import type { ToolDefinition } from './types.js';

type RegisteredToolDefinition = ToolDefinition<any>;

export const mvpTools: readonly RegisteredToolDefinition[] = Object.freeze([
  getConfigTool,
  cloakBinaryInfoTool,
  tabsTool,
  closeTool,
  navigateTool,
  navigateBackTool,
  waitForTool,
  clickTool,
  dragTool,
  dropTool,
  hoverTool,
  resizeTool,
  typeTool,
  pressKeyTool,
  selectOptionTool,
  fillFormTool,
  handleDialogTool,
  fileUploadTool,
  snapshotTool,
  consoleMessagesTool,
  evaluateTool,
  networkRequestsTool,
  networkRequestTool,
  runCodeUnsafeTool,
  takeScreenshotTool,
  pdfSaveTool,
  setCookiesTool,
  clearStorageTool,
  networkRouteTool,
  verifyTextTool,
  verifySelectorCountTool,
  verifyUrlTool,
  traceStartTool,
  traceStopTool,
  harSaveTool,
  videoSaveTool,
  mouseClickTool,
  mouseMoveTool,
  mouseDragTool,
  mouseWheelTool,
  installBinaryTool,
]);

/**
 * Registers the verified Playwright-compatible tool set plus CloakBrowser
 * introspection tools. Tools whose capabilities are disabled in config are
 * silently skipped by the registry.
 *
 * Higher-impact tools are registered behind capability gates and still probe
 * the runtime CloakBrowser surface before using backend-specific APIs.
 */
export function registerMvpTools(registry: ToolRegistry): void {
  for (const tool of mvpTools) registry.register(tool);
}
