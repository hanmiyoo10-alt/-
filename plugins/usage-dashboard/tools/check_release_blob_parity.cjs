#!/usr/bin/env node
'use strict';

const {LEGACY_ROOT, TARGET_ROOT, artifactPathsForRoot} = require('./release_path_profile.cjs');
const {ALLOWLIST, assertMirrorState} = require('./promote_release_blobs.cjs');

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

async function treeMap(repository, ref, token) {
  const commit = await api(repository, `/git/commits/${encodeURIComponent(ref)}`, token);
  const tree = await api(repository, `/git/trees/${commit.tree.sha}?recursive=1`, token);
  return new Map((tree.tree || []).map((entry) => [entry.path, entry]));
}

function blobMapFromTree(entries, root = LEGACY_ROOT, {allowMissing = false} = {}) {
  const result = {};
  for (const artifactPath of artifactPathsForRoot(root)) {
    const entry = entries.get(artifactPath);
    if (!entry || entry.type !== 'blob' || !entry.sha) {
      if (allowMissing) continue;
      throw new Error(`PARITY_ARTIFACT_MISSING:${artifactPath}`);
    }
    result[artifactPath] = entry.sha;
  }
  return result;
}

async function blobMap(repository, ref, token, root = LEGACY_ROOT, options = {}) {
  const entries = await treeMap(repository, ref, token);
  try {
    return blobMapFromTree(entries, root, options);
  } catch (error) {
    if (String(error?.message || '').startsWith('PARITY_ARTIFACT_MISSING:')) {
      const artifactPath = String(error.message).slice('PARITY_ARTIFACT_MISSING:'.length);
      throw new Error(`PARITY_ARTIFACT_MISSING:${ref}:${artifactPath}`);
    }
    throw error;
  }
}

function asBlobObjects(shaMap) {
  return Object.fromEntries(Object.entries(shaMap || {}).map(([path, sha]) => [path, {sha}]));
}

async function check({repository,candidateSha,releaseBranch,token}) {
  const candidate = await blobMap(repository, candidateSha, token, LEGACY_ROOT);
  const branch = await api(repository, `/branches/${encodeURIComponent(releaseBranch)}`, token);
  const releaseSha = String(branch?.commit?.sha || '');
  if (!releaseSha) throw new Error('PARITY_RELEASE_REF_MISSING');

  const releaseEntries = await treeMap(repository, releaseSha, token);
  const release = blobMapFromTree(releaseEntries, LEGACY_ROOT);
  const target = blobMapFromTree(releaseEntries, TARGET_ROOT, {allowMissing:true});
  const mirror = assertMirrorState(asBlobObjects(release), asBlobObjects(target));

  const changed = ALLOWLIST.filter((artifactPath) => candidate[artifactPath] !== release[artifactPath]);
  if (changed.length) throw new Error(`WOULD_PROMOTE_OR_DIVERGE:${changed.join(',')}`);
  console.log(`WOULD_NOOP_IDENTICAL:${candidateSha}:release=${releaseSha}:mirror=${mirror.state}`);
  return {candidateSha,releaseSha,mirrorState:mirror.state};
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

module.exports = {treeMap,blobMapFromTree,blobMap,asBlobObjects,check};
if (require.main === module) main().catch((error)=>{ console.error(error?.stack || String(error)); process.exitCode=1; });
