import assert from 'node:assert/strict';
import fs from 'node:fs';

const WORKFLOW_URL = new URL('../../.github/workflows/repository-actions-compat-proof.yml', import.meta.url);
const source = fs.readFileSync(WORKFLOW_URL, 'utf8');

const expectedUses = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1',
  'actions/setup-python@6d4fd22b20465ccc0f7354476588e8df7c9ca0e0',
  'actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9',
  'actions/download-artifact@9000827ccba6bdab643e8b6fd33ac0654aef8333',
];

const uses = [...source.matchAll(/^\s*uses:\s*([^\s#]+)\s*$/gm)].map((match) => match[1]);
assert.deepEqual(uses, expectedUses, 'proof workflow action identity/order drift');

for (const identity of uses) {
  assert.match(identity, /@[0-9a-f]{40}$/, 'action must be exact-SHA pinned: ' + identity);
}

assert.match(source, /^permissions:\n  contents: read$/m, 'top-level contents:read permission missing');
assert.doesNotMatch(
  source,
  /^\s*(?:actions|checks|contents|deployments|id-token|issues|packages|pull-requests|statuses):\s*write\s*$/m,
  'write/id-token permission is forbidden',
);
assert.doesNotMatch(source, /^\s*environment:/m, 'environment is forbidden');
assert.doesNotMatch(source, /\$\{\{\s*secrets\./, 'secret access is forbidden');
assert.doesNotMatch(source, /^\s*pull_request_target:/m, 'pull_request_target is forbidden');

assert.match(source, /^\s*pull_request:\s*$/m, 'pull_request trigger missing');
assert.match(source, /^\s*workflow_dispatch:\s*$/m, 'workflow_dispatch trigger missing');
assert.doesNotMatch(source, /workflow_dispatch:\s*\n\s+inputs:/, 'workflow_dispatch inputs are forbidden');
assert.doesNotMatch(source, /\$\{\{\s*(?:inputs|github\.event\.inputs)\./, 'caller-controlled input use is forbidden');

assert.match(source, /- '\.github\/workflows\/\*\*'/, 'workflow PR path filter missing');
assert.match(source, /- 'tools\/repository-actions-compat\/\*\*'/, 'proof-contract PR path filter missing');

const exactRefExpression = '${{ github.event.pull_request.head.sha || github.sha }}';
assert.ok(source.includes('EXPECTED_SHA: ' + exactRefExpression), 'exact proof SHA environment binding missing');
assert.ok(source.includes('ref: ' + exactRefExpression), 'checkout exact PR/dispatch ref binding missing');
assert.match(source, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_SHA"/, 'checked-out HEAD verification missing');

assert.match(source, /sha256sum actions-compat-proof\/payload\.txt/, 'source digest creation missing');
assert.match(source, /echo "sha256=\$digest" >> "\$GITHUB_OUTPUT"/, 'digest output missing');
assert.match(source, /rm -rf actions-compat-proof/, 'pre-download local payload removal missing');
assert.match(source, /sha256sum actions-compat-proof-downloaded\/payload\.txt/, 'downloaded digest verification missing');
assert.match(source, /test "\$actual" = "\$EXPECTED_DIGEST"/, 'round-trip digest equality missing');
assert.match(source, /REPOSITORY_ACTIONS_COMPAT_PROOF_PASS/, 'stable terminal proof marker missing');

for (const forbidden of [
  'git push',
  'gh workflow run',
  'repo-main-write.py',
  'release-simcore',
  'release-usage-dashboard',
  'MYANG_DISTRIBUTION_SSH_KEY',
  'CLOUDFLARE',
  'ssh-key',
  'id-token: write',
]) {
  assert.ok(!source.includes(forbidden), 'forbidden effect token: ' + forbidden);
}

console.log('REPOSITORY_ACTIONS_COMPAT_PROOF_CONTRACT:OK');
