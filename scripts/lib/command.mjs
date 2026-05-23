import { execFileSync } from 'node:child_process';

export function runCommand(command, args, options = {}) {
  return execFileSync(command, args, options);
}

export function assertCommandAvailable(command, args, installHint) {
  try {
    runCommand(command, args, { stdio: 'ignore' });
  } catch {
    throw new Error(`${command} is required. ${installHint}`);
  }
}
