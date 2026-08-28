// P50 Service Tier Selection-Source Fidelity
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const capture = fs.readFileSync(`${root}/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs`, 'utf8');
const engineSources = fs.readFileSync(`${root}/runtime-src/bridge-engine/40-sources.part.mjs`, 'utf8');
const serviceTier = fs.readFileSync(`${src}/12-service-tier.part.js`, 'utf8');
const ledger = fs.readFileSync(`${src}/14-request-ledger.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${src}/40-diagnostics.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.84') {
  console.log(`P50 Service Tier Selection-Source Fidelity: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.84`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.25');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
assert.ok(engine.includes("const VERSION = '1.6.25';"), 'P50 generated Engine must be 1.6.25');
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.84';"), 'P50 Manager product identity must track 5.84');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.25';"), 'P50 Manager bundled Engine version must track 1.6.25');

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`)).digest('hex');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P50 generated Engine hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P50 bootstrap must remain byte-identical');
execFileSync(process.execPath, [`${root}/tools/build_bridge_engine.cjs`, '--check'], {stdio:'pipe'});

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `P50 missing start marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.ok(end > start, `P50 missing end marker: ${endMarker}`);
  return text.slice(start, end);
}

assert.ok(capture.includes('llmgateway.devpass.bridge.capture.v13'), 'P50 capture marker must advance to v13');
assert.ok(capture.includes("logField(row, ['routingMetadata.serviceTierSource'])"), 'P50 capture must read the pinned selection-source field');
assert.ok(capture.includes("serviceTierSelectionSource: ['request','coding-plan-default'].includes"), 'P50 capture must collapse selection source to the bounded enum');
assert.equal((capture.match(/routingMetadata\.serviceTierSource/g) || []).length, 1, 'P50 capture must read exactly one routingMetadata scalar');
for (const forbidden of ['providerScores','routingAttempts','apiKeyHash','apiKeyLabel','filteredProviders','customHeaders','authorization','cookie']) {
  assert.equal(capture.includes(forbidden), false, `P50 capture must not retain ${forbidden}`);
}

assert.ok(engineSources.includes("const serviceTierSelectionSource = ['request','coding-plan-default'].includes"), 'P50 Engine must validate the safe scalar again at the public boundary');
assert.ok(engineSources.includes('serviceTierSelectionSource,'), 'P50 Engine public request row must expose the safe scalar');
assert.equal(engineSources.includes('routingMetadata.serviceTierSource'), false, 'P50 public Engine normalization must not carry raw routingMetadata');

for (const marker of [
  'function normalizeServiceTierSelectionSource(value)',
  "if (text === 'request') return 'request';",
  "if (text === 'coding-plan-default') return 'coding-plan-default';",
  "return 'unknown';",
  'function preferKnownServiceTierSelectionSource(next, current)',
  'function requestServiceTierSelectionSourceText(row)',
  "if (source === 'request') return '요청 지정';",
  "if (source === 'coding-plan-default') return '플랜 기본';",
]) assert.ok(serviceTier.includes(marker), `P50 Plugin helper missing: ${marker}`);

const factory = new Function('requestAccountScopeValue', `${serviceTier}\nreturn {normalizeServiceTierValue,normalizeServiceTierSelectionSource,preferKnownServiceTierSelectionSource,requestServiceTierText,requestServiceTierSelectionSourceText,requestServiceTierStats};`);
const helpers = factory(value => ['devpass','credits'].includes(String(value)) ? String(value) : 'unknown');

assert.equal(helpers.normalizeServiceTierSelectionSource('request'), 'request');
assert.equal(helpers.normalizeServiceTierSelectionSource('coding-plan-default'), 'coding-plan-default');
for (const value of [null, undefined, '', 'provider', 'plan-default', 'REQUESTED']) {
  assert.equal(helpers.normalizeServiceTierSelectionSource(value), 'unknown', 'P50 unsupported/missing source must remain UNKNOWN');
}
assert.equal(helpers.requestServiceTierSelectionSourceText({serviceTierSelectionSource:'request'}), '요청 지정');
assert.equal(helpers.requestServiceTierSelectionSourceText({serviceTierSelectionSource:'coding-plan-default'}), '플랜 기본');
assert.equal(helpers.requestServiceTierSelectionSourceText({serviceTierSelectionSource:'unknown'}), '');

const missingServed = {requestAccountScope:'devpass',requestedServiceTier:'flex',servedServiceTier:null,serviceTierSelectionSource:'coding-plan-default'};
assert.equal(helpers.requestServiceTierText(missingServed), 'DevPass · 요청 FLEX · 실제 ?', 'P50 missing served tier must stay UNKNOWN');
assert.equal(helpers.requestServiceTierSelectionSourceText(missingServed), '플랜 기본');
assert.equal(helpers.requestServiceTierText({...missingServed,requestedServiceTier:null}), 'DevPass · TIER ?', 'P50 selection source alone must never manufacture a tier');

assert.equal(helpers.preferKnownServiceTierSelectionSource('unknown','request'), 'request', 'P50 UNKNOWN must not erase explicit selection enrichment');
assert.equal(helpers.preferKnownServiceTierSelectionSource('coding-plan-default','unknown'), 'coding-plan-default', 'P50 explicit selection source must enrich UNKNOWN');
assert.equal(helpers.preferKnownServiceTierSelectionSource(null,null), 'unknown');

const stats = helpers.requestServiceTierStats([
  {requestedServiceTier:'flex',servedServiceTier:'flex',serviceTierSelectionSource:'request'},
  {requestedServiceTier:'priority',servedServiceTier:null,serviceTierSelectionSource:'coding-plan-default'},
  {requestedServiceTier:null,servedServiceTier:'standard',serviceTierSelectionSource:'unknown'},
]);
assert.deepEqual(stats.requested, {flex:1,standard:0,priority:1,unknown:1});
assert.deepEqual(stats.served, {flex:1,standard:1,priority:0,unknown:1});
assert.deepEqual(stats.selectionSource, {request:1,planDefault:1,unknown:1});

assert.ok(ledger.includes("const serviceTierSelectionSource = normalizeServiceTierSelectionSource(recentRequestValue(row, ['serviceTierSelectionSource','service_tier_selection_source'], 'unknown'));"), 'P50 ledger must normalize the bounded Engine scalar');
assert.ok(ledger.includes('serviceTierSelectionSource:preferKnownServiceTierSelectionSource(row.serviceTierSelectionSource, current?.serviceTierSelectionSource)'), 'P50 ledger UNKNOWN->explicit enrichment merge missing');
assert.ok(ledger.split('const tierSelectionText = requestServiceTierSelectionSourceText(row);').length >= 3, 'P50 Recent Requests and hourly detail must both render the separate selection suffix');
assert.ok(ledger.includes('tierText, tierSelectionText, durationText'), 'P50 selection source must remain separate from established tier text');

const identity = sliceBetween(ledger, 'function requestLedgerKey(row) {', 'function collectRecentRequestLedger(data) {');
assert.equal(identity.includes('serviceTierSelectionSource'), false, 'P50 selection source must never enter request identity');
assert.ok(identity.includes('if (requestNumber) return `request:${requestNumber}`;'), 'P50 exact request ID identity must remain authoritative');

for (const marker of [
  'Service tier requested:',
  'Service tier served:',
  'Service tier selection source:',
  'plan-default ${diagTierFidelity.selectionSource.planDefault}',
  'Service tier source fields:'
]) assert.ok(diagnostics.includes(marker), `P50 diagnostics marker missing: ${marker}`);

for (const forbidden of ['routingMetadata', 'providerScores', 'routingAttempts', 'apiKeyHash', 'apiKeyLabel']) {
  assert.equal(latest.includes(forbidden), false, `P50 Plugin artifact must not expose ${forbidden}`);
}

const selectionRelevant = [serviceTier, sliceBetween(ledger, '  function normalizeRecentRequestRows(rows, limit = 12) {', '  function requestOutcomeCategory(row) {')].join('\n');
for (const forbidden of ['setInterval(', 'setTimeout(', 'nativeFetch(', 'fetchSnapshot(', 'runCli(', 'persist(', 'scheduleRefresh(']) {
  assert.equal(selectionRelevant.includes(forbidden), false, `P50 selection-source path must not add ${forbidden}`);
}

for (const name of [
  'behavior-service-tier-outcome.cjs',
  'behavior-request-provenance.cjs',
  'behavior-request-duration.cjs',
  'p5-service-tier-fidelity.cjs',
  'p35-cross-scope-request-provenance.cjs',
  'p45-service-tier-presentation-ownership-consolidation.cjs',
  'p49-release-notes-diagnostic-guidance.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK|SKIP/, `P50 requires ${name} GREEN or historical exact-release SKIP`);
}

const suite = discoverTests();
for (const name of [
  'p45-service-tier-presentation-ownership-consolidation.cjs',
  'p48-exact-final-http-status.cjs',
  'p49-release-notes-diagnostic-guidance.cjs',
  'p50-service-tier-selection-source-fidelity.cjs',
]) assert.ok(suite.regressions.includes(name), `P50 registry must include ${name}`);

console.log('P50 Service Tier Selection-Source Fidelity: OK · request/coding-plan-default only · UNKNOWN preserved · no tier synthesis · separate suffix · identity stable · privacy bounded · zero new I/O owner');
