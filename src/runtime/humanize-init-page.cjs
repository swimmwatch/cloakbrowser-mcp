'use strict';

const humanizedContextMarker = Symbol.for('io.github.swimmwatch.cloakbrowser-mcp.humanizedContext');

async function cloakbrowserMcpHumanizeInitPage({ page }) {
  const context = page && typeof page.context === 'function' ? page.context() : undefined;
  if (!context || context[humanizedContextMarker]) return;

  const preset = process.env.CLOAK_PLAYWRIGHT_MCP_HUMAN_PRESET || 'default';
  const { patchContext, resolveConfig } = await import('cloakbrowser/human');
  patchContext(context, resolveConfig(preset));

  Object.defineProperty(context, humanizedContextMarker, {
    value: true,
    configurable: false,
  });
}

module.exports = { default: cloakbrowserMcpHumanizeInitPage };
