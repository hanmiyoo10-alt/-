import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal } from '../../tooling/assertions.mjs';
import { runSuite as runBaseSuite } from './bounded-telemetry-capsule-v06411.test.mjs';

const BUILDER = 'products/simcore/tooling/build-06411-bounded-telemetry-capsule-compaction-v2.py';
const BASE_BUILDER = 'products/simcore/tooling/build-06411-bounded-telemetry-capsule-compaction.py';

function versionOf(source) { return source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || ''; }

function materialize(source) {
  if (versionOf(source) === '0.64.11') return source;
  equal(versionOf(source), '0.64.10', 'v0.64.11 v2 suite source version');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06411-v2-builder-'));
  try {
    fs.mkdirSync(path.join(root, 'plugins/simcore'), { recursive: true });
    fs.mkdirSync(path.join(root, 'products/simcore/tooling'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plugins/simcore/latest.js'), source, 'utf8');
    fs.writeFileSync(path.join(root, 'plugins/simcore/install.js'), source, 'utf8');
    fs.copyFileSync(BASE_BUILDER, path.join(root, BASE_BUILDER));
    fs.copyFileSync(BUILDER, path.join(root, BUILDER));
    const run = spawnSync('python3', [path.join(root, BUILDER)], {
      cwd: root, encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024,
    });
    if (run.status !== 0) throw new Error(`06411 v2 builder failed: ${run.stderr || run.stdout}`);
    const latest = fs.readFileSync(path.join(root, 'plugins/simcore/latest.js'), 'utf8');
    const install = fs.readFileSync(path.join(root, 'plugins/simcore/install.js'), 'utf8');
    equal(latest, install, 'v2 builder latest/install equality');
    equal(versionOf(latest), '0.64.11', 'v2 builder target version');
    return latest;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

export async function runSuite(ctx) {
  const candidate = materialize(String(ctx.source));
  return runBaseSuite({ ...ctx, source: candidate });
}
