'use strict';

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

const root = path.resolve('plugins/usage-dashboard');
const enginePath = path.join(root, 'runtime', 'bridge-engine.mjs');
const fakeCliPath = path.join(root, 'tests', 'harness', 'fake-cli.cjs');
const clockPreloadPath = path.join(root, 'tests', 'harness', 'controlled-clock.mjs');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function writeExecutable(file, launcher) {
  fs.writeFileSync(file, [
    '#!/bin/sh',
    `UD_BEHAVIOR_LAUNCHER=${launcher} exec "${process.execPath}" "${fakeCliPath}" "$@"`,
    '',
  ].join('\n'), {mode:0o755});
}

function appendLedger(file, payload) {
  fs.appendFileSync(file, JSON.stringify({event:payload,at:Date.now(),pid:process.pid,launcher:'harness'}) + '\n');
}

async function startBridge(options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'usage-dashboard-behavior-'));
  const home = path.join(fixtureRoot, 'home');
  const bin = path.join(fixtureRoot, 'bin');
  const gates = path.join(fixtureRoot, 'gates');
  const ledger = path.join(fixtureRoot, 'ledger.jsonl');
  const config = path.join(fixtureRoot, 'config.json');
  const clock = path.join(fixtureRoot, 'clock.txt');
  fs.mkdirSync(home, {recursive:true});
  fs.mkdirSync(bin, {recursive:true});
  fs.mkdirSync(gates, {recursive:true});
  fs.writeFileSync(ledger, '');
  fs.writeFileSync(config, JSON.stringify(options.config || {}));
  fs.writeFileSync(clock, String(options.now || 1_700_000_000_000));

  if (options.direct !== false) writeExecutable(path.join(bin, 'llmgateway'), 'direct');
  if (options.npx !== false) writeExecutable(path.join(bin, 'npx'), 'npx');

  if (options.managed === true) {
    const cliRoot = path.join(home, '.local', 'share', 'local-usage-dashboard', 'runtime', 'cli');
    const versionRoot = path.join(cliRoot, '1.10.0');
    const entry = options.managedEntryOutside === true
      ? path.join(fixtureRoot, 'fixture-managed-outside.cjs')
      : path.join(versionRoot, 'fixture-managed.cjs');
    fs.mkdirSync(versionRoot, {recursive:true});
    fs.writeFileSync(entry, [
      `process.env.UD_BEHAVIOR_LAUNCHER = 'managed';`,
      `require(${JSON.stringify(fakeCliPath)});`,
      '',
    ].join('\n'));
    fs.writeFileSync(path.join(cliRoot, 'managed-cli.json'), JSON.stringify({
      format:1,
      state:'ready',
      package:'@llmgateway/cli',
      version:'1.10.0',
      entry,
    }));
    fs.writeFileSync(path.join(cliRoot, 'managed-cli-state.json'), JSON.stringify({
      state:'ready',
      version:'1.10.0',
      provisioning:'ok',
    }));
  }

  const port = await reservePort();
  const env = {
    ...process.env,
    HOME:home,
    PATH:bin,
    DEVPASS_BRIDGE_PORT:String(port),
    DEVPASS_BRIDGE_MANAGED_CLI:options.managed === true ? '1' : '0',
    DEVPASS_BRIDGE_CLI_CONCURRENCY:String(options.concurrency || 2),
    DEVPASS_BRIDGE_NPX_PREFER_OFFLINE:options.preferOffline === false ? '0' : '1',
    UD_BEHAVIOR_LEDGER_FILE:ledger,
    UD_BEHAVIOR_CONFIG_FILE:config,
    UD_BEHAVIOR_GATES_DIR:gates,
    UD_BEHAVIOR_CLOCK_FILE:clock,
    NODE_OPTIONS:`--import=${clockPreloadPath}`,
  };
  const child = spawn(process.execPath, [enginePath], {env,stdio:['ignore','pipe','pipe']});
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout = (stdout + chunk).slice(-20_000); });
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-20_000); });

  const baseUrl = `http://127.0.0.1:${port}`;
  const tokenFile = path.join(home, '.config', 'llmgateway-devpass-bridge', 'token');
  try {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 8_000) {
      if (child.exitCode !== null) {
        throw new Error(`bridge exited before ready (${child.exitCode})\n${stdout}\n${stderr}`);
      }
      try {
        const response = await fetch(`${baseUrl}/health`);
        if (response.ok && fs.existsSync(tokenFile)) break;
      } catch {}
      await delay(20);
    }
    if (!fs.existsSync(tokenFile)) throw new Error(`bridge did not become ready\n${stdout}\n${stderr}`);
  } catch (error) {
    if (child.exitCode === null) child.kill('SIGKILL');
    fs.rmSync(fixtureRoot, {recursive:true,force:true});
    throw error;
  }

  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  let stopped = false;
  const api = {
    fixtureRoot,
    baseUrl,
    child,
    paths:{home,bin,gates,ledger,config,clock},
    logs:() => ({stdout,stderr}),
    readClock:() => Number(fs.readFileSync(clock, 'utf8')),
    advance(ms) {
      fs.writeFileSync(clock, String(api.readClock() + Number(ms)));
    },
    setConfig(value) {
      fs.writeFileSync(config, JSON.stringify(value || {}));
    },
    openGate(label) {
      fs.writeFileSync(path.join(gates, `${label}.open`), 'open');
    },
    closeGate(label) {
      try { fs.unlinkSync(path.join(gates, `${label}.open`)); } catch {}
    },
    clearLedger() {
      fs.writeFileSync(ledger, '');
    },
    ledger() {
      const text = fs.readFileSync(ledger, 'utf8').trim();
      return text ? text.split('\n').map((line) => JSON.parse(line)) : [];
    },
    async waitFor(predicate, timeoutMs = 5_000) {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        const value = predicate(api.ledger());
        if (value) return value;
        await delay(10);
      }
      throw new Error(`behavior wait timed out\n${JSON.stringify(api.ledger(), null, 2)}\n${stdout}\n${stderr}`);
    },
    async request(route, marker = '') {
      const response = await fetch(`${baseUrl}${route}`, {
        headers:{'x-devpass-bridge-key':token},
      });
      let body;
      try { body = await response.json(); }
      catch { body = null; }
      if (marker) appendLedger(ledger, {type:'response',label:marker,status:response.status});
      return {status:response.status,body};
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      if (child.exitCode === null) child.kill('SIGTERM');
      const exited = child.exitCode !== null || await Promise.race([
          new Promise((resolve) => child.once('exit', () => resolve(true))),
          delay(1_000).then(() => false),
        ]);
      if (!exited && child.exitCode === null) child.kill('SIGKILL');
      fs.rmSync(fixtureRoot, {recursive:true,force:true});
    },
  };
  return api;
}

module.exports = {startBridge};
