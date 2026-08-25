'use strict';

function createActionsStore(client) {
  async function workflowRuns(workflow, perPage = 50) {
    const row = await client.api(`/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${perPage}`);
    return row.workflow_runs || [];
  }
  async function workflowJobs(runId) {
    const row = await client.api(`/actions/runs/${runId}/jobs?per_page=100`);
    return row.jobs || [];
  }
  async function jobLogText(jobId) {
    try { return await client.fetchText(`/actions/jobs/${jobId}/logs`); } catch (_) { return ''; }
  }
  return {workflowRuns, workflowJobs, jobLogText};
}

module.exports = {createActionsStore};
