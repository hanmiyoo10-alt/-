'use strict';

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
      'User-Agent': 'repository-plugin-control-plane-pr-reconciler',
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
  throw new Error(`PR #${number} file pagination exceeded safety bound`);
}

async function listOpenPrs(repo) {
  const prs = [];
  for (let page = 1; page <= 5; page += 1) {
    const rows = await api(repo, `/pulls?state=open&per_page=100&page=${page}`);
    prs.push(...rows);
    if (rows.length < 100) return prs;
  }
  throw new Error('open PR pagination exceeded 500-item safety bound');
}

async function reconcilePr(repo, pr, registry) {
  const paths = await listPrFiles(repo, pr.number);
  const result = classifyPaths(paths, registry);
  const current = (pr.labels || []).map((label) => label.name);
  const preserved = current.filter((label) => !managedLabel(label, registry));
  const labels = [...new Set([...preserved, ...result.labels])].sort();

  const same = current.length === labels.length && current.every((label) => labels.includes(label));
  if (!same) {
    await api(repo, `/issues/${pr.number}/labels`, {method: 'PUT', body: {labels}});
  }

  console.log(JSON.stringify({
    receipt: 'PLUGIN_CONTROL_PLANE_PR_RECONCILED',
    number: pr.number,
    headSha: pr.head?.sha || 'UNKNOWN',
    changed: !same,
    paths,
    ...result,
    appliedLabels: labels,
  }));
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is required');

  const registry = loadRegistry();
  await ensureLabels(repo, registry);

  const target = process.env.PR_NUMBER ? Number(process.env.PR_NUMBER) : null;
  let prs;
  if (Number.isInteger(target) && target > 0) {
    const pr = await api(repo, `/pulls/${target}`, {allow404: true});
    prs = pr && pr.state === 'open' ? [pr] : [];
  } else {
    prs = await listOpenPrs(repo);
  }

  const errors = [];
  for (const pr of prs) {
    try {
      await reconcilePr(repo, pr, registry);
    } catch (error) {
      errors.push(`#${pr.number}: ${error.message || String(error)}`);
    }
  }

  console.log(`PLUGIN_CONTROL_PLANE_PR_RECONCILE_SUMMARY:${prs.length}:${errors.length}`);
  if (errors.length) throw new Error(`PR reconciliation failures: ${errors.join(' | ')}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
