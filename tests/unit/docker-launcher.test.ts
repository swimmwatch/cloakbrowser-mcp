import { describe, expect, it } from 'vitest';
import { resolveDockerLauncherExitCode } from '@/docker/launcher.js';

describe('resolveDockerLauncherExitCode', () => {
  it('does not let a later successful CLI exit mask infrastructure failure', () => {
    expect(resolveDockerLauncherExitCode(0, new Error('Xvfb exited unexpectedly'))).toBe(1);
  });

  it('preserves normal CLI exit status without infrastructure failure', () => {
    expect(resolveDockerLauncherExitCode(7, undefined)).toBe(7);
  });
});
