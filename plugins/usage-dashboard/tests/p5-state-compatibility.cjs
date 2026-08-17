const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const defaultsStart = source.indexOf('  const DEFAULTS = {');
const defaultsEnd = source.indexOf('\n  };', defaultsStart);
const hydrateStart = source.indexOf('  function hydrateState(saved) {');
const hydrateEnd = source.indexOf('\n\n  function normalizeBridgeError', hydrateStart);
assert.ok(defaultsStart >= 0 && defaultsEnd > defaultsStart && hydrateStart >= 0 && hydrateEnd > hydrateStart);
const defaultsDecl = source.slice(defaultsStart, defaultsEnd + 5);
const hydrateDecl = source.slice(hydrateStart, hydrateEnd);
const context = {DEFAULT_BRIDGE:'http://127.0.0.1:39117'};
vm.createContext(context);
vm.runInContext(`${defaultsDecl}\n${hydrateDecl}\nthis.api={DEFAULTS,hydrateState};`, context);
const saved = {
  bridgeEnabled:false, bridgeStatus:'paused', refreshMs:600000,
  backgroundPause:false, syncOnFocus:false, performanceGuard:false, adaptiveRefresh:false,
  widgetVisible:false, widgetMode:'detailed', widgetX:12, widgetY:34, widgetDockSide:'left',
  usageScopeView:'devpass', recentRequestFilter:'error', selectedHourKey:'2026-08-17T16',
  analyticsScopeView:'credits', dashboardView:'settings', selectedCreditsOrgId:'org-test',
  requestLedger:[{timestamp:123,requestNumber:'42',requestedServiceTier:'flex',servedServiceTier:'flex',scopes:['devpass']}],
  bridgePausedAt:111, bridgeLastReconnectAt:222, bridgeTokenClearedAt:333,
};
const hydrated = context.api.hydrateState(saved);
for (const [key, value] of Object.entries(saved)) assert.deepEqual(hydrated[key], value, `state field lost: ${key}`);
assert.equal(hydrated.bridgeBase, 'http://127.0.0.1:39117');
assert.equal(hydrated.widgetDockSide, 'left');
assert.equal(hydrated.requestLedger[0].servedServiceTier, 'flex');
console.log('usage-dashboard P5 state compatibility: OK · alpha.5.43 state survives alpha.5.44');
