'use strict';

const {execFileSync} = require('child_process');

const DEFAULT_ATTEMPTS = 3;
const DEFAULT_DELAY_MS = 250;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function readIdentity(args) {
  const endpoint = args.find((value) => typeof value === 'string' && value.startsWith('repos/'));
  return String(endpoint || 'unknown').slice(0, 240);
}

function assertReadOnly(args) {
  let explicitMethod = null;
  let hasFields = false;
  for (let index = 0; index < args.length; index += 1) {
    if (['--method', '-X'].includes(args[index])) explicitMethod = String(args[index + 1] || '').toUpperCase();
    if (['-f', '--raw-field', '-F', '--field'].includes(args[index])) hasFields = true;
  }
  if ((explicitMethod && explicitMethod !== 'GET') || (hasFields && explicitMethod !== 'GET')) {
    throw new Error('github-cli-read only supports read-only gh api requests');
  }
}

function failure(read, failureClass, attempts) {
  return Object.freeze({read, failureClass, attempts});
}

function readGitHubCliJson(args, options = {}) {
  assertReadOnly(args);
  const attempts = Math.max(1, Number(options.attempts || DEFAULT_ATTEMPTS));
  const delayMs = Math.max(0, Number(options.delayMs ?? DEFAULT_DELAY_MS));
  const exec = options.execFileSync || execFileSync;
  const sleepFn = options.sleep || sleep;
  const read = readIdentity(args);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let output = '';
    try {
      output = exec('gh', ['api', ...args], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        env: process.env,
      });
    } catch {
      if (attempt === attempts) return {value: null, failure: failure(read, 'GH_API_COMMAND_FAILED', attempts)};
      if (delayMs > 0) sleepFn(delayMs);
      continue;
    }

    const trimmed = String(output || '').trim();
    if (!trimmed) return {value: null, failure: null};
    try {
      return {value: JSON.parse(trimmed), failure: null};
    } catch {
      if (attempt === attempts) return {value: null, failure: failure(read, 'GH_API_JSON_INVALID', attempts)};
      if (delayMs > 0) sleepFn(delayMs);
    }
  }
  return {value: null, failure: failure(read, 'GH_API_READ_FAILED', attempts)};
}

module.exports = {
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  readGitHubCliJson,
};
