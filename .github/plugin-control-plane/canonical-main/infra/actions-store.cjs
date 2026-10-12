'use strict';

function workflowRunsForPushHeadPath(workflow, headSha, perPage = 100) {
  if (typeof workflow !== 'string' || !workflow.trim()) {
    throw new TypeError('workflow must be a non-empty string');
  }
  if (!/^[0-9a-f]{40}$/.test(String(headSha || ''))) {
    throw new TypeError('headSha must be a full lowercase SHA-1 object id');
  }
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) {
    throw new RangeError('perPage must be an integer from 1 to 100');
  }

  const params = new URLSearchParams();
  params.set('per_page', String(perPage));
  params.set('head_sha', String(headSha));
  params.set('event', 'push');
  return `/actions/workflows/${encodeURIComponent(workflow)}/runs?${params.toString()}`;
}

function createActionsStore(client) {
  async function workflowRuns(workflow, perPage = 50) {
    const row = await client.api(`/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${perPage}`);
    return row.workflow_runs || [];
  }
  async function workflowRunsForPushHead(workflow, headSha, perPage = 100) {
    const row = await client.api(workflowRunsForPushHeadPath(workflow, headSha, perPage));
    return row.workflow_runs || [];
  }
  async function workflowJobs(runId) {
    const row = await client.api(`/actions/runs/${runId}/jobs?per_page=100`);
    return row.jobs || [];
  }
  async function jobLogText(jobId) {
    try { return await client.fetchText(`/actions/jobs/${jobId}/logs`); } catch (_) { return ''; }
  }
  return {workflowRuns, workflowRunsForPushHead, workflowJobs, jobLogText};
}

module.exports = {createActionsStore, workflowRunsForPushHeadPath};
