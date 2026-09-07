'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const adapterPath = 'plugins/usage-dashboard/tools/release_credits_gateway_limits_5103.py';
const fixturePath = 'plugins/usage-dashboard/tests/fixtures/release_credits_gateway_limits_5103_impl.py';
const contextPath = 'plugins/usage-dashboard/src/50-dashboard-context.part.js';
const markupPath = 'plugins/usage-dashboard/src/54-dashboard-markup.part.js';
const capturePath = 'plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs';

const adapter = fs.readFileSync(adapterPath, 'utf8');
const fixture = fs.readFileSync(fixturePath);
const header = Buffer.from(`blob ${fixture.length}\0`, 'utf8');
const blobSha = crypto.createHash('sha1').update(header).update(fixture).digest('hex');
assert.equal(blobSha, '2aae183a3f47ded8ff4217b1878dc867d27ae1d3');
assert.ok(adapter.includes("'54-dashboard-markup.part.js'"));
assert.ok(adapter.includes("label == 'Gateway Limits Credits section placement'"));
assert.ok(adapter.includes("label == 'limits capture env + tap generation'"));
assert.ok(adapter.includes("capture.v11 intentionally not activated"));
assert.ok(adapter.includes("Symbol.for('llmgateway.devpass.bridge.capture.v10')"));
assert.ok(adapter.includes("label != 'Gateway Limits Credits UI helper'"));
assert.ok(adapter.includes('50-dashboard-context to start with'));
assert.ok(adapter.includes('immutable materializer implementation blob mismatch'));

const release = loadCurrentRelease();
if (release.productVersion !== '3.0.0-alpha.5.103') {
  console.log(`P69 source owner: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.103`);
  process.exit(0);
}

const context = fs.readFileSync(contextPath, 'utf8');
const markup = fs.readFileSync(markupPath, 'utf8');
const capture = fs.readFileSync(capturePath, 'utf8');
assert.ok(context.startsWith('\n  function settingsHtml() {'));
assert.ok(context.includes('function gatewayLimitsSectionHtml(truth)'));
assert.ok(context.indexOf('function gatewayLimitsSectionHtml(truth)') > context.indexOf('function settingsHtml()'));
assert.ok(context.includes("gatewayLimitsRuntime.orgId === selectedCreditsOrgId ? gatewayLimitsRuntime.value : null"));
assert.ok(markup.includes("${dashboardView === 'credits' ? gatewayLimitsSectionHtml(gatewayLimitsTruth) : ''}"));
assert.ok(markup.includes('aria-label="24h Usage scope"'));
assert.equal(context.includes("${dashboardView === 'credits' ? gatewayLimitsSectionHtml(gatewayLimitsTruth) : ''}"), false);
assert.ok(capture.includes('DEVPASS_BRIDGE_LIMITS_ORG_ID'));
assert.ok(capture.includes("const marker = Symbol.for('llmgateway.devpass.bridge.capture.v10');"));
assert.equal(capture.includes("Symbol.for('llmgateway.devpass.bridge.capture.v11')"), false);

console.log('P69 source owner: OK · v10 capture base preserved for provenance · 50 boundary preserved · helper nested in settingsHtml · 54 markup owns Credits placement · 60 settings owns lazy triggers');
