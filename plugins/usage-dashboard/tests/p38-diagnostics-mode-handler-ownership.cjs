'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const workspacePath = `${src}/62-diagnostics-workspace.part.js`;
const instantPath = `${src}/63-diagnostics-instant-mode.part.js`;
const retiredAuditPath = [src, '64-runtime-weight-audit.part.js'].join('/');
const enginePath = `${root}/runtime/bridge-engine.mjs`;
const latestPath = `${root}/latest.js`;

const release = assertCurrentReleaseArtifacts();
const lineage = /^3\.0\.0-alpha\.5\.(\d+)$/.exec(release.productVersion);
assert.ok(lineage && Number(lineage[1]) >= 74, 'P38 applies to alpha.5 build 74 and later');
assert.match(release.managerVersion, /^1\.3\.\d+$/, 'P38 must accept the current 1.3.x Manager authority; exact release identity is owned by the current-release contract');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const workspace = fs.readFileSync(workspacePath, 'utf8');
const latest = fs.readFileSync(latestPath, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);
const i62 = partFiles.indexOf('62-diagnostics-workspace.part.js');
const i63 = partFiles.indexOf('63-diagnostics-instant-mode.part.js');
const i64 = partFiles.indexOf('64-runtime-weight-audit.part.js');
const i70 = partFiles.indexOf('70-widget-render.part.js');
assert.ok(i62 >= 0 && i70 > i62, 'P38 module order must retain workspace before widget rendering');
assert.equal(i63, -1, 'P38 module 63 patch layer must remain retired');
assert.equal(fs.existsSync(instantPath), false, 'P38 module 63 source file must remain absent');
if (Number(lineage[1]) >= 78) {
  assert.equal(i64, -1, 'P38 module 64 audit patch layer must remain retired from 5.78 onward');
  assert.equal(fs.existsSync(retiredAuditPath), false, 'P38 module 64 source file must remain absent from 5.78 onward');
}

assert.doesNotMatch(workspace, /const\s+setMode\s*=\s*async\b/, 'P38 module 62 must not restore the superseded async setMode closure');
assert.doesNotMatch(workspace, /state\.diagnosticsMode\s*=\s*next;\s*await\s+persist\(\);\s*renderSettings\(\);/s, 'P38 must not restore persistence-before-render');
for (const marker of [
  'let diagnosticsModePersistTail = Promise.resolve();',
  'function persistDiagnosticsModeSerialized(mode)',
  'function setDiagnosticsModeInstant(mode)',
  "const basic = q('#diagnostics-mode-basic');",
  "const detailed = q('#diagnostics-mode-detailed');",
  "basic.onclick = () => setDiagnosticsModeInstant('basic');",
  "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
  'state.diagnosticsMode = next;',
  'renderSettingsPartial();',
  'void persistDiagnosticsModeSerialized(next);',
  'diagnosticsMode:capturedMode',
]) assert.ok(workspace.includes(marker), `P38 module 62 marker missing: ${marker}`);

const sourceFiles = fs.readdirSync(src).filter(name => name.endsWith('.part.js'));
const ownerFor = marker => sourceFiles.filter(name => fs.readFileSync(path.join(src, name), 'utf8').includes(marker));
assert.deepEqual(ownerFor("basic.onclick = () => setDiagnosticsModeInstant('basic');"), ['62-diagnostics-workspace.part.js']);
assert.deepEqual(ownerFor("detailed.onclick = () => setDiagnosticsModeInstant('detailed');"), ['62-diagnostics-workspace.part.js']);

const instantStart = workspace.indexOf('  let diagnosticsModePersistTail = Promise.resolve();');
const instantEnd = workspace.indexOf('  function diagnosticsCaptureIdentity', instantStart);
assert.ok(instantStart >= 0 && instantEnd > instantStart, 'P38 must find bounded direct-owner slice');
const instantSource = workspace.slice(instantStart, instantEnd);
assert.doesNotMatch(instantSource, /renderSettings\(\)|schedulePanelRender\(|nativeFetch\(|fetchSnapshot\(|enqueueRefresh\(|runCli\(|setTimeout\(|setInterval\(/, 'P38 mode switching must stay free of full render, scheduler, Bridge/network/CLI work, and polling');

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'P38 Basic must remain independent of diagText()');
assert.equal(basicFunction[1].includes('runtimeWeightAudit'), false, 'P38 Basic must remain independent of Runtime Weight Audit');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'P38 Detailed must remain lazy over diagText()');
assert.match(workspace, /title:'Runtime Weight Audit'/, 'P38 Runtime Weight Audit must be directly owned by module 62');
assert.doesNotMatch(workspace, /diagnosticsRuntimeWeightLegacyDetailedSections/, 'P38 retired audit wrapper symbol must remain absent');
assert.match(workspace, /id="copy-diag-summary"/);
assert.match(workspace, /id="copy-diag"/);
assert.match(latest, /Runtime Weight Audit/);

const suite = discoverTests();
assert.ok(suite.regressions.includes('p36-diagnostics-instant-mode-switch.cjs'));
assert.ok(suite.regressions.includes('p37-runtime-weight-lifecycle-audit.cjs'));
assert.ok(suite.regressions.includes('p38-diagnostics-mode-handler-ownership.cjs'));

if (release.engineVersion === '1.6.22') {
  const engineSha = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
  assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P38 Engine 1.6.22 historical byte lock must remain exact');
}

console.log(`P38 Diagnostics Mode Handler Ownership: OK · module 62 sole instant/audit workspace owner · module 63 retired · P36/P37 authority retained · zero new I/O · Engine ${release.engineVersion} authority verified`);
