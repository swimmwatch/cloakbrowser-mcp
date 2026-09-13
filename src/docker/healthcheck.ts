import process from 'node:process';
import { probeDockerLauncherHealth } from '#src/docker/health';

void probeDockerLauncherHealth().then(
  () => {
    process.exitCode = 0;
  },
  () => {
    process.exitCode = 1;
  },
);
