'use strict';

const fs = require('node:fs');

const STATE_KEY = 'local-usage-dashboard-v3';
const TOKEN_KEY = 'local-usage-dashboard-bridge-token-v1';
const configFile = process.env.UD_DASHBOARD_CONFIG_FILE;
const resultFile = process.env.UD_DASHBOARD_RESULT_FILE;

if (!configFile || !resultFile) throw new Error('dashboard harness paths are required');

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const storage = new Map();
storage.set(STATE_KEY, clone(config.state || {}));
if (config.token) storage.set(TOKEN_KEY, String(config.token));

const writes = [];
const fetches = [];
const views = [];
const capturedRefreshCounts = new Set();
let unloadHandler = null;
let settingHandler = null;
let stateWriteAttempts = 0;
let viewCapturePending = 0;
let clipboardText = '';

const copyDiagButton = {
  textContent:'진단 복사',
  isConnected:true,
  onclick:null,
};
const copySummaryButton = {
  textContent:'요약 복사',
  isConnected:true,
  onclick:null,
};

function writeResult(reason) {
  const state = clone(storage.get(STATE_KEY));
  const payload = {
    reason:String(reason || ''),
    state,
    writes:[...writes],
    fetches:[...fetches],
    views:clone(views),
    stateWriteAttempts,
    viewCapturePending,
    storageKeys:[...storage.keys()].filter(key => key !== TOKEN_KEY),
    tokenStored:storage.has(TOKEN_KEY) && Boolean(String(storage.get(TOKEN_KEY) || '').trim()),
  };
  fs.writeFileSync(resultFile, JSON.stringify(payload));
}

function response(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  return {
    ok:status >= 200 && status < 300,
    status,
    async text() { return text; },
  };
}

function queueSettingsView(reason) {
  if (config.captureSettingsViews !== true) return;
  viewCapturePending += 1;
  writeResult(`view-queued:${reason}`);
  setTimeout(async () => {
    try {
      if (typeof settingHandler !== 'function') throw new Error('settings handler unavailable');
      clipboardText = '';
      copyDiagButton.onclick = null;
      copyDiagButton.textContent = '진단 복사';
      copySummaryButton.onclick = null;
      copySummaryButton.textContent = '요약 복사';
      await settingHandler();
      let summary = '';
      if (typeof copySummaryButton.onclick === 'function') {
        clipboardText = '';
        await copySummaryButton.onclick({currentTarget:copySummaryButton});
        summary = String(clipboardText || '').slice(0, 250_000);
      }
      if (typeof copyDiagButton.onclick !== 'function') throw new Error('diagnostics copy handler unavailable');
      clipboardText = '';
      await copyDiagButton.onclick({currentTarget:copyDiagButton});
      if (!clipboardText) throw new Error('diagnostics clipboard remained empty');
      views.push({
        reason:String(reason || ''),
        html:String(documentStub.body.innerHTML || '').slice(0, 250_000),
        summary,
        diag:String(clipboardText).slice(0, 250_000),
      });
    } catch (error) {
      views.push({reason:String(reason || ''),error:error?.message || String(error),html:'',summary:'',diag:''});
    } finally {
      viewCapturePending = Math.max(0, viewCapturePending - 1);
      writeResult(`view:${reason}`);
    }
  }, 0);
}

const store = {
  async getItem(key) {
    return clone(storage.get(String(key)));
  },
  async setItem(key, value) {
    const normalizedKey = String(key);
    if (normalizedKey === STATE_KEY) {
      stateWriteAttempts += 1;
      const failures = Math.max(0, Number(config.failStateWrites || 0));
      if (stateWriteAttempts <= failures) {
        writes.push(`[state-write-failed:${stateWriteAttempts}]`);
        writeResult(`fail:${STATE_KEY}:${stateWriteAttempts}`);
        queueSettingsView(`state-write-failed:${stateWriteAttempts}`);
        throw new Error(`dashboard harness injected state persist failure ${stateWriteAttempts}`);
      }
      if (failures > 0 && stateWriteAttempts === failures + 1) queueSettingsView('state-write-recovered');
    }
    storage.set(normalizedKey, clone(value));
    writes.push(normalizedKey === TOKEN_KEY ? '[token]' : normalizedKey);
    writeResult(`set:${normalizedKey === TOKEN_KEY ? '[token]' : normalizedKey}`);
    if (normalizedKey === STATE_KEY && config.captureRefreshViews === true) {
      const refreshCount = Number(value?.refreshCount || 0);
      if (refreshCount > 0 && value?.data && value?.lastRefreshReason && !capturedRefreshCounts.has(refreshCount)) {
        capturedRefreshCounts.add(refreshCount);
        queueSettingsView(`refresh:${String(value.lastRefreshReason)}:${refreshCount}`);
      }
    }
  },
  async removeItem(key) {
    const normalizedKey = String(key);
    storage.delete(normalizedKey);
    writes.push(normalizedKey === TOKEN_KEY ? '[token-removed]' : `remove:${normalizedKey}`);
    writeResult(`remove:${normalizedKey === TOKEN_KEY ? '[token]' : normalizedKey}`);
  },
};

const body = {
  dataset:{panelOpen:'0'},
  innerHTML:'',
};

const documentStub = {
  visibilityState:'visible',
  hidden:false,
  body,
  addEventListener() {},
  removeEventListener() {},
  querySelector(selector) {
    if (selector === '#copy-diag') return copyDiagButton;
    if (selector === '#copy-diag-summary') return copySummaryButton;
    return null;
  },
  querySelectorAll() { return []; },
  createElement() { return {innerHTML:'',firstElementChild:null}; },
};

globalThis.document = documentStub;
globalThis.window = {
  addEventListener() {},
  removeEventListener() {},
  innerWidth:1280,
  innerHeight:800,
};

const clipboard = {
  async writeText(text) { clipboardText = String(text || ''); },
};
if (!globalThis.navigator) {
  Object.defineProperty(globalThis, 'navigator', {configurable:true,value:{}});
}
try {
  Object.defineProperty(globalThis.navigator, 'clipboard', {configurable:true,value:clipboard});
} catch (_) {
  globalThis.navigator.clipboard = clipboard;
}

globalThis.Risuai = {
  async getLocalPluginStorage() { return store; },
  async requestPluginPermission() { return false; },
  async getRootDocument() { throw new Error('headless dashboard harness must not request main DOM'); },
  async registerSetting(_name, handler) {
    settingHandler = handler;
    if (config.captureInitialSettingsView === true) queueSettingsView('initial-state');
    return {id:'usage-dashboard-harness-setting'};
  },
  async registerButton() { return {id:'usage-dashboard-harness-button'}; },
  async unregisterUIPart() {},
  async showContainer() {},
  async hideContainer() {},
  async onUnload(handler) { unloadHandler = handler; },
  async nativeFetch(url, options = {}) {
    const target = String(url || '');
    fetches.push({url:target,method:String(options?.method || 'GET')});
    if (target.startsWith('http://127.0.0.1:39119/')) {
      return response(Number(config.managerStatus || 503), config.managerResponse || {ok:false});
    }
    if (/^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/snapshot(?:\?|$)/.test(target)) {
      if (!config.snapshot) return response(503, {error:'snapshot fixture missing'});
      return response(Number(config.snapshotStatus || 200), config.snapshot);
    }
    throw new Error(`dashboard harness denied nativeFetch target: ${target}`);
  },
};

globalThis.__usageDashboardHarness = {
  writeResult,
  async unload() {
    if (typeof unloadHandler === 'function') await unloadHandler();
  },
};

writeResult('preload');
