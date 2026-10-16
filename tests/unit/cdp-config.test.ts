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
    const integerOptions = { min: 1, max: 65535 } as const;
    const integerResult = fc.integer(integerOptions);
    const propertyResult = fc.property(integerResult, (port) => {
      const stringResult = String(port);
      const parseCdpPortRangeResult = parseCdpPortRange(stringResult);
      const receiverActual = parseCdpPortRangeResult;
      const toEqualOptions = { end: port, start: port } as const;
      expect(receiverActual).toEqual(toEqualOptions);
    });
    fc.assert(propertyResult);
    const integerOptions2 = { min: 1, max: 65535 } as const;
    const integerResult2 = fc.integer(integerOptions2);
    const integerOptions3 = { min: 1, max: 65535 } as const;
    const integerResult3 = fc.integer(integerOptions3);
    const propertyResult2 = fc.property(integerResult2, integerResult3, (left, right) => {
      const start = Math.min(left, right);
      const end = Math.max(left, right);
      const message = `${start}-${end}`;
      const parseCdpPortRangeResult2 = parseCdpPortRange(message);
      const receiver2Actual = parseCdpPortRangeResult2;
      const toEqualOptions2 = { end, start } as const;
      expect(receiver2Actual).toEqual(toEqualOptions2);
    });
    fc.assert(propertyResult2);
  });
  const values: readonly string[] = [
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
  ];
  it.each(values)('rejects invalid port range %j', (value) => {
    expect(() => parseCdpPortRange(value)).toThrow(CdpConfigurationError);
  });
  it('resolves only the selected CLI, environment, or default setting', () => {
    const parse = (value: string): number => {
      if (!/^\d+$/u.test(value)) throw new CdpConfigurationError('invalid selected value');
      return Number(value);
    };
    const resolveCdpSettingOptions = {
      cliValue: '42',
      defaultValue: 7,
      environmentValue: 'shadowed-invalid',
      parse,
    } as const;
    const resolveCdpSettingResult = resolveCdpSetting(resolveCdpSettingOptions);
    expect(resolveCdpSettingResult).toBe(42);
    const resolveCdpSettingOptions2 = { defaultValue: 7, environmentValue: '21', parse } as const;
    const resolveCdpSettingResult2 = resolveCdpSetting(resolveCdpSettingOptions2);
    expect(resolveCdpSettingResult2).toBe(21);
    const resolveCdpSettingOptions3 = { defaultValue: 7, parse } as const;
    const resolveCdpSettingResult3 = resolveCdpSetting(resolveCdpSettingOptions3);
    expect(resolveCdpSettingResult3).toBe(7);
    expect(() => {
      const resolveCdpSettingOptions4 = { defaultValue: 7, environmentValue: 'invalid', parse } as const;
      return resolveCdpSetting(resolveCdpSettingOptions4);
    }).toThrow('invalid selected value');
  });
  it('gives explicit positive and negative CLI flags precedence over environment', () => {
    const resolveCdpBooleanSettingOptions = {
      defaultValue: false,
      environmentValue: 'false',
      label: 'CDP enabled',
      positiveCli: true,
    } as const;
    const resolveCdpBooleanSettingResult = resolveCdpBooleanSetting(resolveCdpBooleanSettingOptions);
    expect(resolveCdpBooleanSettingResult).toBe(true);
    const resolveCdpBooleanSettingOptions2 = {
      defaultValue: false,
      environmentValue: 'true',
      label: 'CDP enabled',
      negativeCli: true,
    } as const;
    const resolveCdpBooleanSettingResult2 = resolveCdpBooleanSetting(resolveCdpBooleanSettingOptions2);
    expect(resolveCdpBooleanSettingResult2).toBe(false);
    const resolveCdpBooleanSettingOptions3 = {
      defaultValue: true,
      environmentValue: 'shadowed-invalid',
      label: 'CDP remote access',
      negativeCli: true,
    } as const;
    const resolveCdpBooleanSettingResult3 = resolveCdpBooleanSetting(resolveCdpBooleanSettingOptions3);
    expect(resolveCdpBooleanSettingResult3).toBe(false);
  });
  it('rejects conflicting CLI boolean forms and an effective invalid environment value', () => {
    expect(() => {
      const resolveCdpBooleanSettingOptions4 = {
        defaultValue: false,
        label: 'CDP enabled',
        negativeCli: true,
        positiveCli: true,
      } as const;
      return resolveCdpBooleanSetting(resolveCdpBooleanSettingOptions4);
    }).toThrow('CDP enabled cannot use both positive and negative CLI forms');
    expect(() => {
      const resolveCdpBooleanSettingOptions5 = {
        defaultValue: false,
        environmentValue: '1',
        label: 'CDP enabled',
      } as const;
      return resolveCdpBooleanSetting(resolveCdpBooleanSettingOptions5);
    }).toThrow('CDP enabled environment value must be "true" or "false"');
  });
  it('resolves stdio and HTTP absent/true/false enablement deterministically', () => {
    const resolveCdpSessionEnabledResult = resolveCdpSessionEnabled(false);
    expect(resolveCdpSessionEnabledResult).toBe(false);
    const resolveCdpSessionEnabledResult2 = resolveCdpSessionEnabled(true);
    expect(resolveCdpSessionEnabledResult2).toBe(true);
    const resolveCdpSessionEnabledResult3 = resolveCdpSessionEnabled(false, true);
    expect(resolveCdpSessionEnabledResult3).toBe(true);
    const resolveCdpSessionEnabledResult4 = resolveCdpSessionEnabled(true, false);
    expect(resolveCdpSessionEnabledResult4).toBe(false);
  });
  it('accepts only exact advertised schemes', () => {
    const parseCdpAdvertisedSchemeResult = parseCdpAdvertisedScheme('http');
    expect(parseCdpAdvertisedSchemeResult).toBe('http');
    const parseCdpAdvertisedSchemeResult2 = parseCdpAdvertisedScheme('https');
    expect(parseCdpAdvertisedSchemeResult2).toBe('https');
    for (const value of ['', 'HTTP', 'Https', ' ws', 'wss', 'https ']) {
      expect(() => parseCdpAdvertisedScheme(value)).toThrow(CdpConfigurationError);
    }
  });
  it('validates loopback, non-loopback, wildcard, and advertised host roles', () => {
    const createCdpEndpointConfigOptions = {} as const;
    const cdpEndpointConfigResult = createCdpEndpointConfig(createCdpEndpointConfigOptions);
    const receiver3Actual = cdpEndpointConfigResult;
    const toEqualOptions3 = {
      allowRemote: false,
      advertisedScheme: 'http',
      bindHost: '127.0.0.1',
      processEnabled: false,
    } as const;
    expect(receiver3Actual).toEqual(toEqualOptions3);
    const createCdpEndpointConfigOptions2 = {
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      allowRemote: true,
      bindHost: '0.0.0.0',
      portRange: '9222-9224',
    } as const;
    const cdpEndpointConfigResult2 = createCdpEndpointConfig(createCdpEndpointConfigOptions2);
    const receiver4Actual = cdpEndpointConfigResult2;
    const toEqualOptions4 = {
      allowRemote: true,
      advertisedHost: 'cdp.example.test',
      advertisedScheme: 'https',
      bindHost: '0.0.0.0',
      portRange: { end: 9224, start: 9222 },
      processEnabled: false,
    } as const;
    expect(receiver4Actual).toEqual(toEqualOptions4);
    const createCdpEndpointConfigOptions3 = {
      allowRemote: true,
      bindHost: '::',
      advertisedHost: '::1',
    } as const;
    const cdpEndpointConfigResult3 = createCdpEndpointConfig(createCdpEndpointConfigOptions3);
    const receiver5Actual = cdpEndpointConfigResult3;
    const toMatchObjectOptions = { advertisedHost: '::1', bindHost: '::' } as const;
    expect(receiver5Actual).toMatchObject(toMatchObjectOptions);
    expect(() => {
      const createCdpEndpointConfigOptions4 = { allowRemote: true, bindHost: '0.0.0.0' } as const;
      return createCdpEndpointConfig(createCdpEndpointConfigOptions4);
    }).toThrow('CDP wildcard bind host requires an advertised host');
  });
  const values2: readonly string[] = ['127.0.0.2', '::1', 'localhost'];
  it.each(values2)('accepts loopback bind host %s', (bindHost) => {
    const createCdpEndpointConfigOptions5 = { bindHost } as const;
    const cdpEndpointConfigResult4 = createCdpEndpointConfig(createCdpEndpointConfigOptions5);
    const receiver6Actual = cdpEndpointConfigResult4;
    const toMatchObjectOptions2 = { bindHost } as const;
    expect(receiver6Actual).toMatchObject(toMatchObjectOptions2);
  });
  const values3: readonly string[] = ['10.0.0.2', '203.0.113.2', 'cdp.example.test'];
  it.each(values3)('requires remote access opt-in for bind host %s', (bindHost) => {
    expect(() => {
      const createCdpEndpointConfigOptions6 = { bindHost } as const;
      return createCdpEndpointConfig(createCdpEndpointConfigOptions6);
    }).toThrow('CDP bind host requires remote access opt-in');
  });
  const values4: readonly string[] = [
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
  ];
  it.each(values4)('rejects invalid advertised host %j', (advertisedHost) => {
    expect(() => {
      const createCdpEndpointConfigOptions7 = {
        advertisedHost,
        allowRemote: true,
        bindHost: '0.0.0.0',
      } as const;
      return createCdpEndpointConfig(createCdpEndpointConfigOptions7);
    }).toThrow(CdpConfigurationError);
  });
  it('requires a pool when the process default is enabled', () => {
    expect(() => {
      const createCdpEndpointConfigOptions8 = { processEnabled: true } as const;
      return createCdpEndpointConfig(createCdpEndpointConfigOptions8);
    }).toThrow('CDP port range is required when managed CDP is enabled');
  });
  const values5: readonly string[] = [
    '--remote-debugging-port',
    '--remote-debugging-port=9222',
    '--remote-debugging-address',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-pipe',
    '--remote-debugging-pipe=true',
  ];
  it.each(values5)('rejects managed-CDP raw argument conflict %s without dumping other values', (flag) => {
    const receiver7Actual = () => {
      const values6: readonly string[] = ['--proxy-server=secret.invalid', flag];
      return validateManagedCdpLaunchArgs(values6, true);
    };
    const argumentValue = flag.split('=', 1)[0];
    expect(receiver7Actual).toThrow(argumentValue);
    let thrown: unknown;
    try {
      const values7: readonly string[] = ['--proxy-server=secret.invalid', flag];
      validateManagedCdpLaunchArgs(values7, true);
    } catch (error) {
      thrown = error;
    }
    const stringResult2 = String(thrown);
    expect(stringResult2).not.toContain('secret.invalid');
  });
  it('preserves raw arguments when disabled and ignores lookalike flags', () => {
    const args = [
      '--remote-debugging-portx=9222',
      '--remote-debugging-address-book=127.0.0.1',
      '--remote-debugging-pipeline',
    ];
    expect(() => validateManagedCdpLaunchArgs(args, true)).not.toThrow();
    expect(() => {
      const values8: readonly string[] = ['--remote-debugging-port=9222'];
      return validateManagedCdpLaunchArgs(values8, false);
    }).not.toThrow();
  });
});
