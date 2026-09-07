'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const TARGET = '3.0.0-alpha.5.104';
const BASE = '3.0.0-alpha.5.103';
const BASE_RELEASE_SHA = '7fc4e31ab28d726cc355915a57f0be566dab2b25';
const BASE_ENGINE_SHA = '085273bd748b852de35cbcc7e00241f349ab0cb6ac38dd62c6c5354ad2f56fea';
const SPEC = '.github/usage-dashboard/releases/5.104.json';
const MATERIALIZER = 'plugins/usage-dashboard/tools/release_gateway_limits_utilization_5104.py';
const DASH = 'plugins/usage-dashboard/src/50-dashboard-context.part.js';
const MARKUP = 'plugins/usage-dashboard/src/54-dashboard-markup.part.js';
const ENGINE = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';

function sha256(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

const spec = JSON.parse(fs.readFileSync(SPEC, 'utf8'));
assert.equal(spec.productVersion, TARGET);
assert.equal(spec.releaseTitle, 'Gateway Limits Utilization Visualization');
assert.equal(spec.engineVersion, '1.6.38');
assert.equal(spec.managerVersion, '1.3.6');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, MATERIALIZER);
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p70-gateway-limits-utilization-visualization.cjs');
assert.equal(spec.authority?.featureIssue, 1859);
assert.equal(spec.authority?.designPullRequest, 1860);
assert.equal(spec.authority?.releaseGeneration, 'E13');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = spec.releaseEvidence?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1829);
  assert.equal(row?.commentId, 5570738555);
}

const design = fs.readFileSync('docs/USAGE_DASHBOARD_5104_GATEWAY_LIMITS_UTILIZATION_DESIGN.md', 'utf8');
for (const marker of [
  'clamp(used / cap, 0, 1)',
  'clamp(remaining / cap, 0, 1)',
  'missing/invalid/cap<=0 never becomes synthetic 0%',
  'server UTC-day spend cap utilization',
  'zero** new upstream endpoints',
  'Engine `1.6.38` **exact-byte unchanged**',
]) assert.ok(design.includes(marker), `P70 design marker missing: ${marker}`);

const materializer = fs.readFileSync(MATERIALIZER, 'utf8');
for (const marker of [
  "BASE_PRODUCT = '3.0.0-alpha.5.103'",
  "TARGET_PRODUCT = '3.0.0-alpha.5.104'",
  "ENGINE_VER = '1.6.38'",
  `BASE_RELEASE_SHA = '${BASE_RELEASE_SHA}'`,
  `BASE_ENGINE_SHA = '${BASE_ENGINE_SHA}'`,
  'function gatewayLimitsUtilizationPercent(value, cap)',
  'function gatewayLimitsUtilizationBarHtml(metric, mode, label)',
  'role="progressbar"',
  "gatewayLimitsUtilizationBarHtml(truth?.daily,'used','일간 spend 사용률 · UTC')",
  "gatewayLimitsUtilizationBarHtml(truth?.monthly,'used','월간 spend 사용률')",
  "gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')",
  'MATERIALIZER_IDEMPOTENT:',
]) assert.ok(materializer.includes(marker), `P70 materializer marker missing: ${marker}`);
assert.equal(materializer.includes("build_bridge_engine.cjs'), '--write'"), false, '5.104 must not rebuild/write Engine');
assert.equal(materializer.includes('rep(ENGINE,'), false, '5.104 must not patch Engine artifact');
assert.equal(materializer.includes('runtime-src/bridge-engine'), false, '5.104 must not patch Engine source');

const release = loadCurrentRelease();
if (release.productVersion !== TARGET) {
  console.log(`P70 Gateway Limits utilization visualization: SKIP · candidate ${release.productVersion} is not ${TARGET}`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.38');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
assert.equal(sha256(ENGINE), BASE_ENGINE_SHA, 'P70 Engine 1.6.38 must remain exact-byte unchanged');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = release.evidenceView?.[role];
  assert.equal(row?.productVersion, BASE);
  assert.equal(row?.releaseSha, BASE_RELEASE_SHA);
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1829);
  assert.equal(row?.commentId, 5570738555);
}

const dashboard = fs.readFileSync(DASH, 'utf8');
for (const marker of [
  'function gatewayLimitsMetricText(metric)',
  'function gatewayLimitsUtilizationPercent(value, cap)',
  'function gatewayLimitsUtilizationBarHtml(metric, mode, label)',
  'Gateway Limits · Credits',
  '일간 spend · UTC',
  '월간 spend',
  "gatewayLimitsUtilizationBarHtml(truth?.daily,'used','일간 spend 사용률 · UTC')",
  "gatewayLimitsUtilizationBarHtml(truth?.monthly,'used','월간 spend 사용률')",
  "gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')",
]) assert.ok(dashboard.includes(marker), `P70 dashboard marker missing: ${marker}`);
assert.equal(dashboard.includes('일간 spend · KST'), false, 'P70 daily cap must stay UTC-labelled');

const helperStart = dashboard.indexOf('  function gatewayLimitsUtilizationPercent(value, cap)');
const helperEnd = dashboard.indexOf('  function gatewayLimitsSectionHtml(truth)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P70 utilization helper boundary missing');
const helperSource = dashboard.slice(helperStart, helperEnd);
for (const forbidden of ['warning','critical','approaching','safe']) {
  assert.equal(helperSource.toLowerCase().includes(forbidden), false, `P70 threshold semantic forbidden: ${forbidden}`);
}
assert.equal(helperSource.includes('Math.max('), true, 'P70 ratio must clamp lower bound');
assert.equal(helperSource.includes('Math.min(100'), true, 'P70 ratio must clamp upper bound');
assert.equal(helperSource.includes('min-width'), false, 'P70 must not fabricate minimum visible fill');

const sandbox = {esc:(value)=>String(value)};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.percent=gatewayLimitsUtilizationPercent;this.bar=gatewayLimitsUtilizationBarHtml;`, sandbox);
const percent = sandbox.percent;
const bar = sandbox.bar;
assert.equal(percent(25,100), 25);
assert.equal(percent(0,100), 0);
assert.equal(percent(200,100), 100);
assert.equal(percent(-1,100), null);
assert.equal(percent(null,100), null);
assert.equal(percent(1,0), null);
assert.equal(percent(1,-1), null);
assert.equal(percent(1,Infinity), null);

const tinyPercent = percent(0.02,5000);
assert.ok(tinyPercent > 0 && tinyPercent < 0.001, 'P70 tiny non-zero ratio must remain tiny and non-zero');
const tinyPercentText = String(tinyPercent);
const tiny = bar({state:'value',used:0.02,cap:5000,remaining:4999.98}, 'used', 'daily used');
assert.ok(tiny.includes('role="progressbar"'));
assert.ok(tiny.includes('aria-valuemin="0"'));
assert.ok(tiny.includes('aria-valuemax="100"'));
assert.ok(tiny.includes(`aria-valuenow="${tinyPercentText}"`));
assert.ok(tiny.includes(`style="width:${tinyPercentText}%"`), 'P70 tiny non-zero ratio must use the exact helper geometry without a fabricated minimum width');
const monthly = bar({state:'value',used:11.49,cap:50000,remaining:49988.51}, 'used', 'monthly used');
assert.ok(monthly.includes(`aria-valuenow="${String((11.49/50000)*100)}"`));
const topUp = bar({state:'value',used:25,cap:100,remaining:75}, 'remaining', 'top-up remaining');
assert.ok(topUp.includes('aria-valuenow="75"'));
assert.ok(topUp.includes('style="width:75%"'));
assert.equal(bar({state:'not-applicable',used:0,cap:100,remaining:100}, 'used', 'n/a'), '');
assert.equal(bar({state:'unknown',used:0,cap:100,remaining:100}, 'used', 'unknown'), '');
assert.equal(bar({state:'value',used:0,cap:0,remaining:0}, 'used', 'zero cap'), '');
assert.equal(bar({state:'value',remaining:null,cap:100}, 'remaining', 'missing remaining'), '');

const markup = fs.readFileSync(MARKUP, 'utf8');
assert.ok(markup.includes('.bar{height:5px'), 'P70 must reuse existing bar primitive');
assert.ok(markup.includes('.bar i{display:block;height:100%;background:var(--g)}'));
assert.equal(markup.includes('.gateway-limits-warning'), false);
assert.equal(markup.includes('.gateway-limits-critical'), false);

const bridgeIo = fs.readFileSync('plugins/usage-dashboard/src/20-bridge-io.part.js', 'utf8');
const refresh = fs.readFileSync('plugins/usage-dashboard/src/30-refresh-runtime.part.js', 'utf8');
const engineSource = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
assert.equal(refresh.includes('gatewayLimitsUtilization'), false, 'P70 visualization must not enter recurring refresh path');
assert.equal(bridgeIo.includes('gatewayLimitsUtilization'), false, 'P70 visualization must not add an I/O owner');
assert.equal(engineSource.includes('gatewayLimitsUtilization'), false, 'P70 visualization must stay out of Engine source');

const p69 = fs.readFileSync('plugins/usage-dashboard/tests/p69-credits-gateway-limits-headroom.cjs', 'utf8');
for (const marker of [
  "url.pathname === '/gateway-limits'",
  'GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000',
  'Gateway Limits · Credits',
  '일간 spend · UTC',
]) assert.ok(p69.includes(marker), `P70 requires surviving P69 contract marker: ${marker}`);

console.log('P70 Gateway Limits utilization visualization: PASS');
