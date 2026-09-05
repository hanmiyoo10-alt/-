#!/usr/bin/env node
'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');

const MANAGER_VERSION = '1.3.6';
const PRODUCT_VERSION = '3.0.0-alpha.5.100';
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
const TERMUX_EXEC_LD_PRELOAD = path.join(PREFIX, 'lib', 'libtermux-exec-ld-preload.so');
const ENGINE_DESCRIPTOR = path.join(RUNTIME_ROOT, 'engine-adopted.json');
const BUNDLED_ENGINE_FILE = path.join(RUNTIME_ROOT, 'bridge-engine.mjs');
const BUNDLED_ENGINE_URL = `${RELEASE_PREFIX}bridge-engine.mjs`;
const BUNDLED_ENGINE_VERSION = '1.6.35';
const BUNDLED_ENGINE_SHA256 = '6fc3faab12d5c37344bc2799b8182c209d8168d01ce50025bbaa35b8465409f5';
const MANAGED_CLI_PACKAGE = '@llmgateway/cli';
const MANAGED_CLI_VERSION = '1.10.0';
const MANAGED_MODEL_CATALOG_PACKAGE = '@llmgateway/models';
const MANAGED_MODEL_CATALOG_VERSION = '1.280.0';
const MANAGED_CLI_ENABLED = String(process.env.DEVPASS_BRIDGE_MANAGED_CLI || '1') !== '0';
const MANAGED_CLI_ROOT = path.join(os.homedir(), '.local', 'share', 'local-usage-dashboard', 'runtime', 'cli');
const MANAGED_CLI_VERSION_ROOT = path.join(MANAGED_CLI_ROOT, MANAGED_CLI_VERSION);
const MANAGED_CLI_DESCRIPTOR = path.join(MANAGED_CLI_ROOT, 'managed-cli.json');
const MANAGED_CLI_STATE = path.join(MANAGED_CLI_ROOT, 'managed-cli-state.json');
const MANAGED_CLI_LOCK = path.join(MANAGED_CLI_ROOT, 'managed-cli.lock');
const MANAGED_CLI_RETRY_MS = 30 * 60 * 1000;
const MANAGED_CLI_INSTALL_TIMEOUT_MS = 5 * 60 * 1000;
let managedCliProvisioningPromise = null;
const LEGACY_ENGINE_PID_FILE = path.join(os.homedir(), 'PocketRisu/bridge/run/llmgateway-devpass-bridge.pid');
const LEGACY_ENGINE_SCRIPT = path.join(os.homedir(), 'PocketRisu/bridge/llmgateway-termux-bridge.mjs');
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

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}
function atomicJsonWrite(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true,mode:0o700});
  const next = `${file}.next-${process.pid}`;
  fs.writeFileSync(next, JSON.stringify(value, null, 2) + '\n', {mode:0o600});
  fs.renameSync(next, file);
  try { fs.chmodSync(file, 0o600); } catch (_) {}
}
function readManagedCliState() {
  try {
    const value = JSON.parse(fs.readFileSync(MANAGED_CLI_STATE, 'utf8'));
    const state = ['ready','provisioning','unavailable','invalid'].includes(String(value?.state)) ? String(value.state) : 'unavailable';
    const provisioning = ['ok','pending','backoff','disabled','unavailable'].includes(String(value?.provisioning)) ? String(value.provisioning) : 'unavailable';
    return {state,version:String(value?.version || '') === MANAGED_CLI_VERSION ? MANAGED_CLI_VERSION : '',provisioning,nextRetryAt:Number(value?.nextRetryAt || 0)};
  } catch (_) { return {state:'unavailable',version:'',provisioning:'unavailable',nextRetryAt:0}; }
}
function writeManagedCliState(state, provisioning, nextRetryAt = 0) {
  atomicJsonWrite(MANAGED_CLI_STATE, {format:1,state,version:state === 'ready' ? MANAGED_CLI_VERSION : '',provisioning,nextRetryAt:Number(nextRetryAt || 0),updatedAt:Date.now()});
}
function resolveManagedCliBin(packageJson) {
  if (typeof packageJson?.bin === 'string') return packageJson.bin;
  if (!packageJson?.bin || typeof packageJson.bin !== 'object') return '';
  if (typeof packageJson.bin.llmgateway === 'string') return packageJson.bin.llmgateway;
  if (typeof packageJson.bin.lg === 'string') return packageJson.bin.lg;
  const values = Object.values(packageJson.bin).filter(value => typeof value === 'string');
  return values.length === 1 ? values[0] : '';
}
function resolveManagedCatalogEntry(rootReal) {
  const catalogRoot = fs.realpathSync(path.join(rootReal, 'node_modules', '@llmgateway', 'models'));
  if (!pathInside(rootReal, catalogRoot)) throw new Error('managed model catalog escaped runtime root');
  const packageJson = JSON.parse(fs.readFileSync(path.join(catalogRoot, 'package.json'), 'utf8'));
  if (packageJson?.name !== MANAGED_MODEL_CATALOG_PACKAGE || packageJson?.version !== MANAGED_MODEL_CATALOG_VERSION) throw new Error('managed model catalog version mismatch');
  const rootExport = packageJson?.exports?.['.'] ?? packageJson?.exports;
  const exportPath = typeof rootExport === 'string' ? rootExport : (rootExport?.import || packageJson?.module || '');
  if (typeof exportPath !== 'string' || !exportPath) throw new Error('managed model catalog export missing');
  const catalogEntry = fs.realpathSync(path.resolve(catalogRoot, exportPath));
  if (!pathInside(catalogRoot, catalogEntry) || !pathInside(rootReal, catalogEntry)) throw new Error('managed model catalog entry escaped runtime root');
  if (!fs.statSync(catalogEntry).isFile()) throw new Error('managed model catalog entry is not a file');
  return catalogEntry;
}

function verifyManagedCliDirectory(root) {
  const rootReal = fs.realpathSync(root);
  const packageRoot = path.join(rootReal, 'node_modules', '@llmgateway', 'cli');
  const packageReal = fs.realpathSync(packageRoot);
  if (!pathInside(rootReal, packageReal)) throw new Error('managed CLI package escaped runtime root');
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageReal, 'package.json'), 'utf8'));
  if (packageJson?.name !== MANAGED_CLI_PACKAGE || packageJson?.version !== MANAGED_CLI_VERSION) throw new Error('managed CLI package version mismatch');
  const bin = resolveManagedCliBin(packageJson);
  const entry = fs.realpathSync(path.resolve(packageReal, bin));
  if (!pathInside(packageReal, entry) || !pathInside(rootReal, entry)) throw new Error('managed CLI entry escaped runtime root');
  if (!fs.statSync(entry).isFile()) throw new Error('managed CLI entry is not a file');
  const catalogEntry = resolveManagedCatalogEntry(rootReal);
  return {entry,catalogEntry};
}
function managedCliRuntimeStatus() {
  if (!MANAGED_CLI_ENABLED) return {cliRuntimeState:'unavailable',cliRuntimeVersion:'',cliRuntimeProvisioning:'disabled',cliCatalogState:'unavailable',cliCatalogVersion:''};
  try {
    const descriptor = JSON.parse(fs.readFileSync(MANAGED_CLI_DESCRIPTOR, 'utf8'));
    const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);
    if (descriptor?.format !== 1 || descriptor?.state !== 'ready' || descriptor?.package !== MANAGED_CLI_PACKAGE || descriptor?.version !== MANAGED_CLI_VERSION
        || descriptor?.catalogPackage !== MANAGED_MODEL_CATALOG_PACKAGE || descriptor?.catalogVersion !== MANAGED_MODEL_CATALOG_VERSION
        || fs.realpathSync(String(descriptor.entry || '')) !== verified.entry || fs.realpathSync(String(descriptor.catalogEntry || '')) !== verified.catalogEntry) {
      throw new Error('managed CLI/catalog descriptor mismatch');
    }
    return {cliRuntimeState:'ready',cliRuntimeVersion:MANAGED_CLI_VERSION,cliRuntimeProvisioning:'ok',cliCatalogState:'ready',cliCatalogVersion:MANAGED_MODEL_CATALOG_VERSION};
  } catch (_) {
    const state = readManagedCliState();
    return state.state === 'ready'
      ? {cliRuntimeState:'invalid',cliRuntimeVersion:'',cliRuntimeProvisioning:'unavailable',cliCatalogState:'invalid',cliCatalogVersion:''}
      : {cliRuntimeState:state.state,cliRuntimeVersion:state.version,cliRuntimeProvisioning:state.provisioning,cliCatalogState:'unavailable',cliCatalogVersion:''};
  }
}
function runNpmInstall(stage) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn('npm', ['install','--ignore-scripts','--no-audit','--no-fund','--package-lock=true'], {cwd:stage,stdio:'ignore',env:{...process.env,NO_COLOR:'1',FORCE_COLOR:'0'}});
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch (_) {}
      const force = setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} }, 2000);
      force.unref?.();
    }, MANAGED_CLI_INSTALL_TIMEOUT_MS);
    timer.unref?.();
    child.once('error', finish);
    child.once('exit', (code, signal) => finish(code === 0 && !signal ? null : new Error('managed CLI install failed')));
  });
}
function acquireManagedCliLock() {
  fs.mkdirSync(MANAGED_CLI_ROOT, {recursive:true,mode:0o700});
  try { return fs.openSync(MANAGED_CLI_LOCK, 'wx', 0o600); }
  catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    try {
      if (Date.now() - fs.statSync(MANAGED_CLI_LOCK).mtimeMs > MANAGED_CLI_INSTALL_TIMEOUT_MS * 2) fs.unlinkSync(MANAGED_CLI_LOCK);
      else return null;
    } catch (_) { return null; }
    return fs.openSync(MANAGED_CLI_LOCK, 'wx', 0o600);
  }
}
async function provisionManagedCli() {
  if (!MANAGED_CLI_ENABLED) {
    writeManagedCliState('unavailable','disabled');
    return;
  }
  try {
    const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);
    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry:verified.entry,catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE,catalogVersion:MANAGED_MODEL_CATALOG_VERSION,catalogEntry:verified.catalogEntry,promotedAt:Date.now()});
    writeManagedCliState('ready','ok');
    return;
  } catch (_) {}
  const prior = readManagedCliState();
  if (prior.nextRetryAt > Date.now()) return;
  const lockFd = acquireManagedCliLock();
  if (lockFd === null) return;
  const stage = path.join(MANAGED_CLI_ROOT, `cli-next-${process.pid}-${Date.now()}`);
  const quarantine = path.join(MANAGED_CLI_ROOT, `cli-invalid-${process.pid}-${Date.now()}`);
  let quarantined = false;
  let promoted = false;
  try {
    writeManagedCliState('provisioning','pending');
    fs.mkdirSync(stage, {recursive:false,mode:0o700});
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({private:true,dependencies:{[MANAGED_CLI_PACKAGE]:MANAGED_CLI_VERSION,[MANAGED_MODEL_CATALOG_PACKAGE]:MANAGED_MODEL_CATALOG_VERSION}}, null, 2) + '\n', {mode:0o600});
    await runNpmInstall(stage);
    verifyManagedCliDirectory(stage);
    if (fs.existsSync(MANAGED_CLI_VERSION_ROOT)) {
      fs.renameSync(MANAGED_CLI_VERSION_ROOT, quarantine);
      quarantined = true;
    }
    fs.renameSync(stage, MANAGED_CLI_VERSION_ROOT);
    promoted = true;
    const verified = verifyManagedCliDirectory(MANAGED_CLI_VERSION_ROOT);
    atomicJsonWrite(MANAGED_CLI_DESCRIPTOR, {format:1,state:'ready',package:MANAGED_CLI_PACKAGE,version:MANAGED_CLI_VERSION,entry:verified.entry,catalogPackage:MANAGED_MODEL_CATALOG_PACKAGE,catalogVersion:MANAGED_MODEL_CATALOG_VERSION,catalogEntry:verified.catalogEntry,promotedAt:Date.now()});
    writeManagedCliState('ready','ok');
    if (quarantined) fs.rmSync(quarantine, {recursive:true,force:true});
  } catch (_) {
    try { if (fs.existsSync(stage)) fs.rmSync(stage, {recursive:true,force:true}); } catch (_) {}
    if (quarantined) {
      try { if (promoted && fs.existsSync(MANAGED_CLI_VERSION_ROOT)) fs.rmSync(MANAGED_CLI_VERSION_ROOT, {recursive:true,force:true}); } catch (_) {}
      try { if (!fs.existsSync(MANAGED_CLI_VERSION_ROOT)) fs.renameSync(quarantine, MANAGED_CLI_VERSION_ROOT); } catch (_) {}
    }
    writeManagedCliState('unavailable','backoff',Date.now() + MANAGED_CLI_RETRY_MS);
  } finally {
    try { fs.closeSync(lockFd); } catch (_) {}
    try { fs.unlinkSync(MANAGED_CLI_LOCK); } catch (_) {}
  }
}
function scheduleManagedCliProvisioning() {
  if (managedCliProvisioningPromise) return managedCliProvisioningPromise;
  managedCliProvisioningPromise = provisionManagedCli().catch(() => {}).finally(() => { managedCliProvisioningPromise = null; });
  return managedCliProvisioningPromise;
}

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
  const nextFile = path.join(path.dirname(CURRENT_FILE), `bridge-manager.next-${process.pid}.cjs`);
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
  const nextFile = path.join(path.dirname(CURRENT_FILE), `bridge-manager.rollback-${process.pid}.cjs`);
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
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  try { process.kill(pid, 0); return true; } catch (_) { return false; }
}
function processUid(pid) {
  try {
    const text = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = text.match(/^Uid:\s+(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch (_) { return null; }
}
function sameArgs(a, b) {
  return JSON.stringify(Array.isArray(a) ? a : []) === JSON.stringify(Array.isArray(b) ? b : []);
}
function processMatchesSpec(pid, spec) {
  const candidate = safeCandidate(readProcess(pid));
  if (!candidate.safe || !spec) return false;
  return path.resolve(candidate.exe) === path.resolve(String(spec.exe || spec.executable || ''))
    && path.resolve(candidate.script) === path.resolve(String(spec.script || ''))
    && path.resolve(candidate.cwd) === path.resolve(String(spec.cwd || ''))
    && sameArgs(candidate.nodeArgs, spec.nodeArgs)
    && sameArgs(candidate.scriptArgs, spec.scriptArgs);
}
function canonicalPidFileCandidate() {
  let raw = '';
  try {
    const stat = fs.statSync(LEGACY_ENGINE_PID_FILE);
    if (!stat.isFile()) return {safe:false,reason:'pidfile-not-file',pid:null};
    if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) return {safe:false,reason:'pidfile-foreign-owner',pid:null};
    raw = fs.readFileSync(LEGACY_ENGINE_PID_FILE, 'utf8').trim();
  } catch (_) { return {safe:false,reason:'pidfile-missing',pid:null}; }
  if (!/^\d+$/.test(raw)) return {safe:false,reason:'pidfile-invalid',pid:null};
  const pid = Number(raw);
  if (!processAlive(pid)) return {safe:false,reason:'pidfile-stale',pid};
  if (typeof process.getuid === 'function') {
    const uid = processUid(pid);
    if (uid != null && uid !== process.getuid()) return {safe:false,reason:'pidfile-foreign-process',pid};
  }
  const candidate = safeCandidate(readProcess(pid));
  if (!candidate.safe) return {...candidate,pid};
  if (path.resolve(candidate.script) !== path.resolve(LEGACY_ENGINE_SCRIPT)) return {safe:false,reason:'pidfile-unexpected-script',pid};
  return {...candidate,reason:'canonical-pidfile'};
}
function discoverEngineCandidate() {
  const pid = listenerPid(ENGINE_PORT);
  if (pid) return safeCandidate(readProcess(pid));
  const fallback = canonicalPidFileCandidate();
  if (fallback.safe) return fallback;
  return {safe:false,reason:fallback.reason || 'listener-unresolved',pid:fallback.pid ?? null};
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
function engineServiceLdPreloadLine() {
  return fs.existsSync(TERMUX_EXEC_LD_PRELOAD) ? `export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}\n` : '';
}
function engineServiceManagedCliLine() {
  return `export DEVPASS_BRIDGE_MANAGED_CLI=${shellQuote(MANAGED_CLI_ENABLED ? '1' : '0')}\n`;
}
function engineServiceEnvironmentReady() {
  try {
    const run = fs.readFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), 'utf8');
    const preloadReady = !fs.existsSync(TERMUX_EXEC_LD_PRELOAD) || run.includes(`export LD_PRELOAD=${shellQuote(TERMUX_EXEC_LD_PRELOAD)}`);
    return preloadReady && run.includes(`export DEVPASS_BRIDGE_MANAGED_CLI=${shellQuote(MANAGED_CLI_ENABLED ? '1' : '0')}`);
  } catch (_) { return false; }
}
function writeEngineService(candidate, down = true) {
  fs.mkdirSync(ENGINE_SERVICE_DIR, {recursive:true});
  const command = [candidate.exe, ...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs].map(shellQuote).join(' ');
  const run = `#!/data/data/com.termux/files/usr/bin/sh
${engineServiceLdPreloadLine()}${engineServiceManagedCliLine()}cd ${shellQuote(candidate.cwd)}
exec ${command}
`;
  fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'run'), run, {mode:0o700});
  fs.chmodSync(path.join(ENGINE_SERVICE_DIR, 'run'), 0o700);
  const downFile = path.join(ENGINE_SERVICE_DIR, 'down');
  if (down) fs.writeFileSync(downFile, ''); else { try { fs.unlinkSync(downFile); } catch (_) {} }
}
function fileSha256(file) {
  try { return sha256(fs.readFileSync(file)); } catch (_) { return ''; }
}
function bundledEngineReady() {
  return fileSha256(BUNDLED_ENGINE_FILE) === BUNDLED_ENGINE_SHA256;
}
async function ensureBundledEngine() {
  if (bundledEngineReady()) return {ready:true,updated:false,path:BUNDLED_ENGINE_FILE,sha256:BUNDLED_ENGINE_SHA256,version:BUNDLED_ENGINE_VERSION};
  const text = await requestText(BUNDLED_ENGINE_URL);
  const bytes = Buffer.from(text, 'utf8');
  if (sha256(bytes) !== BUNDLED_ENGINE_SHA256) throw new Error('bundled engine sha256 mismatch');
  const nextFile = path.join(RUNTIME_ROOT, `bridge-engine.next-${process.pid}.mjs`);
  fs.writeFileSync(nextFile, bytes, {mode:0o700});
  try {
    syntaxCheck(nextFile);
    fs.renameSync(nextFile, BUNDLED_ENGINE_FILE);
    fs.chmodSync(BUNDLED_ENGINE_FILE, 0o700);
  } catch (e) {
    try { if (fs.existsSync(nextFile)) fs.unlinkSync(nextFile); } catch (_) {}
    throw e;
  }
  if (!bundledEngineReady()) throw new Error('bundled engine install verification failed');
  return {ready:true,updated:true,path:BUNDLED_ENGINE_FILE,sha256:BUNDLED_ENGINE_SHA256,version:BUNDLED_ENGINE_VERSION};
}
function descriptorCandidate(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') return null;
  const exe = String(descriptor.exe || descriptor.executable || '');
  const script = String(descriptor.script || '');
  const cwd = String(descriptor.cwd || '');
  if (!exe || !script || !cwd) return null;
  return {safe:true,reason:'descriptor',pid:null,exe,script,cwd,nodeArgs:Array.isArray(descriptor.nodeArgs) ? descriptor.nodeArgs : [],scriptArgs:Array.isArray(descriptor.scriptArgs) ? descriptor.scriptArgs : []};
}
async function waitForEngineDown(pid, timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!processAlive(pid) && !(await bridgeReachable(500))) return true;
    await sleep(200);
  }
  return false;
}
async function startManagedCandidate(candidate, expectedVersion = '') {
  writeEngineService(candidate, false);
  try { fs.unlinkSync(path.join(ENGINE_SERVICE_DIR, 'down')); } catch (_) {}
  try { execFileSync('sv', ['up', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  return waitForManagedEngine(candidate, expectedVersion);
}
const BRIDGE_PROBE_PATH = '/__local_usage_runtime_probe__';
async function bridgeAuthProbe(timeoutMs = 1500) {
  const token = readToken();
  if (!token) throw new Error('bridge token missing');
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const req = http.request({host:ENGINE_HOST,port:ENGINE_PORT,path:BRIDGE_PROBE_PATH,method:'GET',headers:{Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'}}, res => {
      res.on('data', chunk => {
        total += chunk.length;
        if (total > 8192) return req.destroy(new Error('bridge auth probe response too large'));
        chunks.push(chunk);
      });
      res.on('end', () => {
        const statusCode = Number(res.statusCode);
        const text = Buffer.concat(chunks).toString('utf8');
        if (statusCode !== 404) return reject(new Error(`bridge auth probe HTTP ${statusCode}`));
        let body;
        try { body = JSON.parse(text); } catch (_) { return reject(new Error('bridge auth probe JSON invalid')); }
        if (String(body?.error || '') !== 'Not found') return reject(new Error('bridge auth probe signature mismatch'));
        resolve({ok:true,statusCode});
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('bridge auth probe timeout')));
    req.on('error', reject); req.end();
  });
}
async function bridgeHealth(timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    const req = http.request({host:ENGINE_HOST,port:ENGINE_PORT,path:'/health',method:'GET',headers:{Accept:'application/json','Cache-Control':'no-cache'}}, res => {
      res.on('data', chunk => {
        total += chunk.length;
        if (total > 64 * 1024) return req.destroy(new Error('bridge health response too large'));
        chunks.push(chunk);
      });
      res.on('end', () => {
        const statusCode = Number(res.statusCode);
        if (statusCode < 200 || statusCode >= 300) return reject(new Error(`bridge health HTTP ${statusCode}`));
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (_) { return reject(new Error('bridge health JSON invalid')); }
        if (body?.ok !== true || String(body?.status || '') !== 'healthy' || Number(body?.port) !== ENGINE_PORT) return reject(new Error('bridge health signature mismatch'));
        resolve(body);
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('bridge health timeout')));
    req.on('error', reject); req.end();
  });
}
async function bridgeIdentity(timeoutMs = 1500) {
  const [probe, health] = await Promise.all([bridgeAuthProbe(timeoutMs), bridgeHealth(timeoutMs)]);
  return {ok:true,probe,health,bridgeVersion:String(health?.version || '')};
}
async function bridgeReachable(timeoutMs = 700) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const req = http.request({host:ENGINE_HOST,port:ENGINE_PORT,path:'/health',method:'GET',headers:{Connection:'close'}}, res => {
      res.resume();
      finish(true);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('bridge reachability timeout')));
    req.on('error', () => finish(false)); req.end();
  });
}
async function waitForManagedEngine(expected, expectedVersion = '', timeoutMs = 12000) {
  const started = Date.now();
  let lastError = '';
  while (Date.now() - started < timeoutMs) {
    const service = serviceStatus();
    const pid = listenerPid(ENGINE_PORT);
    const processVerified = Boolean(service.running && service.pid && processMatchesSpec(service.pid, expected));
    if (service.running && service.pid && (pid === service.pid || (!pid && processVerified))) {
      try {
        const identity = await bridgeIdentity();
        const liveVersion = String(identity?.bridgeVersion || '');
        if (expectedVersion && liveVersion !== expectedVersion) {
          lastError = `managed engine version mismatch: expected ${expectedVersion}, got ${liveVersion || 'unknown'}`;
          await sleep(350);
          continue;
        }
        return {ok:true,service,pid:service.pid,identity,bridgeVersion:identity.bridgeVersion,ownership:pid === service.pid ? 'proc-net' : 'service-process'};
      } catch (e) { lastError = e?.message || String(e); }
    }
    await sleep(350);
  }
  return {ok:false,error:lastError || 'managed engine did not become verified',service:serviceStatus(),pid:listenerPid(ENGINE_PORT)};
}
async function engineRuntimeStatus() {
  const descriptor = readDescriptor();
  const service = serviceStatus();
  const pid = listenerPid(ENGINE_PORT);
  let identity = null;
  try { identity = await bridgeIdentity(1500); } catch (_) {}
  const processVerified = Boolean(descriptor && service.running && service.pid && processMatchesSpec(service.pid, descriptor));
  const managed = Boolean(descriptor && identity && service.running && service.pid && (pid === service.pid || (!pid && processVerified)));
  const bundleReady = bundledEngineReady();
  const descriptorBundled = Boolean(descriptor && path.resolve(String(descriptor.script || '')) === path.resolve(BUNDLED_ENGINE_FILE));
  const serviceEnvironmentReady = engineServiceEnvironmentReady();
  const engineBundled = Boolean(managed && descriptorBundled && bundleReady && serviceEnvironmentReady && String(identity?.bridgeVersion || '') === BUNDLED_ENGINE_VERSION);
  const candidate = managed ? {safe:true,reason:'managed-service'} : discoverEngineCandidate();
  const fallbackNeedsProbe = candidate?.reason === 'canonical-pidfile';
  const candidateSafe = typeof candidate?.safe === 'boolean' ? (candidate.safe && (!fallbackNeedsProbe || Boolean(identity))) : null;
  const candidateReason = fallbackNeedsProbe && !identity ? 'pidfile-auth-unverified' : String(candidate?.reason || '');
  return {
    engineManaged:managed,
    engineMode:managed ? (engineBundled ? 'managed-bundled' : 'managed-adopted') : 'legacy-external',
    engineService:ENGINE_SERVICE,
    engineVersion:String(identity?.bridgeVersion || ''),
    engineBundled,
    engineSourceMode:engineBundled ? 'bundled' : (managed ? 'adopted' : 'legacy'),
    engineBundleAvailable:true,
    engineBundleReady:bundleReady,
    engineBundleVersion:BUNDLED_ENGINE_VERSION,
    engineBundleSha256:BUNDLED_ENGINE_SHA256,
    engineServiceEnvironmentReady:serviceEnvironmentReady,
    candidateSafe,
    candidateReason,
    adoptionState:managed ? 'adopted' : descriptor ? 'service-degraded' : 'pending'
  };
}
async function adoptEngine() {
  const current = await engineRuntimeStatus();
  if (current.engineManaged) return {ok:true,adopted:false,state:'current',...current};
  const candidate = discoverEngineCandidate();
  if (!candidate.safe) {
    const retryable = ['listener-unresolved','pidfile-missing','pidfile-stale','process-unavailable'].includes(String(candidate.reason || ''));
    return {ok:false,adopted:false,state:'unsafe-candidate',candidateSafe:false,retryable,error:`engine adoption refused: ${candidate.reason}`};
  }
  try { await bridgeIdentity(1500); }
  catch (e) { return {ok:false,adopted:false,state:'bridge-unhealthy',candidateSafe:true,retryable:true,error:e?.message || String(e)}; }
  writeEngineService(candidate, true);
  try {
    process.kill(candidate.pid, 'SIGTERM');
  } catch (e) {
    return {ok:false,adopted:false,state:'stop-failed',candidateSafe:true,retryable:true,error:e?.message || String(e)};
  }
  const stopStarted = Date.now();
  let stopped = false;
  while (Date.now() - stopStarted < 5000) {
    if (!processAlive(candidate.pid) && !(await bridgeReachable(500))) { stopped = true; break; }
    await sleep(200);
  }
  if (!stopped) {
    return {ok:false,adopted:false,state:'stop-timeout',candidateSafe:true,retryable:true,error:'legacy bridge did not stop cleanly after SIGTERM'};
  }
  try { fs.unlinkSync(path.join(ENGINE_SERVICE_DIR, 'down')); } catch (_) {}
  try { execFileSync('sv', ['up', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  const verified = await waitForManagedEngine(candidate);
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
      sourceVersion:String(verified.bridgeVersion || '')
    };
    fs.writeFileSync(ENGINE_DESCRIPTOR, JSON.stringify(descriptor, null, 2) + '\n', {mode:0o600});
    return {ok:true,adopted:true,state:'adopted',engineManaged:true,engineMode:'managed-adopted',engineService:ENGINE_SERVICE,engineVersion:descriptor.sourceVersion,candidateSafe:true};
  }
  try { execFileSync('sv', ['down', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  try { fs.writeFileSync(path.join(ENGINE_SERVICE_DIR, 'down'), ''); } catch (_) {}
  if (!(await bridgeReachable(700)) && !processAlive(candidate.pid)) {
    try {
      const child = spawn(candidate.exe, [...candidate.nodeArgs, candidate.script, ...candidate.scriptArgs], {cwd:candidate.cwd,detached:true,stdio:'ignore',env:process.env});
      child.unref();
    } catch (_) {}
  }
  return {ok:false,adopted:false,state:'verification-failed',candidateSafe:true,retryable:true,error:verified.error || 'managed engine verification failed'};
}
async function syncBundledEngine() {
  const current = await engineRuntimeStatus();
  if (!current.engineManaged) return {ok:false,synced:false,state:'engine-not-managed',retryable:true,error:'managed engine required before bundle sync',...current};
  if (current.engineBundled && String(current.engineVersion || '') === BUNDLED_ENGINE_VERSION) return {ok:true,synced:false,state:'current',...current};
  const descriptor = readDescriptor();
  const previous = descriptorCandidate(descriptor);
  const service = serviceStatus();
  if (!previous || !service.running || !service.pid || !processMatchesSpec(service.pid, descriptor)) {
    return {ok:false,synced:false,state:'managed-identity-unverified',retryable:true,error:'managed engine process identity could not be verified'};
  }
  try { await ensureBundledEngine(); }
  catch (e) { return {ok:false,synced:false,state:'bundle-stage-failed',retryable:true,error:e?.message || String(e)}; }
  const next = {...previous,script:BUNDLED_ENGINE_FILE};
  try { execFileSync('sv', ['down', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  if (!(await waitForEngineDown(service.pid))) {
    try { execFileSync('sv', ['up', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
    return {ok:false,synced:false,state:'stop-timeout',retryable:true,error:'managed engine did not stop cleanly for bundle sync'};
  }
  const verified = await startManagedCandidate(next, BUNDLED_ENGINE_VERSION);
  if (verified.ok) {
    const nextDescriptor = {
      ...descriptor,
      format:2,
      bundledAt:new Date().toISOString(),
      service:ENGINE_SERVICE,
      cwd:next.cwd,
      executable:next.exe,
      script:next.script,
      nodeArgs:next.nodeArgs,
      scriptArgs:next.scriptArgs,
      sourceMode:'bundled',
      sourceVersion:String(verified.bridgeVersion || BUNDLED_ENGINE_VERSION),
      artifactSha256:BUNDLED_ENGINE_SHA256
    };
    fs.writeFileSync(ENGINE_DESCRIPTOR, JSON.stringify(nextDescriptor, null, 2) + '\n', {mode:0o600});
    return {ok:true,synced:true,state:'bundled',engineManaged:true,engineBundled:true,engineMode:'managed-bundled',engineSourceMode:'bundled',engineService:ENGINE_SERVICE,engineVersion:nextDescriptor.sourceVersion,engineBundleVersion:BUNDLED_ENGINE_VERSION,engineBundleSha256:BUNDLED_ENGINE_SHA256};
  }
  try { execFileSync('sv', ['down', ENGINE_SERVICE_DIR], {stdio:'ignore',timeout:3000}); } catch (_) {}
  const rollback = await startManagedCandidate(previous);
  if (rollback.ok) fs.writeFileSync(ENGINE_DESCRIPTOR, JSON.stringify(descriptor, null, 2) + '\n', {mode:0o600});
  return {ok:false,synced:false,state:'verification-failed',retryable:true,rollbackRestored:Boolean(rollback.ok),error:verified.error || 'bundled engine verification failed'};
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
  try {
  if (!authorized(req)) return send(res, 401, {ok:false,error:'unauthorized'});
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/status') {
    const engine = await engineRuntimeStatus();
    return send(res, 200, {
      ok:true,protocol:PROTOCOL,version:MANAGER_VERSION,productVersion:PRODUCT_VERSION,selfUpdate:true,engineAdoption:true,
      ...engine,...managedCliRuntimeStatus(),restartMode:RESTART_MODE,updateChannel:PRODUCT_MANIFEST_URL,bind:`${HOST}:${PORT}`,
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
  if (req.method === 'POST' && url.pathname === '/engine/sync') {
    try { const result = await syncBundledEngine(); return send(res, result.ok ? 200 : (result.retryable === false ? 409 : 503), result); }
    catch (e) { return send(res, 500, {ok:false,synced:false,state:'error',retryable:true,error:e?.message || String(e)}); }
  }
  if (req.method === 'POST' && url.pathname === '/restart') return send(res, 200, {ok:true,restart:true}, true);
  if (req.method === 'POST' && url.pathname === '/rollback') {
    try { const result = rollbackSelf(); return send(res, result.ok ? 200 : 409, result, result.restartRequired === true); }
    catch (e) { return send(res, 500, {ok:false,rolledBack:false,error:e?.message || String(e)}); }
  }
  return send(res, 404, {ok:false,error:'not found'});
  } catch (error) {
    const kind = String(error?.code || error?.name || 'ERROR').slice(0, 80);
    console.error(`[Local Usage Runtime Manager] request boundary: ${kind}`);
    if (res.writableEnded) return;
    if (res.headersSent) {
      try { res.destroy(); } catch (_) {}
      return;
    }
    return send(res, 500, {ok:false,error:'manager internal request error',code:'MANAGER_INTERNAL_ERROR',retryable:true});
  }
});
server.on('error', error => { console.error(`[Local Usage Runtime Manager] ${error?.message || error}`); process.exitCode = 1; });
server.listen(PORT, HOST, () => {
  console.log(`[Local Usage Runtime Manager] ${MANAGER_VERSION} · ${HOST}:${PORT} · ${RESTART_MODE} · bundled-engine`);
  setImmediate(() => { scheduleManagedCliProvisioning(); });
});
