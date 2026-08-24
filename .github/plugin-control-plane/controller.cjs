'use strict';

const fs = require('fs');
const {
  loadRegistry,
  classifyPaths,
  classifyIssueBody,
  managedLabel,
  labelDefinitions,
} = require('./lib.cjs');

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) throw new Error('GH_TOKEN/GITHUB_TOKEN is required');

async function api(repo, endpoint, options = {}) {
  const method = options.method || 'GET';
  const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'repository-plugin-control-plane',
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (options.allow404 && response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${endpoint}: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function rawApi(urlPath, options = {}) {
  const response = await fetch(`https://api.github.com${urlPath}`, {
    method: options.method || 'GET',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'repository-plugin-control-plane',
    },
  });
  if (!response.ok) throw new Error(`${urlPath}: HTTP ${response.status}`);
  return response.json();
}

function readEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required');
  return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
}

function repoFrom(event) {
  const repo = process.env.GITHUB_REPOSITORY || event?.repository?.full_name;
  if (!repo) throw new Error('repository identity missing');
  return repo;
}

async function ensureLabels(repo, registry) {
  for (const def of labelDefinitions(registry)) {
    const encoded = encodeURIComponent(def.name);
    const existing = await api(repo, `/labels/${encoded}`, {allow404: true});
    if (!existing) {
      await api(repo, '/labels', {method: 'POST', body: def});
    }
  }
}

async function replaceManagedLabels(repo, number, currentLabels, desiredManaged, registry) {
  const preserved = currentLabels.filter((label) => !managedLabel(label, registry));
  const labels = [...new Set([...preserved, ...desiredManaged])].sort();
  await api(repo, `/issues/${number}/labels`, {method: 'PUT', body: {labels}});
  return labels;
}

async function listPrFiles(repo, number) {
  const result = [];
  for (let page = 1; page <= 30; page += 1) {
    const rows = await api(repo, `/pulls/${number}/files?per_page=100&page=${page}`);
    result.push(...rows.map((row) => row.filename));
    if (rows.length < 100) return result;
  }
  throw new Error('PR file pagination exceeded safety bound');
}

async function classifyPr() {
  const event = readEvent();
  const repo = repoFrom(event);
  const registry = loadRegistry();
  const pr = event.pull_request;
  if (!pr?.number) throw new Error('pull_request event required');
  const paths = await listPrFiles(repo, pr.number);
  const result = classifyPaths(paths, registry);
  await ensureLabels(repo, registry);
  const current = (pr.labels || []).map((label) => label.name);
  const labels = await replaceManagedLabels(repo, pr.number, current, result.labels, registry);
  console.log(JSON.stringify({kind: 'pr', number: pr.number, paths, ...result, appliedLabels: labels}, null, 2));
}

async function classifyIssue() {
  const event = readEvent();
  const repo = repoFrom(event);
  const registry = loadRegistry();
  const issue = event.issue;
  if (!issue?.number || issue.pull_request) throw new Error('issue event required');
  await ensureLabels(repo, registry);

  const bodyResult = classifyIssueBody(issue.body || '', registry);
  const current = (issue.labels || []).map((label) => label.name);
  let desired = bodyResult.labels;
  if (!bodyResult.explicit) {
    desired = current.filter((label) => managedLabel(label, registry));
    if (!desired.some((label) => label.startsWith('plugin:') || label.startsWith('scope:'))) {
      desired = ['scope:unclassified'];
    }
  }
  const labels = await replaceManagedLabels(repo, issue.number, current, desired, registry);
  console.log(JSON.stringify({kind: 'issue', number: issue.number, explicit: bodyResult.explicit, appliedLabels: labels}, null, 2));
}

function decodeContent(row) {
  return Buffer.from(row.content || '', row.encoding || 'base64').toString('utf8');
}

async function fetchContent(repo, path, ref = 'main') {
  const row = await api(repo, `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, {allow404: true});
  if (!row || Array.isArray(row) || !row.content) return null;
  return decodeContent(row);
}

async function branchHead(repo, branch) {
  const row = await api(repo, `/branches/${encodeURIComponent(branch)}`, {allow404: true});
  return row?.commit?.sha || null;
}

function parsePluginVersion(source) {
  if (!source) return null;
  const match = source.match(/^\s*\/\/@version\s+([^\s]+)\s*$/m)
    || source.match(/^\s*\/\/@version\s*=\s*([^\s]+)\s*$/m);
  return match ? match[1] : null;
}

async function usageDashboardStatus(repo, plugin) {
  const branch = plugin.authority.releaseBranch;
  const productionSha = await branchHead(repo, branch);
  const source = await fetchContent(repo, plugin.authority.artifact, branch);
  const version = parsePluginVersion(source);
  let spec = null;
  if (version) {
    const match = version.match(/alpha\.(\d+\.\d+)$/);
    if (match) {
      const raw = await fetchContent(repo, `${plugin.authority.releaseSpecDir}/${match[1]}.json`, 'main');
      if (raw) {
        try { spec = JSON.parse(raw); } catch (_) { spec = null; }
      }
    }
  }
  const baseline = spec?.verifiedBaseline || 'UNKNOWN';
  const physical = version && baseline !== 'UNKNOWN' && baseline.includes(version)
    ? `VERIFIED — ${baseline}`
    : baseline === 'UNKNOWN' ? 'UNKNOWN' : `PENDING — ${baseline}`;
  return [
    ['Lifecycle', plugin.lifecycle],
    ['Production version', version || 'UNKNOWN'],
    ['Production branch', branch],
    ['Production SHA', productionSha || 'UNKNOWN'],
    ['Engine', spec?.engineVersion || 'UNKNOWN'],
    ['Manager', spec?.managerVersion || 'UNKNOWN'],
    ['Contracts', spec ? `${spec.snapshotContract} / ${spec.recentRequestContract}` : 'UNKNOWN'],
    ['Physical verification', physical],
  ];
}

async function simcoreStatus(repo, plugin) {
  const raw = await fetchContent(repo, plugin.authority.manifest, 'main');
  if (!raw) return [['Lifecycle', plugin.lifecycle], ['Production version', 'UNKNOWN'], ['Authority', 'manifest missing']];
  let manifest;
  try { manifest = JSON.parse(raw); } catch (_) { return [['Lifecycle', plugin.lifecycle], ['Production version', 'UNKNOWN'], ['Authority', 'manifest invalid']]; }
  const branch = manifest.release_branch || 'UNKNOWN';
  const actualHead = branch === 'UNKNOWN' ? null : await branchHead(repo, branch);
  const recorded = manifest.release_commit || 'UNKNOWN';
  const parity = actualHead && recorded !== 'UNKNOWN' ? (actualHead === recorded ? 'MATCH' : 'MISMATCH') : 'UNKNOWN';
  return [
    ['Lifecycle', plugin.lifecycle],
    ['Production version', manifest.production_version || 'UNKNOWN'],
    ['Release branch', branch],
    ['Recorded release SHA', recorded],
    ['Actual release head', actualHead || 'UNKNOWN'],
    ['Release identity', parity],
    ['Validation', manifest.validation_status || 'UNKNOWN'],
    ['Current priority', manifest.current_priority || 'UNKNOWN'],
  ];
}

async function devpassStatus(repo, plugin) {
  const declaration = await fetchContent(repo, plugin.authority.declaredBy, 'main');
  const artifact = await fetchContent(repo, plugin.authority.artifact, plugin.authority.ref || 'main');
  const version = parsePluginVersion(artifact);
  return [
    ['Lifecycle', plugin.lifecycle],
    ['Declared update channel', declaration ? plugin.authority.artifact : 'UNKNOWN'],
    ['Production version', version || 'UNKNOWN'],
    ['Artifact state', artifact ? 'PRESENT' : 'DECLARED_MISSING'],
    ['Authority ref', plugin.authority.ref || 'main'],
  ];
}

async function prototypeStatus(repo, plugin) {
  const evidence = await fetchContent(repo, plugin.authority.evidence, 'main');
  const explicitNoProduction = evidence && /not[^\n]*production release/i.test(evidence);
  return [
    ['Lifecycle', plugin.lifecycle],
    ['Production version', 'N/A'],
    ['Production authority', explicitNoProduction ? 'NONE — source explicitly marks this as non-production prototype' : 'UNKNOWN'],
    ['Evidence', plugin.authority.evidence],
  ];
}

async function statusFor(repo, plugin) {
  if (plugin.statusAdapter === 'usage-dashboard') return usageDashboardStatus(repo, plugin);
  if (plugin.statusAdapter === 'simcore') return simcoreStatus(repo, plugin);
  if (plugin.statusAdapter === 'devpass') return devpassStatus(repo, plugin);
  if (plugin.statusAdapter === 'prototype') return prototypeStatus(repo, plugin);
  return [['Lifecycle', plugin.lifecycle || 'UNKNOWN'], ['Status adapter', 'UNKNOWN']];
}

async function searchCount(query) {
  const row = await rawApi(`/search/issues?q=${encodeURIComponent(query)}&per_page=1`);
  return row.total_count || 0;
}

async function findStatusIssue(repo, pluginId) {
  const labels = encodeURIComponent(`control-plane:status,plugin:${pluginId}`);
  const rows = await api(repo, `/issues?state=all&labels=${labels}&per_page=100`);
  const title = `[plugin-status:${pluginId}]`;
  return rows.find((issue) => !issue.pull_request && issue.title === title) || null;
}

function table(rows) {
  return ['| Field | Value |', '| --- | --- |', ...rows.map(([key, value]) => `| ${key} | ${String(value).replace(/\|/g, '\\|')} |`)].join('\n');
}

async function refreshStatus() {
  const event = process.env.GITHUB_EVENT_PATH && fs.existsSync(process.env.GITHUB_EVENT_PATH) ? readEvent() : {};
  const repo = repoFrom(event);
  const registry = loadRegistry();
  await ensureLabels(repo, registry);
  const only = process.env.PLUGIN_ID || null;

  for (const [id, plugin] of Object.entries(registry.plugins)) {
    if (only && id !== only) continue;
    const rows = await statusFor(repo, plugin);
    const openPrs = await searchCount(`repo:${repo} is:pr is:open label:"plugin:${id}"`);
    const openIssues = await searchCount(`repo:${repo} is:issue is:open label:"plugin:${id}" -label:"control-plane:status"`);
    const prUrl = `https://github.com/${repo}/pulls?q=is%3Aopen+label%3A%22plugin%3A${encodeURIComponent(id)}%22`;
    const issueUrl = `https://github.com/${repo}/issues?q=is%3Aopen+is%3Aissue+label%3A%22plugin%3A${encodeURIComponent(id)}%22+-label%3A%22control-plane%3Astatus%22`;
    const body = [
      `# ${plugin.displayName} — Operational View`,
      '',
      '> Generated by the repository Plugin Control Plane. This issue is a view over plugin-owned authorities, not a source of truth.',
      '',
      '## Authority status',
      '',
      table(rows),
      '',
      '## Work',
      '',
      `- Open PRs: **${openPrs}** — ${prUrl}`,
      `- Open issues: **${openIssues}** — ${issueUrl}`,
      '',
      '## Scope',
      '',
      `- Label: \`plugin:${id}\``,
      `- Lifecycle: \`${plugin.lifecycle}\``,
      '',
      `Last refreshed: ${new Date().toISOString()}`,
      '',
      '<!-- plugin-control-plane-status -->',
    ].join('\n');

    const existing = await findStatusIssue(repo, id);
    if (existing) {
      await api(repo, `/issues/${existing.number}`, {method: 'PATCH', body: {body, state: 'open'}});
      const current = (existing.labels || []).map((label) => label.name);
      await replaceManagedLabels(repo, existing.number, current, [`plugin:${id}`, 'control-plane:status'], registry);
      console.log(`UPDATED_STATUS:${id}:#${existing.number}`);
    } else {
      const created = await api(repo, '/issues', {method: 'POST', body: {
        title: `[plugin-status:${id}]`,
        body,
        labels: [`plugin:${id}`, 'control-plane:status'],
      }});
      console.log(`CREATED_STATUS:${id}:#${created.number}`);
    }
  }
}

async function main() {
  const command = process.argv[2];
  if (command === 'classify-pr') return classifyPr();
  if (command === 'classify-issue') return classifyIssue();
  if (command === 'refresh-status') return refreshStatus();
  throw new Error(`unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
