'use strict';

const fs = require('fs');
const path = require('path');
const {deriveBridgeHealth, renderBridgeHealth} = require('./bridge-health.cjs');

const policy = JSON.parse(fs.readFileSync(path.join(__dirname, 'policy.json'), 'utf8'));
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');
const repo = process.env.GITHUB_REPOSITORY;
if (!repo) throw new Error('GITHUB_REPOSITORY is required');

const START = '<!-- canonical-main-mail-bridge-summary:start -->';
const END = '<!-- canonical-main-mail-bridge-summary:end -->';

async function api(endpoint, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'canonical-main-bridge-health-sync',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
  if (response.status === 204) return null;
  return response.json();
}

async function listOpenIssues() {
  const rows = [];
  for (let page = 1; page <= 5; page += 1) {
    const batch = await api(`/issues?state=open&per_page=100&page=${page}`);
    rows.push(...batch.filter((row) => !row.pull_request));
    if (batch.length < 100) return rows;
  }
  throw new Error('issue pagination exceeded safety bound');
}

function renderSection(health, issue) {
  return [
    START,
    '## Delivery bridge health',
    '',
    renderBridgeHealth(health, issue?.number || null),
    '',
    END,
  ].join('\n');
}

function upsertSection(body, section) {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start >= 0 && end > start) {
    return `${body.slice(0, start)}${section}${body.slice(end + END.length)}`;
  }
  const anchor = '\n## Active P0/P1 incidents\n';
  const index = body.indexOf(anchor);
  if (index >= 0) return `${body.slice(0, index)}\n${section}\n${body.slice(index)}`;
  return `${body.trimEnd()}\n\n${section}\n`;
}

async function sync() {
  const issues = await listOpenIssues();
  const ops = issues.find((row) => row.title === policy.operations.issueTitle);
  if (!ops) throw new Error(`operations issue missing: ${policy.operations.issueTitle}`);
  const healthTitle = policy.notifications.bridgeHealthIssueTitle || '[repo-mail-bridge]';
  const healthIssue = issues.find((row) => row.title === healthTitle) || null;
  const health = deriveBridgeHealth(
    healthIssue,
    Date.now(),
    Number(policy.notifications.bridgeHealthFreshnessMinutes || 150),
  );
  const section = renderSection(health, healthIssue);
  const body = upsertSection(ops.body || '', section);
  if (body === ops.body) {
    console.log(`CANONICAL_MAIN_BRIDGE_HEALTH_NOOP:${health.state}`);
    return;
  }
  await api(`/issues/${ops.number}`, {method: 'PATCH', body: {body}});
  console.log(`CANONICAL_MAIN_BRIDGE_HEALTH_SYNCED:#${ops.number}:${health.state}`);
}

async function main() {
  if (process.argv[2] !== 'sync') throw new Error('usage: bridge-health-sync.cjs sync');
  await sync();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {START, END, renderSection, upsertSection};
