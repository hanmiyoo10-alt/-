#!/usr/bin/env node
'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');

const MANAGER_VERSION = '1.0.0';
const PRODUCT_VERSION = '3.0.0-alpha.5.1';
const PROTOCOL = 'bridge-manager-v1';
const HOST = '127.0.0.1';
const PORT = Number(process.env.LUD_MANAGER_PORT || 39119);
const PRODUCT_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';
const RELEASE_PREFIX = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/';
const CURRENT_FILE = path.resolve(__filename);
const BACKUP_FILE = `${CURRENT_FILE}.bak`;
const RESTART_MODE = String(process.env.LUD_MANAGER_RESTART_MODE || 'manual');
const TOKEN_FILES = [
  process.env.LUD_BRIDGE_TOKEN_FILE,
  path.join(os.homedir(), '.config/llmgateway-devpass-bridge/token'),
  path.join(os.homedir(), '.config/local-usage-dashboard/token')
].filter(Boolean);

function readToken() {
  for (const file of TOKEN_FILES) {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return value;
    } catch (_) {}
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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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
      const chunks = [];
      let total = 0;
      res.on('data', chunk => {
        total += chunk.length;
        if (total > 2 * 1024 * 1024) {
          req.destroy(new Error('release artifact too large'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.setTimeout(15000, () => req.destroy(new Error('release request timeout')));
    req.on('error', reject);
  });
}

function syntaxCheck(file) {
  execFileSync(process.execPath, ['--check', file], {stdio:'ignore'});
}

function scheduleRestart() {
  setTimeout(() => {
    if (RESTART_MODE === 'runit') process.exit(0);
    try {
      const child = spawn(process.execPath, [CURRENT_FILE], {
        detached:true,
        stdio:'ignore',
        env:{...process.env,LUD_MANAGER_RESTART_MODE:'manual'}
      });
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
  if (sha256(current) === expected) {
    return {ok:true,updated:false,version:MANAGER_VERSION,productVersion:String(manifest.productVersion || PRODUCT_VERSION),restartRequired:false};
  }
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

function send(res, status, body, restart = false) {
  const text = JSON.stringify(body);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(text)});
  res.end(text, () => { if (restart) scheduleRestart(); });
}

const server = http.createServer(async (req, res) => {
  if (!authorized(req)) return send(res, 401, {ok:false,error:'unauthorized'});
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/status') {
    return send(res, 200, {
      ok:true,
      protocol:PROTOCOL,
      version:MANAGER_VERSION,
      productVersion:PRODUCT_VERSION,
      selfUpdate:true,
      engineManaged:false,
      restartMode:RESTART_MODE,
      updateChannel:PRODUCT_MANIFEST_URL,
      bind:`${HOST}:${PORT}`,
      tokenSource:TOKEN_FILES.find(file => { try { return Boolean(fs.readFileSync(file, 'utf8').trim()); } catch (_) { return false; } }) ? 'existing-file' : 'missing'
    });
  }
  if (req.method === 'POST' && url.pathname === '/sync') {
    try {
      const result = await syncSelf();
      return send(res, 200, result, result.restartRequired === true);
    } catch (e) {
      return send(res, 500, {ok:false,updated:false,error:e?.message || String(e)});
    }
  }
  if (req.method === 'POST' && url.pathname === '/restart') {
    return send(res, 200, {ok:true,restart:true}, true);
  }
  if (req.method === 'POST' && url.pathname === '/rollback') {
    try {
      const result = rollbackSelf();
      return send(res, result.ok ? 200 : 409, result, result.restartRequired === true);
    } catch (e) {
      return send(res, 500, {ok:false,rolledBack:false,error:e?.message || String(e)});
    }
  }
  return send(res, 404, {ok:false,error:'not found'});
});

server.on('error', error => {
  console.error(`[Local Usage Runtime Manager] ${error?.message || error}`);
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log(`[Local Usage Runtime Manager] ${MANAGER_VERSION} · ${HOST}:${PORT} · ${RESTART_MODE}`);
});
