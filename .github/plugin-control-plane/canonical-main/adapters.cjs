'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy, validateDescriptor} = require('./contract.cjs');
const {repositoryBindingErrors} = require('./bootstrap.cjs');

const policy = loadPolicy();

function makeEvent({eventClass, subject, scope, authority, from, to, reasonCode, disposition, evidence = [], eventId, summary}) {
  return {
    schemaVersion: 1,
    eventId,
    eventClass,
    subject,
    scope,
    authority,
    observation: {from, to, reasonCode},
    disposition,
    evidence,
    observedAt: new Date().toISOString(),
    summary,
  };
}

function stableEventId(prefix, ...parts) {
  return [prefix, ...parts.map((value) => String(value ?? 'UNKNOWN'))].join(':');
}

async function workflowRuns(api, workflow, perPage = 50) {
  const row = await api(`/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=${perPage}`);
  return row.workflow_runs || [];
}

async function workflowJobs(api, runId) {
  const row = await api(`/actions/runs/${runId}/jobs?per_page=100`);
  return row.jobs || [];
}

async function jobLogText(fetchText, jobId) {
  try {
    return await fetchText(`/actions/jobs/${jobId}/logs`);
  } catch (_) {
    return '';
  }
}

function requiredCiEvent(run, job, mainSha) {
  const success = run.conclusion === 'success' && job?.conclusion === 'success';
  return makeEvent({
    eventClass: 'REQUIRED_CI',
    subject: {kind: 'workflow', id: 'simcore-ci.yml/main/Required'},
    scope: ['scope:repo'],
    authority: {kind: 'main', locator: 'main'},
    from: success ? 'FAIL' : 'PASS',
    to: success ? 'PASS' : 'FAIL',
    reasonCode: 'REQUIRED_CHECK_FAILED',
    disposition: success ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'FEEDBACK_CANDIDATE',
    evidence: [`run:${run.id}`, `sha:${mainSha}`],
    eventId: stableEventId('required-ci', run.id, run.run_attempt || 1, run.conclusion, job?.conclusion),
    summary: success ? 'Permanent Required check passed for current main.' : 'Permanent Required check failed for current main.',
  });
}

async function observeRequiredCi(api, mainSha) {
  const config = policy.adapters.requiredCi;
  const runs = await workflowRuns(api, config.workflow, 50);
  const run = runs.find((row) => row.head_sha === mainSha && row.event === 'push');
  if (!run) return {known: false, summary: 'UNKNOWN — no SimCore CI push run found for current main', events: []};
  if (run.status !== 'completed') return {known: false, summary: `PENDING — run ${run.id}`, events: []};
  const jobs = await workflowJobs(api, run.id);
  const matches = jobs.filter((row) => row.name === config.requiredJob);
  if (matches.length !== 1) return {known: false, summary: `UNKNOWN — Required job cardinality ${matches.length} in run ${run.id}`, events: []};
  const event = requiredCiEvent(run, matches[0], mainSha);
  return {
    known: true,
    passing: run.conclusion === 'success' && matches[0].conclusion === 'success',
    summary: `${matches[0].conclusion === 'success' ? 'PASS' : 'FAIL'} — run ${run.id}`,
    events: [event],
  };
}

async function fetchContent(api, filePath, ref = 'main') {
  const encoded = filePath.split('/').map(encodeURIComponent).join('/');
  const row = await api(`/contents/${encoded}?ref=${encodeURIComponent(ref)}`, {allow404: true});
  if (!row || Array.isArray(row) || !row.content) return null;
  return Buffer.from(row.content, row.encoding || 'base64').toString('utf8');
}

async function branchHead(api, branch) {
  const row = await api(`/branches/${encodeURIComponent(branch)}`, {allow404: true});
  return row?.commit?.sha || null;
}

async function observeProductionAuthority(api) {
  const config = policy.adapters.productionAuthority.simcore;
  const raw = await fetchContent(api, config.manifest, 'main');
  if (!raw) return {known: false, summary: 'UNKNOWN — SimCore manifest missing', events: []};
  let manifest;
  try { manifest = JSON.parse(raw); } catch (_) { return {known: false, summary: 'UNKNOWN — SimCore manifest invalid', events: []}; }
  const branch = manifest.release_branch;
  const recorded = manifest.release_commit;
  if (!branch || !recorded) return {known: false, summary: 'UNKNOWN — SimCore release identity incomplete', events: []};
  const actual = await branchHead(api, branch);
  if (!actual) return {known: false, summary: `UNKNOWN — release branch ${branch} missing`, events: []};
  const match = actual === recorded;
  const event = makeEvent({
    eventClass: 'PRODUCTION_AUTHORITY',
    subject: {kind: 'project', id: 'simcore'},
    scope: ['plugin:simcore'],
    authority: {kind: 'release-branch', locator: branch},
    from: match ? 'MISMATCH' : 'MATCH',
    to: match ? 'MATCH' : 'MISMATCH',
    reasonCode: 'RELEASE_AUTHORITY_IDENTITY_MISMATCH',
    disposition: match ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'ESCALATION_CANDIDATE',
    evidence: [`recorded:${recorded}`, `actual:${actual}`],
    eventId: stableEventId('simcore-release-identity', recorded, actual),
    summary: match ? 'SimCore release identity matches the manifest.' : 'SimCore release branch head does not match the manifest release commit.',
  });
  return {known: true, matching: match, summary: `${match ? 'MATCH' : 'MISMATCH'} — ${branch} ${actual}`, events: [event]};
}

function latestRelevantRun(runs, allowedEvents) {
  return runs.find((run) => allowedEvents.includes(run.event) && run.conclusion !== 'skipped');
}

async function scanFailedRun(api, fetchText, run) {
  const jobs = await workflowJobs(api, run.id);
  const failed = jobs.filter((job) => job.conclusion && job.conclusion !== 'success' && job.conclusion !== 'skipped');
  let text = '';
  for (const job of failed.slice(0, 8)) text += `\n${await jobLogText(fetchText, job.id)}`;
  if (/MAIN_WRITE_RETRY_EXHAUSTED/.test(text)) return 'MAIN_WRITE_RETRY_EXHAUSTED';
  if (/MAIN_WRITE_CONTENT_CONFLICT/.test(text)) return 'MAIN_WRITE_CONTENT_CONFLICT';
  if (/MAIN_WRITE_PATH_DENIED(?:_AFTER_INTEGRATION)?/.test(text)) return 'MEMORY_SYNC_PATH_ESCAPE';
  return 'MEMORY_SYNC_FAILED';
}

function memoryEvent(config, run, reasonCode, recovered) {
  const eventClass = reasonCode.startsWith('MAIN_WRITE_') || reasonCode === 'MEMORY_SYNC_PATH_ESCAPE' ? 'MAIN_WRITE' : 'DURABLE_MEMORY_SYNC';
  return makeEvent({
    eventClass,
    subject: {kind: 'workflow', id: config.workflow},
    scope: config.scope,
    authority: {kind: 'workflow', locator: config.workflow},
    from: recovered ? 'FAIL' : 'PASS',
    to: recovered ? 'PASS' : 'FAIL',
    reasonCode,
    disposition: recovered ? 'RECOVERY_FEEDBACK_CANDIDATE' : (reasonCode === 'MEMORY_SYNC_FAILED' ? 'FEEDBACK_CANDIDATE' : 'ESCALATION_CANDIDATE'),
    evidence: [`run:${run.id}`, `sha:${run.head_sha || 'UNKNOWN'}`],
    eventId: stableEventId('writer', config.id, run.id, reasonCode, recovered ? 'recovered' : 'open'),
    summary: recovered ? `${config.id} writer workflow recovered.` : `${config.id} writer workflow failed: ${reasonCode}`,
  });
}

async function observeWriterWorkflow(api, fetchText, config) {
  const runs = await workflowRuns(api, config.workflow, 50);
  const run = latestRelevantRun(runs, config.events);
  if (!run) return {id: config.id, known: true, passing: true, summary: 'IDLE — no relevant workflow run observed', events: []};
  if (run.status !== 'completed') return {id: config.id, known: false, summary: `PENDING — run ${run.id}`, events: []};
  if (run.conclusion === 'success') {
    const recoverable = ['MEMORY_SYNC_FAILED', 'MAIN_WRITE_CONTENT_CONFLICT', 'MAIN_WRITE_RETRY_EXHAUSTED', 'MEMORY_SYNC_PATH_ESCAPE'];
    return {
      id: config.id,
      known: true,
      passing: true,
      summary: `PASS — run ${run.id}`,
      events: recoverable.map((reason) => memoryEvent(config, run, reason, true)),
    };
  }
  const reason = await scanFailedRun(api, fetchText, run);
  return {
    id: config.id,
    known: true,
    passing: false,
    summary: `FAIL — run ${run.id} — ${reason}`,
    events: [memoryEvent(config, run, reason, false)],
  };
}

function descriptorFiles(root = process.cwd()) {
  const dir = path.join(root, policy.adapters.bootstrap.descriptorDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => path.join(dir, name));
}

function bootstrapEvent(file, descriptor, errors, recovered) {
  const id = descriptor?.id || path.basename(file, '.json');
  return makeEvent({
    eventClass: 'PROJECT_BOOTSTRAP',
    subject: {kind: descriptor?.kind || 'project', id},
    scope: descriptor?.kind === 'product' ? [`product:${id}`] : [`plugin:${id}`],
    authority: {kind: 'bootstrap-descriptor', locator: path.relative(process.cwd(), file)},
    from: recovered ? 'INVALID' : 'VALID',
    to: recovered ? 'VALID' : 'INVALID',
    reasonCode: 'PROJECT_BOOTSTRAP_VALIDATION_FAILED',
    disposition: recovered ? 'RECOVERY_FEEDBACK_CANDIDATE' : 'FEEDBACK_CANDIDATE',
    evidence: errors.length ? errors.map((error) => `error:${error}`) : [`descriptor:${path.relative(process.cwd(), file)}`],
    eventId: stableEventId('bootstrap', id, errors.join('|') || 'valid'),
    summary: recovered ? `${id} bootstrap descriptor is valid.` : `${id} bootstrap descriptor failed validation.`,
  });
}

function observeBootstrap(root = process.cwd()) {
  const files = descriptorFiles(root);
  if (!files.length) return {known: false, summary: 'UNKNOWN — no registered bootstrap descriptors', statuses: [], events: []};
  const statuses = [];
  const events = [];
  for (const file of files) {
    let descriptor;
    let errors = [];
    try { descriptor = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { errors = [`invalid JSON: ${error.message}`]; }
    if (descriptor) errors.push(...validateDescriptor(descriptor), ...repositoryBindingErrors(descriptor, root));
    statuses.push({id: descriptor?.id || path.basename(file, '.json'), profile: descriptor?.memory?.profile || 'UNKNOWN', ready: errors.length === 0, errors});
    events.push(bootstrapEvent(file, descriptor, errors, errors.length === 0));
  }
  return {known: true, summary: statuses.every((row) => row.ready) ? 'READY' : 'INCOMPLETE', statuses, events};
}

async function safeObserve(label, fn) {
  try {
    return await fn();
  } catch (error) {
    return {known: false, summary: `UNKNOWN — ${label} adapter error: ${error.message}`, events: []};
  }
}

async function observeAll({api, fetchText, mainSha, root = process.cwd()}) {
  const [requiredCi, productionAuthority, ...writerResults] = await Promise.all([
    safeObserve('required-ci', () => observeRequiredCi(api, mainSha)),
    safeObserve('production-authority', () => observeProductionAuthority(api)),
    ...policy.adapters.writerWorkflows.map((config) => safeObserve(config.id, () => observeWriterWorkflow(api, fetchText, config))),
  ]);
  let bootstrap;
  try { bootstrap = observeBootstrap(root); } catch (error) { bootstrap = {known: false, summary: `UNKNOWN — bootstrap adapter error: ${error.message}`, statuses: [], events: []}; }
  const events = [
    ...requiredCi.events,
    ...productionAuthority.events,
    ...writerResults.flatMap((row) => row.events),
    ...bootstrap.events,
  ];
  const writerCoverage = writerResults.every((row) => row.known);
  return {
    requiredCi,
    productionAuthority,
    writers: writerResults,
    bootstrap,
    events,
    coverage: {
      requiredCi: requiredCi.known,
      productionAuthority: productionAuthority.known,
      writers: writerCoverage,
      bootstrap: bootstrap.known,
      complete: requiredCi.known && productionAuthority.known && writerCoverage && bootstrap.known,
    },
  };
}

module.exports = {
  stableEventId,
  requiredCiEvent,
  latestRelevantRun,
  scanFailedRun,
  memoryEvent,
  descriptorFiles,
  observeBootstrap,
  observeAll,
};
