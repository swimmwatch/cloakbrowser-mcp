import { describe, expect, it } from 'vitest';
import {
  dockerDisplayEnsureRequestType,
  dockerDisplayEnsureResultType,
  dockerHealthProbeRequestType,
  dockerHealthProbeResultType,
  isDockerDisplayEnsureRequest,
  isDockerDisplayEnsureResult,
  isDockerHealthProbeRequest,
  isDockerHealthProbeResult,
} from '@/docker/protocol.js';

describe('Docker display IPC protocol', () => {
  it('accepts only complete display request and result messages', () => {
    expect(
      isDockerDisplayEnsureRequest({ type: dockerDisplayEnsureRequestType, requestId: 'request-1' }),
    ).toBe(true);
    expect(isDockerDisplayEnsureRequest({ type: dockerDisplayEnsureRequestType })).toBe(false);
    expect(
      isDockerDisplayEnsureResult({
        display: ':99',
        ok: true,
        requestId: 'request-1',
        type: dockerDisplayEnsureResultType,
      }),
    ).toBe(true);
    expect(
      isDockerDisplayEnsureResult({
        error: 'Xvfb failed',
        ok: false,
        requestId: 'request-1',
        type: dockerDisplayEnsureResultType,
      }),
    ).toBe(true);
    expect(
      isDockerDisplayEnsureResult({ ok: true, requestId: 'request-1', type: dockerDisplayEnsureResultType }),
    ).toBe(true);
    expect(
      isDockerDisplayEnsureResult({
        ok: 'true',
        requestId: 'request-1',
        type: dockerDisplayEnsureResultType,
      }),
    ).toBe(false);
  });

  it('rejects stale or incomplete health probe identities', () => {
    expect(
      isDockerHealthProbeRequest({
        nonce: 'nonce-1',
        requestId: 'request-1',
        type: dockerHealthProbeRequestType,
      }),
    ).toBe(true);
    expect(
      isDockerHealthProbeResult({
        nonce: 'nonce-1',
        processId: 42,
        requestId: 'request-1',
        type: dockerHealthProbeResultType,
      }),
    ).toBe(true);
    expect(
      isDockerHealthProbeResult({
        nonce: 'nonce-1',
        processId: '42',
        requestId: 'request-1',
        type: dockerHealthProbeResultType,
      }),
    ).toBe(false);
    expect(isDockerHealthProbeRequest({ requestId: 'request-1', type: dockerHealthProbeRequestType })).toBe(
      false,
    );
  });
});
