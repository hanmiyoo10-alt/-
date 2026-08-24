#!/usr/bin/env node
'use strict';

const CONTROL_ISSUE_NUMBER = 197;
const PREPARE_RE = /^\/usage-dashboard prepare (release\/usage-dashboard-[A-Za-z0-9._-]+) ([0-9a-fA-F]{40}) (\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json)$/;
const READY_RE = /^\/usage-dashboard ready ([0-9a-fA-F]{40})$/;

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function singleLine(value, code) {
  const text = String(value || '').trim();
  if (!text || /[\r\n]/.test(text)) fail(code, 'multiline-or-empty');
  return text;
}

function assertControlEnvelope(issueNumber, actor, owner) {
  if (Number(issueNumber) !== CONTROL_ISSUE_NUMBER) fail('UD_CONTROL_ISSUE_DENIED', String(issueNumber || ''));
  const actorText = String(actor || '').trim();
  const ownerText = String(owner || '').trim();
  if (!actorText || actorText !== ownerText) fail('UD_CONTROL_ACTOR_DENIED', actorText || 'missing');
  return true;
}

function parsePrepareCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_PREPARE_DENIED');
  const match = PREPARE_RE.exec(text);
  if (!match) fail('UD_CONTROL_PREPARE_DENIED');
  return {
    targetBranch: match[1],
    expectedHeadSha: match[2].toLowerCase(),
    releaseSpec: match[3],
  };
}

function parseReadyCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_READY_DENIED');
  const match = READY_RE.exec(text);
  if (!match) fail('UD_CONTROL_READY_DENIED');
  return {candidateSha: match[1].toLowerCase()};
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--check-envelope') {
    assertControlEnvelope(args[0], args[1], args[2]);
    process.stdout.write('UD_CONTROL_ENVELOPE_OK');
    return;
  }
  if (command === '--prepare-target') {
    process.stdout.write(parsePrepareCommand(args.join(' ')).targetBranch);
    return;
  }
  if (command === '--prepare-sha') {
    process.stdout.write(parsePrepareCommand(args.join(' ')).expectedHeadSha);
    return;
  }
  if (command === '--prepare-spec') {
    process.stdout.write(parsePrepareCommand(args.join(' ')).releaseSpec);
    return;
  }
  if (command === '--ready-sha') {
    process.stdout.write(parseReadyCommand(args.join(' ')).candidateSha);
    return;
  }
  fail('UD_CONTROL_USAGE');
}

module.exports = {
  CONTROL_ISSUE_NUMBER,
  PREPARE_RE,
  READY_RE,
  assertControlEnvelope,
  parsePrepareCommand,
  parseReadyCommand,
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
