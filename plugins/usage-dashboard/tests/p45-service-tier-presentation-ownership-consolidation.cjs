'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const service = fs.readFileSync(`${src}/12-service-tier.part.js`, 'utf8');
const ledger = fs.readFileSync(`${src}/14-request-ledger.part.js`, 'utf8');
const provenance = fs.readFileSync(`${src}/15-request-provenance.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.81') {
  console.log(`P45 Service-Tier Presentation Ownership Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.81`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P45 Engine must remain byte-identical to 5.80');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P45 bootstrap must remain byte-identical to 5.80');
assert.ok(manager.includes("const MANAGER_VERSION = '1.3.0';"), 'P45 Manager version must remain 1.3.0');
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.81';"), 'P45 Manager product identity must track 5.81');

const {PARTS} = require('../src/parts.cjs');
assert.equal(PARTS.length, 24, 'P45 plugin source module count must remain exactly 24');
const partFiles = PARTS.map(part => part.file);
const ordered = ['12-service-tier.part.js','14-request-ledger.part.js','15-request-provenance.part.js','16-usage-analytics.part.js'];
const indexes = ordered.map(name => partFiles.indexOf(name));
assert.ok(indexes.every(index => index >= 0), 'P45 required request modules must remain registered');
assert.deepEqual(indexes, [...indexes].sort((a,b) => a-b), 'P45 module order must remain 12 -> 14 -> 15 -> 16');
const part15 = PARTS.find(part => part.file === '15-request-provenance.part.js');
assert.equal(part15.marker, '\n  function requestAccountScopeStats(rows) {', 'P45 module 15 boundary must use surviving stats symbol');

assert.equal((service.match(/function requestAccountScopeLabel\(value\)/g) || []).length, 1, 'P45 module 12 must directly own requestAccountScopeLabel');
assert.equal((service.match(/function requestServiceTierText\(row\)/g) || []).length, 1, 'P45 module 12 must directly own requestServiceTierText');
for (const marker of [
  "if (scope === 'devpass') return 'DevPass';",
  "if (scope === 'credits') return 'Credits';",
  "return '—';",
  "let tierText = 'TIER ?';",
  'return `${scopeText} · ${tierText}`;',
]) assert.ok(service.includes(marker), `P45 module-12 native presentation marker missing: ${marker}`);

assert.equal(provenance.includes('function requestAccountScopeLabel(value)'), false, 'P45 module 15 must not retain requestAccountScopeLabel');
for (const retired of ['requestServiceTierTextBeforeProvenance','requestServiceTierTextWithProvenance']) {
  assert.equal(provenance.includes(retired), false, `P45 module 15 retired wrapper must be absent: ${retired}`);
  assert.equal(latest.includes(retired), false, `P45 built plugin retired wrapper must be absent: ${retired}`);
}
assert.equal((provenance.match(/\brequestServiceTierText\s*=\s*function\b/g) || []).length, 0, 'P45 module 15 must not reassign requestServiceTierText');
assert.equal((provenance.match(/function requestAccountScopeStats\(rows\)/g) || []).length, 1, 'P45 module 15 must remain registered as stats owner');

const tierStart = service.indexOf('function requestServiceTierText(row)');
const tierEnd = service.indexOf('\n\n  function requestServiceTierStats', tierStart);
assert.ok(tierStart >= 0 && tierEnd > tierStart, 'P45 requestServiceTierText boundary missing');
const tierOwner = service.slice(tierStart, tierEnd);
for (const forbidden of [
  'requestedServiceTierSource','servedServiceTierSource','provider','model','cost',
  'nativeFetch(','fetchSnapshot(','enqueueRefresh(','runCli(','setInterval(','setTimeout(','scheduleRefresh(','schedulePanelRender('
]) assert.equal(tierOwner.includes(forbidden), false, `P45 native presentation must not add inference/I/O/scheduling: ${forbidden}`);

for (const publicPluginSource of [service, ledger, provenance]) {
  assert.doesNotMatch(publicPluginSource, /requestProjectId|requestOrganizationId|project_id|organization_id/, 'P45 raw project/org identity must never enter plugin source');
}

for (const name of ['behavior-request-provenance.cjs', 'p35-cross-scope-request-provenance.cjs', 'p5-service-tier-fidelity.cjs']) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P45 requires ${name} GREEN`);
}

const suite = discoverTests();
for (const name of ['p35-cross-scope-request-provenance.cjs','p44-request-ledger-provenance-ownership-consolidation.cjs','p45-service-tier-presentation-ownership-consolidation.cjs']) {
  assert.ok(suite.regressions.includes(name), `P45 registry missing ${name}`);
}

console.log('P45 Service-Tier Presentation Ownership Consolidation: OK · module 12 direct scope+tier presentation owner · module 15 stats-only · behavior/P35/service-tier GREEN · 24 parts · Engine/bootstrap byte-identical');
