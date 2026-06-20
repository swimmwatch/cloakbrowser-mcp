import { execFileSync } from 'node:child_process';
import process from 'node:process';

export function runCommand(command, args, options = {}) {
  const resolvedCommand = normalizeCommand(command);
  const execOptions =
    options.shell === undefined && shouldUseShell(resolvedCommand) ? { ...options, shell: true } : options;
  return execFileSync(resolvedCommand, args, execOptions);
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

function shouldUseShell(command) {
  return process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
}
