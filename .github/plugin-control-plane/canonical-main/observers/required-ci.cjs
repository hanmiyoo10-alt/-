'use strict';

const {makeEvent, stableEventId} = require('./common.cjs');

function requiredCiEvent(run, job, mainSha) {
  const success = run.conclusion === 'success' && job?.conclusion === 'success';
  return makeEvent({eventClass: 'REQUIRED_CI', subject: {kind: 'workflow', id: 'simcore-ci.yml/main/Required'}, scope: ['scope:repo'], authority: {kind: 'main', locator: 'main'}, from: success ? 'FAIL' : 'PASS', to: success ? 'PASS' : 'FAIL', reasonCode: 'REQUIRED_CHECK_FAILED', disposition: success ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'FEEDBACK_CANDIDATE', evidence: [`run:${run.id}`, `sha:${mainSha}`], eventId: stableEventId('required-ci', run.id, run.run_attempt || 1, run.conclusion, job?.conclusion), summary: success ? 'Permanent Required check passed for current main.' : 'Permanent Required check failed for current main.'});
}

function selectCurrentMainPushRun(runs, mainSha) {
  if (!Array.isArray(runs) || !/^[0-9a-f]{40}$/.test(String(mainSha || ''))) return null;
  return runs.find((row) => row?.head_sha === mainSha && row?.event === 'push') || null;
}

async function observe(context) {
  const config = context.policy.adapters.requiredCi;
  const runs = await context.actions.workflowRunsForPushHead(config.workflow, context.mainSha, 100);
  const run = selectCurrentMainPushRun(runs, context.mainSha);
  if (!run) return {known: false, summary: 'UNKNOWN — no SimCore CI push run found for current main', events: [], data: null};
  if (run.status !== 'completed') return {known: false, summary: `PENDING — run ${run.id}`, events: [], data: {run}};
  const jobs = await context.actions.workflowJobs(run.id);
  const matches = jobs.filter((row) => row.name === config.requiredJob);
  if (matches.length !== 1) return {known: false, summary: `UNKNOWN — Required job cardinality ${matches.length} in run ${run.id}`, events: [], data: {run, jobs}};
  const job = matches[0];
  return {known: true, passing: run.conclusion === 'success' && job.conclusion === 'success', summary: `${job.conclusion === 'success' ? 'PASS' : 'FAIL'} — run ${run.id}`, events: [requiredCiEvent(run, job, context.mainSha)], data: {run, job}};
}

module.exports = {requiredCiEvent, selectCurrentMainPushRun, observe};
