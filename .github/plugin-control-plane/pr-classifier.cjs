'use strict';

const fs = require('fs');
const {
  loadRegistry,
  classifyPaths,
  managedLabel,
  labelDefinitions,
} = require('./lib.cjs');

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');

async function api(repo, endpoint, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'repository-plugin-control-plane-pr-classifier',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function ensureLabels(repo, registry) {
  for (const def of labelDefinitions(registry)) {
    const existing = await api(repo, `/labels/${encodeURIComponent(def.name)}`, {allow404: true});
    if (!existing) await api(repo, '/labels', {method: 'POST', body: def});
  }
}

async function listPrFiles(repo, number) {
  const paths = [];
  for (let page = 1; page <= 30; page += 1) {
    const rows = await api(repo, `/pulls/${number}/files?per_page=100&page=${page}`);
    paths.push(...rows.map((row) => row.filename));
    if (rows.length < 100) return paths;
  }
  throw new Error('PR file pagination exceeded safety bound');
}

function readEvent() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH is required');
  return JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
}

async function main() {
  const event = readEvent();
  const repo = process.env.GITHUB_REPOSITORY || event?.repository?.full_name;
  if (!repo) throw new Error('repository identity missing');
  if (event?.workflow_run?.event !== 'pull_request') throw new Error('trusted pull_request workflow_run required');

  const linked = event.workflow_run.pull_requests || [];
  if (linked.length !== 1 || !linked[0]?.number) {
    throw new Error(`expected exactly one workflow_run pull request, got ${linked.length}`);
  }
  const number = linked[0].number;
  const pr = await api(repo, `/pulls/${number}`);
  if (pr.state !== 'open') {
    console.log(`PLUGIN_CONTROL_PLANE_PR_SKIP_CLOSED:#${number}`);
    return;
  }

  const registry = loadRegistry();
  const paths = await listPrFiles(repo, number);
  const result = classifyPaths(paths, registry);
  await ensureLabels(repo, registry);

  const current = (pr.labels || []).map((label) => label.name);
  const preserved = current.filter((label) => !managedLabel(label, registry));
  const labels = [...new Set([...preserved, ...result.labels])].sort();
  await api(repo, `/issues/${number}/labels`, {method: 'PUT', body: {labels}});

  console.log(JSON.stringify({
    receipt: 'PLUGIN_CONTROL_PLANE_PR_CLASSIFIED',
    number,
    observedHeadSha: event.workflow_run.head_sha || 'UNKNOWN',
    paths,
    ...result,
    appliedLabels: labels,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
