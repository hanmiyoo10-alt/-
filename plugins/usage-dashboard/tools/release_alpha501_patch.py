from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
core = ROOT / 'src/00-runtime-core.part.js'
bridge_io = ROOT / 'src/20-bridge-io.part.js'
refresh = ROOT / 'src/30-refresh-runtime.part.js'
diag = ROOT / 'src/40-diagnostics.part.js'


def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit(f'{label} marker mismatch: {text.count(old)}')
    return text.replace(old, new, 1)

# ---- plugin runtime -------------------------------------------------------
s = core.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.5.0', '//@version 3.0.0-alpha.5.1', 'meta version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.5.0';", "const VERSION = '3.0.0-alpha.5.1';", 'runtime version')
s = replace_once(
    s,
    "  const RUNTIME_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';\n",
    "  const RUNTIME_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';\n  const BRIDGE_MANAGER_BASE = 'http://127.0.0.1:39119';\n  const BRIDGE_MANAGER_PROBE_INTERVAL_MS = 60000;\n",
    'manager runtime constants'
)
s = replace_once(
    s,
    "    runtimeStatus: null,\n    data: null\n",
    "    runtimeStatus: null,\n    bridgeManagerRuntime: null,\n    bridgeManagerLastProbeAt: null,\n    bridgeManagerSyncedProductVersion: '',\n    data: null\n",
    'manager state defaults'
)
old_helper = """  function bridgeRuntimeSnapshot() {
    const bridge = state?.data?.bridge || null;
    const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : null;
    const manager = bridge?.manager && typeof bridge.manager === 'object' ? bridge.manager : null;
    const truthy = value => value === true || value === 1 || String(value || '').toLowerCase() === 'true';
    const selfUpdate = truthy(manager?.selfUpdate ?? manager?.self_update ?? capabilities?.selfUpdate ?? capabilities?.self_update);
    const managed = truthy(manager?.managed ?? capabilities?.managed) || selfUpdate;
    const managerProtocol = String(manager?.protocol || manager?.managementProtocol || manager?.management_protocol || capabilities?.managementProtocol || capabilities?.management_protocol || capabilities?.managerProtocol || 'none');
    return {
      mode: managed ? 'managed-sidecar' : 'legacy-external',
      managed,
      selfUpdate,
      managerProtocol,
      bridgeVersion:String(bridge?.version || '')
    };
  }"""
new_helper = """  function bridgeRuntimeSnapshot() {
    const bridge = state?.data?.bridge || null;
    const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : null;
    const embeddedManager = bridge?.manager && typeof bridge.manager === 'object' ? bridge.manager : null;
    const probedManager = state?.bridgeManagerRuntime?.connected === true ? state.bridgeManagerRuntime : null;
    const manager = probedManager || embeddedManager;
    const truthy = value => value === true || value === 1 || String(value || '').toLowerCase() === 'true';
    const managerInstalled = Boolean(probedManager) || truthy(embeddedManager?.managed ?? capabilities?.managed);
    const selfUpdate = truthy(manager?.selfUpdate ?? manager?.self_update ?? capabilities?.selfUpdate ?? capabilities?.self_update);
    const engineManaged = truthy(manager?.engineManaged ?? manager?.engine_managed ?? capabilities?.engineManaged ?? capabilities?.engine_managed);
    const managerProtocol = String(manager?.protocol || manager?.managementProtocol || manager?.management_protocol || capabilities?.managementProtocol || capabilities?.management_protocol || capabilities?.managerProtocol || 'none');
    return {
      mode: engineManaged ? 'managed-sidecar' : 'legacy-external',
      managerInstalled,
      engineManaged,
      selfUpdate,
      managerProtocol,
      managerVersion:String(manager?.version || ''),
      managerProductVersion:String(manager?.productVersion || manager?.product_version || ''),
      bridgeVersion:String(bridge?.version || '')
    };
  }"""
s = replace_once(s, old_helper, new_helper, 'bridge runtime snapshot')
core.write_text(s)

b = bridge_io.read_text()
append = r'''
  function bridgeManagerAuthHeaders() {
    return {Accept:'application/json','X-Local-Bridge-Key':token,'X-DevPass-Bridge-Key':token,'Cache-Control':'no-cache'};
  }

  function normalizeBridgeManagerStatus(raw) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      connected:true,
      ok:raw.ok !== false,
      protocol:String(raw.protocol || raw.managementProtocol || 'none'),
      version:String(raw.version || ''),
      productVersion:String(raw.productVersion || raw.product_version || ''),
      selfUpdate:raw.selfUpdate === true || raw.self_update === true,
      engineManaged:raw.engineManaged === true || raw.engine_managed === true,
      restartMode:String(raw.restartMode || raw.restart_mode || ''),
      updateChannel:String(raw.updateChannel || raw.update_channel || ''),
      checkedAt:Date.now(),
      error:''
    };
  }

  async function fetchBridgeManagerStatus(force = false) {
    const now = Date.now();
    const lastProbe = Number(state.bridgeManagerLastProbeAt || 0);
    if (!force && state.bridgeManagerRuntime && lastProbe > 0 && now - lastProbe < BRIDGE_MANAGER_PROBE_INTERVAL_MS) {
      return state.bridgeManagerRuntime;
    }
    state.bridgeManagerLastProbeAt = now;
    if (!token) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,restartMode:'',updateChannel:'',checkedAt:now,error:'missing token'};
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/status`, {method:'GET',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      if (!res.ok) return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,restartMode:'',updateChannel:'',checkedAt:Date.now(),error:`HTTP ${res.status}`};
      const normalized = normalizeBridgeManagerStatus(JSON.parse(text));
      return normalized || {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,restartMode:'',updateChannel:'',checkedAt:Date.now(),error:'invalid manager status'};
    } catch (e) {
      return {connected:false,ok:false,protocol:'none',version:'',productVersion:'',selfUpdate:false,engineManaged:false,restartMode:'',updateChannel:'',checkedAt:Date.now(),error:e?.message || String(e)};
    }
  }

  async function syncBridgeManagerIfNeeded(status) {
    if (!status?.connected || status.selfUpdate !== true) return status;
    if (String(status.productVersion || '') === VERSION) return status;
    if (String(state.bridgeManagerSyncedProductVersion || '') === VERSION) return status;
    try {
      const res = await Risuai.nativeFetch(`${BRIDGE_MANAGER_BASE}/sync`, {method:'POST',headers:bridgeManagerAuthHeaders()});
      const text = await res.text();
      if (!res.ok) return {...status,syncError:`HTTP ${res.status}`};
      const payload = JSON.parse(text);
      state.bridgeManagerSyncedProductVersion = VERSION;
      return {...status,lastSyncAction:payload?.updated ? 'updated' : 'current',syncTarget:String(payload?.productVersion || VERSION),syncError:''};
    } catch (e) {
      return {...status,syncError:e?.message || String(e)};
    }
  }
'''
if '  async function fetchBridgeManagerStatus(force = false) {' in b:
    raise SystemExit('manager I/O already present')
b = b + append
bridge_io.write_text(b)

r = refresh.read_text()
r = replace_once(
    r,
    "        state.data = applyObservedToday(await fetchSnapshot());\n        collectRecentRequestLedger(state.data);\n",
    "        state.data = applyObservedToday(await fetchSnapshot());\n        collectRecentRequestLedger(state.data);\n        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');\n        state.bridgeManagerRuntime = await syncBridgeManagerIfNeeded(managerStatus);\n",
    'refresh manager probe'
)
refresh.write_text(r)

d = diag.read_text()
d = replace_once(
    d,
    "      `Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION} · product ${VERSION} · plugin bundled · bridge ${runtimeBridge.mode}`,\n      `Bridge manager: protocol ${runtimeBridge.managerProtocol} · managed ${runtimeBridge.managed ? 'yes' : 'no'} · self-update ${runtimeBridge.selfUpdate ? 'yes' : 'no'} · target ${BRIDGE_MANAGER_PROTOCOL}`,\n      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`,",
    "      `Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION} · product ${VERSION} · plugin bundled · bridge ${runtimeBridge.mode} · manager ${runtimeBridge.managerInstalled ? 'installed' : 'absent'}`,\n      `Bridge manager: protocol ${runtimeBridge.managerProtocol} · installed ${runtimeBridge.managerInstalled ? 'yes' : 'no'} · self-update ${runtimeBridge.selfUpdate ? 'yes' : 'no'} · engine-managed ${runtimeBridge.engineManaged ? 'yes' : 'no'} · ${runtimeBridge.managerVersion ? `v${runtimeBridge.managerVersion}` : 'v—'} · target ${BRIDGE_MANAGER_PROTOCOL}`,\n      `Bridge manager probe: ${state.bridgeManagerRuntime?.connected ? 'connected' : 'unavailable'} · checked ${state.bridgeManagerRuntime?.checkedAt ? age(state.bridgeManagerRuntime.checkedAt) : '—'} · product ${state.bridgeManagerRuntime?.productVersion || '—'} · sync ${state.bridgeManagerSyncedProductVersion || 'none'}`,\n      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`,",
    'manager diagnostics'
)
diag.write_text(d)

# ---- managed sidecar artifact -------------------------------------------
runtime = ROOT / 'runtime'
runtime.mkdir(parents=True, exist_ok=True)
manager = runtime / 'bridge-manager.cjs'
manager.write_text(r'''#!/usr/bin/env node
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
''')
manager.chmod(0o700)

bootstrap = runtime / 'bootstrap-bridge-manager.sh'
bootstrap.write_text(r'''#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

PRODUCT_MANIFEST_URL='https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json'
ROOT="$HOME/.local/share/local-usage-dashboard/runtime"
MANAGER="$ROOT/bridge-manager.cjs"
TOKEN_FILE="$HOME/.config/llmgateway-devpass-bridge/token"
SERVICE_NAME='local-usage-runtime-manager'
SERVICE_DIR="$PREFIX/var/service/$SERVICE_NAME"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$ROOT"
curl -fLsS --retry 2 --connect-timeout 15 "$PRODUCT_MANIFEST_URL" -o "$TMP/product-manifest.json"
MANAGER_URL="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.artifact||''))" "$TMP/product-manifest.json")"
MANAGER_SHA="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.sha256||''))" "$TMP/product-manifest.json")"
MANAGER_VERSION="$(node -e "const m=require(process.argv[1]);process.stdout.write(String(m.components?.bridgeManager?.version||''))" "$TMP/product-manifest.json")"
case "$MANAGER_URL" in
  https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/*) ;;
  *) echo 'Bridge manager URL 검증 실패'; exit 1 ;;
esac
[[ "$MANAGER_SHA" =~ ^[0-9a-f]{64}$ ]] || { echo 'Bridge manager SHA256 검증 실패'; exit 1; }

curl -fLsS --retry 2 --connect-timeout 15 "$MANAGER_URL" -o "$TMP/bridge-manager.cjs"
node --check "$TMP/bridge-manager.cjs" >/dev/null
ACTUAL_SHA="$(node -e "const fs=require('fs'),c=require('crypto');process.stdout.write(c.createHash('sha256').update(fs.readFileSync(process.argv[1])).digest('hex'))" "$TMP/bridge-manager.cjs")"
[[ "$ACTUAL_SHA" == "$MANAGER_SHA" ]] || { echo 'Bridge manager artifact SHA256 불일치'; exit 1; }
install -m 700 "$TMP/bridge-manager.cjs" "$MANAGER"

mkdir -p "$SERVICE_DIR"
cat > "$SERVICE_DIR/run" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
export LUD_MANAGER_RESTART_MODE=runit
export LUD_BRIDGE_TOKEN_FILE="$TOKEN_FILE"
exec node "$MANAGER"
EOF
chmod 700 "$SERVICE_DIR/run"
rm -f "$SERVICE_DIR/down"

mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/20-local-usage-runtime" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock >/dev/null 2>&1 || true
if [ -f "$PREFIX/etc/profile.d/start-services.sh" ]; then
  . "$PREFIX/etc/profile.d/start-services.sh"
fi
sv up "$SERVICE_DIR" >/dev/null 2>&1 || true
EOF
chmod 700 "$HOME/.termux/boot/20-local-usage-runtime"

if command -v sv-enable >/dev/null 2>&1; then
  sv-enable "$SERVICE_NAME" >/dev/null 2>&1 || true
fi
if command -v sv >/dev/null 2>&1; then
  sv up "$SERVICE_DIR" >/dev/null 2>&1 || true
fi
sleep 1

if [ -s "$TOKEN_FILE" ]; then
  TOKEN="$(cat "$TOKEN_FILE")"
  if curl -fsS --connect-timeout 3 -H "X-DevPass-Bridge-Key: $TOKEN" http://127.0.0.1:39119/status > "$TMP/status.json" 2>/dev/null; then
    node -e "const s=require(process.argv[1]);console.log('Bridge manager 설치 완료 · '+s.protocol+' · v'+s.version+' · self-update '+(s.selfUpdate?'yes':'no'))" "$TMP/status.json"
  else
    echo 'Bridge manager 파일/서비스 설치 완료 · 상태 확인은 아직 대기'
  fi
else
  echo 'Bridge manager 설치 완료 · 기존 Bridge token 파일을 찾지 못해서 상태 인증은 대기'
fi

echo "Manager: $MANAGER_VERSION"
echo '기존 39117 Bridge와 토큰은 변경하지 않았어.'
echo 'Termux:Boot이 설치되어 있고 한 번 실행된 기기에서는 ~/.termux/boot/20-local-usage-runtime 이 termux-services 시작을 이어받아.'
''')
bootstrap.chmod(0o700)

manager_sha = hashlib.sha256(manager.read_bytes()).hexdigest()
bootstrap_sha = hashlib.sha256(bootstrap.read_bytes()).hexdigest()
manifest = {
    'format': 1,
    'product': 'Local Usage Dashboard',
    'productVersion': '3.0.0-alpha.5.1',
    'releaseBranch': 'release-usage-dashboard',
    'architecture': 'single-product-modular-sidecar',
    'components': {
        'plugin': {
            'mode': 'bundled',
            'version': '3.0.0-alpha.5.1',
            'artifact': 'plugins/usage-dashboard/latest.js'
        },
        'bridge': {
            'mode': 'sidecar',
            'state': 'legacy-external',
            'requiredVersion': '1.6.1',
            'managementProtocol': 'bridge-manager-v1',
            'managed': False,
            'selfUpdate': False,
            'artifact': None
        },
        'bridgeManager': {
            'mode': 'sidecar-manager',
            'state': 'bootstrap-ready',
            'version': '1.0.0',
            'productVersion': '3.0.0-alpha.5.1',
            'managementProtocol': 'bridge-manager-v1',
            'host': '127.0.0.1',
            'port': 39119,
            'installedByDefault': False,
            'selfUpdate': True,
            'engineManaged': False,
            'artifact': 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/bridge-manager.cjs',
            'sha256': manager_sha,
            'bootstrap': 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
            'bootstrapSha256': bootstrap_sha,
            'service': 'local-usage-runtime-manager'
        }
    },
    'contracts': {'snapshot': 1, 'recentRequest': 1}
}
(runtime / 'product-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

(ROOT / 'tests/p5-bridge-manager.cjs').write_text(r'''const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\.(?:[1-9]|\d{2,})$/.test(version) || /^3\.0\.0-beta\./.test(version) || version === '3.0.0';
if (!enabled) {
  console.log(`usage-dashboard P5 bridge manager regression: skipped · ${version}`);
  process.exit(0);
}

const managerPath = 'plugins/usage-dashboard/runtime/bridge-manager.cjs';
const bootstrapPath = 'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh';
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const manager = fs.readFileSync(managerPath, 'utf8');
const bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
const hash = path => crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');

for (const marker of [
  "const BRIDGE_MANAGER_BASE = 'http://127.0.0.1:39119';",
  'async function fetchBridgeManagerStatus(force = false)',
  'async function syncBridgeManagerIfNeeded(status)',
  'Bridge manager probe:',
  'engine-managed ${runtimeBridge.engineManaged',
]) assert.ok(source.includes(marker), `missing plugin bridge-manager marker: ${marker}`);

for (const marker of [
  "const HOST = '127.0.0.1';",
  "const PROTOCOL = 'bridge-manager-v1';",
  "req.headers['x-local-bridge-key']",
  "req.headers['x-devpass-bridge-key']",
  'crypto.timingSafeEqual',
  "execFileSync(process.execPath, ['--check', file]",
  "url.pathname === '/sync'",
  "url.pathname === '/rollback'",
  "url.pathname === '/restart'",
  "engineManaged:false",
]) assert.ok(manager.includes(marker), `missing manager marker: ${marker}`);

assert.ok(bootstrap.includes('start-services.sh'), 'Termux boot services handoff missing');
assert.ok(bootstrap.includes('sv-enable'), 'termux-services enable missing');
assert.ok(bootstrap.includes('기존 39117 Bridge와 토큰은 변경하지 않았어.'), 'legacy bridge preservation marker missing');
assert.equal(manifest.productVersion, version);
assert.equal(manifest.components.bridge.state, 'legacy-external');
assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');
assert.equal(manifest.components.bridgeManager.managementProtocol, 'bridge-manager-v1');
assert.equal(manifest.components.bridgeManager.port, 39119);
assert.equal(manifest.components.bridgeManager.selfUpdate, true);
assert.equal(manifest.components.bridgeManager.engineManaged, false);
assert.equal(manifest.components.bridgeManager.sha256, hash(managerPath));
assert.equal(manifest.components.bridgeManager.bootstrapSha256, hash(bootstrapPath));

console.log(`usage-dashboard P5 bridge manager regression: OK · ${version}`);
''')
