const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/stage-usage-dashboard-565-npx-cache-first-launcher.yml', 'utf8');

assert.match(engine, /const VERSION = '1\.6\.18';/);
assert.match(manager, /const MANAGER_VERSION = '1\.2\.6';/);
assert.match(manager, /const PRODUCT_VERSION = '3\.0\.0-alpha\.5\.65';/);
assert.match(manager, /const BUNDLED_ENGINE_VERSION = '1\.6\.18';/);
assert.equal(manifest.productVersion, '3.0.0-alpha.5.65');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.18');
assert.equal(manifest.components.bridgeManager.version, '1.2.6');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.ok(latest.includes('//@version 3.0.0-alpha.5.65'));

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliDefinitions, 1);
assert.equal(runCliOccurrences - runCliDefinitions, 5, '5.65 must keep exactly five runCli call sites');
const runProgramOccurrences = (engine.match(/\brunProgram\(/g) || []).length;
const runProgramDefinitions = (engine.match(/async function runProgram\(/g) || []).length;
assert.equal(runProgramDefinitions, 1);
assert.equal(runProgramOccurrences - runProgramDefinitions, 2, 'direct and npx must remain the only runProgram call sites');
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1, 'runProgram must remain the only execFileAsync source operation');
assert.match(engine, /const NPX_PREFER_OFFLINE = String\(process\.env\.DEVPASS_BRIDGE_NPX_PREFER_OFFLINE \|\| '1'\) !== '0';/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);

const processStart = engine.indexOf('async function runCliProcess(');
const processEnd = engine.indexOf('\nasync function runCli(', processStart);
assert.ok(processStart >= 0 && processEnd > processStart);
const processSource = engine.slice(processStart, processEnd);
const directAt = processSource.indexOf("runProgram('llmgateway', args, extraEnv)");
const enoentAt = processSource.indexOf("if (error?.code !== 'ENOENT') throw error;");
const argsAt = processSource.indexOf('const npxArgs = NPX_PREFER_OFFLINE');
const fallbackAt = processSource.indexOf("runProgram('npx', npxArgs, extraEnv)");
assert.ok(directAt >= 0 && enoentAt > directAt && argsAt > enoentAt && fallbackAt > argsAt);
assert.ok(processSource.includes("['--yes', '--prefer-offline', `@llmgateway/cli@${CLI_VERSION}`, ...args]"));
assert.ok(processSource.includes("['--yes', `@llmgateway/cli@${CLI_VERSION}`, ...args]"));

async function exercise(preferOffline, mode) {
  const calls = [];
  let capturedMeta = null;
  const context = {
    CLI_VERSION: '1.9.0',
    NPX_PREFER_OFFLINE: preferOffline,
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
  vm.createContext(context);
  vm.runInContext(`${processSource}\nthis.runCliProcess = runCliProcess;`, context);
  if (mode === 'failure') {
    await assert.rejects(() => context.runCliProcess(['credits','--json']), /direct failed/);
  } else {
    await context.runCliProcess(['credits','--json'], {SAFE:'1'});
  }
  return {calls,capturedMeta};
}

const diagStart = diagnostics.indexOf('  function bridgeCliOperationsText(');
const diagEnd = diagnostics.indexOf('\n  function bridgeCreditsEarlyStartText(', diagStart);
assert.ok(diagStart >= 0 && diagEnd > diagStart);
const diagSource = diagnostics.slice(diagStart, diagEnd);
assert.ok(diagSource.includes("['prefer-offline','default']"));
assert.ok(diagSource.includes("'not-applicable'"));
assert.ok(!/process\.env|extraEnv|executable|CLI_VERSION|\.args\b/.test(diagSource));
const diagContext = {Array,Number,String,Math,Set};
vm.createContext(diagContext);
vm.runInContext(`${diagSource}\nthis.launcherText = bridgeCliLauncherText;`, diagContext);
assert.equal(diagContext.launcherText({cliOperations:[
  {launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'},
  {launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'prefer-offline'},
]}), 'direct 1 · npx-fallback 1 · unknown 0 · policy prefer-offline · direct ENOENT 1');
assert.equal(diagContext.launcherText({cliOperations:[
  {launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'raw-policy'},
]}), 'direct 0 · npx-fallback 1 · unknown 0 · policy not-applicable · direct ENOENT 1');

assert.ok(!/runProgram\(['"]npm['"]/.test(engine));
assert.ok(!/npm\s+(?:install|cache)\b/i.test(engine));
assert.ok(!/npm_config_cache|\.npm\/_npx|which\s+llmgateway|version\s+probe/i.test(engine));
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2, Number\(process\.env\.DEVPASS_BRIDGE_CLI_CONCURRENCY \|\| 2\)\)\);/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);
assert.ok(!/usageForOrg\([^\n]*'24h'[^\n]*deferExpired:true/.test(engine));

assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.65 — Npx Cache-First Launcher`'));
assert.ok(guidelines.includes('`DEVPASS_BRIDGE_NPX_PREFER_OFFLINE=0` restores the exact 5.64 fallback'));
assert.ok(guidelines.includes('5.65 makes no guaranteed performance claim'));
assert.ok(workflow.includes('concurrency:\n  group: repo-main-write'));
assert.ok(workflow.includes('check_release_monotonic.py'));

(async () => {
  const direct = await exercise(true, 'direct');
  assert.deepEqual(direct.calls.map(item => item.program), ['llmgateway']);
  assert.deepEqual(direct.capturedMeta, {launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'});

  const preferred = await exercise(true, 'enoent');
  assert.deepEqual(preferred.calls.map(item => item.program), ['llmgateway','npx']);
  assert.deepEqual(preferred.calls[1].args, ['--yes','--prefer-offline','@llmgateway/cli@1.9.0','credits','--json']);
  assert.deepEqual(preferred.capturedMeta, {launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'prefer-offline'});

  const rollback = await exercise(false, 'enoent');
  assert.deepEqual(rollback.calls.map(item => item.program), ['llmgateway','npx']);
  assert.deepEqual(rollback.calls[1].args, ['--yes','@llmgateway/cli@1.9.0','credits','--json']);
  assert.deepEqual(rollback.capturedMeta, {launcher:'npx-fallback',fallbackReason:'direct-enoent',npxPolicy:'default'});

  const failure = await exercise(true, 'failure');
  assert.deepEqual(failure.calls.map(item => item.program), ['llmgateway']);
  assert.deepEqual(failure.capturedMeta, {launcher:'direct',fallbackReason:'none',npxPolicy:'not-applicable'});

  console.log('P27 Npx Cache-First Launcher: OK');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
