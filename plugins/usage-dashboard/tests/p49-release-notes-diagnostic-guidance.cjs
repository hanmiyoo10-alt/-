// P49 In-Plugin Release Notes & Diagnostic Guidance
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const core = fs.readFileSync(`${src}/00-runtime-core.part.js`, 'utf8');
const context = fs.readFileSync(`${src}/50-dashboard-context.part.js`, 'utf8');
const markup = fs.readFileSync(`${src}/54-dashboard-markup.part.js`, 'utf8');
const settings = fs.readFileSync(`${src}/60-settings-runtime.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const sourceManifest = JSON.parse(fs.readFileSync(`${src}/manifest.json`, 'utf8'));
const spec = JSON.parse(fs.readFileSync('.github/usage-dashboard/releases/5.83.json', 'utf8'));
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.83') {
  console.log(`P49 Release Notes & Diagnostic Guidance: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.83`);
  process.exit(0);
}

assert.equal(spec.productVersion, '3.0.0-alpha.5.83');
assert.equal(spec.engineVersion, '1.6.24');
assert.equal(spec.managerVersion, '1.3.0');
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(typeof spec.releaseTitle, 'string');
assert.ok(spec.releaseTitle.trim());
for (const key of ['highlights','diagnosticHints']) {
  assert.ok(Array.isArray(spec[key]) && spec[key].length >= 1 && spec[key].length <= 5, `P49 ${key} count must be 1..5`);
  for (const item of spec[key]) {
    assert.equal(typeof item, 'string');
    assert.ok(item.trim(), `P49 ${key} item must be non-empty`);
    assert.ok(item.length <= 160, `P49 ${key} item must remain bounded`);
  }
}

assert.ok(core.includes('const RELEASE_NOTES = Object.freeze({'), 'P49 static RELEASE_NOTES constant missing');
assert.ok(core.includes(`title: ${JSON.stringify(spec.releaseTitle)}`), 'P49 release title must be materialized from spec');
for (const item of [...spec.highlights, ...spec.diagnosticHints]) {
  assert.ok(core.includes(JSON.stringify(item)), `P49 generated release metadata missing spec item: ${item}`);
}

assert.ok(context.includes('function releaseNotesPanelHtml()'), 'P49 release notes HTML helper missing');
assert.ok(context.includes('function releaseDiagnosticGuideText()'), 'P49 diagnostic guide text helper missing');
for (const marker of [
  '이번 업데이트',
  '다음 진단 때 확인하면 좋은 것',
  '진단 제출 가이드 복사',
  '문제/관찰 한 줄: [직접 작성]',
  '재현 행동: [직접 작성]',
  'Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부',
]) assert.ok(context.includes(marker), `P49 guidance marker missing: ${marker}`);

for (const marker of [
  '<b>Runtime & Update</b>',
  'id="release-notes-toggle"',
  'aria-expanded="false"',
  'aria-controls="release-notes-panel"',
  '${releaseNotesPanelHtml()}',
]) assert.ok(markup.includes(marker), `P49 Settings release-notes control missing: ${marker}`);

assert.ok(context.includes('id="release-notes-panel"'), 'P49 release-notes panel id missing');
assert.ok(context.includes('hidden>'), 'P49 release-notes panel must be closed by default');

const handlerStart = settings.indexOf("    if (q('#release-notes-toggle'))");
const handlerEnd = settings.indexOf("    if (q('#connect'))", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'P49 bounded release-note handler block missing');
const handlers = settings.slice(handlerStart, handlerEnd);
for (const marker of [
  "button.getAttribute('aria-expanded') === 'true'",
  "button.setAttribute('aria-expanded', expanded ? 'false' : 'true')",
  'panel.hidden = expanded',
  'navigator?.clipboard?.writeText',
  'releaseDiagnosticGuideText()',
]) assert.ok(handlers.includes(marker), `P49 handler contract missing: ${marker}`);

for (const forbidden of [
  'persist(', 'enqueueRefresh(', 'scheduleRefresh(', 'schedulePanelRender(', 'store.setItem(', 'store.removeItem(',
  'setTimeout(', 'setInterval(', 'nativeFetch(', 'fetchSnapshot(', 'runCli(', 'Risuai.', 'bridgeBase'
]) assert.equal(handlers.includes(forbidden), false, `P49 open/copy handler must not own ${forbidden}`);

for (const forbidden of ['accountId','organizationId','projectId','apiKey','authorization','cookie','token=']) {
  assert.equal(spec.highlights.concat(spec.diagnosticHints).join('\n').toLowerCase().includes(forbidden.toLowerCase()), false, `P49 static notes must not contain ${forbidden}`);
}

assert.equal(sourceManifest.parts.length, 24, 'P49 module count must remain 24');
assert.equal(sourceManifest.version, '3.0.0-alpha.5.83', 'P49 source manifest must track 5.83');
assert.ok(latest.includes('id="release-notes-panel"'), 'P49 built Plugin release notes panel missing');
assert.ok(latest.includes('진단 제출 가이드 복사'), 'P49 built Plugin copy action missing');
assert.ok(latest.includes('HTTP final status fidelity:'), 'P49 paired release must retain primary HTTP feature');

for (const existing of ['id="copy-diag"', 'id="export-json"']) {
  assert.ok(latest.includes(existing), `P49 existing Diagnostics control must remain: ${existing}`);
}

const suite = discoverTests();
assert.ok(suite.regressions.includes('p48-exact-final-http-status.cjs'), 'P49 paired release must retain P48');
assert.ok(suite.regressions.includes('p49-release-notes-diagnostic-guidance.cjs'), 'P49 registry must include P49');

console.log('P49 Release Notes & Diagnostic Guidance: OK · spec-backed static notes · DOM-only toggle · static clipboard handoff · zero refresh/network/timer/persistence ownership · module count 24');
