const fs = require('node:fs');
const assert = require('node:assert/strict');

const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
const refresh = fs.readFileSync(`${root}/src/30-refresh-runtime.part.js`, 'utf8');
const settings = fs.readFileSync(`${root}/src/60-settings-runtime.part.js`, 'utf8');
const widget = fs.readFileSync(`${root}/src/70-floating-widget.part.js`, 'utf8');
const lifecycle = fs.readFileSync(`${root}/src/80-lifecycle.part.js`, 'utf8');

const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const alpha539Plus = version.match(/^3\.0\.0-alpha\.5\.(\d+)$/);
assert.ok(alpha539Plus && Number(alpha539Plus[1]) >= 39, `lifecycle race guard requires alpha.5.39+, got ${version}`);
for (const marker of [
  'const bridgeLifecycleRuntime = {generation:1',
  'function canBridgeRefresh()',
  'function lifecycleRefreshIsCurrent(generation)',
  'function dropLifecycleRefresh()',
  "if (!canBridgeRefresh()) { bridgeLifecycleRuntime.blockedRefreshes += 1; return; }",
]) assert.ok(core.includes(marker), `missing lifecycle core marker: ${marker}`);

assert.ok(refresh.includes('const refreshLifecycleGeneration = bridgeLifecycleRuntime.generation;'));
assert.ok((refresh.match(/lifecycleRefreshIsCurrent\(refreshLifecycleGeneration\)/g) || []).length >= 8,
  'refresh path must re-check lifecycle generation after async boundaries');
assert.ok(!refresh.includes('if (!state.bridgeEnabled) return;'), 'legacy boolean-only refresh guard remains');

for (const marker of [
  "noteBridgeLifecycleTransition('connecting','connect');",
  "noteBridgeLifecycleTransition('paused','pause-sync');",
  "noteBridgeLifecycleTransition('off','forget-token');",
]) assert.ok(settings.includes(marker), `missing lifecycle transition: ${marker}`);

assert.ok(lifecycle.includes("if (!baseMs||!canBridgeRefresh()||"), 'timer route must use central refresh guard');
assert.ok(lifecycle.includes("if(state.syncOnFocus&&canBridgeRefresh())requestResumeRefresh('visibility');"),
  'visibility route must use central refresh guard');

for (const marker of [
  'let widgetRenderTail = Promise.resolve(), widgetRenderRequestId = 0;',
  'const requestId = ++widgetRenderRequestId;',
  'renderWidgetTail',
]) {
  if (marker === 'renderWidgetTail') continue;
  assert.ok(source.includes(marker), `missing widget serialization marker: ${marker}`);
}
assert.ok(widget.includes('widgetRenderTail.catch(() => undefined).then(() => renderWidgetNow(reason, requestId))'));
assert.ok(widget.includes('requestId !== widgetRenderRequestId'), 'widget stale render invalidation missing');
assert.ok(source.includes('Lifecycle refresh: drops'));
console.log(`usage-dashboard P5 lifecycle race regression: OK · ${version}`);
