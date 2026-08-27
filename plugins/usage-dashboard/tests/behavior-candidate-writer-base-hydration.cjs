'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml', 'utf8');
const writerAt = workflow.indexOf('\n  commit-candidate:');
assert.ok(writerAt > 0, 'fallback writer job must exist');
const writer = workflow.slice(writerAt);

const remoteCasAt = writer.indexOf('REMOTE_BEFORE=');
const baseFetchAt = writer.indexOf('git fetch --no-tags --depth=1 origin "refs/heads/$TARGET_BRANCH:refs/candidate/base"');
const baseVerifyAt = writer.indexOf('CANDIDATE_BRANCH_MOVED_DURING_BASE_FETCH');
const bundleVerifyAt = writer.indexOf('git bundle verify "$BUNDLE"');
const payloadFetchAt = writer.indexOf("git fetch \"$BUNDLE\" 'refs/heads/candidate-payload:refs/candidate/payload'");
const pushAt = writer.indexOf('git push origin "$PAYLOAD_SHA:refs/heads/$TARGET_BRANCH"');

assert.ok(remoteCasAt >= 0, 'writer must keep remote CAS check');
assert.ok(baseFetchAt > remoteCasAt, 'writer must hydrate candidate base only after remote CAS passes');
assert.ok(baseVerifyAt > baseFetchAt, 'writer must verify fetched candidate base equals expected SHA');
assert.ok(bundleVerifyAt > baseVerifyAt, 'writer must hydrate and verify prerequisite base before bundle verification');
assert.ok(payloadFetchAt > bundleVerifyAt, 'payload import must remain after bundle verification');
assert.ok(pushAt > payloadFetchAt, 'candidate push must remain after payload verification path');
assert.match(writer, /\[\[ "\$\(git rev-parse refs\/candidate\/base\)" == "\$EXPECTED_HEAD_SHA" \]\]/);
assert.doesNotMatch(writer, /--force|--force-with-lease/, 'fallback candidate writer must remain fast-forward-only');

console.log('usage-dashboard candidate writer base hydration: OK');
