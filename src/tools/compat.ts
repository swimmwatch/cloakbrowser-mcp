import { fail } from '@/errors/index.js';

export function targetSelector(input: { selector?: string; target?: string }, field = 'selector'): string {
  const selector = input.selector ?? input.target;
  if (typeof selector === 'string') return selector;
  fail('INVALID_INPUT', `${field} or target is required`);
  return '';
}

export function secondsToMilliseconds(seconds: number): number {
  return Math.max(1, Math.round(seconds * 1000));
}
