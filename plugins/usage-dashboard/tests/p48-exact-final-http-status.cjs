// P48 Exact Final HTTP Status Fidelity
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
const requestNormalize = fs.readFileSync(`${src}/10-request-normalize.part.js`, 'utf8');
const ledger = fs.readFileSync(`${src}/14-request-ledger.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${src}/40-diagnostics.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.83') {
  console.log(`P48 Exact Final HTTP Status: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.83`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.24');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
assert.ok(engine.includes("const VERSION = '1.6.24';"), 'P48 generated Engine must be 1.6.24');
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.83';"), 'P48 Manager product identity must track 5.83');
assert.ok(manager.includes("const BUNDLED_ENGINE_VERSION = '1.6.24';"), 'P48 Manager bundled Engine version must track 1.6.24');

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bootstrap-bridge-manager.sh`)).digest('hex');
assert.equal(engineSha, manifest.components.bridge.sha256, 'P48 generated Engine hash must match manifest');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c', 'P48 bootstrap must remain byte-identical');

function sliceBetween(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  assert.ok(start >= 0, `P48 missing start marker: ${startMarker}`);
  const end = text.indexOf(endMarker, start);
  assert.ok(end > start, `P48 missing end marker: ${endMarker}`);
  return text.slice(start, end);
}

assert.ok(capture.includes('llmgateway.devpass.bridge.capture.v12'), 'P48 capture marker must advance to v12');
assert.ok(capture.includes("logField(row, ['errorDetails.statusCode'])"), 'P48 capture must read only final errorDetails.statusCode');
assert.ok(capture.includes("'exact-final-http-status-input'"), 'P48 exact HTTP capture patch missing');
assert.ok(capture.includes("'exact-final-http-status-fields'"), 'P48 exact HTTP capture fields patch missing');
const captureHttp = sliceBetween(capture, "'exact-final-http-status-input'", "'exact-final-http-status-fields'");
for (const forbidden of ['routingMetadata', 'status_code', 'statusText', 'responseText', '.cause', 'customHeaders', 'cookie', 'authorization']) {
  assert.equal(captureHttp.includes(forbidden), false, `P48 capture must not use/leak ${forbidden}`);
}

assert.ok(engineSources.includes('const httpStatusExplicit ='), 'P48 Engine public strict HTTP predicate missing');
assert.ok(engineSources.includes("row?.httpStatusSource === 'errorDetails.statusCode'"), 'P48 Engine must require exact source provenance');
assert.ok(engineSources.includes("row?.httpStatusFidelity === 'explicit'"), 'P48 Engine must require explicit fidelity');
assert.ok(engineSources.includes("httpStatusSource: httpStatusExplicit ? 'errorDetails.statusCode' : ''"), 'P48 Engine public source field missing');
assert.ok(engineSources.includes("httpStatusFidelity: httpStatusExplicit ? 'explicit' : 'unknown'"), 'P48 Engine UNKNOWN fidelity missing');

assert.ok(requestNormalize.includes('function requestHttpStatusMetadata(row)'), 'P48 Plugin HTTP metadata helper missing');
assert.ok(requestNormalize.includes("source === 'errorDetails.statusCode'"), 'P48 Plugin must require exact source');
assert.ok(requestNormalize.includes("requestOutcomeCategory(row) === 'error'"), 'P48 HTTP badge must be gated by error outcome');
assert.ok(requestNormalize.includes("return {errorRows:errorRows.length, exact, unknown:errorRows.length - exact, source:'errorDetails.statusCode'}"), 'P48 HTTP diagnostics stats contract missing');

assert.ok(ledger.includes('httpStatusCode:httpStatus.httpStatusCode'), 'P48 ledger must preserve exact HTTP status enrichment');
assert.ok(ledger.includes('httpStatusFidelity:httpStatus.httpStatusFidelity'), 'P48 ledger fidelity field missing');
assert.ok(ledger.includes("incomingHttpStatus.httpStatusFidelity === 'explicit' ? incomingHttpStatus : currentHttpStatus"), 'P48 UNKNOWN->explicit merge contract missing');
assert.ok(ledger.split('const httpStatusText = requestHttpStatusText(row);').length >= 3, 'P48 Recent Requests and hourly detail must both render HTTP metadata');
assert.ok(ledger.includes('[resultText, httpStatusText,'), 'P48 HTTP badge must remain compact request metadata');

const identity = sliceBetween(ledger, 'function requestLedgerKey(row) {', 'function collectRecentRequestLedger(data) {');
assert.equal(identity.includes('httpStatus'), false, 'P48 HTTP status must never enter request identity');

assert.ok(diagnostics.includes('HTTP final status fidelity:'), 'P48 bounded HTTP fidelity diagnostics missing');
assert.ok(diagnostics.includes('source ${diagHttpStatus.source}'), 'P48 diagnostics must expose only bounded source provenance');

const recentValueFn = sliceBetween(requestNormalize, '  function recentRequestValue(row, keys, fallback = null) {', '\n\n  function recentRequestField');
const httpFns = sliceBetween(requestNormalize, '  function requestHttpStatusMetadata(row) {', '\n\n  function requestCacheSignal(row) {');
const outcomeFn = sliceBetween(ledger, '  function requestOutcomeCategory(row) {', '\n\n  function requestOutcomeStats(rows) {');
const factory = new Function(`${recentValueFn}\n${outcomeFn}\n${httpFns}\nreturn {requestHttpStatusMetadata, requestHttpStatusText, requestHttpStatusStats};`);
const helpers = factory();

const exactError = {httpStatusCode:429,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit',success:false};
assert.deepEqual(helpers.requestHttpStatusMetadata(exactError), {httpStatusCode:429,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit'});
assert.equal(helpers.requestHttpStatusText(exactError), 'HTTP 429');

const exactSuccess = {...exactError, httpStatusCode:200, success:true};
assert.equal(helpers.requestHttpStatusText(exactSuccess), '', 'P48 success must never display synthetic/irrelevant HTTP 200');

for (const bad of [
  {httpStatusCode:'429',httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit',success:false},
  {httpStatusCode:429,httpStatusSource:'routingMetadata.status_code',httpStatusFidelity:'explicit',success:false},
  {httpStatusCode:429,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'unknown',success:false},
  {httpStatusCode:99,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit',success:false},
  {httpStatusCode:600,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit',success:false},
]) {
  assert.equal(helpers.requestHttpStatusMetadata(bad).httpStatusCode, null, 'P48 invalid/foreign HTTP evidence must remain UNKNOWN');
  assert.equal(helpers.requestHttpStatusText(bad), '', 'P48 invalid/foreign HTTP evidence must not render a badge');
}

const stats = helpers.requestHttpStatusStats([
  exactError,
  {success:false},
  {success:true,httpStatusCode:200,httpStatusSource:'errorDetails.statusCode',httpStatusFidelity:'explicit'},
]);
assert.deepEqual(stats, {errorRows:2,exact:1,unknown:1,source:'errorDetails.statusCode'});

for (const forbidden of ['rawErrorDetails', 'responseText', 'statusText', 'routingMetadata.status_code']) {
  assert.equal(latest.includes(forbidden), false, `P48 public Plugin must not expose ${forbidden}`);
}

for (const name of ['behavior-request-provenance.cjs', 'behavior-service-tier-outcome.cjs', 'behavior-request-duration.cjs']) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P48 requires ${name} GREEN`);
}

const suite = discoverTests();
assert.ok(suite.regressions.includes('p48-exact-final-http-status.cjs'), 'P48 registry must include P48');
assert.ok(suite.regressions.includes('p49-release-notes-diagnostic-guidance.cjs'), 'P48 paired 5.83 registry must include P49');

console.log('P48 Exact Final HTTP Status: OK · errorDetails.statusCode only · UNKNOWN preserved · error-row badge only · no HTTP identity coupling · no raw error payload');
