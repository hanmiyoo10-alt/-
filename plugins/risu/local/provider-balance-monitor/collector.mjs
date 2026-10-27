import http from 'node:http';
import { pathToFileURL } from 'node:url';

export const SNAPSHOT_VERSION = 1;
const HOST = '127.0.0.1';
const DEFAULT_PORT = 39221;
const DEFAULT_CACHE_MS = 60_000;

const finiteOrNull = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;

export function unknownProvider(provider, reason, { status = 'unknown', asOf = null } = {}) {
  return {
    provider, scope: null, used: null, limit: null, remaining: null,
    remainingPercent: null, unit: null, resetAt: null, asOf,
    freshness: 'unknown',
    fidelity: status === 'auth-required' ? 'auth-required' : 'unknown',
    status, reason
  };
}

export function normalizeCopilotQuota(quotaSnapshots, now = new Date().toISOString()) {
  const premium = quotaSnapshots && typeof quotaSnapshots === 'object'
    ? quotaSnapshots.premium_interactions
    : null;
  if (!premium || typeof premium !== 'object') {
    return unknownProvider('copilot', 'premium-interactions-unavailable', { asOf: now });
  }
  const entitlement = finiteOrNull(premium.entitlementRequests);
  const used = finiteOrNull(premium.usedRequests);
  const pct = finiteOrNull(premium.remainingPercentage);
  const unlimited = entitlement === -1;
  const limit = unlimited ? -1 : entitlement;
  const remaining = !unlimited && limit !== null && used !== null ? Math.max(0, limit - used) : null;
  return {
    provider: 'copilot', scope: 'authenticated-user', used, limit, remaining,
    remainingPercent: pct === null ? null : Math.max(0, Math.min(100, pct)),
    unit: 'premium-interactions',
    resetAt: typeof premium.resetDate === 'string' && premium.resetDate ? premium.resetDate : null,
    asOf: now, freshness: 'observed', fidelity: 'observed',
    status: unlimited ? 'unlimited' : 'ok', reason: null
  };
}

let clientPromise = null;
let activeClient = null;

function classifyCopilotError(error) {
  const text = String(error?.message || error || '').toLowerCase();
  return /auth|login|credential|token|unauthor|forbidden|copilot subscription/.test(text)
    ? 'auth-required'
    : 'source-unavailable';
}

async function getCopilotClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { CopilotClient } = await import('@github/copilot-sdk');
      const client = new CopilotClient({
        clientInfo: { applicationName: 'provider-balance-mini', applicationVersion: '0.1.0-dev.1' }
      });
      await client.start();
      activeClient = client;
      return client;
    })().catch(error => { clientPromise = null; throw error; });
  }
  return clientPromise;
}

export async function readCopilotQuota() {
  const asOf = new Date().toISOString();
  try {
    const client = await getCopilotClient();
    const result = await client.rpc.account.getQuota({});
    return normalizeCopilotQuota(result?.quotaSnapshots, asOf);
  } catch (error) {
    const status = classifyCopilotError(error);
    return unknownProvider('copilot', status === 'auth-required' ? 'copilot-auth-required' : 'copilot-quota-unavailable', { status, asOf });
  }
}

export async function collectSnapshot({ copilotReader = readCopilotQuota } = {}) {
  const fetchedAt = new Date().toISOString();
  let copilot;
  try { copilot = await copilotReader(); }
  catch { copilot = unknownProvider('copilot', 'copilot-quota-unavailable', { status: 'source-unavailable', asOf: fetchedAt }); }
  return {
    version: SNAPSHOT_VERSION,
    fetchedAt,
    providers: {
      copilot,
      vertex: unknownProvider('vertex', 'supported-credit-balance-api-not-verified', { asOf: fetchedAt }),
      ais: unknownProvider('ais', 'supported-prepay-balance-api-not-verified', { asOf: fetchedAt })
    }
  };
}

export async function stopCopilotClient() {
  const client = activeClient;
  activeClient = null;
  clientPromise = null;
  if (client) try { await client.stop(); } catch {}
}

export function createCollectorServer({ port = Number(process.env.PBM_PORT || DEFAULT_PORT), cacheMs = Math.max(15_000, Number(process.env.PBM_CACHE_MS || DEFAULT_CACHE_MS)) } = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PBM_PORT must be an integer from 1 to 65535');
  let cached = null, cachedAt = 0, inFlight = null;
  async function getSnapshot(force = false) {
    const now = Date.now();
    if (!force && cached && now - cachedAt < cacheMs) return cached;
    if (inFlight) return inFlight;
    inFlight = collectSnapshot().then(value => { cached = value; cachedAt = Date.now(); return value; }).finally(() => { inFlight = null; });
    return inFlight;
  }
  function sendJson(res, status, body) {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(payload);
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}:${port}`);
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method-not-allowed' });
    if (url.pathname === '/health') return sendJson(res, 200, { ok: true, service: 'provider-balance-mini', version: SNAPSHOT_VERSION });
    if (url.pathname !== '/v1/balances') return sendJson(res, 404, { error: 'not-found' });
    try { return sendJson(res, 200, await getSnapshot(url.searchParams.get('refresh') === '1')); }
    catch { return sendJson(res, 503, { error: 'snapshot-unavailable' }); }
  });
  return { server, port };
}

async function main() {
  const { server, port } = createCollectorServer();
  server.listen(port, HOST, () => console.log(`[Provider Balance Mini] collector listening on http://${HOST}:${port}`));
  async function shutdown() { server.close(); await stopCopilotClient(); }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
