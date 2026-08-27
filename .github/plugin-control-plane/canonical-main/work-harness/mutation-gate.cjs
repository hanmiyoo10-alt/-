'use strict';

const path = require('node:path');
const { createGitHubClient } = require('../infra/github-client.cjs');
const { createIssueStore } = require('../infra/issue-store.cjs');
const { discoverActiveWorkRecords } = require('./active-work.cjs');
const { loadAdapterRegistry, loadProjectRegistry } = require('./dispatch.cjs');
const { observeExpectedBranchRefs } = require('./expected-ref-observer.cjs');
const { validateMutationBoundary } = require('./mutation-boundary.cjs');
const { parseReceiptMarker } = require('./receipt.cjs');

function blocked(reasonCodes, legalNextAction = 'FIX_COORDINATION_EVIDENCE_AND_RETRY', details = {}) {
  return {
    ...details,
    schemaVersion: 1,
    mode: 'MUTATION_GATE',
    status: 'MUTATION_GATE_BLOCKED',
    coordinationReady: false,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    legalNextAction,
  };
}

function exitCodeFor(result) {
  return result && result.status === 'MUTATION_GATE_READY' ? 0 : 3;
}

function targetWork(discovery, issueNumber) {
  const provenance = Array.isArray(discovery?.provenance) ? discovery.provenance : [];
  const matches = provenance.filter((entry) => entry.issueNumber === issueNumber);
  if (matches.length !== 1) {
    return {
      ok: false,
      reasonCodes: [matches.length ? 'MUTATION_GATE_TARGET_WORK_AMBIGUOUS' : 'MUTATION_GATE_TARGET_WORK_NOT_ACTIVE'],
    };
  }
  const recordMatches = (discovery.records || []).filter((record) => record.workId === matches[0].workId);
  if (recordMatches.length !== 1) {
    return { ok: false, reasonCodes: ['MUTATION_GATE_TARGET_WORK_UNRESOLVED'] };
  }
  return { ok: true, record: recordMatches[0], provenance: matches[0] };
}

function evaluateMutationGate({ issues, workIssueNumber, mainSha, observedRefs, adapterRegistry, projectRegistry } = {}) {
  if (!Number.isInteger(workIssueNumber) || workIssueNumber < 1) {
    return blocked(['MUTATION_GATE_WORK_ISSUE_INVALID'], 'SUPPLY_ACTIVE_WORK_ISSUE_NUMBER');
  }
  if (typeof mainSha !== 'string' || !mainSha) {
    return blocked(['MUTATION_GATE_MAIN_SHA_INVALID'], 'REFRESH_CURRENT_MAIN');
  }

  const discovery = discoverActiveWorkRecords(issues);
  if (discovery.errors.length) {
    return blocked(
      ['MUTATION_GATE_DISCOVERY_BLOCKED', ...discovery.errors.map((entry) => entry.code)],
      'FIX_ACTIVE_WORK_DISCOVERY',
      { discovery },
    );
  }

  const target = targetWork(discovery, workIssueNumber);
  if (!target.ok) return blocked(target.reasonCodes, 'SELECT_ONE_ACTIVE_WORK_ISSUE', { discovery });

  const issueMatches = (Array.isArray(issues) ? issues : []).filter((issue) => issue.number === workIssueNumber && !issue.pull_request && issue.state === 'open');
  if (issueMatches.length !== 1) {
    return blocked(['MUTATION_GATE_TARGET_ISSUE_UNRESOLVED'], 'REFRESH_ACTIVE_WORK_ISSUE', { discovery, workId: target.record.workId });
  }

  const parsed = parseReceiptMarker(issueMatches[0].body);
  if (!parsed.marked) {
    return blocked(['MUTATION_GATE_RECEIPT_REQUIRED'], 'ISSUE_FRESH_COORDINATION_RECEIPT', { discovery, workId: target.record.workId });
  }
  if (parsed.error) {
    return blocked(
      ['MUTATION_GATE_RECEIPT_INVALID', parsed.error, ...(parsed.validationErrors || [])],
      'REISSUE_VALID_COORDINATION_RECEIPT',
      { discovery, workId: target.record.workId },
    );
  }

  const refs = observedRefs && typeof observedRefs === 'object' && !Array.isArray(observedRefs)
    ? observedRefs
    : { main: mainSha };
  const boundary = validateMutationBoundary(
    target.record,
    discovery.records,
    refs,
    adapterRegistry,
    projectRegistry,
    parsed.receipt,
  );

  if (boundary.status !== 'MUTATION_BOUNDARY_READY') {
    return blocked(
      ['MUTATION_GATE_BOUNDARY_BLOCKED', ...(boundary.reasonCodes || [])],
      boundary.legalNextAction || 'RECOMPUTE_COORDINATION_RECEIPT_AND_REVALIDATE',
      { discovery, workId: target.record.workId, receiptId: parsed.receipt.receiptId, boundary },
    );
  }

  return {
    schemaVersion: 1,
    mode: 'MUTATION_GATE',
    status: 'MUTATION_GATE_READY',
    workId: target.record.workId,
    issueNumber: workIssueNumber,
    receiptId: parsed.receipt.receiptId,
    observedMain: mainSha,
    coordinationReady: true,
    mutationAuthorized: false,
    executionAuthorized: false,
    reasonCodes: ['MUTATION_GATE_COORDINATION_READY', ...(boundary.reasonCodes || [])].sort(),
    legalNextAction: boundary.legalNextAction,
    boundary,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 2 || argv[0] !== '--work-issue' || !/^\d+$/.test(argv[1])) {
    throw new Error('usage: node mutation-gate.cjs --work-issue <number>');
  }
  return { workIssueNumber: Number(argv[1]) };
}

function mutationObservationReason(code) {
  if (code.startsWith('EXPECTED_REF_OBSERVER_REF_INVALID:')) {
    return `MUTATION_GATE_OBSERVED_BRANCH_REF_INVALID:${code.slice('EXPECTED_REF_OBSERVER_REF_INVALID:'.length)}`;
  }
  if (code.startsWith('EXPECTED_REF_OBSERVER_READ_FAILED:')) {
    return `MUTATION_GATE_OBSERVED_BRANCH_READ_FAILED:${code.slice('EXPECTED_REF_OBSERVER_READ_FAILED:'.length)}`;
  }
  return `MUTATION_GATE_OBSERVED_BRANCH_UNKNOWN:${code}`;
}

async function run({ token, repo, root = path.resolve(__dirname, '../../../..'), workIssueNumber, fetchImpl } = {}) {
  const client = createGitHubClient({
    token: token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: repo || process.env.GITHUB_REPOSITORY,
    fetchImpl,
    userAgent: 'repository-work-harness-mutation-gate',
  });
  const issueStore = createIssueStore(client);
  const issues = await issueStore.listIssues('open');
  const branch = await client.api('/branches/main');
  const mainSha = branch?.commit?.sha;

  const discovery = discoverActiveWorkRecords(issues);
  if (!discovery.errors.length) {
    const target = targetWork(discovery, workIssueNumber);
    if (target.ok) {
      const observation = await observeExpectedBranchRefs({ client, workRecord: target.record, mainSha });
      if (observation.reasonCodes.length) {
        return blocked(
          observation.reasonCodes.map(mutationObservationReason),
          'REFRESH_EXPECTED_BRANCH_EVIDENCE',
          { workId: target.record.workId },
        );
      }
      return evaluateMutationGate({
        issues,
        workIssueNumber,
        mainSha,
        observedRefs: observation.observedRefs,
        adapterRegistry: loadAdapterRegistry(root),
        projectRegistry: loadProjectRegistry(root),
      });
    }
  }

  return evaluateMutationGate({
    issues,
    workIssueNumber,
    mainSha,
    adapterRegistry: loadAdapterRegistry(root),
    projectRegistry: loadProjectRegistry(root),
  });
}

async function main() {
  try {
    const args = parseArgs();
    const result = await run(args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = exitCodeFor(result);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(blocked(['MUTATION_GATE_RUNTIME_ERROR'], 'FIX_GATE_RUNTIME_INPUT', {
      error: error && error.message ? error.message : String(error),
    }), null, 2)}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = { blocked, evaluateMutationGate, exitCodeFor, main, mutationObservationReason, parseArgs, run, targetWork };
