'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const ledger = fs.readFileSync(`${src}/14-request-ledger.part.js`, 'utf8');
const provenance = fs.readFileSync(`${src}/15-request-provenance.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.80') {
  console.log(`P44 Request Ledger Provenance Ownership Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.80`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P44 Engine must remain byte-identical to 5.79');

const {PARTS} = require('../src/parts.cjs');
assert.equal(PARTS.length, 24, 'P44 plugin source module count must remain exactly 24');
const partFiles = PARTS.map(part => part.file);
const ordered = ['12-service-tier.part.js','14-request-ledger.part.js','15-request-provenance.part.js','16-usage-analytics.part.js'];
const indexes = ordered.map(name => partFiles.indexOf(name));
assert.ok(indexes.every(index => index >= 0), 'P44 required request modules must remain registered');
assert.deepEqual(indexes, [...indexes].sort((a,b) => a-b), 'P44 module order must remain 12 -> 14 -> 15 -> 16');
const part15 = PARTS.find(part => part.file === '15-request-provenance.part.js');
assert.equal(part15.marker, '\n  function requestAccountScopeLabel(value) {', 'P44 module 15 boundary must use surviving presentation symbol');

assert.equal((ledger.match(/function requestAccountScopeValue\(value\)/g) || []).length, 1, 'P44 module 14 must directly own requestAccountScopeValue');
assert.equal((ledger.match(/function requestScopeFidelityValue\(value, scope = 'unknown'\)/g) || []).length, 1, 'P44 module 14 must directly own requestScopeFidelityValue');
for (const retired of [
  'requestLedgerKeyBeforeProvenance',
  'normalizeRecentRequestRowsBeforeProvenance',
  'requestLedgerRowsForScopeBeforeProvenance',
  'requestLedgerKeyWithProvenance',
  'normalizeRecentRequestRowsWithProvenance',
  'requestLedgerRowsForScopeWithProvenance',
]) {
  assert.equal(provenance.includes(retired), false, `P44 module 15 retired wrapper must be absent: ${retired}`);
  assert.equal(latest.includes(retired), false, `P44 built plugin retired wrapper must be absent: ${retired}`);
}
assert.equal((provenance.match(/\brequestLedgerKey\s*=\s*function\b/g) || []).length, 0, 'P44 module 15 must not reassign requestLedgerKey');
assert.equal((provenance.match(/\bnormalizeRecentRequestRows\s*=\s*function\b/g) || []).length, 0, 'P44 module 15 must not reassign normalizeRecentRequestRows');
assert.equal((provenance.match(/\brequestLedgerRowsForScope\s*=\s*function\b/g) || []).length, 0, 'P44 module 15 must not reassign requestLedgerRowsForScope');
for (const retained of ['function requestAccountScopeLabel(value)', 'function requestAccountScopeStats(rows)', 'requestServiceTierTextBeforeProvenance', 'requestServiceTierTextWithProvenance']) {
  assert.ok(provenance.includes(retained), `P44 module 15 retained presentation/service-tier owner missing: ${retained}`);
}

const normalizeStart = ledger.indexOf('function normalizeRecentRequestRows(rows, limit = 12)');
const normalizeEnd = ledger.indexOf('\n\n  function requestOutcomeCategory', normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart, 'P44 normalizeRecentRequestRows boundary missing');
const normalize = ledger.slice(normalizeStart, normalizeEnd);
assert.match(normalize, /const requestAccountScope = requestNumber \? requestAccountScopeValue\([\s\S]*?\) : 'unknown';/);
assert.match(normalize, /const requestScopeFidelity = requestNumber \? requestScopeFidelityValue\([\s\S]*?requestAccountScope\) : 'unknown';/);
assert.match(normalize, /const requestScopeConflict = requestNumber \? row\?\.requestScopeConflict === true : false;/);
for (const field of ['requestAccountScope,','requestScopeFidelity,','requestScopeConflict,']) assert.ok(normalize.includes(field), `P44 normalized row missing ${field}`);
assert.equal(normalize.includes('sourceByRequest'), false, 'P44 second-pass request map must be retired');
assert.equal(normalize.includes('normalized.map((row)'), false, 'P44 normalized provenance remap pass must be retired');

const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('\n\n  function collectRecentRequestLedger', keyStart);
assert.ok(keyStart >= 0 && keyEnd > keyStart, 'P44 requestLedgerKey boundary missing');
const requestKey = ledger.slice(keyStart, keyEnd);
assert.match(requestKey, /const requestNumber = String\(row\?\.requestNumber \|\| ''\)\.trim\(\);/);
assert.match(requestKey, /if \(requestNumber\) return `request:\$\{requestNumber\}`;/);
assert.match(requestKey, /return \[\s*Number\(row\?\.timestamp \|\| 0\),[\s\S]*?\]\.join\('\|'\);/);
for (const forbidden of ['requestAccountScope','requestScopeFidelity','requestScopeConflict','projectId','organizationId']) {
  assert.equal(requestKey.includes(forbidden), false, `P44 dedupe identity must exclude ${forbidden}`);
}
assert.ok(ledger.includes('const current = byKey.get(key) || null;'), 'P44 UNKNOWN -> explicit provenance must enrich the same request identity rather than duplicate');

const rowsStart = ledger.indexOf('function requestLedgerRowsForScope(scopeKey)');
const rowsEnd = ledger.indexOf('\n\n  function requestHourKey', rowsStart);
assert.ok(rowsStart >= 0 && rowsEnd > rowsStart, 'P44 requestLedgerRowsForScope boundary missing');
const scopeRows = ledger.slice(rowsStart, rowsEnd);
assert.match(scopeRows, /Date\.now\(\) - 24 \* 60 \* 60 \* 1000/);
assert.match(scopeRows, /if \(key === 'all'\) return rows;/);
assert.match(scopeRows, /requestAccountScopeValue\(row\?\.requestAccountScope\) === key/);
assert.equal(scopeRows.includes('row.scopes.includes(key)'), false, 'P44 DevPass/Credits filtering must not restore stale observation membership');
assert.ok(ledger.includes('.slice(0, 2000);'), 'P44 Request Ledger 2000-row bound must remain unchanged');
assert.match(scopeRows, /\.sort\(\(a,b\) => Number\(b\.timestamp \|\| 0\) - Number\(a\.timestamp \|\| 0\)\)/, 'P44 ledger rows must retain descending timestamp order');

for (const publicPluginSource of [ledger, provenance]) {
  assert.doesNotMatch(publicPluginSource, /requestProjectId|requestOrganizationId|project_id|organization_id/, 'P44 raw project/org identity must never enter plugin source');
}

const directOwnerStart = ledger.indexOf('function requestAccountScopeValue(value)');
const directOwnerEnd = rowsEnd;
const directOwner = ledger.slice(directOwnerStart, directOwnerEnd);
for (const forbidden of ['nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(', 'scheduleRefresh(', 'schedulePanelRender(']) {
  assert.equal(directOwner.includes(forbidden), false, `P44 ownership consolidation must add zero Bridge/network/CLI/polling/scheduler work: ${forbidden}`);
}

for (const name of ['p35-cross-scope-request-provenance.cjs', 'behavior-request-provenance.cjs']) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P44 requires ${name} GREEN`);
}

const suite = discoverTests();
for (const name of ['p35-cross-scope-request-provenance.cjs','p44-request-ledger-provenance-ownership-consolidation.cjs']) {
  assert.ok(suite.regressions.includes(name), `P44 registry missing ${name}`);
}

console.log('P44 Request Ledger Provenance Ownership Consolidation: OK · module 14 direct provenance owner · exact request identity · provenance scope filtering · 24 parts · P35/behavior GREEN · Engine byte-identical');
