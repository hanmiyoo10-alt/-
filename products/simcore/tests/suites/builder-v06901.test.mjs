import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

class MemorySessionStorage {
  constructor() { this.map = new Map(); this.setCount = 0; }
  getItem(key) { return this.map.has(String(key)) ? this.map.get(String(key)) : null; }
  setItem(key, value) { this.setCount += 1; this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(String(key)); }
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.69.0') {
    return { coverage: 'EXECUTABLE', status: 'PASS', assertions: [{ id: 'v06901-builder-predecessor-source-not-active', status: 'PASS' }] };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-06901-refreshless-targeted-update-liveness.py');
  assert(fs.existsSync(builder), 'v0.69.1 builder missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06901-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.69.1 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('06901_BUILD_PASS'), `v0.69.1 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.69.1 latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.69.1', 'metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.69.1', 'runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.69.1', 'Host identity');

    const unloadStart = latest.indexOf('  await Risuai.onUnload(async () => {');
    const unloadEnd = latest.indexOf('\n  });', unloadStart);
    assert(unloadStart >= 0 && unloadEnd > unloadStart, 'targeted unload body missing');
    const unload = latest.slice(unloadStart, unloadEnd);
    const disposed = unload.indexOf('    runtimeDisposed = true;');
    const epoch = unload.indexOf('    runtimeEpoch += 1;');
    const remove = unload.indexOf('    await runtimeHooks.remove(Risuai, beforeRequestHandler, outputHandler);');
    const ui = unload.indexOf('    for (const part of simcoreUiParts.splice(0)) {');
    const telemetry = unload.indexOf("    await checkpointRuntimeTelemetry('UNLOAD');");
    const clear = unload.indexOf('    coreSession = null;');
    assert(disposed >= 0 && disposed < epoch && epoch < remove && remove < ui && ui < telemetry && telemetry < clear, 'targeted unload retirement ordering invalid');
    assert(!unload.includes('publishWithHostLocal'), 'UNLOAD body directly reaches Host-local transport');
    equal((latest.match(/checkpointRuntimeTelemetry\('UNLOAD'\)/g) || []).length, 1, 'UNLOAD checkpoint call count');
    equal((latest.match(/checkpointRuntimeTelemetry\('OUTPUT_COMMIT'\)/g) || []).length, 1, 'OUTPUT_COMMIT checkpoint call count');

    const split = "if (normalizedTrigger === 'UNLOAD') {\n        runtimeTelemetryRules.publish(globalThis, typeof window !== 'undefined' ? window : null, capsule);\n      } else {\n        await runtimeTelemetryRules.publishWithHostLocal(globalThis, typeof window !== 'undefined' ? window : null, Risuai, capsule);";
    assert(latest.includes(split), 'UNLOAD local-only / OUTPUT_COMMIT Host-local split missing');

    const loader = new BundleLoader(latest);
    const telemetryRules = loader.load('runtime-telemetry');
    assert(typeof telemetryRules.publish === 'function', 'local telemetry publish missing');
    assert(typeof telemetryRules.publishWithHostLocal === 'function', 'durable telemetry publish missing');

    const session = new MemorySessionStorage();
    const capsule = telemetryRules.capture({
      sourceVersion: '0.69.1',
      locationKey: 'character:chat',
      capturedAt: 2000000000000,
      runtimePromptCache: { version: 1, key: 'k' },
      requestTopology: { version: 1, key: 'k' },
      cacheCandidates: { version: 1, key: 'k' },
    });
    let hostAcquire = 0;
    const blockedHost = {
      async getPluginStorage() {
        hostAcquire += 1;
        return await new Promise(() => {});
      },
    };
    assert(telemetryRules.publish({}, { sessionStorage: session }, capsule), 'local UNLOAD-compatible publication failed');
    equal(hostAcquire, 0, 'local publication acquired Host-local API');
    equal(session.setCount, 1, 'local publication session write count');

    // Frozen architecture/state identities must survive the patch.
    equal((latest.match(/const STATE_VERSION = 5;/g) || []).length, (ctx.source.match(/const STATE_VERSION = 5;/g) || []).length, 'STATE_VERSION changed');
    equal((latest.match(/const CORE_STATE_VERSION = 10;/g) || []).length, (ctx.source.match(/const CORE_STATE_VERSION = 10;/g) || []).length, 'CORE_STATE_VERSION changed');
    assert(latest.includes('SimCore.define("state-reconcile"'), 'M2-6 State Reconcile owner missing');
    for (const dep of ['community', 'recurrence', 'lineage', 'handoff']) {
      const kernelStart = latest.indexOf('SimCore.define("kernel"');
      const kernelEnd = latest.indexOf('\nSimCore.define("state-reconcile"', kernelStart);
      const kernel = latest.slice(kernelStart, kernelEnd);
      assert(!kernel.includes(`require('./${dep}')`), `Kernel upward dependency reintroduced: ${dep}`);
    }

    // No new timeout/retry/polling surface is permitted by this mini release.
    for (const token of ['Promise.race(', 'setTimeout(', 'setInterval(']) {
      equal(latest.split(token).length, ctx.source.split(token).length, `async-control surface delta: ${token}`);
    }

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v06901-builder-executes-from-exact-v06900-source', status: 'PASS' },
        { id: 'v06901-runtime-identities-converged', status: 'PASS' },
        { id: 'v06901-latest-install-identical', status: 'PASS' },
        { id: 'v06901-old-hooks-retire-before-unload-telemetry', status: 'PASS' },
        { id: 'v06901-ui-retires-before-unload-telemetry', status: 'PASS' },
        { id: 'v06901-unload-local-publication-does-not-acquire-host', status: 'PASS' },
        { id: 'v06901-output-commit-durable-path-preserved', status: 'PASS' },
        { id: 'v06901-m2-6-state-architecture-frozen', status: 'PASS' },
        { id: 'v06901-no-new-timer-retry-polling-surface', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
