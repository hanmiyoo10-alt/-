#!/usr/bin/env node
'use strict';

const {ALLOWLIST} = require('./promote_release_blobs.cjs');

async function api(repository, endpoint, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    headers: {
      Accept:'application/vnd.github+json',
      Authorization:`Bearer ${token}`,
      'X-GitHub-Api-Version':'2022-11-28',
      'User-Agent':'usage-dashboard-release-parity-smoke',
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${endpoint}:${text.slice(0,300)}`);
  return text ? JSON.parse(text) : {};
}

async function blobMap(repository, ref, token) {
  const commit = await api(repository, `/git/commits/${encodeURIComponent(ref)}`, token);
  const tree = await api(repository, `/git/trees/${commit.tree.sha}?recursive=1`, token);
  const entries = new Map((tree.tree || []).map((entry) => [entry.path, entry]));
  const result = {};
  for (const path of ALLOWLIST) {
    const entry = entries.get(path);
    if (!entry || entry.type !== 'blob' || !entry.sha) throw new Error(`PARITY_ARTIFACT_MISSING:${ref}:${path}`);
    result[path] = entry.sha;
  }
  return result;
}

async function check({repository,candidateSha,releaseBranch,token}) {
  const candidate = await blobMap(repository, candidateSha, token);
  const branch = await api(repository, `/branches/${encodeURIComponent(releaseBranch)}`, token);
  const releaseSha = String(branch?.commit?.sha || '');
  if (!releaseSha) throw new Error('PARITY_RELEASE_REF_MISSING');
  const release = await blobMap(repository, releaseSha, token);
  const changed = ALLOWLIST.filter((path) => candidate[path] !== release[path]);
  if (changed.length) throw new Error(`WOULD_PROMOTE_OR_DIVERGE:${changed.join(',')}`);
  console.log(`WOULD_NOOP_IDENTICAL:${candidateSha}:release=${releaseSha}`);
  return {candidateSha,releaseSha};
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback='') => { const i=args.indexOf(name); return i>=0 ? String(args[i+1]||'') : fallback; };
  const repository = value('--repository', process.env.GITHUB_REPOSITORY || '');
  const candidateSha = value('--candidate-sha', process.env.GITHUB_SHA || '');
  const releaseBranch = value('--release-branch','release-usage-dashboard');
  const token = process.env.GITHUB_TOKEN || '';
  if (!repository || !candidateSha || !token) throw new Error('PARITY_INPUT_MISSING');
  await check({repository,candidateSha,releaseBranch,token});
}

module.exports = {blobMap,check};
if (require.main === module) main().catch((error)=>{ console.error(error?.stack || String(error)); process.exitCode=1; });
