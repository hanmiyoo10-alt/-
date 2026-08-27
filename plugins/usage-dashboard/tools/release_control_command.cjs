#!/usr/bin/env node
'use strict';

const CONTROL_ISSUE_NUMBER = 197;
const PREPARE_RE = /^\/usage-dashboard prepare (release\/usage-dashboard-[A-Za-z0-9._-]+) ([0-9a-fA-F]{40}) (\.github\/usage-dashboard\/releases\/[A-Za-z0-9._-]+\.json)(?: ([1-9]\d*))?$/;
const READY_RE = /^\/usage-dashboard ready ([0-9a-fA-F]{40})$/;
const READY_BRANCH_RE = /^\/usage-dashboard ready-branch (release\/usage-dashboard-[A-Za-z0-9._-]+)$/;
const STAGE_RE = /^\/usage-dashboard stage (release\/usage-dashboard-[A-Za-z0-9._-]+)$/;
const STAGE_ISSUE_TITLE_RE = /^\[usage-dashboard-stage\] (release\/usage-dashboard-[A-Za-z0-9._-]+)$/;
const VALIDATE_RE = /^\/usage-dashboard validate ([1-9]\d*) ([0-9a-fA-F]{40})$/;

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

function assertStageIssueEnvelope(actor, issueAuthor, owner) {
  const actorText = String(actor || '').trim();
  const authorText = String(issueAuthor || '').trim();
  const ownerText = String(owner || '').trim();
  if (!ownerText || actorText !== ownerText) fail('UD_STAGE_ISSUE_ACTOR_DENIED', actorText || 'missing');
  if (authorText !== ownerText) fail('UD_STAGE_ISSUE_AUTHOR_DENIED', authorText || 'missing');
  return true;
}

function parsePrepareCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_PREPARE_DENIED');
  const match = PREPARE_RE.exec(text);
  if (!match) fail('UD_CONTROL_PREPARE_DENIED');
  const parsed = {
    targetBranch: match[1],
    expectedHeadSha: match[2].toLowerCase(),
    releaseSpec: match[3],
  };
  if (match[4]) parsed.coordinationWorkIssue = Number(match[4]);
  return parsed;
}

function parseReadyCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_READY_DENIED');
  const match = READY_RE.exec(text);
  if (!match) fail('UD_CONTROL_READY_DENIED');
  return {candidateSha: match[1].toLowerCase()};
}

function parseReadyBranchCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_READY_BRANCH_DENIED');
  const match = READY_BRANCH_RE.exec(text);
  if (!match) fail('UD_CONTROL_READY_BRANCH_DENIED');
  return {candidateBranch: match[1]};
}

function parseStageCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_STAGE_DENIED');
  const match = STAGE_RE.exec(text);
  if (!match) fail('UD_CONTROL_STAGE_DENIED');
  return {candidateBranch: match[1]};
}

function parseStageIssueTitle(value) {
  const text = singleLine(value, 'UD_STAGE_ISSUE_TITLE_DENIED');
  const match = STAGE_ISSUE_TITLE_RE.exec(text);
  if (!match) fail('UD_STAGE_ISSUE_TITLE_DENIED');
  return {candidateBranch: match[1]};
}

function parseValidateCommand(value) {
  const text = singleLine(value, 'UD_CONTROL_VALIDATE_DENIED');
  const match = VALIDATE_RE.exec(text);
  if (!match) fail('UD_CONTROL_VALIDATE_DENIED');
  return {prNumber:Number(match[1]), candidateSha:match[2].toLowerCase()};
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--check-envelope') {
    assertControlEnvelope(args[0], args[1], args[2]);
    process.stdout.write('UD_CONTROL_ENVELOPE_OK');
    return;
  }
  if (command === '--check-stage-issue-envelope') {
    assertStageIssueEnvelope(args[0], args[1], args[2]);
    process.stdout.write('UD_STAGE_ISSUE_ENVELOPE_OK');
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
  if (command === '--prepare-work-issue') {
    const parsed = parsePrepareCommand(args.join(' '));
    process.stdout.write(parsed.coordinationWorkIssue ? String(parsed.coordinationWorkIssue) : '');
    return;
  }
  if (command === '--ready-sha') {
    process.stdout.write(parseReadyCommand(args.join(' ')).candidateSha);
    return;
  }
  if (command === '--ready-branch') {
    process.stdout.write(parseReadyBranchCommand(args.join(' ')).candidateBranch);
    return;
  }
  if (command === '--stage-branch') {
    process.stdout.write(parseStageCommand(args.join(' ')).candidateBranch);
    return;
  }
  if (command === '--stage-issue-branch') {
    process.stdout.write(parseStageIssueTitle(args.join(' ')).candidateBranch);
    return;
  }
  if (command === '--validate-pr') {
    process.stdout.write(String(parseValidateCommand(args.join(' ')).prNumber));
    return;
  }
  if (command === '--validate-sha') {
    process.stdout.write(parseValidateCommand(args.join(' ')).candidateSha);
    return;
  }
  fail('UD_CONTROL_USAGE');
}

module.exports = {
  CONTROL_ISSUE_NUMBER,
  PREPARE_RE,
  READY_RE,
  READY_BRANCH_RE,
  STAGE_RE,
  STAGE_ISSUE_TITLE_RE,
  VALIDATE_RE,
  assertControlEnvelope,
  assertStageIssueEnvelope,
  parsePrepareCommand,
  parseReadyCommand,
  parseReadyBranchCommand,
  parseStageCommand,
  parseStageIssueTitle,
  parseValidateCommand,
};

if (require.main === module) {
  try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
