import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assert, equal } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';

const BUILDER = 'products/simcore/tooling/build-06411-bounded-telemetry-capsule-compaction.py';

function versionOf(source) { return source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || ''; }

function materializeCandidate(source) {
  if (versionOf(source) === '0.64.11') return source;
  equal(versionOf(source), '0.64.10', 'v0.64.11 suite must build from v0.64.10 or inspect v0.64.11');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simcore-06411-builder-'));
  try {
    const pluginDir = path.join(root, 'plugins/simcore');
    const toolDir = path.join(root, 'products/simcore/tooling');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.mkdirSync(toolDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, 'latest.js'), source, 'utf8');
    fs.writeFileSync(path.join(pluginDir, 'install.js'), source, 'utf8');
    fs.copyFileSync(BUILDER, path.join(toolDir, path.basename(BUILDER)));
    const run = spawnSync('python3', [path.join(toolDir, path.basename(BUILDER))], {
      cwd: root, encoding: 'utf8', timeout: 90000, maxBuffer: 2 * 1024 * 1024,
    });
    if (run.status !== 0) throw new Error(`06411 builder failed: ${run.stderr || run.stdout}`);
    const latest = fs.readFileSync(path.join(pluginDir, 'latest.js'), 'utf8');
    const install = fs.readFileSync(path.join(pluginDir, 'install.js'), 'utf8');
    equal(latest, install, 'builder latest/install equality');
    equal(versionOf(latest), '0.64.11', 'builder target version');
    return latest;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function promptText(lines = 72, width = 760) {
  return Array.from({ length: lines }, (_, i) => `L${String(i).padStart(3, '0')} ${'p'.repeat(width - 6)}${i % 5}`).join('\n');
}

function messages(count = 80) {
  const rows = [{ role: 'system', content: `SYSTEM ${'s'.repeat(360000)}` }];
  for (let i = 1; i < count; i += 1) {
    rows.push({ role: i % 2 ? 'user' : 'assistant', content: `m${i}:${'x'.repeat(620 + (i % 13))}` });
  }
  return rows;
}

function disabledSessionRoot() {
  const root = {};
  Object.defineProperty(root, 'sessionStorage', { get() { throw new Error('disabled'); } });
  return root;
}

function load(source, id) { return new BundleLoader(source).load(id); }

function establishTrajectory(candidate, key, rows) {
  const topology = load(candidate, 'runtime-topology').createRequestTopologyTracker();
  const trajectory = load(candidate, 'runtime-cache-candidates').createCacheCandidateTracker();
  for (let i = 0; i < 3; i += 1) {
    const current = rows.concat({ role: 'user', content: `trajectory-${i}` });
    const probe = topology.observe(key, current, { runtimeIndex: current.length - 1, locationKey: key, at: 1000 + i * 1000 });
    trajectory.observe(key, probe, { sendIndex: 200 + i, at: 1000 + i * 1000 });
  }
  return { topology, trajectory };
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  const candidate = materializeCandidate(String(ctx.source));
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });
  const key = 'character:chat';
  const now = 2000000000000;

  assert(candidate.includes("const MAX_SERIALIZED_CHARS = 16384;"), 'whole capsule cap changed');
  assert(!candidate.includes('MAX_SERIALIZED_CHARS = 32768') && !candidate.includes('MAX_SERIALIZED_CHARS = 65536'), 'whole capsule cap raised');
  assert(candidate.includes('MAX_HANDOFF_PROMPT_LINES = 64'), 'prompt retained-line bound missing');
  assert(candidate.includes('MAX_HANDOFF_TOPOLOGY_SIGNATURES = 64'), 'topology retained-signature bound missing');
  assert(candidate.includes('MAX_HANDOFF_SYSTEM_HEAD_BLOCKS = 8') && candidate.includes('MAX_HANDOFF_SYSTEM_TAIL_BLOCKS = 8'), 'system edge bound missing');
  assert(candidate.includes("guard: 'SKIPPED_BOUNDED_REOBSERVE'"), 'trajectory guard missing');
  pass('06411-source-bounds-and-guard');

  const promptRules = load(candidate, 'runtime-cache');
  const topologyRules = load(candidate, 'runtime-topology');
  const trajectoryRules = load(candidate, 'runtime-cache-candidates');
  const telemetry = load(candidate, 'runtime-telemetry');

  const prompt = promptRules.createRuntimePromptCacheTracker();
  const longPrompt = promptText();
  assert(longPrompt.length >= Number(fixture.input.minRuntimePromptChars), 'runtime prompt fixture too small');
  prompt.observe(key, longPrompt, { sendIndex: 100, at: now - 2000 });
  const promptHandoff = prompt.exportHandoffState();
  equal(promptHandoff.disposition, 'OK', 'prompt handoff disposition');
  assert(JSON.stringify(promptHandoff).length <= Number(fixture.input.promptBudget), 'prompt handoff over component budget');
  equal(promptHandoff.retainedLines.length, 64, 'prompt retained line bound');
  assert(!JSON.stringify(promptHandoff).includes(longPrompt.slice(0, 100)), 'raw prompt leaked into handoff');
  pass('06411-real-prompt-export-bounded');

  const rows = messages();
  assert(rows.length > 64, 'topology stress fixture must exceed 64 messages');
  assert(String(rows[0].content).length >= Number(fixture.input.minSystem0Chars), 'system0 fixture too small');
  const topology = topologyRules.createRequestTopologyTracker();
  const topologyProbe = topology.observe(key, rows, { runtimeIndex: rows.length - 1, locationKey: key, at: now - 1500 });
  const topologyHandoff = topology.exportHandoffState();
  equal(topologyHandoff.disposition, 'OK', 'topology handoff disposition');
  equal(topologyHandoff.signatures.length, 64, 'topology retained signature bound');
  assert(JSON.stringify(topologyHandoff).length <= Number(fixture.input.topologyBudget), 'topology handoff over component budget');
  assert((topologyHandoff.system0?.headBlocks || []).length <= 8 && (topologyHandoff.system0?.tailBlocks || []).length <= 8, 'system0 handoff edge bound');
  assert(!JSON.stringify(topologyHandoff).includes('SYSTEM ssssssssssssssssssss'), 'raw system0 leaked into handoff');
  pass('06411-real-topology-export-bounded');

  const established = establishTrajectory(candidate, key, rows.slice(0, 58));
  const trajectoryHandoff = established.trajectory.exportState();
  assert(JSON.stringify(trajectoryHandoff).length <= Number(fixture.input.trajectoryBudget), 'trajectory handoff over component budget');

  const capsule = telemetry.capture({
    sourceVersion: '0.64.11', locationKey: key, capturedAt: now,
    runtimePromptCache: promptHandoff, requestTopology: topologyHandoff, cacheCandidates: trajectoryHandoff,
  });
  const encoded = JSON.stringify(capsule);
  assert(encoded.length <= Number(fixture.input.maxSerializedChars), `complete compact capsule over cap: ${encoded.length}`);
  pass('06411-real-exporter-complete-capsule-under-cap');

  let hostRaw = null;
  let hostWrites = 0;
  let hostReads = 0;
  let hostRemoves = 0;
  const host = {
    async getLocalPluginStorage() {
      return {
        async getItem() { hostReads += 1; return hostRaw; },
        async setItem(_key, value) { hostWrites += 1; hostRaw = String(value); },
        async removeItem() { hostRemoves += 1; hostRaw = null; },
      };
    },
  };
  const disabled = disabledSessionRoot();
  await telemetry.publishWithHostLocal({}, disabled, host, capsule);
  const write = telemetry.diagnostics().write;
  equal(write.hostLocal, 'WRITTEN', 'compact capsule Host-local write');
  equal(hostWrites, 1, 'Host-local exactly one setItem');
  assert(Number(write.serializedChars || 0) <= Number(fixture.input.maxSerializedChars), 'published serialized chars over cap');
  pass('06411-host-local-write-under-cap');

  const bootTelemetry = load(candidate, 'runtime-telemetry');
  const firstClaim = await bootTelemetry.claimHostLocalOnce(host, key, now + 1000);
  equal(firstClaim.status, 'CONSUMED', 'first Host-local compact claim');
  assert(firstClaim.capsule, 'first Host-local compact claim missing capsule');
  const secondClaim = await bootTelemetry.claimHostLocalOnce(host, key, now + 1100);
  equal(secondClaim, firstClaim, 'one-shot claim result should be memoized within generation');
  equal(hostReads, 1, 'Host-local boot read count');
  equal(hostRemoves, 1, 'matching Host-local consume count');
  pass('06411-host-local-one-shot-consume');

  const promptReload = promptRules.createRuntimePromptCacheTracker();
  const topologyReload = topologyRules.createRequestTopologyTracker();
  const trajectoryReload = trajectoryRules.createCacheCandidateTracker();
  assert(promptReload.importState(firstClaim.capsule.runtimePromptCache), 'prompt compact import');
  assert(topologyReload.importState(firstClaim.capsule.requestTopology), 'topology compact import');
  assert(trajectoryReload.importState(firstClaim.capsule.cacheCandidates), 'trajectory import');

  const firstPrompt = `${longPrompt}\npost-reload-extension`;
  const promptFirstProbe = promptReload.observe(key, firstPrompt, { sendIndex: 101, at: now + 2000 });
  equal(promptFirstProbe.continuitySource, 'HANDOFF_COMPACT_V2', 'prompt first reload continuity source');
  assert(['LINE_BOUND', 'PREFIX_FLOOR', 'EXACT_IDENTITY'].includes(promptFirstProbe.precision), 'prompt first reload precision');

  const firstRows = rows.concat({ role: 'user', content: 'post-reload-extension' });
  const topologyFirstProbe = topologyReload.observe(key, firstRows, { runtimeIndex: firstRows.length - 1, locationKey: key, at: now + 2000 });
  equal(topologyFirstProbe.continuitySource, 'HANDOFF_COMPACT_V3', 'topology first reload continuity source');
  equal(topologyFirstProbe.precision, 'PREFIX_FLOOR', 'topology >64 first reload precision floor');
  const guarded = trajectoryReload.observe(key, topologyFirstProbe, { sendIndex: 301, at: now + 2000 });
  equal(guarded.guard, 'SKIPPED_BOUNDED_REOBSERVE', 'prefix floor mutated trajectory');
  pass('06411-first-reload-bounded-precision-trajectory-guard');

  const secondPromptProbe = promptReload.observe(key, `${firstPrompt}\nsecond`, { sendIndex: 102, at: now + 3000 });
  assert(secondPromptProbe.continuitySource !== 'HANDOFF_COMPACT_V2', 'prompt exact same-generation path did not resume');
  const secondRows = firstRows.concat({ role: 'assistant', content: 'second' });
  const topologySecondProbe = topologyReload.observe(key, secondRows, { runtimeIndex: secondRows.length - 1, locationKey: key, at: now + 3000 });
  assert(topologySecondProbe.continuitySource !== 'HANDOFF_COMPACT_V3', 'topology exact same-generation path did not resume');
  const resumed = trajectoryReload.observe(key, topologySecondProbe, { sendIndex: 302, at: now + 3000 });
  assert(resumed.guard !== 'SKIPPED_BOUNDED_REOBSERVE', 'trajectory guard leaked into second same-generation request');
  pass('06411-second-request-rich-exact-path-resumes');

  assert(candidate.includes('raw user') || candidate.includes('raw bodies'), 'retention diagnostics unexpectedly absent');
  for (const forbidden of ['localStorage', 'IndexedDB', 'XMLHttpRequest', 'setInterval(', 'setTimeout(']) {
    const promptStart = candidate.indexOf('const MAX_HANDOFF_PROMPT_LINES = 64;');
    const topologyEnd = candidate.indexOf('SimCore.define("runtime-cache-candidates"', promptStart);
    const compactSurface = candidate.slice(promptStart, topologyEnd > promptStart ? topologyEnd : promptStart + 30000);
    assert(!compactSurface.includes(forbidden), `compact exporter introduced forbidden ${forbidden}`);
  }
  equal(fixture.input.maxSerializedChars, 16384, 'fixture cap drift');
  pass('06411-frozen-safety-surface');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
