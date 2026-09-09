import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { runActiveProjectedValidationContract } from './release-validation-active-r2-9.mjs';

const TARGET_VERSION = '0.70.11';
const TARGET_SCENARIO = '07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT';
const BRIDGE_ASSERTION = 'r2-9-bounded-telemetry-v07011-operator-scenario-bridge';

function count(source, marker) {
  return String(source).split(marker).length - 1;
}

function cardText(source) {
  const startToken = '  const OPERATOR_RELEASE_CARD = Object.freeze({';
  const endToken = '  async function openPanel() {';
  const start = source.indexOf(startToken);
  const end = start >= 0 ? source.indexOf(endToken, start + startToken.length) : -1;
  assert(start >= 0 && end > start, 'v0.70.11 bridge control operator-card bounds missing');
  return source.slice(start, end);
}

function materializeCandidate(source) {
  const builder = path.resolve(process.cwd(), 'products/simcore/tooling/build-07011-operator-release-card-metadata-repair.py');
  assert(fs.existsSync(builder), 'v0.70.11 bridge control builder missing');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-07011-bounded-bridge-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, source, 'utf8');
    fs.writeFileSync(installPath, source, 'utf8');

    const run = spawnSync('python3', [builder], {
      cwd: tmp,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    });
    equal(run.status, 0, `v0.70.11 bridge control builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('07011_BUILD_PASS'), `v0.70.11 bridge control builder PASS marker missing: ${run.stdout}`);
    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.70.11 bridge control latest/install byte identity');
    return latest;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function runSuite(ctx) {
  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (!['0.70.10', TARGET_VERSION].includes(sourceVersion)) {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v07011-bounded-inherited-bridge-source-not-active', status: 'PASS' }],
    };
  }

  const candidate = sourceVersion === TARGET_VERSION ? ctx.source : materializeCandidate(ctx.source);
  equal(candidate.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', TARGET_VERSION, 'v0.70.11 bridge candidate metadata identity');
  const card = cardText(candidate);
  equal(count(card, `scenario: '${TARGET_SCENARIO}'`), 1, 'v0.70.11 bridge candidate current scenario cardinality');
  assert(!card.includes("scenario: '06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT'"), 'v0.70.11 runtime card must not retain historical scenario');

  const result = await runActiveProjectedValidationContract('bounded-telemetry-capsule', { ...ctx, source: candidate });
  equal(result.status || 'PASS', 'PASS', 'v0.70.11 active bounded-telemetry inherited projection');
  assert((result.assertions || []).some((row) => row?.id === BRIDGE_ASSERTION && row?.status === 'PASS'), 'v0.70.11 bounded inherited scenario bridge assertion missing');
  assert((result.assertions || []).some((row) => row?.id === 'r2-9-bounded-telemetry-capsule-explicit-authority-0.69.2' && row?.status === 'PASS'), 'v0.70.11 bounded inherited explicit authority assertion missing');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'v07011-real-candidate-current-card-scenario', status: 'PASS' },
      { id: 'v07011-bounded-inherited-authority-scenario-bridge', status: 'PASS' },
      { id: 'v07011-bounded-inherited-authority-remains-06902', status: 'PASS' },
    ],
  };
}
