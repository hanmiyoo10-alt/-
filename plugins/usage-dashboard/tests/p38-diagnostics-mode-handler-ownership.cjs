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
const auditPath = `${src}/64-runtime-weight-audit.part.js`;
const enginePath = `${root}/runtime/bridge-engine.mjs`;
const latestPath = `${root}/latest.js`;

const release = assertCurrentReleaseArtifacts();
assert.equal(release.productVersion, '3.0.0-alpha.5.74');
assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const workspace = fs.readFileSync(workspacePath, 'utf8');
const instant = fs.readFileSync(instantPath, 'utf8');
const audit = fs.readFileSync(auditPath, 'utf8');
const latest = fs.readFileSync(latestPath, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);
const i62 = partFiles.indexOf('62-diagnostics-workspace.part.js');
const i63 = partFiles.indexOf('63-diagnostics-instant-mode.part.js');
const i64 = partFiles.indexOf('64-runtime-weight-audit.part.js');
assert.ok(i62 >= 0 && i62 < i63 && i63 < i64, 'P38 module order must remain 62 -> 63 -> 64');

assert.doesNotMatch(workspace, /const\s+setMode\s*=\s*async\b/, 'P38 module 62 must not retain the superseded async setMode closure');
assert.doesNotMatch(workspace, /q\('#diagnostics-mode-(?:basic|detailed)'\)\)\s*q\('#diagnostics-mode-(?:basic|detailed)'\)\.onclick/, 'P38 module 62 must not bind Diagnostics mode onclick handlers');
assert.doesNotMatch(workspace, /state\.diagnosticsMode\s*=\s*next;\s*await\s+persist\(\);\s*renderSettings\(\);/s, 'P38 module 62 must not retain the persistence-before-render path');

for (const marker of [
  "const basic = document.querySelector('#diagnostics-mode-basic');",
  "const detailed = document.querySelector('#diagnostics-mode-detailed');",
  "basic.onclick = () => setDiagnosticsModeInstant('basic');",
  "detailed.onclick = () => setDiagnosticsModeInstant('detailed');",
  'state.diagnosticsMode = next;',
  'renderSettingsPartial();',
  'void persistDiagnosticsModeSerialized(next);',
  'diagnosticsMode:capturedMode',
]) assert.ok(instant.includes(marker), `P38 module 63 marker missing: ${marker}`);

const sourceFiles = fs.readdirSync(src).filter(name => name.endsWith('.part.js'));
const ownerFor = marker => sourceFiles.filter(name => fs.readFileSync(path.join(src, name), 'utf8').includes(marker));
assert.deepEqual(ownerFor("basic.onclick = () => setDiagnosticsModeInstant('basic');"), ['63-diagnostics-instant-mode.part.js']);
assert.deepEqual(ownerFor("detailed.onclick = () => setDiagnosticsModeInstant('detailed');"), ['63-diagnostics-instant-mode.part.js']);

assert.doesNotMatch(instant, /renderSettings\(\)|schedulePanelRender\(|nativeFetch\(|fetchSnapshot\(|enqueueRefresh\(|runCli\(|setTimeout\(|setInterval\(/, 'P38 mode switching must stay free of full render, scheduler, Bridge/network/CLI work, and polling');
const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'P38 Basic must remain independent of diagText()');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'P38 Detailed must remain lazy over diagText()');
assert.match(workspace, /id="copy-diag-summary"/);
assert.match(workspace, /id="copy-diag"/);
assert.match(audit, /Runtime Weight Audit/);
assert.match(latest, /Runtime Weight Audit/);

const suite = discoverTests();
assert.ok(suite.regressions.includes('p36-diagnostics-instant-mode-switch.cjs'), 'P38 requires P36 executable instant-switch regression to remain registered');
assert.ok(suite.regressions.includes('p37-runtime-weight-lifecycle-audit.cjs'), 'P38 requires P37 runtime-audit regression to remain registered');
assert.ok(suite.regressions.includes('p38-diagnostics-mode-handler-ownership.cjs'), 'P38 must be fail-closed registered');

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P38 Engine must remain byte-identical to 5.73');

console.log('P38 Diagnostics Mode Handler Ownership: OK · module 63 sole owner · P36 behavior authority retained · P37 audit retained · zero new I/O · Engine byte-identical');
