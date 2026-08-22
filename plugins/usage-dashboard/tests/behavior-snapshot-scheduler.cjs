'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

function sourceRows(rows) {
  return rows.filter((row) => row.type === 'start' || row.type === 'end');
}

function peakActive(rows, predicate = () => true) {
  let active = 0;
  let peak = 0;
  for (const row of sourceRows(rows)) {
    if (!predicate(row)) continue;
    if (row.type === 'start') {
      active += 1;
      peak = Math.max(peak, active);
    } else {
      active = Math.max(0, active - 1);
    }
  }
  return peak;
}

async function verifyForegroundCap(concurrency) {
  const labels = ['credits','devpass-capture-24h'];
  const bridge = await startBridge({
    managed:false,
    direct:true,
    concurrency,
    config:{gateLabels:labels},
  });
  try {
    const pending = bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    await bridge.waitFor((rows) => rows.filter((row) => row.type === 'start').length >= concurrency);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const initial = bridge.ledger().filter((row) => row.type === 'start');
    assert.equal(initial.length, concurrency, `foreground cap ${concurrency} must prevent an extra source start`);

    if (concurrency === 1) {
      bridge.openGate(initial[0].label);
      const second = await bridge.waitFor((rows) => rows.find((row) => row.type === 'start' && row.pid !== initial[0].pid));
      bridge.openGate(second.label);
    } else {
      for (const label of labels) bridge.openGate(label);
    }

    const response = await pending;
    assert.equal(response.status, 200);
    assert.equal(peakActive(bridge.ledger()), concurrency);
  } finally {
    await bridge.stop();
  }
}

(async () => {
  await verifyForegroundCap(2);
  await verifyForegroundCap(1);

  const longLabels = ['usage-7d-model','usage-30d-model','devpass-capture-7d','devpass-capture-30d'];
  const bridge = await startBridge({managed:false,direct:true});
  try {
    let response = await bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    bridge.advance(600_001);
    bridge.clearLedger();
    bridge.setConfig({gateLabels:longLabels});

    response = await Promise.race([
      bridge.request('/snapshot?profile=full&creditsOrgId=fixture-credits'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('deferred snapshot remained blocked by long-window source')), 4_000)),
    ]);
    assert.equal(response.status, 200);
    assert.equal(response.body?.modules?.analytics?.status, 'stale');
    assert.ok(response.body?.diagnostics?.snapshotPerformance?.cacheDecisions?.some(
      (row) => row.action === 'deferred' && row.reason === 'deferred-refresh',
    ));

    const running = await bridge.waitFor((rows) => rows.find(
      (row) => row.type === 'start' && longLabels.includes(row.label) &&
        !rows.some((end) => end.type === 'end' && end.pid === row.pid),
    ));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const held = bridge.ledger().filter((row) => row.type === 'start' && longLabels.includes(row.label));
    assert.equal(held.length, 1, 'secondary refresh must use one lane');

    const foregroundWhileSecondaryRuns = await bridge.request('/snapshot?profile=light&creditsOrgId=fixture-credits');
    assert.equal(foregroundWhileSecondaryRuns.status, 200);
    assert.ok(!bridge.ledger().some((row) => row.type === 'end' && row.pid === running.pid), 'running secondary must not be cancelled');

    for (const label of longLabels) bridge.openGate(label);
    await bridge.waitFor((rows) => {
      const starts = rows.filter((row) => row.type === 'start' && longLabels.includes(row.label));
      const ends = rows.filter((row) => row.type === 'end' && longLabels.includes(row.label));
      return starts.length >= 2 && ends.length === starts.length;
    });
    assert.equal(peakActive(bridge.ledger(), (row) => longLabels.includes(row.label)), 1);

    console.log('usage-dashboard snapshot scheduler behavior: OK · hard caps, rollback, deferred response, and one-lane secondary refresh verified');
  } finally {
    await bridge.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

