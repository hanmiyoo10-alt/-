#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ledgerFile = process.env.UD_BEHAVIOR_LEDGER_FILE;
const configFile = process.env.UD_BEHAVIOR_CONFIG_FILE;
const gatesDir = process.env.UD_BEHAVIOR_GATES_DIR;
const launcher = String(process.env.UD_BEHAVIOR_LAUNCHER || 'unknown');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configFile, 'utf8')); }
  catch { return {}; }
}

function append(payload) {
  if (!ledgerFile) return;
  fs.appendFileSync(ledgerFile, JSON.stringify({
    ...payload,
    pid:process.pid,
    launcher,
    at:Date.now(),
  }) + '\n');
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function effectiveArgs(rawArgs) {
  if (launcher !== 'npx') return rawArgs;
  const packageIndex = rawArgs.findIndex((value) => String(value).startsWith('@llmgateway/cli@'));
  return packageIndex >= 0 ? rawArgs.slice(packageIndex + 1) : rawArgs;
}

function operationLabel(args) {
  if (args[0] === 'credits') return 'credits';
  if (args[0] === 'orgs') {
    const range = String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || '24h');
    return `devpass-capture-${range}`;
  }
  if (args[0] === 'usage') {
    const rangeAt = args.indexOf('--range');
    const byAt = args.indexOf('--by');
    const range = rangeAt >= 0 ? args[rangeAt + 1] : 'unknown';
    const by = byAt >= 0 ? args[byAt + 1] : 'total';
    return `usage-${range}-${by}`;
  }
  return 'unknown';
}

function waitForGate(label, config) {
  if (!Array.isArray(config.gateLabels) || !config.gateLabels.includes(label)) return;
  const gate = path.join(gatesDir, `${label}.open`);
  const started = process.hrtime.bigint();
  while (!fs.existsSync(gate)) {
    if (Number(process.hrtime.bigint() - started) / 1e6 >= 8_000) {
      throw new Error(`gate timeout: ${label}`);
    }
    sleepSync(10);
  }
}

function activityPayload(range) {
  return {
    activity:[{
      requestCount:2,
      totalCost:range === '30d' ? 30 : range === '7d' ? 7 : 1,
      inputTokens:100,
      outputTokens:20,
      totalTokens:120,
      modelBreakdown:[{
        model:'fixture/model',
        provider:'fixture',
        requestCount:2,
        totalCost:range === '30d' ? 30 : range === '7d' ? 7 : 1,
        inputTokens:100,
        outputTokens:20,
        totalTokens:120,
      }],
    }],
  };
}

function capturePayload(range) {
  return {
    orgs:{organizations:[
      {id:'fixture-credits',name:'Fixture Credits',kind:'default',status:'active',credits:100},
      {id:'fixture-devpass',name:'Fixture DevPass',kind:'devpass',status:'active',devPlan:'pro'},
    ]},
    devPlanStatus:{
      plan:'pro',
      projectId:'fixture-project',
      organizationId:'fixture-devpass',
      devPlanCreditsUsed:5,
      devPlanCreditsLimit:100,
    },
    devpassActivity:{range,payload:activityPayload(range)},
  };
}

const rawArgs = process.argv.slice(2);
const args = effectiveArgs(rawArgs);
const label = operationLabel(args);
const config = readConfig();
append({type:'start',label,args,rawArgs});

try {
  const failure = config.failureByLauncher?.[launcher];
  if (failure) {
    append({type:'end',label,outcome:'failure',code:String(failure)});
    process.stderr.write(`fixture ${launcher} failure\n`);
    process.exit(Number(failure) || 17);
  }

  waitForGate(label, config);

  let payload;
  if (args[0] === 'credits') {
    payload = {organizations:[{id:'fixture-credits',credits:100}]};
  } else if (args[0] === 'orgs') {
    const range = String(process.env.DEVPASS_BRIDGE_ACTIVITY_RANGE || '24h');
    payload = {organizations:capturePayload(range).orgs.organizations};
    const captureFile = process.env.DEVPASS_BRIDGE_CAPTURE_FILE;
    if (captureFile) fs.writeFileSync(captureFile, JSON.stringify(capturePayload(range)));
  } else if (args[0] === 'usage') {
    const rangeAt = args.indexOf('--range');
    payload = activityPayload(rangeAt >= 0 ? String(args[rangeAt + 1]) : '24h');
  } else {
    payload = {};
  }

  append({type:'end',label,outcome:'success'});
  process.stdout.write(JSON.stringify(payload));
} catch (error) {
  append({type:'end',label,outcome:'failure',code:'HARNESS'});
  process.stderr.write(String(error?.message || error));
  process.exit(19);
}
