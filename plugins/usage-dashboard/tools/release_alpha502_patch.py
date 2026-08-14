from pathlib import Path
import json
import hashlib

ROOT = Path('plugins/usage-dashboard')
core = ROOT / 'src/00-runtime-core.part.js'
io = ROOT / 'src/20-bridge-io.part.js'
refresh = ROOT / 'src/30-refresh-runtime.part.js'
diag = ROOT / 'src/40-diagnostics.part.js'


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label} marker mismatch: {count}')
    return text.replace(old, new, 1)

# Product/plugin version + runtime state.
s = core.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.5.1', '//@version 3.0.0-alpha.5.2', 'meta version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.5.1';", "const VERSION = '3.0.0-alpha.5.2';", 'runtime version')
s = replace_once(
    s,
    "    bridgeManagerSyncedProductVersion: '',\n    data: null",
    "    bridgeManagerSyncedProductVersion: '',\n    bridgeEngineAdoptionAttemptedVersion: '',\n    data: null",
    'engine adoption state'
)
s = replace_once(
    s,
    "      managerProductVersion:String(manager?.productVersion || manager?.product_version || ''),\n      bridgeVersion:String(bridge?.version || '')",
    "      managerProductVersion:String(manager?.productVersion || manager?.product_version || ''),\n      engineMode:String(manager?.engineMode || manager?.engine_mode || (engineManaged ? 'managed-adopted' : 'legacy-external')),\n      engineService:String(manager?.engineService || manager?.engine_service || ''),\n      engineAdoption:truthy(manager?.engineAdoption ?? manager?.engine_adoption),\n      candidateSafe:typeof manager?.candidateSafe === 'boolean' ? manager.candidateSafe : null,\n      bridgeVersion:String(bridge?.version || '')",
    'runtime engine fields'
)
core.write_text(s)

# Manager status contract + one-time automatic adoption after manager is current.
s = io.read_text()
s = replace_once(
    s,
    "      engineManaged:raw.engineManaged === true || raw.engine_managed === true,\n      restartMode:String(raw.restartMode || raw.restart_mode || ''),",
    "      engineManaged:raw.engineManaged === true || raw.engine_managed === true,\n      engineAdoption:raw.engineAdoption === true || raw.engine_adoption === true,\n      engineMode:String(raw.engineMode || raw.engine_mode || 'legacy-external'),\n      engineService:String(raw.engineService || raw.engine_service || ''),\n      engineVersion:String(raw.engineVersion || raw.engine_version || ''),\n      candidateSafe:typeof raw.candidateSafe === 'boolean' ? raw.candidateSafe : null,\n      adoptionState:String(raw.adoptionState || raw.adoption_state || ''),\n      restartMode:String(raw.restartMode || raw.restart_mode || ''),",
    'manager normalized engine status'
)
# Add fields to all compact fallback status literals without changing old behavior.
s = s.replace("selfUpdate:false,engineManaged:false,restartMode:'',updateChannel:'',checkedAt:", "selfUpdate:false,engineManaged:false,engineAdoption:false,engineMode:'legacy-external',engineService:'',engineVersion:'',candidateSafe:null,adoptionState:'',restartMode:'',updateChannel:'',checkedAt:")

adopt_fn = r'''

  async function adoptBridgeEngineIfNeeded(status) {
    if (!status?.connected || status.engineManaged === true || status.engineAdoption !== true) return status;
    if (String(status.productVersion || '') !== VERSION) return status;
    if (String(state.bridgeEngineAdoptionAttemptedVersion || '') === VERSION) return status;
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/engine/adopt`, {method:'POST',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      const payload = JSON.parse(text);
      if (!res.ok) {
        if (payload?.retryable === false) state.bridgeEngineAdoptionAttemptedVersion = VERSION;
        return {...status,adoptionState:String(payload?.state || 'failed'),adoptionError:String(payload?.error || `HTTP ${res.status}`),candidateSafe:typeof payload?.candidateSafe === 'boolean' ? payload.candidateSafe : status.candidateSafe};
      }
      state.bridgeEngineAdoptionAttemptedVersion = VERSION;
      state.bridgeManagerLastProbeAt = 0;
      const fresh = await fetchBridgeManagerStatus(true);
      return {...fresh,adoptionState:String(payload?.state || (payload?.adopted ? 'adopted' : 'current')),adoptionError:''};
    } catch (e) {
      return {...status,adoptionState:'probe-error',adoptionError:e?.message || String(e)};
    }
  }
'''
if '  async function adoptBridgeEngineIfNeeded(status) {' not in s:
    s = s.rstrip() + adopt_fn
io.write_text(s)

s = refresh.read_text()
s = replace_once(
    s,
    "        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');\n        state.bridgeManagerRuntime = await syncBridgeManagerIfNeeded(managerStatus);",
    "        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');\n        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);\n        state.bridgeManagerRuntime = await adoptBridgeEngineIfNeeded(managerSynced);",
    'refresh engine adoption'
)
refresh.write_text(s)

s = diag.read_text()
s = replace_once(
    s,
    "      `Bridge manager probe: ${state.bridgeManagerRuntime?.connected ? 'connected' : 'unavailable'} · checked ${state.bridgeManagerRuntime?.checkedAt ? age(state.bridgeManagerRuntime.checkedAt) : '—'} · product ${state.bridgeManagerRuntime?.productVersion || '—'} · sync ${state.bridgeManagerSyncedProductVersion || 'none'}`,\n      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`",
    "      `Bridge manager probe: ${state.bridgeManagerRuntime?.connected ? 'connected' : 'unavailable'} · checked ${state.bridgeManagerRuntime?.checkedAt ? age(state.bridgeManagerRuntime.checkedAt) : '—'} · product ${state.bridgeManagerRuntime?.productVersion || '—'} · sync ${state.bridgeManagerSyncedProductVersion || 'none'}`,\n      `Bridge engine: mode ${runtimeBridge.engineMode} · managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · adoption ${runtimeBridge.engineAdoption ? 'ready' : 'no'} · service ${runtimeBridge.engineService || '—'} · candidate ${runtimeBridge.candidateSafe === null ? 'unknown' : runtimeBridge.candidateSafe ? 'safe' : 'unsafe'} · state ${state.bridgeManagerRuntime?.adoptionState || '—'}`,\n      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`",
    'diagnostic engine line'
)
diag.write_text(s)

manager = r'''#!/usr/bin/env node
'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');

const MANAGER_VERSION = '1.1.0';
const PRODUCT_VERSION = '3.0.0-alpha.5.2';
const PROTOCOL = 'bridge-manager-v1';
const HOST = '127.0.0.1';
const PORT = Number(process.env.LUD_MANAGER_PORT || 39119);
const ENGINE_HOST = '127.0.0.1';
const ENGINE_PORT = 39117;
const PRODUCT_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';
const RELEASE_PREFIX = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/';
const CURRENT_FILE = path.resolve(__filename);
const BACKUP_FILE = `${CURRENT_FILE}.bak`;
const RUNTIME_ROOT = path.dirname(CURRENT_FILE);
const PREFIX = process.env.PREFIX || '/data/data/com.termux/files/usr';
const ENGINE_SERVICE = 'local-usage-runtime-engine';
const ENGINE_SERVICE_DIR = path.join(PREFIX, 'var/service', ENGINE_SERVICE);
const ENGINE_DESCRIPTOR = path.join(RUNTIME_ROOT, 'engine-adopted.json');
const RESTART_MODE = String(process.env.LUD_MANAGER_RESTART_MODE || 'manual');
const TOKEN_FILES = [
  process.env.LUD_BRIDGE_TOKEN_FILE,
  path.join(os.homedir(), '.config/llmgateway-devpass-bridge/token'),
  path.join(os.homedir(), '.config/local-usage-dashboard/token')
].filter(Boolean);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function readToken() {
  for (const file of TOKEN_FILES) {
    try { const value = fs.readFileSync(file, 'utf8').trim(); if (value) return value; } catch (_) {}
  }
  return '';
}
function equalSecret(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}
function authorized(req) {
  const token = readToken();
  if (!token) return false;
  return equalSecret(req.headers['x-local-bridge-key'], token) || equalSecret(req.headers['x-devpass-bridge-key'], token);
}
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function shellQuote(value) { return `'${String(value).replace(/'/g, `'"'"'`)}'`; }

function requestText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (!String(url).startsWith(RELEASE_PREFIX)) return reject(new Error('release URL denied'));
    if (redirects > 3) return reject(new Error('too many redirects'));
    const req = https.get(url, {headers:{'User-Agent':'local-usage-dashboard-bridge-manager/1'}}, res => {
      if ([301,302,303,307,308].includes(Number(res.statusCode)) && res.headers.location) {
        res.resume();
        return requestText(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      }
      if (Number(res.statusCode) < 200 || Number(res.statusCode) >= 300) {
        res.resume();
        return reject(new Error(`release HTTP ${res.statusCode}`));
      }
      const chunks = []; let total = 0;
      res.on('data', chunk => {
        total += chunk.length;
        if (total > 2 * 1024 * 1024) return req.destroy(new Error('release artifact too large'));
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(15000, () => req.destroy(new Error('release request timeout')));
    req.on('error', reject);
  });
}
function syntaxCheck(file) { execFileSync(process.execPath, ['--check', file], {stdio:'ignore'}); }
function scheduleRestart() {
  setTimeout(() => {
    if (RESTART_MODE === 'runit') process.exit(0);
    try {
      const child = spawn(process.execPath, [CURRENT_FILE], {detached:true,stdio:'ignore',env:{...process.env,LUD_MANAGER_RESTART_MODE:'manual'}});
      child.unref();
    } catch (_) {}
    process.exit(0);
  }, 150);
}
async function syncSelf() {
  const manifestText = await requestText(PRODUCT_MANIFEST_URL);
  const manifest = JSON.parse(manifestText);
  const spec = manifest?.components?.bridgeManager;
  if (!spec || typeof spec !== 'object') throw new Error('bridgeManager spec missing');
  const artifact = String(spec.artifact || '');
  const expected = String(spec.sha256 || '').toLowerCase();
  if (!artifact.startsWith(RELEASE_PREFIX)) throw new Error('manager artifact URL denied');
  if (!/^[0-9a-f]{64}$/.test(expected)) throw new Error('manager sha256 invalid');
  const current = fs.readFileSync(CURRENT_FILE);
  if (sha256(current) === expected) return {ok:true,updated:false,version:MANAGER_VERSION,productVersion:String(manifest.productVersion || PRODUCT_VERSION),restartRequired:false};
  const nextText = await requestText(artifact);
  if (sha256(Buffer.from(nextText, 'utf8')) !== expected) throw new Error('manager sha256 mismatch');
  const nextFile = `${CURRENT_FILE}.next-${process.pid}`;
  fs.writeFileSync(nextFile, nextText, {mode:0o700});
  try {
    syntaxCheck(nextFile);
    if (fs.existsSync(BACKUP_FILE)) fs.unlinkSync(BACKUP_FILE);
    fs.copyFileSync(CURRENT_FILE, BACKUP_FILE);
    fs.renameSync(nextFile, CURRENT_FILE);
    fs.chmodSync(CURRENT_FILE, 0o700);
  } catch (e) {
    try { if (fs.existsSync(nextFile)) fs.unlinkSync(nextFile); } catch (_) {}
    throw e;
  }
  return {ok:true,updated:true,version:String(spec.version || ''),productVersion:String(manifest.productVersion || ''),restartRequired:true};
}
function rollbackSelf() {
  if (!fs.existsSync(BACKUP_FILE)) return {ok:false,rolledBack:false,error:'backup unavailable'};
  const nextFile = `${CURRENT_FILE}.rollback-${process.pid}`;
  fs.copyFileSync(BACKUP_FILE, nextFile);
  syntaxCheck(nextFile);
  fs.renameSync(nextFile, CURRENT_FILE);
  fs.chmodSync(CURRENT_FILE, 0o700);
  return {ok:true,rolledBack:true,restartRequired:true};
}

function listenerInodes(port) {
  const wanted = Number(port).toString(16).toUpperCase().padStart(4, '0');
  const out = new Set();
  for (const file of ['/proc/net/tcp', '/proc/net/tcp6']) {
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
    for (const line of text.split('\n').slice(1)) {
      const fields = line.trim().split(/\s+/);
      if (fields.length < 10 || fields[3] !== '0A') continue;
      const local = fields[1] || '';
      if (local.endsWith(`:${wanted}`) && fields[9]) out.add(fields[9]);
    }
  }
  return out;
}
function listenerPid(port) {
  const inodes = listenerInodes(port);
  if (!inodes.size) return null;
  let entries = [];
  try { entries = fs.readdirSync('/proc').filter(name => /^\d+$/.test(name)); } catch (_) { return null; }
  for (const name of entries) {
    const fdDir = `/proc/${name}/fd`;
    let fds = [];
    try { fds = fs.readdirSync(fdDir); } catch (_) { continue; }
    for (const fd of fds) {
      try {
        const target = fs.readlinkSync(path.join(fdDir, fd));
        const m = target.match(/^socket:\[(\d+)\]$/);
        if (m && inodes.has(m[1])) return Number(name);
      } catch (_) {}
    }
  }
  return null;
}
function readProcess(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return null;
  try {
    const cmd = fs.readFileSync(`/proc/${pid}/cmdline`).toString('utf8').split('\0').filter(Boolean);
    const cwd = fs.readlinkSync(`/proc/${pid}/cwd`);
    const exe = fs.readlinkSync(`/proc/${pid}/exe`);
    return {pid,cmd,cwd,exe};
  } catch (_) { return null; }
}
function safeCandidate(proc) {
  if (!proc || proc.pid === process.pid || !Array.isArray(proc.cmd) || proc.cmd.length < 2) return {safe:false,reason:'process-unavailable'};
  if (!/^node(?:js)?(?:$|[-.0-9])/i.test(path.basename(proc.exe || proc.cmd[0] || ''))) return {safe:false,reason:'not-node'};
  const scriptIndex = proc.cmd.findIndex((arg, index) => index > 0 && /\.(?:c?js|mjs)$/i.test(String(arg || '')));
  if (scriptIndex < 1) return {safe:false,reason:'script-unresolved'};
  const rawScript = proc.cmd[scriptIndex];
  const script = path.isAbsolute(rawScript) ? rawScript : path.resolve(proc.cwd, rawScript);
  try {
    const stat = fs.statSync(script);
    if (!stat.isFile()) return {safe:false,reason:'script-not-file'};
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return {safe:false,reason:'foreign-owner'};
  } catch (_) { return {safe:false,reason:'script-missing'}; }
  const nodeArgs = proc.cmd.slice(1, scriptIndex);
  const scriptArgs = proc.cmd.slice(scriptIndex + 1);
  const allArgs = [...nodeArgs, ...scriptArgs];
  if (allArgs.some(arg => /(?:token|secret|password|cookie|session|bearer|api[-_]?key)/i.test(String(arg)))) return {safe:false,reason:'sensitive-arg'};
  if (allArgs.some(arg => /[\r\n\0]/.test(String(arg)))) return {safe:false,reason:'control-arg'};
  return {safe:true,reason:'node-script',pid:proc.pid,exe:proc.exe,script,cwd:proc.cwd,nodeArgs,scriptArgs};
}
function discoverEngineCandidate() {
  const pid = listenerPid(ENGINE_PORT);
  if (!pid) return {safe:false,reason:'listener-unresolved',pid:null};
  return safeCandidate(readProcess(pid));
}
function serviceStatus() {
  try {
    const text = execFileSync('sv', ['status', ENGINE_SERVICE_DIR], {encoding:'utf8',timeout:3000}).trim();
    const m = text.match(/\(pid (\d+)\)/);
    return {running:/^run:/.test(text),pid:m ? Number(m[1]) : null,text};
  } catch (e) {
    const text = String(e?.stdout || e?.message || '').trim();
    const m = text.match(/\(pid (\d+)\)/);
    return {running:/^run:/.test(text),pid:m ? Number(m[1]) : null,text};
  }
}
function readDescriptor() {
  try { const value = JSON.parse(fs.readFileSync(ENGINE_DESCRIPTOR, 'utf8')); return value && typeof value === 'object' ? value : null; } catch (_) { return null; }
}
function writeEngineService(candidate, down = true) {
  fs.mkdirSync(ENGINE_SERVICE_DIR, {recursive:true});
  const command = [candidate.exe, ...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs].map(shellQuote).join(' ');
  const run = `#!/data/data/com.termux/files/usr/bin/sh\ncd ${shellQuote(candidate.cwd)}\nexec ${command}\n`;
  fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), run, {mode:0o700});
  fs.chmodSync(path.join(ENGINE_SERVICE_DIR, 'run'), 0o700);
  const downFile = path.join(ENGINE_SERVICE_DIR, 'down');
  if (down) fs.writeFileSync(downFile, ''); else { try { fs.unlinkSync(downFile); } catch (_) {} }
}
async function bridgeSnapshot(timeoutMs = 2500) {
  const token = readToken();
  if (!token) throw new Error('bridge token missing');
  return new Promise((resolve, reject) => {
    const req = http.request({host:ENGINE_HOST,port:ENGINE_PORT,path:'/snapshot',method:'GET',headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (Number(res.statusCode) < 200 || Number(res.statusCode) >= 300) return reject(new Error(`bridge HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(text)); } catch (_) { reject(new Error('bridge JSON invalid')); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('bridge snapshot timeout')));
    req.on('error', reject); req.end();
  });
}
async function waitForManagedEngine(timeoutMs = 12000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    const service = serviceStatus();
    const pid = listenerPid(ENGINE_PORT);
    if (service.running && service.pid && pid === service.pid) {
      try {
        const snap = await bridgeSnapshot();
        return {ok:true,service,pid,snapshot:snap};
      } catch (e) { lastError = e?.message || String(e); }
    }
    await sleep(350);
  }
  return {ok:false,error:lastError || 'managed engine did not become healthy',service:serviceStatus(),pid:listenerPid(ENGINE_PORT)};
}
async function engineRuntimeStatus() {
  const descriptor = readDescriptor();
  const service = serviceStatus();
  const pid = listenerPid(ENGINE_PORT);
  const managed = Boolean(descriptor && service.running && service.pid && pid === service.pid);
  let snapshot = null;
  try { snapshot = await bridgeSnapshot(1200); } catch (_) {}
  const candidate = managed ? {safe:true,reason:'managed-service'} : discoverEngineCandidate();
  return {
    engineManaged:managed,
    engineMode:managed ? 'managed-adopted' : 'legacy-external',
    engineService:ENGINE_SERVICE,
    engineVersion:String(snapshot?.bridgeVersion || snapshot?.health?.bridgeVersion || ''),
    candidateSafe:typeof candidate?.safe === 'boolean' ? candidate.safe : null,
    candidateReason:String(candidate?.reason || ''),
    adoptionState:managed ? 'adopted' : descriptor ? 'service-degraded' : 'pending'
  };
}
async function adoptEngine() {
  const current = await engineRuntimeStatus();
  if (current.engineManaged) return {ok:true,adopted:false,state:'current',...current};
  const candidate = discoverEngineCandidate();
  if (!candidate.safe) return {ok:false,adopted:false,state:'unsafe-candidate',candidateSafe:false,retryable:false,error:`engine adoption refused: ${candidate.reason}`};
  writeEngineService(candidate, true);
  try {
    process.kill(candidate.pid, 'SIGTERM');
  } catch (e) {
    return {ok:false,adopted:false,state:'stop-failed',candidateSafe:true,retryable:true,error:e?.message || String(e)};
  }
  const stopStarted = Date.now();
  while (Date.now() - stopStarted < 5000) {
    const pid = listenerPid(ENGINE_PORT);
    if (!pid || pid !== candidate.pid) break;
    await sleep(200);
  }
  if (listenerPid(ENGINE_PORT) === candidate.pid) {
    return {ok:false,adopted:false,state:'stop-timeout',candidateSafe:true,retryable:true,error:'legacy bridge did not stop after SIGTERM'};
  }
  try { fs.unlinkSync(path.join(ENGINE_SERVICE_DIR, 'down')); } catch (_) {}
  try { execFileSync('sv', ['up', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  const verified = await waitForManagedEngine();
  if (verified.ok) {
    const descriptor = {
      format:1,
      adoptedAt:new Date().toISOString(),
      service:ENGINE_SERVICE,
      cwd:candidate.cwd,
      executable:candidate.exe,
      script:candidate.script,
      nodeArgs:candidate.nodeArgs,
      scriptArgs:candidate.scriptArgs,
      sourceVersion:String(verified.snapshot?.bridgeVersion || '')
    };
    fs.writeFileSync(ENGINE_DESCRIPTOR, JSON.stringify(descriptor, null, 2) + '\n', {mode:0o600});
    return {ok:true,adopted:true,state:'adopted',engineManaged:true,engineMode:'managed-adopted',engineService:ENGINE_SERVICE,engineVersion:descriptor.sourceVersion,candidateSafe:true};
  }
  try { execFileSync('sv', ['down', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  try { fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'down'), ''); } catch (_) {}
  if (!listenerPid(ENGINE_PORT)) {
    try {
      const child = spawn(candidate.exe, [...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs], {cwd:candidate.cwd,detached:true,stdio:'ignore',env:process.env});
      child.unref();
    } catch (_) {}
  }
  return {ok:false,adopted:false,state:'verification-failed',candidateSafe:true,retryable:true,error:verified.error || 'managed engine verification failed'};
}
function ensureAdoptedServiceUp() {
  if (!readDescriptor()) return;
  try { fs.unlinkSync(path.join(ENGINE_SERVICE_DIR, 'down')); } catch (_) {}
  try { execFileSync('sv', ['up', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:2500}); } catch (_) {}
}

function send(res, status, body, restart = false) {
  const text = JSON.stringify(body);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(text)});
  res.end(text, () => { if (restart) scheduleRestart(); });
}

ensureAdoptedServiceUp();
const server = http.createServer(async (req, res) => {
  if (!authorized(req)) return send(res, 401, {ok:false,error:'unauthorized'});
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/status') {
    const engine = await engineRuntimeStatus();
    return send(res, 200, {
      ok:true,protocol:PROTOCOL,version:MANAGER_VERSION,productVersion:PRODUCT_VERSION,selfUpdate:true,engineAdoption:true,
      ...engine,restartMode:RESTART_MODE,updateChannel:PRODUCT_MANIFEST_URL,bind:`${HOST}:${PORT}`,
      tokenSource:TOKEN_FILES.find(file => { try { return Boolean(fs.readFileSync(file, 'utf8').trim()); } catch (_) { return false; } }) ? 'existing-file' : 'missing'
    });
  }
  if (req.method === 'POST' && url.pathname === '/sync') {
    try { const result = await syncSelf(); return send(res, 200, result, result.restartRequired === true); }
    catch (e) { return send(res, 500, {ok:false,updated:false,error:e?.message || String(e)}); }
  }
  if (req.method === 'POST' && url.pathname === '/engine/adopt') {
    try { const result = await adoptEngine(); return send(res, result.ok ? 200 : (result.retryable === false ? 409 : 503), result); }
    catch (e) { return send(res, 500, {ok:false,adopted:false,state:'error',retryable:true,error:e?.message || String(e)}); }
  }
  if (req.method === 'POST' && url.pathname === '/restart') return send(res, 200, {ok:true,restart:true}, true);
  if (req.method === 'POST' && url.pathname === '/rollback') {
    try { const result = rollbackSelf(); return send(res, result.ok ? 200 : 409, result, result.restartRequired === true); }
    catch (e) { return send(res, 500, {ok:false,rolledBack:false,error:e?.message || String(e)}); }
  }
  return send(res, 404, {ok:false,error:'not found'});
});
server.on('error', error => { console.error(`[Local Usage Runtime Manager] ${error?.message || error}`); process.exitCode = 1; });
server.listen(PORT, HOST, () => console.log(`[Local Usage Runtime Manager] ${MANAGER_VERSION} · ${HOST}:${PORT} · ${RESTART_MODE} · engine-adoption`));
'''
manager_path = ROOT / 'runtime/bridge-manager.cjs'
manager_path.write_text(manager)

# Manifest now advertises manager capability and an adoption-stage bridge lifecycle.
manifest_path = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['productVersion'] = '3.0.0-alpha.5.2'
manifest['components']['plugin']['version'] = '3.0.0-alpha.5.2'
bridge = manifest['components']['bridge']
bridge['state'] = 'managed-adoption'
bridge['lifecycleManaged'] = True
bridge['sourceBundled'] = False
mgr = manifest['components']['bridgeManager']
mgr['state'] = 'engine-adoption-ready'
mgr['version'] = '1.1.0'
mgr['productVersion'] = '3.0.0-alpha.5.2'
mgr['engineManaged'] = True
mgr['engineAdoption'] = True
mgr['engineService'] = 'local-usage-runtime-engine'
mgr['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
bootstrap_path = ROOT / 'runtime/bootstrap-bridge-manager.sh'
mgr['bootstrapSha256'] = hashlib.sha256(bootstrap_path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# Make unified-runtime regression version-aware for the 5.2 lifecycle stage.
p = ROOT / 'tests/p5-unified-runtime.cjs'
t = p.read_text()
t = replace_once(
    t,
    "assert.equal(manifest.components.bridge.state, 'legacy-external');",
    "if (/^3\\.0\\.0-alpha\\.5\\.[01]$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');",
    'unified bridge lifecycle assertion'
)
p.write_text(t)

# Extend manager regression and add dedicated engine-adoption guard.
p = ROOT / 'tests/p5-bridge-manager.cjs'
t = p.read_text()
t = t.replace("  \"url.pathname === '/restart'\",\n  \"engineManaged:false\",", "  \"url.pathname === '/restart'\",\n  \"url.pathname === '/engine/adopt'\",\n  \"const ENGINE_SERVICE = 'local-usage-runtime-engine';\",\n  \"engineAdoption:true\",")
t = t.replace("assert.equal(manifest.components.bridge.state, 'legacy-external');", "if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');")
t = t.replace("assert.equal(manifest.components.bridgeManager.engineManaged, false);", "if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.engineManaged, false);\nelse { assert.equal(manifest.components.bridgeManager.engineManaged, true); assert.equal(manifest.components.bridgeManager.engineAdoption, true); }")
p.write_text(t)

(ROOT / 'tests/p5-engine-adoption.cjs').write_text(r'''const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manager = fs.readFileSync('plugins/usage-dashboard/runtime/bridge-manager.cjs', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\.(?:[2-9]|\d{2,})$/.test(version) || /^3\.0\.0-beta\./.test(version) || version === '3.0.0';
if (!enabled) { console.log(`usage-dashboard P5 engine adoption regression: skipped · ${version}`); process.exit(0); }
for (const marker of [
  'async function adoptBridgeEngineIfNeeded(status)',
  "`${BRIDGE_MANAGER_BASE}/engine/adopt`",
  'bridgeEngineAdoptionAttemptedVersion',
  'Bridge engine: mode',
]) assert.ok(source.includes(marker), `missing plugin adoption marker: ${marker}`);
for (const marker of [
  "const ENGINE_PORT = 39117;",
  "const ENGINE_SERVICE = 'local-usage-runtime-engine';",
  "'/proc/net/tcp'",
  'function safeCandidate(proc)',
  "process.kill(candidate.pid, 'SIGTERM')",
  'await waitForManagedEngine()',
  "url.pathname === '/engine/adopt'",
  'candidateSafe',
  'engineAdoption:true',
]) assert.ok(manager.includes(marker), `missing manager adoption marker: ${marker}`);
assert.ok(!manager.includes("process.kill(candidate.pid, 'SIGKILL')"), 'automatic adoption must not force-kill legacy bridge');
assert.equal(manifest.productVersion, version);
assert.equal(manifest.components.bridge.state, 'managed-adoption');
assert.equal(manifest.components.bridge.lifecycleManaged, true);
assert.equal(manifest.components.bridge.sourceBundled, false);
assert.equal(manifest.components.bridgeManager.version, '1.1.0');
assert.equal(manifest.components.bridgeManager.engineAdoption, true);
assert.equal(manifest.components.bridgeManager.engineService, 'local-usage-runtime-engine');
console.log(`usage-dashboard P5 engine adoption regression: OK · ${version}`);
''')
