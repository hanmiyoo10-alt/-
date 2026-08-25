'use strict';

const fs = require('fs');
const path = require('path');
const {loadPolicy, validateDescriptor} = require('./contract.cjs');
const {repositoryBindingErrors} = require('./bootstrap.cjs');

const START = '<!-- canonical-main-bootstrap-start -->';
const END = '<!-- canonical-main-bootstrap-end -->';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expectedScopes(root = process.cwd()) {
  const registry = readJson(path.join(root, '.github/plugin-control-plane/registry.json'));
  return [
    ...Object.keys(registry.plugins || {}).map((id) => ({kind: 'plugin', id})),
    ...Object.keys(registry.products || {}).map((id) => ({kind: 'product', id})),
  ].sort((a, b) => a.id.localeCompare(b.id));
}

function descriptorCoverage(root = process.cwd()) {
  const descriptorDir = path.join(root, '.github/plugin-control-plane/canonical-main/descriptors');
  const descriptors = fs.readdirSync(descriptorDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({name, descriptor: readJson(path.join(descriptorDir, name))}));
  const byId = new Map(descriptors.map((row) => [row.descriptor.id, row]));
  const expected = expectedScopes(root);
  const rows = expected.map(({kind, id}) => {
    const found = byId.get(id);
    if (!found) return {kind, id, ready: false, profile: 'UNREGISTERED', errors: ['descriptor missing']};
    const errors = [
      ...validateDescriptor(found.descriptor),
      ...repositoryBindingErrors(found.descriptor, root),
    ];
    return {
      kind,
      id,
      ready: errors.length === 0,
      profile: found.descriptor.memory?.profile || 'UNKNOWN',
      errors,
    };
  });
  const expectedIds = new Set(expected.map((row) => row.id));
  const extras = descriptors
    .filter((row) => !expectedIds.has(row.descriptor.id))
    .map((row) => ({
      kind: row.descriptor.kind || 'unknown',
      id: row.descriptor.id || row.name,
      ready: false,
      profile: row.descriptor.memory?.profile || 'UNKNOWN',
      errors: ['descriptor has no operational registry scope'],
    }));
  const allRows = [...rows, ...extras];
  const readyCount = rows.filter((row) => row.ready).length;
  return {
    rows: allRows,
    expectedCount: expected.length,
    registeredCount: rows.filter((row) => row.profile !== 'UNREGISTERED').length,
    readyCount,
    complete: extras.length === 0 && readyCount === expected.length,
  };
}

function renderBootstrapSection(coverage) {
  const rows = coverage.rows.map((row) => {
    const state = row.ready ? 'BOOTSTRAP_READY' : row.profile === 'UNREGISTERED' ? 'UNREGISTERED' : 'BOOTSTRAP_INCOMPLETE';
    const suffix = row.errors.length ? ` — ${row.errors.map((error) => `\`${error}\``).join('; ')}` : '';
    return `- \`${row.id}\`: \`${state}\` / \`${row.profile}\`${suffix}`;
  });
  const unregistered = coverage.rows.filter((row) => row.profile === 'UNREGISTERED').map((row) => row.id);
  return [
    START,
    '## Bootstrap & durable-memory health',
    '',
    `- Coverage: \`${coverage.complete ? 'COMPLETE' : 'INCOMPLETE'}\` — ${coverage.readyCount}/${coverage.expectedCount} operational scopes READY`,
    `- Registered descriptors: ${coverage.registeredCount}/${coverage.expectedCount}`,
    ...rows,
    `- Legacy/unregistered scopes: ${unregistered.length ? unregistered.map((id) => `\`${id}\``).join(', ') : 'none'}`,
    END,
  ].join('\n');
}

function replaceBootstrapSection(body, section) {
  const markerPattern = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (markerPattern.test(body)) return body.replace(markerPattern, section);
  const heading = '## Bootstrap & durable-memory health';
  const start = body.indexOf(heading);
  const next = body.indexOf('\n## Recent recoveries', start >= 0 ? start : 0);
  if (start >= 0 && next >= 0) return `${body.slice(0, start)}${section}${body.slice(next)}`;
  if (start >= 0) return `${body.slice(0, start)}${section}\n`;
  return `${body.trimEnd()}\n\n${section}\n`;
}

async function refresh() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GH_TOKEN/GITHUB_TOKEN and GITHUB_REPOSITORY are required');

  async function api(endpoint, options = {}) {
    const response = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'canonical-main-bootstrap-surface',
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    if (!response.ok) throw new Error(`${options.method || 'GET'} ${endpoint}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
    if (response.status === 204) return null;
    return response.json();
  }

  const policy = loadPolicy();
  const coverage = descriptorCoverage(process.cwd());
  const issues = (await api('/issues?state=open&per_page=100')).filter((row) => !row.pull_request);
  const issue = issues.find((row) => row.title === policy.operations.issueTitle);
  if (!issue) throw new Error(`canonical main operations issue not found: ${policy.operations.issueTitle}`);
  const body = replaceBootstrapSection(issue.body || '', renderBootstrapSection(coverage));
  if (body !== issue.body) await api(`/issues/${issue.number}`, {method: 'PATCH', body: {body}});
  console.log(`CANONICAL_MAIN_BOOTSTRAP_SURFACE:#${issue.number}:${coverage.complete ? 'COMPLETE' : 'INCOMPLETE'}:${coverage.readyCount}/${coverage.expectedCount}`);
}

async function main() {
  if (process.argv[2] !== 'refresh') throw new Error('usage: bootstrap-surface.cjs refresh');
  await refresh();
}

if (require.main === module) main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});

module.exports = {
  START,
  END,
  expectedScopes,
  descriptorCoverage,
  renderBootstrapSection,
  replaceBootstrapSection,
};
