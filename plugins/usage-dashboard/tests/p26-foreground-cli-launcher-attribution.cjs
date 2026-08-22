const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync(currentRelease.sharedWorkflow, 'utf8');

assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

// Measurement only: keep the exact source-operation surface and execution guards.
const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5, '5.64 must keep exactly five runCli call sites');
const runProgramOccurrences = (engine.match(/\brunProgram\(/g) || []).length;
const runProgramDefinitions = (engine.match(/async function runProgram\(/g) || []).length;
assert.equal(runProgramDefinitions, 1);
assert.equal(runProgramOccurrences - runProgramDefinitions, 3, 'managed, direct, and npx remain the only runProgram call sites');
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1, 'runProgram must remain the only execFileAsync source operation');
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);

// Existing direct -> ENOENT -> npx fallback semantics must remain literal and ordered.
const processStart = engine.indexOf('async function runCliProcess(');
const processEnd = engine.indexOf('\nasync function runCli(', processStart);
assert.ok(processStart >= 0 && processEnd > processStart);
const processSource = engine.slice(processStart, processEnd);
const directAt = processSource.indexOf("runProgram('llmgateway', args, extraEnv)");
const enoentAt = processSource.indexOf("if (error?.code !== 'ENOENT') throw error;");
const fallbackAt = processSource.indexOf("runProgram('npx', npxArgs, extraEnv)");
assert.ok(directAt >= 0 && enoentAt > directAt && fallbackAt > enoentAt);
assert.ok(processSource.includes("launcherMeta.launcher = 'npx-fallback';"));
assert.ok(processSource.includes("launcherMeta.fallbackReason = 'direct-enoent';"));

// Exercise all launcher branches without starting a subprocess.
const calls = [];
let mode = 'direct';
let capturedMeta = null;
const processContext = {
  process:{execPath:'/safe/node'},
  managedCliRuntime:async()=>({state:'unavailable',entry:null}),
  NPX_PREFER_OFFLINE: true,
  process:{execPath:'/safe/node'},
  managedCliRuntime:async()=>({state:'unavailable',entry:null}),
  NPX_PREFER_OFFLINE: true,
  CLI_VERSION: '1.9.0',
  cliOperationLabel: () => 'credits',
  withCliSlot: async (_label, task, meta) => {
    try { return await task(); }
    finally { capturedMeta = {...meta}; }
  },
  runProgram: async (program, args, env) => {
    calls.push({program,args:[...args],env:{...env}});
    if (program === 'llmgateway' && mode === 'enoent') {
      const error = new Error('missing');
      error.code = 'ENOENT';
      throw error;
    }
    if (program === 'llmgateway' && mode === 'failure') {
      const error = new Error('direct failed');
      error.code = 'EACCES';
      throw error;
    }
    return {stdout:'{}'};
  },
};
vm.createContext(processContext);
vm.runInContext(`${processSource}\nthis.runCliProcess = runCliProcess;`, processContext);

// Diagnostics accept only bounded launcher/fallback vocabulary and the existing eight records.
const diagStart = diagnostics.indexOf('  function bridgeCliOperationsText(');
const diagEnd = diagnostics.indexOf('\n  function bridgeCreditsEarlyStartText(', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart);
const diagSource = diagnostics.slice(diagStart, diagEnd);
assert.ok(diagSource.includes("['managed-direct','direct','npx-fallback']"));
assert.ok(diagSource.includes("? String(item.launcher) : 'unknown'"));
assert.ok(diagSource.includes("String(item?.fallbackReason) === 'direct-enoent'"));
assert.ok(!/process\.env|extraEnv|executable|CLI_VERSION|\.args\b/.test(diagSource));
const diagContext = {Array,Number,String,Math,Set};
vm.createContext(diagContext);
vm.runInContext(`${diagSource}\nthis.operationsText = bridgeCliOperationsText; this.launcherText = bridgeCliLauncherText;`, diagContext);
const sample = {
  cliOperations: [
    {label:'credits',launcher:'direct',fallbackReason:'none',startOffsetMs:0,endOffsetMs:10,queueWaitMs:0,executionMs:10},
    {label:'capture',launcher:'npx-fallback',fallbackReason:'direct-enoent',startOffsetMs:1,endOffsetMs:12,queueWaitMs:0,executionMs:11},
    {label:'legacy',launcher:'not-allowed',fallbackReason:'raw-error',startOffsetMs:2,endOffsetMs:13,queueWaitMs:1,executionMs:10},
  ],
};
assert.equal(diagContext.operationsText(sample), 'credits [direct] 0→10ms · q0 · exec10 · capture [npx-fallback] 1→12ms · q0 · exec11 · legacy [unknown] 2→13ms · q1 · exec10');
assert.equal(diagContext.launcherText(sample), 'managed-direct 0 · direct 1 · npx-fallback 1 · unknown 1 · policy not-applicable · direct ENOENT 1');
assert.ok(diagnostics.includes('Bridge CLI launcher: ${bridgeCliLauncherText(bridgeDiag.snapshotPerformance)}'));
assert.ok(latest.includes('Bridge CLI launcher:'));

// P25 and all source-fidelity constraints remain frozen.
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
assert.ok(workflow.includes('concurrency:\n  group: repo-main-write'));
assert.ok(workflow.includes('check_release_monotonic.py'));

(async () => {
  calls.length = 0;
  mode = 'direct';
  const direct = await processContext.runCliProcess(['credits','--json'], {SAFE:'1'});
  assert.equal(direct.stdout, '{}');
  assert.deepEqual(calls.map(item => item.program), ['llmgateway']);
  assert.deepEqual(capturedMeta, {launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'});

  calls.length = 0;
  mode = 'enoent';
  const fallback = await processContext.runCliProcess(['credits','--json'], {SAFE:'1'});
  assert.equal(fallback.stdout, '{}');
  assert.deepEqual(calls.map(item => item.program), ['llmgateway','npx']);
  assert.deepEqual(calls[1].args, ['--yes','--prefer-offline','@llmgateway/cli@1.9.0','credits','--json']);
  assert.deepEqual(capturedMeta, {launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'prefer-offline'});

  calls.length = 0;
  mode = 'failure';
  await assert.rejects(() => processContext.runCliProcess(['credits','--json']), /direct failed/);
  assert.deepEqual(calls.map(item => item.program), ['llmgateway'], 'non-ENOENT direct failures must never fall back to npx');
  assert.deepEqual(capturedMeta, {launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'});

  console.log('P26 Foreground CLI Launcher Attribution: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
