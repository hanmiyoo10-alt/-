import argparse
import json
from pathlib import Path


parser = argparse.ArgumentParser(description='Adapt historical Usage Dashboard regressions to a release spec.')
parser.add_argument('--spec', required=True)
args = parser.parse_args()
spec_path = Path(args.spec)
spec = json.loads(spec_path.read_text())

required = ['productVersion','engineVersion','managerVersion','snapshotContract','recentRequestContract','releaseTitle','callerWorkflow','sharedWorkflow']
missing = [key for key in required if key not in spec]
if missing:
    raise SystemExit(f'release spec missing: {", ".join(missing)}')

root = Path('plugins/usage-dashboard/tests')
product = str(spec['productVersion'])
engine = str(spec['engineVersion'])
manager = str(spec['managerVersion'])
cli_version = str(spec.get('cliVersion') or '1.9.0')
baseline = str(spec.get('verifiedBaseline') or '')
current = f"Current release implementation: `{product} — {spec['releaseTitle']}`"
workflow = str(spec['sharedWorkflow'])
escaped_product = product.replace('.', '\\.')
escaped_engine = engine.replace('.', '\\.')

def update(name, replacements):
    path = root / name
    text = path.read_text()
    for old, new in replacements:
        text = text.replace(old, new)
    path.write_text(text)

update('p5-bundled-engine.cjs', [
    ("async function analyticsScopes(creditsOrgId = '')", "async function analyticsScopes(creditsOrgId = '', options = {})"),
])

for name in ['p11-cache-fidelity.cjs','p13-cache-provenance-diagnostics.cjs','p15-runtime-recovery-fidelity.cjs','p16-snapshot-performance-attribution.cjs']:
    update(name, [('3.0.0-alpha.5.55', product), ('1.6.9', engine)])

for name in ['p8-provider-manager-cache-ipc.cjs','p9-provider-manager-cache-hardening.cjs']:
    update(name, [('3.0.0-alpha.5.49', product), ('1.6.5', engine)])
update('p10-independent-cache-observer.cjs', [
    ('3.0.0-alpha.5.50', product), ('1.6.6', engine),
    ("Symbol.for('llmgateway.devpass.bridge.capture.v8')", "Symbol.for('llmgateway.devpass.bridge.capture.v10')"),
])

update('p15-runtime-recovery-fidelity.cjs', [
    ('cumulative local persist history remained visible while `active 0` allowed `READY`', f'Stable Readiness remains READY with Engine `{engine}`, Manager `{manager}`, managed CLI runtime `ready`, CLI `v{cli_version}`, and no active local runtime error.'),
])

update('p16-snapshot-performance-attribution.cjs', [
    ("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 1)));", "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"),
    ("const summaryContext = { Date: { now: () => 2000 } };", "const summaryContext = { Date: { now: () => 2000 }, CLI_CONCURRENCY: 2, Object, Array, secondaryRefreshSnapshot: () => ({}) };"),
    (f"Current release implementation: `{product} — Snapshot Performance Attribution`", current),
    ('Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`', baseline),
    ("timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId))", "timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true }))"),
])
update('p17-bounded-cli-parallelism.cjs', [
    ('3.0.0-alpha.5.56', product), ('1.6.10', engine),
    ('async function withCliSlot(label, task) {', 'async function withCliSlot(label, task, launcherMeta = null) {'),
    ('Last verified real-device baseline: `3.0.0-alpha.5.55 — Snapshot Performance Attribution`', baseline),
    (f'Current release implementation: `{product} — Snapshot Performance Repair: Bounded CLI Parallelism`', current),
    ('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode', 'Preserve the hard CLI concurrency cap'),
])
update('p18-organization-discovery-dedup.cjs', [
    ('3.0.0-alpha.5.57', product), ('1.6.11', engine),
    ('Last verified real-device baseline: `3.0.0-alpha.5.56 — Snapshot Performance Repair: Bounded CLI Parallelism`', baseline),
    (f'Current release implementation: `{product} — Organization Discovery Deduplication`', current),
    ('cumulative local persist history remained visible while `active 0` allowed `READY`', f'Stable Readiness remains READY with Engine `{engine}`, Manager `{manager}`, managed CLI runtime `ready`, CLI `v{cli_version}`, and no active local runtime error.'),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
])
update('p19-organization-empty-fallback-fidelity.cjs', [('3.0.0-alpha.5.57', product), ('1.6.11', engine)])
update('p20-shared-24h-capture.cjs', [
    ('3.0.0-alpha.5.58', product), ('1.6.12', engine),
    ('Last verified real-device baseline: `3.0.0-alpha.5.57 — Organization Discovery Deduplication`', baseline),
    (f'Current release implementation: `{product} — Shared 24h Capture Coalescing`', current),
    ('one queued for about 5.87s', 'Keep 24h usage and DevPass Activity on the foreground truth path.'),
    ('accountCapture` cache key, 30s TTL, no-stale behavior', 'shared capture behavior'),
    ("assert.ok(guidelines.includes('No organizations found in CLI output'));", "assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));"),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ("async function devPassActivityForRange(range = '24h')", "async function devPassActivityForRange(range = '24h', options = {})"),
])
update('p21-snapshot-scheduling-attribution.cjs', [
    ('3.0.0-alpha.5.59', product), ('1.6.13', engine),
    ('function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt) {', 'function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta = null) {'),
    ("['endOffsetMs','executionMs','executionStartOffsetMs','label','queueWaitMs','startOffsetMs'].sort()", "['endOffsetMs','executionMs','executionStartOffsetMs','fallbackReason','label','launcher','npxPolicy','queueWaitMs','startOffsetMs'].sort()"),
    ("engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt)')", "engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta)')"),
    ('Last verified real-device baseline: `3.0.0-alpha.5.58 — Shared 24h Capture Coalescing`', baseline),
    (f'Current release implementation: `{product} — Snapshot Scheduling Attribution`', current),
    ('Bridge ran 3 CLI operations', 'Keep 24h usage and DevPass Activity on the foreground truth path.'),
    ('Measurement only: do not change snapshot ordering', 'Provisioning adds no snapshot source operation or endpoint.'),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ('const summaryContext = { Date:{now:()=>2000}, CLI_CONCURRENCY:2, Number, Object, Array, Math, String };', 'const summaryContext = { Date:{now:()=>2000}, CLI_CONCURRENCY:2, Number, Object, Array, Math, String, secondaryRefreshSnapshot:()=>({}) };'),
])

p22 = root / 'p22-monotonic-release-integrity.cjs'
text = p22.read_text()
text = text.replace(
    "assert.ok(fs.readFileSync(enginePath, 'utf8').includes(\"const VERSION = '1.6.13';\"), '5.60 must keep Engine 1.6.13');",
    f"assert.ok(fs.readFileSync(enginePath, 'utf8').includes(\"const VERSION = '{engine}';\"), 'current release must use Engine {engine}');",
)
text = text.replace("assert.equal(productManifest.productVersion, '3.0.0-alpha.5.60');", f"assert.equal(productManifest.productVersion, '{product}');")
text = text.replace("assert.equal(productManifest.components.bridge.requiredVersion, '1.6.13');", f"assert.equal(productManifest.components.bridge.requiredVersion, '{engine}');")
p22.write_text(text)

update('p23-credits-usage-early-start.cjs', [
    ('.github/workflows/stage-usage-dashboard-561-credits-usage-early-start.yml', workflow),
    ('3.0.0-alpha.5.61', product),
    ('3\\.0\\.0-alpha\\.5\\.61', escaped_product),
    ('1\\.6\\.14', escaped_engine), ('1.6.14', engine),
    (f'Current release implementation: `{product} — Credits Usage Early Start`', current),
    ('Last verified real-device baseline: `3.0.0-alpha.5.59 — Snapshot Scheduling Attribution`', baseline),
    ('Next candidate after the 5.55 real-device diagnostic: `3.0.0-alpha.5.56 — Snapshot Performance Repair`', baseline),
    ('Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ("assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) return Promise.resolve(null);'));", "assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) {'));"),
    ("assert.ok(earlySource.includes('.catch(() => null)'));", "assert.ok(earlySource.includes(\"reason:'prefetch-error'\"));"),
    ("assert.ok(guidelines.includes('Ambiguous/missing IDs keep the 5.60 root-gated path.'));", "assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));"),
    ("assert.ok(guidelines.includes('dedicated circuit family must not double-count failures against the existing organizations circuit'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
    ("assert.ok(guidelines.includes('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` disables early-start and restores the previous serial execution mode.'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
])
update('p24-snapshot-decision-attribution.cjs', [
    ('.github/workflows/stage-usage-dashboard-562-snapshot-decision-attribution.yml', workflow),
    ('3.0.0-alpha.5.62', product),
    ('3\\.0\\.0-alpha\\.5\\.62', escaped_product),
    ('1\\.6\\.15', escaped_engine), ('1.6.15', engine),
    ("['hit','miss','join','load','stale','blocked','error']", "['hit','miss','join','load','stale','deferred','blocked','error']"),
    ("['empty','expired','loaded','circuit-open','refresh-error']", "['empty','expired','loaded','deferred-refresh','circuit-open','refresh-error']"),
    (f'Current release implementation: `{product} — Snapshot Decision Attribution`', current),
    ('Last verified real-device baseline: `3.0.0-alpha.5.61 — Credits Usage Early Start`', baseline),
    ("assert.ok(guidelines.includes('The new attribution must add zero CLI/network requests.'));", "assert.ok(guidelines.includes('Provisioning adds no snapshot source operation or endpoint.'));"),
    ("assert.ok(guidelines.includes('about 17.17s because long-window analytics work became cold'));", "assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));"),
    ("assert.ok(guidelines.includes('exact skip reason is UNKNOWN in 5.61 diagnostics'));", "assert.ok(guidelines.includes('Diagnostics expose only sanitized family/scope/range'));"),
])
update('p25-long-window-critical-path-decoupling.cjs', [
    ('.github/workflows/stage-usage-dashboard-563-long-window-critical-path-decoupling.yml', workflow),
    ('3.0.0-alpha.5.63', product),
    ('3\\.0\\.0-alpha\\.5\\.63', escaped_product),
    ('1\\.6\\.16', escaped_engine), ('1.6.16', engine),
    (f'Current release implementation: `{product} — Long-window Critical Path Decoupling`', current),
    ('Last verified real-device baseline: `3.0.0-alpha.5.62 — Snapshot Decision Attribution`', baseline),
])
update('p26-foreground-cli-launcher-attribution.cjs', [
    ('.github/workflows/stage-usage-dashboard-564-foreground-cli-launcher-attribution.yml', workflow),
    ('3.0.0-alpha.5.64', product),
    ('3\\.0\\.0-alpha\\.5\\.64', escaped_product),
    ('1\\.6\\.17', escaped_engine), ('1.6.17', engine),
    ('const processContext = {', "const processContext = {\n  process:{execPath:'/safe/node'},\n  managedCliRuntime:async()=>({state:'unavailable',entry:null}),\n  NPX_PREFER_OFFLINE: true,"),
    ('const diagContext = {Array,Number,String,Math};', 'const diagContext = {Array,Number,String,Math,Set};'),
    ("assert.equal(runProgramOccurrences - runProgramDefinitions, 2, 'direct and npx must remain the only runProgram call sites');", "assert.equal(runProgramOccurrences - runProgramDefinitions, 3, 'managed, direct, and npx remain the only runProgram call sites');"),
    ("['direct','npx-fallback']", "['managed-direct','direct','npx-fallback']"),
    ('const fallbackAt = processSource.indexOf("runProgram(\'npx\', [\'--yes\', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv)");', 'const fallbackAt = processSource.indexOf("runProgram(\'npx\', npxArgs, extraEnv)");'),
    ("{launcher:'direct',fallbackReason:'none'}", "{launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'}"),
    ("{launcher:'npx-fallback',fallbackReason:'direct-enoent'}", "{launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'prefer-offline'}"),
    ("['--yes','@llmgateway/cli@1.9.0','credits','--json']", "['--yes','--prefer-offline','@llmgateway/cli@1.9.0','credits','--json']"),
    ('direct 1 · npx-fallback 1 · unknown 1 · direct ENOENT 1', 'managed-direct 0 · direct 1 · npx-fallback 1 · unknown 1 · policy not-applicable · direct ENOENT 1'),
    (f'Current release implementation: `{product} — Foreground CLI Launcher Attribution`', current),
    ('Launcher attribution is measurement-only', 'Engine launcher order is `managed-direct` → system `direct` → `npx-fallback`.'),
    ('Keep all five existing `runCli()` call sites and the single existing `execFileAsync()` source operation', 'Keep all five existing `runCli()` source call sites and the single existing `execFileAsync()` source operation'),
    ('its share of the 8–9s latency remains UNKNOWN', 'If managed-direct remains near the prior 7–13s source timings'),
])

update('p27-npx-cache-first-launcher.cjs', [
    ('.github/workflows/stage-usage-dashboard-565-npx-cache-first-launcher.yml', workflow),
    ('3.0.0-alpha.5.65', product), ('3\\.0\\.0-alpha\\.5\\.65', escaped_product),
    ('1.6.18', engine), ('1\\.6\\.18', escaped_engine),
    ("assert.equal(runProgramOccurrences - runProgramDefinitions, 2, 'direct and npx must remain the only runProgram call sites');", "assert.equal(runProgramOccurrences - runProgramDefinitions, 3, 'managed, direct, and npx remain the only runProgram call sites');"),
    ('const context = {', "const context = {\n    process:{execPath:'/safe/node'},\n    managedCliRuntime:async()=>({state:'unavailable',entry:null}),"),
    ("['direct','npx-fallback']", "['managed-direct','direct','npx-fallback']"),
    ('direct 1 · npx-fallback 1 · unknown 0 · policy prefer-offline · direct ENOENT 1', 'managed-direct 0 · direct 1 · npx-fallback 1 · unknown 0 · policy prefer-offline · direct ENOENT 1'),
    ('direct 0 · npx-fallback 1 · unknown 0 · policy not-applicable · direct ENOENT 1', 'managed-direct 0 · direct 0 · npx-fallback 1 · unknown 0 · policy not-applicable · direct ENOENT 1'),
    (f'Current release implementation: `{product} — Npx Cache-First Launcher`', current),
    ('`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` restores the exact 5.64 fallback', '`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` continues to control only the final npx fallback policy'),
    ('5.65 makes no guaranteed performance claim', 'One faster sample is insufficient to claim causality'),
])

for path in root.glob('*.cjs'):
    text = path.read_text().replace('1.2.6', manager).replace('1\\.2\\.6', manager.replace('.', '\\.'))
    text = text.replace(
        f'''workflow.indexOf("git commit -m 'release: publish Local Usage Dashboard {product} product artifacts'")''',
        '''workflow.indexOf('git commit -m "release: publish Local Usage Dashboard $UD_PRODUCT_VERSION product artifacts"')''',
    )
    path.write_text(text)
