'use strict';

const {makeEvent, stableEventId} = require('./common.cjs');

function runAtOrAfterEpoch(run, observationEpoch) {
  if (!observationEpoch) return true;
  const epoch = Date.parse(observationEpoch);
  const observed = Date.parse(run.created_at || run.run_started_at || '');
  return Number.isFinite(epoch) && Number.isFinite(observed) && observed >= epoch;
}
function latestRelevantRun(runs, allowedEvents, observationEpoch = null) {
  return runs.find((run) => allowedEvents.includes(run.event) && run.conclusion !== 'skipped' && runAtOrAfterEpoch(run, observationEpoch));
}
async function scanFailedRun(context, run, config = {}) {
  const jobs = await context.actions.workflowJobs(run.id);
  const failed = jobs.filter((job) => job.conclusion && job.conclusion !== 'success' && job.conclusion !== 'skipped');
  let text = '';
  for (const job of failed.slice(0, 8)) text += `\n${await context.actions.jobLogText(job.id)}`;
  if (/MAIN_WRITE_RETRY_EXHAUSTED/.test(text)) return 'MAIN_WRITE_RETRY_EXHAUSTED';
  if (/MAIN_WRITE_CONTENT_CONFLICT/.test(text)) return 'MAIN_WRITE_CONTENT_CONFLICT';
  if (/MAIN_WRITE_PATH_DENIED(?:_AFTER_INTEGRATION)?/.test(text)) return 'MEMORY_SYNC_PATH_ESCAPE';
  return config.failureReason || 'MEMORY_SYNC_FAILED';
}
function eventClassForReason(reasonCode) {
  if (reasonCode.startsWith('MAIN_WRITE_') || reasonCode === 'MEMORY_SYNC_PATH_ESCAPE') return 'MAIN_WRITE';
  if (reasonCode === 'PROTECTION_GUARD_FAILED' || reasonCode === 'OPS_REFRESH_FAILED') return 'CONTROL_PLANE';
  return 'DURABLE_MEMORY_SYNC';
}
function writerEvent(config, run, reasonCode, recovered) {
  const eventClass = eventClassForReason(reasonCode);
  const escalation = eventClass === 'MAIN_WRITE' && reasonCode !== 'MEMORY_SYNC_FAILED';
  return makeEvent({eventClass, subject: {kind: 'workflow', id: config.workflow}, scope: config.scope, authority: {kind: 'workflow', locator: config.workflow}, from: recovered ? 'FAIL' : 'PASS', to: recovered ? 'PASS' : 'FAIL', reasonCode, disposition: recovered ? 'RECOVERY_FEEDBACK_CANDIDATE' : (escalation ? 'ESCALATION_CANDIDATE' : 'FEEDBACK_CANDIDATE'), evidence: [`run:${run.id}`, `sha:${run.head_sha || 'UNKNOWN'}`], eventId: stableEventId('writer', config.id, run.id, reasonCode, recovered ? 'recovered' : 'open'), summary: recovered ? `${config.id} workflow recovered.` : `${config.id} workflow failed: ${reasonCode}`});
}
function recoverableReasons(config) {
  return [...new Set(['MAIN_WRITE_CONTENT_CONFLICT', 'MAIN_WRITE_RETRY_EXHAUSTED', 'MEMORY_SYNC_PATH_ESCAPE', config.failureReason || 'MEMORY_SYNC_FAILED'])];
}
async function observeOne(context, config) {
  const runs = await context.actions.workflowRuns(config.workflow, 50);
  const epoch = context.policy.adapters.observationEpoch || null;
  const run = latestRelevantRun(runs, config.events, epoch);
  if (!run) return {id: config.id, known: true, passing: true, summary: `IDLE — no relevant workflow run since ${epoch || 'adapter start'}`, events: [], run: null};
  if (run.status !== 'completed') return {id: config.id, known: false, passing: false, summary: `PENDING — run ${run.id}`, events: [], run};
  if (run.conclusion === 'success') {
    return {id: config.id, known: true, passing: true, summary: `PASS — run ${run.id}`, events: recoverableReasons(config).map((reason) => writerEvent(config, run, reason, true)), run};
  }
  const reason = await scanFailedRun(context, run, config);
  return {id: config.id, known: true, passing: false, summary: `FAIL — run ${run.id} — ${reason}`, events: [writerEvent(config, run, reason, false)], run};
}
async function observe(context) {
  const rows = await Promise.all(context.policy.adapters.writerWorkflows.map((config) => observeOne(context, config)));
  return {known: rows.every((row) => row.known), summary: rows.every((row) => row.known) ? 'KNOWN' : 'INCOMPLETE', events: rows.flatMap((row) => row.events), data: rows};
}

module.exports = {runAtOrAfterEpoch, latestRelevantRun, scanFailedRun, eventClassForReason, writerEvent, recoverableReasons, observeOne, observe};
