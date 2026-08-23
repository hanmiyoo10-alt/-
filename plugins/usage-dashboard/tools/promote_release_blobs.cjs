#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');

const ALLOWLIST = Object.freeze([
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
  'plugins/usage-dashboard/runtime/product-manifest.json',
]);

function parseVersion(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error(`INVALID_PRODUCT_VERSION:${value}`);
  return {
    core: match.slice(1, 4).map(Number),
    pre: match[4] == null ? null : match[4].split('.').map((part) => /^\d+$/.test(part) ? Number(part) : part),
  };
}

function compareVersions(left, right) {
  const a = parseVersion(left); const b = parseVersion(right);
  for (let i = 0; i < 3; i += 1) if (a.core[i] !== b.core[i]) return a.core[i] < b.core[i] ? -1 : 1;
  if (a.pre == null && b.pre == null) return 0;
  if (a.pre == null) return 1;
  if (b.pre == null) return -1;
  const length = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < length; i += 1) {
    if (a.pre[i] === undefined) return -1;
    if (b.pre[i] === undefined) return 1;
    if (a.pre[i] === b.pre[i]) continue;
    if (typeof a.pre[i] === 'number' && typeof b.pre[i] === 'number') return a.pre[i] < b.pre[i] ? -1 : 1;
    if (typeof a.pre[i] === 'number') return -1;
    if (typeof b.pre[i] === 'number') return 1;
    return String(a.pre[i]).localeCompare(String(b.pre[i]));
  }
  return 0;
}

function tuple(manifest) {
  return [
    manifest?.productVersion,
    manifest?.components?.bridge?.requiredVersion,
    manifest?.components?.bridgeManager?.version,
    manifest?.contracts?.snapshot,
    manifest?.contracts?.recentRequest,
  ];
}

function sameBlobs(a, b) {
  return ALLOWLIST.every((path) => a?.[path]?.sha && a[path].sha === b?.[path]?.sha);
}

function decidePromotion(candidateManifest, releaseManifest, candidateBlobs, releaseBlobs) {
  if (candidateManifest?.product !== 'Local Usage Dashboard' || releaseManifest?.product !== 'Local Usage Dashboard') {
    throw new Error('UNEXPECTED_PRODUCT');
  }
  const cmp = compareVersions(candidateManifest.productVersion, releaseManifest.productVersion);
  if (cmp < 0) return {kind:'stale', reason:'STALE_CANDIDATE_RELEASE'};
  if (cmp === 0) {
    if (sameBlobs(candidateBlobs, releaseBlobs)) return {kind:'noop', reason:'NOOP_IDENTICAL'};
    return {kind:'fail', reason:'SAME_VERSION_ARTIFACT_DIVERGENCE'};
  }
  return {kind:'promote', reason:'ALLOW'};
}

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function validateCandidate(manifest, blobs) {
  const expected = {
    'plugins/usage-dashboard/runtime/bridge-engine.mjs': manifest?.components?.bridge?.sha256,
    'plugins/usage-dashboard/runtime/bridge-manager.cjs': manifest?.components?.bridgeManager?.sha256,
    'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh': manifest?.components?.bridgeManager?.bootstrapSha256,
  };
  for (const path of ALLOWLIST) if (!blobs[path]?.sha) throw new Error(`MISSING_CANDIDATE_BLOB:${path}`);
  for (const [path, declared] of Object.entries(expected)) {
    if (!declared || sha256(blobs[path].bytes) !== declared) throw new Error(`CANDIDATE_SHA256_MISMATCH:${path}`);
  }
  const plugin = blobs['plugins/usage-dashboard/latest.js'].bytes.toString('utf8');
  if (!plugin.includes(`//@version ${manifest.productVersion}`)) throw new Error('CANDIDATE_PLUGIN_VERSION_MISMATCH');
  const engine = blobs['plugins/usage-dashboard/runtime/bridge-engine.mjs'].bytes.toString('utf8');
  if (!engine.includes(`const VERSION = '${manifest.components.bridge.requiredVersion}';`)) throw new Error('CANDIDATE_ENGINE_VERSION_MISMATCH');
  const manager = blobs['plugins/usage-dashboard/runtime/bridge-manager.cjs'].bytes.toString('utf8');
  if (!manager.includes(`const MANAGER_VERSION = '${manifest.components.bridgeManager.version}';`)) throw new Error('CANDIDATE_MANAGER_VERSION_MISMATCH');
  if (!manager.includes(`const PRODUCT_VERSION = '${manifest.productVersion}';`)) throw new Error('CANDIDATE_MANAGER_PRODUCT_MISMATCH');
}

function treeEntries(candidateBlobs) {
  return ALLOWLIST.map((path) => {
    const item = candidateBlobs[path];
    if (!item || item.type !== 'blob' || !item.sha || !item.mode) throw new Error(`INVALID_CANDIDATE_TREE_ENTRY:${path}`);
    return {path, mode:item.mode, type:'blob', sha:item.sha};
  });
}

async function api(method, repository, endpoint, token, body, allow404 = false) {
  const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'usage-dashboard-exact-byte-promoter',
      ...(body ? {'Content-Type':'application/json'} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (allow404 && response.status === 404) return null;
  const text = await response.text();
  if (!response.ok) throw new Error(`GITHUB_API_${response.status}:${endpoint}:${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function readTree(repository, commitSha, token) {
  const commit = await api('GET', repository, `/git/commits/${commitSha}`, token);
  const tree = await api('GET', repository, `/git/trees/${commit.tree.sha}?recursive=1`, token);
  const map = new Map(tree.tree.map((entry) => [entry.path, entry]));
  return {treeSha:commit.tree.sha, map};
}

async function readArtifactSet(repository, ref, token) {
  const {map} = await readTree(repository, ref, token);
  const result = {};
  for (const path of ALLOWLIST) {
    const entry = map.get(path);
    if (!entry || entry.type !== 'blob') throw new Error(`MISSING_ARTIFACT:${ref}:${path}`);
    const blob = await api('GET', repository, `/git/blobs/${entry.sha}`, token);
    result[path] = {
      sha:entry.sha, mode:entry.mode, type:entry.type,
      bytes:Buffer.from(String(blob.content || '').replace(/\n/g, ''), blob.encoding || 'base64'),
    };
  }
  return result;
}

function manifestFrom(blobs) {
  return JSON.parse(blobs['plugins/usage-dashboard/runtime/product-manifest.json'].bytes.toString('utf8'));
}

async function assertNoRuntimeSource(repository, releaseBranch, token) {
  const found = await api('GET', repository, `/contents/plugins/usage-dashboard/runtime-src?ref=${encodeURIComponent(releaseBranch)}`, token, null, true);
  if (found) throw new Error('RELEASE_RUNTIME_SOURCE_PRESENT');
}

function classifyPostVerifyRef(observedSha, releaseBase, expectedSha) {
  if (observedSha === expectedSha) return 'verified';
  if (observedSha === releaseBase) return 'retry';
  return 'mismatch';
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function readGitRefSha(repository, releaseBranch, token) {
  const ref = await api('GET', repository, `/git/ref/heads/${encodeURIComponent(releaseBranch)}`, token);
  return String(ref?.object?.sha || '');
}

async function verifyReleaseRefAfterUpdate({repository, releaseBranch, token, releaseBase, expectedSha, attempts = 5, delayMs = 250}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const observedSha = await readGitRefSha(repository, releaseBranch, token);
    const state = classifyPostVerifyRef(observedSha, releaseBase, expectedSha);
    if (state === 'verified') return observedSha;
    if (state === 'mismatch') throw new Error(`RELEASE_REF_POSTVERIFY_MISMATCH:${observedSha}`);
    if (attempt < attempts) {
      console.log(`RELEASE_REF_POSTVERIFY_RETRY:${attempt}/${attempts}:${observedSha}`);
      await sleep(delayMs);
    }
  }
  throw new Error('RELEASE_REF_POSTVERIFY_MISMATCH:stale-after-retries');
}

async function promote({repository, candidateSha, releaseBranch, token}) {
  const candidate = await readArtifactSet(repository, candidateSha, token);
  const candidateManifest = manifestFrom(candidate);
  validateCandidate(candidateManifest, candidate);

  const releaseRef = await api('GET', repository, `/branches/${encodeURIComponent(releaseBranch)}`, token);
  const releaseBase = releaseRef.commit.sha;
  const release = await readArtifactSet(repository, releaseBase, token);
  const releaseManifest = manifestFrom(release);
  const decision = decidePromotion(candidateManifest, releaseManifest, candidate, release);
  console.log(`${decision.reason}:${candidateManifest.productVersion}:release=${releaseManifest.productVersion}`);
  if (decision.kind === 'stale') return {status:'stale', releaseBase};
  if (decision.kind === 'noop') {
    await assertNoRuntimeSource(repository, releaseBranch, token);
    return {status:'noop', releaseBase};
  }
  if (decision.kind === 'fail') throw new Error(decision.reason);

  const releaseCommit = await api('GET', repository, `/git/commits/${releaseBase}`, token);
  const candidateTree = await readTree(repository, candidateSha, token);
  const candidateEntries = {};
  for (const path of ALLOWLIST) candidateEntries[path] = {...candidate[path], ...candidateTree.map.get(path)};
  const newTree = await api('POST', repository, '/git/trees', token, {base_tree:releaseCommit.tree.sha, tree:treeEntries(candidateEntries)});
  const newCommit = await api('POST', repository, '/git/commits', token, {
    message:`release: promote Local Usage Dashboard ${candidateManifest.productVersion} exact artifacts`,
    tree:newTree.sha,
    parents:[releaseBase],
  });

  const beforeUpdateSha = await readGitRefSha(repository, releaseBranch, token);
  if (beforeUpdateSha !== releaseBase) throw new Error('RELEASE_REF_MOVED');
  const updatedRef = await api('PATCH', repository, `/git/refs/heads/${encodeURIComponent(releaseBranch)}`, token, {sha:newCommit.sha, force:false});
  if (updatedRef?.object?.sha && updatedRef.object.sha !== newCommit.sha) throw new Error('RELEASE_REF_UPDATE_ACK_MISMATCH');

  await verifyReleaseRefAfterUpdate({repository, releaseBranch, token, releaseBase, expectedSha:newCommit.sha});
  const published = await readArtifactSet(repository, newCommit.sha, token);
  if (!sameBlobs(candidate, published)) throw new Error('RELEASE_BLOB_IDENTITY_MISMATCH');
  const publishedManifest = manifestFrom(published);
  if (JSON.stringify(tuple(publishedManifest)) !== JSON.stringify(tuple(candidateManifest))) throw new Error('RELEASE_TUPLE_MISMATCH');
  validateCandidate(publishedManifest, published);
  await assertNoRuntimeSource(repository, releaseBranch, token);
  const commitView = await api('GET', repository, `/commits/${newCommit.sha}`, token);
  const unexpected = (commitView.files || []).map((file) => file.filename).filter((path) => !ALLOWLIST.includes(path));
  if (unexpected.length) throw new Error(`UNEXPECTED_RELEASE_PATHS:${unexpected.join(',')}`);
  console.log(`DEPLOYED:${candidateManifest.productVersion}:${newCommit.sha}`);
  return {status:'deployed', releaseBase, commitSha:newCommit.sha};
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback = '') => { const index = args.indexOf(name); return index >= 0 ? String(args[index + 1] || '') : fallback; };
  const repository = value('--repository', process.env.GITHUB_REPOSITORY || '');
  const candidateSha = value('--candidate-sha', process.env.GITHUB_SHA || '');
  const releaseBranch = value('--release-branch', 'release-usage-dashboard');
  const token = process.env.GITHUB_TOKEN || '';
  if (!repository || !candidateSha || !token) throw new Error('PROMOTION_INPUT_MISSING');
  const result = await promote({repository, candidateSha, releaseBranch, token});
  if (result.status === 'stale') process.exitCode = 0;
}

module.exports = {ALLOWLIST, parseVersion, compareVersions, tuple, sameBlobs, decidePromotion, validateCandidate, treeEntries, classifyPostVerifyRef};
if (require.main === module) main().catch((error) => { console.error(error?.stack || String(error)); process.exitCode = 1; });
