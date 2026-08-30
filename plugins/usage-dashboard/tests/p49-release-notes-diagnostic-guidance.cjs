// P49 In-Plugin Release Notes & Diagnostic Guidance
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');
const {PARTS} = require('../src/parts.cjs');
const {assertReleaseSpec} = require('../tools/release_spec_contract_e19.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const release = assertCurrentReleaseArtifacts();
const core = fs.readFileSync(`${src}/00-runtime-core.part.js`, 'utf8');
const context = fs.readFileSync(`${src}/50-dashboard-context.part.js`, 'utf8');
const markup = fs.readFileSync(`${src}/54-dashboard-markup.part.js`, 'utf8');
const settings = fs.readFileSync(`${src}/60-settings-runtime.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const sourceManifest = JSON.parse(fs.readFileSync(`${src}/manifest.json`, 'utf8'));
const spec = assertReleaseSpec(JSON.parse(fs.readFileSync(release.specPath, 'utf8')), release.specPath);

assert.equal(spec.productVersion, release.productVersion);
assert.equal(spec.engineVersion, release.engineVersion);
assert.equal(spec.managerVersion, release.managerVersion);
assert.deepEqual(spec.contracts, {snapshot:1,recentRequest:1});
assert.equal(typeof spec.releaseTitle, 'string');
assert.ok(spec.releaseTitle.trim());

assert.ok(core.includes('const RELEASE_NOTES = Object.freeze({'), 'P49 static RELEASE_NOTES constant missing');
assert.ok(core.includes(`title: ${JSON.stringify(spec.releaseTitle)}`), 'P49 release title must be materialized from current spec');
for (const item of [...spec.highlights, ...spec.diagnosticHints]) {
  assert.ok(core.includes(JSON.stringify(item)), `P49 generated release metadata missing current spec item: ${item}`);
}

assert.ok(context.startsWith('\n  function settingsHtml() {'), 'P49 dashboard/context module marker must remain first');
assert.ok(context.includes('function releaseNotesPanelHtml()'), 'P49 release notes HTML helper missing');
assert.ok(context.includes('function releaseDiagnosticGuideText()'), 'P49 diagnostic guide text helper missing');
for (const marker of [
  '이번 업데이트',
  '다음 진단 때 확인하면 좋은 것',
  '진단 제출 가이드 복사',
  '문제/관찰 한 줄: [직접 작성]',
  '재현 행동: [직접 작성]',
  'Runtime Diagnostics > 전체 Diagnostics 복사를 함께 첨부',
  'data-release-guide="${esc(releaseDiagnosticGuideText())}"',
]) assert.ok(context.includes(marker), `P49 guidance marker missing: ${marker}`);

for (const marker of [
  '<b>Runtime & Update</b>',
  'id="release-notes-toggle"',
  'aria-expanded="false"',
  'aria-controls="release-notes-panel"',
  '${releaseNotesPanelHtml()}',
]) assert.ok(markup.includes(marker), `P49 Settings release-notes control missing: ${marker}`);

assert.ok(context.includes('id="release-notes-panel"'), 'P49 release notes panel id missing');
assert.ok(context.includes('hidden>'), 'P49 release notes panel must be closed by default');

const handlerStart = settings.indexOf("    if (q('#release-notes-toggle'))");
const handlerEnd = settings.indexOf("    if (q('#connect'))", handlerStart);
assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, 'P49 bounded release-note handler block missing');
const handlers = settings.slice(handlerStart, handlerEnd);
for (const marker of [
  "button.getAttribute('aria-expanded') === 'true'",
  "button.setAttribute('aria-expanded', expanded ? 'false' : 'true')",
  'panel.hidden = expanded',
  'navigator?.clipboard?.writeText',
  "button.getAttribute('data-release-guide')",
]) assert.ok(handlers.includes(marker), `P49 handler contract missing: ${marker}`);
assert.equal(handlers.includes('releaseDiagnosticGuideText()'), false, 'P49 handler must consume static DOM handoff rather than owning release metadata composition');

for (const forbidden of [
  'persist(', 'enqueueRefresh(', 'scheduleRefresh(', 'schedulePanelRender(', 'store.setItem(', 'store.removeItem(',
  'setTimeout(', 'setInterval(', 'nativeFetch(', 'fetchSnapshot(', 'runCli(', 'Risuai.', 'bridgeBase'
]) assert.equal(handlers.includes(forbidden), false, `P49 open/copy handler must not own ${forbidden}`);

for (const forbidden of ['accountId','organizationId','projectId','apiKey','authorization','cookie','token=']) {
  assert.equal(spec.highlights.concat(spec.diagnosticHints).join('\n').toLowerCase().includes(forbidden.toLowerCase()), false, `P49 static notes must not contain ${forbidden}`);
}

const registryFiles = PARTS.map(part => part.file);
const sourceManifestFiles = sourceManifest.parts.map(part => part.file);
assert.equal(sourceManifest.parts.length, PARTS.length, 'P49 source-manifest module count must match the canonical parts registry');
assert.deepEqual(sourceManifestFiles, registryFiles, 'P49 source-manifest module order must match the canonical parts registry');
assert.equal(sourceManifest.version, release.productVersion, 'P49 source manifest must track current product version');
assert.ok(latest.includes('id="release-notes-panel"'), 'P49 built Plugin release notes panel missing');
assert.ok(latest.includes('진단 제출 가이드 복사'), 'P49 built Plugin copy action missing');

for (const existing of ['id="copy-diag"', 'id="export-json"']) {
  assert.ok(latest.includes(existing), `P49 existing Diagnostics control must remain: ${existing}`);
}

const suite = discoverTests();
assert.ok(suite.regressions.includes('p48-exact-final-http-status.cjs'), 'P49 must retain P48 HTTP-status regression');
assert.ok(suite.regressions.includes('p49-release-notes-diagnostic-guidance.cjs'), 'P49 registry must include P49');

console.log(`P49 Release Notes & Diagnostic Guidance: OK · current spec ${release.productVersion} · canonical E19 spec shape · spec-backed static notes · DOM-only toggle · zero refresh/network/timer/persistence ownership · module registry parity ${PARTS.length}`);
