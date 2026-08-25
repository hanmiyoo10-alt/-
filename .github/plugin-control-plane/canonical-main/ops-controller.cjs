'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadPolicy,
  deriveOperatorState,
  correlationKey,
  severityFor,
} = require('./contract.cjs');
const {observeAll} = require('./adapters.cjs');
const {
  previousIncidentState,
  buildAlertEnvelope,
  envelopeMarker,
} = require('./notification.cjs');
const {summarizeReceipts} = require('./delivery-receipt.cjs');

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry.json'), 'utf8'));
const policy = loadPolicy();
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error('GITHUB_REPOSITORY is required');

async function request(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Accept: options.accept || 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'canonical-main-ops-controller',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  return response;
}

async function api(endpoint, options = {}) {
  const response = await request(endpoint, options);
  if (response === null || response.status === 204) return null;
  return response.json();
}

async function fetchText(endpoint) {
  const response = await request(endpoint, {accept: 'text/plain'});
  return response.text();
}

async function listIssues(state = 'open') {
  const result = [];
  for (let page = 1; page <= 5; page += 1) {
    const rows = await api(`/issues?state=${state}&per_page=100&page=${page}`);
    result.push(...rows.filter((row) => !row.pull_request));
    if (rows.length < 100) return result;
  }
  throw new Error('issue pagination exceeded safety bound');
}

async function listIssueComments(issueNumber) {
  const result = [];
  for (let page = 1; page <= 2; page += 1) {
    const rows = await api(`/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    result.push(...rows);
    if (rows.length < 100) return result;
  }
  throw new Error(`issue #${issueNumber} comment pagination exceeded safety bound`);
}

async function ensureLabel(name, color, description) {
  const encoded = encodeURIComponent(name);
  if (await api(`/labels/${encoded}`, {allow404: true})) return;
  await api('/labels', {method: 'POST', body: {name, color, description}});
}

async function ensureLabels() {
  const defs = [
    ['control-plane:operations', '5319e7', 'Canonical main repository operations surface'],
    ['control-plane:incident', 'b60205', 'Canonical main normalized incident record'],
    ['incident:open', 'd73a4a', 'Incident is currently open'],
    ['incident:recovered', '0e8a16', 'Incident is proven recovered'],
    ['severity:P0', 'b60205', 'Repository or authority integrity incident'],
    ['severity:P1', 'd93f0b', 'Actionable workflow failure'],
    ['severity:P2', 'fbca04', 'Operational follow-up'],
    ['severity:P3', 'c5def5', 'Informational repository churn'],
  ];
  for (const def of defs) await ensureLabel(...def);
}

function parseRefresh(body = '') {
  const match = body.match(/Last refreshed:\s*([^\n]+)/);
  if (!match) return null;
  const ms = Date.parse(match[1].trim());
  return Number.isFinite(ms) ? ms : null;
}

function ownerRows(openIssues, now = Date.now()) {
  const owners = [
    ...Object.entries(registry.plugins || {}).map(([id, owner]) => ({kind: 'plugin', id, owner})),
    ...Object.entries(registry.products || {}).map(([id, owner]) => ({kind: 'product', id, owner})),
  ];
  const boundMs = policy.operations.projectStatusFreshnessMinutes * 60 * 1000;
  return owners.map(({kind, id, owner}) => {
    const title = `[${kind}-status:${id}]`;
    const issue = openIssues.find((row) => row.title === title);
    const refreshed = issue ? parseRefresh(issue.body || '') : null;
    const fresh = refreshed !== null && now - refreshed <= boundMs;
    return {kind, id, owner, issue, refreshed, fresh};
  });
}

function incidentFromIssue(issue) {
  const labels = (issue.labels || []).map((label) => typeof label === 'string' ? label : label.name);
  if (!labels.includes('control-plane:incident')) return null;
  const severityLabel = labels.find((label) => /^severity:P[0-3]$/.test(label));
  const state = labels.includes('incident:recovered') ? 'RECOVERED' : labels.includes('incident:open') ? 'OPEN' : 'UNKNOWN';
  return {issue, severity: severityLabel ? severityLabel.split(':')[1] : 'P2', state};
}

function eventTransition(event) {
  if (event.disposition === 'RECOVERY_FEEDBACK_CANDIDATE') return 'RECOVERED';
  if (event.disposition === 'FEEDBACK_CANDIDATE' || event.disposition === 'ESCALATION_CANDIDATE') return 'OPEN';
  return 'NONE';
}

function markerForKey(key) {
  return `<!-- canonical-main-correlation:${Buffer.from(key).toString('base64url')} -->`;
}

function markerForEvent(eventId) {
  return `<!-- canonical-main-event:${Buffer.from(String(eventId)).toString('base64url')} -->`;
}

function existingIncident(allIssues, key) {
  const marker = markerForKey(key);
  return allIssues.find((issue) => (issue.body || '').includes(marker)) || null;
}

function incidentLabels(event, severity, state) {
  const labels = ['control-plane:incident', `incident:${state.toLowerCase()}`, `severity:${severity}`];
  for (const scope of event.scope || []) {
    if (/^(?:plugin|product|scope):/.test(scope)) labels.push(scope);
  }
  return [...new Set(labels)].sort();
}

function renderIncidentBody(event, severity, state, key, alertEnvelope = null) {
  const evidence = (event.evidence || []).slice(0, 12);
  return [
    `# Canonical Main Incident — ${event.observation.reasonCode}`,
    '',
    '> Derived incident record. This issue is not a production/release authority.',
    '',
    `- State: **${state}**`,
    `- Severity: **${severity}**`,
    `- Scope: ${(event.scope || []).map((row) => `\`${row}\``).join(', ') || '`UNKNOWN`'}`,
    `- Event class: \`${event.eventClass}\``,
    `- Reason: \`${event.observation.reasonCode}\``,
    `- Subject: \`${event.subject.kind}:${event.subject.id ?? event.subject.number ?? 'UNKNOWN'}\``,
    `- Summary: ${event.summary || 'No summary provided.'}`,
    `- Observed transition: \`${event.observation.from || 'UNKNOWN'} → ${event.observation.to || 'UNKNOWN'}\``,
    ...(alertEnvelope ? [
      `- Notification eligible: \`${alertEnvelope.eligible}\``,
      `- Delivery key: \`${alertEnvelope.deliveryKey}\``,
    ] : []),
    '',
    '## Evidence',
    '',
    ...(evidence.length ? evidence.map((row) => `- \`${String(row).replace(/`/g, '')}\``) : ['- `UNKNOWN`']),
    '',
    markerForKey(key),
    markerForEvent(event.eventId),
    ...(alertEnvelope ? [envelopeMarker(alertEnvelope)] : []),
  ].join('\n');
}

async function reconcileIncidentEvents(events, allIssues) {
  const touched = [];
  for (const event of events) {
    const transition = eventTransition(event);
    if (transition === 'NONE') continue;
    const key = correlationKey(event);
    const severity = severityFor(event);
    let issue = existingIncident(allIssues, key);
    if (transition === 'RECOVERED' && !issue) continue;
    if (issue && (issue.body || '').includes(markerForEvent(event.eventId))) continue;

    const priorState = previousIncidentState(issue);
    if (transition === 'RECOVERED' && priorState === 'RECOVERED') continue;
    const alertEnvelope = buildAlertEnvelope({
      event,
      severity,
      transition,
      correlationKey: key,
      previousState: priorState,
    });
    const body = renderIncidentBody(event, severity, transition, key, alertEnvelope);
    const labels = incidentLabels(event, severity, transition);
    const title = `[repo-incident:${severity}] ${event.observation.reasonCode} — ${(event.scope || []).join(',') || 'UNKNOWN'}`;
    if (issue) {
      issue = await api(`/issues/${issue.number}`, {
        method: 'PATCH',
        body: {title, body, state: transition === 'RECOVERED' ? 'closed' : 'open'},
      });
      await api(`/issues/${issue.number}/labels`, {method: 'PUT', body: {labels}});
    } else {
      issue = await api('/issues', {method: 'POST', body: {title, body, labels}});
      allIssues.push(issue);
    }
    touched.push({
      number: issue.number,
      transition,
      severity,
      reason: event.observation.reasonCode,
      notificationEligible: alertEnvelope.eligible,
      deliveryKey: alertEnvelope.deliveryKey,
    });
  }
  return touched;
}

function fmtTime(ms) {
  return ms === null ? 'UNKNOWN' : new Date(ms).toISOString();
}

function fmtOptionalTime(value) {
  return value || 'NONE';
}

function renderIncidentRows(incidents) {
  if (!incidents.length) return '- none observed within current adapter coverage';
  return incidents.map(({issue, severity, state}) => `- **${severity}** ${state} — #${issue.number} ${issue.title}`).join('\n');
}

function renderProjectTable(rows) {
  const head = ['| Scope | Lifecycle | Operational view | Freshness |', '| --- | --- | --- | --- |'];
  const body = rows.map((row) => {
    const scope = `${row.kind}:${row.id}`;
    const view = row.issue ? `#${row.issue.number}` : 'MISSING';
    const freshness = row.fresh ? `FRESH — ${fmtTime(row.refreshed)}` : row.refreshed ? `STALE — ${fmtTime(row.refreshed)}` : 'UNKNOWN';
    return `| ${scope} | ${row.owner.lifecycle || 'UNKNOWN'} | ${view} | ${freshness} |`;
  });
  return [...head, ...body].join('\n');
}

function renderWriterStatus(rows) {
  if (!rows.length) return '- `UNKNOWN`';
  return rows.map((row) => `- \`${row.id}\`: ${row.summary}`).join('\n');
}

function renderBootstrap(status) {
  if (!status.statuses?.length) return '- `UNKNOWN` — no registered descriptors';
  return status.statuses.map((row) => `- \`${row.id}\`: \`${row.ready ? 'BOOTSTRAP_READY' : 'BOOTSTRAP_INCOMPLETE'}\` / \`${row.profile}\``).join('\n');
}

async function deliveryReceiptSummary(incidentRows) {
  const config = policy.notifications?.receiptTracking || {};
  const baselineProofAt = config.baselineProofAt || null;
  if (config.enabled !== true) return summarizeReceipts([], {baselineProofAt});
  const maxIssues = Number.isInteger(config.maxIncidentIssues) ? config.maxIncidentIssues : 25;
  const candidates = incidentRows
    .filter((row) => row.severity === 'P0' || row.severity === 'P1')
    .sort((a, b) => Date.parse(b.issue.updated_at) - Date.parse(a.issue.updated_at))
    .slice(0, maxIssues);
  const comments = [];
  for (const row of candidates) comments.push(...await listIssueComments(row.issue.number));
  return summarizeReceipts(comments, {baselineProofAt});
}

function renderNotificationStatus(receiptSummary = null) {
  const config = policy.notifications || {};
  const severityText = (config.severities || []).join('/') || 'NONE';
  const channels = (config.channels || []).join(', ') || 'NONE';
  const summary = receiptSummary || summarizeReceipts([], {baselineProofAt: config.receiptTracking?.baselineProofAt});
  return [
    `- Outbox: \`${config.outboxEnabled === true ? 'ACTIVE' : 'DISABLED'}\` — ${severityText} OPEN${config.includeRecovery === true ? ' + RECOVERED' : ''}`,
    `- Channel handoff: \`${channels}\``,
    `- Delivery bridge: \`${config.bridgeState || 'UNKNOWN'}\` / \`${config.deliveryBridge || 'UNKNOWN'}\``,
    `- Bridge health: \`${summary.health}\``,
    `- Last delivery success: ${fmtOptionalTime(summary.lastSuccessAt)}${summary.lastSuccessAt ? '' : summary.baselineProofAt ? ` — baseline proof ${summary.baselineProofAt}` : ''}`,
    `- Last delivery failure: ${fmtOptionalTime(summary.lastFailureAt)}`,
    `- Delivery receipts: ${summary.receiptCount} total / ${summary.unresolvedFailureCount} unresolved failure`,
    `- Unique duplicate suppressions recorded: ${summary.suppressedDuplicateCount}`,
    '- Delivery bridge health is intentionally non-authoritative for release/main health.',
  ].join('\n');
}

async function refresh() {
  await ensureLabels();
  const branch = await api('/branches/main');
  const adapterResult = await observeAll({api, fetchText, mainSha: branch.commit.sha, root: process.cwd()});

  let allIssues = await listIssues('all');
  const touched = await reconcileIncidentEvents(adapterResult.events, allIssues);
  if (touched.length) allIssues = await listIssues('all');
  const openIssues = allIssues.filter((row) => row.state === 'open');

  const projects = ownerRows(openIssues);
  const incidentRows = allIssues.map(incidentFromIssue).filter(Boolean);
  const receiptSummary = await deliveryReceiptSummary(incidentRows);
  const active = incidentRows.filter((row) => row.state === 'OPEN');
  const activeP2 = active.filter((row) => row.severity === 'P2');
  const allProjectViewsFresh = projects.every((row) => row.fresh);
  const configuredCoverageComplete = policy.operations.eventAdaptersComplete === true;
  const observationCoverageValid = adapterResult.coverage.complete === true;
  const freshnessValid = allProjectViewsFresh && configuredCoverageComplete && observationCoverageValid;
  const state = deriveOperatorState({incidents: active, attention: activeP2, freshnessValid});
  const recentRecoveries = incidentRows
    .filter((row) => row.state === 'RECOVERED')
    .sort((a, b) => Date.parse(b.issue.updated_at) - Date.parse(a.issue.updated_at))
    .slice(0, policy.operations.recentRecoveryLimit);

  const body = [
    '# Canonical Main — Operations View',
    '',
    '> Derived repository operations view. This issue is not a production/release authority.',
    '',
    `**Operator state: ${state}**`,
    '',
    '## Canonical main',
    '',
    '- Branch: `main`',
    `- Observed SHA: \`${branch.commit.sha}\``,
    `- Required gate observation: ${adapterResult.requiredCi.summary}`,
    `- Production authority observation: ${adapterResult.productionAuthority.summary}`,
    `- Adapter contract complete: \`${configuredCoverageComplete}\``,
    `- Current adapter observations valid: \`${observationCoverageValid}\``,
    `- Project status freshness valid: \`${allProjectViewsFresh}\``,
    `- Refresh time: ${new Date().toISOString()}`,
    '',
    '## Main-write / durable-memory adapters',
    '',
    renderWriterStatus(adapterResult.writers),
    '',
    '## Notification outbox / external bridge',
    '',
    renderNotificationStatus(receiptSummary),
    '',
    '## Active P0/P1 incidents',
    '',
    renderIncidentRows(active.filter((row) => row.severity === 'P0' || row.severity === 'P1')),
    '',
    '## Attention queue (P2)',
    '',
    renderIncidentRows(activeP2),
    '',
    '## Projects / products',
    '',
    renderProjectTable(projects),
    '',
    '## Bootstrap & durable-memory health',
    '',
    renderBootstrap(adapterResult.bootstrap),
    '- Workstreams without descriptors remain `LEGACY/UNREGISTERED_FOR_STANDARD`.',
    '',
    '## Recent recoveries',
    '',
    renderIncidentRows(recentRecoveries),
    '',
    '<!-- canonical-main-ops-view -->',
  ].join('\n');

  let opsIssue = allIssues.find((row) => row.title === policy.operations.issueTitle);
  if (opsIssue) {
    opsIssue = await api(`/issues/${opsIssue.number}`, {method: 'PATCH', body: {body, state: 'open'}});
    await api(`/issues/${opsIssue.number}/labels`, {method: 'PUT', body: {labels: ['scope:repo', 'control-plane:operations']}});
    console.log(`CANONICAL_MAIN_OPS_UPDATED:#${opsIssue.number}:${state}`);
  } else {
    opsIssue = await api('/issues', {method: 'POST', body: {title: policy.operations.issueTitle, body, labels: ['scope:repo', 'control-plane:operations']}});
    console.log(`CANONICAL_MAIN_OPS_CREATED:#${opsIssue.number}:${state}`);
  }
  for (const row of touched) {
    console.log(`CANONICAL_MAIN_INCIDENT_${row.transition}:#${row.number}:${row.severity}:${row.reason}`);
    if (row.notificationEligible) {
      console.log(`CANONICAL_MAIN_NOTIFICATION_OUTBOX:#${row.number}:${row.severity}:${row.transition}:${row.deliveryKey}`);
    }
  }
}

async function main() {
  const command = process.argv[2];
  if (command !== 'refresh') throw new Error('usage: ops-controller.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  parseRefresh,
  ownerRows,
  incidentFromIssue,
  eventTransition,
  markerForKey,
  markerForEvent,
  renderIncidentBody,
  deliveryReceiptSummary,
  renderNotificationStatus,
};
