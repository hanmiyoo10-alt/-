const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const currentRelease = loadCurrentRelease();
const alphaBuild = String(currentRelease.productVersion || '').match(/^3\.0\.0-alpha\.5\.(\d+)$/);
const diagnosticsWorkspace = Boolean(alphaBuild && Number(alphaBuild[1]) >= 67);
const requestProvenance = Boolean(alphaBuild && Number(alphaBuild[1]) >= 71);
const expected = [
  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js','08-runtime-product.part.js',
  '10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js',
  ...(requestProvenance ? ['15-request-provenance.part.js'] : []),
  '16-usage-analytics.part.js',
  ...(requestProvenance ? ['18-request-provenance-analytics.part.js'] : []),
  '20-bridge-io.part.js','30-refresh-runtime.part.js','40-diagnostics.part.js',
  ...(requestProvenance ? ['42-request-provenance-diagnostics.part.js'] : []),
  '50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js','60-settings-runtime.part.js',
  ...(diagnosticsWorkspace ? ['62-diagnostics-workspace.part.js'] : []),
  '70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js',
  '80-lifecycle.part.js','90-bootstrap.part.js'
];
assert.deepEqual(PARTS.map(part => part.file), expected);
assert.equal(new Set(expected).size, expected.length);
const actual = fs.readdirSync(src).filter(name => name.endsWith('.part.js')).sort();
assert.deepEqual(actual, [...expected].sort(), 'orphan or missing source part');
const splitGroups = expected.filter(name => /^(?:00|02|04|06|08|10|12|14|15|16|18|42|50|52|54|62|70|72|74|76)-/.test(name));
for (const name of splitGroups) {
  const bytes = fs.statSync(path.join(src, name)).size;
  assert.ok(bytes <= 35 * 1024, `${name} grew beyond 35 KiB: ${bytes}`);
}
console.log(`usage-dashboard P5 module layout: OK · ${PARTS.length} parts`);
