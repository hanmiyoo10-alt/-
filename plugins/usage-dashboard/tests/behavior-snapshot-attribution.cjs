'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

const ACTIONS = new Set(['hit','miss','join','load','stale','deferred','blocked','error','other']);
const REASONS = new Set(['','empty','expired','loaded','deferred-refresh','circuit-open','refresh-error']);
const LAUNCHERS = new Set(['managed-direct','direct','npx-fallback','unknown']);

function assertTimeline(performance) {
  assert.ok(Number(performance.totalMs) >= 0);
  assert.match(String(performance.criticalPath || ''), /^organizations(?:→[A-Za-z.]+)?$/);
  assert.ok(performance.taskTimeline && typeof performance.taskTimeline === 'object');
  assert.ok(performance.taskTimeline.organizations);
  for (const [name, item] of Object.entries(performance.taskTimeline)) {
    assert.match(name, /^[A-Za-z0-9.]+$/);
    assert.ok(Number(item.startOffsetMs) >= 0);
    assert.ok(Number(item.endOffsetMs) >= Number(item.startOffsetMs));
    assert.ok(Number(item.durationMs) >= 0);
  }
}

function assertCli(performance) {
  const operations = performance.cliOperations;
  assert.ok(Array.isArray(operations));
  assert.ok(operations.length > 0 && operations.length <= 8);
  for (const item of operations) {
    assert.deepEqual(Object.keys(item).sort(), [
      'label','launcher','fallbackReason','npxPolicy','startOffsetMs',
      'executionStartOffsetMs','endOffsetMs','queueWaitMs','executionMs',
    ].sort());
    assert.match(item.label, /^[a-z0-9-]{1,32}$/);
    assert.ok(LAUNCHERS.has(item.launcher));
    assert.ok(Number(item.startOffsetMs) >= 0);
    assert.ok(Number(item.executionStartOffsetMs) >= Number(item.startOffsetMs));
    assert.ok(Number(item.endOffsetMs) >= Number(item.executionStartOffsetMs));
    assert.ok(Number(item.queueWaitMs) >= 0);
    assert.ok(Number(item.executionMs) >= 0);
  }
  assert.equal(performance.cli.limit, 2);
  assert.ok(Number(performance.cli.peakActive) >= 1 && Number(performance.cli.peakActive) <= 2);
  assert.ok(Number(performance.cli.runs) >= operations.length);
}

function assertCache(performance) {
  const events = performance.cacheDecisions;
  assert.ok(Array.isArray(events));
  assert.ok(events.length > 0 && events.length <= 64);
  for (const event of events) {
    assert.deepEqual(Object.keys(event).sort(), ['family','scope','range','action','reason','ageMs','ttlMs'].sort());
    assert.ok(ACTIONS.has(event.action));
    assert.ok(REASONS.has(event.reason));
    assert.match(String(event.family), /^[A-Za-z]+$/);
    assert.match(String(event.scope), /^(?:|all|credits|devpass)$/);
    assert.match(String(event.range), /^(?:|24h|7d|30d)$/);
  }
  assert.equal(performance.secondaryRefresh.limit, 1);
  assert.equal(performance.secondaryRefresh.maxKeys, 32);
}

(async () => {
  const bridge = await startBridge({managed:false,direct:true});
  try {
    let response = await bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const performance = response.body?.diagnostics?.snapshotPerformance;
    assert.ok(performance);
    assertTimeline(performance);
    assertCli(performance);
    assertCache(performance);
    assert.deepEqual(performance.creditsEarlyStart, {
      decision:'started',reason:'',candidateMode:'requested-exact',result:'completed',
    });
    const serialized = JSON.stringify(performance);
    for (const forbidden of ['fixture-credits','rawArgs','commandOutput','DEVPASS_BRIDGE_CAPTURE_FILE']) {
      assert.ok(!serialized.includes(forbidden), `snapshot attribution leaked ${forbidden}`);
    }

    response = await bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    const cached = response.body?.diagnostics?.snapshotPerformance;
    assert.equal(cached.cli.runs, 0);
    assert.equal(cached.cli.queueWaitAvgMs, null);
    assert.equal(cached.cli.queueWaitMaxMs, null);
    assert.equal(cached.cli.executionAvgMs, null);
    assert.equal(cached.cli.executionMaxMs, null);
    assert.equal(cached.cli.peakActive, null);
    assert.deepEqual(cached.cliOperations, []);
    assert.ok(cached.cacheDecisions.some((item) => item.action === 'hit'));

    console.log('usage-dashboard snapshot attribution behavior: OK · real Engine emits bounded monotonic sanitized diagnostics and preserves unknown timing');
  } finally {
    await bridge.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
