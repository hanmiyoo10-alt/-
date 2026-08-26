'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {performance} = require('node:perf_hooks');

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[index].toFixed(3));
}

function summarize(values) {
  return {
    count: values.length,
    minMs: Number(Math.min(...values).toFixed(3)),
    p50Ms: percentile(values, 50),
    p95Ms: percentile(values, 95),
    maxMs: Number(Math.max(...values).toFixed(3)),
  };
}

function directoryFacts(root) {
  const canonical = fs.realpathSync(root);
  let files = 0;
  let directories = 0;
  let symlinks = 0;
  let bytes = 0;
  const stack = [canonical];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, {withFileTypes:true})) {
      const absolute = path.join(current, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        symlinks += 1;
        continue;
      }
      if (stat.isDirectory()) {
        directories += 1;
        stack.push(absolute);
        continue;
      }
      if (stat.isFile()) {
        files += 1;
        bytes += stat.size;
      }
    }
  }
  return {root:canonical, files, directories, symlinks, bytes};
}

function resolveCliEntry(packageRoot, packageJson) {
  let bin = '';
  if (typeof packageJson.bin === 'string') bin = packageJson.bin;
  else if (packageJson.bin && typeof packageJson.bin === 'object') {
    bin = packageJson.bin.llmgateway || packageJson.bin.lg || Object.values(packageJson.bin).find((value) => typeof value === 'string') || '';
  }
  if (!bin) fail('CLI_BIN_MISSING');
  const entry = fs.realpathSync(path.resolve(packageRoot, bin));
  const relative = path.relative(packageRoot, entry);
  if (relative.startsWith('..') || path.isAbsolute(relative)) fail('CLI_ENTRY_ESCAPED_ROOT', entry);
  return entry;
}

function packageGraphFacts(root) {
  const packageLock = path.join(root, 'package-lock.json');
  if (!fs.existsSync(packageLock)) return {lockfile:false, packages:null};
  const lock = JSON.parse(fs.readFileSync(packageLock, 'utf8'));
  const keys = lock && typeof lock.packages === 'object' && lock.packages ? Object.keys(lock.packages) : [];
  return {lockfile:true, packages:keys.filter((key) => key && key.startsWith('node_modules/')).length};
}

function cliFootprint(root, options = {}) {
  const canonical = fs.realpathSync(root);
  const packageRoot = fs.realpathSync(path.join(canonical, 'node_modules', '@llmgateway', 'cli'));
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (packageJson.name !== '@llmgateway/cli') fail('CLI_PACKAGE_IDENTITY_MISMATCH', String(packageJson.name || ''));
  if (options.expectedVersion && packageJson.version !== options.expectedVersion) fail('CLI_VERSION_MISMATCH', `${packageJson.version}:expected=${options.expectedVersion}`);
  const entry = resolveCliEntry(packageRoot, packageJson);
  const footprint = directoryFacts(canonical);
  const graph = packageGraphFacts(canonical);
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-cli-audit-home-'));
  const started = performance.now();
  const probe = spawnSync(process.execPath, [entry, '--help'], {
    encoding:'utf8',
    timeout:Number(options.timeoutMs || 15_000),
    env:{...process.env, HOME:home, NO_COLOR:'1', FORCE_COLOR:'0'},
  });
  const coldStartMs = Number((performance.now() - started).toFixed(3));
  fs.rmSync(home, {recursive:true,force:true});
  if (probe.error) fail('CLI_COLD_START_FAILED', probe.error.code || probe.error.message);
  if (probe.status !== 0) fail('CLI_COLD_START_EXIT', String(probe.status));
  return {
    schemaVersion:1,
    audit:'NV-CLI-FOOTPRINT',
    package:packageJson.name,
    version:packageJson.version,
    installedBytes:footprint.bytes,
    installedFiles:footprint.files,
    installedDirectories:footprint.directories,
    symlinks:footprint.symlinks,
    dependencyGraphPackages:graph.packages,
    lockfileObserved:graph.lockfile,
    coldStartHelpMs:coldStartMs,
    measuredAt:new Date().toISOString(),
    environment:{platform:process.platform,arch:process.arch,node:process.version},
  };
}

function localCostMap(options = {}) {
  const iterations = Math.max(5, Number(options.iterations || 40));
  const fixture = options.fixture || {
    updatedAt:1700000000000,
    modules:{credits:{status:'fresh',organizations:[{id:'fixture',credits:100}]}},
    recentRequests:Array.from({length:100}, (_, index) => ({id:`r-${index}`,model:'fixture/model',totalTokens:index + 1,totalCost:(index + 1) / 1000})),
  };
  const fixtureText = JSON.stringify(fixture);
  const parseTimes = [];
  const transformTimes = [];
  const renderTimes = [];
  const persistTimes = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-local-cost-'));
  const target = path.join(dir, 'snapshot.json');
  try {
    for (let i = 0; i < iterations; i += 1) {
      let started = performance.now();
      const parsed = JSON.parse(fixtureText);
      parseTimes.push(performance.now() - started);

      started = performance.now();
      const transformed = [...parsed.recentRequests]
        .map((row) => ({...row,totalTokens:Number(row.totalTokens || 0),totalCost:Number(row.totalCost || 0)}))
        .sort((a, b) => b.totalTokens - a.totalTokens);
      transformTimes.push(performance.now() - started);

      started = performance.now();
      const rendered = JSON.stringify({...parsed,recentRequests:transformed});
      renderTimes.push(performance.now() - started);

      started = performance.now();
      const next = `${target}.next`;
      fs.writeFileSync(next, rendered, {mode:0o600});
      fs.renameSync(next, target);
      JSON.parse(fs.readFileSync(target, 'utf8'));
      persistTimes.push(performance.now() - started);
    }
  } finally {
    fs.rmSync(dir, {recursive:true,force:true});
  }
  return {
    schemaVersion:1,
    audit:'NV-LOCAL-COST-MAP',
    iterations,
    fixtureRows:fixture.recentRequests.length,
    parse:summarize(parseTimes),
    transform:summarize(transformTimes),
    render:summarize(renderTimes),
    atomicPersistReadback:summarize(persistTimes),
    note:'Observational timing only. No pass/fail performance threshold is inferred from CI-host measurements.',
    measuredAt:new Date().toISOString(),
    environment:{platform:process.platform,arch:process.arch,node:process.version},
  };
}

function writeResult(value, output) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), {recursive:true});
    fs.writeFileSync(output, text);
  }
  process.stdout.write(text);
}

function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  const arg = (name, fallback = '') => {
    const index = rest.indexOf(name);
    return index >= 0 && index + 1 < rest.length ? rest[index + 1] : fallback;
  };
  if (command === 'cli-footprint') {
    const root = arg('--root');
    if (!root) fail('CLI_ROOT_REQUIRED');
    return writeResult(cliFootprint(root, {expectedVersion:arg('--expected-version')}), arg('--output'));
  }
  if (command === 'local-cost') {
    return writeResult(localCostMap({iterations:Number(arg('--iterations', '40'))}), arg('--output'));
  }
  fail('UNKNOWN_COMMAND', String(command || ''));
}

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || error); process.exit(1); }
}

module.exports = {cliFootprint, localCostMap, directoryFacts, summarize};
