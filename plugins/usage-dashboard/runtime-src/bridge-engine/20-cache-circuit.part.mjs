const logThrottle = new Map();
let bridgeToken = '';

function logRateLimited(level, key, message, intervalMs = 60_000) {
  const now = Date.now();
  const last = logThrottle.get(key) || 0;
  if (now - last < intervalMs) return;
  logThrottle.set(key, now);
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[bridge] ${message}`);
  if (logThrottle.size > 128) {
    for (const [entryKey, at] of logThrottle) {
      if (now - at > intervalMs * 4) logThrottle.delete(entryKey);
    }
  }
}

function pruneCache() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  const entries = [...cache.entries()].sort((a, b) => (a[1]?.at || 0) - (b[1]?.at || 0));
  for (const [key] of entries.slice(0, Math.max(0, cache.size - CACHE_MAX_ENTRIES))) cache.delete(key);
}

function staleClone(value, ageMs, error) {
  if (!value || typeof value !== 'object') return value;
  const meta = { stale: true, ageMs, reason: safeMessage(error) };
  return Array.isArray(value) ? value.slice() : { ...value, _cache: meta };
}

function json(res, status, body) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-DevPass-Bridge-Key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  });
  res.end(text);
}

function parsePluginMetadata(text) {
  const source = String(text || '');
  const match = (name) => source.match(new RegExp(`^\\/\\/@${name}\\s+([^\\r\\n]+)`, 'm'))?.[1]?.trim() || '';
  return {
    name: match('name'),
    displayName: match('display-name'),
    api: match('api'),
    version: match('version'),
    updateUrl: match('update-url'),
  };
}

async function pluginUpdateInfo() {
  try {
    const [buffer, stat] = await Promise.all([
      fs.readFile(PLUGIN_LATEST_FILE),
      fs.stat(PLUGIN_LATEST_FILE),
    ]);
    const meta = parsePluginMetadata(buffer.toString('utf8', 0, Math.min(buffer.length, 16 * 1024)));
    return {
      available: true,
      version: meta.version || null,
      name: meta.name || null,
      api: meta.api || null,
      size: buffer.length,
      modifiedAt: stat.mtimeMs || null,
      endpoint: `http://${HOST}:${PORT}/plugin/latest`,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        available: false,
        version: null,
        size: 0,
        modifiedAt: null,
        endpoint: `http://${HOST}:${PORT}/plugin/latest`,
      };
    }
    throw error;
  }
}

async function serveLatestPlugin(req, res) {
  let buffer;
  try {
    buffer = await fs.readFile(PLUGIN_LATEST_FILE);
  } catch (error) {
    if (error?.code === 'ENOENT') return json(res, 404, { error: 'No staged plugin update' });
    throw error;
  }

  const size = buffer.length;
  const baseHeaders = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Range, Content-Length',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
  };

  const range = String(req.headers.range || '').trim();
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/i);
    if (!match || (!match[1] && !match[2])) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
      return res.end();
    }

    let start;
    let end;
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) {
        res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
        return res.end();
      }
      start = Math.max(0, size - suffix);
      end = Math.max(0, size - 1);
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : Math.max(0, size - 1);
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    end = Math.min(end, Math.max(0, size - 1));
    const chunk = buffer.subarray(start, end + 1);
    res.writeHead(206, {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(chunk.length),
    });
    if (req.method === 'HEAD') return res.end();
    return res.end(chunk);
  }

  res.writeHead(200, { ...baseHeaders, 'Content-Length': String(size) });
  if (req.method === 'HEAD') return res.end();
  return res.end(buffer);
}

function safeMessage(error) {
  const text = String(error?.message || error || 'unknown error');
  return text
    .replace(/llmgtwy_[A-Za-z0-9_-]+/g, 'llmgtwy_[REDACTED]')
    .replace(/Bearer\s+[^\s'"]+/gi, 'Bearer [REDACTED]')
    .replace(/((?:authorization|cookie|session(?:id|token)?)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
    .slice(0, 500);
}


function classifyError(error) {
  const text = safeMessage(error).toLowerCase();
  if (/401|unauthor/.test(text)) return 'AUTH_UNAUTHORIZED';
  if (/403|forbidden/.test(text)) return 'AUTH_FORBIDDEN';
  if (/timeout|timed out|etimedout/.test(text)) return 'UPSTREAM_TIMEOUT';
  if (/organization .*not found|no organizations/.test(text)) return 'ORG_NOT_FOUND';
  if (/projectid unavailable|\/activity .*unavailable/.test(text)) return 'DEVPASS_ACTIVITY_UNAVAILABLE';
  if (/could not parse|json/.test(text)) return 'UPSTREAM_PARSE_ERROR';
  if (/enoent|not found/.test(text)) return 'CLI_NOT_FOUND';
  return 'UPSTREAM_ERROR';
}

function circuitFamily(name) {
  const key = String(name || 'unknown');
  if (key === 'accountCapture' || key === 'devpassStatus') return 'account';
  if (key.startsWith('devpassActivity:')) return 'devpassActivity';
  if (key.startsWith('usage:')) return 'creditsUsage';
  if (key.startsWith('activity:')) return 'activity';
  if (key.startsWith('analytics:') || key === 'analyticsScopes') return 'analytics';
  if (key === 'usageScopes') return 'usageScopes';
  if (key.startsWith('runway:')) return 'runway';
  if (key === 'orgs') return 'organizations';
  return key.split(':')[0] || 'unknown';
}

function getCircuit(name) {
  const family = circuitFamily(name);
  if (!circuits.has(family)) {
    circuits.set(family, {
      family,
      failures: 0,
      state: 'closed',
      openUntil: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastErrorCode: '',
      lastError: '',
    });
  }
  return circuits.get(family);
}

function circuitBeforeLoad(name) {
  const circuit = getCircuit(name);
  const now = Date.now();
  if (circuit.state === 'open' && now < circuit.openUntil) {
    circuitStats.blocked += 1;
    noteSnapshotCounter('circuits', 'blocked');
    const seconds = Math.max(1, Math.ceil((circuit.openUntil - now) / 1000));
    const error = new Error(`Circuit ${circuit.family} open; retry in ${seconds}s`);
    error.code = 'CIRCUIT_OPEN';
    return { allowed: false, circuit, error };
  }
  if (circuit.state === 'open' && now >= circuit.openUntil) circuit.state = 'half-open';
  return { allowed: true, circuit };
}

function circuitSuccess(name) {
  const circuit = getCircuit(name);
  if (circuit.state !== 'closed' || circuit.failures > 0) {
    circuitStats.recoveries += 1;
    noteSnapshotCounter('circuits', 'recoveries');
  }
  circuit.failures = 0;
  circuit.state = 'closed';
  circuit.openUntil = 0;
  circuit.lastSuccessAt = Date.now();
  circuit.lastErrorCode = '';
  circuit.lastError = '';
}

function circuitFailure(name, error) {
  const circuit = getCircuit(name);
  circuit.failures += 1;
  circuit.lastFailureAt = Date.now();
  circuit.lastErrorCode = classifyError(error);
  circuit.lastError = safeMessage(error);
  if (circuit.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    const exponent = Math.max(0, circuit.failures - CIRCUIT_FAILURE_THRESHOLD);
    const openMs = Math.min(CIRCUIT_MAX_OPEN_MS, CIRCUIT_BASE_OPEN_MS * (2 ** exponent));
    const wasOpen = circuit.state === 'open';
    circuit.state = 'open';
    circuit.openUntil = Date.now() + openMs;
    if (!wasOpen) {
      circuitStats.opens += 1;
      noteSnapshotCounter('circuits', 'opens');
    }
  }
  return circuit;
}

function circuitSnapshot() {
  const now = Date.now();
  const out = {};
  for (const [family, circuit] of circuits) {
    const state = circuit.state === 'open' && now >= circuit.openUntil ? 'half-open' : circuit.state;
    out[family] = {
      state,
      failures: circuit.failures,
      retryInMs: state === 'open' ? Math.max(0, circuit.openUntil - now) : 0,
      lastFailureAt: circuit.lastFailureAt,
      lastSuccessAt: circuit.lastSuccessAt,
      lastErrorCode: circuit.lastErrorCode || null,
    };
  }
  return out;
}

async function ensureToken() {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  try {
    bridgeToken = (await fs.readFile(TOKEN_FILE, 'utf8')).trim();
  } catch {
    bridgeToken = crypto.randomBytes(24).toString('hex');
    await fs.writeFile(TOKEN_FILE, `${bridgeToken}\n`, { mode: 0o600 });
  }
  if (!bridgeToken) throw new Error('bridge token is empty');
  try { await fs.chmod(TOKEN_FILE, 0o600); } catch {}
}

function parseJsonOutput(stdout) {
  const raw = String(stdout || '').trim();
  if (!raw) throw new Error('LLMGateway CLI returned empty output');
  try { return JSON.parse(raw); } catch {}

  // Some npm/CLI versions may print a harmless notice around JSON.
  const starts = [raw.indexOf('{'), raw.indexOf('[')].filter((n) => n >= 0);
  const start = starts.length ? Math.min(...starts) : -1;
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  throw new Error('Could not parse CLI JSON output');
}

