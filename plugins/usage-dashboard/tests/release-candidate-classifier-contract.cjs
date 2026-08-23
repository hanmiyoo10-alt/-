'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const classifier = require('../tools/classify_release_candidate.cjs');
const {ALLOWLIST} = require('../tools/promote_release_blobs.cjs');

const sameA = Object.fromEntries(ALLOWLIST.map((path, index) => [path, `a${String(index).padStart(39,'0')}`.slice(0,40)]));
const sameB = {...sameA};
assert.equal(classifier.classifyBlobMaps(sameA, sameB).classification, 'MAINTENANCE_ONLY');
const changed = {...sameA, [ALLOWLIST[0]]:'b'.repeat(40)};
assert.equal(classifier.classifyBlobMaps(sameA, changed).classification, 'RELEASE_CANDIDATE');
assert.deepEqual(classifier.classifyBlobMaps(sameA, changed).changedArtifacts, [ALLOWLIST[0]]);
assert.throws(() => classifier.classifyBlobMaps({}, changed), /CLASSIFIER_ARTIFACT_MISSING/);
assert.equal(classifier.releaseControlChangedForPaths(['docs/USAGE_DASHBOARD_GUIDELINES.md']), false);
assert.equal(classifier.releaseControlChangedForPaths(['plugins/usage-dashboard/tools/promote_release_blobs.cjs']), true);

const classifierSource = fs.readFileSync('plugins/usage-dashboard/tools/classify_release_candidate.cjs','utf8');
assert.match(classifierSource, /require\('\.\/promote_release_blobs\.cjs'\)/);
assert.match(classifierSource, /rev-list','--parents','-n','1'/);
assert.match(classifierSource, /CLASSIFIER_PARENT_MISSING/);
assert.match(classifierSource, /CLASSIFIER_ARTIFACT_MISSING/);
assert.doesNotMatch(classifierSource, /release-usage-dashboard.*write|force:true/i);

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-promote.yml','utf8');
assert.match(workflow, /^permissions:\n  contents: read$/m);
assert.match(workflow, /^  classify:/m);
assert.match(workflow, /classification == 'MAINTENANCE_ONLY'/);
assert.match(workflow, /release_control_changed == 'true'/);
assert.match(workflow, /check_release_blob_parity\.cjs/);
assert.match(workflow, /classification == 'RELEASE_CANDIDATE'/);
assert.match(workflow, /candidate_sha: \$\{\{ github\.event\.pull_request\.merge_commit_sha \}\}/);
assert.match(workflow, /^    permissions:\n      contents: write$/m);
assert.equal((workflow.match(/contents: write/g) || []).length, 1, 'only release promotion job may request write');

const smoke = fs.readFileSync('plugins/usage-dashboard/tools/check_release_blob_parity.cjs','utf8');
assert.match(smoke, /require\('\.\/promote_release_blobs\.cjs'\)/);
assert.match(smoke, /WOULD_NOOP_IDENTICAL/);
assert.doesNotMatch(smoke, /method:\s*['"](?:POST|PATCH|PUT|DELETE)['"]/);

console.log('usage-dashboard release candidate classifier contract: OK · immutable parent diff, one allowlist, maintenance read-only');
