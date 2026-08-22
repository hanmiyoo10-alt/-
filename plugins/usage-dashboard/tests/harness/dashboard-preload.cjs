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
let unloadHandler = null;

function writeResult(reason) {
  const state = clone(storage.get(STATE_KEY));
  const payload = {
    reason:String(reason || ''),
    state,
    writes:[...writes],
    fetches:[...fetches],
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

const store = {
  async getItem(key) {
    return clone(storage.get(String(key)));
  },
  async setItem(key, value) {
    const normalizedKey = String(key);
    storage.set(normalizedKey, clone(value));
    writes.push(normalizedKey === TOKEN_KEY ? '[token]' : normalizedKey);
    writeResult(`set:${normalizedKey === TOKEN_KEY ? '[token]' : normalizedKey}`);
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
  querySelector() { return null; },
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
globalThis.navigator = globalThis.navigator || {};

globalThis.Risuai = {
  async getLocalPluginStorage() { return store; },
  async requestPluginPermission() { return false; },
  async getRootDocument() { throw new Error('headless dashboard harness must not request main DOM'); },
  async registerSetting() { return {id:'usage-dashboard-harness-setting'}; },
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
