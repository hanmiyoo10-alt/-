'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const usagePath = `${root}/src/16-usage-analytics.part.js`;
const wrapperPath = `${root}/src/18-request-provenance-analytics.part.js`;
const partsPath = `${root}/src/parts.cjs`;
const enginePath = `${root}/runtime/bridge-engine.mjs`;

const release = assertCurrentReleaseArtifacts();
if (release.productVersion !== '3.0.0-alpha.5.75') {
  console.log(`P39 Provenance Analytics Wrapper Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.75`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const usage = fs.readFileSync(usagePath, 'utf8');
const partsSource = fs.readFileSync(partsPath, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);

assert.equal(fs.existsSync(wrapperPath), false, 'P39 superseded module 18 must be deleted');
assert.equal(partFiles.includes('18-request-provenance-analytics.part.js'), false, 'P39 module 18 must be absent from PARTS');
assert.equal(PARTS.length, 27, 'P39 production plugin module count must be 27');
const usagePart = PARTS.find(part => part.file === '16-usage-analytics.part.js');
assert.equal(usagePart?.marker, '\n  function normalizeRequestProvenanceMetadata(raw) {', 'P39 module 16 registry boundary must follow the consolidated provenance owner');

const i15 = partFiles.indexOf('15-request-provenance.part.js');
const i16 = partFiles.indexOf('16-usage-analytics.part.js');
const i20 = partFiles.indexOf('20-bridge-io.part.js');
assert.ok(i15 >= 0 && i15 < i16 && i16 < i20, 'P39 provenance boundary must be 15 -> 16 -> 20');

assert.equal((usage.match(/function normalizeRequestProvenanceMetadata\(raw\)/g) || []).length, 1, 'P39 module 16 must directly own exactly one provenance metadata normalizer');
assert.match(usage, /requestProvenance:normalizeRequestProvenanceMetadata\(raw\?\.requestProvenance\)/, 'P39 normalizeScopeActivity must directly emit requestProvenance');
assert.doesNotMatch(usage, /normalizeScopeActivityBeforeProvenance|normalizeScopeActivityWithProvenance/, 'P39 wrapper reassignment must be gone');
assert.doesNotMatch(partsSource, /18-request-provenance-analytics\.part\.js/, 'P39 PARTS source must not retain module 18');

for (const marker of [
  "['account-wide','project-fallback','unknown'].includes(String(raw.captureMode))",
  "? String(raw.captureMode)",
  ": 'unknown';",
  'const bounded = value => num(value) ? Math.max(0, Number(value)) : 0;',
  'rows:bounded(raw.rows)',
  'fallbackCount:bounded(raw.fallbackCount)',
  'devpass:bounded(raw.devpass)',
  'credits:bounded(raw.credits)',
  'unknown:bounded(raw.unknown)',
  'conflict:bounded(raw.conflict)',
  'modelInference:0',
  "String(raw.authority || '') === 'project-exact+credits-org-used-mode'",
  "? 'project-exact+credits-org-used-mode'",
  ": 'unknown'",
]) assert.ok(usage.includes(marker), `P39 provenance semantic marker missing: ${marker}`);

const normalizerStart = usage.indexOf('function normalizeRequestProvenanceMetadata(raw)');
const scopeStart = usage.indexOf('function normalizeScopeActivity(raw)');
assert.ok(normalizerStart >= 0 && scopeStart > normalizerStart, 'P39 direct normalizer must precede normalizeScopeActivity in module 16');
const ownershipSlice = usage.slice(normalizerStart, scopeStart);
assert.doesNotMatch(ownershipSlice, /fetch\(|nativeFetch\(|fetchSnapshot\(|runCli\(|execFile|setInterval\(|setTimeout\(|scheduleRefresh\(|persist\(/, 'P39 consolidation must not add source I/O, CLI, polling, scheduling, or persistence work');

const suite = discoverTests();
assert.ok(suite.behavior.includes('behavior-request-provenance.cjs'), 'P39 requires executable request-provenance behavior authority');
assert.ok(suite.regressions.includes('p38-diagnostics-mode-handler-ownership.cjs'), 'P39 must retain P38');
assert.ok(suite.regressions.includes('p39-provenance-analytics-wrapper-consolidation.cjs'), 'P39 must be fail-closed registered');

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P39 Engine must remain byte-identical to 5.74');

console.log('P39 Provenance Analytics Wrapper Consolidation: OK · module 16 direct owner · module 18 removed · 27 parts · consolidated boundary locked · request provenance behavior authority retained · Engine byte-identical');
