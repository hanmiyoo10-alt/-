'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');

const release = assertCurrentReleaseArtifacts();
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const capture = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs', 'utf8');
const provenance = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/55-request-provenance.part.mjs', 'utf8');
const cliRuntime = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/30-cli-runtime.part.mjs', 'utf8');
const engineSources = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs', 'utf8');
const engineCore = fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/00-core.part.mjs', 'utf8');
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const pluginProvenance = fs.readFileSync('plugins/usage-dashboard/src/15-request-provenance.part.js', 'utf8');
const legacyPluginAnalyticsPath = 'plugins/usage-dashboard/src/18-request-provenance-analytics.part.js';
const pluginAnalyticsPath = fs.existsSync(legacyPluginAnalyticsPath)
  ? legacyPluginAnalyticsPath
  : 'plugins/usage-dashboard/src/16-usage-analytics.part.js';
const pluginAnalytics = fs.readFileSync(pluginAnalyticsPath, 'utf8');
const pluginDiagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const ledger = fs.readFileSync('plugins/usage-dashboard/src/14-request-ledger.part.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const engineParts = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime-src/bridge-engine/parts.json', 'utf8'));
const pluginParts = fs.readFileSync('plugins/usage-dashboard/src/parts.cjs', 'utf8');

assert.ok(engineParts.parts.includes('35-request-provenance-capture.part.mjs'));
assert.ok(engineParts.parts.includes('55-request-provenance.part.mjs'));
assert.ok(pluginParts.includes("15-request-provenance.part.js"));
if (pluginAnalyticsPath === legacyPluginAnalyticsPath) {
  assert.ok(pluginParts.includes("18-request-provenance-analytics.part.js"));
} else {
  assert.ok(pluginParts.includes("16-usage-analytics.part.js"));
  assert.ok(!pluginParts.includes("18-request-provenance-analytics.part.js"));
}
assert.ok(pluginParts.includes("40-diagnostics.part.js"));
assert.ok(!pluginParts.includes("42-request-provenance-diagnostics.part.js"));

assert.ok(capture.includes("next.searchParams.delete('projectId')"), 'normal /logs candidate must be account-wide');
assert.ok(capture.includes('return [...new Map([...accountWide, ...projectScoped]'), 'account-wide candidates must precede DevPass project fallback');
assert.ok(capture.includes("'account-wide-fetch'"));
assert.ok(capture.includes("'project-fallback-fetch'"));
assert.ok(capture.includes("'account-wide-node-request'"));
assert.ok(capture.includes("'project-fallback-node-request'"));
assert.ok(capture.includes('let ensureCaptureTapRequestProvenanceInFlight = null;'), 'capture tap patching must own a single-flight guard');
assert.ok(capture.includes('if (ensureCaptureTapRequestProvenanceInFlight) return ensureCaptureTapRequestProvenanceInFlight;'), 'parallel capture launches must join one tap patch operation');
assert.ok(capture.includes("requestProjectId: requestProject.value === null ? '' : String(requestProject.value)"));
assert.ok(capture.includes("requestOrganizationId: requestOrganization.value === null ? '' : String(requestOrganization.value)"));
assert.ok(capture.includes("requestUsedMode: requestUsedMode.value === null ? '' : String(requestUsedMode.value)"));
assert.ok(cliRuntime.includes("u.searchParams.set('limit', '100')"));
assert.ok(cliRuntime.includes('safe.slice(0, 100)'));
assert.equal((cliRuntime.match(/pathname = \(prefix \+ '\/logs'\)/g) || []).length, 1, 'provenance must reuse the single /logs capture path');
assert.ok(cliRuntime.includes('Prompt/response bodies,'));
assert.ok(cliRuntime.includes('messages, custom headers, cookies, and auth material are never persisted.'));
assert.ok(engineSources.includes('try { await fs.unlink(captureFile); } catch {}'), 'ephemeral account capture file must be removed in finally');
assert.ok(engineSources.includes("return cached('accountCapture'"), 'provenance must reuse the existing accountCapture TTL/circuit family');

const classifierStart = provenance.indexOf('function classifyRequestAccountScope');
const classifierEnd = provenance.indexOf('\n\nfunction classifiedAccountRecentRequests', classifierStart);
assert.ok(classifierStart >= 0 && classifierEnd > classifierStart);
const classifier = provenance.slice(classifierStart, classifierEnd);
assert.ok(classifier.indexOf('if (devPassProject)') < classifier.indexOf('if (creditsBilling)'), 'DevPass project exact match must have first authority');
assert.ok(classifier.includes("requestUsedMode === 'credits'"), 'Credits requires explicit usedMode=credits');
assert.ok(classifier.includes("requestAccountScope:'devpass'"));
assert.ok(classifier.includes("requestScopeFidelity:'explicit-project'"));
assert.ok(classifier.includes("requestAccountScope:'credits'"));
assert.ok(classifier.includes("requestScopeFidelity:'explicit-org-billing'"));
assert.ok(classifier.includes("requestAccountScope:'unknown'"));
assert.ok(classifier.includes("requestScopeFidelity:'unknown'"));
for (const forbidden of ['model','provider','cost','token','duration','serviceTier','service-tier','price']) {
  assert.ok(!classifier.toLowerCase().includes(forbidden.toLowerCase()), `scope classifier must not infer from ${forbidden}`);
}
assert.ok(!classifier.includes("'api-keys'"), 'api-keys must not have a positive Credits rule');
assert.ok(provenance.includes('modelInference:0'));
assert.ok(provenance.includes("capturedLogs?.rows) ? capturedLogs.rows.slice(0, 100) : []"), 'raw account-wide rows must stay bounded to 100 before request-id matching');
assert.ok(provenance.includes("normalizedRows = normalizeCapturedRecentLogs(capturedLogs).slice(0, 100)"), 'normalized account-wide rows must stay bounded to 100');

for (const publicPluginSource of [pluginProvenance, pluginAnalytics, pluginDiagnostics]) {
  assert.ok(!/requestProjectId|requestOrganizationId|project_id|organization_id/.test(publicPluginSource), 'raw project/org identity must never enter plugin code');
}
assert.ok(pluginProvenance.includes("requestAccountScope:'unknown'" ) || pluginProvenance.includes("return ['devpass','credits','unknown'].includes"));
assert.ok(pluginProvenance.includes("text === 'explicit-project'"));
assert.ok(pluginProvenance.includes("text === 'explicit-org-billing'"));
assert.ok(pluginProvenance.includes("requestAccountScopeValue(row?.requestAccountScope) === key"), 'DevPass/Credits ledger filters must use provenance, not stale scope membership');
assert.ok(pluginAnalytics.includes('normalizeRequestProvenanceMetadata'));
assert.ok(pluginDiagnostics.includes('Account request capture: ${diagRequestProvenanceMode} · rows ${diagRequestProvenanceRows} · fallback'));
assert.ok(pluginDiagnostics.includes('Request account scope fidelity: DevPass'));
assert.ok(pluginDiagnostics.includes('Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0'));

const keyStart = ledger.indexOf('function requestLedgerKey(row)');
const keyEnd = ledger.indexOf('function collectRecentRequestLedger', keyStart);
const requestKey = ledger.slice(keyStart, keyEnd);
assert.ok(!requestKey.includes('requestAccountScope'));
assert.ok(!requestKey.includes('requestScopeFidelity'));
assert.ok(!requestKey.includes('projectId'));
assert.ok(!requestKey.includes('organizationId'));
assert.ok(ledger.includes('const current = byKey.get(key) || null;'), 'same request identity must enrich rather than duplicate');

assert.ok(engine.includes(`const VERSION = '${release.engineVersion}';`));
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2,/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.ok(engine.includes("accountCapture: 30_000"));
assert.ok(engine.includes("'activity:24h': 60_000"));
assert.ok(engine.includes('creditsEarlyStart'));
assert.ok(engineCore.includes('const CLI_CONCURRENCY = Math.max(1, Math.min(2'));

assert.ok(manager.includes(`const MANAGER_VERSION = '${release.managerVersion}';`));
assert.ok(manager.includes(`const PRODUCT_VERSION = '${release.productVersion}';`));
assert.ok(manager.includes(`const BUNDLED_ENGINE_VERSION = '${release.engineVersion}';`));

console.log(`usage-dashboard P35 Cross-Scope Request Provenance: OK · ${release.productVersion} keeps project authority first, Credits org+usedMode, UNKNOWN, bounded account capture, and raw-ID privacy`);
