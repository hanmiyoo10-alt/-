'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

function starts(bridge, label = '') {
  return bridge.ledger().filter((row) => row.type === 'start' && (!label || row.label === label));
}

(async () => {
  const bridge = await startBridge({managed:false,direct:true});
  try {
    let response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 1, 'cold status must block on one source load');

    response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 1, 'fresh status must be a cache hit');

    bridge.advance(30_001);
    response = await bridge.request('/devpass-status');
    assert.equal(response.status, 200);
    assert.equal(starts(bridge, 'devpass-capture-24h').length, 2, 'expired status must block and refresh');

    response = await bridge.request('/activity?creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    bridge.clearLedger();

    response = await bridge.request('/activity?creditsOrgId=fixture-credits');
    assert.equal(response.status, 200);
    assert.equal(starts(bridge).length, 0, 'fresh 24h activity must not launch another source');

    bridge.advance(60_001);
    bridge.setConfig({gateLabels:['devpass-capture-24h']});
    let settled = false;
    const pending = bridge.request('/activity?creditsOrgId=fixture-credits').then((value) => {
      settled = true;
      return value;
    });
    await bridge.waitFor((rows) => rows.some((row) => row.type === 'start' && row.label === 'devpass-capture-24h'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(settled, false, 'expired 24h activity must remain foreground blocking');
    bridge.openGate('devpass-capture-24h');
    response = await pending;
    assert.equal(response.status, 200);
    assert.equal(settled, true);

    console.log('usage-dashboard cache runtime behavior: OK · cold/fresh/expired 24h semantics verified through the real Engine endpoint');
  } finally {
    await bridge.stop();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

