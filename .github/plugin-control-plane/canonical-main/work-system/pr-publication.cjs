'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const preflight = require('./pr-authoring-preflight.cjs');

const FIXED_REPO = 'hanmiyoo10-alt/-';
const FIXED_BASE = 'main';
const MODE = 'CANONICAL_GUARDED_PR_PUBLICATION';
const SHA40_RE = /^[0-9a-f]{40}$/;
const HEAD_RE = /^[A-Za-z0-9._/-]{1,180}$/;
const COMMAND_TIMEOUT_MS = 120000;
const MAX_OUTPUT_BYTES = 64 * 1024;

const FALSE_AUTHORITY = Object.freeze({
  mutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
  runtimeAuthorized: false,
});
class PublicationError extends Error {
  constructor(disposition, reasonCodes) {
    super(reasonCodes[0] || disposition);
    this.disposition = disposition;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function output(disposition, reasonCodes = [], extras = {}) {
  return {
    schemaVersion: 1,
    mode: MODE,
    disposition,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    ...extras,
    authority: {...FALSE_AUTHORITY},
  };
}

function validHead(head) {
  return typeof head === 'string'
    && HEAD_RE.test(head)
    && head !== FIXED_BASE
    && head !== 'HEAD'
    && !head.startsWith('/')
    && !head.endsWith('/')
    && !head.includes('//')
    && !head.includes('..')
    && !head.includes('@{')
    && !head.includes(':');
}
function parseArgs(argv = process.argv.slice(2)) {
  if (!Array.isArray(argv) || argv.length !== 10) {
    throw new PublicationError('UNKNOWN', ['ARGUMENT_SHAPE_INVALID']);
  }
  const allowed = new Set([
    '--packet', '--head', '--expected-head', '--title-file', '--body-file',
  ]);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key) || !value || Object.hasOwn(values, key)) {
      throw new PublicationError('UNKNOWN', ['ARGUMENT_UNSUPPORTED_OR_DUPLICATE']);
    }
    values[key] = value;
  }
  for (const key of allowed) {
    if (!Object.hasOwn(values, key)) {
      throw new PublicationError('UNKNOWN', ['ARGUMENT_REQUIRED']);
    }
  }
  if (!validHead(values['--head'])) {
    throw new PublicationError('UNKNOWN', ['HEAD_BRANCH_INVALID']);
  }
  if (!SHA40_RE.test(values['--expected-head'])) {
    throw new PublicationError('UNKNOWN', ['EXPECTED_HEAD_INVALID']);
  }
  return {
    packetRef: values['--packet'],
    head: values['--head'],
    expectedHead: values['--expected-head'],
    titleFile: values['--title-file'],
    bodyFile: values['--body-file'],
  };
}

function readRegularText(filePath, maxBytes, reasonCode) {
  const resolved = path.resolve(String(filePath || ''));
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch {
    throw new PublicationError('UNKNOWN', [reasonCode]);
  }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > maxBytes + 2) {
    throw new PublicationError('UNKNOWN', [reasonCode]);
  }
  return fs.readFileSync(resolved, 'utf8').replace(/\r\n/g, '\n');
}

function publicationPayload(args) {
  const title = readRegularText(
    args.titleFile, preflight.MAX_TITLE_BYTES, 'TITLE_FILE_INVALID').replace(/\n$/, '');
  const body = readRegularText(
    args.bodyFile, preflight.MAX_BODY_BYTES, 'BODY_FILE_INVALID').replace(/\n$/, '');
  return {title, body};
}
function defaultRunner(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function parseCreatedPrNumber(stdout) {
  const match = String(stdout || '').match(
    /^https:\/\/github\.com\/hanmiyoo10-alt\/-\/pull\/([1-9][0-9]*)\/?$/m);
  return match ? Number(match[1]) : null;
}

function readBackPr(prNumber, runner) {
  const endpoint = 'repos/' + FIXED_REPO + '/pulls/' + prNumber;
  const result = runner('gh', ['api', endpoint]);
  if (!result || result.code !== 0) {
    throw new PublicationError('UNKNOWN', ['PR_READBACK_FAILED']);
  }
  let value;
  try {
    value = JSON.parse(result.stdout || '');
  } catch {
    throw new PublicationError('UNKNOWN', ['PR_READBACK_INVALID']);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PublicationError('UNKNOWN', ['PR_READBACK_INVALID']);
  }
  return value;
}
function publishNonClosingPr({
  packetRef, head, expectedHead, title, body,
}, {
  runner = defaultRunner,
  preflightFn = preflight.classifyNonClosingPrAuthoring,
} = {}) {
  if (!validHead(head)) return output('UNKNOWN', ['HEAD_BRANCH_INVALID'], {
    preflightDisposition: null, publicationState: 'NOT_RUN',
  });
  if (!SHA40_RE.test(String(expectedHead || ''))) {
    return output('UNKNOWN', ['EXPECTED_HEAD_INVALID'], {
      preflightDisposition: null, publicationState: 'NOT_RUN',
    });
  }

  const checked = preflightFn({packetRef, title, body});
  if (!checked || checked.disposition !== 'PASS') {
    const disposition = ['BLOCKED', 'UNKNOWN', 'CONFLICT'].includes(checked?.disposition)
      ? checked.disposition : 'UNKNOWN';
    return output(disposition, checked?.reasonCodes || ['PR_AUTHORING_PREFLIGHT_INVALID'], {
      preflightDisposition: checked?.disposition || 'UNKNOWN',
      publicationState: 'NOT_RUN',
    });
  }

  const created = runner('gh', [
    'pr', 'create',
    '--repo', FIXED_REPO,
    '--base', FIXED_BASE,
    '--head', head,
    '--title', title,
    '--body', body,
  ]);
  if (!created || created.code !== 0) {
    return output('UNKNOWN', ['PR_CREATE_UNPROVEN'], {
      preflightDisposition: 'PASS',
      publicationState: 'UNKNOWN',
    });
  }

  const prNumber = parseCreatedPrNumber(created.stdout);
  if (!prNumber) {
    return output('UNKNOWN', ['PR_CREATE_IDENTITY_UNKNOWN'], {
      preflightDisposition: 'PASS',
      publicationState: 'UNKNOWN',
    });
  }

  let pr;
  try {
    pr = readBackPr(prNumber, runner);
  } catch (error) {
    if (error instanceof PublicationError) {
      return output(error.disposition, error.reasonCodes, {
        preflightDisposition: 'PASS',
        publicationState: 'CREATED_UNVERIFIED',
        prNumber,
      });
    }
    return output('UNKNOWN', ['PR_READBACK_FAILED'], {
      preflightDisposition: 'PASS',
      publicationState: 'CREATED_UNVERIFIED',
      prNumber,
    });
  }
  const exact = pr.number === prNumber
    && pr.state === 'open'
    && pr.draft === false
    && pr.title === title
    && String(pr.body ?? '') === body
    && pr.base?.ref === FIXED_BASE
    && pr.head?.ref === head
    && pr.head?.sha === expectedHead
    && pr.head?.repo?.full_name === FIXED_REPO;
  if (!exact) {
    return output('CONFLICT', ['PR_READBACK_CONFLICT'], {
      preflightDisposition: 'PASS',
      publicationState: 'CREATED',
      prNumber,
      prUrl: typeof pr.html_url === 'string' ? pr.html_url : null,
    });
  }

  return output('PASS', [], {
    preflightDisposition: 'PASS',
    publicationState: 'CREATED',
    prNumber,
    prUrl: typeof pr.html_url === 'string' ? pr.html_url : null,
    base: FIXED_BASE,
    head,
    headSha: expectedHead,
  });
}

function exitCodeFor(result) {
  if (result?.disposition === 'PASS') return 0;
  if (result?.disposition === 'BLOCKED' || result?.disposition === 'CONFLICT') return 2;
  return 3;
}
function run(argv = process.argv.slice(2), deps = {}) {
  const args = parseArgs(argv);
  const payload = publicationPayload(args);
  return publishNonClosingPr({...args, ...payload}, deps);
}

function main() {
  let result;
  try {
    result = run();
  } catch (error) {
    result = error instanceof PublicationError
      ? output(error.disposition, error.reasonCodes, {
        preflightDisposition: null,
        publicationState: 'NOT_RUN',
      })
      : output('UNKNOWN', ['PR_PUBLICATION_RUNTIME_ERROR'], {
        preflightDisposition: null,
        publicationState: 'UNKNOWN',
      });
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  COMMAND_TIMEOUT_MS,
  FALSE_AUTHORITY,
  FIXED_BASE,
  FIXED_REPO,
  HEAD_RE,
  MODE,
  PublicationError,
  defaultRunner,
  exitCodeFor,
  parseArgs,
  parseCreatedPrNumber,
  publicationPayload,
  publishNonClosingPr,
  readBackPr,
  run,
  validHead,
};
