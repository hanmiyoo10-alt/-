'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const childProcess = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const operator = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'));
const lease = require(path.join(ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const packetProjection = require(path.join(ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));

const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const PACKET_RE = /^#([1-9][0-9]*)$/;
const MAX_BODY_BYTES = 256 * 1024;
const AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function receipt(status, reasonCodes = [], extras = {}) {
  return {
    schemaVersion: 1,
    mode: 'MCL_EXACT_ISSUE_BODY',
    status,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    ...extras,
    authority: {...AUTHORITY},
  };
}

function digest(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function defaultRunner(args) {
  const result = childProcess.spawnSync('gh', args, {encoding: 'utf8', shell: false});
  return {code: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || ''};
}

function packetNumber(packetRef) {
  const match = PACKET_RE.exec(packetRef || '');
  return match ? Number(match[1]) : null;
}

function verifyIssue(issue, number) {
  if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
    return {ok: false, reasonCodes: ['ISSUE_RESPONSE_INVALID']};
  }
  if (issue.number !== undefined && issue.number !== number) {
    return {ok: false, reasonCodes: ['ISSUE_IDENTITY_CONFLICT']};
  }
  if (issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    return {ok: false, reasonCodes: ['ISSUE_NOT_OPEN_CANONICAL_BODY']};
  }
  const bytes = Buffer.from(issue.body, 'utf8');
  if (bytes.length > MAX_BODY_BYTES) {
    return {ok: false, reasonCodes: ['ISSUE_BODY_TOO_LARGE']};
  }
  return {ok: true, body: issue.body, bytes, reasonCodes: []};
}

async function readExact({kind, packetRef = null, client}) {
  if (!client || typeof client.api !== 'function') {
    return {receipt: receipt('UNKNOWN', ['GITHUB_CLIENT_REQUIRED']), bytes: null};
  }
  let number;
  let ref;
  if (kind === 'ledger') {
    number = LEDGER_ISSUE;
    ref = '#2352';
  } else if (kind === 'packet') {
    number = packetNumber(packetRef);
    if (!number || number === LEDGER_ISSUE) {
      return {receipt: receipt('BLOCKED', ['PACKET_REF_INVALID']), bytes: null};
    }
    ref = '#' + number;
  } else {
    return {receipt: receipt('BLOCKED', ['KIND_UNSUPPORTED']), bytes: null};
  }

  let issue;
  try {
    issue = await client.api('/issues/' + number);
  } catch {
    return {receipt: receipt('UNKNOWN', ['ISSUE_READ_FAILED'], {kind, ref}), bytes: null};
  }
  const verified = verifyIssue(issue, number);
  if (!verified.ok) {
    return {receipt: receipt('BLOCKED', verified.reasonCodes, {kind, ref}), bytes: null};
  }

  if (kind === 'ledger') {
    const parsed = lease.parseLedger(verified.body);
    if (!parsed.ok) {
      return {receipt: receipt('BLOCKED', ['LEDGER_BODY_INVALID', ...parsed.reasonCodes], {kind, ref}), bytes: null};
    }
  } else {
    const projection = packetProjection.classifyPacketProjection(verified.body);
    if (projection.disposition === 'CONFLICT') {
      return {receipt: receipt('CONFLICT', projection.reasonCodes, {kind, ref}), bytes: null};
    }
    if (projection.disposition !== 'PASS') {
      return {receipt: receipt('UNKNOWN', projection.reasonCodes, {kind, ref}), bytes: null};
    }
    if (['DONE', 'CANCELLED', 'SUPERSEDED'].includes(projection.lifecycle)) {
      return {receipt: receipt('BLOCKED', ['PACKET_TERMINAL'], {kind, ref}), bytes: null};
    }
  }

  return {
    receipt: receipt('READY', [], {
      kind,
      ref,
      utf8Bytes: verified.bytes.length,
      sha256: digest(verified.bytes),
      exactBodyMaterializationAuthorized: true,
    }),
    bytes: verified.bytes,
  };
}

function writeExact(fd, bytes) {
  if (!Buffer.isBuffer(bytes)) throw new Error('EXACT_BYTES_REQUIRED');
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
    if (!Number.isInteger(written) || written <= 0) throw new Error('EXACT_BODY_WRITE_FAILED');
    offset += written;
  }
  return offset;
}

function parseCli(argv) {
  const args = [...argv];
  const kind = args.shift();
  if (!['ledger', 'packet'].includes(kind)) throw new Error('COMMAND_UNSUPPORTED');
  let packetRef = null;
  if (kind === 'packet') {
    if (args.length !== 2 || args[0] !== '--packet') throw new Error('ARGUMENT_INVALID');
    packetRef = args[1];
  } else if (args.length) {
    throw new Error('ARGUMENT_INVALID');
  }
  return {kind, packetRef};
}

async function runCli(argv = process.argv.slice(2), env = process.env, options = {}) {
  let input;
  try {
    input = parseCli(argv);
  } catch (error) {
    return {code: 2, text: JSON.stringify(receipt('BLOCKED', [String(error.message || error)])) + '\n'};
  }
  const runner = options.runner || defaultRunner;
  const client = options.client || operator.createOperatorGitHubClient({
    repo: REPO, env, runner, fetchImpl: options.fetchImpl,
  });
  const result = await readExact({...input, client});
  if (result.receipt.status !== 'READY') {
    return {code: 2, text: JSON.stringify(result.receipt) + '\n'};
  }
  const fd = options.fd ?? 3;
  try {
    writeExact(fd, result.bytes);
  } catch {
    return {code: 2, text: JSON.stringify(receipt('UNKNOWN', ['EXACT_BODY_WRITE_FAILED'], {
      kind: result.receipt.kind, ref: result.receipt.ref,
    })) + '\n'};
  }
  return {
    code: 0,
    text: JSON.stringify({...result.receipt, status: 'PASS', bytesWritten: result.bytes.length}) + '\n',
  };
}

if (require.main === module) {
  runCli().then(({code, text}) => {
    process.stdout.write(text);
    process.exitCode = code;
  }).catch(() => {
    process.stdout.write(JSON.stringify(receipt('UNKNOWN', ['UNEXPECTED_FAILURE'])) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  AUTHORITY,
  LEDGER_ISSUE,
  MAX_BODY_BYTES,
  REPO,
  digest,
  packetNumber,
  parseCli,
  readExact,
  receipt,
  runCli,
  verifyIssue,
  writeExact,
};
