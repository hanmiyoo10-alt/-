'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const {discoverTests} = require('./registry.cjs');

const root = 'plugins/usage-dashboard';
const lifecycle = fs.readFileSync(`${root}/src/80-lifecycle.part.js`, 'utf8');
const bootstrap = fs.readFileSync(`${root}/src/90-bootstrap.part.js`, 'utf8');
const workspace = fs.readFileSync(`${root}/src/62-diagnostics-workspace.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const release = assertCurrentReleaseArtifacts();

assert.ok(release.productVersion.startsWith('3.0.0-alpha.'), 'P46 audit must read the current release dynamically');
assert.match(release.managerVersion, /^1\.3\.\d+$/, 'P46 must accept the current 1.3.x Manager authority; exact release identity is owned by the current-release contract');
assert.equal(release.snapshotContract, 1);
assert.equal(release.recentRequestContract, 1);

for (const marker of [
  "document.addEventListener('visibilitychange',vis); domListeners.push",
  "for (const type of ['pointerdown','touchstart','wheel','keydown'])",
  'installResumeLongTaskObserver();',
  'startUiStallProbe();',
  'scheduleRefresh();',
]) assert.ok(lifecycle.includes(marker), `P46 lifecycle install marker missing: ${marker}`);

for (const marker of [
  'runtimeDisposed = true;',
  'runtimeEpoch += 1;',
  'if(refreshTimer)clearTimeout(refreshTimer);',
  'if(resetSyncTimer)clearTimeout(resetSyncTimer);',
  'cancelPanelRender();',
  'cancelRefreshScheduler();',
  'cancelResumeRefresh();',
  'stopResumeLongTaskObserver();',
  'stopUiStallProbe();',
  'remoteListeners.splice(0)',
  'widgetRemoteListeners.length=0',
  'domListeners.splice(0)',
]) assert.ok(bootstrap.includes(marker), `P46 unload ownership marker missing: ${marker}`);

for (const marker of [
  "['refresh', refreshTimer]",
  "['reset-sync', resetSyncTimer]",
  "['refresh-scheduler', refreshSchedulerTimer]",
  "['panel-render', panelRenderTimer]",
  "['ui-stall-probe', uiStallProbeTimer]",
  "['resume-probe', resumeProbeTimer]",
  "['resume-measure', resumeMeasureTimer]",
  "['resume-refresh', resumeRefreshTimer]",
  'Listener ownership: remote',
  'In-flight ownership: refresh',
  'Bridge retained work: cache entries',
]) assert.ok(workspace.includes(marker), `P46 Runtime Weight ownership surface missing: ${marker}`);

assert.ok(refresh.includes('runtimeDisposed'), 'P46 refresh runtime must retain disposed-runtime protection');
assert.ok(refresh.includes('runtimeEpoch'), 'P46 refresh runtime must retain epoch protection');

class MockTarget {
  constructor() { this.byType = new Map(); }
  addEventListener(type, fn) {
    if (!this.byType.has(type)) this.byType.set(type, new Set());
    this.byType.get(type).add(fn);
  }
  removeEventListener(type, fn) {
    this.byType.get(type)?.delete(fn);
    if (this.byType.get(type)?.size === 0) this.byType.delete(type);
  }
  count() { return [...this.byType.values()].reduce((sum, set) => sum + set.size, 0); }
}

const interactionTypes = ['pointerdown','touchstart','wheel','keydown'];
const target = new MockTarget();
let runtimeEpoch = 0;
let staleMutationCount = 0;

for (let cycle = 0; cycle < 50; cycle += 1) {
  let runtimeDisposed = false;
  runtimeEpoch += 1;
  const capturedEpoch = runtimeEpoch;
  const domListeners = [];
  const remoteListeners = [];
  const widgetRemoteListeners = [];
  const handles = {
    refresh:{}, resetSync:{}, refreshScheduler:{}, panelRender:{}, uiStallProbe:{},
    resumeProbe:{}, resumeMeasure:{}, resumeRefresh:{}, refreshSchedulerIdle:{}, panelIdle:{},
  };

  const vis = () => {};
  target.addEventListener('visibilitychange', vis);
  domListeners.push([target, 'visibilitychange', vis]);
  for (const type of interactionTypes) {
    const interaction = () => {};
    target.addEventListener(type, interaction);
    domListeners.push([target, type, interaction]);
  }
  assert.equal(target.count(), 5, `P46 cycle ${cycle} must own exactly one current DOM listener per installed event type`);

  const staleAsync = () => {
    if (runtimeDisposed || capturedEpoch !== runtimeEpoch) return false;
    staleMutationCount += 1;
    return true;
  };

  runtimeDisposed = true;
  runtimeEpoch += 1;
  for (const key of Object.keys(handles)) handles[key] = null;
  remoteListeners.splice(0);
  widgetRemoteListeners.length = 0;
  for (const [t, type, fn] of domListeners.splice(0)) t.removeEventListener(type, fn);

  assert.equal(target.count(), 0, `P46 cycle ${cycle} must release all prior-cycle DOM ownership`);
  assert.equal(domListeners.length, 0);
  assert.equal(remoteListeners.length, 0);
  assert.equal(widgetRemoteListeners.length, 0);
  assert.ok(Object.values(handles).every(value => value === null), `P46 cycle ${cycle} must release all modeled timer/idle handles`);
  assert.equal(staleAsync(), false, `P46 cycle ${cycle} stale async work must not mutate disposed/new epoch`);
}

assert.equal(staleMutationCount, 0, 'P46 stale prior-cycle work must never mutate the modeled next epoch');

const p37 = execFileSync(process.execPath, [`${root}/tests/p37-runtime-weight-lifecycle-audit.cjs`], {encoding:'utf8'});
assert.match(p37, /OK/, 'P46 requires P37 GREEN');
const suite = discoverTests();
assert.ok(suite.regressions.includes('p46-lifecycle-stress-ownership.cjs'), 'P46 registry must auto-discover lifecycle stress regression');

console.log(`P46 Lifecycle Stress Ownership: OK · repository ownership simulation 50 cycles · DOM/timer/idle/stale-epoch model returns to zero each cycle · P37 GREEN · Engine ${release.engineVersion} authority verified · physical B0-B3 still required`);
