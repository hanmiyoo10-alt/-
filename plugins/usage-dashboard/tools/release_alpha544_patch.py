from pathlib import Path
import hashlib
import json
import re

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
TESTS = ROOT / 'tests'
REPO = Path('.')
OLD_VERSION = '3.0.0-alpha.5.43'
NEW_VERSION = '3.0.0-alpha.5.44'


def read(path):
    return path.read_text()


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def sha256_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def sha256_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


def split_exact(text, markers, label):
    positions = [0]
    previous = 0
    for marker in markers:
        count = text.count(marker)
        if count != 1:
            raise SystemExit(f'{label}: marker {marker!r} count={count}')
        index = text.index(marker)
        if index <= previous:
            raise SystemExit(f'{label}: marker out of order: {marker!r}')
        positions.append(index)
        previous = index
    positions.append(len(text))
    chunks = [text[positions[i]:positions[i + 1]] for i in range(len(positions) - 1)]
    if any(not chunk for chunk in chunks):
        raise SystemExit(f'{label}: empty split chunk')
    if ''.join(chunks) != text:
        raise SystemExit(f'{label}: split is not byte-preserving')
    return chunks


# Capture a byte-level 5.43 baseline before moving any source boundaries. 5.44 is
# structural only, so after normalizing the product version the built artifact must
# remain byte-identical to this baseline.
latest_path = ROOT / 'latest.js'
baseline = read(latest_path)
if f'//@version {OLD_VERSION}' not in baseline:
    raise SystemExit('unexpected baseline plugin version')
normalized_baseline = baseline.replace(OLD_VERSION, '__PRODUCT_VERSION__')
baseline_fixture = {
    'format': 1,
    'fromVersion': OLD_VERSION,
    'toVersion': NEW_VERSION,
    'normalizedArtifactSha256': sha256_text(normalized_baseline),
    'stateKey': 'local-usage-dashboard-v3',
    'tokenKey': 'local-usage-dashboard-bridge-token-v1',
    'engineVersion': '1.6.5',
    'managerVersion': '1.2.6',
    'snapshotContract': 1,
    'recentRequestContract': 1,
}
write(TESTS / 'fixtures' / 'alpha543-structural-baseline.json', json.dumps(baseline_fixture, ensure_ascii=False, indent=2) + '\n')


# ---- 00 runtime/core -> 3 ordered structural parts -------------------------
old_core_path = SRC / '00-runtime-core.part.js'
old_core = read(old_core_path)
core_chunks = split_exact(old_core, [
    '  function hydrateState(saved) {',
    '  function normalizeBridgeModule(name, row) {',
], 'runtime core split')
core_chunks[0] = replace_once(core_chunks[0], f'//@version {OLD_VERSION}', f'//@version {NEW_VERSION}', 'metadata version')
core_chunks[0] = replace_once(core_chunks[0], f"const VERSION = '{OLD_VERSION}';", f"const VERSION = '{NEW_VERSION}';", 'runtime version')
write(SRC / '00-runtime-core.part.js', core_chunks[0])
write(SRC / '02-runtime-state.part.js', core_chunks[1])
write(SRC / '04-runtime-bridge-normalize.part.js', core_chunks[2])


# ---- 10 usage/request data -> 4 ordered structural parts ------------------
old_usage_path = SRC / '10-usage-data.part.js'
old_usage = read(old_usage_path)
usage_chunks = split_exact(old_usage, [
    '  function normalizeServiceTierValue(value) {',
    '  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {',
    '  function normalizeScopeActivity(raw) {',
], 'usage data split')
write(SRC / '10-request-normalize.part.js', usage_chunks[0])
write(SRC / '12-service-tier.part.js', usage_chunks[1])
write(SRC / '14-request-ledger.part.js', usage_chunks[2])
write(SRC / '16-usage-analytics.part.js', usage_chunks[3])
old_usage_path.unlink()


# ---- 50 dashboard UI -> 3 ordered fragments -------------------------------
# settingsHtml is intentionally kept byte-identical. These are source fragments,
# not independently executable modules; build_usage_dashboard.cjs concatenates them
# with no separator, preserving the exact function/template bytes.
old_ui_path = SRC / '50-settings-ui.part.js'
old_ui = read(old_ui_path)
ui_chunks = split_exact(old_ui, [
    "    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';",
    '    return `<style>',
], 'dashboard UI split')
write(SRC / '50-dashboard-context.part.js', ui_chunks[0])
write(SRC / '52-analytics-context.part.js', ui_chunks[1])
write(SRC / '54-dashboard-markup.part.js', ui_chunks[2])
old_ui_path.unlink()


# ---- 70 floating widget -> render/layout/gestures/runtime -----------------
old_widget_path = SRC / '70-floating-widget.part.js'
old_widget = read(old_widget_path)
widget_chunks = split_exact(old_widget, [
    '  const widgetWidth = (mobile = false, expanded = false) => mobile',
    '  async function ensureWidget() {',
    "  async function renderWidget(reason = 'ui') {",
], 'floating widget split')
write(SRC / '70-widget-render.part.js', widget_chunks[0])
write(SRC / '72-widget-layout.part.js', widget_chunks[1])
write(SRC / '74-widget-gestures.part.js', widget_chunks[2])
write(SRC / '76-widget-runtime.part.js', widget_chunks[3])
old_widget_path.unlink()


# The deterministic bundle order is now explicit at the finer responsibility
# boundaries. Markers continue to make split/recovery drift fail loudly.
parts_cjs = """'use strict';

const PARTS = Object.freeze([
  {file:'00-runtime-core.part.js', marker:null, label:'runtime/core'},
  {file:'02-runtime-state.part.js', marker:'  function hydrateState(saved) {', label:'runtime/state + helpers'},
  {file:'04-runtime-bridge-normalize.part.js', marker:'  function normalizeBridgeModule(name, row) {', label:'runtime/bridge normalization'},
  {file:'10-request-normalize.part.js', marker:'  function recentRequestValue(row, keys, fallback = null) {', label:'request normalization'},
  {file:'12-service-tier.part.js', marker:'  function normalizeServiceTierValue(value) {', label:'request/service tier fidelity'},
  {file:'14-request-ledger.part.js', marker:'  function requestTimestampPrecision(timestamp, sourceKey, requestNumber) {', label:'request ledger + drilldown'},
  {file:'16-usage-analytics.part.js', marker:'  function normalizeScopeActivity(raw) {', label:'usage + analytics normalization'},
  {file:'20-bridge-io.part.js', marker:'  async function fetchSnapshot() {', label:'bridge I/O'},
  {file:'30-refresh-runtime.part.js', marker:"  async function refresh(reason = 'manual', silent = false) {", label:'refresh runtime'},
  {file:'40-diagnostics.part.js', marker:'  function diagText() {', label:'diagnostics'},
  {file:'50-dashboard-context.part.js', marker:'  function settingsHtml() {', label:'dashboard/context'},
  {file:'52-analytics-context.part.js', marker:"    const analyticsScopeKey = ['all','devpass','credits'].includes(String(state.analyticsScopeView)) ? String(state.analyticsScopeView) : 'all';", label:'dashboard/analytics context'},
  {file:'54-dashboard-markup.part.js', marker:'    return `<style>', label:'dashboard/markup'},
  {file:'60-settings-runtime.part.js', marker:'  function renderSettings() {', label:'settings runtime'},
  {file:'70-widget-render.part.js', marker:'  function widgetHtml() {', label:'floating widget/render'},
  {file:'72-widget-layout.part.js', marker:'  const widgetWidth = (mobile = false, expanded = false) => mobile', label:'floating widget/layout'},
  {file:'74-widget-gestures.part.js', marker:'  async function ensureWidget() {', label:'floating widget/gestures'},
  {file:'76-widget-runtime.part.js', marker:"  async function renderWidget(reason = 'ui') {", label:'floating widget/runtime'},
  {file:'80-lifecycle.part.js', marker:'  function scheduleRefresh() {', label:'lifecycle/scheduling'},
  {file:'90-bootstrap.part.js', marker:"  try {\\n    store=await Risuai.getLocalPluginStorage();", label:'bootstrap/unload'}
].map((part) => Object.freeze({...part})));

module.exports = {PARTS};
"""
write(SRC / 'parts.cjs', parts_cjs)


# Update tests that intentionally inspect source fragments. They now concatenate the
# relevant responsibility group, which is exactly how the product bundle sees it.
usage_join = "['10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js','16-usage-analytics.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('')"
ui_join = "['50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('')"
widget_join = "['70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js'].map(file => fs.readFileSync(`${root}/src/${file}`, 'utf8')).join('')"
for path in TESTS.glob('*.cjs'):
    text = read(path)
    text = text.replace(f"fs.readFileSync(`${{root}}/src/10-usage-data.part.js`, 'utf8')", usage_join)
    text = text.replace(f"fs.readFileSync(`${{root}}/src/50-settings-ui.part.js`, 'utf8')", ui_join)
    text = text.replace(f"fs.readFileSync(`${{root}}/src/70-floating-widget.part.js`, 'utf8')", widget_join)
    text = text.replace(OLD_VERSION, NEW_VERSION)
    write(path, text)


# Dedicated module layout regression: deterministic order, no orphan *.part.js files,
# and the newly split responsibility groups stay below the 35 KiB review threshold.
module_layout_test = r'''const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {PARTS} = require('../src/parts.cjs');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
const expected = [
  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js',
  '10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js','16-usage-analytics.part.js',
  '20-bridge-io.part.js','30-refresh-runtime.part.js','40-diagnostics.part.js',
  '50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js','60-settings-runtime.part.js',
  '70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js',
  '80-lifecycle.part.js','90-bootstrap.part.js'
];
assert.deepEqual(PARTS.map(part => part.file), expected);
assert.equal(new Set(expected).size, expected.length);
const actual = fs.readdirSync(src).filter(name => name.endsWith('.part.js')).sort();
assert.deepEqual(actual, [...expected].sort(), 'orphan or missing source part');
const splitGroups = expected.filter(name => /^(?:00|02|04|10|12|14|16|50|52|54|70|72|74|76)-/.test(name));
for (const name of splitGroups) {
  const bytes = fs.statSync(path.join(src, name)).size;
  assert.ok(bytes <= 35 * 1024, `${name} grew beyond 35 KiB: ${bytes}`);
}
console.log(`usage-dashboard P5 module layout: OK · ${PARTS.length} parts`);
'''
write(TESTS / 'p5-module-layout.cjs', module_layout_test)


# Strong structural parity: after replacing only the product version, 5.44's final
# latest.js must be byte-identical to the validated 5.43 artifact.
structural_test = r'''const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = 'plugins/usage-dashboard';
const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
const fixture = JSON.parse(fs.readFileSync(`${root}/tests/fixtures/alpha543-structural-baseline.json`, 'utf8'));
const normalized = source.replaceAll('3.0.0-alpha.5.44', '__PRODUCT_VERSION__');
const hash = crypto.createHash('sha256').update(normalized).digest('hex');
assert.equal(hash, fixture.normalizedArtifactSha256, '5.44 changed runtime bytes beyond the product version');
assert.ok(source.includes('//@version 3.0.0-alpha.5.44'));
assert.ok(source.includes("const REQUIRED_BRIDGE_VERSION = '1.6.5';"));
assert.ok(source.includes("const STATE_KEY = 'local-usage-dashboard-v3';"));
assert.ok(source.includes("const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';"));
console.log('usage-dashboard P5 structural artifact parity: OK · 5.43 → 5.44');
'''
write(TESTS / 'p5-structural-parity.cjs', structural_test)


# State migration compatibility test. This evaluates the actual DEFAULTS + hydrateState
# function from the bundle and proves the state fields introduced throughout alpha 5.x
# survive a 5.43 -> 5.44 load unchanged.
state_test = r'''const fs = require('node:fs');
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
'''
write(TESTS / 'p5-state-compatibility.cjs', state_test)


# Manager product metadata follows the product version, while semantic Manager/Engine
# versions stay frozen.
manager_path = RUNTIME / 'bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(manager, f"const PRODUCT_VERSION = '{OLD_VERSION}';", f"const PRODUCT_VERSION = '{NEW_VERSION}';", 'manager product version')
if "const MANAGER_VERSION = '1.2.6';" not in manager:
    raise SystemExit('manager semantic version drifted')
if "const BUNDLED_ENGINE_VERSION = '1.6.5';" not in manager:
    raise SystemExit('bundled engine semantic version drifted')
write(manager_path, manager)
manager_sha = sha256_file(manager_path)

manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(read(manifest_path))
if manifest.get('productVersion') != OLD_VERSION:
    raise SystemExit(f"unexpected manifest version: {manifest.get('productVersion')}")
if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != '1.6.5':
    raise SystemExit('manifest Engine requirement drifted')
if manifest.get('components', {}).get('bridgeManager', {}).get('version') != '1.2.6':
    raise SystemExit('manifest Manager semantic version drifted')
manifest['productVersion'] = NEW_VERSION
manifest['components']['plugin']['version'] = NEW_VERSION
manifest['components']['bridgeManager']['productVersion'] = NEW_VERSION
manifest['components']['bridgeManager']['sha256'] = manager_sha
write(manifest_path, json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


# Keep the generic release workflow future-proof now that sourceOfTruth has >10 parts,
# and make it run every feature regression added during alpha.5.38-5.44.
release_workflow_path = REPO / '.github/workflows/release-local-usage-dashboard.yml'
workflow = read(release_workflow_path)
old_tests = """          node plugins/usage-dashboard/tests/p5-bundled-engine.cjs
          python3 -m json.tool plugins/usage-dashboard/src/manifest.json >/dev/null
"""
new_tests = """          node plugins/usage-dashboard/tests/p5-bundled-engine.cjs
          node plugins/usage-dashboard/tests/p5-lifecycle-race.cjs
          node plugins/usage-dashboard/tests/p5-bridge-control-sync.cjs
          node plugins/usage-dashboard/tests/p5-service-tier-fidelity.cjs
          node plugins/usage-dashboard/tests/p5-devpass-account-parity.cjs
          node plugins/usage-dashboard/tests/p5-floating-widget-ux.cjs
          node plugins/usage-dashboard/tests/p5-module-layout.cjs
          node plugins/usage-dashboard/tests/p5-structural-parity.cjs
          node plugins/usage-dashboard/tests/p5-state-compatibility.cjs
          python3 -m json.tool plugins/usage-dashboard/src/manifest.json >/dev/null
"""
workflow = replace_once(workflow, old_tests, new_tests, 'generic release regression suite')
old_count = "          test \"$(find plugins/usage-dashboard/src -maxdepth 1 -name '*.part.js' | wc -l)\" -eq 10\n"
new_count = "          node -e \"const fs=require('node:fs');const {PARTS}=require('./plugins/usage-dashboard/src/parts.cjs');const n=fs.readdirSync('plugins/usage-dashboard/src').filter(x=>x.endsWith('.part.js')).length;if(n!==PARTS.length)throw new Error('source part count '+n+' != '+PARTS.length)\"\n"
workflow = replace_once(workflow, old_count, new_count, 'generic release dynamic part count')
write(release_workflow_path, workflow)


# Pre-build structural invariant: concatenating the new source parts in the declared
# order should equal the old artifact with only the version bumped.
ordered = [
  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js',
  '10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js','16-usage-analytics.part.js',
  '20-bridge-io.part.js','30-refresh-runtime.part.js','40-diagnostics.part.js',
  '50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js','60-settings-runtime.part.js',
  '70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js',
  '80-lifecycle.part.js','90-bootstrap.part.js'
]
prebuilt = ''.join(read(SRC / name) for name in ordered)
expected = baseline.replace(OLD_VERSION, NEW_VERSION)
if prebuilt != expected:
    raise SystemExit('structural split changed artifact bytes before build')

print('prepared Local Usage Dashboard 3.0.0-alpha.5.44 structural modularization · 20 parts · runtime bytes unchanged')
