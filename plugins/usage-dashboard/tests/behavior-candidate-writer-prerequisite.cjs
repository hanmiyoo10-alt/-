'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/usage-dashboard-prepare-candidate.yml', 'utf8');
const writerAt = workflow.indexOf('\n  commit-candidate:');
assert.ok(writerAt > 0, 'fallback candidate writer must exist');
const writer = workflow.slice(writerAt);

assert.equal((workflow.match(/contents: write/g) || []).length, 1, 'fallback workflow must retain exactly one content writer');

const casAt = writer.indexOf('REMOTE_BEFORE="$(git ls-remote origin "refs/heads/$TARGET_BRANCH"');
const casGuardAt = writer.indexOf('CANDIDATE_BRANCH_MOVED:');
const prerequisiteFetch = 'git fetch --no-tags --depth=1 origin "refs/heads/$TARGET_BRANCH:refs/candidate/prerequisite"';
const prerequisiteFetchAt = writer.indexOf(prerequisiteFetch);
const prerequisiteGuardAt = writer.indexOf('CANDIDATE_PREREQUISITE_FETCH_MISMATCH');
const bundleVerifyAt = writer.indexOf('git bundle verify "$BUNDLE"');
const payloadFetchAt = writer.indexOf("git fetch \"$BUNDLE\" 'refs/heads/candidate-payload:refs/candidate/payload'");
const payloadVerifyAt = writer.indexOf('candidate_preparation_policy.cjs --verify-payload "$EXPECTED_HEAD_SHA" "$PAYLOAD_SHA"');
const pushAt = writer.indexOf('git push origin "$PAYLOAD_SHA:refs/heads/$TARGET_BRANCH"');
const postverifyAt = writer.indexOf('CANDIDATE_BRANCH_POSTVERIFY_MISMATCH');

for (const [label, position] of Object.entries({
  casAt,
  casGuardAt,
  prerequisiteFetchAt,
  prerequisiteGuardAt,
  bundleVerifyAt,
  payloadFetchAt,
  payloadVerifyAt,
  pushAt,
  postverifyAt,
})) assert.ok(position >= 0, `missing candidate writer guard: ${label}`);

assert.ok(casAt < casGuardAt, 'remote candidate observation must precede CAS guard');
assert.ok(casGuardAt < prerequisiteFetchAt, 'remote CAS must succeed before prerequisite fetch');
assert.ok(prerequisiteFetchAt < prerequisiteGuardAt, 'prerequisite fetch must precede exact fetched-SHA guard');
assert.ok(prerequisiteGuardAt < bundleVerifyAt, 'exact prerequisite identity must be proven before bundle verify');
assert.ok(bundleVerifyAt < payloadFetchAt, 'bundle verify must precede payload import');
assert.ok(payloadFetchAt < payloadVerifyAt, 'payload import must precede payload ancestry verification');
assert.ok(payloadVerifyAt < pushAt, 'payload verification must precede candidate push');
assert.ok(pushAt < postverifyAt, 'candidate push must retain remote postverify');

assert.doesNotMatch(prerequisiteFetch, /--force|--force-with-lease/);
assert.doesNotMatch(writer, /git push[^\n]*(?:--force|--force-with-lease)/);
assert.match(writer, /\[\[ "\$\(git rev-parse refs\/candidate\/prerequisite\)" == "\$EXPECTED_HEAD_SHA" \]\]/);

console.log('usage-dashboard behavior candidate writer prerequisite: OK');
