'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const src = `${root}/src`;
const workspacePath = `${src}/62-diagnostics-workspace.part.js`;
const retiredAuditPath = [src, '64-runtime-weight-audit.part.js'].join('/');
const release = assertCurrentReleaseArtifacts();

if (release.productVersion !== '3.0.0-alpha.5.78') {
  console.log(`P42 Runtime Weight Audit Patch-Layer Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.78`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);
const engineSha = crypto.createHash('sha256').update(fs.readFileSync(`${root}/runtime/bridge-engine.mjs`)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P42 Engine must remain byte-identical to 5.77');

const workspace = fs.readFileSync(workspacePath, 'utf8');
const latest = fs.readFileSync(`${root}/latest.js`, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);
assert.equal(fs.existsSync(retiredAuditPath), false, 'P42 module 64 file must be deleted');
assert.equal(partFiles.includes('64-runtime-weight-audit.part.js'), false, 'P42 module 64 must be absent from PARTS');
assert.equal(PARTS.length, 24, 'P42 5.78 plugin module count must be exactly 24');
assert.ok(partFiles.indexOf('62-diagnostics-workspace.part.js') < partFiles.indexOf('70-widget-render.part.js'), 'P42 module boundary must be 62 -> 70');

for (const marker of [
  'const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;',
  'function runtimeWeightAuditKnown(value)',
  'function runtimeWeightAuditMs(value)',
  'function runtimeWeightAuditTimers()',
  'function runtimeWeightAuditModel()',
  'function runtimeWeightAuditValue(value)',
  'function runtimeWeightAuditLines(model = runtimeWeightAuditModel())',
  'network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
  "title:'Runtime Weight Audit'",
  'lines:runtimeWeightAuditLines()',
]) assert.ok(workspace.includes(marker), `P42 direct audit owner marker missing: ${marker}`);

assert.doesNotMatch(workspace, /diagnosticsRuntimeWeightLegacyDetailedSections/, 'P42 legacy module-64 wrapper symbol must be absent');
assert.equal((workspace.match(/diagnosticsWorkspaceDetailedSections\s*=\s*function/g) || []).length, 0, 'P42 Detailed owner must not be reassigned');
const detailed = workspace.match(/function diagnosticsWorkspaceDetailedSections\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceDetailedHtml/);
assert.ok(detailed, 'P42 must find direct Detailed owner');
assert.equal((detailed[1].match(/Runtime Weight Audit/g) || []).length, 1, 'P42 Detailed must append Runtime Weight Audit exactly once');
assert.match(detailed[1], /runtimeWeightAuditLines\(\)/);

const auditStart = workspace.indexOf('  const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;');
const auditEnd = workspace.indexOf('  function diagnosticsWorkspaceDetailedSections()', auditStart);
assert.ok(auditStart >= 0 && auditEnd > auditStart, 'P42 must find bounded audit helper slice');
const audit = workspace.slice(auditStart, auditEnd);
for (const forbidden of [
  'nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(',
  'store.setItem(', 'scheduleRefresh(', 'schedulePanelRender(', 'renderSettings(', 'renderSettingsPartial(',
]) assert.ok(!audit.includes(forbidden), `P42 audit helper slice must have zero side effects: ${forbidden}`);
assert.doesNotMatch(audit, /\bstate\.[A-Za-z0-9_]+\s*=(?!=)/, 'P42 audit must not mutate persistent state');
assert.doesNotMatch(audit, /\bperformanceRuntime\.[A-Za-z0-9_]+\s*=(?!=)/, 'P42 audit must not mutate performance counters');
assert.doesNotMatch(audit, /\bpowerRuntime\.[A-Za-z0-9_]+\s*=(?!=)/, 'P42 audit must not mutate power counters');

const basicFunction = workspace.match(/function diagnosticsWorkspaceBasicModel\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceBasicText/);
assert.ok(basicFunction);
assert.equal(basicFunction[1].includes('diagText('), false, 'P42 Basic must remain independent of full diagText()');
assert.equal(basicFunction[1].includes('runtimeWeightAudit'), false, 'P42 Basic must remain independent of Runtime Weight Audit');
assert.match(workspace, /for \(const line of diagText\(\)\.split\('\\n'\)\)/, 'P42 Detailed must remain lazy over current diagText()');
assert.match(workspace, /id="copy-diag"/, 'P42 Full Diagnostics Copy must remain present');
assert.match(latest, /Runtime Weight Audit/, 'P42 built plugin must retain Runtime Weight Audit');
assert.equal((latest.match(/Runtime Weight Audit: measurement-only/g) || []).length, 1, 'P42 built audit line must exist exactly once');
assert.doesNotMatch(latest, /diagnosticsRuntimeWeightLegacyDetailedSections/, 'P42 built plugin must not contain retired wrapper');

for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
]) {
  const output = execFileSync(process.execPath, [`${root}/tests/${name}`], {encoding:'utf8'});
  assert.match(output, /OK/, `P42 requires ${name} GREEN`);
}

const suite = discoverTests();
for (const name of [
  'p36-diagnostics-instant-mode-switch.cjs',
  'p37-runtime-weight-lifecycle-audit.cjs',
  'p38-diagnostics-mode-handler-ownership.cjs',
  'p42-runtime-weight-audit-patch-layer-consolidation.cjs',
]) assert.ok(suite.regressions.includes(name), `P42 registry missing ${name}`);

console.log('P42 Runtime Weight Audit Patch-Layer Consolidation: OK · module 62 direct owner · module 64 deleted · 24 parts · audit semantics/UNKNOWN preserved · P36/P37/P38 GREEN · Engine byte-identical');
