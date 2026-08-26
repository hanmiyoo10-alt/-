'use strict';

const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');
const { createIssueStore } = require('../infra/issue-store.cjs');
const { discoverActiveWorkRecords } = require('./active-work.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('./dispatch.cjs');
const { evaluateMutationGate } = require('./mutation-gate.cjs');

const HANDOFF_REQUEST = '<!-- repository-authoritative-handoff-request:v1 -->';
const CANONICAL_SCOPE = 'canonical-main';
const CANONICAL_CAPABILITY = 'CANONICAL_MAIN_OPERATIONS_REFRESH';
const CANONICAL_WORKFLOW = '.github/workflows/canonical-main-ops.yml';

function markerCount(body, marker = HANDOFF_REQUEST) {
  const text = typeof body === 'string' ? body : '';
  return text.split(/\r?\n/).filter((line) => line.trim() === marker).length;
}

function base(status, details = {}) {
  return {
    schemaVersion: 1,
    mode: 'AUTHORITATIVE_HANDOFF',
    status,
    workId: details.workId || null,
    targetIssueNumber: details.targetIssueNumber || null,
    receiptId: details.receiptId || null,
    targetWorkflow: details.targetWorkflow || null,
    coordinationReady: details.coordinationReady === true,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: [...new Set(details.reasonCodes || [])].sort(),
    legalNextAction: details.legalNextAction || null,
  };
}

function notRequested(targetIssueNumber, workId = null) {
  return base('AUTHORITATIVE_HANDOFF_NOT_REQUESTED', {
    targetIssueNumber,
    workId,
    reasonCodes: ['AUTHORITATIVE_HANDOFF_REQUEST_ABSENT'],
    legalNextAction: 'CONTINUE_RECEIPT_SYNC_ONLY',
  });
}

function blocked(targetIssueNumber, reasonCodes, details = {}) {
  return base('AUTHORITATIVE_HANDOFF_BLOCKED', {
    ...details,
    targetIssueNumber,
    reasonCodes,
    legalNextAction: details.legalNextAction || 'FIX_HANDOFF_EVIDENCE_AND_RETRY',
  });
}

function findCanonicalRoute(workRecord, adapterRegistry) {
  if (!workRecord || workRecord.scopeId !== CANONICAL_SCOPE || workRecord.requiredCapability !== CANONICAL_CAPABILITY) {
    return { ok: false, reasonCodes: ['AUTHORITATIVE_HANDOFF_CAPABILITY_NOT_ALLOWED'] };
  }
  const adapters = (adapterRegistry?.adapters || []).filter((adapter) =>
    adapter.supportedScopeIds?.includes(CANONICAL_SCOPE) && adapter.capabilities?.includes(CANONICAL_CAPABILITY));
  if (adapters.length !== 1) return { ok: false, reasonCodes: ['AUTHORITATIVE_HANDOFF_ADAPTER_AMBIGUOUS'] };
  const routes = (adapters[0].routes || []).filter((route) => route.capability === CANONICAL_CAPABILITY);
  if (routes.length !== 1) return { ok: false, reasonCodes: ['AUTHORITATIVE_HANDOFF_ROUTE_AMBIGUOUS'] };
  const route = routes[0];
  const valid = route.targetKind === 'GITHUB_WORKFLOW'
    && route.target === CANONICAL_WORKFLOW
    && route.executionClass === 'MUTATING'
    && route.mutationClass === 'ISSUE_RECONCILIATION'
    && route.invokePolicy === 'HANDOFF_ONLY';
  if (!valid) return { ok: false, reasonCodes: ['AUTHORITATIVE_HANDOFF_ROUTE_NOT_ALLOWED'] };
  return { ok: true, adapterId: adapters[0].adapterId, route };
}

function planAuthoritativeHandoff({ issue, workRecord, gateResult, adapterRegistry } = {}) {
  const issueNumber = Number.isInteger(issue?.number) ? issue.number : null;
  const workId = workRecord?.workId || null;
  const requests = markerCount(issue?.body);
  if (requests === 0) return notRequested(issueNumber, workId);
  if (requests !== 1) return blocked(issueNumber, ['AUTHORITATIVE_HANDOFF_REQUEST_DUPLICATE'], { workId });

  const route = findCanonicalRoute(workRecord, adapterRegistry);
  if (!route.ok) return blocked(issueNumber, route.reasonCodes, { workId });

  if (!gateResult || gateResult.status !== 'MUTATION_GATE_READY') {
    return blocked(issueNumber, [
      'AUTHORITATIVE_HANDOFF_GATE_BLOCKED',
      ...((gateResult && gateResult.reasonCodes) || []),
    ], {
      workId,
      receiptId: gateResult?.receiptId || null,
      legalNextAction: gateResult?.legalNextAction || 'REFRESH_COORDINATION_EVIDENCE_AND_RETRY',
    });
  }

  return base('AUTHORITATIVE_HANDOFF_READY', {
    targetIssueNumber: issueNumber,
    workId,
    receiptId: gateResult.receiptId,
    targetWorkflow: route.route.target,
    coordinationReady: true,
    reasonCodes: ['AUTHORITATIVE_HANDOFF_CANONICAL_ROUTE_READY'],
    legalNextAction: 'CALL_EXISTING_CANONICAL_MAIN_OPERATIONS_WITH_SAME_WORK_ISSUE',
  });
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--work-issue' || !/^[1-9]\d*$/.test(argv[1])) {
    throw new Error('usage: node authoritative-handoff.cjs --work-issue <number>');
  }
  return Number(argv[1]);
}

function exitCodeFor(result) {
  return result?.status === 'AUTHORITATIVE_HANDOFF_BLOCKED' ? 3 : 0;
}

async function run({ workIssueNumber, token, repo, root = path.resolve(__dirname, '../../../..'), fetchImpl } = {}) {
  const client = createGitHubClient({
    token: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: repo || process.env.GITHUB_REPOSITORY,
    fetchImpl,
    userAgent: 'repository-work-harness-authoritative-handoff',
  });
  const issueStore = createIssueStore(client);
  const issues = await issueStore.listIssues('open');
  const discovery = discoverActiveWorkRecords(issues);
  if (discovery.errors.length) {
    return blocked(workIssueNumber, ['AUTHORITATIVE_HANDOFF_DISCOVERY_BLOCKED', ...discovery.errors.map((entry) => entry.code)]);
  }

  const provenance = discovery.provenance.filter((entry) => entry.issueNumber === workIssueNumber);
  if (provenance.length !== 1) {
    return blocked(workIssueNumber, [provenance.length ? 'AUTHORITATIVE_HANDOFF_TARGET_AMBIGUOUS' : 'AUTHORITATIVE_HANDOFF_TARGET_NOT_ACTIVE']);
  }
  const workRecord = discovery.records.find((record) => record.workId === provenance[0].workId);
  const issue = issues.find((entry) => entry.number === workIssueNumber && !entry.pull_request && entry.state === 'open');
  if (!workRecord || !issue) return blocked(workIssueNumber, ['AUTHORITATIVE_HANDOFF_TARGET_UNRESOLVED']);

  if (markerCount(issue.body) === 0) return notRequested(workIssueNumber, workRecord.workId);

  const main = await client.api('/branches/main');
  const adapterRegistry = loadAdapterRegistry(root);
  const projectRegistry = loadProjectRegistry(root);
  const gateResult = evaluateMutationGate({
    issues,
    workIssueNumber,
    mainSha: main?.commit?.sha,
    adapterRegistry,
    projectRegistry,
  });
  return planAuthoritativeHandoff({ issue, workRecord, gateResult, adapterRegistry });
}

async function main() {
  try {
    const workIssueNumber = parseArgs();
    const result = await run({ workIssueNumber });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = exitCodeFor(result);
  } catch (error) {
    const result = blocked(null, ['AUTHORITATIVE_HANDOFF_RUNTIME_ERROR'], {
      legalNextAction: 'FIX_HANDOFF_RUNTIME_INPUT',
    });
    result.error = error && error.message ? error.message : String(error);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = {
  CANONICAL_CAPABILITY,
  CANONICAL_SCOPE,
  CANONICAL_WORKFLOW,
  HANDOFF_REQUEST,
  blocked,
  exitCodeFor,
  findCanonicalRoute,
  markerCount,
  notRequested,
  parseArgs,
  planAuthoritativeHandoff,
  run,
};
