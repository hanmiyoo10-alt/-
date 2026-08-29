import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { equal, assert, deepEqual } from '../../tooling/assertions.mjs';
import { BundleLoader, extractModuleSource } from '../../tooling/bundle-loader.mjs';

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export async function runSuite(ctx) {
  const version = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  if (version !== '0.68.0') {
    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [{ id: 'v06900-builder-predecessor-source-not-active', status: 'PASS' }],
    };
  }

  const root = process.cwd();
  const builder = path.resolve(root, 'products/simcore/tooling/build-06900-state-reconcile-kernel-inversion.py');
  const runner = path.resolve(root, 'products/simcore/tooling/test.mjs');
  assert(fs.existsSync(builder), 'v0.69 builder missing');
  assert(fs.existsSync(runner), 'permanent regression runner missing');

  const baselineLoader = new BundleLoader(ctx.source);
  const baselineKernel = baselineLoader.load('kernel');
  assert(typeof baselineKernel.initialState === 'function', 'v0.68 Kernel initialState baseline missing');
  assert(typeof baselineKernel.reconcileState === 'function', 'v0.68 Kernel reconcileState baseline missing');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06900-builder-'));
  try {
    const pluginDir = path.join(tmp, 'plugins', 'simcore');
    fs.mkdirSync(pluginDir, { recursive: true });
    const latestPath = path.join(pluginDir, 'latest.js');
    const installPath = path.join(pluginDir, 'install.js');
    fs.writeFileSync(latestPath, ctx.source, 'utf8');
    fs.writeFileSync(installPath, ctx.source, 'utf8');

    const run = spawnSync('python3', [builder], { cwd: tmp, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    equal(run.status, 0, `v0.69 builder exit: ${run.stderr || run.stdout}`);
    assert(run.stdout.includes('06900_BUILD_PASS'), `v0.69 builder PASS marker missing: ${run.stdout}`);

    const latest = fs.readFileSync(latestPath, 'utf8');
    const install = fs.readFileSync(installPath, 'utf8');
    equal(latest, install, 'v0.69 builder latest/install identity');
    equal(latest.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '', '0.69.0', 'v0.69 metadata identity');
    equal(latest.match(/const SIMCORE_RUNTIME_VERSION = '([^']+)';/)?.[1] || '', '0.69.0', 'v0.69 runtime identity');
    equal(latest.match(/const HOST_COMPAT_VERSION = '([^']+)';/)?.[1] || '', '0.69.0', 'v0.69 Host identity');

    const candidateLoader = new BundleLoader(latest);
    const candidateKernel = candidateLoader.load('kernel');
    const stateReconcile = candidateLoader.load('state-reconcile');
    equal(typeof candidateKernel.initialState, 'undefined', 'Kernel initialState facade retired');
    equal(typeof candidateKernel.reconcileState, 'undefined', 'Kernel reconcileState facade retired');
    equal(typeof stateReconcile.initialState, 'function', 'State Reconcile initialState owner present');
    equal(typeof stateReconcile.reconcileState, 'function', 'State Reconcile reconcileState owner present');

    const kernelSource = extractModuleSource(latest, 'kernel');
    for (const dep of ['community', 'recurrence', 'lineage', 'handoff']) {
      assert(!kernelSource.includes(`require('./${dep}')`), `Kernel upward dependency survived: ${dep}`);
    }

    deepEqual(stateReconcile.initialState(), baselineKernel.initialState(), 'fresh initialState deep equivalence');

    const healthy = baselineKernel.initialState();
    healthy.historyBootstrapped = true;
    healthy.historyBootstrappedAt = 42;
    healthy.templateRecurrenceVersion = 3;
    healthy.broadcastLocked = true;
    healthy.episodeNo = 7;
    healthy.community.activationCount = 4;
    healthy.community.classifierVersion = 3;
    healthy.worldYear = 2026;
    healthy.koreanAgeOffset = 1;
    healthy.narrativeTimestamp = '⏱️[2026-08-30 (일) 4:00 AM]';
    healthy.lastMode = 'C';
    healthy.pending = { active: true, mode: 'C', marker: 'healthy' };

    const cases = [
      ['empty-object', {}],
      ['non-object-scalar', 'legacy-scalar'],
      ['malformed-scalars', {
        stateVersion: 'bad', coreStateVersion: -3,
        historyBootstrapped: 'yes', historyBootstrappedAt: '7', historyBootstrapStats: 'bad',
        templateRecurrenceVersion: '2.6', templateRegistry: [{ hash: 'bad' }, null],
        requestLineageVersion: 0, requestLineage: { rootMode: 'A', rootIndex: '4', depth: '-9', sourceKind: 'ROOT' },
        communitySourceHandoffVersion: '2', communitySourceRegistry: [{ hash: 123, rootMode: 'A', rootIndex: 4, depth: 1 }],
        broadcastLocked: 1, broadcastAirtime: '  airtime  ', broadcastAirtimeStart: 44, episodeNo: '3.6',
        community: { activationCount: '4.4', platformMax: { '맘카페': '19', X: -3 }, lastNormalization: Array.from({ length: 15 }, (_, i) => ({ i })), classifierVersion: '3', globalReactionMax: 999, recent: ['legacy'], commenters: ['legacy'] },
        worldYear: null, narrativeYear: '2025', koreanAgeOffset: '2.7', narrativeTimestamp: '  stamp  ', narrativeClockVersion: 0, clockRepairVersion: '2',
        lastMode: 7, pending: 'bad', currentEpisodeSegments: ['legacy'], lastCompletedEpisode: { legacy: true }, exposed: { legacy: true },
      }],
      ['legacy-narrative-year-and-content-memory', {
        narrativeYear: 2024,
        currentEpisodeSegments: ['a'], lastCompletedEpisode: { a: 1 }, exposed: ['x'],
        community: { recent: ['x'], commenters: ['y'], globalReactionMax: 51, platformMax: { YouTube: 12 } },
      }],
      ['recurrence-registry-normalization', {
        templateRecurrenceVersion: 1,
        templateRegistry: [
          { hash: 101, mode: 'C', lastIndex: 10, count: 2 },
          { hash: 101, mode: 'C', lastIndex: 12, count: 3 },
          { hash: 'bad', mode: 'A' },
        ],
      }],
      ['lineage-legacy-normalization', {
        requestLineageVersion: 0,
        requestLineage: { rootMode: 'B', rootIndex: 18, parentMode: 'C', parentIndex: 20, depth: 3, inlineSource: 1, sourceKind: 'CHAIN', lastRequestMode: 'C', lastRequestIndex: 20, transitionFrom: 'B', recentSources: [{ mode: 'B', index: 18 }, { mode: 'B', index: 18 }] },
      }],
      ['handoff-registry-normalization', {
        communitySourceHandoffVersion: 0,
        communitySourceRegistry: [
          { hash: 1234, rootMode: 'A', rootIndex: 2, parentMode: 'C', parentIndex: 4, depth: 1 },
          { hash: 1234, rootMode: 'B', rootIndex: 6, parentMode: 'B', parentIndex: 6, depth: 0 },
          { hash: 'bad', rootMode: null, rootIndex: -1 },
        ],
      }],
      ['community-platform-max-and-global-floor', {
        community: { activationCount: 2, platformMax: { '맘카페': 31, 'YouTube(EN)': '44', Unknown: -9 }, lastNormalization: [{ platform: '맘카페', value: 31 }], classifierVersion: 3, globalReactionMax: 999 },
      }],
      ['pending-inactive-portable-state', { pending: { active: false, mode: 'A' }, lastMode: 'A' }],
      ['pending-active-portable-state', { pending: { active: true, mode: 'C', sendIndex: 22, frameFloor: { volume: 1, chapter: 2 } }, lastMode: 'C' }],
      ['current-v068-healthy-persisted-state', healthy],
    ];

    for (const [id, input] of cases) {
      const baseline = baselineKernel.reconcileState(clone(input));
      const candidate = stateReconcile.reconcileState(clone(input));
      deepEqual(candidate, baseline, `state reconcile deep equivalence: ${id}`);
    }

    const nestedReport = path.join(tmp, 'generated-v06900-regression.json');
    const nested = spawnSync(process.execPath, [runner, '--source', latestPath, '--suite', 'batch-a', '--report', nestedReport], {
      cwd: root,
      encoding: 'utf8',
      timeout: 180000,
      maxBuffer: 4 * 1024 * 1024,
    });
    equal(nested.status, 0, `generated v0.69 batch-a: ${nested.stderr || nested.stdout}`);
    assert(fs.existsSync(nestedReport), 'generated v0.69 batch-a report missing');
    const nestedJson = JSON.parse(fs.readFileSync(nestedReport, 'utf8'));
    equal(nestedJson.status, 'PASS', 'generated v0.69 batch-a report status');

    return {
      coverage: 'EXECUTABLE',
      status: 'PASS',
      assertions: [
        { id: 'v06900-builder-executes-from-exact-v06800-source', status: 'PASS' },
        { id: 'v06900-builder-latest-install-identical', status: 'PASS' },
        { id: 'v06900-runtime-identity-converged', status: 'PASS' },
        { id: 'v06900-kernel-upward-dependencies-retired', status: 'PASS' },
        { id: 'v06900-initial-state-deep-equivalence', status: 'PASS' },
        { id: 'v06900-reconcile-fixture-matrix-deep-equivalence', status: 'PASS' },
        { id: 'v06900-generated-batch-a-positive-controls-pass', status: 'PASS' },
      ],
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
