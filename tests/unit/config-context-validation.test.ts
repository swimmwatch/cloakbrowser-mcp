import { describe, expect, it } from 'vitest';
import { parseBridgeContextOptions } from '@/bridge/config.js';

describe('browser context validation boundaries', () => {
  const invalidOptions: Array<[unknown, string]> = [
    [null, 'contextOptions must be an object'],
    [[], 'contextOptions must be an object'],
    [{ viewport: 'wide' }, 'viewport must be an object or null'],
    [{ viewport: { width: 640, height: 1.5 } }, 'viewport.height must be a positive integer'],
    [{ colorScheme: 'sepia' }, 'colorScheme must be "dark", "light", or "no-preference"'],
    [{ permissions: 'geolocation' }, 'permissions must be a string array'],
    [{ permissions: [''] }, 'permissions[0] must be a non-empty string'],
    [{ geolocation: null }, 'geolocation must be an object'],
    [{ geolocation: { longitude: -181, latitude: 0 } }, 'longitude must be between -180 and 180'],
    [{ geolocation: { longitude: 181, latitude: 0 } }, 'longitude must be between -180 and 180'],
    [{ geolocation: { longitude: 0, latitude: -91 } }, 'latitude must be between -90 and 90'],
    [{ geolocation: { longitude: 0, latitude: 91 } }, 'latitude must be between -90 and 90'],
    [{ geolocation: { longitude: Infinity, latitude: 0 } }, 'longitude must be a finite number'],
    [{ geolocation: { longitude: 0, latitude: 0, accuracy: -1 } }, 'accuracy must be a non-negative number'],
    [{ extraHTTPHeaders: [] }, 'extraHTTPHeaders must be an object'],
    [{ extraHTTPHeaders: { 'x-test': 1 } }, 'extraHTTPHeaders.x-test must be a string'],
    [{ httpCredentials: null }, 'httpCredentials must be an object'],
    [
      { httpCredentials: { username: 'user', password: 'pass', origin: ' ' } },
      'httpCredentials.origin must be a non-empty string',
    ],
    [
      { httpCredentials: { username: 'user', password: 'pass', send: 'sometimes' } },
      'httpCredentials.send must be "always" or "unauthorized"',
    ],
    [{ userAgent: 1 }, 'userAgent must be a string'],
    [{ locale: ' ' }, 'locale must be a non-empty string'],
    [{ ignoreHTTPSErrors: 'true' }, 'ignoreHTTPSErrors must be a boolean'],
    [{ deviceScaleFactor: 0 }, 'deviceScaleFactor must be a positive number'],
    [{ deviceScaleFactor: NaN }, 'deviceScaleFactor must be a finite number'],
  ];
  it.each(invalidOptions)('rejects %j with an actionable diagnostic', (value, message) => {
    const parse = () => parseBridgeContextOptions(value);
    expect(parse).toThrow(message);
  });

  it('accepts inclusive geolocation boundaries and preserves intentional empty values', () => {
    const options = {
      userAgent: ' Agent ',
      viewport: null,
      colorScheme: 'no-preference',
      permissions: [],
      geolocation: { longitude: -180, latitude: 90, accuracy: 0 },
      httpCredentials: { username: ' user ', password: '', origin: ' https://example.test ', send: 'always' },
      extraHTTPHeaders: { 'x-empty': '' },
      offline: false,
      hasTouch: true,
    };
    const parsed = parseBridgeContextOptions(options);
    const expected = {
      ...options,
      userAgent: 'Agent',
      httpCredentials: { username: 'user', password: '', origin: 'https://example.test', send: 'always' },
    };
    expect(parsed).toEqual(expected);
    expect(options.userAgent).toBe(' Agent ');
    const oppositeBoundary = { geolocation: { longitude: 180, latitude: -90 } };
    const oppositeParsed = parseBridgeContextOptions(oppositeBoundary);
    expect(oppositeParsed).toEqual(oppositeBoundary);
  });

  it('uses the caller label in nested diagnostics', () => {
    const value = { permissions: [false] };
    const parse = () => parseBridgeContextOptions(value, 'initialize.contextOptions');
    expect(parse).toThrow('initialize.contextOptions.permissions[0] must be a string');
  });
});
