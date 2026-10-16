import { describe, expect, it } from 'vitest';
import { resolveDockerLauncherExitCode } from '@/docker/launcher.js';
describe('resolveDockerLauncherExitCode', () => {
  it('does not let a later successful CLI exit mask infrastructure failure', () => {
    const error = new Error('Xvfb exited unexpectedly');
    const resolveDockerLauncherExitCodeResult = resolveDockerLauncherExitCode(0, error);
    expect(resolveDockerLauncherExitCodeResult).toBe(1);
  });
  it('preserves normal CLI exit status without infrastructure failure', () => {
    const resolveDockerLauncherExitCodeResult2 = resolveDockerLauncherExitCode(7, undefined);
    expect(resolveDockerLauncherExitCodeResult2).toBe(7);
  });
});
