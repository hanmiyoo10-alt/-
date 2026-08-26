'use strict';

const { createGitHubClient } = require('../infra/github-client.cjs');
const { createIssueStore } = require('../infra/issue-store.cjs');
const { discoverActiveWorkRecords } = require('./active-work.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('./dispatch.cjs');
const {
  RECEIPT_END,
  RECEIPT_START,
  issueCoordinationReceipt,
  parseReceiptMarker,
  renderReceiptMarker,
} = require('./receipt.cjs');

const RECEIPT_REQUEST = '<!-- repository-coordination-receipt-request:v1 -->';

function markerCount(body, marker) {
  const text = typeof body === 'string' ? body : '';
  return text.split(/\r?\n/).filter((line) => line.trim() === marker).length;
}

function upsertReceiptMarker(body, receipt) {
  const text = typeof body === 'string' ? body : '';
  const parsed = parseReceiptMarker(text);
  if (parsed.marked && parsed.error) {
    return { ok: false, changed: false, body: text, reasonCodes: ['RECEIPT_SYNC_EXISTING_RECEIPT_INVALID', parsed.error, ...(parsed.validationErrors || [])] };
  }

  if (parsed.receipt && parsed.receipt.receiptId === receipt.receiptId) {
    return { ok: true, changed: false, body: text, reasonCodes: ['RECEIPT_SYNC_ALREADY_CURRENT'] };
  }

  const rendered = renderReceiptMarker(receipt);
  if (!parsed.marked) {
    const separator = text.endsWith('\n') || text.length === 0 ? '\n' : '\n\n';
    return { ok: true, changed: true, body: `${text}${separator}${rendered}\n`, reasonCodes: ['RECEIPT_SYNC_INSERT'] };
  }

  const start = text.indexOf(RECEIPT_START);
  const end = text.indexOf(RECEIPT_END, start + RECEIPT_START.length);
  if (start < 0 || end < 0) {
    return { ok: false, changed: false, body: text, reasonCodes: ['RECEIPT_SYNC_REPLACE_RANGE_INVALID'] };
  }
  const after = end + RECEIPT_END.length;
  return {
    ok: true,
    changed: true,
    body: `${text.slice(0, start)}${rendered}${text.slice(after)}`,
    reasonCodes: ['RECEIPT_SYNC_REPLACE'],
  };
}

function blocked(targetIssueNumber, reasonCodes, workId = null) {
  return {
    schemaVersion: 1,
    mode: 'COORDINATION_RECEIPT_SYNC',
    status: 'RECEIPT_SYNC_BLOCKED',
    targetIssueNumber,
    workId,
    receiptId: null,
    changed: false,
    coordinationReady: false,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function planReceiptSyncForIssue({ issues, targetIssueNumber, observedRefs, adapterRegistry, projectRegistry } = {}) {
  if (!Number.isInteger(targetIssueNumber) || targetIssueNumber <= 0) return blocked(targetIssueNumber ?? null, ['RECEIPT_SYNC_TARGET_ISSUE_INVALID']);
  const openIssues = Array.isArray(issues) ? issues : [];
  const discovery = discoverActiveWorkRecords(openIssues);
  if (discovery.errors.length) return blocked(targetIssueNumber, ['RECEIPT_SYNC_DISCOVERY_BLOCKED', ...discovery.errors.map((entry) => entry.code)]);

  const sources = discovery.provenance.filter((entry) => entry.issueNumber === targetIssueNumber);
  if (sources.length !== 1) return blocked(targetIssueNumber, [sources.length ? 'RECEIPT_SYNC_TARGET_AMBIGUOUS' : 'RECEIPT_SYNC_TARGET_NOT_ACTIVE']);
  const source = sources[0];
  const workRecord = discovery.records.find((record) => record.workId === source.workId);
  const issue = openIssues.find((entry) => entry.number === targetIssueNumber && !entry.pull_request && entry.state === 'open');
  if (!workRecord || !issue) return blocked(targetIssueNumber, ['RECEIPT_SYNC_TARGET_UNRESOLVED'], source.workId || null);

  const requests = markerCount(issue.body, RECEIPT_REQUEST);
  if (requests !== 1) return blocked(targetIssueNumber, [requests === 0 ? 'RECEIPT_SYNC_REQUEST_MISSING' : 'RECEIPT_SYNC_REQUEST_DUPLICATE'], workRecord.workId);

  const existing = parseReceiptMarker(issue.body);
  if (existing.marked && existing.error) {
    return blocked(targetIssueNumber, ['RECEIPT_SYNC_EXISTING_RECEIPT_INVALID', existing.error, ...(existing.validationErrors || [])], workRecord.workId);
  }

  const issuance = issueCoordinationReceipt(workRecord, discovery.records, observedRefs, adapterRegistry, projectRegistry);
  if (issuance.status !== 'RECEIPT_ISSUED' || !issuance.receipt) {
    return blocked(targetIssueNumber, ['RECEIPT_SYNC_ISSUANCE_BLOCKED', ...(issuance.reasonCodes || [])], workRecord.workId);
  }

  const upsert = upsertReceiptMarker(issue.body, issuance.receipt);
  if (!upsert.ok) return blocked(targetIssueNumber, upsert.reasonCodes, workRecord.workId);

  return {
    schemaVersion: 1,
    mode: 'COORDINATION_RECEIPT_SYNC',
    status: upsert.changed ? 'RECEIPT_SYNC_READY' : 'RECEIPT_SYNC_NOOP',
    targetIssueNumber,
    workId: workRecord.workId,
    receiptId: issuance.receipt.receiptId,
    changed: upsert.changed,
    updatedBody: upsert.body,
    coordinationReady: true,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: [...new Set(upsert.reasonCodes)].sort(),
  };
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const index = args.indexOf('--work-issue');
  if (index < 0 || !/^\d+$/.test(args[index + 1] || '')) return null;
  const issueNumber = Number(args[index + 1]);
  return Number.isSafeInteger(issueNumber) && issueNumber > 0 ? issueNumber : null;
}

function publicResult(plan, status = plan.status) {
  return {
    schemaVersion: plan.schemaVersion,
    mode: plan.mode,
    status,
    targetIssueNumber: plan.targetIssueNumber,
    workId: plan.workId,
    receiptId: plan.receiptId,
    changed: plan.changed,
    coordinationReady: plan.coordinationReady,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: plan.reasonCodes,
  };
}

async function run({ argv = process.argv.slice(2), env = process.env } = {}) {
  const targetIssueNumber = parseArgs(argv);
  if (!targetIssueNumber) {
    const result = blocked(null, ['RECEIPT_SYNC_ARGUMENT_REQUIRED']);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 2;
  }

  const client = createGitHubClient({ token: env.GH_TOKEN || env.GITHUB_TOKEN, repo: env.GITHUB_REPOSITORY, userAgent: 'canonical-main-work-harness-receipt-sync' });
  const issueStore = createIssueStore(client);
  const issues = await issueStore.listIssues('open');
  const main = await client.api('/branches/main');
  const observedRefs = { main: main && main.commit && main.commit.sha };
  const plan = planReceiptSyncForIssue({
    issues,
    targetIssueNumber,
    observedRefs,
    adapterRegistry: loadAdapterRegistry(process.cwd()),
    projectRegistry: loadProjectRegistry(process.cwd()),
  });

  if (plan.status === 'RECEIPT_SYNC_BLOCKED') {
    process.stdout.write(`${JSON.stringify(publicResult(plan), null, 2)}\n`);
    return 2;
  }

  if (plan.changed) await issueStore.updateIssue(targetIssueNumber, { body: plan.updatedBody });
  const status = plan.changed ? 'RECEIPT_SYNC_UPDATED' : 'RECEIPT_SYNC_NOOP';
  process.stdout.write(`${JSON.stringify(publicResult(plan, status), null, 2)}\n`);
  return 0;
}

if (require.main === module) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`receipt-sync fatal: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  RECEIPT_REQUEST,
  markerCount,
  parseArgs,
  planReceiptSyncForIssue,
  publicResult,
  run,
  upsertReceiptMarker,
};
