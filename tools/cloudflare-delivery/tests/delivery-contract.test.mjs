import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import {
  loadPolicy,
  parseArgs as parseStageArgs,
  stageDelivery,
  verifyStageCurrentness,
  validateAgainstPromotionPolicy,
  validatePolicy,
} from '../stage.mjs';
import {parseArgs as parseLiveArgs, verifyLive} from '../verify-live.mjs';
import worker, {RANGE_PATHS, parseSingleByteRange} from '../worker.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.dirname(HERE);
const ROOT = path.resolve(TOOL, '..', '..');
const POLICY = loadPolicy();
const PROMOTION = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/public-distribution/policy.json'), 'utf8'));

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function gitText(cwd, args) {
  return String(git(cwd, args)).trim();
}
function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function modeFor(file) {
  return file.endsWith('.sh') || file.includes('/termux/') ? '100755' : '100644';
}
const BYTES = new Map([
  ['local/termux/00-update-local-stack', Buffer.from('#!/bin/sh\necho update\n')],
  ['local/termux/10-start-local-stack', Buffer.from('#!/bin/sh\necho start\n')],
  ['plugins/simcore/latest.js', Buffer.from('//@version 1.0.0\nexport default 1;\n')],
  ['plugins/simcore/install.js', Buffer.from('//@version 1.0.0\nexport default 2;\n')],
  ['plugins/usage-dashboard/latest.js', Buffer.from('//@version 2.0.0\nexport default 3;\n')],
  ['plugins/usage-dashboard/runtime/product-manifest.json', Buffer.from('{"version":"2.0.0"}\n')],
  ['plugins/usage-dashboard/runtime/bridge-engine.mjs', Buffer.from('export const engine=1;\n')],
  ['plugins/usage-dashboard/runtime/bridge-manager.cjs', Buffer.from('module.exports={manager:1};\n')],
  ['plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh', Buffer.from('#!/bin/sh\necho bridge\n')],
]);

async function replaceTree(repo, entries) {
  for (const entry of await fsp.readdir(repo)) {
    if (entry !== '.git') await fsp.rm(path.join(repo, entry), {recursive: true, force: true});
  }
  for (const [file, row] of entries) {
    const absolute = path.join(repo, file);
    await fsp.mkdir(path.dirname(absolute), {recursive: true});
    await fsp.writeFile(absolute, row.bytes);
    await fsp.chmod(absolute, row.mode === '100755' ? 0o755 : 0o644);
  }
}
function commit(repo, message) {
  git(repo, ['add', '-A']);
  git(repo, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', message]);
  return gitText(repo, ['rev-parse', 'HEAD']);
}

async function fixture() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'cf-delivery-'));
  const sourceBare = path.join(root, 'source.git');
  const mirrorBare = path.join(root, 'mirror.git');
  git(root, ['init', '--bare', 'source.git']);
  git(root, ['init', '--bare', 'mirror.git']);
  const source = path.join(root, 'source');
  const mirror = path.join(root, 'mirror');
  git(root, ['clone', sourceBare, source]);

  const sourceShas = {};
  for (const channel of POLICY.channels) {
    git(source, ['checkout', '--orphan', `build-${channel.name}`]);
    await replaceTree(source, channel.files.map((file) => [
      file.sourcePath,
      {bytes: BYTES.get(file.sourcePath), mode: modeFor(file.sourcePath)},
    ]));
    const sha = commit(source, `source ${channel.name}`);
    sourceShas[channel.name] = sha;
    git(source, ['branch', '-M', channel.sourceRef]);
    git(source, ['push', '-f', 'origin', channel.sourceRef]);
    git(source, ['update-ref', `refs/remotes/origin/${channel.sourceRef}`, sha]);
  }

  git(root, ['clone', mirrorBare, mirror]);
  for (const channel of POLICY.channels) {
    git(mirror, ['checkout', '--orphan', `build-${channel.name}`]);
    const entries = channel.files.map((file) => [
      file.sourcePath,
      {bytes: BYTES.get(file.sourcePath), mode: modeFor(file.sourcePath)},
    ]);
    const provenance = {
      schemaVersion: 1,
      publisherVersion: '1.0.0',
      channel: channel.name,
      sourceRepository: POLICY.sourceRepository,
      sourceRef: channel.sourceRef,
      sourceCommit: sourceShas[channel.name],
      targetRepository: POLICY.mirrorRepository,
      targetBranch: channel.mirrorBranch,
      files: channel.files.map((file) => ({
        path: file.sourcePath,
        mode: modeFor(file.sourcePath),
        sha256: sha256(BYTES.get(file.sourcePath)),
      })),
    };
    entries.push([POLICY.provenancePath, {
      bytes: Buffer.from(JSON.stringify(provenance, null, 2) + '\n'),
      mode: '100644',
    }]);
    await replaceTree(mirror, entries);
    const sha = commit(mirror, `mirror ${channel.name}`);
    git(mirror, ['branch', '-M', channel.mirrorBranch]);
    git(mirror, ['push', '-f', 'origin', channel.mirrorBranch]);
    git(mirror, ['update-ref', `refs/remotes/origin/${channel.mirrorBranch}`, sha]);
  }
  return {root, source, mirror};
}

test('policy is exact, nine-file, and aligned with the promotion owner', () => {
  validatePolicy(POLICY);
  validateAgainstPromotionPolicy(POLICY, PROMOTION);
  assert.equal(POLICY.channels.flatMap((row) => row.files).length, 9);
  assert.equal(POLICY.publicBaseUrl, 'https://update.myang.link');
});

test('CLIs reject caller-selected repo/ref/path/hostname widening', () => {
  assert.throws(() => parseStageArgs([
    '--mirror-dir', '/tmp/m', '--output-dir', '/tmp/o', '--report', '/tmp/r',
    '--ref', 'evil',
  ]), /UNKNOWN_ARGUMENT/);
  assert.throws(() => parseLiveArgs([
    '--stage-report', '/tmp/s', '--report', '/tmp/r', '--url', 'https://evil.invalid',
  ]), /UNKNOWN_ARGUMENT/);
});

test('staging proves canonical-to-mirror provenance, bytes, modes, and exact inventory', async () => {
  const f = await fixture();
  const output = path.join(f.root, 'dist');
  const report = await stageDelivery({
    sourceRepo: f.source,
    mirrorDir: f.mirror,
    outputDir: output,
    enforceRepositoryIdentity: false,
  });
  assert.equal(report.status, 'PASS');
  assert.equal(report.files.length, 9);
  assert.deepEqual(report.outputInventory, [
    '_headers',
    'simcore/install.js',
    'simcore/latest.js',
    'termux/00-update-local-stack',
    'termux/10-start-local-stack',
    'usage-dashboard/latest.js',
    'usage-dashboard/runtime/bootstrap-bridge-manager.sh',
    'usage-dashboard/runtime/bridge-engine.mjs',
    'usage-dashboard/runtime/bridge-manager.cjs',
    'usage-dashboard/runtime/product-manifest.json',
  ]);
  for (const row of report.files) {
    const absolute = path.join(output, row.publicPath);
    assert.equal(sha256(await fsp.readFile(absolute)), row.sha256);
    assert.equal((await fsp.stat(absolute)).mode & 0o111 ? '100755' : '100644', row.mode);
  }
});

test('deploy currentness check fails closed when a recorded source head moves', async () => {
  const f = await fixture();
  const output = path.join(f.root, 'dist-currentness');
  const stage = await stageDelivery({
    sourceRepo: f.source,
    mirrorDir: f.mirror,
    outputDir: output,
    enforceRepositoryIdentity: false,
  });
  const current = verifyStageCurrentness({
    sourceRepo: f.source,
    mirrorDir: f.mirror,
    stage,
    enforceRepositoryIdentity: false,
  });
  assert.equal(current.status, 'PASS');
  assert.equal(current.channels.length, 3);

  git(f.source, ['checkout', 'main']);
  const target = path.join(f.source, 'local/termux/00-update-local-stack');
  await fsp.appendFile(target, '# moved\n');
  commit(f.source, 'move main after staging');
  git(f.source, ['push', '-f', 'origin', 'main']);

  assert.throws(() => verifyStageCurrentness({
    sourceRepo: f.source,
    mirrorDir: f.mirror,
    stage,
    enforceRepositoryIdentity: false,
  }), /SOURCE_REF_MOVED/);
});

test('wrangler config routes only the three range paths through the Worker+ASSETS adapter', () => {
  const config = JSON.parse(fs.readFileSync(path.join(TOOL, 'wrangler.jsonc'), 'utf8'));
  const expected = POLICY.channels.flatMap((channel) => channel.files)
    .filter((file) => file.rangeProof).map((file) => `/${file.publicPath}`);
  assert.equal(config.name, 'myang-public-delivery');
  assert.equal(config.main, './worker.mjs');
  assert.equal(config.compatibility_date, '2026-10-13');
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.assets, {
    directory: './dist',
    html_handling: 'none',
    not_found_handling: 'none',
    binding: 'ASSETS',
    run_worker_first: expected,
  });
  assert.deepEqual(RANGE_PATHS, expected);
  for (const forbidden of ['routes', 'r2_buckets', 'kv_namespaces', 'd1_databases', 'durable_objects', 'services']) {
    assert.equal(Object.hasOwn(config, forbidden), false, forbidden);
  }
});

test('range parser accepts only bounded explicit single byte ranges', () => {
  assert.deepEqual(parseSingleByteRange('bytes=2-5', 10), {kind: 'range', start: 2, end: 5});
  assert.deepEqual(parseSingleByteRange('bytes=8-99', 10), {kind: 'range', start: 8, end: 9});
  for (const value of [
    'bytes=5-2',
    'bytes=0-1,4-5',
    'bytes=-5',
    'bytes=5-',
    'items=0-1',
    'bytes=9007199254740992-9007199254740993',
  ]) {
    assert.equal(parseSingleByteRange(value, 10).kind, 'invalid', value);
  }
  assert.equal(parseSingleByteRange('bytes=10-12', 10).kind, 'unsatisfiable');
});

test('range worker returns exact partial bytes and preserves asset metadata', async () => {
  const source = Buffer.from('0123456789abcdef');
  let backingRequest;
  const env = {ASSETS: {fetch: async (request) => {
    backingRequest = request;
    return new Response(source, {status: 200, headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
      'Content-Type': 'application/javascript; charset=utf-8',
      ETag: '"fixture"',
    }});
  }}};
  const response = await worker.fetch(new Request(
    'https://update.myang.link/simcore/latest.js',
    {headers: {Range: 'bytes=2-5'}},
  ), env);
  assert.equal(response.status, 206);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString(), '2345');
  assert.equal(response.headers.get('content-range'), 'bytes 2-5/16');
  assert.equal(response.headers.get('content-length'), '4');
  assert.equal(response.headers.get('accept-ranges'), 'bytes');
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('content-type'), 'application/javascript; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
  assert.equal(response.headers.get('etag'), '"fixture"');
  assert.equal(backingRequest.headers.get('range'), null);
});

test('range worker delegates non-owned, non-range, and non-GET requests unchanged', async () => {
  const seen = [];
  const env = {ASSETS: {fetch: async (request) => {
    seen.push({method: request.method, path: new URL(request.url).pathname, range: request.headers.get('range')});
    return new Response('delegated', {status: 202, headers: {'X-Delegated': 'yes'}});
  }}};
  const requests = [
    new Request('https://update.myang.link/termux/00-update-local-stack', {headers: {Range: 'bytes=0-1'}}),
    new Request('https://update.myang.link/simcore/latest.js'),
    new Request('https://update.myang.link/simcore/latest.js', {method: 'POST', body: 'x', headers: {Range: 'bytes=0-1'}}),
  ];
  for (const request of requests) {
    const response = await worker.fetch(request, env);
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('x-delegated'), 'yes');
  }
  assert.deepEqual(seen.map((row) => row.range), ['bytes=0-1', null, 'bytes=0-1']);
});

test('range worker fails closed on invalid ranges and preserves upstream failure', async () => {
  const bytes = Buffer.from('abcdef');
  const env = {ASSETS: {fetch: async () => new Response(bytes, {
    status: 200,
    headers: {'Content-Type': 'application/javascript; charset=utf-8'},
  })}};
  for (const value of ['bytes=4-2', 'bytes=0-1,3-4', 'bytes=6-8']) {
    const response = await worker.fetch(new Request(
      'https://update.myang.link/simcore/install.js',
      {headers: {Range: value}},
    ), env);
    assert.equal(response.status, 416, value);
    assert.equal(response.headers.get('content-range'), 'bytes */6');
    assert.equal(response.headers.get('content-length'), '0');
  }

  const missing = {ASSETS: {fetch: async () => new Response('missing', {status: 404})}};
  const response = await worker.fetch(new Request(
    'https://update.myang.link/usage-dashboard/latest.js',
    {headers: {Range: 'bytes=0-2'}},
  ), missing);
  assert.equal(response.status, 404);
  assert.equal(await response.text(), 'missing');
});

test('live verifier proves exact bytes, CORS, MIME, and three Risu range paths', async () => {
  const stage = {
    schemaVersion: 1,
    kind: 'CLOUDFLARE_DELIVERY_STAGE',
    status: 'PASS',
    workerName: POLICY.workerName,
    publicBaseUrl: POLICY.publicBaseUrl,
    files: POLICY.channels.flatMap((channel) => channel.files.map((file) => ({
      publicPath: file.publicPath,
      contentType: file.contentType,
      rangeProof: file.rangeProof,
      sha256: sha256(BYTES.get(file.sourcePath)),
    }))),
  };
  const byPublic = new Map(POLICY.channels.flatMap((channel) =>
    channel.files.map((file) => [file.publicPath, {file, bytes: BYTES.get(file.sourcePath)}])));
  const fetchImpl = async (url, init = {}) => {
    const publicPath = url.pathname.replace(/^\//, '');
    const row = byPublic.get(publicPath);
    if (!row) return new Response('', {status: 404});
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': row.file.contentType,
    };
    const range = new Headers(init.headers || {}).get('range');
    if (range) {
      const match = /^bytes=0-(\d+)$/.exec(range);
      const end = Math.min(Number(match?.[1] ?? 0), row.bytes.length - 1);
      headers['Content-Range'] = `bytes 0-${end}/${row.bytes.length}`;
      return new Response(row.bytes.subarray(0, end + 1), {status: 206, headers});
    }
    return new Response(row.bytes, {status: 200, headers});
  };
  const report = await verifyLive({stage, policy: POLICY, fetchImpl});
  assert.equal(report.status, 'PASS');
  assert.equal(report.files.filter((row) => row.range).length, 3);
});

test('live verifier retries bounded stale digest propagation before succeeding', async () => {
  const stage = {
    schemaVersion: 1,
    kind: 'CLOUDFLARE_DELIVERY_STAGE',
    status: 'PASS',
    workerName: POLICY.workerName,
    publicBaseUrl: POLICY.publicBaseUrl,
    files: POLICY.channels.flatMap((channel) => channel.files.map((file) => ({
      publicPath: file.publicPath,
      contentType: file.contentType,
      rangeProof: file.rangeProof,
      sha256: sha256(BYTES.get(file.sourcePath)),
    }))),
  };
  const byPublic = new Map(POLICY.channels.flatMap((channel) =>
    channel.files.map((file) => [file.publicPath, {file, bytes: BYTES.get(file.sourcePath)}])));
  const firstPath = stage.files[0].publicPath;
  let staleServed = false;
  let sleeps = 0;
  const fetchImpl = async (url, init = {}) => {
    const publicPath = url.pathname.replace(/^\//, '');
    const row = byPublic.get(publicPath);
    if (!row) return new Response('', {status: 404});
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': row.file.contentType,
    };
    const range = new Headers(init.headers || {}).get('range');
    if (!range && publicPath === firstPath && !staleServed) {
      staleServed = true;
      return new Response(Buffer.from('stale'), {status: 200, headers});
    }
    if (range) {
      const match = /^bytes=0-(\d+)$/.exec(range);
      const end = Math.min(Number(match?.[1] ?? 0), row.bytes.length - 1);
      headers['Content-Range'] = `bytes 0-${end}/${row.bytes.length}`;
      return new Response(row.bytes.subarray(0, end + 1), {status: 206, headers});
    }
    return new Response(row.bytes, {status: 200, headers});
  };
  const report = await verifyLive({
    stage,
    policy: POLICY,
    fetchImpl,
    delayMs: 0,
    sleepFn: async () => { sleeps += 1; },
  });
  assert.equal(report.status, 'PASS');
  assert.equal(report.files[0].attempts, 2);
  assert.equal(sleeps, 1);
});

test('_headers and workflow preserve public-static/manual-only boundaries', () => {
  const headers = fs.readFileSync(path.join(TOOL, '_headers'), 'utf8');
  assert.match(headers, /Access-Control-Allow-Origin: \*/);
  assert.match(headers, /Content-Range/);
  assert.doesNotMatch(headers, /Authorization|Cookie|token|secret/i);

  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/cloudflare-workers-static-publish.yml'), 'utf8');
  assert.match(workflow, /^on:\n  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow, /^\s+(push|schedule|workflow_run):/m);
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /environment: cloudflare-public-delivery/);
  assert.match(workflow, /concurrency:\n  group: public-distribution-publish/);
  assert.match(workflow, /currentness\.mjs/);
  assert(workflow.lastIndexOf('currentness.mjs') < workflow.lastIndexOf('wrangler deploy'));
  assert.match(workflow, /cloudflare-delivery-currentness\.json/);
  assert.match(workflow, /MYANG_DISTRIBUTION_READ_SSH_KEY/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(workflow, /verify-live\.mjs/);
  assert.doesNotMatch(workflow, /\bR2\b|AWS_ACCESS|rclone|cloudflared/i);
});
