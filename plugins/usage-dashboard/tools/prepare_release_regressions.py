#!/usr/bin/env python3
"""Apply temporary behavior-only compatibility shims to incident regressions.

Current release identity is owned by tests/helpers/current-release.cjs. This
adapter must never rewrite versions, release titles, baselines, or workflow
paths. Remaining shims are retired after dependency-injected behavior harnesses
replace source-shape extraction.
"""

import argparse
import json
from pathlib import Path


parser = argparse.ArgumentParser(description='Prepare behavior-only Usage Dashboard regressions.')
parser.add_argument('--spec', required=True)
args = parser.parse_args()
spec = json.loads(Path(args.spec).read_text())
required = [
    'productVersion', 'engineVersion', 'managerVersion', 'snapshotContract',
    'recentRequestContract', 'releaseTitle', 'callerWorkflow', 'sharedWorkflow',
]
missing = [key for key in required if key not in spec]
if missing:
    raise SystemExit(f'release spec missing: {", ".join(missing)}')

root = Path('plugins/usage-dashboard/tests')
changed = []


def update(name, replacements):
    path = root / name
    text = path.read_text()
    original = text
    for old, new in replacements:
        if new in text:
            continue
        text = text.replace(old, new)
    if text != original:
        path.write_text(text)
        changed.append(name)


update('p5-bundled-engine.cjs', [
    ("async function analyticsScopes(creditsOrgId = '')", "async function analyticsScopes(creditsOrgId = '', options = {})"),
])
update('p10-independent-cache-observer.cjs', [
    ("Symbol.for('llmgateway.devpass.bridge.capture.v8')", "Symbol.for('llmgateway.devpass.bridge.capture.v10')"),
])
update('p16-snapshot-performance-attribution.cjs', [
    ("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 1)));", "const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"),
    ("const summaryContext = { Date: { now: () => 2000 } };", "const summaryContext = { Date: { now: () => 2000 }, CLI_CONCURRENCY: 2, Object, Array, secondaryRefreshSnapshot: () => ({}) };"),
    ("timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId))", "timedSnapshotTask('analyticsScopes', () => analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true }))"),
])
update('p17-bounded-cli-parallelism.cjs', [
    ('async function withCliSlot(label, task) {', 'async function withCliSlot(label, task, launcherMeta = null) {'),
    ('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` restores the previous serial execution mode', 'Preserve the hard CLI concurrency cap'),
])
update('p18-organization-discovery-dedup.cjs', [
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
])
update('p20-shared-24h-capture.cjs', [
    ('one queued for about 5.87s', 'Keep 24h usage and DevPass Activity on the foreground truth path.'),
    ('accountCapture` cache key, 30s TTL, no-stale behavior', 'shared capture behavior'),
    ("assert.ok(guidelines.includes('No organizations found in CLI output'));", "assert.ok(guidelines.includes('Keep already-working behavior unchanged unless the release goal requires touching it.'));"),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ("async function devPassActivityForRange(range = '24h')", "async function devPassActivityForRange(range = '24h', options = {})"),
])
update('p21-snapshot-scheduling-attribution.cjs', [
    ('function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt) {', 'function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta = null) {'),
    ("['endOffsetMs','executionMs','executionStartOffsetMs','label','queueWaitMs','startOffsetMs'].sort()", "['endOffsetMs','executionMs','executionStartOffsetMs','fallbackReason','label','launcher','npxPolicy','queueWaitMs','startOffsetMs'].sort()"),
    ("engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt)')", "engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta)')"),
    ('Bridge ran 3 CLI operations', 'Keep 24h usage and DevPass Activity on the foreground truth path.'),
    ('Measurement only: do not change snapshot ordering', 'Provisioning adds no snapshot source operation or endpoint.'),
    ('missing Write/TTL remained UNKNOWN and was never inferred', 'Keep UNKNOWN distinct from known zero'),
    ('const summaryContext = { Date:{now:()=>2000}, CLI_CONCURRENCY:2, Number, Object, Array, Math, String };', 'const summaryContext = { Date:{now:()=>2000}, CLI_CONCURRENCY:2, Number, Object, Array, Math, String, secondaryRefreshSnapshot:()=>({}) };'),
])
update('p23-credits-usage-early-start.cjs', [
    ('Historical 5.59 contract remains recorded: Measurement only: do not change snapshot ordering', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ('fall back to the prior plain `orgs list --json` path', 'Keep already-working behavior unchanged unless the release goal requires touching it.'),
    ("assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) return Promise.resolve(null);'));", "assert.ok(earlySource.includes('if (CLI_CONCURRENCY < 2) {'));"),
    ("assert.ok(earlySource.includes('.catch(() => null)'));", "assert.ok(earlySource.includes(\"reason:'prefetch-error'\"));"),
    ("assert.ok(guidelines.includes('Ambiguous/missing IDs keep the 5.60 root-gated path.'));", "assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));"),
    ("assert.ok(guidelines.includes('dedicated circuit family must not double-count failures against the existing organizations circuit'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
    ("assert.ok(guidelines.includes('`DEVPASS_BRIDGE_CLI_CONCURRENCY=1` disables early-start and restores the previous serial execution mode.'));", "assert.ok(guidelines.includes('Preserve the hard CLI concurrency cap'));"),
])
update('p24-snapshot-decision-attribution.cjs', [
    ("['hit','miss','join','load','stale','blocked','error']", "['hit','miss','join','load','stale','deferred','blocked','error']"),
    ("['empty','expired','loaded','circuit-open','refresh-error']", "['empty','expired','loaded','deferred-refresh','circuit-open','refresh-error']"),
    ("assert.ok(guidelines.includes('The new attribution must add zero CLI/network requests.'));", "assert.ok(guidelines.includes('Provisioning adds no snapshot source operation or endpoint.'));"),
    ("assert.ok(guidelines.includes('about 17.17s because long-window analytics work became cold'));", "assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));"),
    ("assert.ok(guidelines.includes('exact skip reason is UNKNOWN in 5.61 diagnostics'));", "assert.ok(guidelines.includes('Diagnostics expose only sanitized family/scope/range'));"),
])
update('p26-foreground-cli-launcher-attribution.cjs', [
    ('const processContext = {', "const processContext = {\n  process:{execPath:'/safe/node'},\n  managedCliRuntime:async()=>({state:'unavailable',entry:null}),\n  NPX_PREFER_OFFLINE: true,"),
    ('const diagContext = {Array,Number,String,Math};', 'const diagContext = {Array,Number,String,Math,Set};'),
    ("assert.equal(runProgramOccurrences - runProgramDefinitions, 2, 'direct and npx must remain the only runProgram call sites');", "assert.equal(runProgramOccurrences - runProgramDefinitions, 3, 'managed, direct, and npx remain the only runProgram call sites');"),
    ("['direct','npx-fallback']", "['managed-direct','direct','npx-fallback']"),
    ('const fallbackAt = processSource.indexOf("runProgram(\'npx\', [\'--yes\', `@llmgateway/cli@${CLI_VERSION}`, ...args], extraEnv)");', 'const fallbackAt = processSource.indexOf("runProgram(\'npx\', npxArgs, extraEnv)");'),
    ("{launcher:'direct',fallbackReason:'none'}", "{launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'}"),
    ("{launcher:'npx-fallback',fallbackReason:'direct-enoent'}", "{launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'prefer-offline'}"),
    ("['--yes','@llmgateway/cli@1.9.0','credits','--json']", "['--yes','--prefer-offline','@llmgateway/cli@1.9.0','credits','--json']"),
    ('direct 1 · npx-fallback 1 · unknown 1 · direct ENOENT 1', 'managed-direct 0 · direct 1 · npx-fallback 1 · unknown 1 · policy not-applicable · direct ENOENT 1'),
    ('Launcher attribution is measurement-only', 'Engine launcher order is `managed-direct` → system `direct` → `npx-fallback`.'),
    ('Keep all five existing `runCli()` call sites and the single existing `execFileAsync()` source operation', 'Keep all five existing `runCli()` source call sites and the single existing `execFileAsync()` source operation'),
    ('its share of the 8–9s latency remains UNKNOWN', 'If managed-direct remains near the prior 7–13s source timings'),
])
update('p27-npx-cache-first-launcher.cjs', [
    ("assert.equal(runProgramOccurrences - runProgramDefinitions, 2, 'direct and npx must remain the only runProgram call sites');", "assert.equal(runProgramOccurrences - runProgramDefinitions, 3, 'managed, direct, and npx remain the only runProgram call sites');"),
    ('const context = {', "const context = {\n    process:{execPath:'/safe/node'},\n    managedCliRuntime:async()=>({state:'unavailable',entry:null}),"),
    ("['direct','npx-fallback']", "['managed-direct','direct','npx-fallback']"),
    ('direct 1 · npx-fallback 1 · unknown 0 · policy prefer-offline · direct ENOENT 1', 'managed-direct 0 · direct 1 · npx-fallback 1 · unknown 0 · policy prefer-offline · direct ENOENT 1'),
    ('direct 0 · npx-fallback 1 · unknown 0 · policy not-applicable · direct ENOENT 1', 'managed-direct 0 · direct 0 · npx-fallback 1 · unknown 0 · policy not-applicable · direct ENOENT 1'),
    ('`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` restores the exact 5.64 fallback', '`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` continues to control only the final npx fallback policy'),
    ('5.65 makes no guaranteed performance claim', 'One faster sample is insufficient to claim causality'),
])

print('behavior-only regression adapter: ' + (', '.join(changed) if changed else 'no changes'))
