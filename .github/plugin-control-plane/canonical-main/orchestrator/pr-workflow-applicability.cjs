'use strict';

const {execFileSync} = require('child_process');
const path = require('path');
const {readGitHubCliJson} = require('../infra/github-cli-read.cjs');

const DISPOSITIONS = new Set([
  'RAN',
  'EXPECTED_NO_RUN_PATH_FILTER',
  'TRIGGER_NOT_APPLICABLE',
  'BLOCKED_CAPABILITY',
  'MISSING_UNEXPECTED',
  'UNKNOWN',
]);
const PLUGIN_WORKFLOW = '.github/workflows/plugin-control-plane-ci.yml';
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const EXACT_SHA_OWNER_SCRIPT = [
  'import json, os, sys',
  "sys.path.insert(0, os.path.join(os.getcwd(), 'tools', 'repo-ci-mcp'))",
  'from repo_ci_mcp.exact_sha import repo_ci_exact_sha',
  'from repo_ci_mcp.github_reader import GitHubReader',
  'reader = GitHubReader(repository=sys.argv[1])',
  'result = repo_ci_exact_sha(reader, sha=sys.argv[2], workflow=sys.argv[3], event=sys.argv[4], ref=sys.argv[5] or None, before_sha=sys.argv[6] or None, workflow_ref=sys.argv[7] or None)',
  'print(json.dumps(result, separators=(\",\", \":\")))',
].join('; ');

function boundedReasonCodes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && /^[A-Z0-9_]{1,100}$/.test(item))
    .slice(0, 20);
}

function boundedSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : undefined;
}

function exactShaWorkflowApplicability(input, execFile = execFileSync) {
  const repo = String(input?.repo || '');
  const sha = String(input?.sha || '');
  const workflow = String(input?.workflow || '');
  const event = String(input?.event || '');
  const ref = String(input?.ref || '');
  const beforeSha = String(input?.beforeSha || '');
  const workflowRef = String(input?.workflowRef || '');
  try {
    const env = {...process.env, REPO_CI_GITHUB_REPO: repo};
    const token = process.env.GH_TOKEN || process.env.REPO_CI_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
    if (token) env.REPO_CI_GITHUB_TOKEN = token;
    const output = execFile(
      'python3',
      ['-c', EXACT_SHA_OWNER_SCRIPT, repo, sha, workflow, event, ref, beforeSha, workflowRef],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        env,
        maxBuffer: 512 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 30000,
      },
    );
    const raw = JSON.parse(String(output || ''));
    const disposition = DISPOSITIONS.has(raw?.disposition) ? raw.disposition : 'UNKNOWN';
    const evidence = raw?.evidence && typeof raw.evidence === 'object' ? raw.evidence : {};
    return {
      disposition,
      reasonCodes: boundedReasonCodes(raw?.reason_codes),
      inventoryComplete: raw?.inventory_complete === true,
      evidence: {
        workflowBlobSha: boundedSha(evidence.workflow_blob_sha),
        beforeSha: boundedSha(evidence.before_sha),
        workflowRef: boundedSha(evidence.workflow_ref),
        changedPathCount: Number.isInteger(evidence.changed_path_count) && evidence.changed_path_count >= 0 && evidence.changed_path_count <= 300
          ? evidence.changed_path_count
          : undefined,
      },
    };
  } catch {
    return {disposition: 'UNKNOWN', reasonCodes: ['EXACT_SHA_OWNER_INVOKE_FAILED'], inventoryComplete: false, evidence: {}};
  }
}

function resolveMergeBase(repo, baseSha, headSha, readFailures = null, readJson = readGitHubCliJson) {
  const base = boundedSha(baseSha);
  const head = boundedSha(headSha);
  if (!base || !head) return null;
  const result = readJson(['--method', 'GET', `repos/${repo}/compare/${base}...${head}`]);
  if (result?.failure && Array.isArray(readFailures)) readFailures.push(result.failure);
  return boundedSha(result?.value?.merge_base_commit?.sha);
}

function pluginWorkflowEvidence(
  repo, pr, targetSha, readFailures, workflowEvidence,
  classify = exactShaWorkflowApplicability, mergeBaseReader = resolveMergeBase,
) {
  if (!pr?.headSha) return {};
  if (typeof workflowEvidence !== 'function') throw new TypeError('workflowEvidence reader required');
  const direct = workflowEvidence(repo, 'plugin-control-plane-ci.yml', pr.headSha, 'pull_request', false, readFailures);
  if (direct) return {...direct, applicability: 'RAN', reasonCodes: []};
  if (!pr.baseSha || !pr.baseRef || !boundedSha(targetSha)) {
    return {applicability: 'UNKNOWN', reasonCodes: ['PR_BASE_IDENTITY_UNKNOWN'], inventoryComplete: false, applicabilityEvidence: {}};
  }
  const mergeBaseSha = mergeBaseReader(repo, pr.baseSha, pr.headSha, readFailures);
  if (!mergeBaseSha) {
    return {applicability: 'UNKNOWN', reasonCodes: ['PR_MERGE_BASE_UNKNOWN'], inventoryComplete: false, applicabilityEvidence: {}};
  }
  const result = classify({repo, sha: pr.headSha, workflow: PLUGIN_WORKFLOW, event: 'pull_request', ref: pr.baseRef, beforeSha: mergeBaseSha, workflowRef: targetSha});
  return {
    applicability: result.disposition,
    reasonCodes: result.reasonCodes,
    inventoryComplete: result.inventoryComplete,
    applicabilityEvidence: result.evidence,
  };
}

module.exports = {exactShaWorkflowApplicability, pluginWorkflowEvidence, resolveMergeBase};
