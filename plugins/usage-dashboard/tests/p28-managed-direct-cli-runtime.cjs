const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const latest = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflow = fs.readFileSync('.github/workflows/reusable-usage-dashboard-release.yml', 'utf8');
const workflowCaller = fs.readFileSync('.github/workflows/stage-usage-dashboard-566-managed-direct-cli-runtime.yml', 'utf8');
const materializer = fs.readFileSync('plugins/usage-dashboard/tools/release_managed_direct_cli_runtime_566.py', 'utf8');

assert.match(engine, /const VERSION = '1\.6\.19';/);
assert.match(manager, /const MANAGER_VERSION = '1\.3\.0';/);
assert.match(manager, /const PRODUCT_VERSION = '3\.0\.0-alpha\.5\.66';/);
assert.match(manager, /const BUNDLED_ENGINE_VERSION = '1\.6\.19';/);
assert.equal(manifest.productVersion, '3.0.0-alpha.5.66');
assert.equal(manifest.components.bridge.requiredVersion, '1.6.19');
assert.equal(manifest.components.bridgeManager.version, '1.3.0');
assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});
assert.ok(latest.includes('//@version 3.0.0-alpha.5.66'));

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliOccurrences - runCliDefinitions, 5, 'P28 must keep exactly five source call sites');
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1, 'Engine keeps one subprocess boundary');
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2,/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);

const processStart = engine.indexOf('async function runCliProcess(');
const processEnd = engine.indexOf('\nasync function runCli(', processStart);
const processSource = engine.slice(processStart, processEnd);
const managedAt = processSource.indexOf("launcherMeta.launcher = 'managed-direct'");
const directAt = processSource.indexOf("runProgram('llmgateway', args, extraEnv)");
const enoentAt = processSource.indexOf("if (error?.code !== 'ENOENT') throw error;");
const npxAt = processSource.indexOf("runProgram('npx', npxArgs, extraEnv)");
assert.ok(managedAt >= 0 && directAt > managedAt && enoentAt > directAt && npxAt > enoentAt);
assert.ok(processSource.includes('return runProgram(process.execPath, [managed.entry, ...args], extraEnv);'));

async function exercise(runtime, directMode = 'success', preferOffline = true) {
  const calls = [];
  let capturedMeta = null;
  const context = {
    process:{execPath:'/safe/node'},
    NPX_PREFER_OFFLINE:preferOffline,
    CLI_VERSION:'1.9.0',
    managedCliRuntime:async () => runtime,
    cliOperationLabel:() => 'credits',
    withCliSlot:async (_label, task, meta) => {
      try { return await task(); }
      finally { capturedMeta = {...meta}; }
    },
    runProgram:async (program, args, env) => {
      calls.push({program,args:[...args],env:{...env}});
      if (program === '/safe/node' && directMode === 'managed-failure') throw new Error('managed failed');
      if (program === 'llmgateway' && directMode === 'enoent') {
        const error = new Error('missing'); error.code = 'ENOENT'; throw error;
      }
      if (program === 'llmgateway' && directMode === 'direct-failure') {
        const error = new Error('direct failed'); error.code = 'EACCES'; throw error;
      }
      return {stdout:'{}'};
    },
  };
  vm.createContext(context);
  vm.runInContext(`${processSource}\nthis.runCliProcess = runCliProcess;`, context);
  const invoke = () => context.runCliProcess(['credits','--json'], {SAFE:'1'});
  if (directMode.endsWith('failure')) await assert.rejects(invoke);
  else await invoke();
  return {calls,capturedMeta};
}

(async () => {
const managed = await exercise({state:'ready',version:'1.9.0',provisioning:'ok',entry:'/runtime/cli.js'});
assert.deepEqual(managed.calls.map(call => call.program), ['/safe/node']);
assert.equal(managed.capturedMeta.launcher, 'managed-direct');
const managedFailure = await exercise({state:'ready',version:'1.9.0',provisioning:'ok',entry:'/runtime/cli.js'}, 'managed-failure');
assert.deepEqual(managedFailure.calls.map(call => call.program), ['/safe/node'], 'managed execution failure must not replay');
const direct = await exercise({state:'unavailable',version:'',provisioning:'backoff',entry:null});
assert.deepEqual(direct.calls.map(call => call.program), ['llmgateway']);
const fallback = await exercise({state:'invalid',version:'',provisioning:'unavailable',entry:null}, 'enoent');
assert.deepEqual(fallback.calls.map(call => call.program), ['llmgateway','npx']);
assert.deepEqual(fallback.calls[1].args, ['--yes','--prefer-offline','@llmgateway/cli@1.9.0','credits','--json']);
const directFailure = await exercise({state:'unavailable',version:'',provisioning:'backoff',entry:null}, 'direct-failure');
assert.deepEqual(directFailure.calls.map(call => call.program), ['llmgateway']);

assert.match(engine, /DEVPASS_BRIDGE_MANAGED_CLI \|\| '1'/);
assert.match(manager, /DEVPASS_BRIDGE_MANAGED_CLI \|\| '1'/);
assert.match(manager, /const MANAGED_CLI_PACKAGE = '@llmgateway\/cli';/);
assert.match(manager, /const MANAGED_CLI_VERSION = '1\.9\.0';/);
assert.match(manager, /const MANAGED_CLI_RETRY_MS = 30 \* 60 \* 1000;/);
assert.ok(manager.includes("spawn('npm', ['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=true']"));
assert.ok(manager.includes("path.join(MANAGED_CLI_ROOT, `cli-next-${process.pid}-${Date.now()}`)"));
assert.ok(manager.includes("fs.renameSync(stage, MANAGED_CLI_VERSION_ROOT)"));
assert.ok(manager.includes("fs.realpathSync(String(descriptor.entry || ''))"));
assert.ok(manager.includes("setImmediate(() => { scheduleManagedCliProvisioning(); });"));

const statusStart = manager.indexOf("if (req.method === 'GET' && url.pathname === '/status')");
const statusEnd = manager.indexOf("if (req.method === 'POST' && url.pathname === '/sync')", statusStart);
const statusSource = manager.slice(statusStart, statusEnd);
assert.ok(!/scheduleManagedCliProvisioning|provisionManagedCli|runNpmInstall|spawn\('npm'/.test(statusSource), 'status must never provision');

const verifyStart = manager.indexOf('function pathInside(');
const verifyEnd = manager.indexOf('function managedCliRuntimeStatus(', verifyStart);
const verifySource = manager.slice(verifyStart, verifyEnd)
  .replace(/function atomicJsonWrite[\s\S]*?(?=function readManagedCliState)/, '')
  .replace(/function readManagedCliState[\s\S]*?(?=function writeManagedCliState)/, '')
  .replace(/function writeManagedCliState[\s\S]*?(?=function resolveManagedCliBin)/, '');
const verifyContext = {fs,path,MANAGED_CLI_PACKAGE:'@llmgateway/cli',MANAGED_CLI_VERSION:'1.9.0'};
vm.createContext(verifyContext);
vm.runInContext(`${verifySource}\nthis.verifyManagedCliDirectory = verifyManagedCliDirectory;`, verifyContext);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'p28-managed-cli-'));
try {
  const packageRoot = path.join(fixture, 'node_modules', '@llmgateway', 'cli');
  fs.mkdirSync(path.join(packageRoot, 'dist'), {recursive:true});
  fs.writeFileSync(path.join(packageRoot, 'package.json'), JSON.stringify({name:'@llmgateway/cli',version:'1.9.0',bin:{llmgateway:'dist/cli.js'}}));
  fs.writeFileSync(path.join(packageRoot, 'dist', 'cli.js'), '#!/usr/bin/env node\n');
  assert.equal(verifyContext.verifyManagedCliDirectory(fixture), fs.realpathSync(path.join(packageRoot, 'dist', 'cli.js')));
  const outside = path.join(os.tmpdir(), `p28-outside-${process.pid}.js`);
  fs.writeFileSync(outside, '');
  fs.unlinkSync(path.join(packageRoot, 'dist', 'cli.js'));
  fs.symlinkSync(outside, path.join(packageRoot, 'dist', 'cli.js'));
  assert.throws(() => verifyContext.verifyManagedCliDirectory(fixture), /escaped runtime root/);
  fs.unlinkSync(outside);
} finally { fs.rmSync(fixture, {recursive:true,force:true}); }

assert.ok(diagnostics.includes("['managed-direct','direct','npx-fallback']"));
assert.ok(diagnostics.includes('Bridge CLI runtime: ${bridgeCliRuntimeText'));
assert.ok(!/npm cache path|raw npm error/.test(diagnostics));
assert.ok(guidelines.includes('Current release implementation: `3.0.0-alpha.5.66 — Managed Direct CLI Runtime`'));
assert.ok(guidelines.includes('once the managed command starts, its success or failure is authoritative'));
assert.ok(workflow.includes('concurrency:\n  group: repo-main-write'));
assert.ok(workflow.includes('check_release_monotonic.py'));
assert.ok(workflow.includes('p28-managed-direct-cli-runtime.cjs'));
assert.ok(workflowCaller.includes('uses: ./.github/workflows/reusable-usage-dashboard-release.yml'));
assert.ok(workflowCaller.includes('publish: false'));
assert.ok(materializer.includes("BASE_VERSION = '3.0.0-alpha.5.65'"));
assert.ok(materializer.includes("TARGET_VERSION = '3.0.0-alpha.5.66'"));

console.log('P28 Managed Direct CLI Runtime: OK');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
