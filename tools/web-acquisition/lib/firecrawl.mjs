import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import Ajv from 'ajv';
import { TargetPolicyError, validateTarget } from './policy.mjs';

export const FIRECRAWL_ENDPOINT = 'https://api.firecrawl.dev/v2/scrape';
export const SCHEMA_BYTE_LIMIT = 32 * 1024;
export const RESPONSE_BYTE_LIMIT = 2 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;

export class StructuredInputError extends Error {
  constructor(code) {
    super(code);
    this.name = 'StructuredInputError';
    this.code = code;
  }
}

function safeUrl(value) {
  if (typeof value !== 'string') return value ?? null;
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    return parsed.href;
  } catch {
    return null;
  }
}
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function schemaIdentity(schema) {
  const canonical = JSON.stringify(canonicalize(schema));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

function compileSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new StructuredInputError('SCHEMA_MUST_BE_JSON_OBJECT');
  }
  const ajv = new Ajv({ allErrors: true, strict: true });
  try {
    return { validate: ajv.compile(schema), schemaIdentity: schemaIdentity(schema) };
  } catch {
    throw new StructuredInputError('SCHEMA_INVALID');
  }
}

export async function loadSchemaFile(filePath) {
  if (!filePath) throw new StructuredInputError('SCHEMA_FILE_REQUIRED');
  let info;
  try {
    info = await stat(filePath);
  } catch {
    throw new StructuredInputError('SCHEMA_FILE_UNREADABLE');
  }
  if (!info.isFile()) throw new StructuredInputError('SCHEMA_FILE_UNREADABLE');
  if (info.size > SCHEMA_BYTE_LIMIT) {
    throw new StructuredInputError('SCHEMA_TOO_LARGE');
  }
  let text;
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    throw new StructuredInputError('SCHEMA_FILE_UNREADABLE');
  }
  if (Buffer.byteLength(text, 'utf8') > SCHEMA_BYTE_LIMIT) {
    throw new StructuredInputError('SCHEMA_TOO_LARGE');
  }
  let schema;
  try {
    schema = JSON.parse(text);
  } catch {
    throw new StructuredInputError('SCHEMA_INVALID_JSON');
  }
  compileSchema(schema);
  return schema;
}

export function structuredResult(requestedUrl, schemaId = null) {
  return {
    status: 'FAILED',
    method: 'FIRECRAWL_STRUCTURED_EXTRACT',
    provider: 'FIRECRAWL',
    requestedUrl: safeUrl(requestedUrl),
    schemaIdentity: schemaId,
    providerDataEgress: false,
    providerZeroDataRetentionRequested: false,
    requestCount: 0,
    data: null,
    usage: null,
    warnings: [],
    failureReason: null,
  };
}

function fail(result, status, reason) {
  result.status = status;
  result.failureReason = reason;
  return result;
}

function providerDisposition(status, payload) {
  const detail = [payload?.error, payload?.message, payload?.code]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  if (detail.includes('zero data retention') || detail.includes('zdr')) {
    return ['BLOCKED', 'PROVIDER_ZERO_DATA_RETENTION_UNAVAILABLE'];
  }
  if (status === 401 || status === 403) return ['BLOCKED', 'PROVIDER_AUTH_FAILED'];
  if (status === 402) return ['BLOCKED', 'PROVIDER_CREDITS_OR_BILLING_BLOCKED'];
  if (status === 408) return ['UNKNOWN', 'PROVIDER_TIMEOUT'];
  if (status === 429) return ['BLOCKED', 'PROVIDER_RATE_LIMITED'];
  if (status >= 500) return ['UNKNOWN', 'PROVIDER_SERVER_ERROR'];
  if (status === 200) return ['FAILED', 'PROVIDER_REPORTED_FAILURE'];
  return ['FAILED', `PROVIDER_HTTP_${status}`];
}
function safeUsage(payload) {
  const source = payload?.usage;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const allowed = ['creditsUsed', 'totalCreditsUsed', 'credits', 'units', 'requests'];
  const usage = {};
  for (const key of allowed) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) usage[key] = value;
    else if (typeof value === 'string' && value.length <= 128) usage[key] = value;
  }
  return Object.keys(usage).length ? usage : null;
}

async function readBoundedBody(response, limit) {
  const declared = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    throw new StructuredInputError('PROVIDER_RESPONSE_TOO_LARGE');
  }
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > limit) {
      throw new StructuredInputError('PROVIDER_RESPONSE_TOO_LARGE');
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new StructuredInputError('PROVIDER_RESPONSE_TOO_LARGE');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total).toString('utf8');
}

function buildPayload(url, schema) {
  return {
    url,
    formats: [{ type: 'json', schema }],
    maxAge: 0,
    storeInCache: false,
    skipTlsVerification: false,
    proxy: 'basic',
    zeroDataRetention: true,
  };
}

export async function acquireStructuredData(rawUrl, schema, options = {}) {
  let contract;
  try {
    contract = compileSchema(schema);
  } catch (error) {
    const result = structuredResult(rawUrl);
    return fail(result, 'BLOCKED', error?.code ?? 'SCHEMA_INVALID');
  }
  const result = structuredResult(rawUrl, contract.schemaIdentity);
  if (options.providerOptIn !== true) {
    return fail(result, 'BLOCKED', 'PROVIDER_OPT_IN_REQUIRED');
  }
  let target;
  try {
    target = await validateTarget(rawUrl, { lookup: options.lookup });
  } catch (error) {
    if (error instanceof TargetPolicyError) {
      return fail(result, 'BLOCKED', error.code);
    }
    return fail(result, 'UNKNOWN', 'TARGET_PREFLIGHT_UNKNOWN');
  }
  result.requestedUrl = target.href;
  const apiKey = String(options.apiKey ?? process.env.FIRECRAWL_API_KEY ?? '').trim();
  if (!apiKey) return fail(result, 'BLOCKED', 'FIRECRAWL_API_KEY_REQUIRED');

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return fail(result, 'UNKNOWN', 'PROVIDER_TRANSPORT_UNAVAILABLE');
  }
  const timeoutMs = Number.isFinite(options.timeoutMs)
    ? Math.max(1, Math.min(options.timeoutMs, 120_000))
    : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  result.requestCount = 1;
  result.providerDataEgress = true;
  result.providerZeroDataRetentionRequested = true;
  result.warnings.push('FIRECRAWL_PROVIDER_CONTROLS_NETWORK_DNS_AND_REDIRECTS');

  let response;
  try {
    response = await fetchImpl(FIRECRAWL_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildPayload(target.href, schema)),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (controller.signal.aborted || error?.name === 'AbortError') {
      return fail(result, 'UNKNOWN', 'PROVIDER_TIMEOUT');
    }
    return fail(result, 'UNKNOWN', 'PROVIDER_TRANSPORT_FAILED');
  }

  const requestedResponseLimit = Number(options.responseByteLimit);
  const responseLimit = Number.isFinite(requestedResponseLimit)
    ? Math.max(1, Math.min(requestedResponseLimit, RESPONSE_BYTE_LIMIT))
    : RESPONSE_BYTE_LIMIT;
  let text;
  try {
    text = await readBoundedBody(
      response,
      responseLimit,
    );
  } catch (error) {
    clearTimeout(timer);
    if (controller.signal.aborted || error?.name === 'AbortError') {
      return fail(result, 'UNKNOWN', 'PROVIDER_TIMEOUT');
    }
    const reason = error?.code ?? 'PROVIDER_RESPONSE_READ_FAILED';
    return fail(result, reason === 'PROVIDER_RESPONSE_TOO_LARGE' ? 'FAILED' : 'UNKNOWN', reason);
  }
  clearTimeout(timer);

  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    return fail(result, 'FAILED', 'PROVIDER_INVALID_JSON');
  }
  if (!response.ok || payload?.success !== true) {
    const [status, reason] = providerDisposition(response.status, payload);
    return fail(result, status, reason);
  }
  if (!payload.data || typeof payload.data !== 'object') {
    return fail(result, 'FAILED', 'PROVIDER_REPORTED_FAILURE');
  }

  const data = payload.data.json;
  if (data === undefined) {
    return fail(result, 'FAILED', 'PROVIDER_STRUCTURED_DATA_MISSING');
  }
  let valid = false;
  try {
    valid = contract.validate(data);
  } catch {
    valid = false;
  }
  if (!valid) return fail(result, 'FAILED', 'PROVIDER_SCHEMA_MISMATCH');

  result.status = 'OK';
  result.data = data;
  result.usage = safeUsage(payload);
  return result;
}
