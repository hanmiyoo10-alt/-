const fs = require('node:fs');
const assert = require('node:assert/strict');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
const engine = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-engine.mjs', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const diagnostics = fs.readFileSync('plugins/usage-dashboard/src/40-diagnostics.part.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');
const workflowCaller = fs.readFileSync(currentRelease.callerWorkflow, 'utf8');

assert.deepEqual(manifest.contracts, {snapshot:1,recentRequest:1});

const runCliOccurrences = (engine.match(/\brunCli\(/g) || []).length;
const runCliDefinitions = (engine.match(/async function runCli\(/g) || []).length;
assert.equal(runCliOccurrences - runCliDefinitions, 5);
assert.equal((engine.match(/\bexecFileAsync\(/g) || []).length, 1);
assert.match(engine, /const CLI_CONCURRENCY = Math\.max\(1, Math\.min\(2,/);
assert.match(engine, /timeout: 25_000/);
assert.match(engine, /maxBuffer: 4 \* 1024 \* 1024/);
assert.match(engine, /const SECONDARY_REFRESH_CONCURRENCY = 1;/);
assert.match(engine, /const SECONDARY_REFRESH_MAX_KEYS = 32;/);
assert.match(engine, /const CACHE_STALE_MAX_MS = 30 \* 60_000;/);

const managedAt = engine.indexOf("launcherMeta.launcher = 'managed-direct'");
const directAt = engine.indexOf("runProgram('llmgateway', args, extraEnv)", managedAt);
const enoentAt = engine.indexOf("if (error?.code !== 'ENOENT') throw error;", directAt);
const npxAt = engine.indexOf("runProgram('npx', npxArgs, extraEnv)", enoentAt);
assert.ok(managedAt >= 0 && directAt > managedAt && enoentAt > directAt && npxAt > enoentAt);
assert.ok(engine.includes('return runProgram(process.execPath, [managed.entry, ...args], extraEnv);'));
assert.match(engine, /DEVPASS_BRIDGE_MANAGED_CLI \|\| '1'/);

assert.match(manager, /DEVPASS_BRIDGE_MANAGED_CLI \|\| '1'/);
assert.match(manager, /const MANAGED_CLI_PACKAGE = '@llmgateway\/cli';/);
const engineCliVersion = engine.match(/const CLI_VERSION = process\.env\.LLMGATEWAY_CLI_VERSION \|\| '([^']+)';/)?.[1] || '';
const managerCliVersion = manager.match(/const MANAGED_CLI_VERSION = '([^']+)';/)?.[1] || '';
assert.ok(engineCliVersion, 'Engine managed CLI version must remain explicit');
assert.equal(managerCliVersion, engineCliVersion, 'Manager managed CLI version must track the Engine managed CLI target');
assert.match(manager, /const MANAGED_CLI_RETRY_MS = 30 \* 60 \* 1000;/);
assert.ok(manager.includes("spawn('npm', ['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=true']"));
assert.ok(manager.includes("path.join(MANAGED_CLI_ROOT, `cli-next-${process.pid}-${Date.now()}`)"));
assert.ok(manager.includes('fs.renameSync(stage, MANAGED_CLI_VERSION_ROOT)'));
assert.ok(manager.includes("if (packageJson?.name !== MANAGED_CLI_PACKAGE || packageJson?.version !== MANAGED_CLI_VERSION) throw new Error("), 'managed CLI package name/version verifier must remain fail-closed');
assert.ok(manager.includes("if (!pathInside(rootReal, packageReal)) throw new Error('managed CLI package escaped runtime root')"));
assert.ok(manager.includes("if (!pathInside(packageReal, entry) || !pathInside(rootReal, entry)) throw new Error('managed CLI entry escaped runtime root')"));
assert.ok(manager.includes("if (!fs.statSync(entry).isFile()) throw new Error('managed CLI entry is not a file')"));
assert.ok(manager.includes("fs.realpathSync(String(descriptor.entry || ''))"));
assert.ok(manager.includes("if (req.method === 'GET' && url.pathname === '/status')"));
assert.equal((manager.match(/scheduleManagedCliProvisioning\(\)/g) || []).length, 2, 'one definition and one startup schedule remain');
assert.ok(manager.includes('setImmediate(() => { scheduleManagedCliProvisioning(); });'));

assert.ok(diagnostics.includes("['managed-direct','direct','npx-fallback']"));
assert.ok(diagnostics.includes('Bridge CLI runtime: ${bridgeCliRuntimeText'));
assert.ok(!/npm cache path|raw npm error/.test(diagnostics));
assert.ok(guidelines.includes(currentRelease.currentMemory));
assert.ok(guidelines.includes('once the managed command starts, its success or failure is authoritative'));
assert.ok(workflowCaller.includes(`uses: ./${currentRelease.validatorWorkflow}`));
assert.ok(!workflowCaller.includes('release_spec:'));
assert.ok(!workflowCaller.includes('publish: true'));
assert.ok(workflowCaller.includes('contents: read'));
assert.ok(!workflowCaller.includes(currentRelease.productVersion));

console.log('P28 Managed Direct CLI Runtime: OK · provisioning invariants + Engine/Manager managed pin parity retained; managed/direct/npx behavior delegated to black-box Engine harness');
