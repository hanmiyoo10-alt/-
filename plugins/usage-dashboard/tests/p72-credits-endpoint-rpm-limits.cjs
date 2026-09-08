'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.106';
const BASE = '3.0.0-alpha.5.105';
const BASE_RELEASE_SHA = '0e6eea0232fce4ffa1ceb51dca03d0f88d1ea13c';
const BASE_ENGINE_SHA = 'f9be84372a776dd743496ef811abea5a0a5582135efb5da9b1fcce58c4b001ae';
const SPEC = '.github/usage-dashboard/releases/5.106.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_credits_endpoint_rpm_5106.py';
const CAPTURE = 'plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs';
const SOURCES = 'plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs';
const HTTP = 'plugins/usage-dashboard/runtime-src/bridge-engine/70-http-diagnostics.part.mjs';
const ENGINE = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';
const MANIFEST = 'plugins/usage-dashboard/runtime/product-manifest.json';
const LATEST = 'plugins/usage-dashboard/latest.js';
const BRIDGE_IO = 'plugins/usage-dashboard/src/20-bridge-io.part.js';
const DASH = 'plugins/usage-dashboard/src/50-dashboard-context.part.js';
const DIAG = 'plugins/usage-dashboard/src/40-diagnostics.part.js';

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'Credits Endpoint RPM Limits');
assert.equal(spec.engineVersion, '1.6.40');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p72-credits-endpoint-rpm-limits.cjs');
assert.equal(spec.authority?.featureIssue, 1874);
assert.equal(spec.authority?.designPullRequest, 1875);
assert.equal(spec.authority?.releaseGeneration, 'E13');

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5106_CREDITS_ENDPOINT_RPM_DESIGN.md', 'utf8');
for (const marker of [
  'DESIGN FROZEN',
  'endpoints[].key',
  'endpoints[].rpm',
  'Explicit `rpm === 0` is known `Unlimited`',
  'Duplicate keys',
  'Preserve source row order',
  'Unknown future keys',
  '**not** live per-minute usage',
  'No new timer, poller, persistence, credential',
]) assert.ok(design.includes(marker), `P72 design marker missing: ${marker}`);

const materializer = fs.readFileSync(MATERIALIZER, 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.105'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.106'",
  "BASE_ENGINE = '1.6.39'",
  "TARGET_ENGINE = '1.6.40'",
  `BASE_ENGINE_SHA = '${BASE_ENGINE_SHA}'`,
  "const REQUIRED_BRIDGE_VERSION = '1.6.40';",
  'safe.endpoints = valid ? rows : null',
  "state:'invalid-endpoints'",
  'function gatewayEndpointRpmLimitsHtml(endpointRates)',
  'function gatewayEndpointRpmDiagnosticText(value)',
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P72 materializer marker missing: ${marker}`);
for (const forbidden of [
  BASE_RELEASE_SHA,
  '5578155765',
  'rep(LEDGER,',
  'rep(PROV,',
  'setInterval(',
  'setTimeout(',
  '/gateway-endpoint-rpm',
]) assert.equal(materializer.includes(forbidden), false, `P72 materializer forbidden authority/owner: ${forbidden}`);

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P72 Credits endpoint RPM limits: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.40');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1869);
  assert.equal(row?.commentId, 5578155765);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
assert.equal(manifest.productVersion, TARGET);
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.40');
assert.equal(manifest.components?.bridge?.sha256, sha256(ENGINE));
assert.notEqual(sha256(ENGINE), BASE_ENGINE_SHA, 'P72 Engine bytes must change for bounded endpoint RPM truth');
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, TARGET);
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
const latest = fs.readFileSync(LATEST, 'utf8');
assert.ok(latest.includes("const REQUIRED_BRIDGE_VERSION = '1.6.40';"));

const capture = fs.readFileSync(CAPTURE, 'utf8');
const sources = fs.readFileSync(SOURCES, 'utf8');
const http = fs.readFileSync(HTTP, 'utf8');
const engine = fs.readFileSync(ENGINE, 'utf8');
const bridgeIo = fs.readFileSync(BRIDGE_IO, 'utf8');
const dash = fs.readFileSync(DASH, 'utf8');
const diag = fs.readFileSync(DIAG, 'utf8');

for (const marker of [
  "const GATEWAY_LIMITS_TTL_MS = 5 * 60 * 1000;",
  "path: `/orgs/${encodeURIComponent(orgId)}/limits`",
  'function sanitizeGatewayLimitEndpoints(value)',
  'safe.endpoints = valid ? rows : null',
  "return { state:'invalid-endpoints'",
]) assert.ok(engine.includes(marker), `P72 Engine marker missing: ${marker}`);
assert.ok(capture.includes('function sanitizeGatewayLimitEndpoints(value)'));
assert.ok(capture.includes("safe.endpoints = valid ? rows : null"));
assert.ok(sources.includes("state:'invalid-endpoints'"));
assert.ok(http.includes('Gateway endpoint RPM:'));
for (const forbidden of [
  'endpoint.path',
  'row.path',
  'topUpDailyCapUsd',
  'accountAgeDays',
]) assert.equal(capture.includes(forbidden), false, `P72 capture forbidden field retained: ${forbidden}`);

for (const marker of [
  'function normalizeGatewayEndpointRpmLimits(value)',
  "state:'not-applicable'",
  "state:'invalid-endpoints'",
  "return {state:'ok',rows,outcome:envelope.outcome};",
  'function gatewayEndpointRpmLimitsHtml(endpointRates)',
  'Endpoint RPM · 조직 한도',
  "title:'조직 한도 상세'",
  'function gatewayEndpointRpmDiagnosticText(value)',
  'Gateway endpoint RPM:',
]) assert.ok(dash.includes(marker) || diag.includes(marker), `P72 Product marker missing: ${marker}`);
assert.ok(bridgeIo.includes('endpointRates: raw.gatewayLimits ? normalizeGatewayEndpointRpmLimits(raw.gatewayLimits) : {state:\'not-requested\',rows:[]}'));
assert.ok(dash.includes("if(rpm===0) return 'Unlimited';"));
assert.ok(dash.includes('escapeHtml(endpointRpmDisplayLabel(row.key))'));
assert.equal(dash.includes('row.path'), false);
assert.equal(diag.includes('row.path'), false);
assert.equal(diag.includes('selectedCreditsOrgId'), false);
assert.equal(diag.includes('JSON.stringify(endpointRates'), false);

const sanitizerSource = capture.slice(capture.indexOf('function sanitizeGatewayLimitEndpoints(value)'), capture.indexOf('function sanitizeGatewayLimits(payload)'));
const sanitizerContext = {};
vm.createContext(sanitizerContext);
vm.runInContext(`${sanitizerSource};this.sanitizeGatewayLimitEndpoints=sanitizeGatewayLimitEndpoints;`, sanitizerContext);
const sanitize = sanitizerContext.sanitizeGatewayLimitEndpoints;
assert.deepEqual(JSON.parse(JSON.stringify(sanitize([{key:'chat-completions',path:'/v1/chat/completions',rpm:5000},{key:'models',path:'/v1/models',rpm:0}]))),[{key:'chat-completions',rpm:5000},{key:'models',rpm:0}]);
assert.equal(sanitize([{key:'dup',rpm:1},{key:'dup',rpm:2}]),null);
assert.equal(sanitize([{key:'bad',rpm:-1}]),null);
assert.equal(sanitize([{key:'bad',rpm:Infinity}]),null);
assert.equal(sanitize([{key:'',rpm:1}]),null);
assert.equal(sanitize(null),null);

const normalizeStart = sources.indexOf('function normalizeGatewayEndpointRpmLimits(payload){');
const normalizeEnd = sources.indexOf('\nfunction buildGatewayLimitsFallback', normalizeStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart, 'P72 Engine endpoint normalizer owner missing');
const normalizeSource = sources.slice(normalizeStart, normalizeEnd);
const normalizeContext = {};
vm.createContext(normalizeContext);
vm.runInContext(`${normalizeSource};this.normalizeGatewayEndpointRpmLimits=normalizeGatewayEndpointRpmLimits;`, normalizeContext);
const normalize = normalizeContext.normalizeGatewayEndpointRpmLimits;
assert.deepEqual(JSON.parse(JSON.stringify(normalize({kind:'regular',rateLimitsApply:true,endpoints:[{key:'chat-completions',rpm:5000},{key:'models',rpm:0}]}))),{state:'ok',rows:[{key:'chat-completions',rpm:5000},{key:'models',rpm:0}]});
assert.deepEqual(JSON.parse(JSON.stringify(normalize({kind:'regular',rateLimitsApply:false,endpoints:null}))),{state:'not-applicable',rows:[]});
assert.deepEqual(JSON.parse(JSON.stringify(normalize({kind:'enterprise',rateLimitsApply:null,endpoints:null}))),{state:'not-applicable',rows:[]});
assert.deepEqual(JSON.parse(JSON.stringify(normalize({kind:'regular',rateLimitsApply:true,endpoints:null}))),{state:'invalid-endpoints',rows:[]});

const productNormalizeStart = bridgeIo.indexOf('function normalizeGatewayEndpointRpmLimits(value){');
const productNormalizeEnd = bridgeIo.indexOf('\nfunction readCaptureHint', productNormalizeStart);
assert.ok(productNormalizeStart >= 0 && productNormalizeEnd > productNormalizeStart, 'P72 Product endpoint normalizer owner missing');
const productNormalizeSource = bridgeIo.slice(productNormalizeStart, productNormalizeEnd);
const productNormalizeContext = {};
vm.createContext(productNormalizeContext);
vm.runInContext(`${productNormalizeSource};this.normalizeGatewayEndpointRpmLimits=normalizeGatewayEndpointRpmLimits;`, productNormalizeContext);
const productNormalize = productNormalizeContext.normalizeGatewayEndpointRpmLimits;
assert.deepEqual(JSON.parse(JSON.stringify(productNormalize({state:'ok',rows:[{key:'chat-completions',rpm:5000},{key:'future-endpoint',rpm:123},{key:'models',rpm:0}]}))),{state:'ok',rows:[{key:'chat-completions',rpm:5000},{key:'future-endpoint',rpm:123},{key:'models',rpm:0}]});
assert.deepEqual(JSON.parse(JSON.stringify(productNormalize({state:'not-applicable',rows:[]}))),{state:'not-applicable',rows:[]});
assert.deepEqual(JSON.parse(JSON.stringify(productNormalize({state:'invalid-endpoints',rows:[]}))),{state:'invalid-endpoints',rows:[]});
assert.deepEqual(JSON.parse(JSON.stringify(productNormalize({state:'ok',rows:[{key:'bad',rpm:-1}]}))),{state:'invalid-endpoints',rows:[]});

assert.equal(engine.includes('/gateway-endpoint-rpm'), false);
assert.equal(engine.includes('setInterval('), false);
assert.equal(engine.includes('setTimeout('), false);
assert.equal(capture.includes('lifetimeSpendUsd'), false);
assert.equal(capture.includes('accountAgeDays'), false);
assert.equal(diag.includes('endpoint path'), false);
assert.equal(diag.includes('org id'), false);

console.log('P72 Credits endpoint RPM limits: OK · selected-org limits reuse · exact key/rpm · zero Unlimited · malformed/duplicate fail-closed · no new endpoint/timer/persistence/credential owner');