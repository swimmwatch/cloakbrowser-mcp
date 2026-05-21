import type { MockFixtureMap } from '@/browser/mockAdapter.js';

export const sampleFixtures: MockFixtureMap = {
  'https://example.test/': {
    title: 'Example',
    text: 'Welcome to the example page',
    elements: {
      '#login': { role: 'button', name: 'Log in' },
      '#file-input': { role: 'file', name: 'File upload' },
      '#drop-source': { role: 'generic', name: 'Drag source' },
      '#drop-target': { role: 'generic', name: 'Drop target' },
      'input[name=user]': { role: 'textbox', name: 'Username' },
      'input[name=pass]': { role: 'textbox', name: 'Password' },
    },
    selects: {
      'select[name=role]': ['admin', 'user', 'guest'],
    },
  },
  'https://example.test/welcome': {
    title: 'Welcome',
    text: 'You are logged in',
    elements: {
      '#logout': { role: 'button', name: 'Log out' },
    },
  },
};
