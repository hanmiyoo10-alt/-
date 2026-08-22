'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

const root = path.resolve('plugins/usage-dashboard');
const dashboardPath = path.join(root, 'latest.js');
const preloadPath = path.join(root, 'tests', 'harness', 'dashboard-preload.cjs');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readResult(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return null; }
}

function refreshComplete(result, initialState) {
  const state = result?.state;
  if (!state || state.lastRefreshReason !== 'init' || state.bridgeStatus !== 'connected' || !state.data) return false;
  return Number(state.refreshCount || 0) > Number(initialState?.refreshCount || 0);
}

function viewsComplete(result, expectedViews) {
  return Array.isArray(result?.views)
    && result.views.length >= Math.max(1, Number(expectedViews || 1))
    && Number(result?.viewCapturePending || 0) === 0;
}

async function stopChild(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise(resolve => child.once('exit', () => resolve(true))),
    delay(500).then(() => false),
  ]);
  if (!exited && child.exitCode === null) child.kill('SIGKILL');
}

async function runDashboard(options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-runtime-'));
  const configFile = path.join(fixtureRoot, 'config.json');
  const resultFile = path.join(fixtureRoot, 'result.json');
  const initialState = options.state && typeof options.state === 'object' ? options.state : {};
  fs.writeFileSync(configFile, JSON.stringify({
    state:initialState,
    token:String(options.token || ''),
    snapshot:options.snapshot || null,
    snapshotStatus:Number(options.snapshotStatus || 200),
    managerStatus:Number(options.managerStatus || 503),
    managerResponse:options.managerResponse || {ok:false},
    failStateWrites:Math.max(0, Number(options.failStateWrites || 0)),
    captureSettingsViews:options.captureSettingsViews === true,
    captureRefreshViews:options.captureRefreshViews === true,
  }));

  const child = spawn(process.execPath, ['--require', preloadPath, dashboardPath], {
    env:{
      ...process.env,
      UD_DASHBOARD_CONFIG_FILE:configFile,
      UD_DASHBOARD_RESULT_FILE:resultFile,
    },
    stdio:['ignore','pipe','pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-20_000); });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-20_000); });

  const timeoutMs = Math.max(500, Number(options.timeoutMs || 5_000));
  const waitFor = options.waitFor === 'refresh' ? 'refresh' : options.waitFor === 'views' ? 'views' : 'state-write';
  const expectedViews = Math.max(1, Number(options.expectedViews || 1));
  const startedAt = Date.now();
  let result = null;
  try {
    while (Date.now() - startedAt < timeoutMs) {
      result = readResult(resultFile);
      const stateWrite = result?.writes?.includes('local-usage-dashboard-v3');
      const ready = waitFor === 'refresh'
        ? refreshComplete(result, initialState)
        : waitFor === 'views'
          ? viewsComplete(result, expectedViews)
          : stateWrite;
      if (ready) break;
      if (child.exitCode !== null) break;
      await delay(10);
    }
    result = readResult(resultFile);
    const ready = waitFor === 'refresh'
      ? refreshComplete(result, initialState)
      : waitFor === 'views'
        ? viewsComplete(result, expectedViews)
        : result?.writes?.includes('local-usage-dashboard-v3');
    if (!ready) {
      throw new Error(`dashboard process did not reach ${waitFor}\nstdout:\n${stdout}\nstderr:\n${stderr}\nresult:\n${JSON.stringify(result, null, 2)}`);
    }
    if (stdout.includes('[Local Usage Dashboard] init failed:')) {
      throw new Error(`dashboard process reported init failure\n${stdout}\n${stderr}`);
    }
    return {...result,stdout,stderr};
  } finally {
    await stopChild(child);
    fs.rmSync(fixtureRoot, {recursive:true,force:true});
  }
}

module.exports = {runDashboard};
