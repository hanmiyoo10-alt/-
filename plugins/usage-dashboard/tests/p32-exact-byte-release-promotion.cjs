const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const promoter = require('../tools/promote_release_blobs.cjs');
const {assertCurrentReleaseArtifacts} = require('./helpers/current-release.cjs');
const currentRelease = assertCurrentReleaseArtifacts();

const expectedAllowlist = [
  'plugins/usage-dashboard/latest.js',
  'plugins/usage-dashboard/runtime/bridge-engine.mjs',
  'plugins/usage-dashboard/runtime/bridge-manager.cjs',
  'plugins/usage-dashboard/runtime/bootstrap-bridge-manager.sh',
  'plugins/usage-dashboard/runtime/product-manifest.json',
];
assert.deepEqual(promoter.ALLOWLIST, expectedAllowlist);
assert.equal(promoter.compareVersions('3.0.0-alpha.5.68', '3.0.0-alpha.5.69'), -1);
assert.equal(promoter.compareVersions('3.0.0-alpha.5.69', '3.0.0-alpha.5.69'), 0);
assert.equal(promoter.compareVersions('3.0.0-alpha.5.70', '3.0.0-alpha.5.69'), 1);
assert.equal(promoter.compareVersions('3.0.0', '3.0.0-alpha.5.99'), 1);

function blobs(prefix) {
  return Object.fromEntries(expectedAllowlist.map((path, index) => [path, {
    sha:`${prefix}-${index}`,
    mode:path.endsWith('.sh') ? '100755' : '100644',
    type:'blob',
    bytes:Buffer.from(`${prefix}:${path}`),
  }]));
}
function manifest(version) {
  return {
    product:'Local Usage Dashboard', productVersion:version,
    components:{bridge:{requiredVersion:'1.6.20'},bridgeManager:{version:'1.3.0'}},
    contracts:{snapshot:1,recentRequest:1},
  };
}

const release = blobs('release');
const candidate = blobs('candidate');
assert.deepEqual(promoter.decidePromotion(manifest('3.0.0-alpha.5.70'), manifest('3.0.0-alpha.5.69'), candidate, release), {kind:'promote',reason:'ALLOW'});
assert.deepEqual(promoter.decidePromotion(manifest('3.0.0-alpha.5.68'), manifest('3.0.0-alpha.5.69'), candidate, release), {kind:'stale',reason:'STALE_CANDIDATE_RELEASE'});
assert.deepEqual(promoter.decidePromotion(manifest('3.0.0-alpha.5.69'), manifest('3.0.0-alpha.5.69'), release, release), {kind:'noop',reason:'NOOP_IDENTICAL'});
assert.deepEqual(promoter.decidePromotion(manifest('3.0.0-alpha.5.69'), manifest('3.0.0-alpha.5.69'), candidate, release), {kind:'fail',reason:'SAME_VERSION_ARTIFACT_DIVERGENCE'});
assert.throws(() => promoter.decidePromotion({...manifest('3.0.0-alpha.5.70'),product:'Other'}, manifest('3.0.0-alpha.5.69'), candidate, release), /UNEXPECTED_PRODUCT/);
assert.deepEqual(promoter.treeEntries(candidate).map((entry) => entry.path), expectedAllowlist);
assert.throws(() => promoter.treeEntries({...candidate,[expectedAllowlist[0]]:{type:'blob'}}), /INVALID_CANDIDATE_TREE_ENTRY/);

assert.equal(promoter.classifyPostVerifyRef('new-sha', 'old-sha', 'new-sha'), 'verified');
assert.equal(promoter.classifyPostVerifyRef('old-sha', 'old-sha', 'new-sha'), 'retry');
assert.equal(promoter.classifyPostVerifyRef('third-party-sha', 'old-sha', 'new-sha'), 'mismatch');

const engine = Buffer.from("const VERSION = '1.6.20';\n");
const manager = Buffer.from("const MANAGER_VERSION = '1.3.0';\nconst PRODUCT_VERSION = '3.0.0-alpha.5.69';\n");
const bootstrap = Buffer.from('#!/bin/sh\n');
const latest = Buffer.from('//@version 3.0.0-alpha.5.69\n');
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const realManifest = {
  product:'Local Usage Dashboard', productVersion:'3.0.0-alpha.5.69',
  components:{
    bridge:{requiredVersion:'1.6.20',sha256:hash(engine)},
    bridgeManager:{version:'1.3.0',sha256:hash(manager),bootstrapSha256:hash(bootstrap)},
  },
  contracts:{snapshot:1,recentRequest:1},
};
const valid = {
  [expectedAllowlist[0]]:{sha:'a',mode:'100644',type:'blob',bytes:latest},
  [expectedAllowlist[1]]:{sha:'b',mode:'100644',type:'blob',bytes:engine},
  [expectedAllowlist[2]]:{sha:'c',mode:'100644',type:'blob',bytes:manager},
  [expectedAllowlist[3]]:{sha:'d',mode:'100755',type:'blob',bytes:bootstrap},
  [expectedAllowlist[4]]:{sha:'e',mode:'100644',type:'blob',bytes:Buffer.from(JSON.stringify(realManifest))},
};
assert.doesNotThrow(() => promoter.validateCandidate(realManifest, valid));
assert.throws(() => promoter.validateCandidate(realManifest, {...valid,[expectedAllowlist[1]]:{...valid[expectedAllowlist[1]],bytes:Buffer.from('mutated')}}), /CANDIDATE_SHA256_MISMATCH/);

const workflowPath = currentRelease.publisherWorkflow;
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /permissions:\s*\n\s*contents: write/);
assert.match(workflow, /group: usage-dashboard-release/);
assert.match(workflow, /candidate_sha/);
assert.match(workflow, /promote_release_blobs\.cjs/);
for (const forbidden of ['repo-main-write.py','git switch','git push','cp -R','build_bridge_engine.cjs','build_usage_dashboard.cjs','materializer','--write']) {
  assert.ok(!workflow.includes(forbidden), `exact-byte promoter workflow must not contain ${forbidden}`);
}
const tool = fs.readFileSync('plugins/usage-dashboard/tools/promote_release_blobs.cjs', 'utf8');
assert.ok(tool.includes('base_tree:releaseCommit.tree.sha'));
assert.ok(tool.includes('parents:[releaseBase]'));
assert.ok(tool.includes('force:false'));
assert.ok(tool.includes('RELEASE_REF_MOVED'));
assert.ok(tool.includes('RELEASE_REF_UPDATE_ACK_MISMATCH'));
assert.ok(tool.includes('RELEASE_REF_POSTVERIFY_RETRY'));
assert.ok(tool.includes('RELEASE_REF_POSTVERIFY_MISMATCH'));
assert.ok(tool.includes('/git/ref/heads/'));
assert.ok(tool.includes('attempts = 5'));
assert.ok(tool.includes('delayMs = 250'));
assert.ok(tool.includes('RELEASE_BLOB_IDENTITY_MISMATCH'));
assert.ok(tool.includes('RELEASE_RUNTIME_SOURCE_PRESENT'));
assert.ok(tool.includes('UNEXPECTED_RELEASE_PATHS'));
assert.ok(tool.includes('SAME_VERSION_ARTIFACT_DIVERGENCE'));

console.log('usage-dashboard P32 exact-byte release promotion: OK · allowlist, monotonic decisions, bounded Git-ref postverify, Git-tree promotion, no-rebuild authority locked');
