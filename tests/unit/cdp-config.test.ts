import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CdpConfigurationError,
  createCdpEndpointConfig,
  parseCdpAdvertisedScheme,
  parseCdpPortRange,
  resolveCdpBooleanSetting,
  resolveCdpSessionEnabled,
  resolveCdpSetting,
  validateManagedCdpLaunchArgs,
} from '@/cdp/config.js';

describe('CDP configuration foundations', () => {
  it('parses every valid single port and inclusive range boundary', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 65_535 }), (port) => {
        expect(parseCdpPortRange(String(port))).toEqual({ end: port, start: port });
      }),
    );

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 65_535 }), fc.integer({ min: 1, max: 65_535 }), (left, right) => {
        const start = Math.min(left, right);
        const end = Math.max(left, right);
        expect(parseCdpPortRange(`${start}-${end}`)).toEqual({ end, start });
      }),
    );
  });

  it.each([
    '',
    ' ',
    '\t9222',
    '9222\n',
    '+9222',
    '-9222',
    '9e3',
    '9222.0',
    '9222-',
    '-9222-9223',
    '9222--9223',
    '9223-9222',
    '0',
    '0-1',
    '65536',
    '65535-65536',
    '９２２２',
    '9222junk',
  ])('rejects invalid port range %j', (value) => {
    expect(() => parseCdpPortRange(value)).toThrow(CdpConfigurationError);
  });

  it('resolves only the selected CLI, environment, or default setting', () => {
    const parse = (value: string): number => {
      if (!/^\d+$/u.test(value)) throw new CdpConfigurationError('invalid selected value');
      return Number(value);
    };

    expect(
      resolveCdpSetting({
        cliValue: '42',
        defaultValue: 7,
        environmentValue: 'shadowed-invalid',
        parse,
      }),
    ).toBe(42);
    expect(resolveCdpSetting({ defaultValue: 7, environmentValue: '21', parse })).toBe(21);
    expect(resolveCdpSetting({ defaultValue: 7, parse })).toBe(7);
    expect(() => resolveCdpSetting({ defaultValue: 7, environmentValue: 'invalid', parse })).toThrow(
      'invalid selected value',
    );
  });

  it('gives explicit positive and negative CLI flags precedence over environment', () => {
    expect(
      resolveCdpBooleanSetting({
        defaultValue: false,
        environmentValue: 'false',
        label: 'CDP enabled',
        positiveCli: true,
      }),
    ).toBe(true);
    expect(
      resolveCdpBooleanSetting({
        defaultValue: false,
        environmentValue: 'true',
        label: 'CDP enabled',
        negativeCli: true,
      }),
    ).toBe(false);
    expect(
      resolveCdpBooleanSetting({
        defaultValue: true,
        environmentValue: 'shadowed-invalid',
        label: 'CDP remote access',
        negativeCli: true,
      }),
    ).toBe(false);
  });

  it('rejects conflicting CLI boolean forms and an effective invalid environment value', () => {
    expect(() =>
      resolveCdpBooleanSetting({
        defaultValue: false,
        label: 'CDP enabled',
        negativeCli: true,
        positiveCli: true,
      }),
    ).toThrow('CDP enabled cannot use both positive and negative CLI forms');
    expect(() =>
      resolveCdpBooleanSetting({
        defaultValue: false,
        environmentValue: '1',
        label: 'CDP enabled',
      }),
    ).toThrow('CDP enabled environment value must be "true" or "false"');
  });

  it('resolves stdio and HTTP absent/true/false enablement deterministically', () => {
    expect(resolveCdpSessionEnabled(false)).toBe(false);
    expect(resolveCdpSessionEnabled(true)).toBe(true);
    expect(resolveCdpSessionEnabled(false, true)).toBe(true);
    expect(resolveCdpSessionEnabled(true, false)).toBe(false);
  });

  it('accepts only exact advertised schemes', () => {
    expect(parseCdpAdvertisedScheme('http')).toBe('http');
    expect(parseCdpAdvertisedScheme('https')).toBe('https');
    for (const value of ['', 'HTTP', 'Https', ' ws', 'wss', 'https ']) {
      expect(() => parseCdpAdvertisedScheme(value)).toThrow(CdpConfigurationError);
    }
  });

  it('validates loopback, non-loopback, wildcard, and advertised host roles', () => {
    expect(createCdpEndpointConfig({})).toEqual({
      allowRemote: false,
      advertisedScheme: 'http',
      bindHost: '127.0.0.1',
      processEnabled: false,
    });
    expect(
      createCdpEndpointConfig({
        advertisedHost: 'cdp.example.test',
        advertisedScheme: 'https',
        allowRemote: true,
        bindHost: '0.0.0.0',
        portRange: '9222-9224',
      }),
    ).toEqual({
      allowRemote: true,
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      bindHost: '0.0.0.0',
      portRange: { end: 9224, start: 9222 },
      processEnabled: false,
    });
    expect(
      createCdpEndpointConfig({ allowRemote: true, bindHost: '::', advertisedHost: '::1' }),
    ).toMatchObject({ advertisedHost: '::1', bindHost: '::' });

    expect(() => createCdpEndpointConfig({ allowRemote: true, bindHost: '0.0.0.0' })).toThrow(
      'CDP wildcard bind host requires an advertised host',
    );
  });

  it.each(['127.0.0.2', '::1', 'localhost'])('accepts loopback bind host %s', (bindHost) => {
    expect(createCdpEndpointConfig({ bindHost })).toMatchObject({ bindHost });
  });

  it.each(['10.0.0.2', '203.0.113.2', 'cdp.example.test'])(
    'requires remote access opt-in for bind host %s',
    (bindHost) => {
      expect(() => createCdpEndpointConfig({ bindHost })).toThrow(
        'CDP bind host requires remote access opt-in',
      );
    },
  );

  it.each([
    'https://cdp.example.test',
    'user@cdp.example.test',
    'cdp.example.test:9222',
    'cdp.example.test/path',
    'cdp.example.test?query',
    'cdp.example.test#fragment',
    '0.0.0.0',
    '::',
    '0',
    '127.1',
    '0x7f000001',
    'bad host',
  ])('rejects invalid advertised host %j', (advertisedHost) => {
    expect(() =>
      createCdpEndpointConfig({
        advertisedHost,
        allowRemote: true,
        bindHost: '0.0.0.0',
      }),
    ).toThrow(CdpConfigurationError);
  });

  it('requires a pool when the process default is enabled', () => {
    expect(() => createCdpEndpointConfig({ processEnabled: true })).toThrow(
      'CDP port range is required when managed CDP is enabled',
    );
  });

  it.each([
    '--remote-debugging-port',
    '--remote-debugging-port=9222',
    '--remote-debugging-address',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-pipe',
    '--remote-debugging-pipe=true',
  ])('rejects managed-CDP raw argument conflict %s without dumping other values', (flag) => {
    expect(() => validateManagedCdpLaunchArgs(['--proxy-server=secret.invalid', flag], true)).toThrow(
      flag.split('=', 1)[0],
    );
    let thrown: unknown;
    try {
      validateManagedCdpLaunchArgs(['--proxy-server=secret.invalid', flag], true);
    } catch (error) {
      thrown = error;
    }
    expect(String(thrown)).not.toContain('secret.invalid');
  });

  it('preserves raw arguments when disabled and ignores lookalike flags', () => {
    const args = [
      '--remote-debugging-portx=9222',
      '--remote-debugging-address-book=127.0.0.1',
      '--remote-debugging-pipeline',
    ];
    expect(() => validateManagedCdpLaunchArgs(args, true)).not.toThrow();
    expect(() => validateManagedCdpLaunchArgs(['--remote-debugging-port=9222'], false)).not.toThrow();
  });
});
