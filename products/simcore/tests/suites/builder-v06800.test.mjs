import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { runSuite as runCommunityV06800 } from './community-parent-local-alias-v06800.test.mjs';

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.67.0') {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v06800-builder-predecessor-source-not-active', status: 'PASS' }],
    };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-06800-community-parent-local-alias-classification-repair.py');
  assert(fs.existsSync(builder), 'v0.68 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06800-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'latest.js'), ctx.source, 'utf8');
    fs.writeFileSync(path.join(pluginDir, 'install.js'), ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8' });
    equal(run.status, 0, `v0.68 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('06800_BUILD_PASS'), `v0.68 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(path.join(pluginDir, 'latest.js'), 'utf8');
    const install = fs.readFileSync(path.join(pluginDir, 'install.js'), 'utf8');
    equal(latest, install, 'v0.68 builder latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.68.0', 'v0.68 metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.68.0', 'v0.68 runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.68.0', 'v0.68 Host identity');

    const result = await runCommunityV06800({ ...ctx, source: latest, loader: new BundleLoader(latest) });
    equal(result.status, 'PASS', 'v0.68 generated Community regression');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v06800-builder-executes-from-exact-v06700-source', status: 'PASS' },
        { id: 'v06800-builder-latest-install-identical', status: 'PASS' },
        { id: 'v06800-builder-runtime-identity-converged', status: 'PASS' },
        { id: 'v06800-generated-community-classifier-and-migration-pass', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
