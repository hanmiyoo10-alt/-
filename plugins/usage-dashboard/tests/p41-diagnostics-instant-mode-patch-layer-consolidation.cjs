'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const workspacePath = `${src}/62-diagnostics-workspace.part.js`;
const instantPath = `${src}/63-diagnostics-instant-mode.part.js`;
const historicalAuditPath = [src, '64-runtime-weight-audit.part.js'].join('/');
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.77') {
  console.log(`P41 Diagnostics Instant Mode Patch-Layer Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.77`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P41 Engine must remain byte-identical to 5.76');

const workspace = fs.readFileSync(workspacePath, 'utf8');
const audit = fs.readFileSync(historicalAuditPath, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);
assert.equal(fs.existsSync(instantPath), false, 'P41 module 63 file must be deleted');
assert.equal(partFiles.includes('63-diagnostics-instant-mode.part.js'), false, 'P41 module 63 must be absent from PARTS');
assert.equal(PARTS.length, 25, 'P41 5.77 plugin module count must be exactly 25');
assert.ok(partFiles.indexOf('62-diagnostics-workspace.part.js') < partFiles.indexOf('64-runtime-weight-audit.part.js'), 'P41 module boundary must be 62 -> 64');

for (const marker of [
  'let diagnosticsModePersistTail = Promise.resolve();',
  'function persistDiagnosticsModeSerialized(mode)',
  'function setDiagnosticsModeInstant(mode)',
  "const basic = q('#diagnostics-mode-basic');",
  "const detailed = q('#diagnostics-mode-detailed');",
  "basic.onclick = () => setDiagnosticsModeInstant('basic');",
  "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
]) assert.ok(workspace.includes(marker), `P41 direct workspace owner marker missing: ${marker}`);

const sourceFiles = fs.readdirSync(src).filter(name => name.endsWith('.part.js'));
const ownerFor = marker => sourceFiles.filter(name => fs.readFileSync(path.join(src, name), 'utf8').includes(marker));
assert.deepEqual(ownerFor("basic.onclick = () => setDiagnosticsModeInstant('basic');"), ['62-diagnostics-workspace.part.js']);
assert.deepEqual(ownerFor("detailed.onclick = () => setDiagnosticsModeInstant('detailed');"), ['62-diagnostics-workspace.part.js']);
assert.doesNotMatch(workspace, /state\.diagnosticsMode\s*=\s*next;\s*await\s+persist\(\);\s*renderSettings\(\);/s, 'P41 must not restore obsolete persistence-before-render path');
assert.match(workspace, /state\.diagnosticsMode = next;\s*renderSettingsPartial\(\);\s*void persistDiagnosticsModeSerialized\(next\);/s, 'P41 visual state/render must precede persistence scheduling');

const instantStart = workspace.indexOf('  let diagnosticsModePersistTail = Promise.resolve();');
const instantEnd = workspace.indexOf('  function diagnosticsCaptureIdentity', instantStart);
assert.ok(instantStart >= 0 && instantEnd > instantStart);
const instantSource = workspace.slice(instantStart, instantEnd);
assert.doesNotMatch(instantSource, /renderSettings\(\)|schedulePanelRender\(|nativeFetch\(|fetchSnapshot\(|enqueueRefresh\(|runCli\(|setTimeout\(|setInterval\(/, 'P41 mode switching must cause zero full-render/Bridge/network/CLI/polling/panel-scheduler work');

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'P41 Basic must remain independent of diagText()');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'P41 Detailed must stay lazy over current diagText()');
assert.match(workspace, /id="copy-diag"/, 'P41 Full Diagnostics copy must remain present');
assert.match(audit, /Runtime Weight Audit/, 'P41 historical 5.77 Runtime Weight Audit source must remain present');
assert.match(latest, /Runtime Weight Audit/, 'P41 Runtime Weight Audit must remain in built plugin');

const p36 = execFileSync(process.execPath, [`${root}/tests/p36-diagnostics-instant-mode-switch.cjs`], {encoding:'utf8'});
assert.match(p36, /P36 Diagnostics Instant Mode Switch: OK/, 'P41 requires P36 behavior regression GREEN under direct owner');
const p38 = execFileSync(process.execPath, [`${root}/tests/p38-diagnostics-mode-handler-ownership.cjs`], {encoding:'utf8'});
assert.match(p38, /P38 Diagnostics Mode Handler Ownership: OK/, 'P41 requires P38 ownership regression GREEN under direct owner');

const suite = discoverTests();
for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
  'p41-diagnostics-instant-mode-patch-layer-consolidation.cjs',
]) assert.ok(suite.regressions.includes(name), `P41 registry missing ${name}`);

console.log('P41 Diagnostics Instant Mode Patch-Layer Consolidation: OK · module 62 direct owner · module 63 deleted · 25 parts · P36/P38 behavior retained · Runtime Weight Audit retained · Engine byte-identical');
