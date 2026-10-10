import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const REPO = 'hanmiyoo10-alt/-';
const API = `https://api.github.com/repos/${REPO}`;
const ISSUE_485 = `${API}/issues/485`;
const BRANCH_MAIN = `${API}/branches/main`;
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || null;
const MAX_BODY = 64 * 1024;

function textField(body, label) {
  const re = new RegExp(`^- ${label}:\\s*(.+)$`, 'mi');
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

function unquoteCode(value) {
  return value ? value.replace(/`/g, '').trim() : value;
}

function parseOperatorCapsule(body) {
  const state = unquoteCode(textField(body, 'STATE'));
  const mainLine = textField(body, 'MAIN');
  const unknown = unquoteCode(textField(body, 'UNKNOWN'));
  const mainMatch = mainLine?.match(
    /`?([0-9a-f]{40})`?\s*\/\s*Required\s+([A-Z]+)\s+—\s+run\s+(\d+)/i
  );
  const convergenceMatch = body.match(/Convergence:\s*`?([A-Z_]+)`?/i);
  const productionMatch = body.match(
    /Production authority:\s*([A-Z_]+)\s+—\s+([^\n]+)/i
  );
  const protectionMatch = body.match(
    /Native protection:\s*`?([A-Z_]+)`?\s*\/\s*protected\s*`?(true|false)`?/i
  );

  return {
    state: state ?? 'UNKNOWN',
    renderedMainSha: mainMatch?.[1] ?? null,
    required: mainMatch
      ? { state: mainMatch[2].toUpperCase(), run: mainMatch[3] }
      : null,
    convergence: convergenceMatch?.[1] ?? null,
    production: productionMatch
      ? { state: productionMatch[1], detail: productionMatch[2].trim() }
      : null,
    nativeProtectionProjection: protectionMatch
      ? { state: protectionMatch[1], protected: protectionMatch[2] === 'true' }
      : null,
    unknown: unknown ?? 'UNKNOWN'
  };
}
async function githubJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': `hanmiyoo-repo-cockpit-aggregator/${VERSION}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GITHUB_HTTP_${res.status}:${text.slice(0, 180)}`);
  }
  return res.json();
}

async function repoSnapshot() {
  const observedAt = new Date().toISOString();
  let branch;
  let issue;
  try {
    [branch, issue] = await Promise.all([
      githubJson(BRANCH_MAIN),
      githubJson(ISSUE_485)
    ]);
  } catch (error) {
    return {
      schemaVersion: 1,
      contract: 'repo_snapshot:v1',
      serviceVersion: VERSION,
      kind: 'REPO_SNAPSHOT',
      repository: REPO,
      observedAt,
      authority: 'BLOCKED_CAPABILITY',
      unknown: ['github-read'],
      error: String(error?.message ?? error),
      sources: [BRANCH_MAIN, ISSUE_485]
    };
  }

  const directMain = branch?.commit?.sha ?? null;
  const directProtected =
    typeof branch?.protected === 'boolean' ? branch.protected : null;
  const capsule = parseOperatorCapsule(issue?.body ?? '');
  const renderedMain = capsule.renderedMainSha;
  const unknown = [];

  if (!directMain) unknown.push('direct-main-sha');
  if (!renderedMain) unknown.push('issue-485-main-sha');
  if (!capsule.required) unknown.push('required');
  if (!capsule.convergence) unknown.push('convergence');
  if (!capsule.production) unknown.push('production-projection');
  if (directProtected === null) unknown.push('direct-protection');
  if (capsule.unknown === 'UNKNOWN') unknown.push('issue-485-unknown-field');

  let authority = unknown.length ? 'UNKNOWN' : 'PASS';
  if (directMain && renderedMain && directMain !== renderedMain) {
    authority = 'SETTLING_OR_STALE';
  }

  const projectedProtected = capsule.nativeProtectionProjection?.protected;
  if (
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
    health: capsule.state,
    convergence: capsule.convergence ?? 'UNKNOWN',
    required: capsule.required ?? { state: 'UNKNOWN', run: null },
    production: capsule.production ?? { state: 'UNKNOWN', detail: null },
    protection: {
      protected: directProtected,
      projected: capsule.nativeProtectionProjection
    },
    unknown:
      capsule.unknown === 'NONE' && unknown.length === 0
        ? []
        : [...new Set([
            ...(capsule.unknown === 'NONE' ? [] : [capsule.unknown]),
            ...unknown
          ])],
    authority,
    sourceAgreement: {
      directMainSha: directMain,
      issue485MainSha: renderedMain,
      mainShaAgrees: Boolean(
        directMain && renderedMain && directMain === renderedMain
      )
    },
    sources: [
      BRANCH_MAIN,
      `https://github.com/${REPO}/issues/485`
    ],
    semantics: {
      directMain: 'direct GitHub branch read-back',
      issue485: 'derived canonical-main operator projection',
      persistence: 'none',
      mutation: 'none'
    }
  };
}
function hostAllowed(req) {
  if (!PUBLIC_DOMAIN) return true;
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  return (
    host === PUBLIC_DOMAIN.toLowerCase() ||
    host === 'localhost' ||
    host === '127.0.0.1'
  );
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY) throw new Error('request_too_large');
  }
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

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    return sendJson(res, 200, {
      ok: true,
      service: 'hanmiyoo-repo-cockpit-aggregator',
      version: VERSION
    });
  }

  if (req.method === 'GET' && req.url === '/snapshot') {
    if (!hostAllowed(req)) {
      return sendJson(res, 403, { error: 'host_not_allowed' });
    }
    const snapshot = await repoSnapshot();
    return sendJson(
      res,
      snapshot.authority === 'BLOCKED_CAPABILITY' ? 503 : 200,
      snapshot
    );
  }

  if (req.url !== '/mcp') {
    return sendJson(res, 404, { error: 'not_found' });
  }
  if (!hostAllowed(req)) {
    return sendJson(res, 403, { error: 'host_not_allowed' });
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST' });
    return res.end();
  }

  let msg;
  try {
    msg = await readJson(req);
  } catch (e) {
    return sendJson(
      res,
      400,
      rpcError(null, -32700, String(e?.message ?? e))
    );
  }

  const id = msg.id ?? null;
  if (msg.method === 'notifications/initialized') {
    res.writeHead(202);
    return res.end();
  }

  if (msg.method === 'initialize') {
    return sendJson(
      res,
      200,
      rpcResult(id, {
        protocolVersion:
          msg.params?.protocolVersion || '2025-06-18',
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
    if (msg.params?.name !== 'repo_snapshot') {
      return sendJson(
        res,
        200,
        rpcError(id, -32602, 'unknown_tool')
      );
    }

    const snapshot = await repoSnapshot();
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

  return sendJson(
    res,
    200,
    rpcError(id, -32601, 'Method not found')
  );
});
server.listen(PORT, '0.0.0.0', () => {
  console.error(
    `hanmiyoo repo cockpit aggregator v${VERSION} listening on :${PORT}`
  );
});
