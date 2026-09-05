'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const vm = require('node:vm');
const {loadCurrentRelease} = require('./helpers/current-release.cjs');

const release = loadCurrentRelease();
assert.equal(release.productVersion, '3.0.0-alpha.5.99');
assert.equal(release.engineVersion, '1.6.34');
assert.equal(release.managerVersion, '1.3.6');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.99.json', 'utf8'));
assert.equal(spec.releaseTitle, 'Daily Server Usage Snapshot (Requests + Tokens)');
assert.equal(spec.managedCliVersion, '1.10.0');
assert.equal(spec.managedModelCatalogVersion, '1.280.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(spec.materializer, 'plugins/usage-dashboard/tools/release_daily_request_count_599.py');
assert.equal(spec.newRegression, 'plugins/usage-dashboard/tests/p65-daily-server-request-count-breakdown.cjs');
const evidenceView = release.evidenceView;
assert.equal(evidenceView.mode, 'structured');
for (const role of ['acceptedBaseline','latestInstalled']) {
  const row = evidenceView[role];
  assert.equal(row?.productVersion, '3.0.0-alpha.5.98');
  assert.equal(row?.releaseSha, '82c4f900cf548068d1eada957c982a5d78f1347b');
  assert.equal(row?.verdict, 'accepted');
  assert.equal(row?.issue, 1055);
  assert.equal(row?.commentId, 5550769913);
}

const analyticsSource = fs.readFileSync('plugins/usage-dashboard/src/16-usage-analytics.part.js', 'utf8');
const helperStart = analyticsSource.indexOf('  function dailyServerDateKey(value)');
const helperEnd = analyticsSource.indexOf('  function costDriverMeaningfulName(value)', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'P65 daily server helper boundary missing');
const helperSource = analyticsSource.slice(helperStart, helperEnd);
for (const marker of [
  'function dailyServerDateKey(value)',
  'function dailyServerScopeApplicability(data, scopeKey)',
  'function dailyServerMetricTruth(data, scopeKey, dateKey, applicability, metric)',
  "for (const range of ['24h','7d','30d'])",
  "dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'requestCount')",
  "dailyServerMetricTruth(data, scopeKey, dateKey, applicability, 'totalTokens')",
  'function dailyServerCompose(children)',
  'function dailyServerUsageTruth(data, now = Date.now())',
  'function dailyServerUsageDiagnosticText(truth)',
]) assert.ok(helperSource.includes(marker), `P65 helper marker missing: ${marker}`);
for (const forbidden of [
  'fetch(', 'runCli(', 'setTimeout(', 'setInterval(', 'localStorage', 'Risuai.',
  '/activity', '/logs', 'totalRequests', 'inputTokens', 'outputTokens', 'cachedTokens',
  'requestLedger', 'recentRequests', 'providers', 'models', 'cost24h',
]) assert.equal(helperSource.includes(forbidden), false, `P65 daily truth must not use inferred/backfill source: ${forbidden}`);

const sandbox = {KST_TIME_ZONE:'Asia/Seoul'};
vm.createContext(sandbox);
vm.runInContext(`${helperSource}\nthis.__daily={dailyServerDateKey,dailyServerScopeApplicability,dailyServerMetricTruth,dailyServerCompose,dailyServerUsageTruth,dailyServerUsageDiagnosticText};`, sandbox);
const daily = sandbox.__daily;
const now = Date.parse('2026-09-05T03:00:00.000Z');
assert.equal(daily.dailyServerDateKey(now), '2026-09-05');
assert.equal(daily.dailyServerDateKey('2026-09-05'), '2026-09-05');

const series = (range, buckets, granularity = 'daily') => ({dailySeries:{range,granularity,buckets}});
const baseData = {
  devpassAccount:{plan:'max'},
  creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{
    devpass:{windows:{
      '24h':series('24h',[{date:'2026-09-05',requestCount:12,totalTokens:null}]),
      '7d':series('7d',[{date:'2026-09-05',requestCount:10,totalTokens:1000}]),
      '30d':series('30d',[{date:'2026-09-05',requestCount:9,totalTokens:900}]),
    }},
    credits:{windows:{
      '24h':series('24h',[{date:'2026-09-05',requestCount:5,totalTokens:200}]),
      '7d':series('7d',[{date:'2026-09-05',requestCount:4,totalTokens:190}]),
    }},
  }},
};
const truth = daily.dailyServerUsageTruth(baseData, now);
assert.equal(truth.dateKey, '2026-09-05');
assert.equal(truth.requests.total, 17);
assert.equal(truth.requests.devpass.value, 12);
assert.equal(truth.requests.devpass.window, '24h');
assert.equal(truth.requests.credits.value, 5);
assert.equal(truth.requests.credits.window, '24h');
assert.equal(truth.tokens.total, 1200);
assert.equal(truth.tokens.devpass.value, 1000, 'token metric may fail over independently from request metric');
assert.equal(truth.tokens.devpass.window, '7d');
assert.equal(truth.tokens.credits.value, 200);
assert.equal(truth.tokens.credits.window, '24h');
const diagnostic = daily.dailyServerUsageDiagnosticText(truth);
for (const marker of ['Usage daily server truth:', 'requests total 17', 'devpass 12@24h', 'credits 5@24h', 'tokens total 1200', 'devpass 1000@7d', 'credits 200@24h', 'source server-daily', 'state ok']) {
  assert.ok(diagnostic.includes(marker), `P65 diagnostic marker missing: ${marker}`);
}

const zeroData = {
  devpassAccount:{plan:'max'}, creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{
    devpass:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:0,totalTokens:0}])}},
    credits:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:0,totalTokens:0}])}},
  }},
};
const zeroTruth = daily.dailyServerUsageTruth(zeroData, now);
assert.equal(zeroTruth.requests.total, 0, 'explicit zero requests must remain known zero');
assert.equal(zeroTruth.tokens.total, 0, 'explicit zero tokens must remain known zero');

const partialData = {
  devpassAccount:{plan:'max'}, creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{
    devpass:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:12,totalTokens:1000}])}},
    credits:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:null,totalTokens:null}])}},
  }},
};
const partial = daily.dailyServerUsageTruth(partialData, now);
assert.equal(partial.requests.devpass.value, 12, 'known child request truth must remain visible');
assert.equal(partial.requests.credits.value, null);
assert.equal(partial.requests.total, null, 'UNKNOWN applicable child must block request total');
assert.equal(partial.tokens.devpass.value, 1000, 'known child token evidence may remain diagnostic-visible');
assert.equal(partial.tokens.total, null, 'UNKNOWN applicable child must block token total');

const nonApplicable = {
  devpassAccount:{plan:'none'},
  creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{credits:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:5,totalTokens:200}])}}}},
};
const nonApplicableTruth = daily.dailyServerUsageTruth(nonApplicable, now);
assert.equal(nonApplicableTruth.requests.devpass.applicability, 'not-applicable');
assert.equal(nonApplicableTruth.requests.total, 5, 'proven non-applicable child must be excluded from request total');
assert.equal(nonApplicableTruth.tokens.total, 200, 'proven non-applicable child must be excluded from token total');

const applicabilityUnknown = {
  devpassAccount:{plan:'max'},
  analyticsScopes:{scopes:{devpass:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:12,totalTokens:1000}])}}}},
};
const unknownTruth = daily.dailyServerUsageTruth(applicabilityUnknown, now);
assert.equal(unknownTruth.requests.credits.applicability, 'unknown');
assert.equal(unknownTruth.requests.total, null, 'unknown applicability must block request total');
assert.equal(unknownTruth.tokens.total, null, 'unknown applicability must block token total');

const rollingOnly = {
  devpassAccount:{plan:'max'}, creditsOrganizationId:'org-a',
  usageScopes:{scopes:{
    devpass:{totalRequests:99,totalTokens:999},
    credits:{totalRequests:20,totalTokens:200},
  }},
};
const rollingTruth = daily.dailyServerUsageTruth(rollingOnly, now);
assert.equal(rollingTruth.requests.total, null, 'rolling request totals must never backfill the current KST day');
assert.equal(rollingTruth.tokens.total, null, 'rolling token totals must never backfill the current KST day');

const wrongDate = {
  devpassAccount:{plan:'max'}, creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{
    devpass:{windows:{'24h':series('24h',[{date:'2026-09-04',requestCount:12,totalTokens:1000}])}},
    credits:{windows:{'24h':series('24h',[{date:'2026-09-04',requestCount:5,totalTokens:200}])}},
  }},
};
assert.equal(daily.dailyServerUsageTruth(wrongDate, now).requests.total, null, 'another date bucket must fail closed');

const nonDaily = {
  devpassAccount:{plan:'max'}, creditsOrganizationId:'org-a',
  analyticsScopes:{scopes:{
    devpass:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:12,totalTokens:1000}], 'hourly')}},
    credits:{windows:{'24h':series('24h',[{date:'2026-09-05',requestCount:5,totalTokens:200}], 'hourly')}},
  }},
};
assert.equal(daily.dailyServerUsageTruth(nonDaily, now).requests.total, null, 'non-daily granularity must fail closed');

const markup = fs.readFileSync('plugins/usage-dashboard/src/54-dashboard-markup.part.js', 'utf8');
for (const marker of ['오늘 요청 · 서버 집계', 'DevPass ${dailyServerUsage.requests.devpass', 'Credits ${dailyServerUsage.requests.credits', '오늘 토큰 · 서버 집계', 'daily-server-line']) {
  assert.ok(markup.includes(marker), `P65 Overview marker missing: ${marker}`);
}
const todayStart = markup.indexOf('<div class="today-grid">');
const todayEnd = markup.indexOf('</div>\n        <p>', todayStart);
assert.ok(todayStart >= 0 && todayEnd > todayStart, 'P65 Today grid boundary missing');
const todayGrid = markup.slice(todayStart, todayEnd);
assert.equal((todayGrid.match(/<div class="mini/g) || []).length, 12, '5.99 must enrich one existing Today cell, not add a 13th cell');
const tokenMarker = '<span class="daily-server-line">오늘 토큰 · 서버 집계 ';
const tokenStart = todayGrid.indexOf(tokenMarker);
const tokenEnd = todayGrid.indexOf('</span>', tokenStart);
assert.ok(tokenStart >= 0 && tokenEnd > tokenStart, 'P65 daily server token line boundary missing');
const tokenLine = todayGrid.slice(tokenStart, tokenEnd);
assert.ok(tokenLine.includes('Number(dailyServerUsage.tokens.total).toLocaleString()'), 'token UI must preserve exact integer precision');
assert.equal(tokenLine.includes('toFixed('), false, 'daily server token UI must not abbreviate/round precision');

const dashboard = fs.readFileSync('plugins/usage-dashboard/src/50-dashboard-context.part.js', 'utf8');
assert.ok(dashboard.includes('const dailyServerUsage = dailyServerUsageTruth(d);'), 'P65 Overview must compute one shared truth object');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
assert.ok(diagnostics.includes('dailyServerUsageDiagnosticText(diagDailyServerUsage)'), 'P65 Full Diagnostics must use shared truth');
const workspace = fs.readFileSync('plugins/usage-dashboard/src/62-diagnostics-workspace.part.js', 'utf8');
assert.ok(workspace.includes('dailyServerUsageDiagnosticText(model.dailyServerUsage)'), 'P65 Basic Diagnostics must use shared truth');
assert.ok(workspace.includes('/^(Request |Service tier |DevPass account |Hourly |Usage |Recent request|Data fidelity|Data age)/'), 'Usage diagnostics must remain in existing Data Fidelity section');

const p64 = fs.readFileSync('plugins/usage-dashboard/tests/p64-managed-models-catalog-refresh-fidelity.cjs', 'utf8');
assert.ok(p64.includes("if (release.productVersion !== '3.0.0-alpha.5.98')"), 'P64 must be frozen to exact historical applicability on 5.99');
assert.ok(p64.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(release.productVersion, '3.0.0-alpha.5.98');"), 'P64 historical release lock must be explicit');
assert.ok(p64.includes("// UD_HISTORICAL_VERSION_LOCK\nassert.equal(manifest.productVersion, '3.0.0-alpha.5.98');"), 'P64 historical manifest lock must be explicit');

const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_daily_request_count_599.py', 'utf8');
for (const marker of ['MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}', 'BASE_ENGINE_SHA', 'Engine source/artifact changed during Product-only materialization', 'module17 changed despite P59 ownership boundary']) {
  assert.ok(materializer.includes(marker), `P65 materializer safety marker missing: ${marker}`);
}

const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const engineBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs');
const managerBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs');
const bootstrapBytes = fs.readFileSync('plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh');
const engineSha = crypto.createHash('sha256').update(engineBytes).digest('hex');
const managerSha = crypto.createHash('sha256').update(managerBytes).digest('hex');
const bootstrapSha = crypto.createHash('sha256').update(bootstrapBytes).digest('hex');
assert.equal(engineSha, '19386785b8756ac34bc6e88ee9d9471ea219d27a16a6ed4632a11d33a8ac6b58', '5.99 Engine 1.6.34 must remain exact-byte unchanged');
assert.equal(manifest.productVersion, '3.0.0-alpha.5.99');
assert.equal(manifest.components?.plugin?.version, '3.0.0-alpha.5.99');
assert.equal(manifest.components?.bridge?.requiredVersion, '1.6.34');
assert.equal(manifest.components?.bridge?.sha256, engineSha);
assert.equal(manifest.components?.bridgeManager?.version, '1.3.6');
assert.equal(manifest.components?.bridgeManager?.productVersion, '3.0.0-alpha.5.99');
assert.equal(manifest.components?.bridgeManager?.sha256, managerSha);
assert.equal(manifest.components?.bridgeManager?.managedCliVersion, '1.10.0');
assert.equal(manifest.components?.bridgeManager?.managedModelCatalogVersion, '1.280.0');
assert.equal(bootstrapSha, '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

console.log(`P65 Daily Server Usage Snapshot Fidelity: OK · Product 5.99 · requests total+DevPass/Credits · tokens exact total · 24h→7d→30d metric-independent · KST exact day · UNKNOWN fail-closed · Engine 1.6.34 exact-byte · Manager 1.3.6 · no new I/O/schema/identity owner`);
