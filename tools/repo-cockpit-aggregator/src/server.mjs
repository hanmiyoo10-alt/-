import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;
export const REPO = 'hanmiyoo10-alt/-';
export const API = `https://api.github.com/repos/${REPO}`;
export const ISSUE_485 = `${API}/issues/485`;
export const BRANCH_MAIN = `${API}/branches/main`;
export const MAX_BODY = 64 * 1024;
export const MCP_PROTOCOL_VERSION = '2025-06-18';
export const DEFAULT_SNAPSHOT_MAX_PER_WINDOW = 6;
export const DEFAULT_SNAPSHOT_WINDOW_MS = 60 * 1000;
const SHA40_RE = /^[0-9a-f]{40}$/;

class RepoCockpitError extends Error {
  constructor(code) {
    super(code);
    this.name = 'RepoCockpitError';
    this.code = code;
  }
}

const CAPSULE_FIELD_ORDER = Object.freeze([
  'STATE', 'MAIN', 'CHANGE', 'WHY', 'NEXT', 'AUTHORITY', 'UNKNOWN'
]);
const SUMMARY_COMPAT_MARKER = '<!-- canonical-main-summary-compat:v1';

function unquoteCode(value) {
  return value ? value.replace(/`/g, '').trim() : value;
}

function extractCanonicalCapsule(body) {
  const text = String(body || '').replace(/\r\n/g, '\n');
  const headings = [...text.matchAll(/^## Canonical Operator Capsule$/gm)];
  if (headings.length !== 1) return null;

  const afterHeading = text
    .slice(headings[0].index + headings[0][0].length)
    .replace(/^\n/, '');
  const boundary = afterHeading.indexOf('\n\n');
  if (boundary < 0) return null;

  const lines = afterHeading.slice(0, boundary).split('\n');
  if (lines.length !== CAPSULE_FIELD_ORDER.length) return null;

  const fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^- ([A-Z]+): (.+)$/.exec(lines[index]);
    if (!match || match[1] !== CAPSULE_FIELD_ORDER[index]) return null;
    fields[match[1]] = match[2];
  }

  return {
    fields,
    remainder: afterHeading.slice(boundary + 2)
  };
}

function extractSummaryCompat(remainder) {
  const text = String(remainder || '').trimStart();
  if (!text.startsWith(SUMMARY_COMPAT_MARKER)) return null;
  const end = text.indexOf('-->', SUMMARY_COMPAT_MARKER.length);
  if (end < 0) return null;
  return text.slice(SUMMARY_COMPAT_MARKER.length, end);
}

export function parseOperatorCapsule(body) {
  const capsule = extractCanonicalCapsule(body);
  if (!capsule) {
    return {
      state: null,
      renderedMainSha: null,
      required: null,
      convergence: null,
      production: null,
      nativeProtectionProjection: null,
      unknown: null
    };
  }

  const rawState = unquoteCode(capsule.fields.STATE);
  const state = ['CLEAR', 'ATTENTION', 'INCIDENT', 'UNKNOWN'].includes(rawState)
    ? rawState
    : null;
  const mainLine = capsule.fields.MAIN;
  const authorityLine = capsule.fields.AUTHORITY;
  const unknown = unquoteCode(capsule.fields.UNKNOWN);
  const summaryCompat = extractSummaryCompat(capsule.remainder);
  const mainMatch = mainLine?.match(
    /^`?([0-9a-f]{40})`?\s*\/\s*Required\s+([A-Z]+)\s+—\s+run\s+(\d+)$/i
  );
  const stableConvergence = summaryCompat?.match(
    /^Convergence:\s*`STABLE`$/m
  );
  const settlingConvergence = summaryCompat?.match(
    /^Convergence:\s*`SETTLING`(?:\s*\/\s*`STALE`)?\s+—\s+waiting for\s+.+\s+\(\d+s\)$/m
  );
  const convergence =
    stableConvergence
      ? 'STABLE'
      : settlingConvergence
        ? 'SETTLING'
        : null;
  const productionMatch = authorityLine?.match(
    /Production\s+([A-Z_]+)\s+—\s+([^;\n]+)/i
  );
  const authorityProtection = authorityLine?.match(
    /native protection\s*`?([A-Z_]+)`?\s*\/\s*protected\s*`?(true|false)`?/i
  );

  return {
    state: state ?? null,
    renderedMainSha: mainMatch?.[1] ?? null,
    required: mainMatch
      ? { state: mainMatch[2].toUpperCase(), run: mainMatch[3] }
      : null,
    convergence,
    production: productionMatch
      ? { state: productionMatch[1], detail: productionMatch[2].trim() }
      : null,
    nativeProtectionProjection: authorityProtection
      ? {
          state: authorityProtection[1],
          protected: authorityProtection[2] === 'true'
        }
      : null,
    unknown: unknown ?? null
  };
}

export function createGitHubJson({
  token,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000
} = {}) {
  const readToken = typeof token === 'string' ? token.trim() : '';

  return async function githubJson(url) {
    if (!readToken) {
      throw new RepoCockpitError('GITHUB_READ_AUTH_REQUIRED');
    }

    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${readToken}`,
          'User-Agent': `hanmiyoo-repo-cockpit-aggregator/${VERSION}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch {
      throw new RepoCockpitError('GITHUB_READ_FAILED');
    }

    if (!response?.ok) {
      throw new RepoCockpitError(
        `GITHUB_HTTP_${Number.isInteger(response?.status) ? response.status : 'UNKNOWN'}`
      );
    }

    try {
      return await response.json();
    } catch {
      throw new RepoCockpitError('GITHUB_JSON_INVALID');
    }
  };
}

function readErrorSnapshot(error, observedAt) {
  const code = error instanceof RepoCockpitError
    ? error.code
    : 'GITHUB_READ_FAILED';
  const authBlocked = new Set([
    'GITHUB_READ_AUTH_REQUIRED',
    'GITHUB_HTTP_401',
    'GITHUB_HTTP_403'
  ]).has(code);
  return {
    schemaVersion: 1,
    contract: 'repo_snapshot:v1',
    serviceVersion: VERSION,
    kind: 'REPO_SNAPSHOT',
    repository: REPO,
    observedAt,
    authority: authBlocked ? 'BLOCKED_CAPABILITY' : 'UNKNOWN',
    unknown: [authBlocked ? 'github-read-auth' : 'github-read'],
    error: code,
    sources: [BRANCH_MAIN, ISSUE_485]
  };
}

function rateLimitedSnapshot(observedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    contract: 'repo_snapshot:v1',
    serviceVersion: VERSION,
    kind: 'REPO_SNAPSHOT',
    repository: REPO,
    observedAt,
    authority: 'BLOCKED_CAPABILITY',
    unknown: ['github-read-rate-limit'],
    error: 'GITHUB_READ_RATE_LIMITED',
    sources: [BRANCH_MAIN, ISSUE_485]
  };
}

function createSnapshotRateLimiter({
  maxPerWindow = DEFAULT_SNAPSHOT_MAX_PER_WINDOW,
  windowMs = DEFAULT_SNAPSHOT_WINDOW_MS,
  now = Date.now
} = {}) {
  const limit = Number.isInteger(maxPerWindow) && maxPerWindow > 0
    ? maxPerWindow
    : DEFAULT_SNAPSHOT_MAX_PER_WINDOW;
  const duration = Number.isFinite(windowMs) && windowMs > 0
    ? windowMs
    : DEFAULT_SNAPSHOT_WINDOW_MS;
  let windowStart = now();
  let used = 0;

  return function allowSnapshotRead() {
    const current = now();
    if (current < windowStart || current - windowStart >= duration) {
      windowStart = current;
      used = 0;
    }
    if (used >= limit) return false;
    used += 1;
    return true;
  };
}

export async function repoSnapshot({ githubJson } = {}) {
  const observedAt = new Date().toISOString();
  if (typeof githubJson !== 'function') {
    return readErrorSnapshot(
      new RepoCockpitError('GITHUB_READ_AUTH_REQUIRED'),
      observedAt
    );
  }

  let firstBranch;
  let issue;
  let secondBranch;
  try {
    firstBranch = await githubJson(BRANCH_MAIN);
    issue = await githubJson(ISSUE_485);
    secondBranch = await githubJson(BRANCH_MAIN);
  } catch (error) {
    return readErrorSnapshot(error, observedAt);
  }

  const firstSha = firstBranch?.commit?.sha ?? null;
  const secondSha = secondBranch?.commit?.sha ?? null;
  const stableMain =
    SHA40_RE.test(String(firstSha || '')) &&
    SHA40_RE.test(String(secondSha || '')) &&
    firstSha === secondSha;
  const directMain = stableMain ? firstSha : null;
  const directProtected =
    typeof secondBranch?.protected === 'boolean'
      ? secondBranch.protected
      : null;
  const issueValid =
    Boolean(issue) &&
    typeof issue === 'object' &&
    !Array.isArray(issue) &&
    !issue.pull_request &&
    issue.state === 'open';
  const capsule = parseOperatorCapsule(issueValid ? issue.body : '');
  const renderedMain = capsule.renderedMainSha;
  const unknown = [];

  if (!SHA40_RE.test(String(firstSha || '')) ||
      !SHA40_RE.test(String(secondSha || ''))) {
    unknown.push('direct-main-sha');
  } else if (firstSha !== secondSha) {
    unknown.push('main-changed-during-capture');
  }
  if (!issueValid) unknown.push('issue-485-invalid-state');
  if (!capsule.state) unknown.push('issue-485-state');
  if (!renderedMain) unknown.push('issue-485-main-sha');
  if (!capsule.required) unknown.push('required');
  if (!capsule.convergence) unknown.push('convergence');
  if (!capsule.production) unknown.push('production-projection');
  if (directProtected === null) unknown.push('direct-protection');
  if (!capsule.nativeProtectionProjection) {
    unknown.push('native-protection-projection');
  }
  if (capsule.unknown === null) {
    unknown.push('issue-485-unknown-field');
  } else if (capsule.unknown !== 'NONE') {
    unknown.push(capsule.unknown);
  }

  const projectedProtected =
    capsule.nativeProtectionProjection?.protected;
  let authority = unknown.length ? 'UNKNOWN' : 'PASS';

  if (
    unknown.length === 0 &&
    stableMain &&
    renderedMain &&
    renderedMain !== directMain
  ) {
    authority = 'SETTLING_OR_STALE';
  }

  if (
    unknown.length === 0 &&
    directProtected !== null &&
    typeof projectedProtected === 'boolean' &&
    directProtected !== projectedProtected
  ) {
    authority = 'CONFLICT';
  }

  return {
    schemaVersion: 1,
    contract: 'repo_snapshot:v1',
    serviceVersion: VERSION,
    kind: 'REPO_SNAPSHOT',
    repository: REPO,
    observedAt,
    main: directMain,
    health: capsule.state ?? 'UNKNOWN',
    convergence: capsule.convergence ?? 'UNKNOWN',
    required: capsule.required ?? { state: 'UNKNOWN', run: null },
    production: capsule.production ?? { state: 'UNKNOWN', detail: null },
    protection: {
      protected: directProtected,
      projected: capsule.nativeProtectionProjection
    },
    unknown: [...new Set(unknown)],
    authority,
    sourceAgreement: {
      directMainFirstSha: firstSha,
      directMainSecondSha: secondSha,
      directMainStable: stableMain,
      issue485MainSha: renderedMain,
      mainShaAgrees: Boolean(
        stableMain && renderedMain && renderedMain === directMain
      )
    },
    sources: [
      BRANCH_MAIN,
      `https://github.com/${REPO}/issues/485`
    ],
    semantics: {
      directMain: 'direct GitHub branch read-back with capture-coherence reread',
      issue485: 'derived canonical-main operator projection',
      persistence: 'none',
      mutation: 'none'
    }
  };
}

function hostAllowed(req, publicDomain) {
  if (!publicDomain) return true;
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  return (
    host === String(publicDomain).toLowerCase() ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

function originAllowed(req, publicDomain) {
  const rawOrigin = req.headers.origin;
  if (!rawOrigin) return true;

  let origin;
  try {
    origin = new URL(String(rawOrigin));
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(origin.protocol)) return false;

  const allowed = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (publicDomain) allowed.add(String(publicDomain).toLowerCase());
  return allowed.has(origin.hostname.toLowerCase());
}

function isJsonObject(value) {
  return Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function validJsonRpcRequest(msg) {
  if (!isJsonObject(msg)) return false;
  if (msg.jsonrpc !== '2.0') return false;
  if (typeof msg.method !== 'string' || msg.method.length === 0) return false;

  if (Object.prototype.hasOwnProperty.call(msg, 'id')) {
    const id = msg.id;
    const validId =
      id === null ||
      typeof id === 'string' ||
      (typeof id === 'number' && Number.isFinite(id));
    if (!validId) return false;
  }

  if (Object.prototype.hasOwnProperty.call(msg, 'params')) {
    const params = msg.params;
    if (!isJsonObject(params) && !Array.isArray(params)) return false;
  }

  return true;
}

function validToolArguments(value) {
  if (value === undefined) return true;
  return isJsonObject(value) && Object.keys(value).length === 0;
}

function validInitializeParams(params) {
  if (!isJsonObject(params)) return false;
  if (typeof params.protocolVersion !== 'string' ||
      params.protocolVersion.length === 0) {
    return false;
  }
  if (!isJsonObject(params.capabilities)) return false;
  if (!isJsonObject(params.clientInfo)) return false;
  if (typeof params.clientInfo.name !== 'string' ||
      params.clientInfo.name.length === 0) {
    return false;
  }
  if (typeof params.clientInfo.version !== 'string' ||
      params.clientInfo.version.length === 0) {
    return false;
  }
  return true;
}

function protocolVersionAllowed(req) {
  const value = req.headers['mcp-protocol-version'];
  if (value === undefined) return true;
  return String(value) === MCP_PROTOCOL_VERSION;
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(value));
}

export async function readJson(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY) throw new Error('request_too_large');
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw || '{}');
}

function rpcResult(id, value) {
  return { jsonrpc: '2.0', id, result: value };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

const TOOL = {
  name: 'repo_snapshot',
  title: 'Repository Snapshot',
  description:
    'Read-only single-call snapshot of hanmiyoo10-alt/- direct current main plus issue #485. Never mutates GitHub, CI, issues, PRs, releases, devices, hosts, or Railway.',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true
  }
};

async function handleRequest(
  req,
  res,
  { readSnapshot, publicDomain }
) {
  if (req.method === 'GET' && req.url === '/healthz') {
    return sendJson(res, 200, {
      ok: true,
      service: 'hanmiyoo-repo-cockpit-aggregator',
      version: VERSION
    });
  }

  if (req.method === 'GET' && req.url === '/snapshot') {
    if (!hostAllowed(req, publicDomain)) {
      return sendJson(res, 403, { error: 'host_not_allowed' });
    }
    const snapshot = await readSnapshot();
    const status = snapshot.error === 'GITHUB_READ_RATE_LIMITED'
      ? 429
      : snapshot.authority === 'BLOCKED_CAPABILITY'
        ? 503
        : 200;
    return sendJson(res, status, snapshot);
  }

  if (req.url !== '/mcp') {
    return sendJson(res, 404, { error: 'not_found' });
  }
  if (!hostAllowed(req, publicDomain)) {
    return sendJson(res, 403, { error: 'host_not_allowed' });
  }
  if (!originAllowed(req, publicDomain)) {
    return sendJson(res, 403, { error: 'origin_not_allowed' });
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST' });
    return res.end();
  }

  let msg;
  try {
    msg = await readJson(req);
  } catch (error) {
    return sendJson(
      res,
      400,
      rpcError(null, -32700, String(error?.message ?? 'parse_error'))
    );
  }

  if (!validJsonRpcRequest(msg)) {
    return sendJson(res, 400, rpcError(null, -32600, 'Invalid Request'));
  }

  const hasId = Object.prototype.hasOwnProperty.call(msg, 'id');
  const id = msg.id ?? null;

  if (msg.method !== 'initialize' && !protocolVersionAllowed(req)) {
    return sendJson(
      res,
      400,
      rpcError(id, -32600, 'Unsupported MCP-Protocol-Version')
    );
  }

  if (typeof msg.method === 'string' && !hasId) {
    res.writeHead(202);
    return res.end();
  }

  if (msg.method === 'initialize') {
    if (!validInitializeParams(msg.params)) {
      return sendJson(res, 200, rpcError(id, -32602, 'Invalid params'));
    }
    const requestedVersion = msg.params.protocolVersion;
    return sendJson(
      res,
      200,
      rpcResult(id, {
        protocolVersion:
          requestedVersion === MCP_PROTOCOL_VERSION
            ? requestedVersion
            : MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: 'hanmiyoo-repo-cockpit-aggregator',
          version: VERSION
        }
      })
    );
  }

  if (msg.method === 'ping') {
    return sendJson(res, 200, rpcResult(id, {}));
  }

  if (msg.method === 'tools/list') {
    return sendJson(res, 200, rpcResult(id, { tools: [TOOL] }));
  }

  if (msg.method === 'tools/call') {
    if (!isJsonObject(msg.params)) {
      return sendJson(res, 200, rpcError(id, -32602, 'Invalid params'));
    }
    if (msg.params.name !== 'repo_snapshot') {
      return sendJson(res, 200, rpcError(id, -32602, 'unknown_tool'));
    }
    if (!validToolArguments(msg.params.arguments)) {
      return sendJson(
        res,
        200,
        rpcError(id, -32602, 'invalid_tool_arguments')
      );
    }

    const snapshot = await readSnapshot();
    return sendJson(
      res,
      200,
      rpcResult(id, {
        content: [
          { type: 'text', text: JSON.stringify(snapshot) }
        ],
        structuredContent: snapshot,
        isError: snapshot.authority === 'BLOCKED_CAPABILITY'
      })
    );
  }

  return sendJson(res, 200, rpcError(id, -32601, 'Method not found'));
}

export function createRepoCockpitServer({
  token = process.env.GITHUB_REPO_READ_TOKEN,
  fetchImpl = globalThis.fetch,
  publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || null,
  snapshotMaxPerWindow = DEFAULT_SNAPSHOT_MAX_PER_WINDOW,
  snapshotWindowMs = DEFAULT_SNAPSHOT_WINDOW_MS,
  now = Date.now
} = {}) {
  const readToken = typeof token === 'string' ? token.trim() : '';
  const githubJson = createGitHubJson({ token: readToken, fetchImpl });
  const allowSnapshotRead = createSnapshotRateLimiter({
    maxPerWindow: snapshotMaxPerWindow,
    windowMs: snapshotWindowMs,
    now
  });
  const readSnapshot = async () => {
    if (readToken && !allowSnapshotRead()) {
      return rateLimitedSnapshot();
    }
    return repoSnapshot({ githubJson });
  };

  return createServer((req, res) => {
    void handleRequest(req, res, { readSnapshot, publicDomain })
      .catch(() => {
        if (!res.headersSent) {
          sendJson(res, 500, { error: 'internal_error' });
        } else if (!res.writableEnded) {
          res.destroy();
        }
      });
  });
}

export function startRepoCockpitServer({
  port = Number.parseInt(process.env.PORT || '3000', 10),
  host = '0.0.0.0',
  ...options
} = {}) {
  const server = createRepoCockpitServer(options);
  server.listen(port, host, () => {
    console.error(
      `hanmiyoo repo cockpit aggregator v${VERSION} listening on :${port}`
    );
  });
  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startRepoCockpitServer();
}
