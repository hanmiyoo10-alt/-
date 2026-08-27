'use strict';

const assert = require('node:assert/strict');
const e6 = require('../tools/candidate_stage_e6.cjs');

for (const allowed of [
  'plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs',
  'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs',
  'plugins/usage-dashboard/runtime-src/bridge-engine/parts.json',
]) {
  assert.equal(e6.generatedPath(allowed), true, `canonical Engine source must be an allowed generated payload: ${allowed}`);
}

for (const denied of [
  'plugins/usage-dashboard/runtime-src/bridge-manager/00-core.part.cjs',
  'plugins/usage-dashboard/runtime-src/other.mjs',
  'plugins/usage-dashboard/runtime-src/bridge-engineering/00-core.part.mjs',
  'runtime-src/bridge-engine/00-core.part.mjs',
]) {
  assert.equal(e6.generatedPath(denied), false, `unrelated runtime-src path must remain denied: ${denied}`);
}

console.log('behavior candidate Engine-source payload: OK · canonical bridge-engine generated namespace allowed · unrelated runtime-src denied');
