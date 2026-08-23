'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const doc = fs.readFileSync('docs/USAGE_DASHBOARD_PR_LIFECYCLE_IMPLEMENTATION_COMPLETE.md', 'utf8');

for (const marker of [
  'Status: **IMPLEMENTATION_COMPLETE**',
  '#153',
  'cc4601675ad9d7716991d441da25cf21b0c44d36',
  '#155',
  '06cadf39a25831d78f7ccc9dac267dfc2f1e3b69',
  '#156',
  'a0156b1df8851fc3ae91ac2af0922bafdc4d3f5d',
  '#158',
  'f49e961ae2bd0da58ebc90ef17a62221c2c538a6',
  '#159',
  'dab9ec98f07959dbe7b20ff4c60339f359e11568',
  '32640314796',
  'TEST_REGISTRY_GREEN:70',
  '32640370297',
  '`classify`: **SUCCESS**',
  '`promote`: **SKIPPED**',
  '`maintenance-release-control-smoke`: **SKIPPED**',
  'e4175cac68cdce8dcb7841f9aaa1be3e3275c53f',
  '82c67639529862fcc00f1f0bf1ff47cd5c4feb46',
  '15cdc440f465ffe3f8f51ad127ca2f88c0433bb6',
  '2ba27e51389296dcd0544517f964dd6e8fb7ee1c',
  'b45db4e294dedefb655da09d715bd3aceda0a521',
  '80bcddd0bf486cedfaf38f21db0342991272e089',
  'DEFERRED_TO_NEXT_FEATURE_RELEASE',
  'temporary staging workflow: FORBIDDEN',
  'not an implementation gap',
  'NOT_REQUIRED_FOR_THIS_MAINTENANCE_CLOSURE',
  'E1–E4-B maintenance closure: COMPLETE',
]) {
  assert.ok(doc.includes(marker), `closure evidence missing: ${marker}`);
}

assert.match(doc, /historical evidence, not a pin that blocks later product releases/);
assert.match(doc, /first real feature release after this closure is the operational adoption test for E2 \+ E4-B/);
assert.match(doc, /Product: `3\.0\.0-alpha\.5\.70`/);
assert.match(doc, /Engine: `1\.6\.21`/);
assert.match(doc, /Manager: `1\.3\.0`/);

console.log('usage-dashboard PR lifecycle closure contract: OK · E1–E4-B implementation closure and deferred first-feature operational proof locked');
