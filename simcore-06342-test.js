const fs = require('fs');
const src = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
const start = src.indexOf('const SimCore = (() => {');
const end = src.indexOf('(async () => {', start);
if (start < 0 || end < 0) throw new Error('module slice not found');
eval(src.slice(start, end) + '\n;globalThis.__SimCore = SimCore;');

const cache = globalThis.__SimCore.require('runtime-cache');
const topology = globalThis.__SimCore.require('runtime-topology');

const tracker = cache.createRuntimePromptCacheTracker({
  requestOrder: 'FROZEN',
  runtimePromptPlacement: 'TAIL_AFTER_CURRENT_USER',
  providerCache: 'UNVERIFIED',
});
const a = '[SIM]\nrequired_frame=x\nworld_year=2030\nmode=A\n[/SIM]';
const c = '[SIM]\nrequired_frame=x\nworld_year=2030\nmode=C\n[/SIM]';
tracker.observe('k', a, { sendIndex: 1, mode: 'A', at: 1 });
const id = tracker.observe('k', c, { sendIndex: 2, mode: 'C', at: 2 }).identity;
if (id.stable.status !== 'SAME') throw new Error('stable identity drift');
if (id.slow.status !== 'SAME') throw new Error('slow identity drift');
if (id.volatile.status !== 'CHANGED') throw new Error('volatile change not detected');

const t = topology.createRequestTopologyTracker();
const r1 = [
  { role: 'system', content: 'host-a' },
  { role: 'user', content: 'u1' },
  { role: 'system', content: 'runtime-a' },
];
const r2 = [
  { role: 'system', content: 'host-b' },
  { role: 'user', content: 'u2' },
  { role: 'system', content: 'runtime-b' },
];
t.observe('k', r1, { runtimeIndex: 2, at: 1 });
const p2 = t.observe('k', r2, { runtimeIndex: 2, at: 2 });
if (p2.breakOwner !== 'PRE_SIMCORE' || p2.breakZone !== 'HOST_PREFIX') throw new Error('host attribution failed');
if (!(p2.exposureRatio > 0)) throw new Error('exposure not detected');
const p3 = t.observe('k', r2, { runtimeIndex: 2, at: 3 });
if (!p3.stable || p3.breakOwner !== 'NONE' || p3.exposureRatio !== 0) throw new Error('retry stable topology failed');

const t2 = topology.createRequestTopologyTracker();
const q1 = [
  { role: 'system', content: 'host' },
  { role: 'user', content: 'same' },
  { role: 'system', content: 'runtime-a' },
];
const q2 = [
  { role: 'system', content: 'host' },
  { role: 'user', content: 'same' },
  { role: 'system', content: 'runtime-b' },
];
t2.observe('k', q1, { runtimeIndex: 2, at: 1 });
const q = t2.observe('k', q2, { runtimeIndex: 2, at: 2 });
if (q.breakOwner !== 'SIMCORE_RUNTIME' || q.breakZone !== 'SIMCORE_RUNTIME') throw new Error('runtime attribution failed');

console.log('SimCore 0.63.42 focused behavioral regression PASS');
