'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'plugins/usage-dashboard/tests';
const read = name => fs.readFileSync(`${root}/${name}`, 'utf8');
const legacySha = '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69';

for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
  'p46-lifecycle-stress-ownership.cjs',
]) {
  const source = read(name);
  assert.equal(source.includes("assert.equal(release.engineVersion, '1.6.22')"), false, `${name} must not pin the evergreen current release to Engine 1.6.22`);
}

for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
]) {
  const source = read(name);
  assert.ok(source.includes("if (release.engineVersion === '1.6.22')"), `${name} must retain a conditional Engine 1.6.22 historical lock`);
  assert.ok(source.includes(legacySha), `${name} must retain the historical Engine 1.6.22 exact-byte SHA`);
}

const historical = [
  ['p39-provenance-analytics-wrapper-consolidation.cjs', '3.0.0-alpha.5.75'],
  ['p40-request-provenance-diagnostics-ownership.cjs', '3.0.0-alpha.5.76'],
  ['p41-diagnostics-instant-mode-patch-layer-consolidation.cjs', '3.0.0-alpha.5.77'],
  ['p42-runtime-weight-audit-patch-layer-consolidation.cjs', '3.0.0-alpha.5.78'],
  ['p43-diagnostics-workspace-composition-ownership-consolidation.cjs', '3.0.0-alpha.5.79'],
  ['p44-request-ledger-provenance-ownership-consolidation.cjs', '3.0.0-alpha.5.80'],
  ['p45-service-tier-presentation-ownership-consolidation.cjs', '3.0.0-alpha.5.81'],
];
for (const [name, version] of historical) {
  const source = read(name);
  assert.ok(source.includes(`release.productVersion !== '${version}'`), `${name} must remain release-specific to ${version}`);
  assert.ok(source.includes("assert.equal(release.engineVersion, '1.6.22')"), `${name} must retain its historical Engine 1.6.22 identity lock`);
}

console.log('Behavior Engine Lineage Regressions: OK · evergreen P36/P37/P38/P46 tolerate intentional Engine upgrades · Engine 1.6.22 exact-byte history preserved · P39-P45 release locks preserved');
