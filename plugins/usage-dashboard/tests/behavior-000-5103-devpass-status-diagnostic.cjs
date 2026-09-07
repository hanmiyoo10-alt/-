'use strict';

const assert = require('node:assert/strict');
const {startBridge} = require('./harness/bridge-process.cjs');

(async () => {
  const bridge = await startBridge({managed:false,direct:true});
  try {
    const response = await bridge.request('/devpass-status');
    if (response.status !== 200) {
      const logs = bridge.logs();
      console.error('5.103 devpass-status diagnostic:', JSON.stringify({response, logs}, null, 2));
    }
    assert.equal(response.status, 200, `devpass-status diagnostic body=${JSON.stringify(response.body)} logs=${JSON.stringify(bridge.logs())}`);
    console.log('5.103 devpass-status diagnostic: OK');
  } finally {
    await bridge.stop();
  }
})().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
