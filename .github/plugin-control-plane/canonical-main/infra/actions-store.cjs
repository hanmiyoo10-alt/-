'use strict';

const WORKFLOW_RUN_EVENTS = new Set([
  'branch_protection_rule',
  'check_run',
  'check_suite',
  'create',
  'delete',
  'deployment',
  'deployment_status',
  'discussion',
  'discussion_comment',
  'fork',
  'gollum',
  'issue_comment',
  'issues',
  'label',
  'merge_group',
  'milestone',
  'page_build',
  'project',
  'project_card',
  'project_column',
  'public',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'pull_request_target',
  'push',
  'registry_package',
  'release',
  'repository_dispatch',
  'schedule',
  'status',
  'watch',
  'workflow_call',
  'workflow_dispatch',
  'workflow_run',
]);

function workflowRunsPath(workflow, {perPage = 50, headSha = null, event = null, status = null} = {}) {
  if (typeof workflow !== 'string' || !workflow.trim()) {
    throw new TypeError('workflow must be a non-empty string');
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    throw new RangeError('perPage must be an integer from 1 to 100');
  }
  if (headSha !== null && !/^[0-9a-f]{40}$/.test(String(headSha))) {
    throw new TypeError('headSha must be a full lowercase SHA-1 object id');
  }
  if (event !== null && !WORKFLOW_RUN_EVENTS.has(String(event))) {
    throw new TypeError('event is not a supported workflow-run event');
  }
  if (status !== null && !['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending'].includes(String(status))) {
    throw new TypeError('status is not a supported workflow-run status');
  }

  const params = new URLSearchParams();
  params.set('per_page', String(perPage));
  if (headSha !== null) params.set('head_sha', String(headSha));
  if (event !== null) params.set('event', String(event));
  if (status !== null) params.set('status', String(status));
  return `/actions/workflows/${encodeURIComponent(workflow)}/runs?${params.toString()}`;
}

function createActionsStore(client) {
  async function workflowRuns(workflow, perPage = 50) {
    const row = await client.api(workflowRunsPath(workflow, {perPage}));
    return row.workflow_runs || [];
  }
  async function workflowRunsFiltered(workflow, filters = {}) {
    const row = await client.api(workflowRunsPath(workflow, filters));
    return row.workflow_runs || [];
  }
  async function workflowJobs(runId) {
    const row = await client.api(`/actions/runs/${runId}/jobs?per_page=100`);
    return row.jobs || [];
  }
  async function jobLogText(jobId) {
    try { return await client.fetchText(`/actions/jobs/${jobId}/logs`); } catch (_) { return ''; }
  }
  return {workflowRuns, workflowRunsFiltered, workflowJobs, jobLogText};
}

module.exports = {createActionsStore, workflowRunsPath};
