'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy, deriveOperatorState} = require('./contract.cjs');

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'registry.json'), 'utf8'));
const policy = loadPolicy();
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error('GITHUB_REPOSITORY is required');

async function api(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'canonical-main-ops-controller',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  if (response.status === 204) return null;
  return response.json();
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
    return {
      kind,
      id,
      owner,
      issue,
      refreshed,
      fresh,
    };
  });
}

function incidentFromIssue(issue) {
  const labels = (issue.labels || []).map((label) => typeof label === 'string' ? label : label.name);
  if (!labels.includes('control-plane:incident')) return null;
  const severityLabel = labels.find((label) => /^severity:P[0-3]$/.test(label));
  const state = labels.includes('incident:recovered') ? 'RECOVERED' : labels.includes('incident:open') ? 'OPEN' : 'UNKNOWN';
  return {
    issue,
    severity: severityLabel ? severityLabel.split(':')[1] : 'P2',
    state,
  };
}

function fmtTime(ms) {
  return ms === null ? 'UNKNOWN' : new Date(ms).toISOString();
}

function renderIncidentRows(incidents) {
  if (!incidents.length) return '- none observed within the current event-adapter coverage';
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

async function refresh() {
  await ensureLabels();
  const [branch, openIssues, allIssues] = await Promise.all([
    api('/branches/main'),
    listIssues('open'),
    listIssues('all'),
  ]);

  const projects = ownerRows(openIssues);
  const incidentRows = allIssues.map(incidentFromIssue).filter(Boolean);
  const active = incidentRows.filter((row) => row.state === 'OPEN');
  const activeP2 = active.filter((row) => row.severity === 'P2');
  const allProjectViewsFresh = projects.every((row) => row.fresh);
  const eventCoverageComplete = policy.operations.eventAdaptersComplete === true;
  const freshnessValid = allProjectViewsFresh && eventCoverageComplete;
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
    `- Branch: \`main\``,
    `- Observed SHA: \`${branch.commit.sha}\``,
    '- Required gate observation: `UNKNOWN` (branch-level adapter not enabled in Phase A)',
    '- Main-write incident coverage: `UNKNOWN` (event adapters not enabled in Phase A)',
    `- Event adapter coverage complete: \`${eventCoverageComplete}\``,
    `- Project status freshness valid: \`${allProjectViewsFresh}\``,
    `- Refresh time: ${new Date().toISOString()}`,
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
    '- Phase A contract engine: `IMPLEMENTED`',
    '- Existing workstreams: `LEGACY/UNREGISTERED_FOR_STANDARD` until descriptors are adopted',
    '- Writable memory adapters: `NOT ENABLED BY THIS PHASE`',
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

module.exports = {parseRefresh, ownerRows, incidentFromIssue};
