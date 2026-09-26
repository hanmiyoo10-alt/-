'use strict';

const fs = require('node:fs');

const MAX_TITLE_BYTES = 256;
const MAX_BODY_BYTES = 16 * 1024;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const CLOSING_LINK_RE = /\b(?:close(?:s|d)?|fix(?:es|ed)?|resolve(?:s|d)?)\s*:?[ \t]*#[1-9][0-9]*\b/i;

const REASON_CODES = Object.freeze({
  INPUT_PACKET_REF_INVALID: 'INPUT_PACKET_REF_INVALID',
  INPUT_TITLE_INVALID: 'INPUT_TITLE_INVALID',
  INPUT_BODY_INVALID: 'INPUT_BODY_INVALID',
  INPUT_TEXT_TOO_LARGE: 'INPUT_TEXT_TOO_LARGE',
  NON_CLOSING_REF_REQUIRED: 'NON_CLOSING_REF_REQUIRED',
  CLOSING_LINK_FORBIDDEN: 'CLOSING_LINK_FORBIDDEN',
});

function bounded(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 240);
}

function decision(disposition, reasonCodes = [], finding = null) {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_PR_AUTHORING_PREFLIGHT',
    disposition,
    reasonCodes,
    finding,
    mutationAuthorized: false,
    publicationAuthorized: false,
  };
}

function validTitle(title) {
  return typeof title === 'string'
    && title.trim().length > 0
    && !/[\u0000-\u001f\u007f]/.test(title);
}

function validBody(body) {
  return typeof body === 'string'
    && body.trim().length > 0
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body);
}

function requiredRefPattern(packetRef) {
  const number = packetRef.slice(1);
  return new RegExp(`(?:^|\\n)[ \\t]*Refs[ \\t]+#${number}[ \\t]*(?:\\n|$)`);
}

function classifyNonClosingPrAuthoring({packetRef, title, body}) {
  if (typeof packetRef !== 'string' || !PACKET_REF_RE.test(packetRef)) {
    return decision('UNKNOWN', [REASON_CODES.INPUT_PACKET_REF_INVALID]);
  }
  if (!validTitle(title)) return decision('UNKNOWN', [REASON_CODES.INPUT_TITLE_INVALID]);
  if (!validBody(body)) return decision('UNKNOWN', [REASON_CODES.INPUT_BODY_INVALID]);
  if (Buffer.byteLength(title, 'utf8') > MAX_TITLE_BYTES
      || Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    return decision('UNKNOWN', [REASON_CODES.INPUT_TEXT_TOO_LARGE]);
  }

  const titleClosing = CLOSING_LINK_RE.exec(title);
  if (titleClosing) {
    return decision('BLOCKED', [REASON_CODES.CLOSING_LINK_FORBIDDEN], {
      field: 'title', excerpt: bounded(titleClosing[0]),
    });
  }
  const bodyClosing = CLOSING_LINK_RE.exec(body);
  if (bodyClosing) {
    return decision('BLOCKED', [REASON_CODES.CLOSING_LINK_FORBIDDEN], {
      field: 'body', excerpt: bounded(bodyClosing[0]),
    });
  }
  if (!requiredRefPattern(packetRef).test(body.replace(/\r\n/g, '\n'))) {
    return decision('BLOCKED', [REASON_CODES.NON_CLOSING_REF_REQUIRED], {
      field: 'body', excerpt: `Refs ${packetRef}`,
    });
  }

  return decision('PASS');
}

function exitCodeFor(result) {
  if (result?.disposition === 'PASS') return 0;
  if (result?.disposition === 'BLOCKED') return 2;
  return 3;
}

function parseArgs(argv) {
  if (!Array.isArray(argv) || argv.length !== 6
      || argv[0] !== '--packet' || !argv[1]
      || argv[2] !== '--title-file' || !argv[3]
      || argv[4] !== '--body-file' || !argv[5]) return null;
  return {packetRef: argv[1], titleFile: argv[3], bodyFile: argv[5]};
}

function main() {
  let result;
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args) throw new Error('invalid args');
    const title = fs.readFileSync(args.titleFile, 'utf8').replace(/\r?\n$/, '');
    const body = fs.readFileSync(args.bodyFile, 'utf8');
    result = classifyNonClosingPrAuthoring({packetRef: args.packetRef, title, body});
  } catch {
    result = decision('UNKNOWN', [REASON_CODES.INPUT_BODY_INVALID]);
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = exitCodeFor(result);
}

if (require.main === module) main();

module.exports = {
  CLOSING_LINK_RE,
  MAX_BODY_BYTES,
  MAX_TITLE_BYTES,
  REASON_CODES,
  classifyNonClosingPrAuthoring,
  exitCodeFor,
  parseArgs,
};
