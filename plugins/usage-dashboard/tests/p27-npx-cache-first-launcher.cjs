const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5);
const runProgramOccurrences = (engine.match(/\brunProgram\(/g) || []).length;
const runProgramDefinitions = (engine.match(/async function runProgram\(/g) || []).length;
assert.equal(runProgramDefinitions, 1);
assert.equal(runProgramOccurrences - runProgramDefinitions, 3);
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1);
assert.match(engine, /const NPX_PREFER_OFFLINE = String\(process\.env\.DEVPASS_BRIDGE_NPX_PREFER_OFFLINE \|\| '1'\) !== '0';/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);

const directAt = engine.indexOf("runProgram('llmgateway', args, extraEnv)");
const enoentAt = engine.indexOf("if (error?.code !== 'ENOENT') throw error;", directAt);
const argsAt = engine.indexOf('const npxArgs = NPX_PREFER_OFFLINE', enoentAt);
const fallbackAt = engine.indexOf("runProgram('npx', npxArgs, extraEnv)", argsAt);
assert.ok(directAt >= 0 && enoentAt > directAt && argsAt > enoentAt && fallbackAt > argsAt);
assert.ok(engine.includes("['--yes', '--prefer-offline', `@llmgateway/cli@${CLI_VERSION}`, ...args]"));
assert.ok(engine.includes("['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args]"));

assert.ok(diagnostics.includes("['prefer-offline','default']"));
assert.ok(diagnostics.includes("'not-applicable'"));
assert.ok(diagnostics.includes("['managed-direct','direct','npx-fallback']"));
assert.ok(!/runProgram\(['\"]npm['\"]/.test(engine));
assert.ok(!/npm\s+(?:install|cache)\b/i.test(engine));
assert.ok(!/npm_config_cache|\.npm\/_npx|which\s+llmgateway|version\s+probe/i.test(engine));
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.ok(!/usageForOrg\([^\n]*'24h'[^\n]*deferExpired:true/.test(engine));

assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` continues to control only the final npx fallback policy'));
assert.ok(guidelines.includes('One faster sample is insufficient to claim causality'));
assert.ok(workflow.includes('behavior-cli-launcher.cjs'));
assert.ok(workflow.includes('behavior-harness-contract.cjs'));
assert.ok(workflow.includes('concurrency:\n  group: usage-dashboard-release'));
assert.ok(!workflow.includes('group: repo-main-write'));
assert.ok(!workflow.includes('scripts/repo-main-write.py'));
assert.ok(workflow.includes('check_release_monotonic.py'));

console.log('P27 Npx Cache-First Launcher: OK · argv invariants retained; prefer-offline and rollback behavior delegated to black-box Engine harness');
