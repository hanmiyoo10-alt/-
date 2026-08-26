#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { normalizeEvent, incidentEventFromIssue, renderLiveComment } = require('./event.cjs');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
async function api(route, options = {}) {
  const token = process.env.GITHUB_TOKEN; if (!token) throw new Error('GITHUB_TOKEN is required');
  const response = await fetch(`https://api.github.com${route}`, { ...options, headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28', 'content-type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null; return response.json();
}
async function existingEventIds(repo, issueNumber) {
  const ids = new Set();
  for (let page = 1; page <= 10; page += 1) {
    const comments = await api(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`);
    for (const comment of comments) { const match = String(comment.body || '').match(/- Event ID: `([0-9a-f]{64})`/); if (match) ids.add(match[1]); }
    if (comments.length < 100) break;
  }
  return ids;
}
async function recordEvent(repo, existing, event) {
  if (!event || event.stable !== true || existing.has(event.eventId)) return false;
  await api(`/repos/${repo}/issues/${config.liveIssueNumber}/comments`, { method: 'POST', body: JSON.stringify({ body: renderLiveComment(event) }) });
  existing.add(event.eventId);
  console.log(`CANONICAL_MAIN_DOC_STREAM:RECORDED:${event.eventClass}:${event.eventId}`);
  return true;
}
async function scanIncidents(repo, existing) {
  const issues = await api(`/repos/${repo}/issues?state=all&labels=control-plane%3Aincident&sort=updated&direction=desc&per_page=25`);
  let recorded = 0;
  for (const issue of issues) if (await recordEvent(repo, existing, incidentEventFromIssue(issue))) recorded += 1;
  console.log(`CANONICAL_MAIN_DOC_STREAM:INCIDENT_SCAN:${recorded}`);
}
async function main() {
  const eventName = process.env.GITHUB_EVENT_NAME; const eventPath = process.env.GITHUB_EVENT_PATH; const repo = process.env.GITHUB_REPOSITORY;
  if (!eventName || !eventPath || !repo) throw new Error('GitHub event environment is incomplete');
  const payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const issue = await api(`/repos/${repo}/issues/${config.liveIssueNumber}`);
  if (issue.title !== config.liveIssueTitle) throw new Error(`Documentation stream issue mismatch: #${config.liveIssueNumber}`);
  const existing = await existingEventIds(repo, config.liveIssueNumber);

  if (eventName === 'workflow_run') {
    if (payload.workflow_run?.name !== 'Canonical Main Operations' || payload.workflow_run?.conclusion !== 'success') {
      console.log('CANONICAL_MAIN_DOC_STREAM:WORKFLOW_RUN_IGNORED'); return;
    }
    await scanIncidents(repo, existing); return;
  }

  const event = normalizeEvent({ eventName, payload, repository: repo });
  if (!event) { console.log('CANONICAL_MAIN_DOC_STREAM:IGNORED'); return; }
  if (existing.has(event.eventId)) { console.log(`CANONICAL_MAIN_DOC_STREAM:DUPLICATE:${event.eventId}`); return; }
  await recordEvent(repo, existing, event);
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
