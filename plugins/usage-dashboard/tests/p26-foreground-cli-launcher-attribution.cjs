const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5);
const runProgramOccurrences = (engine.match(/\brunProgram\(/g) || []).length;
const runProgramDefinitions = (engine.match(/async function runProgram\(/g) || []).length;
assert.equal(runProgramDefinitions, 1);
assert.equal(runProgramOccurrences - runProgramDefinitions, 3);
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1);
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);

// Stable source boundaries stay guarded here. Branch semantics run against the
// actual Engine process in behavior-cli-launcher.cjs.
const managedAt = engine.indexOf("launcherMeta.launcher = 'managed-direct'");
const directAt = engine.indexOf("runProgram('llmgateway', args, extraEnv)", managedAt);
const enoentAt = engine.indexOf("if (error?.code !== 'ENOENT') throw error;", directAt);
const fallbackAt = engine.indexOf("runProgram('npx', npxArgs, extraEnv)", enoentAt);
assert.ok(managedAt >= 0 && directAt > managedAt && enoentAt > directAt && fallbackAt > enoentAt);
assert.ok(engine.includes("launcherMeta.launcher = 'npx-fallback';"));
assert.ok(engine.includes("launcherMeta.fallbackReason = 'direct-enoent';"));

assert.ok(diagnostics.includes("['managed-direct','direct','npx-fallback']"));
assert.ok(diagnostics.includes("? String(item.launcher) : 'unknown'"));
assert.ok(diagnostics.includes("String(item?.fallbackReason) === 'direct-enoent'"));
assert.ok(diagnostics.includes('Bridge CLI launcher: ${bridgeCliLauncherText(bridgeDiag.snapshotPerformance)}'));
assert.ok(latest.includes('Bridge CLI launcher:'));

assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.ok(engine.includes('if (inFlight.has(name) || secondaryRefreshKeys.has(name)) return true;'));
assert.ok(engine.includes('if (secondaryRefreshKeys.size >= SECONDARY_REFRESH_MAX_KEYS)'));
assert.ok(engine.includes("runwayFor(creditsOrg.id, { deferExpired:true })"));
assert.ok(engine.includes("analyticsScopes(resolvedCreditsOrgId, { deferLongWindow:true })"));
assert.ok(engine.includes("return json(res, 200, await analyticsScopes(creditsOrgId))"));
assert.ok(engine.includes("return json(res, 200, await runwayFor(decodeURIComponent(match[1])))"));
assert.ok(!/usageForOrg\([^\n]*'24h'[^\n]*deferExpired:true/.test(engine));

assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('Engine launcher order is `managed-direct` → system `direct` → `npx-fallback`.'));
assert.ok(guidelines.includes('Keep all five existing `runCli()` source call sites and the single existing `execFileAsync()` source operation'));
assert.ok(guidelines.includes('If managed-direct remains near the prior 7–13s source timings'));
assert.ok(workflow.includes('behavior-cli-launcher.cjs'));
assert.ok(workflow.includes('behavior-harness-contract.cjs'));
assert.ok(workflow.includes('concurrency:\n  group: usage-dashboard-release'));
assert.ok(!workflow.includes('group: repo-main-write'));
assert.ok(workflow.includes('scripts/repo-main-write.py'));
assert.ok(workflow.includes('check_release_monotonic.py'));

console.log('P26 Foreground CLI Launcher Attribution: OK · static boundaries retained; launcher behavior delegated to black-box Engine harness');
