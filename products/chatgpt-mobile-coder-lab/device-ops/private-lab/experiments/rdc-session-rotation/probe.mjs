#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_VERSION = '0.2.50';
export const EXPECTED_DEVICE_SHA256 = '9dfde0c2794811a0ec3b989cffb529e597535e4dab811b45bcc2031720c5d724';
const ROOT = '/opt/mcl-private-lab/vendor/rdc-session-rotation';
const PACKAGE_JSON = path.join(ROOT, 'node_modules/@wonderwhy-er/desktop-commander/package.json');
const DEVICE_JS = path.join(ROOT, 'node_modules/@wonderwhy-er/desktop-commander/dist/remote-device/device.js');
const RECEIPT = '/opt/mcl-private-lab/receipts/rdc-rotation-repro.receipt';

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function simulateRotationRestart() {
  const persistedBefore = 'generation-0';
  const currentAccepted = 'generation-1';
  const memoryAfterRotation = currentAccepted;
  const persistedAfterRotation = persistedBefore;
  const restartLoaded = persistedAfterRotation;
  return {
    memoryRotated: memoryAfterRotation === 'generation-1',
    persistedStale: persistedAfterRotation === 'generation-0',
    restartRejected: restartLoaded !== currentAccepted,
  };
}

export function evaluateBaseline({ packageJsonText, deviceSource, expectedSha256 = EXPECTED_DEVICE_SHA256 }) {
  let pkg;
  try { pkg = JSON.parse(packageJsonText); } catch { return 'blocked'; }
  if (pkg.version !== EXPECTED_VERSION) return 'blocked';
  if (sha256(deviceSource) !== expectedSha256) return 'blocked';
  const structure =
    deviceSource.includes('async savePersistedConfig()') &&
    deviceSource.includes('const currentSessionStore = await this.remoteChannel.getSession();') &&
    deviceSource.includes('await fs.writeFile(this.configPath') &&
    !deviceSource.includes("onAuthStateChange((event, newSession)") &&
    !deviceSource.includes("event !== 'TOKEN_REFRESHED'");
  const model = simulateRotationRestart();
  return structure && model.memoryRotated && model.persistedStale && model.restartRejected ? 'pass' : 'fail';
}

export function receiptText(result) {
  return ['schema=mcl-private-check.v1', 'check=rdc-rotation-repro', `result=${result}`, 'details=withheld', ''].join('\n');
}

export async function runAtPaths({ packageJsonPath, deviceJsPath, receiptPath, expectedSha256 = EXPECTED_DEVICE_SHA256 }) {
  let result = 'unknown';
  try {
    const [packageJsonText, deviceSource] = await Promise.all([
      fs.readFile(packageJsonPath, 'utf8'), fs.readFile(deviceJsPath, 'utf8'),
    ]);
    result = evaluateBaseline({ packageJsonText, deviceSource, expectedSha256 });
  } catch (error) {
    result = error?.code === 'ENOENT' ? 'blocked' : 'unknown';
  }
  const tmp = `${receiptPath}.tmp`;
  await fs.writeFile(tmp, receiptText(result), { mode: 0o600 });
  await fs.rename(tmp, receiptPath);
  return result;
}

async function main() {
  const result = await runAtPaths({ packageJsonPath: PACKAGE_JSON, deviceJsPath: DEVICE_JS, receiptPath: RECEIPT });
  process.exitCode = result === 'pass' ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(() => { process.exitCode = 1; });
}
