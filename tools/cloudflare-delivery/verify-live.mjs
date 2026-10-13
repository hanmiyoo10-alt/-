#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POLICY_PATH = path.join(HERE, 'policy.json');

function fail(code, detail = '') {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

export function parseArgs(argv) {
  const out = {stageReport: null, report: null};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === '--stage-report' || key === '--report') {
      if (!value || value.startsWith('--')) fail('MISSING_ARGUMENT_VALUE', key);
      out[key.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
      index += 1;
      continue;
    }
    fail('UNKNOWN_ARGUMENT', key);
  }
  if (!out.stageReport) fail('STAGE_REPORT_REQUIRED');
  if (!out.report) fail('REPORT_PATH_REQUIRED');
  return out;
}

function validateStageReport(stage, policy) {
  if (!stage || stage.schemaVersion !== 1 || stage.kind !== 'CLOUDFLARE_DELIVERY_STAGE' || stage.status !== 'PASS') {
    fail('INVALID_STAGE_REPORT');
  }
  if (stage.workerName !== policy.workerName) fail('STAGE_WORKER_MISMATCH');
  if (stage.publicBaseUrl !== policy.publicBaseUrl) fail('STAGE_PUBLIC_BASE_URL_MISMATCH');
  if (!Array.isArray(stage.files) || stage.files.length !== 9) fail('STAGE_FILE_COUNT_MISMATCH');

  const expected = policy.channels.flatMap((channel) =>
    channel.files.map((row) => [row.publicPath, row.contentType, row.rangeProof]));
  const actual = stage.files.map((row) => [row.publicPath, row.contentType, row.rangeProof]);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('STAGE_FILE_POLICY_MISMATCH');
  for (const row of stage.files) {
    if (!/^[0-9a-f]{64}$/.test(row.sha256)) fail('STAGE_DIGEST_INVALID', row.publicPath);
  }
}

async function readBytes(response) {
  return Buffer.from(await response.arrayBuffer());
}

export async function verifyLive({stage, policy = loadPolicy(), fetchImpl = fetch}) {
  validateStageReport(stage, policy);
  const base = new URL(policy.publicBaseUrl);
  if (base.protocol !== 'https:' || base.pathname !== '/' || base.search || base.hash) fail('INVALID_FIXED_PUBLIC_BASE_URL');

  const results = [];
  for (const row of stage.files) {
    const url = new URL('/' + row.publicPath, base);
    const response = await fetchImpl(url, {method: 'GET', redirect: 'error', cache: 'no-store'});
    if (response.status !== 200) fail('LIVE_STATUS_MISMATCH', `${row.publicPath}:${response.status}`);
    if (response.headers.get('access-control-allow-origin') !== '*') fail('LIVE_CORS_MISMATCH', row.publicPath);
    if (String(response.headers.get('content-type') || '').toLowerCase() !== row.contentType.toLowerCase()) {
      fail('LIVE_CONTENT_TYPE_MISMATCH', row.publicPath);
    }
    const bytes = await readBytes(response);
    if (sha256(bytes) !== row.sha256) fail('LIVE_DIGEST_MISMATCH', row.publicPath);

    let range = null;
    if (row.rangeProof) {
      const end = Math.min(15, Math.max(0, bytes.length - 1));
      const rangeResponse = await fetchImpl(url, {
        method: 'GET',
        headers: {Range: `bytes=0-${end}`},
        redirect: 'error',
        cache: 'no-store',
      });
      if (rangeResponse.status !== 206) fail('LIVE_RANGE_STATUS_MISMATCH', `${row.publicPath}:${rangeResponse.status}`);
      if (rangeResponse.headers.get('access-control-allow-origin') !== '*') fail('LIVE_RANGE_CORS_MISMATCH', row.publicPath);
      const contentRange = String(rangeResponse.headers.get('content-range') || '');
      const match = /^bytes 0-(\d+)\/(\d+)$/.exec(contentRange);
      if (!match || Number(match[1]) !== end || Number(match[2]) !== bytes.length) {
        fail('LIVE_CONTENT_RANGE_MISMATCH', row.publicPath);
      }
      const rangeBytes = await readBytes(rangeResponse);
      if (!rangeBytes.equals(bytes.subarray(0, end + 1))) fail('LIVE_RANGE_BYTES_MISMATCH', row.publicPath);
      range = {status: 206, contentRange};
    }

    results.push({
      publicPath: row.publicPath,
      status: 200,
      sha256: row.sha256,
      cors: 'PASS',
      contentType: row.contentType,
      range,
    });
  }

  return {
    schemaVersion: 1,
    kind: 'CLOUDFLARE_DELIVERY_LIVE_VERIFY',
    status: 'PASS',
    publicBaseUrl: policy.publicBaseUrl,
    files: results,
  };
}

function boundedErrorCode(error) {
  return String(error?.message || error || 'UNKNOWN_ERROR').split(':', 1)[0].slice(0, 120);
}

async function writeReport(reportPath, report) {
  await fsp.mkdir(path.dirname(reportPath), {recursive: true});
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const policy = loadPolicy();
  const stage = JSON.parse(fs.readFileSync(path.resolve(args.stageReport), 'utf8'));
  try {
    const report = await verifyLive({stage, policy});
    await writeReport(path.resolve(args.report), report);
    process.stdout.write(JSON.stringify({status: report.status, files: report.files.length}) + '\n');
  } catch (error) {
    await writeReport(path.resolve(args.report), {
      schemaVersion: 1,
      kind: 'CLOUDFLARE_DELIVERY_LIVE_VERIFY',
      status: 'ERROR',
      errorCode: boundedErrorCode(error),
      publicBaseUrl: policy.publicBaseUrl,
    });
    throw error;
  }
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${boundedErrorCode(error)}\n`);
    process.exitCode = 1;
  });
}
