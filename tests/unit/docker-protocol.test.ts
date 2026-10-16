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
    const isDockerDisplayEnsureRequestOptions = {
      type: dockerDisplayEnsureRequestType,
      requestId: 'request-1',
    } as const;
    const isDockerDisplayEnsureRequestResult = isDockerDisplayEnsureRequest(
      isDockerDisplayEnsureRequestOptions,
    );
    expect(isDockerDisplayEnsureRequestResult).toBe(true);
    const isDockerDisplayEnsureRequestOptions2 = { type: dockerDisplayEnsureRequestType } as const;
    const isDockerDisplayEnsureRequestResult2 = isDockerDisplayEnsureRequest(
      isDockerDisplayEnsureRequestOptions2,
    );
    expect(isDockerDisplayEnsureRequestResult2).toBe(false);
    const isDockerDisplayEnsureResultOptions = {
      display: ':99',
      ok: true,
      requestId: 'request-1',
      type: dockerDisplayEnsureResultType,
    } as const;
    const isDockerDisplayEnsureResultResult = isDockerDisplayEnsureResult(isDockerDisplayEnsureResultOptions);
    expect(isDockerDisplayEnsureResultResult).toBe(true);
    const isDockerDisplayEnsureResultOptions2 = {
      error: 'Xvfb failed',
      ok: false,
      requestId: 'request-1',
      type: dockerDisplayEnsureResultType,
    } as const;
    const isDockerDisplayEnsureResultResult2 = isDockerDisplayEnsureResult(
      isDockerDisplayEnsureResultOptions2,
    );
    expect(isDockerDisplayEnsureResultResult2).toBe(true);
    const isDockerDisplayEnsureResultOptions3 = {
      ok: true,
      requestId: 'request-1',
      type: dockerDisplayEnsureResultType,
    } as const;
    const isDockerDisplayEnsureResultResult3 = isDockerDisplayEnsureResult(
      isDockerDisplayEnsureResultOptions3,
    );
    expect(isDockerDisplayEnsureResultResult3).toBe(true);
    const isDockerDisplayEnsureResultOptions4 = {
      ok: 'true',
      requestId: 'request-1',
      type: dockerDisplayEnsureResultType,
    } as const;
    const isDockerDisplayEnsureResultResult4 = isDockerDisplayEnsureResult(
      isDockerDisplayEnsureResultOptions4,
    );
    expect(isDockerDisplayEnsureResultResult4).toBe(false);
  });
  it('rejects stale or incomplete health probe identities', () => {
    const isDockerHealthProbeRequestOptions = {
      nonce: 'nonce-1',
      requestId: 'request-1',
      type: dockerHealthProbeRequestType,
    } as const;
    const isDockerHealthProbeRequestResult = isDockerHealthProbeRequest(isDockerHealthProbeRequestOptions);
    expect(isDockerHealthProbeRequestResult).toBe(true);
    const isDockerHealthProbeResultOptions = {
      nonce: 'nonce-1',
      processId: 42,
      requestId: 'request-1',
      type: dockerHealthProbeResultType,
    } as const;
    const isDockerHealthProbeResultResult = isDockerHealthProbeResult(isDockerHealthProbeResultOptions);
    expect(isDockerHealthProbeResultResult).toBe(true);
    const isDockerHealthProbeResultOptions2 = {
      nonce: 'nonce-1',
      processId: '42',
      requestId: 'request-1',
      type: dockerHealthProbeResultType,
    } as const;
    const isDockerHealthProbeResultResult2 = isDockerHealthProbeResult(isDockerHealthProbeResultOptions2);
    expect(isDockerHealthProbeResultResult2).toBe(false);
    const isDockerHealthProbeRequestOptions2 = {
      requestId: 'request-1',
      type: dockerHealthProbeRequestType,
    } as const;
    const isDockerHealthProbeRequestResult2 = isDockerHealthProbeRequest(isDockerHealthProbeRequestOptions2);
    expect(isDockerHealthProbeRequestResult2).toBe(false);
  });
});
