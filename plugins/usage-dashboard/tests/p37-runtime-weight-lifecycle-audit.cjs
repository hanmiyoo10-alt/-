'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const workspacePath = 'plugins/usage-dashboard/src/62-diagnostics-workspace.part.js';
const ledgerPath = 'plugins/usage-dashboard/src/14-request-ledger.part.js';
const refreshPath = 'plugins/usage-dashboard/src/30-refresh-runtime.part.js';
const lifecyclePath = 'plugins/usage-dashboard/src/80-lifecycle.part.js';
const bootstrapPath = 'plugins/usage-dashboard/src/90-bootstrap.part.js';
const enginePath = 'plugins/usage-dashboard/runtime/bridge-engine.mjs';

const workspace = fs.readFileSync(workspacePath, 'utf8');
const ledger = fs.readFileSync(ledgerPath, 'utf8');
const refresh = fs.readFileSync(refreshPath, 'utf8');
const lifecycle = fs.readFileSync(lifecyclePath, 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const {PARTS} = require('./../src/parts.cjs');

const partFiles = PARTS.map(part => part.file);
const workspaceIndex = partFiles.indexOf('62-diagnostics-workspace.part.js');
assert.ok(workspaceIndex >= 0, 'P37 direct Diagnostics workspace owner must remain registered');
assert.ok(workspaceIndex < partFiles.indexOf('70-widget-render.part.js'), 'P37 workspace/audit owner must remain before widget rendering');
assert.equal(partFiles.includes('64-runtime-weight-audit.part.js'), false, 'P37 retired audit patch module must stay absent');

const auditStart = workspace.indexOf('  const RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000;');
const auditEnd = workspace.indexOf('  function diagnosticsWorkspaceDetailedSections()', auditStart);
assert.ok(auditStart >= 0 && auditEnd > auditStart, 'P37 must find bounded Runtime Weight Audit helper slice in module 62');
const audit = workspace.slice(auditStart, auditEnd);

for (const marker of [
  'Runtime Weight Audit',
  'RUNTIME_WEIGHT_REQUEST_LEDGER_LIMIT = 2000',
  'network 0 · CLI 0 · polling 0 · heap bytes UNKNOWN · pruning 0',
  'Slimming decision: S0 evidence only',
  "phases?.['normalize-ledger']",
  'phases?.persist',
  "phases?.['widget-render']",
  'remoteListeners',
  'widgetRemoteListeners',
  'domListeners',
  'refreshInFlight',
  'bridgeDiag.cacheEntries',
  'secondary?.queued',
]) assert.ok(audit.includes(marker), `P37 audit marker missing: ${marker}`);

for (const forbidden of [
  'nativeFetch(', 'fetchSnapshot(', 'enqueueRefresh(', 'runCli(', 'setInterval(', 'setTimeout(',
  'store.setItem(', 'scheduleRefresh(', 'schedulePanelRender(', 'renderSettings(', 'renderSettingsPartial(',
]) assert.ok(!audit.includes(forbidden), `P37 audit helper slice must not introduce side effect/I/O: ${forbidden}`);

assert.doesNotMatch(audit, /\bstate\.[A-Za-z0-9_]+\s*=(?!=)/, 'P37 audit must not mutate persistent state');
assert.doesNotMatch(audit, /\bperformanceRuntime\.[A-Za-z0-9_]+\s*=(?!=)/, 'P37 audit must not mutate performance counters');
assert.doesNotMatch(audit, /\bpowerRuntime\.[A-Za-z0-9_]+\s*=(?!=)/, 'P37 audit must not mutate power counters');
assert.ok(!audit.includes('diagnosticsWorkspaceBasicModel ='), 'P37 Basic diagnostics must remain untouched by audit helpers');
assert.ok(!audit.includes('diagnosticsWorkspaceBasicHtml ='), 'P37 Basic diagnostics rendering must remain untouched by audit helpers');

const detailed = workspace.match(/function diagnosticsWorkspaceDetailedSections\(\) \{([\s\S]*?)\n  \}\n\n  function diagnosticsWorkspaceDetailedHtml/);
assert.ok(detailed, 'P37 direct Detailed section owner must remain bounded');
assert.match(detailed[1], /title:'Runtime Weight Audit'/, 'P37 Runtime Weight Audit must be directly appended by module 62');
assert.match(detailed[1], /runtimeWeightAuditLines\(\)/, 'P37 Detailed owner must call current audit lines lazily');
assert.doesNotMatch(workspace, /diagnosticsRuntimeWeightLegacyDetailedSections/, 'P37 legacy audit wrapper symbol must remain retired');
assert.equal((workspace.match(/diagnosticsWorkspaceDetailedSections\s*=\s*function/g) || []).length, 0, 'P37 direct Detailed owner must not be reassigned later');

assert.ok(ledger.includes('.slice(0, 2000);'), 'P37 Request Ledger bound must remain explicitly 2000');
for (const phase of ["finishRefreshPhase('normalize-ledger'", "finishRefreshPhase('persist'", "finishRefreshPhase('widget-render'"]) {
  assert.ok(refresh.includes(phase), `P37 local cost source missing: ${phase}`);
}
for (const marker of [
  "document.addEventListener('visibilitychange',vis); domListeners.push",
  "domListeners.push([document,type,interaction])",
]) assert.ok(lifecycle.includes(marker), `P37 lifecycle ownership source missing: ${marker}`);
for (const marker of ['remoteListeners.splice(0)', 'widgetRemoteListeners.length=0', 'domListeners.splice(0)']) {
  assert.ok(bootstrap.includes(marker), `P37 unload ownership cleanup missing: ${marker}`);
}

for (const marker of [
  'function setDiagnosticsModeInstant(mode)',
  'renderSettingsPartial();',
  'void persistDiagnosticsModeSerialized(next);',
  'diagnosticsMode:capturedMode',
]) assert.ok(workspace.includes(marker), `P37 must preserve instant Diagnostics switch in the direct workspace owner: ${marker}`);

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P37 Engine must remain byte-identical');

console.log('P37 Runtime Weight & Lifecycle Audit: OK · module 62 direct audit owner · Detailed-only bounded evidence · no new I/O/polling · UNKNOWN preserved · Engine byte-identical');
