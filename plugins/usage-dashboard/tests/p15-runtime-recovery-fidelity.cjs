const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const analytics = fs.readFileSync(`${root}/src/16-usage-analytics.part.js`, 'utf8');
const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');

assert.ok(core.includes("const VERSION = '3.0.0-alpha.5.54';"));
assert.ok(source.includes('//@version 3.0.0-alpha.5.54'));
assert.ok(manager.includes("const PRODUCT_VERSION = '3.0.0-alpha.5.54';"));
assert.equal(manifest.productVersion, '3.0.0-alpha.5.54');
assert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.54');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.8');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.equal(manifest.components.bridgeManager.productVersion, '3.0.0-alpha.5.54');

// The recovery contract must remain intact across later releases. Keep the
// verified cache/parser semantics while allowing newer engine telemetry.
assert.ok(engine.includes("const VERSION = '1.6.8';"));
assert.ok(diagnostics.includes('parser provider-usage-v3'));
assert.ok(diagnostics.includes('unknown stays unknown'));
assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));

assert.ok(core.includes("active:{persist:null,render:null,runtime:null}"));
assert.ok(analytics.includes('function localRuntimeErrorKind(stage)'));
assert.ok(analytics.includes('function localRuntimeActiveCount()'));
assert.ok(analytics.includes('function noteLocalRuntimeRecovery(stage)'));
assert.ok(analytics.includes('noteLocalRuntimeRecovery(stage); return true;'));
assert.ok(diagnostics.includes('active local errors ${activeLocalErrors}'));
assert.ok(!diagnostics.includes('localRuntimeErrors.count || 0) > 0'));
assert.ok(diagnostics.includes('local recoveries ${Number(localRuntimeErrors.recoveredCount || 0)}'));
assert.ok(diagnostics.includes('Local runtime errors: total ${Number(localRuntimeErrors.count || 0)} · active ${localRuntimeActiveCount()} · recoveries'));

// Exercise the active/recovered bookkeeping directly from the shipped module.
const recoveryStart = analytics.indexOf('  function localRuntimeErrorKind(stage) {');
const recoveryEnd = analytics.indexOf('\n  async function persistRefreshState(stage) {', recoveryStart);
assert.ok(recoveryStart >= 0 && recoveryEnd > recoveryStart, 'runtime recovery helper block must be extractable');
const recoveryBlock = analytics.slice(recoveryStart, recoveryEnd);
const recoveryContext = {
  localRuntimeErrors: {
    count:0,persistFailures:0,renderFailures:0,recoveredCount:0,
    lastStage:'',lastMessage:'',lastAt:null,lastRecoveryStage:'',lastRecoveryAt:null,
    active:{persist:null,render:null,runtime:null},
  },
  console:{log(){}},
};
vm.createContext(recoveryContext);
vm.runInContext(`${recoveryBlock}\nthis.noteLocalRuntimeError = noteLocalRuntimeError; this.noteLocalRuntimeRecovery = noteLocalRuntimeRecovery; this.localRuntimeActiveCount = localRuntimeActiveCount;`, recoveryContext);

recoveryContext.noteLocalRuntimeError('refresh-error-persist', new Error('network down'));
assert.equal(recoveryContext.localRuntimeErrors.count, 1);
assert.equal(recoveryContext.localRuntimeErrors.persistFailures, 1);
assert.equal(recoveryContext.localRuntimeActiveCount(), 1);
assert.equal(recoveryContext.localRuntimeErrors.active.persist.failures, 1);
const persistSince = recoveryContext.localRuntimeErrors.active.persist.since;

recoveryContext.noteLocalRuntimeError('refresh-error-persist', new Error('network still down'));
assert.equal(recoveryContext.localRuntimeErrors.count, 2);
assert.equal(recoveryContext.localRuntimeActiveCount(), 1, 'repeated persist failures are one active category');
assert.equal(recoveryContext.localRuntimeErrors.active.persist.failures, 2);
assert.equal(recoveryContext.localRuntimeErrors.active.persist.since, persistSince, 'active incident start time must be preserved');

recoveryContext.noteLocalRuntimeError('refresh-error-render', new Error('render fail'));
assert.equal(recoveryContext.localRuntimeErrors.renderFailures, 1);
assert.equal(recoveryContext.localRuntimeActiveCount(), 2);
assert.equal(recoveryContext.noteLocalRuntimeRecovery('refresh-success-persist'), true);
assert.equal(recoveryContext.localRuntimeActiveCount(), 1, 'persist recovery must not clear render errors');
assert.equal(recoveryContext.localRuntimeErrors.count, 3, 'recovery must not erase cumulative history');
assert.equal(recoveryContext.localRuntimeErrors.recoveredCount, 1);
assert.equal(recoveryContext.noteLocalRuntimeRecovery('refresh-success-persist'), false, 'duplicate recovery must not increment history');
assert.equal(recoveryContext.localRuntimeErrors.recoveredCount, 1);
assert.equal(recoveryContext.noteLocalRuntimeRecovery('refresh-success-render'), true);
assert.equal(recoveryContext.localRuntimeActiveCount(), 0);
assert.equal(recoveryContext.localRuntimeErrors.recoveredCount, 2);
assert.equal(recoveryContext.localRuntimeErrors.count, 3);

// Stable readiness must reflect current active state, not cumulative history.
const readyStart = diagnostics.indexOf('  function stableReadinessSnapshot(bridgeDiag, runtimeBridge) {');
const readyEnd = diagnostics.indexOf('\n  function cacheObserverDiagnosticText', readyStart);
assert.ok(readyStart >= 0 && readyEnd > readyStart, 'stable readiness function must be extractable');
const readyBlock = diagnostics.slice(readyStart, readyEnd);
const readyContext = {
  VERSION:'3.0.0-alpha.5.54',
  REQUIRED_BRIDGE_VERSION:'1.6.8',
  state:{
    bridgeManagerRuntime:{productVersion:'3.0.0-alpha.5.54'},
    bridgeManagerSyncedProductVersion:'3.0.0-alpha.5.54',
    consecutiveFailures:0,
  },
  localRuntimeErrors:{count:7},
  activeLocalCount:0,
  lifecycle:'live',
};
readyContext.localRuntimeActiveCount = () => readyContext.activeLocalCount;
readyContext.bridgeLifecycleMode = () => readyContext.lifecycle;
vm.createContext(readyContext);
vm.runInContext(`${readyBlock}\nthis.stableReadinessSnapshot = stableReadinessSnapshot;`, readyContext);
const bridgeDiag = {compatible:true,version:'1.6.8'};
const runtimeBridge = {managerInstalled:true,managerVersion:'1.2.6'};
assert.equal(readyContext.stableReadinessSnapshot(bridgeDiag, runtimeBridge).ready, true, 'recovered cumulative history alone must not block readiness');
readyContext.activeLocalCount = 1;
let result = readyContext.stableReadinessSnapshot(bridgeDiag, runtimeBridge);
assert.equal(result.ready, false);
assert.ok(result.blockers.includes('active local errors 1'));
readyContext.activeLocalCount = 0;
readyContext.state.consecutiveFailures = 1;
result = readyContext.stableReadinessSnapshot(bridgeDiag, runtimeBridge);
assert.equal(result.ready, false, 'existing refresh failure blocker must remain intact');
assert.ok(result.blockers.includes('refresh failures 1'));

assert.ok(guidelines.includes('Runtime Recovery Fidelity'));
assert.ok(guidelines.includes('cumulative local persist history remained visible while `active 0` allowed `READY`'));

console.log('usage-dashboard P15 runtime recovery fidelity: OK · active errors block, recovered history stays visible');
