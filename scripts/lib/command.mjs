import { execFileSync } from 'node:child_process';
import process from 'node:process';

export function runCommand(command, args, options = {}) {
  return execFileSync(normalizeCommand(command), args, options);
}

export function assertCommandAvailable(command, args, installHint) {
  try {
    runCommand(command, args, { stdio: 'ignore' });
  } catch {
    throw new Error(`${command} is required. ${installHint}`);
  }
}

function normalizeCommand(command) {
  if (process.platform === 'win32' && command === 'npm') {
    return 'npm.cmd';
  }
  return command;
}
