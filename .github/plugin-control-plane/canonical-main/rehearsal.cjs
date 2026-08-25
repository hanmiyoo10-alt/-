'use strict';

const {spawnSync} = require('child_process');
const path = require('path');
const {
  loadPolicy,
  validateEvent,
  correlationKey,
  severityFor,
} = require('./contract.cjs');
const {
  previousIncidentState,
  buildAlertEnvelope,
  envelopeMarker,
} = require('./notification.cjs');

const policy = loadPolicy();
const REHEARSAL_ID = policy.rehearsal?.id || 'phase-h-v1';
const REASON_CODE = policy.rehearsal?.reasonCode || 'CANONICAL_MAIN_REHEARSAL';

function markerForKey(key) {
  return `<!-- canonical-main-correlation:${Buffer.from(key).toString('base64url')} -->`;
}

function markerForEvent(eventId) {
  return `<!-- canonical-main-event:${Buffer.from(String(eventId)).toString('base64url')} -->`;
}

function proofMarker(mainSha) {
  return `<!-- canonical-main-rehearsal-proof:${mainSha} -->`;
}

function buildRehearsalEvent(transition, mainSha) {
  if (!['OPEN', 'RECOVERED'].includes(transition)) throw new Error(`unsupported rehearsal transition: ${transition}`);
  const open = transition === 'OPEN';
  const event = {
    schemaVersion: 1,
    eventId: `${REHEARSAL_ID}:${transition}:${mainSha}`,
    eventClass: 'CONTROL_PLANE',
    subject: {kind: 'rehearsal', id: REHEARSAL_ID},
    scope: ['scope:repo'],
    authority: {kind: 'rehearsal-contract', identity: REHEARSAL_ID},
    observation: {
      from: open ? 'CLEAR' : 'INCIDENT',
      to: open ? 'INCIDENT' : 'CLEAR',
      reasonCode: REASON_CODE,
    },
    disposition: open ? 'FEEDBACK_CANDIDATE' : 'RECOVERY_FEEDBACK_CANDIDATE',
    evidence: [`rehearsal:${REHEARSAL_ID}`, `main:${mainSha}`],
    summary: open
      ? 'Synthetic canonical-main rehearsal incident. No production or release failure is asserted.'
      : 'Synthetic canonical-main rehearsal recovered. No production or release authority changed.',
  };
  const errors = validateEvent(event, policy);
  if (errors.length) throw new Error(`invalid rehearsal event: ${errors.join('; ')}`);
  return event;
}

function incidentLabels(severity, state) {
  return ['control-plane:incident', `incident:${state.toLowerCase()}`, `severity:${severity}`, 'scope:repo'].sort();
}

function renderIncidentBody(event, severity, state, key, alertEnvelope) {
  return [
    `# Canonical Main Incident — ${event.observation.reasonCode}`,
    '',
    '> Synthetic rehearsal record. This issue is not a production/release authority and does not assert a real outage.',
    '',
    '- Synthetic rehearsal: `true`',
    `- Rehearsal id: \`${REHEARSAL_ID}\``,
    `- State: **${state}**`,
    `- Severity: **${severity}**`,
    '- Scope: `scope:repo`',
    `- Event class: \`${event.eventClass}\``,
    `- Reason: \`${event.observation.reasonCode}\``,
    `- Subject: \`${event.subject.kind}:${event.subject.id}\``,
    `- Summary: ${event.summary}`,
    `- Observed transition: \`${event.observation.from} → ${event.observation.to}\``,
    `- Notification eligible: \`${alertEnvelope.eligible}\``,
    `- Delivery key: \`${alertEnvelope.deliveryKey}\``,
    '',
    '## Evidence',
    '',
    ...event.evidence.map((row) => `- \`${row}\``),
    '',
    markerForKey(key),
    markerForEvent(event.eventId),
    envelopeMarker(alertEnvelope),
  ].join('\n');
}

function client({token, repo, fetchImpl = fetch}) {
  if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
  if (!repo) throw new Error('GITHUB_REPOSITORY is required');

  async function request(endpoint, options = {}) {
    const method = options.method || 'GET';
    const allowed = (
      (method === 'GET' && endpoint === '/branches/main') ||
      (method === 'GET' && /^\/issues\?state=(?:all|open)&per_page=100&page=\d+$/.test(endpoint)) ||
      (method === 'POST' && endpoint === '/issues') ||
      (method === 'PATCH' && /^\/issues\/\d+$/.test(endpoint)) ||
      (method === 'PUT' && /^\/issues\/\d+\/labels$/.test(endpoint))
    );
    if (!allowed) throw new Error(`rehearsal endpoint denied: ${method} ${endpoint}`);
    const response = await fetchImpl(`https://api.github.com/repos/${repo}${endpoint}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'canonical-main-rehearsal',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) throw new Error(`${method} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
    if (response.status === 204) return null;
    return response.json();
  }

  async function listIssues(state = 'all') {
    const result = [];
    for (let page = 1; page <= 5; page += 1) {
      const rows = await request(`/issues?state=${state}&per_page=100&page=${page}`);
      const issues = rows.filter((row) => !row.pull_request);
      result.push(...issues);
      if (rows.length < 100) return result;
    }
    throw new Error('issue pagination exceeded safety bound');
  }

  return {request, listIssues};
}

async function assertMainIdentity(apiClient, expectedMainSha) {
  const branch = await apiClient.request('/branches/main');
  if (branch.commit.sha !== expectedMainSha) {
    throw new Error(`rehearsal main moved: expected ${expectedMainSha}, observed ${branch.commit.sha}`);
  }
}

function rehearsalState(allIssues, mainSha) {
  const openEvent = buildRehearsalEvent('OPEN', mainSha);
  const recoveredEvent = buildRehearsalEvent('RECOVERED', mainSha);
  const key = correlationKey(openEvent);
  const keyMarker = markerForKey(key);
  const issue = allIssues.find((row) => (row.body || '').includes(keyMarker)) || null;
  if (!issue) return {state: 'NONE', issue: null, key};
  const previousState = previousIncidentState(issue);
  const body = issue.body || '';
  if (previousState === 'RECOVERED' && body.includes(proofMarker(mainSha)) && body.includes(markerForEvent(recoveredEvent.eventId))) {
    return {state: 'PROVEN', issue, key};
  }
  if (previousState === 'OPEN' && body.includes(markerForEvent(openEvent.eventId))) {
    return {state: 'OPEN', issue, key};
  }
  return {state: previousState, issue, key};
}

async function materialize(apiClient, transition, mainSha) {
  const event = buildRehearsalEvent(transition, mainSha);
  const key = correlationKey(event);
  const severity = severityFor(event, {}, policy);
  if (severity !== policy.rehearsal.severity) {
    throw new Error(`rehearsal severity drift: expected ${policy.rehearsal.severity}, got ${severity}`);
  }

  const allIssues = await apiClient.listIssues('all');
  const keyMarker = markerForKey(key);
  let issue = allIssues.find((row) => (row.body || '').includes(keyMarker)) || null;
  if (transition === 'RECOVERED' && !issue) throw new Error('cannot recover rehearsal incident before OPEN');
  if (issue && (issue.body || '').includes(markerForEvent(event.eventId))) {
    return {touched: false, duplicate: true, issue, event, key, severity, envelope: null};
  }

  const previousState = previousIncidentState(issue);
  if (transition === 'RECOVERED' && previousState !== 'OPEN') {
    return {touched: false, duplicate: true, issue, event, key, severity, envelope: null};
  }
  const envelope = buildAlertEnvelope({
    event,
    severity,
    transition,
    correlationKey: key,
    previousState,
  });
  let body = renderIncidentBody(event, severity, transition, key, envelope);
  if (transition === 'RECOVERED') body += `\n${proofMarker(mainSha)}`;
  const labels = incidentLabels(severity, transition);
  const title = `[repo-incident:${severity}] ${REASON_CODE} — scope:repo`;

  if (issue) {
    issue = await apiClient.request(`/issues/${issue.number}`, {
      method: 'PATCH',
      body: {title, body, state: transition === 'RECOVERED' ? 'closed' : 'open'},
    });
    await apiClient.request(`/issues/${issue.number}/labels`, {method: 'PUT', body: {labels}});
  } else {
    issue = await apiClient.request('/issues', {method: 'POST', body: {title, body, labels}});
  }
  return {touched: true, duplicate: false, issue, event, key, severity, envelope};
}

function runOpsRefresh() {
  const controller = path.join(__dirname, 'ops-controller.cjs');
  const result = spawnSync(process.execPath, [controller, 'refresh'], {stdio: 'inherit', env: process.env});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`canonical ops refresh failed with status ${result.status}`);
}

async function assertOpsSurface(apiClient, expectedState, issueNumber, mainSha) {
  const openIssues = await apiClient.listIssues('open');
  const ops = openIssues.find((row) => row.title === policy.operations.issueTitle);
  if (!ops) throw new Error(`operations issue missing: ${policy.operations.issueTitle}`);
  const body = ops.body || '';
  if (!body.includes(`**Operator state: ${expectedState}**`)) throw new Error(`expected operator state ${expectedState}`);
  if (!body.includes(`Observed SHA: \`${mainSha}\``)) throw new Error('ops surface observed a different main SHA');
  if (!body.includes('Production authority observation: MATCH')) throw new Error('production authority ceased to MATCH during rehearsal');
  if (expectedState === 'INCIDENT' && !body.includes(`#${issueNumber}`)) throw new Error('open rehearsal incident missing from ops surface');
  if (expectedState === 'CLEAR' && !body.includes(`#${issueNumber}`)) throw new Error('recovered rehearsal incident missing from recent recoveries');
}

async function cycle({token, repo, expectedMainSha, fetchImpl = fetch}) {
  if (!expectedMainSha || !/^[0-9a-f]{40}$/.test(expectedMainSha)) throw new Error('EXPECTED_MAIN_SHA must be exact 40-hex main identity');
  if (policy.rehearsal?.enabled !== true) throw new Error('canonical rehearsal policy is not enabled');
  const apiClient = client({token, repo, fetchImpl});
  await assertMainIdentity(apiClient, expectedMainSha);

  const initial = rehearsalState(await apiClient.listIssues('all'), expectedMainSha);
  if (initial.state === 'PROVEN') {
    console.log(`CANONICAL_MAIN_REHEARSAL:ALREADY_PROVEN:#${initial.issue.number}:${expectedMainSha}`);
    return {issueNumber: initial.issue.number, mainSha: expectedMainSha, alreadyProven: true};
  }

  let opened;
  if (initial.state === 'OPEN') {
    opened = {touched: false, duplicate: true, issue: initial.issue};
  } else {
    opened = await materialize(apiClient, 'OPEN', expectedMainSha);
    if (!opened.touched || !opened.envelope?.eligible) throw new Error('first rehearsal OPEN must materialize and enter the P1 outbox');
  }
  runOpsRefresh();
  await assertOpsSurface(apiClient, 'INCIDENT', opened.issue.number, expectedMainSha);

  const repeated = await materialize(apiClient, 'OPEN', expectedMainSha);
  if (repeated.touched || repeated.duplicate !== true) throw new Error('identical rehearsal OPEN must be suppressed as duplicate');
  await assertOpsSurface(apiClient, 'INCIDENT', opened.issue.number, expectedMainSha);

  const recovered = await materialize(apiClient, 'RECOVERED', expectedMainSha);
  if (!recovered.touched || !recovered.envelope?.eligible) throw new Error('rehearsal RECOVERED must materialize and enter the P1 outbox');
  if (recovered.issue.number !== opened.issue.number) throw new Error('recovery must reuse the same correlation-key issue');
  runOpsRefresh();
  await assertOpsSurface(apiClient, 'CLEAR', opened.issue.number, expectedMainSha);
  await assertMainIdentity(apiClient, expectedMainSha);

  console.log(`CANONICAL_MAIN_REHEARSAL:PASS:#${opened.issue.number}:${expectedMainSha}`);
  return {issueNumber: opened.issue.number, mainSha: expectedMainSha, alreadyProven: false};
}

async function main() {
  if (process.argv[2] !== 'cycle') throw new Error('usage: rehearsal.cjs cycle');
  await cycle({
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPOSITORY,
    expectedMainSha: process.env.EXPECTED_MAIN_SHA,
  });
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  REHEARSAL_ID,
  REASON_CODE,
  markerForKey,
  markerForEvent,
  proofMarker,
  buildRehearsalEvent,
  renderIncidentBody,
  incidentLabels,
  client,
  rehearsalState,
  materialize,
  assertMainIdentity,
};
