import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  TOKEN_ENV,
  createD013Service,
  validateAcquireArgs,
  validateReleaseArgs
} from './core.mjs';

export const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version;
export const MCP_PROTOCOL_VERSION = '2025-06-18';
export const MAX_BODY = 64 * 1024;
export const DEFAULT_EFFECT_MAX_PER_WINDOW = 3;
export const DEFAULT_EFFECT_WINDOW_MS = 60 * 1000;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hostAllowed(req, publicDomain) {
  if (!publicDomain) return true;
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
  return host === String(publicDomain).toLowerCase() ||
    host === 'localhost' || host === '127.0.0.1';
}

function originAllowed(req, publicDomain) {
  const raw = req.headers.origin;
  if (!raw) return true;
  let origin;
  try { origin = new URL(String(raw)); }
  catch { return false; }
  if (!['http:', 'https:'].includes(origin.protocol)) return false;
  const allowed = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
  if (publicDomain) allowed.add(String(publicDomain).toLowerCase());
  return allowed.has(origin.hostname.toLowerCase());
}

function protocolAllowed(req) {
  const value = req.headers['mcp-protocol-version'];
  return value === undefined || value === MCP_PROTOCOL_VERSION;
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
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function validRpc(msg) {
  if (!isObject(msg) || msg.jsonrpc !== '2.0' ||
      typeof msg.method !== 'string' || !msg.method) return false;
  if (Object.hasOwn(msg, 'id')) {
    const id = msg.id;
    if (!(id === null || typeof id === 'string' ||
          (typeof id === 'number' && Number.isFinite(id)))) return false;
  }
  if (Object.hasOwn(msg, 'params') &&
      !isObject(msg.params) && !Array.isArray(msg.params)) return false;
  return true;
}

function validInitialize(params) {
  return isObject(params) &&
    typeof params.protocolVersion === 'string' && Boolean(params.protocolVersion) &&
    isObject(params.capabilities) &&
    isObject(params.clientInfo) &&
    typeof params.clientInfo.name === 'string' && Boolean(params.clientInfo.name) &&
    typeof params.clientInfo.version === 'string' && Boolean(params.clientInfo.version);
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

const ACQUIRE_TOOL = {
  name: 'd013_acquire',
  title: 'Acquire MCL D-013 Lease',
  description:
    'Dispatch the fixed hanmiyoo10-alt/- MCL Task Lease workflow on trusted main to acquire one exact pre-reviewed D-013 lease. Requires caller-provided fresh DISJOINT overlap evidence and exact expected ledger generation. No repository, workflow, ref, URL, HTTP method, token, or arbitrary command selector is exposed.',
  inputSchema: {
    type: 'object',
    required: [
      'packet_ref', 'expected_generation', 'route', 'executor', 'scopes',
      'scope_disposition', 'workspace_kind', 'branch', 'worktree'
    ],
    properties: {
      packet_ref: { type: 'string', pattern: '^#[1-9][0-9]*$' },
      expected_generation: { type: 'integer', minimum: 0 },
      route: {
        type: 'string',
        enum: ['S', 'M', 'L', 'S_TERMUX', 'M_PRIVATE_LAB', 'M_VM_LAB', 'S_PRIVATE_LOCAL']
      },
      executor: {
        type: 'string',
        enum: ['S', 'M', 'L', 'S_TERMUX', 'M_PRIVATE_LAB', 'M_VM_LAB', 'S_PRIVATE_LOCAL']
      },
      scopes: {
        type: 'array', minItems: 1, maxItems: 16, uniqueItems: true,
        items: { type: 'string', minLength: 1, maxLength: 512 }
      },
      scope_disposition: { type: 'string', const: 'DISJOINT' },
      workspace_kind: {
        type: 'string',
        enum: [
          'repository', 'landing_metadata', 'landing_residue_cleanup',
          'landing_branch_repair', 'not_applicable'
        ]
      },
      branch: { type: 'string', minLength: 1, maxLength: 300 },
      worktree: { type: 'string', minLength: 1, maxLength: 1024 },
      observed_base_sha: {
        type: 'string', pattern: '^[0-9a-f]{40}$'
      }
    },
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  }
};

const RELEASE_TOOL = {
  name: 'd013_release',
  title: 'Release MCL D-013 Lease',
  description:
    'Dispatch the fixed hanmiyoo10-alt/- MCL Task Lease workflow on trusted main to release one exact active lease belonging to one exact packet. No repository, workflow, ref, URL, HTTP method, token, or arbitrary command selector is exposed.',
  inputSchema: {
    type: 'object',
    required: ['packet_ref', 'expected_generation', 'lease_id'],
    properties: {
      packet_ref: { type: 'string', pattern: '^#[1-9][0-9]*$' },
      expected_generation: { type: 'integer', minimum: 0 },
      lease_id: { type: 'string', pattern: '^[0-9a-f]{64}$' }
    },
    additionalProperties: false
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true
  }
};

export const TOOLS = Object.freeze([ACQUIRE_TOOL, RELEASE_TOOL]);

function createRateLimiter({
  maxPerWindow = DEFAULT_EFFECT_MAX_PER_WINDOW,
  windowMs = DEFAULT_EFFECT_WINDOW_MS,
  now = Date.now
} = {}) {
  const limit = Number.isInteger(maxPerWindow) && maxPerWindow > 0
    ? maxPerWindow : DEFAULT_EFFECT_MAX_PER_WINDOW;
  const duration = Number.isFinite(windowMs) && windowMs > 0
    ? windowMs : DEFAULT_EFFECT_WINDOW_MS;
  let start = now();
  let used = 0;
  return () => {
    const current = now();
    if (current < start || current - start >= duration) {
      start = current;
      used = 0;
    }
    if (used >= limit) return false;
    used += 1;
    return true;
  };
}

function rateLimited(operation) {
  return {
    schemaVersion: 1,
    mode: 'MCL_COORDINATION_OPERATOR',
    status: 'BLOCKED_CAPABILITY',
    reasonCodes: ['D013_EFFECT_RATE_LIMITED'],
    operation,
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false
    }
  };
}

function isSuccess(value) {
  return value?.status === 'DISPATCH_COMPLETE' ||
    value?.status === 'DISPATCH_READBACK_COMPLETE';
}

function toolResult(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: value,
    isError: !isSuccess(value)
  };
}

export async function handleRequest(req, res, {
  service,
  allowEffect,
  publicDomain
}) {
  if (req.method === 'GET' && req.url === '/healthz') {
    return sendJson(res, 200, {
      ok: true,
      service: 'mcl-task-lease-dispatch-mcp',
      version: VERSION
    });
  }
  if (req.url !== '/mcp') return sendJson(res, 404, { error: 'not_found' });
  if (!hostAllowed(req, publicDomain)) return sendJson(res, 403, { error: 'host_not_allowed' });
  if (!originAllowed(req, publicDomain)) return sendJson(res, 403, { error: 'origin_not_allowed' });
  if (req.method !== 'POST') {
    res.writeHead(405, { allow: 'POST' });
    return res.end();
  }

  let msg;
  try { msg = await readJson(req); }
  catch (error) {
    return sendJson(res, 400, rpcError(null, -32700, String(error?.message || 'parse_error')));
  }
  if (!validRpc(msg)) return sendJson(res, 400, rpcError(null, -32600, 'Invalid Request'));

  const hasId = Object.hasOwn(msg, 'id');
  const id = msg.id ?? null;
  if (msg.method !== 'initialize' && !protocolAllowed(req)) {
    return sendJson(res, 400, rpcError(id, -32600, 'Unsupported MCP-Protocol-Version'));
  }
  if (!hasId) {
    res.writeHead(202);
    return res.end();
  }

  if (msg.method === 'initialize') {
    if (!validInitialize(msg.params)) {
      return sendJson(res, 200, rpcError(id, -32602, 'Invalid params'));
    }
    return sendJson(res, 200, rpcResult(id, {
      protocolVersion:
        msg.params.protocolVersion === MCP_PROTOCOL_VERSION
          ? msg.params.protocolVersion
          : MCP_PROTOCOL_VERSION,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mcl-task-lease-dispatch-mcp', version: VERSION }
    }));
  }
  if (msg.method === 'ping') return sendJson(res, 200, rpcResult(id, {}));
  if (msg.method === 'tools/list') {
    return sendJson(res, 200, rpcResult(id, { tools: TOOLS }));
  }
  if (msg.method !== 'tools/call') {
    return sendJson(res, 200, rpcError(id, -32601, 'Method not found'));
  }
  if (!isObject(msg.params) || typeof msg.params.name !== 'string') {
    return sendJson(res, 200, rpcError(id, -32602, 'Invalid params'));
  }

  const args = msg.params.arguments;
  if (msg.params.name === 'd013_acquire') {
    if (validateAcquireArgs(args).length) {
      return sendJson(res, 200, rpcError(id, -32602, 'invalid_tool_arguments'));
    }
    if (!allowEffect()) {
      return sendJson(res, 200, rpcResult(id, toolResult(rateLimited('d013_acquire'))));
    }
    return sendJson(res, 200, rpcResult(id, toolResult(await service.acquire(args))));
  }
  if (msg.params.name === 'd013_release') {
    if (validateReleaseArgs(args).length) {
      return sendJson(res, 200, rpcError(id, -32602, 'invalid_tool_arguments'));
    }
    if (!allowEffect()) {
      return sendJson(res, 200, rpcResult(id, toolResult(rateLimited('d013_release'))));
    }
    return sendJson(res, 200, rpcResult(id, toolResult(await service.release(args))));
  }
  return sendJson(res, 200, rpcError(id, -32602, 'unknown_tool'));
}

export function createD013Server({
  token = process.env[TOKEN_ENV],
  fetchImpl = globalThis.fetch,
  publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || null,
  effectMaxPerWindow = DEFAULT_EFFECT_MAX_PER_WINDOW,
  effectWindowMs = DEFAULT_EFFECT_WINDOW_MS,
  now = Date.now,
  service = null
} = {}) {
  const semanticService = service || createD013Service({ token, fetchImpl });
  const allowEffect = createRateLimiter({
    maxPerWindow: effectMaxPerWindow,
    windowMs: effectWindowMs,
    now
  });
  return createServer((req, res) => {
    void handleRequest(req, res, {
      service: semanticService,
      allowEffect,
      publicDomain
    }).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'internal_error' });
      else if (!res.writableEnded) res.destroy();
    });
  });
}

export function startD013Server({
  port = Number.parseInt(process.env.PORT || '3000', 10),
  host = '0.0.0.0',
  ...options
} = {}) {
  const server = createD013Server(options);
  server.listen(port, host, () => {
    console.error(`mcl-task-lease-dispatch-mcp v${VERSION} listening on :${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startD013Server();
}