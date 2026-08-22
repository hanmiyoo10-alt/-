const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();
(async () => {
  const root = 'plugins/usage-dashboard';
  const source = fs.readFileSync(`${root}/latest.js`, 'utf8');
  const core = fs.readFileSync(`${root}/src/00-runtime-core.part.js`, 'utf8');
  const diagnostics = fs.readFileSync(`${root}/src/40-diagnostics.part.js`, 'utf8');
  const engine = fs.readFileSync(`${root}/runtime/bridge-engine.mjs`, 'utf8');
  const manager = fs.readFileSync(`${root}/runtime/bridge-manager.cjs`, 'utf8');
  const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));
  const guidelines = fs.readFileSync('docs/USAGE_DASHBOARD_GUIDELINES.md', 'utf8');


  // Measurement-only contract: freeze the 5.58 behavior/safety envelope.
  assert.ok(engine.includes("const CLI_CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.DEVPASS_BRIDGE_CLI_CONCURRENCY || 2)));"));
  assert.ok(!engine.includes('DEVPASS_BRIDGE_CLI_CONCURRENCY || 3'));
  assert.ok(engine.includes('timeout: 25_000'));
  assert.ok(engine.includes('accountCapture: 30_000'));
  assert.ok(engine.includes("'activity:24h': 60_000"));
  assert.ok(engine.includes("'activity:7d': 300_000"));
  assert.ok(engine.includes("'activity:30d': 600_000"));
  assert.ok(engine.includes('const CACHE_STALE_MAX_MS = 30 * 60_000'));
  assert.ok(engine.includes("cached('accountCapture', async () => captureAccountDetailsViaCliSession('24h'))"));
  assert.ok(engine.includes('captured = await loadAccountCapture()'));
  assert.ok(engine.includes('dedicated24hFallbacks += 1'));
  assert.ok(engine.includes("discoveryMode = 'capture-primary'"));
  assert.ok(engine.includes("discoveryMode = 'plain-orgs-fallback'"));
  assert.ok(engine.includes("No organizations found in CLI output"));

  // Root scheduling is intentionally unchanged in 5.59.
  const rootAwait = "const orgsResult = await Promise.allSettled([timedSnapshotTask('organizations', () => loadOrgs())]);";
  const jobsStart = 'const jobs = [';
  assert.ok(engine.includes(rootAwait));
  assert.ok(engine.indexOf(rootAwait) < engine.indexOf(jobsStart, engine.indexOf(rootAwait)));

  // Task timeline lives inside the existing per-snapshot attribution context.
  assert.ok(engine.includes('taskTimeline: Object.create(null)'));
  assert.ok(engine.includes('cliOperations: []'));
  assert.ok(engine.includes('startOffsetMs'));
  assert.ok(engine.includes('endOffsetMs'));
  assert.ok(engine.includes('durationMs'));

  const taskStart = engine.indexOf('async function timedSnapshotTask(name, task) {');
  const taskEnd = engine.indexOf('\n\nfunction cliOperationLabel', taskStart);
  assert.ok(taskStart >= 0 && taskEnd > taskStart, 'timedSnapshotTask must be extractable');
  const taskBlock = engine.slice(taskStart, taskEnd);
  let taskNow = [1000, 1300];
  const taskAttribution = { startedAt:900, tasks:Object.create(null), taskTimeline:Object.create(null) };
  const taskContext = {
    Date: { now: () => taskNow.shift() },
    currentSnapshotAttribution: () => taskAttribution,
    Math,
    Number,
    String,
  };
  vm.createContext(taskContext);
  vm.runInContext(`${taskBlock}\nthis.timedSnapshotTask = timedSnapshotTask;`, taskContext);
  const taskValue = await taskContext.timedSnapshotTask('organizations', async () => 'ok');
  assert.equal(taskValue, 'ok');
  assert.equal(taskAttribution.tasks.organizations, 300);
  assert.equal(taskAttribution.taskTimeline.organizations.startOffsetMs, 100);
  assert.equal(taskAttribution.taskTimeline.organizations.endOffsetMs, 400);
  assert.equal(taskAttribution.taskTimeline.organizations.durationMs, 300);

  // CLI operation timeline is bounded and stores timing plus sanitized label only.
  const opStart = engine.indexOf('function noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta = null) {');
  const opEnd = engine.indexOf('\n\nfunction snapshotAttributionSummary', opStart);
  assert.ok(opStart >= 0 && opEnd > opStart, 'CLI operation recorder must be extractable');
  const opBlock = engine.slice(opStart, opEnd);
  const cliAttribution = { startedAt:1000, cliOperations:[] };
  const opContext = {
    currentSnapshotAttribution: () => cliAttribution,
    Date: { now: () => 9999 },
    Array,
    Math,
    Number,
    String,
  };
  vm.createContext(opContext);
  vm.runInContext(`${opBlock}\nthis.noteSnapshotCliOperation = noteSnapshotCliOperation;`, opContext);
  for (let i = 0; i < 10; i += 1) {
    opContext.noteSnapshotCliOperation(`usage-${i}-model`, 1100 + i * 10, 1120 + i * 10, 1220 + i * 10);
  }
  assert.equal(cliAttribution.cliOperations.length, 8, 'operation timeline must be bounded to 8 entries');
  assert.deepEqual(
    Object.keys(cliAttribution.cliOperations[0]).sort(),
    ['endOffsetMs','executionMs','executionStartOffsetMs','fallbackReason','label','launcher','npxPolicy','queueWaitMs','startOffsetMs'].sort(),
  );
  assert.equal(cliAttribution.cliOperations[0].startOffsetMs, 100);
  assert.equal(cliAttribution.cliOperations[0].executionStartOffsetMs, 120);
  assert.equal(cliAttribution.cliOperations[0].endOffsetMs, 220);
  assert.equal(cliAttribution.cliOperations[0].queueWaitMs, 20);
  assert.equal(cliAttribution.cliOperations[0].executionMs, 100);

  // The recorder is passive: it must not launch any CLI/network work itself.
  assert.ok(!opBlock.includes('runCli('));
  assert.ok(!opBlock.includes('runCliProcess('));
  assert.ok(!opBlock.includes('fetch('));
  assert.ok(engine.includes('noteSnapshotCliOperation(label, queuedAt, executionStartedAt, endedAt, launcherMeta)'));

  // Existing sanitizer remains the only source of operation labels.
  const labelStart = engine.indexOf('function cliOperationLabel(args, extraEnv = {}) {');
  const labelEnd = engine.indexOf('\n\nfunction noteSnapshotCliTiming', labelStart);
  const labelBlock = engine.slice(labelStart, labelEnd);
  const labelContext = {};
  vm.createContext(labelContext);
  vm.runInContext(`${labelBlock}\nthis.cliOperationLabel = cliOperationLabel;`, labelContext);
  const secretOrg = 'TEST_ORG_ID_DO_NOT_LOG';
  const sanitized = labelContext.cliOperationLabel(['usage','--org',secretOrg,'--by','model','--range','7d','--json'], {});
  assert.equal(sanitized, 'usage-7d-model');
  assert.ok(!sanitized.includes(secretOrg));

  // Summary copies timeline data without exposing mutable internal references.
  const summaryStart = engine.indexOf('function snapshotAttributionSummary(attribution) {');
  const summaryEnd = engine.indexOf('\n\nasync function withCliSlot', summaryStart);
  assert.ok(summaryStart >= 0 && summaryEnd > summaryStart, 'summary helper must be extractable');
  const summaryBlock = engine.slice(summaryStart, summaryEnd);
  const summaryContext = { Date:{now:()=>2000}, CLI_CONCURRENCY:2, Number, Object, Array, Math, String, secondaryRefreshSnapshot:()=>({}) };
  vm.createContext(summaryContext);
  vm.runInContext(`${summaryBlock}\nthis.snapshotAttributionSummary = snapshotAttributionSummary;`, summaryContext);
  const summary = summaryContext.snapshotAttributionSummary({
    startedAt:1000,
    tasks:{organizations:300,usageScopes:400},
    taskTimeline:{
      organizations:{startOffsetMs:0,endOffsetMs:300,durationMs:300},
      usageScopes:{startOffsetMs:300,endOffsetMs:700,durationMs:400},
    },
    cliOperations:[{label:'devpass-capture-24h',startOffsetMs:0,executionStartOffsetMs:0,endOffsetMs:300,queueWaitMs:0,executionMs:300}],
    organizationDiscovery:null,
    captureReuse:null,
    cache:{hits:0,misses:0,joins:0,loads:0,errors:0,staleFallbacks:0},
    circuits:{opens:0,blocked:0,recoveries:0},
    cli:{runs:1,queuedRuns:0,queueWaitTotalMs:0,queueWaitMaxMs:0,executionTotalMs:300,executionMaxMs:300,maxActive:1,slowestLabel:'devpass-capture-24h',slowestTotalMs:300},
  });
  assert.equal(summary.taskTimeline.organizations.endOffsetMs, 300);
  assert.equal(summary.cliOperations.length, 1);
  assert.equal(summary.cliOperations[0].label, 'devpass-capture-24h');
  assert.equal(summary.cli.queueWaitAvgMs, null);

  // Diagnostics are bounded and sanitized; no secret-bearing internals are added.
  assert.ok(diagnostics.includes('function bridgeSnapshotTimelineText(performance)'));
  assert.ok(diagnostics.includes('function bridgeCliOperationsText(performance)'));
  assert.ok(diagnostics.includes('Bridge snapshot timeline:'));
  assert.ok(diagnostics.includes('Bridge CLI operations:'));
  assert.ok(diagnostics.includes('.slice(0, 8)'));
  for (const forbidden of [
    'DEVPASS_BRIDGE_CAPTURE_FILE',
    'captureFile',
    'rawArgs',
    'commandOutput',
    'authorization',
  ]) assert.ok(!diagnostics.includes(forbidden), `diagnostics must not expose ${forbidden}`);

  // Fidelity/recovery contracts stay frozen.
  assert.ok(diagnostics.includes('parser provider-usage-v3'));
  assert.ok(diagnostics.includes('unknown stays unknown'));
  assert.ok(diagnostics.includes('missing Write/TTL is never inferred from price/provider'));
  assert.ok(diagnostics.includes('active local errors'));
  assert.ok(diagnostics.includes('Bridge 24h capture reuse:'));
  assert.ok(diagnostics.includes('Bridge organization discovery:'));
  assert.ok(diagnostics.includes('Bridge snapshot attribution:'));
  assert.ok(diagnostics.includes('Bridge CLI timing:'));

  assert.ok(guidelines.includes(currentRelease.verifiedBaseline));
  assert.ok(guidelines.includes(currentRelease.currentMemory));
  assert.ok(guidelines.includes('Keep 24h usage and DevPass Activity on the foreground truth path.'));
  assert.ok(guidelines.includes('Provisioning adds no snapshot source operation or endpoint.'));
  assert.ok(guidelines.includes('Keep UNKNOWN distinct from known zero'));

  console.log('usage-dashboard P21 snapshot scheduling attribution: OK · bounded task/CLI timelines add evidence without changing scheduling or source semantics');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
