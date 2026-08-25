'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const markup = fs.readFileSync(`${src}/54-dashboard-markup.part.js`, 'utf8');
const settings = fs.readFileSync(`${src}/60-settings-runtime.part.js`, 'utf8');
const workspace = fs.readFileSync(`${src}/62-diagnostics-workspace.part.js`, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.79') {
  console.log(`P43 Diagnostics Workspace Composition Ownership Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.79`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P43 Engine must remain byte-identical to 5.78');

const {PARTS} = require('../src/parts.cjs');
assert.equal(PARTS.length, 24, 'P43 source module count must remain exactly 24');
const partFiles = PARTS.map(part => part.file);
const ordered = [
  '50-dashboard-context.part.js',
  '52-analytics-context.part.js',
  '54-dashboard-markup.part.js',
  '60-settings-runtime.part.js',
  '62-diagnostics-workspace.part.js',
  '70-widget-render.part.js',
];
const indexes = ordered.map(name => partFiles.indexOf(name));
assert.ok(indexes.every(index => index >= 0), 'P43 required composition modules must remain registered');
assert.deepEqual(indexes, [...indexes].sort((a,b) => a-b), 'P43 module order must remain 50 -> 52 -> 54 -> 60 -> 62 -> 70');
const part62 = PARTS.find(part => part.file === '62-diagnostics-workspace.part.js');
assert.equal(part62.marker, '\n  const DIAGNOSTICS_WORKSPACE_SECTIONS = Object.freeze([', 'P43 module 62 boundary must use direct-owner symbol');

for (const retired of [
  'diagnosticsWorkspaceLegacySettingsHtml',
  'diagnosticsWorkspaceLegacyBindSettings',
]) assert.equal(workspace.includes(retired), false, `P43 retired compatibility symbol must be absent: ${retired}`);
assert.equal((workspace.match(/\bsettingsHtml\s*=\s*function\b/g) || []).length, 0, 'P43 module 62 must not reassign settingsHtml');
assert.equal((workspace.match(/\bbindSettings\s*=\s*function\b/g) || []).length, 0, 'P43 module 62 must not reassign bindSettings');
assert.doesNotMatch(latest, /diagnosticsWorkspaceLegacySettingsHtml|diagnosticsWorkspaceLegacyBindSettings|diagnosticsWorkspaceSettingsHtml|diagnosticsWorkspaceBindSettings/, 'P43 built plugin must not retain compatibility wrappers');

assert.equal(markup.includes('Runtime Diagnostics</b><span>요약 · 전체 진단'), false, 'P43 module 54 must not build the legacy Diagnostics body');
assert.equal((markup.match(/\$\{diagnosticsWorkspacePanelHtml\(\)\}/g) || []).length, 1, 'P43 native settings pipeline must compose Diagnostics exactly once');
assert.equal((latest.match(/<summary><b>Runtime Diagnostics<\/b>/g) || []).length, 1, 'P43 built plugin must own exactly one Runtime Diagnostics panel template');
assert.ok(latest.indexOf('function settingsHtml()') >= 0, 'P43 built settingsHtml owner missing');
assert.ok(latest.indexOf('function diagnosticsWorkspacePanelHtml()') > latest.indexOf('function settingsHtml()'), 'P43 locks later-declared Diagnostics panel helper topology');
assert.match(settings, /async function openSettings\(\) \{[\s\S]*?renderSettings\(\);/, 'P43 openSettings must enter the native renderSettings pipeline');
assert.match(settings, /function renderSettings\(\) \{[\s\S]*?document\.body\.innerHTML = settingsHtml\(\);/, 'P43 native renderSettings pipeline must invoke settingsHtml');

assert.equal((workspace.match(/function bindDiagnosticsWorkspaceControls\(\)/g) || []).length, 1, 'P43 module 62 must own one normal Diagnostics controls binder');
assert.equal((settings.match(/bindDiagnosticsWorkspaceControls\(\);/g) || []).length, 1, 'P43 native module-60 bindSettings must call Diagnostics binder exactly once');
assert.match(settings, /q\('#copy-diag'\).*copyDiag\(\)/s, 'P43 Full Diagnostics Copy must remain owned by module 60');
assert.match(settings, /q\('#export-json'\)/, 'P43 JSON export must remain owned by module 60');
assert.match(workspace, /id="copy-diag-summary"/, 'P43 summary copy must remain in Diagnostics workspace UI');
assert.match(workspace, /navigator\?\.clipboard\?\.writeText\) \{\s*await navigator\.clipboard\.writeText\(diagnosticsWorkspaceBasicText\(\)\)/s, 'P43 summary copy must remain Basic-summary based');

const binderStart = workspace.indexOf('  function bindDiagnosticsWorkspaceControls()');
assert.ok(binderStart >= 0, 'P43 direct Diagnostics binder slice missing');
const binder = workspace.slice(binderStart);
for (const forbidden of ['nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(', 'scheduleRefresh(', 'schedulePanelRender(']) {
  assert.equal(binder.includes(forbidden), false, `P43 direct binder must add zero Bridge/network/CLI/polling/scheduler work: ${forbidden}`);
}
assert.equal(binder.includes('store.setItem('), false, 'P43 binder must not add an extra persistence cycle; mode persistence stays in setDiagnosticsModeInstant');
assert.equal((binder.match(/setDiagnosticsModeInstant\(/g) || []).length, 2, 'P43 binder must wire only Basic and Detailed mode transitions');

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction, 'P43 Basic model boundary missing');
assert.equal(basicFunction[1].includes('diagText('), false, 'P43 Basic must remain independent of diagText()');
assert.equal(basicFunction[1].includes('runtimeWeightAudit'), false, 'P43 Basic must remain independent of Runtime Weight Audit');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'P43 Detailed must remain lazy over current diagText()');
const detailed = workspace.match(/function diagnosticsWorkspaceDetailedSections\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceDetailedHtml/);
assert.ok(detailed, 'P43 Detailed owner boundary missing');
assert.equal((detailed[1].match(/Runtime Weight Audit/g) || []).length, 1, 'P43 Detailed must contain Runtime Weight Audit exactly once');
assert.match(detailed[1], /runtimeWeightAuditLines\(\)/);
assert.match(workspace, /id="copy-diag"/, 'P43 Full Diagnostics Copy button must remain present');

assert.match(workspace, /state\.diagnosticsMode = next;\s*renderSettingsPartial\(\);\s*void persistDiagnosticsModeSerialized\(next\);/s, 'P43 mode switching must render synchronously before serialized persistence');
assert.match(settings, /Keep Local Bridge config inputs untouched so typed-but-unsaved values survive/);
assert.match(settings, /const diagnosticsCurrent = currentAdvanced\[1\]\?\.querySelector\('\.advanced-body'\)/, 'P43 partial Diagnostics patch must preserve Local Bridge draft inputs');

for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P43 requires ${name} GREEN`);
}

const suite = discoverTests();
for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
  'p43-diagnostics-workspace-composition-ownership-consolidation.cjs',
]) assert.ok(suite.regressions.includes(name), `P43 registry missing ${name}`);

console.log('P43 Diagnostics Workspace Composition Ownership Consolidation: OK · native settings composition/binding · module 62 direct workspace owner · 24 parts · P36/P37/P38 GREEN · Engine byte-identical');