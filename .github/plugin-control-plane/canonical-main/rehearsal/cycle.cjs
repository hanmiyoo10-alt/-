'use strict';

const {spawnSync} = require('child_process');
const path = require('path');
const {policy, rehearsalConfig, REASON_CODE, markerForKey, markerForEvent, proofMarker, buildRehearsalEvent, incidentLabels, renderIncidentBody, rehearsalState, deliveryEnvelope} = require('./contract.cjs');
const {client, readMainIdentity, assertMainIdentity} = require('./client.cjs');

async function materialize(apiClient, transition, mainSha) {
  const event = buildRehearsalEvent(transition, mainSha);
  const allIssues = await apiClient.listIssues('all');
  const key = require('../contract.cjs').correlationKey(event);
  let issue = allIssues.find((row) => (row.body || '').includes(markerForKey(key))) || null;
  if (transition === 'RECOVERED' && !issue) throw new Error('cannot recover rehearsal incident before OPEN');
  if (issue && (issue.body || '').includes(markerForEvent(event.eventId))) return {touched: false, duplicate: true, issue, event, key, severity: rehearsalConfig.severity, envelope: null};
  const {severity, previousState, envelope} = deliveryEnvelope(event, transition, issue);
  if (severity !== rehearsalConfig.severity) throw new Error(`rehearsal severity drift: expected ${rehearsalConfig.severity}, got ${severity}`);
  if (transition === 'RECOVERED' && previousState !== 'OPEN') return {touched: false, duplicate: true, issue, event, key, severity, envelope: null};
  let body = renderIncidentBody(event, severity, transition, key, envelope);
  if (transition === 'RECOVERED') body += `\n${proofMarker(mainSha)}`;
  const labels = incidentLabels(severity, transition);
  const title = `[repo-incident:${severity}] ${REASON_CODE} — scope:repo`;
  if (issue) {
    issue = await apiClient.request(`/issues/${issue.number}`, {method: 'PATCH', body: {title, body, state: transition === 'RECOVERED' ? 'closed' : 'open'}});
    await apiClient.request(`/issues/${issue.number}/labels`, {method: 'PUT', body: {labels}});
  } else {
    issue = await apiClient.request('/issues', {method: 'POST', body: {title, body, labels}});
  }
  return {touched: true, duplicate: false, issue, event, key, severity, envelope};
}

function runSurface(script, label) {
  const target = path.join(__dirname, '..', script);
  const result = spawnSync(process.execPath, [target, 'refresh'], {stdio: 'inherit', env: process.env});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${label} refresh failed with status ${result.status}`);
}
function runOpsRefresh() { runSurface('orchestrator/refresh.cjs', 'canonical ops orchestrator'); }

async function assertOpsSurface(apiClient, expectedState, issueNumber, mainSha) {
  const openIssues = await apiClient.listIssues('open');
  const ops = openIssues.find((row) => row.title === policy.operations.issueTitle);
  if (!ops) throw new Error(`operations issue missing: ${policy.operations.issueTitle}`);
  const body = ops.body || '';
  if (!body.includes(`**Operator state: ${expectedState}**`)) throw new Error(`expected operator state ${expectedState}`);
  if (!body.includes(`Main: \`${mainSha}\``) && !body.includes(`Observed SHA: \`${mainSha}\``)) throw new Error('ops surface observed a different main SHA');
  if (!body.includes('Production authority') || !body.includes('MATCH')) throw new Error('production authority ceased to MATCH during rehearsal');
  if (!body.includes('Coverage: `COMPLETE`')) throw new Error('bootstrap coverage regressed during rehearsal');
  if (!body.includes('Legacy/unregistered scopes: none')) throw new Error('legacy/unregistered bootstrap scope reappeared during rehearsal');
  if (expectedState === 'INCIDENT' && !body.includes(`#${issueNumber}`)) throw new Error('open rehearsal incident missing from ops surface');
  if (expectedState === 'CLEAR' && !body.includes(`#${issueNumber}`)) throw new Error('recovered rehearsal incident missing from recent recoveries');
}

async function recoverStaleRehearsal(apiClient, expectedMainSha, observedMainSha) {
  const state = rehearsalState(await apiClient.listIssues('all'), expectedMainSha);
  let issueNumber = state.issue?.number || null;
  if (state.state === 'OPEN') {
    const recovered = await materialize(apiClient, 'RECOVERED', expectedMainSha);
    issueNumber = recovered.issue?.number || issueNumber;
  }
  console.log(`CANONICAL_MAIN_REHEARSAL:STALE_MAIN_SKIP:${expectedMainSha}:${observedMainSha}${issueNumber ? `:#${issueNumber}` : ''}`);
  return {issueNumber, mainSha: expectedMainSha, observedMainSha, skippedStale: true};
}

async function skipIfMainMoved(apiClient, expectedMainSha) {
  const observedMainSha = await readMainIdentity(apiClient);
  if (observedMainSha === expectedMainSha) return null;
  return recoverStaleRehearsal(apiClient, expectedMainSha, observedMainSha);
}

async function cycle({token, repo, expectedMainSha, fetchImpl = fetch}) {
  if (!expectedMainSha || !/^[0-9a-f]{40}$/.test(expectedMainSha)) throw new Error('EXPECTED_MAIN_SHA must be exact 40-hex main identity');
  if (rehearsalConfig.enabled !== true) throw new Error('canonical rehearsal config is not enabled');
  const apiClient = client({token, repo, fetchImpl});

  const initialStale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (initialStale) return initialStale;

  const initial = rehearsalState(await apiClient.listIssues('all'), expectedMainSha);
  if (initial.state === 'PROVEN') {
    runOpsRefresh();
    const stale = await skipIfMainMoved(apiClient, expectedMainSha);
    if (stale) return stale;
    await assertOpsSurface(apiClient, 'CLEAR', initial.issue.number, expectedMainSha);
    console.log(`CANONICAL_MAIN_REHEARSAL:ALREADY_PROVEN:#${initial.issue.number}:${expectedMainSha}`);
    return {issueNumber: initial.issue.number, mainSha: expectedMainSha, alreadyProven: true};
  }

  const opened = initial.state === 'OPEN' ? {touched: false, duplicate: true, issue: initial.issue} : await materialize(apiClient, 'OPEN', expectedMainSha);
  if (initial.state !== 'OPEN' && (!opened.touched || !opened.envelope?.eligible)) throw new Error('first rehearsal OPEN must materialize and enter the P1 outbox');
  let stale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (stale) return stale;

  runOpsRefresh();
  stale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (stale) return stale;
  await assertOpsSurface(apiClient, 'INCIDENT', opened.issue.number, expectedMainSha);

  const repeated = await materialize(apiClient, 'OPEN', expectedMainSha);
  if (repeated.touched || repeated.duplicate !== true) throw new Error('identical rehearsal OPEN must be suppressed as duplicate');
  stale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (stale) return stale;
  await assertOpsSurface(apiClient, 'INCIDENT', opened.issue.number, expectedMainSha);

  const recovered = await materialize(apiClient, 'RECOVERED', expectedMainSha);
  if (!recovered.touched || !recovered.envelope?.eligible) throw new Error('rehearsal RECOVERED must materialize and enter the P1 outbox');
  if (recovered.issue.number !== opened.issue.number) throw new Error('recovery must reuse the same correlation-key issue');
  stale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (stale) return stale;

  runOpsRefresh();
  stale = await skipIfMainMoved(apiClient, expectedMainSha);
  if (stale) return stale;
  await assertOpsSurface(apiClient, 'CLEAR', opened.issue.number, expectedMainSha);
  await assertMainIdentity(apiClient, expectedMainSha);
  console.log(`CANONICAL_MAIN_REHEARSAL:PASS:#${opened.issue.number}:${expectedMainSha}`);
  return {issueNumber: opened.issue.number, mainSha: expectedMainSha, alreadyProven: false};
}

module.exports = {materialize, runSurface, runOpsRefresh, assertOpsSurface, recoverStaleRehearsal, skipIfMainMoved, cycle};
