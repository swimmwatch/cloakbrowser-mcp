export const localToolNames = ['cloakbrowser_binary_info', 'cloakbrowser_bridge_info'];

export const expectedDefaultTools = [
  'browser_click',
  'browser_close',
  'browser_console_messages',
  'browser_drag',
  'browser_drop',
  'browser_evaluate',
  'browser_file_upload',
  'browser_fill_form',
  'browser_handle_dialog',
  'browser_hover',
  'browser_navigate',
  'browser_navigate_back',
  'browser_network_request',
  'browser_network_requests',
  'browser_press_key',
  'browser_resize',
  'browser_run_code_unsafe',
  'browser_select_option',
  'browser_snapshot',
  'browser_tabs',
  'browser_take_screenshot',
  'browser_type',
  'browser_wait_for',
];

export function normalizeToolResponseText(value) {
  return value
    .replaceAll(/\n### Events\n(?:- .*(?:\n|$))+/g, '')
    .replaceAll(/\/data\/[^\s)"']+/g, '/data/<artifact>')
    .replaceAll(/page-\d+\.(png|jpeg|pdf)/g, 'page-<timestamp>.$1')
    .replaceAll(/\d{3,}ms/g, '<duration>ms');
}

export function assertEqual(actual, expected, label) {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);

  if (actualText !== expectedText) {
    throw new Error(`${label} mismatch\nactual:   ${actualText}\nexpected: ${expectedText}`);
  }
}
