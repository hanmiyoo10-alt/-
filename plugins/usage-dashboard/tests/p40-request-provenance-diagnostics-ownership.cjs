'use strict';

// UD_HISTORICAL_VERSION_LOCK: 5.75 is the physically verified prior-release baseline.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const diagnosticsPath = `${root}/src/40-diagnostics.part.js`;
const wrapperPath = `${root}/src/42-request-provenance-diagnostics.part.js`;
const partsPath = `${root}/src/parts.cjs`;
const enginePath = `${root}/runtime/bridge-engine.mjs`;
const latestPath = `${root}/latest.js`;

const release = assertCurrentReleaseArtifacts();
if (release.productVersion !== '3.0.0-alpha.5.76') {
  console.log(`P40 Request Provenance Diagnostics Ownership Consolidation: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.76`);
  process.exit(0);
}

assert.equal(release.engineVersion, '1.6.22');
assert.equal(release.managerVersion, '1.3.0');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

const diagnostics = fs.readFileSync(diagnosticsPath, 'utf8');
const partsSource = fs.readFileSync(partsPath, 'utf8');
const latest = fs.readFileSync(latestPath, 'utf8');
const {PARTS} = require('../src/parts.cjs');
const partFiles = PARTS.map(part => part.file);

assert.equal(fs.existsSync(wrapperPath), false, 'P40 superseded module 42 must be deleted');
assert.equal(partFiles.includes('42-request-provenance-diagnostics.part.js'), false, 'P40 module 42 must be absent from PARTS');
assert.equal(PARTS.length, 26, 'P40 production plugin module count must be 26');
assert.doesNotMatch(partsSource, /42-request-provenance-diagnostics\.part\.js/, 'P40 PARTS source must not retain module 42');

const i40 = partFiles.indexOf('40-diagnostics.part.js');
const i50 = partFiles.indexOf('50-dashboard-context.part.js');
assert.ok(i40 >= 0 && i40 < i50, 'P40 diagnostics boundary must be 40 -> 50');

assert.equal((diagnostics.match(/function requestProvenanceDiagnosticMetadata\(\)/g) || []).length, 1, 'P40 module 40 must directly own exactly one provenance diagnostics helper');
assert.ok(diagnostics.includes("state.data?.usageScopes?.scopes?.all?.requestProvenance || null"), 'P40 normalized account-wide provenance metadata must remain preferred');
assert.ok(diagnostics.includes("requestAccountScopeStats(requestLedgerRowsForScope('all'))"), 'P40 missing normalized metadata must retain bounded ledger fallback');
assert.ok(diagnostics.includes("captureMode:'unknown'"));
assert.ok(diagnostics.includes('fallbackCount:0'));
assert.ok(diagnostics.includes('modelInference:0'));
assert.ok(diagnostics.includes("authority:'unknown'"));

assert.ok(diagnostics.includes('const diagTierFidelity = requestServiceTierStats(diagLedgerRows);'), 'P40 Service Tier diagnostics must use the selected diagnostics scope directly');
assert.ok(diagnostics.includes('const diagOutcome = requestOutcomeStats(diagLedgerRows);'), 'P40 Request Outcome diagnostics must use the selected diagnostics scope directly');
assert.ok(diagnostics.includes("['account-wide','project-fallback'].includes(String(diagRequestProvenance?.captureMode))"));
assert.ok(diagnostics.includes('Account request capture: ${diagRequestProvenanceMode} · rows ${diagRequestProvenanceRows} · fallback'));
assert.ok(diagnostics.includes('Request account scope fidelity: DevPass'));
assert.ok(diagnostics.includes('Credits ${Math.max(0, Number(diagRequestProvenance?.credits || 0))}/${diagRequestProvenanceRows}'));
assert.ok(diagnostics.includes('Unknown ${Math.max(0, Number(diagRequestProvenance?.unknown || 0))}/${diagRequestProvenanceRows}'));
assert.ok(diagnostics.includes('conflict ${Math.max(0, Number(diagRequestProvenance?.conflict || 0))}'));
assert.ok(diagnostics.includes('Scope authority: DevPass project exact · Credits organization + usedMode credits · model inference 0'));

assert.doesNotMatch(diagnostics, /diagTextBeforeRequestProvenance|diagTextWithRequestProvenance/, 'P40 diagText wrapper/reassignment path must be gone');
assert.doesNotMatch(diagnostics, /requestProjectId|requestOrganizationId|project_id|organization_id/, 'P40 raw project/org identity must not enter diagnostics source');

const helperStart = diagnostics.indexOf('function requestProvenanceDiagnosticMetadata()');
const diagStart = diagnostics.indexOf('function diagText()', helperStart);
assert.ok(helperStart >= 0 && diagStart > helperStart, 'P40 direct provenance helper must precede diagText');
const helperSlice = diagnostics.slice(helperStart, diagStart);
assert.doesNotMatch(helperSlice, /fetch\(|nativeFetch\(|fetchSnapshot\(|runCli\(|execFile|setInterval\(|setTimeout\(|scheduleRefresh\(|persist\(/, 'P40 consolidation must not add I/O, CLI, polling, scheduling, or persistence work');

for (const marker of [
  'Account request capture:',
  'Request account scope fidelity:',
  'Scope authority: DevPass project exact',
  'Service tier fidelity:',
  'Request outcome taxonomy:',
  'Runtime Weight Audit',
]) assert.ok(latest.includes(marker), `P40 built artifact marker missing: ${marker}`);

const suite = discoverTests();
assert.ok(suite.behavior.includes('behavior-request-provenance.cjs'), 'P40 requires request-provenance behavior authority');
assert.ok(suite.behavior.includes('behavior-service-tier-outcome.cjs'), 'P40 requires service-tier/outcome behavior authority');
assert.ok(suite.regressions.includes('p35-cross-scope-request-provenance.cjs'), 'P40 must retain P35 provenance/privacy authority');
assert.ok(suite.regressions.includes('p36-diagnostics-instant-mode-switch.cjs'), 'P40 must retain instant Diagnostics mode behavior');
assert.ok(suite.regressions.includes('p37-runtime-weight-lifecycle-audit.cjs'), 'P40 must retain Runtime Weight Audit');
assert.ok(suite.regressions.includes('p39-provenance-analytics-wrapper-consolidation.cjs'), 'P40 must retain P39 analytics ownership');
assert.ok(suite.regressions.includes('p40-request-provenance-diagnostics-ownership.cjs'), 'P40 must be fail-closed registered');

const engineSha = crypto.createHash('sha256').update(fs.readFileSync(enginePath)).digest('hex');
assert.equal(engineSha, '85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69', 'P40 Engine must remain byte-identical to 5.75');

console.log('P40 Request Provenance Diagnostics Ownership Consolidation: OK · module 40 direct owner · module 42 removed · 26 parts · normalized metadata preference + ledger fallback retained · scoped tier/outcome retained · no new I/O · Engine byte-identical');
