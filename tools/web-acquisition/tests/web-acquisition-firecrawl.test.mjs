import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  FIRECRAWL_ENDPOINT,
  RESPONSE_BYTE_LIMIT,
  acquireStructuredData,
  loadSchemaFile,
} from '../lib/firecrawl.mjs';
import { main, parseArgs } from '../structured-cli.mjs';

const publicUrl = 'https://public.example/item';
const publicIpUrl = 'https://93.184.216.34/item';
const apiKey = 'fc-SENTINEL-DO-NOT-LEAK';
const lookup = async () => [{ address: '93.184.216.34', family: 4 }];
const schema = {
  type: 'object',
  additionalProperties: false,
  properties: { title: { type: 'string' } },
  required: ['title'],
};
const cliPath = fileURLToPath(new URL('../structured-cli.mjs', import.meta.url));
function responseJson(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function successFetch(data = { title: 'OK' }, capture = null) {
  return async (url, init) => {
    if (capture) capture.push({ url, init });
    return responseJson({ success: true, data: { json: data }, usage: { creditsUsed: 1 } });
  };
}

function baseOptions(extra = {}) {
  return {
    providerOptIn: true,
    apiKey,
    lookup,
    fetchImpl: successFetch(),
    ...extra,
  };
}

async function tempSchemaFile(schemaValue = schema) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'web-acq-firecrawl-'));
  const file = path.join(dir, 'schema.json');
  await writeFile(file, JSON.stringify(schemaValue));
  return { dir, file };
}
test('valid structured extraction makes exactly one fixed Firecrawl request', async () => {
  const calls = [];
  const result = await acquireStructuredData(publicUrl, schema, baseOptions({
    fetchImpl: successFetch({ title: 'Structured' }, calls),
  }));
  assert.equal(result.status, 'OK');
  assert.equal(result.requestCount, 1);
  assert.equal(result.providerDataEgress, true);
  assert.equal(result.providerZeroDataRetentionRequested, true);
  assert.match(result.schemaIdentity, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(result.data, { title: 'Structured' });
  assert.deepEqual(result.usage, { creditsUsed: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, FIRECRAWL_ENDPOINT);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(body, {
    url: publicUrl,
    formats: [{ type: 'json', schema }],
    maxAge: 0,
    storeInCache: false,
    skipTlsVerification: false,
    proxy: 'basic',
    zeroDataRetention: true,
  });
  for (const forbidden of ['actions', 'headers', 'cookies', 'prompt', 'crawl', 'search', 'map']) {
    assert.equal(Object.hasOwn(body, forbidden), false);
  }
  assert.equal(calls[0].init.headers.authorization, `Bearer ${apiKey}`);
  assert.equal(JSON.stringify(result).includes(apiKey), false);
});
test('provider opt-in and credential are required before provider invocation', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return responseJson({}); };
  const noOptIn = await acquireStructuredData(publicUrl, schema, {
    apiKey, lookup, fetchImpl,
  });
  assert.equal(noOptIn.status, 'BLOCKED');
  assert.equal(noOptIn.failureReason, 'PROVIDER_OPT_IN_REQUIRED');
  const noKey = await acquireStructuredData(publicUrl, schema, {
    providerOptIn: true, apiKey: '', lookup, fetchImpl,
  });
  assert.equal(noKey.status, 'BLOCKED');
  assert.equal(noKey.failureReason, 'FIRECRAWL_API_KEY_REQUIRED');
  assert.equal(calls, 0);
  assert.equal(noKey.requestCount, 0);
  assert.equal(noKey.providerDataEgress, false);
  assert.equal(noKey.providerZeroDataRetentionRequested, false);
});

test('target preflight blocks unsafe, credential and private targets before provider', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return responseJson({}); };
  const targets = [
    ['javascript:alert(1)', 'TARGET_UNSAFE_SCHEME'],
    ['https://user:secret@example.com/', 'TARGET_CREDENTIALS_FORBIDDEN'],
    ['https://user:secret@', 'TARGET_INVALID_URL'],
    ['http://127.0.0.1/', 'TARGET_PRIVATE_NETWORK'],
    ['http://169.254.169.254/latest/meta-data/', 'TARGET_PRIVATE_NETWORK'],
  ];
  for (const [target, reason] of targets) {
    const result = await acquireStructuredData(target, schema, baseOptions({ fetchImpl }));
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.failureReason, reason);
    assert.equal(JSON.stringify(result).includes('secret'), false);
  }
  assert.equal(calls, 0);
});
test('invalid schema blocks before provider invocation', async () => {
  let calls = 0;
  const result = await acquireStructuredData(publicUrl, {
    type: 'object', unknownKeyword: true,
  }, baseOptions({
    fetchImpl: async () => { calls += 1; return responseJson({}); },
  }));
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.failureReason, 'SCHEMA_INVALID');
  assert.equal(calls, 0);
});

test('schema file size and JSON validity are bounded before provider use', async () => {
  const oversized = await tempSchemaFile({ value: 'X'.repeat(33 * 1024) });
  await assert.rejects(loadSchemaFile(oversized.file), (error) =>
    error.code === 'SCHEMA_TOO_LARGE');
  const invalid = await tempSchemaFile(schema);
  await writeFile(invalid.file, '{not-json');
  await assert.rejects(loadSchemaFile(invalid.file), (error) =>
    error.code === 'SCHEMA_INVALID_JSON');
});

test('schema mismatch and malformed provider output never become success', async () => {
  const mismatch = await acquireStructuredData(publicUrl, schema, baseOptions({
    fetchImpl: successFetch({ title: 42 }),
  }));
  assert.equal(mismatch.status, 'FAILED');
  assert.equal(mismatch.failureReason, 'PROVIDER_SCHEMA_MISMATCH');
  const malformed = await acquireStructuredData(publicUrl, schema, baseOptions({
    fetchImpl: async () => new Response('not-json', { status: 200 }),
  }));
  assert.equal(malformed.status, 'FAILED');
  assert.equal(malformed.failureReason, 'PROVIDER_INVALID_JSON');
});
test('provider auth, billing, rate-limit, server and ZDR failures stay explicit', async () => {
  const cases = [
    [401, { error: 'unauthorized' }, 'BLOCKED', 'PROVIDER_AUTH_FAILED'],
    [402, { error: 'credits exhausted' }, 'BLOCKED', 'PROVIDER_CREDITS_OR_BILLING_BLOCKED'],
    [429, { error: 'rate limited' }, 'BLOCKED', 'PROVIDER_RATE_LIMITED'],
    [503, { error: 'upstream unavailable' }, 'UNKNOWN', 'PROVIDER_SERVER_ERROR'],
    [400, { error: 'Zero Data Retention is not enabled' }, 'BLOCKED', 'PROVIDER_ZERO_DATA_RETENTION_UNAVAILABLE'],
    [200, { success: false, error: 'ZDR is unavailable' }, 'BLOCKED', 'PROVIDER_ZERO_DATA_RETENTION_UNAVAILABLE'],
  ];
  for (const [statusCode, body, status, reason] of cases) {
    let calls = 0;
    const result = await acquireStructuredData(publicUrl, schema, baseOptions({
      fetchImpl: async () => { calls += 1; return responseJson(body, statusCode); },
    }));
    assert.equal(result.status, status);
    assert.equal(result.failureReason, reason);
    assert.equal(result.requestCount, 1);
    assert.equal(calls, 1);
  }
});

test('timeout is UNKNOWN and never retries', async () => {
  let calls = 0;
  const fetchImpl = async (_url, init) => new Promise((_resolve, reject) => {
    calls += 1;
    init.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
  const result = await acquireStructuredData(publicUrl, schema, baseOptions({
    fetchImpl, timeoutMs: 5,
  }));
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.failureReason, 'PROVIDER_TIMEOUT');
  assert.equal(calls, 1);
});
test('timeout remains active while reading the response body', async () => {
  const fetchImpl = async (_url, init) => ({
    ok: true, status: 200, headers: { get: () => null },
    body: { getReader: () => ({
      read: () => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => { const error = new Error('aborted'); error.name = 'AbortError'; reject(error); }, { once: true })),
      cancel: async () => {},
    }) },
  });
  const result = await acquireStructuredData(publicUrl, schema, baseOptions({ fetchImpl, timeoutMs: 5 }));
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.failureReason, 'PROVIDER_TIMEOUT');
  assert.equal(result.requestCount, 1);
});
test('oversized provider response is bounded', async () => {
  const result = await acquireStructuredData(publicUrl, schema, baseOptions({
    fetchImpl: async () => responseJson(
      { success: true, data: { json: { title: 'never-read' } } },
      200,
      { 'content-length': String(RESPONSE_BYTE_LIMIT + 1) },
    ),
  }));
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failureReason, 'PROVIDER_RESPONSE_TOO_LARGE');
});
test('response byte ceiling cannot be widened above 2 MiB', async () => {
  const result = await acquireStructuredData(publicUrl, schema, baseOptions({
    responseByteLimit: RESPONSE_BYTE_LIMIT * 4,
    fetchImpl: async () => responseJson({ success: true, data: { json: { title: 'no' } } }, 200, { 'content-length': String(RESPONSE_BYTE_LIMIT + 1) }),
  }));
  assert.equal(result.status, 'FAILED');
  assert.equal(result.failureReason, 'PROVIDER_RESPONSE_TOO_LARGE');
});

test('CLI parser requires one URL, schema file, and explicit Firecrawl opt-in', () => {
  assert.throws(() => parseArgs([]), /CLI_REQUIRES_EXACTLY_ONE_URL/);
  assert.throws(() => parseArgs(['https://a.test', 'https://b.test']), /CLI_REQUIRES_EXACTLY_ONE_URL/);
  assert.throws(() => parseArgs(['https://a.test']), /CLI_SCHEMA_FILE_REQUIRED/);
  const parsed = parseArgs([
    'https://a.test', '--schema-file', 'schema.json', '--provider', 'firecrawl',
  ]);
  assert.equal(parsed.provider, 'firecrawl');
  assert.throws(() => parseArgs([
    'https://a.test', '--schema-file', 'schema.json', '--api-key', 'secret',
  ]), /CLI_UNKNOWN_OPTION/);
});

test('CLI main writes one JSON line and preserves secret isolation', async () => {
  const { file } = await tempSchemaFile();
  let stdout = '';
  const { output, exitCode } = await main([
    publicUrl, '--schema-file', file, '--provider', 'firecrawl',
  ], {
    env: { FIRECRAWL_API_KEY: apiKey }, lookup,
    fetchImpl: successFetch({ title: 'CLI_OK' }),
    write: (text) => { stdout += text; },
  });
  assert.equal(exitCode, 0);
  assert.equal(output.status, 'OK');
  assert.equal(stdout.trim().split('\n').length, 1);
  assert.equal(JSON.parse(stdout).data.title, 'CLI_OK');
  assert.equal(stdout.includes(apiKey), false);
});
test('real CLI child process can run deterministically with a mocked provider transport', async () => {
  const { dir, file } = await tempSchemaFile();
  const preload = path.join(dir, 'mock-fetch.mjs');
  await writeFile(preload, `globalThis.fetch = async () => new Response(JSON.stringify({success:true,data:{json:{title:'CLI_CHILD_OK'}}}), {status:200,headers:{'content-type':'application/json'}});\n`);
  const child = await new Promise((resolve, reject) => {
    const processHandle = spawn(process.execPath, [
      '--import', pathToFileURL(preload).href,
      cliPath,
      publicIpUrl,
      '--schema-file', file,
      '--provider', 'firecrawl',
    ], { env: { ...process.env, FIRECRAWL_API_KEY: apiKey } });
    let stdout = '';
    let stderr = '';
    processHandle.stdout.setEncoding('utf8');
    processHandle.stderr.setEncoding('utf8');
    processHandle.stdout.on('data', (chunk) => { stdout += chunk; });
    processHandle.stderr.on('data', (chunk) => { stderr += chunk; });
    processHandle.once('error', reject);
    processHandle.once('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(child.code, 0);
  assert.equal(child.stderr, '');
  assert.equal(child.stdout.trim().split('\n').length, 1);
  const parsed = JSON.parse(child.stdout);
  assert.equal(parsed.status, 'OK');
  assert.equal(parsed.data.title, 'CLI_CHILD_OK');
  assert.equal(parsed.requestCount, 1);
  assert.equal(child.stdout.includes(apiKey), false);
});
test('adapter creates no Firecrawl or browser configuration artifacts', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'web-acq-home-'));
  const { file } = await tempSchemaFile();
  let stdout = '';
  await main([publicUrl, '--schema-file', file, '--provider', 'firecrawl'], {
    env: { HOME: home, FIRECRAWL_API_KEY: apiKey },
    lookup,
    fetchImpl: successFetch(),
    write: (text) => { stdout += text; },
  });
  assert.equal(existsSync(path.join(home, '.firecrawl')), false);
  assert.equal(existsSync(path.join(home, '.config', 'firecrawl')), false);
  assert.equal(stdout.includes(apiKey), false);
});

test('package and lockfile contain no Firecrawl SDK or CLI dependency', async () => {
  const packageText = await readFile(new URL('../package.json', import.meta.url), 'utf8');
  const lockText = await readFile(new URL('../package-lock.json', import.meta.url), 'utf8');
  for (const forbidden of ['"firecrawl"', '@mendable/firecrawl-js', 'firecrawl-cli']) {
    assert.equal(packageText.includes(forbidden), false);
    assert.equal(lockText.includes(forbidden), false);
  }
  assert(packageText.includes('"ajv": "8.20.0"'));
});
