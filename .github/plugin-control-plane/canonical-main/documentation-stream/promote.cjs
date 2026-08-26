#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { eventsFromComments, renderDecisionLog, renderChangeLog, renderProjectCatalog, renderArchitectureSnapshot } = require('./render.cjs');

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(__dirname, '../policy.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '../../registry.json'), 'utf8'));

async function api(route) {
  const token = process.env.GITHUB_TOKEN; const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const response = await fetch(`https://api.github.com${route}`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' } });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.json();
}
async function allComments(repo, issueNumber) {
  const comments = [];
  for (let page = 1; page <= 50; page += 1) { const batch = await api(`/repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`); comments.push(...batch); if (batch.length < 100) break; }
  return comments;
}
function writeIfChanged(file, content) {
  const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); const old = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  if (old === content) return false; fs.writeFileSync(full, content); return true;
}
async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const comments = await allComments(repo, config.liveIssueNumber);
  const events = eventsFromComments(comments);
  const branch = await api(`/repos/${repo}/branches/main`);
  const outputs = {
    [config.durableOutputs.decisionLog]: renderDecisionLog(events),
    [config.durableOutputs.changeLog]: renderChangeLog(events),
    [config.durableOutputs.architectureSnapshot]: renderArchitectureSnapshot({ policy, registry, config, branch }),
    [config.durableOutputs.projectCatalog]: renderProjectCatalog({ registry, root }),
  };
  const changed = [];
  for (const [file, content] of Object.entries(outputs)) if (writeIfChanged(file, content)) changed.push(file);
  console.log(`CANONICAL_MAIN_DOC_PROMOTION:EVENTS:${events.length}`);
  console.log(`CANONICAL_MAIN_DOC_PROMOTION:CHANGED:${changed.join(',') || 'NONE'}`);
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
