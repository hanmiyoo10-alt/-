'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const owner = require('../terminal-residue-cleanup-owner.cjs');
const stageCheckpoint = require('../../stage-checkpoint.cjs');

const REPO = 'hanmiyoo10-alt/-';
const PACKET = 9001;
const PR = 9002;

function git(cwd, args) {
  const result = childProcess.spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error('git failed: ' + args.join(' ') + '\n' + result.stderr);
  }
  return String(result.stdout || '').trim();
}
function terminalBody(state = 'DONE') {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '# fixture packet',
    '',
    '## State',
    '`' + state + '`',
    '',
    '## Interaction stage',
    '- Current stage: `EXPERIMENT_CLOSE`',
    '',
  ].join('\n');
}
function opsBody(main) {
  return [
    '- STATE: `CLEAR`',
    '- MAIN: `' + main + '` / Required PASS — run 12345',
    'Convergence: `STABLE`',
    'AUTHORITY: Production MATCH',
    '- UNKNOWN: NONE',
  ].join('\n');
}
function fixtureAdapter(f, overrides = {}) {
  return {
    async readMainAndOps() {
      if (overrides.mainOps) return overrides.mainOps;
      return {branch: {commit: {sha: f.merge}}, issue: {body: opsBody(f.merge)}};
    },
    async readPacket() {
      if (overrides.packet) return overrides.packet;
      return {
        number: PACKET,
        state: 'closed',
        closed_at: '2026-09-25T00:10:00Z',
        body: terminalBody(),
      };
    },
    async readPacketComments() {
      return overrides.packetComments || [];
    },
    async readAuditComments() {
      return overrides.auditComments || [];
    },
    async readPr() {
      if (overrides.pr) return overrides.pr;
      return {
        number: PR,
        state: 'closed',
        merged: true,
        base: {ref: 'main'},
        head: {ref: f.branch, sha: f.candidate, repo: {full_name: REPO}},
        merge_commit_sha: f.merge,
      };
    },
    async compare(base, head) {
      if (overrides.compare) return overrides.compare;
      return {
        status: base === head ? 'identical' : 'ahead',
        base_commit: {sha: base},
        merge_base_commit: {sha: base},
      };
    },
    async openPrsForBranch() {
      return overrides.openPrs || [];
    },
  };
}
function makeFixture({withEvidence = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-cleanup-'));
  const remote = path.join(root, 'remote.git');
  const control = path.join(root, 'control');
  const worktreeRoot = path.join(root, 'worktrees');
  const target = path.join(worktreeRoot, 'fixture');
  fs.mkdirSync(worktreeRoot, {recursive: true});

  git(root, ['init', '--bare', remote]);
  git(root, ['clone', remote, control]);
  git(control, ['config', 'user.email', 'fixture@example.invalid']);
  git(control, ['config', 'user.name', 'Fixture']);
  fs.writeFileSync(path.join(control, 'base.txt'), 'base\n');
  git(control, ['add', 'base.txt']);
  git(control, ['commit', '-m', 'base']);
  git(control, ['branch', '-M', 'main']);
  git(control, ['push', '-u', 'origin', 'main']);

  const branch = 'server/fixture';
  git(control, ['branch', branch]);
  git(control, ['worktree', 'add', target, branch]);
  fs.writeFileSync(path.join(target, 'feature.txt'), 'feature\n');
  git(target, ['add', 'feature.txt']);
  git(target, ['commit', '-m', 'feature']);
  const candidate = git(target, ['rev-parse', 'HEAD']);
  git(target, ['push', '-u', 'origin', branch]);

  git(control, ['merge', '--no-ff', branch, '-m', 'merge feature']);
  const merge = git(control, ['rev-parse', 'HEAD']);
  git(control, ['push', 'origin', 'main']);

  const gitDir = git(target, ['rev-parse', '--absolute-git-dir']);
  const rows = [
    ['validation-attention-evidence', 'inspect.receipt.json', '{"kind":"attention-receipt"}\n'],
    ['validation-attention-evidence', 'inspect.report.json', '{"kind":"attention-report"}\n'],
    ['validation-continuation-evidence', 'inspect.receipt.json', '{"kind":"continuation"}\n'],
    ['validation-merge-evidence', 'inspect.receipt.json', '{"kind":"merge-inspect"}\n'],
    ['validation-merge-evidence', 'finalize.receipt.json', '{"kind":"merge-finalize"}\n'],
  ];
  if (withEvidence) {
    for (const [dir, suffix, content] of rows) {
      const d = path.join(gitDir, dir);
      fs.mkdirSync(d, {recursive: true, mode: 0o700});
      fs.chmodSync(d, 0o700);
      const p = path.join(d, 'packet-' + PACKET + '-pr-' + PR + '.' + suffix);
      fs.writeFileSync(p, content, {mode: 0o600});
      fs.chmodSync(p, 0o600);
    }
  }

  const profile = {
    controlRepo: control,
    worktreeRoot,
    remote: 'origin',
    branchPrefix: 'server/',
    permanentBranch: 'server/work',
  };
  return {root, remote, control, worktreeRoot, target, branch, candidate, merge, gitDir, profile};
}
function packetEvidenceFiles(gitDir) {
  const prefix = 'packet-' + PACKET + '-pr-' + PR + '.';
  const rows = [];
  for (const dir of owner.EVIDENCE_DIRS) {
    const root = path.join(gitDir, dir);
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      if (name.startsWith(prefix)) rows.push({dir, name, path: path.join(root, name)});
    }
  }
  return rows.sort((left, right) => left.path.localeCompare(right.path));
}
function addDetachedEvidenceCheckout(f, {removeFeatureSources = false, conflictFirst = false} = {}) {
  const target = path.join(f.worktreeRoot, 'validation-fixture');
  git(f.control, ['worktree', 'add', '--detach', target, f.merge]);
  const gitDir = git(target, ['rev-parse', '--absolute-git-dir']);
  const rows = packetEvidenceFiles(f.gitDir);
  assert(rows.length > 0);
  rows.forEach((row, index) => {
    const dir = path.join(gitDir, row.dir);
    fs.mkdirSync(dir, {recursive: true, mode: 0o700});
    fs.chmodSync(dir, 0o700);
    const out = path.join(dir, row.name);
    fs.copyFileSync(row.path, out);
    if (conflictFirst && index === 0) fs.appendFileSync(out, 'conflict\n');
    fs.chmodSync(out, 0o600);
    if (removeFeatureSources) fs.unlinkSync(row.path);
  });
  return {target, gitDir};
}
function terminalCheckpointFixture(f, overrides = {}) {
  const mergeLabel = overrides.mergeLabel || 'merged main';
  const requiredStateLabel = overrides.requiredStateLabel
    || 'required EXPERIMENT_CLOSE UNKNOWN / conflict / blocker';
  const requiredStateValue = overrides.requiredStateValue || 'NONE';
  const payload = overrides.payload || [
    'State reached: EXPERIMENT_CLOSE',
    '- ' + mergeLabel + ': ' + (overrides.merge || f.merge),
    '- ' + requiredStateLabel + ': ' + requiredStateValue,
  ].join('\n');
  const digest = overrides.digest || stageCheckpoint.checkpointDigest(
    PACKET, 'EXPERIMENT_CLOSE', payload);
  const createdAt = overrides.createdAt || '2026-09-25T00:05:00Z';
  const packetId = overrides.packetId || 91001;
  const auditId = overrides.auditId || 91002;
  const base = (surface, id) => ({
    id,
    body: stageCheckpoint.renderComment({
      packetNumber: PACKET,
      stage: 'EXPERIMENT_CLOSE',
      body: payload,
      digest,
      surface,
    }),
    user: {login: overrides.author || 'hanmiyoo10-alt'},
    author_association: overrides.association || 'OWNER',
    created_at: createdAt,
    updated_at: overrides.updatedAt || createdAt,
  });
  const packetComment = base('packet', packetId);
  const auditComment = base('audit', auditId);
  if (overrides.packetBody) packetComment.body = overrides.packetBody;
  if (overrides.auditBody) auditComment.body = overrides.auditBody;
  if (overrides.auditDigest && !overrides.auditBody) {
    auditComment.body = stageCheckpoint.renderComment({
      packetNumber: PACKET,
      stage: 'EXPERIMENT_CLOSE',
      body: payload,
      digest: overrides.auditDigest,
      surface: 'audit',
    });
  }
  return {
    digest,
    payload,
    packetComments: overrides.packetComments || [packetComment],
    auditComments: overrides.auditComments || [auditComment],
  };
}
function cleanupFixture(f) {
  fs.rmSync(f.root, {recursive: true, force: true});
}
function inspect(f, overrides = {}) {
  return owner.inspectTransaction({
    packetNumber: PACKET,
    prNumber: PR,
    adapter: fixtureAdapter(f, overrides),
    profile: f.profile,
    runner: owner.commandResult,
  });
}
function apply(f, overrides = {}) {
  return owner.applyTransaction({
    packetNumber: PACKET,
    prNumber: PR,
    adapter: fixtureAdapter(f, overrides),
    profile: f.profile,
    runner: owner.commandResult,
  });
}

test('CLI is exact packet/pr plus format and literal apply only', () => {
  assert.equal(owner.parseArgs(['inspect', '--packet', '#9', '--pr', '10']).operation, 'inspect');
  assert.equal(owner.parseArgs(['apply', '--packet', '9', '--pr', '10', '--apply']).operation, 'apply');
  assert.throws(() => owner.parseArgs(['apply', '--packet', '9', '--pr', '10']), /APPLY_FLAG_REQUIRED/);
  assert.throws(() => owner.parseArgs([
    'inspect', '--packet', '9', '--pr', '10', '--branch', 'server/x',
  ]), /ARGUMENT_INVALID/);
  assert.throws(() => owner.parseArgs([
    'inspect', '--packet', '9', '--pr', '10', '--repo', 'other/repo',
  ]), /ARGUMENT_INVALID/);
});

test('safe branch derivation permits one server tail and denies permanent/nested/other families', () => {
  assert.equal(owner.safeTail('server/example-1'), 'example-1');
  assert.equal(owner.safeTail('server/work'), null);
  assert.equal(owner.safeTail('server/nested/path'), null);
  assert.equal(owner.safeTail('mainphone/example'), null);
  assert.equal(owner.safeTail('main'), null);
});

test('main/#485 mismatch remains UNKNOWN', () => {
  assert.throws(() => owner.mainOpsFacts({
    branch: {commit: {sha: 'a'.repeat(40)}},
    issue: {body: opsBody('b'.repeat(40))},
  }), (error) => error.kind === 'UNKNOWN' && error.reasonCodes.includes('MAIN_OPS_SETTLING'));
});

test('nonterminal packet blocks while native/body terminal disagreement conflicts', () => {
  assert.throws(() => owner.packetFacts(
    {number: PACKET, state: 'open', body: terminalBody('IN_PROGRESS')}, PACKET),
  (error) => error.kind === 'BLOCKED' && error.reasonCodes.includes('PACKET_NOT_TERMINAL'));
  assert.throws(() => owner.packetFacts(
    {number: PACKET, state: 'closed', body: terminalBody('IN_PROGRESS')}, PACKET),
  (error) => error.kind === 'CONFLICT'
    && error.reasonCodes.includes('PACKET_NATIVE_LIFECYCLE_CONFLICT'));
});

test('PR admission blocks unmerged, non-server and permanent branch targets', () => {
  const base = {
    number: PR, state: 'closed', merged: true, base: {ref: 'main'},
    head: {ref: 'server/x', sha: 'a'.repeat(40), repo: {full_name: REPO}},
    merge_commit_sha: 'b'.repeat(40),
  };
  assert.throws(() => owner.prFacts({...base, merged: false}, PR),
    (e) => e.kind === 'BLOCKED' && e.reasonCodes.includes('PR_NOT_MERGED'));
  assert.throws(() => owner.prFacts({...base, head: {...base.head, ref: 'mainphone/x'}}, PR),
    (e) => e.kind === 'BLOCKED' && e.reasonCodes.includes('PR_HEAD_BRANCH_UNSUPPORTED'));
  assert.throws(() => owner.prFacts({...base, head: {...base.head, ref: 'server/work'}}, PR),
    (e) => e.kind === 'BLOCKED' && e.reasonCodes.includes('PERMANENT_BRANCH_DENIED'));
});

test('deterministic historical #2875 manifest reproduces #2879 archive digest', () => {
  const files = [
    ['validation-attention-evidence/packet-2875-pr-2876.finalize.receipt.json',3441,'2e1738b2af224814a5d87cf98fedcda99bb78e2b8d9bb0bd7197832a7b49e76f'],
    ['validation-attention-evidence/packet-2875-pr-2876.finalize.report.json',9324,'ec16624e6ee6e93ca05829e52e537981b8416e7eccd9c83d303c74ebc03ef0d1'],
    ['validation-attention-evidence/packet-2875-pr-2876.inspect.receipt.json',3704,'e47084ea61cccd54515aa17c015471232804430a275c0079dc13552dab45bbce'],
    ['validation-attention-evidence/packet-2875-pr-2876.inspect.report.json',6369,'15715467c6e2df4084fcc4fa57b0b078833d73c7dd4a7ccec4fd084471fc29cf'],
    ['validation-continuation-evidence/packet-2875-pr-2876.inspect.receipt.json',2438,'036a3a017af060ed7127a9cb92525ccc83d15800f5c2da91f346cd0e4610ef63'],
    ['validation-continuation-evidence/packet-2875-pr-2876.inspect.report.json',1624,'53be9d6647c3a75dadd3fbf36d023c6a68387e4432d14abbb6fcb1dd69ad90eb'],
    ['validation-merge-evidence/packet-2875-pr-2876.finalize.receipt.json',2187,'f4f49e757211693c5dfe438024879c891332368eb65f8ec88553f22353c7bf6d'],
    ['validation-merge-evidence/packet-2875-pr-2876.finalize.report.json',946,'8e2baecaddbc23c9be802e8aa97bfbb28af7d79de689c4f44a61272e5022cd47'],
    ['validation-merge-evidence/packet-2875-pr-2876.inspect.receipt.json',4222,'a7cd4ac1475e530327806e29fea7390b1008fefc7cebf42322bbe5fdeab216a1'],
    ['validation-merge-evidence/packet-2875-pr-2876.inspect.report.json',1871,'a71dd87061a769ebf56a548d9d31a14e9cf1f00bcc837ce0143d9d13ec6574bd'],
  ].map(([p, bytes, sha256]) => ({path:p, bytes, sha256}));
  const manifest = owner.buildManifest(
    2875, 2876,
    '3f157b1cdf1a3e2330aa8d8a47d55c861bbd119a',
    'a53657666566bec4f860f9ef1a76fb7e06d5ae1f',
    files);
  assert.equal(manifest.archiveDigest,
    '91f708354abf6d86fa74239410c75f96cbe320d5b445fa41b207a5ab273e6253');
  assert.equal(manifest.fileCount, 10);
});

test('clean terminal fixture inspects as ARCHIVE_REQUIRED with zero effects', async () => {
  const f = makeFixture();
  try {
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    assert.equal(result.report.output.archive, 'ABSENT');
    assert.equal(result.report.output.worktree, 'PRESENT');
    assert.equal(result.report.output.fileCount, 5);
    for (const name of ['archive_writes','worktree_removals','remote_ref_deletes','local_ref_deletes']) {
      assert.equal(result.receipt.counters.find((x) => x.name === name).value, 0);
    }
  } finally { cleanupFixture(f); }
});

test('candidate not retained by current main blocks before cleanup', async () => {
  const f = makeFixture();
  try {
    const result = await inspect(f, {compare: {
      status: 'diverged',
      base_commit: {sha: f.candidate},
      merge_base_commit: {sha: 'c'.repeat(40)},
    }});
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('CANDIDATE_NOT_RETAINED_BY_MAIN'));
  } finally { cleanupFixture(f); }
});

test('open PR on feature branch blocks before cleanup effects', async () => {
  const f = makeFixture();
  try {
    const result = await inspect(f, {openPrs:[{number:9999}]});
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('OPEN_PR_USES_FEATURE_BRANCH'));
  } finally { cleanupFixture(f); }
});

test('dirty worktree blocks', async () => {
  const f = makeFixture();
  try {
    fs.writeFileSync(path.join(f.target, 'untracked.txt'), 'dirty\n');
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('WORKTREE_DIRTY'));
  } finally { cleanupFixture(f); }
});

test('workspace holder blocks', async () => {
  const f = makeFixture();
  try {
    fs.writeFileSync(path.join(f.gitDir, 'mcl-workspace-holder.v1.json'), '{}\n');
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'BLOCKED');
    assert(result.receipt.blockers.includes('WORKSPACE_HOLDER_PRESENT'));
  } finally { cleanupFixture(f); }
});

test('unrecognized packet-bound evidence directory remains UNKNOWN', async () => {
  const f = makeFixture();
  try {
    const d = path.join(f.gitDir, 'future-evidence');
    fs.mkdirSync(d, {mode:0o700});
    const p = path.join(d, 'packet-' + PACKET + '-pr-' + PR + '.x.json');
    fs.writeFileSync(p, '{}\n', {mode:0o600});
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'UNKNOWN');
    assert(result.receipt.requiredUnknowns.includes('UNRECOGNIZED_PACKET_EVIDENCE_DIRECTORY'));
  } finally { cleanupFixture(f); }
});

test('symlink evidence remains UNKNOWN', async () => {
  const f = makeFixture();
  try {
    const dir = path.join(f.gitDir, 'validation-attention-evidence');
    const victim = path.join(dir, 'packet-' + PACKET + '-pr-' + PR + '.inspect.report.json');
    fs.unlinkSync(victim);
    fs.symlinkSync('/dev/null', victim);
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'UNKNOWN');
    assert(result.receipt.requiredUnknowns.includes('EVIDENCE_FILE_NOT_REGULAR'));
  } finally { cleanupFixture(f); }
});

test('matching prebuilt archive moves inspect to CLEANUP_READY', async () => {
  const f = makeFixture();
  try {
    const inventory = owner.inventoryEvidence(f.gitDir, PACKET, PR);
    const common = path.join(f.control, '.git');
    owner.publishArchive(null, common, PACKET, PR, f.candidate, f.merge, inventory);
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'CLEANUP_READY');
    assert.equal(result.report.output.archive, 'VERIFIED');
  } finally { cleanupFixture(f); }
});

test('mismatching existing archive fails closed to CONFLICT', async () => {
  const f = makeFixture();
  try {
    const inventory = owner.inventoryEvidence(f.gitDir, PACKET, PR);
    const common = path.join(f.control, '.git');
    const archive = owner.archivePath(common, PACKET, PR);
    owner.publishArchive(null, common, PACKET, PR, f.candidate, f.merge, inventory);
    const manifestPath = path.join(archive, 'manifest.json');
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    m.candidateHead = 'f'.repeat(40);
    fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n', {mode:0o600});
    fs.chmodSync(manifestPath, 0o600);
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'CONFLICT');
    assert(result.receipt.conflicts.length > 0);
  } finally { cleanupFixture(f); }
});

test('absent worktree without verified archive remains UNKNOWN and preserves refs', async () => {
  const f = makeFixture();
  try {
    git(f.control, ['worktree', 'remove', f.target]);
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'UNKNOWN');
    assert(result.receipt.requiredUnknowns.includes('TERMINAL_CHECKPOINT_MISSING'));
    assert.equal(git(f.control, ['show-ref', '--verify', '--hash', 'refs/heads/' + f.branch]), f.candidate);
  } finally { cleanupFixture(f); }
});

test('detached registered checkout supplies exact packet evidence', async () => {
  const f = makeFixture();
  try {
    const validation = addDetachedEvidenceCheckout(f, {removeFeatureSources: true});
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    assert.equal(result.report.output.fileCount, 5);
    assert.equal(result.report.output.sourceCount, 5);
    const inventory = owner.locateEvidence(f.profile, owner.commandResult, PACKET, PR);
    assert.equal(inventory.files.length, 5);
    assert.equal(inventory.sourceCount, 5);
    assert(inventory.files.every((row) => row.sourcePaths.every(
      (source) => source.startsWith(validation.gitDir + path.sep))));
  } finally { cleanupFixture(f); }
});

test('feature worktree may be absent when exact evidence exists in another registered checkout', async () => {
  const f = makeFixture();
  try {
    const validation = addDetachedEvidenceCheckout(f, {removeFeatureSources: true});
    git(f.control, ['worktree', 'remove', f.target]);

    const inspected = await inspect(f);
    assert.equal(inspected.receipt.result, 'PASS');
    assert.equal(inspected.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    assert.equal(inspected.report.output.worktree, 'ABSENT');
    assert.equal(inspected.report.output.fileCount, 5);
    assert.equal(inspected.report.output.sourceCount, 5);

    const first = await apply(f);
    assert.equal(first.receipt.result, 'PASS');
    assert.equal(first.facts.cleanupDisposition, 'COMPLETE');
    const counters = Object.fromEntries(first.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(counters.archive_writes, 1);
    assert.equal(counters.evidence_source_deletes, 5);
    assert.equal(counters.worktree_removals, 0);
    assert.equal(counters.remote_ref_deletes, 1);
    assert.equal(counters.local_ref_deletes, 1);
    assert.equal(packetEvidenceFiles(validation.gitDir).length, 0);

    const second = await apply(f);
    assert.equal(second.receipt.result, 'PASS');
    assert.equal(second.facts.cleanupDisposition, 'ALREADY_CLEAN');
    const secondCounters = Object.fromEntries(second.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(secondCounters.evidence_source_deletes, 0);
  } finally { cleanupFixture(f); }
});

test('conflicting duplicate logical evidence across registered checkouts is CONFLICT', async () => {
  const f = makeFixture();
  try {
    addDetachedEvidenceCheckout(f, {conflictFirst: true});
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'CONFLICT');
    assert(result.receipt.conflicts.includes('EVIDENCE_DUPLICATE_IDENTITY_CONFLICT'));
  } finally { cleanupFixture(f); }
});

test('identical duplicate logical evidence coalesces while all exact sources are cleaned', async () => {
  const f = makeFixture();
  try {
    const validation = addDetachedEvidenceCheckout(f);
    const inspected = await inspect(f);
    assert.equal(inspected.receipt.result, 'PASS');
    assert.equal(inspected.report.output.fileCount, 5);
    assert.equal(inspected.report.output.sourceCount, 10);

    const first = await apply(f);
    assert.equal(first.receipt.result, 'PASS');
    const counters = Object.fromEntries(first.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(counters.archive_writes, 1);
    assert.equal(counters.evidence_source_deletes, 10);
    assert.equal(counters.worktree_removals, 1);
    assert.equal(first.facts.archive.manifest.fileCount, 5);
    assert.equal(packetEvidenceFiles(validation.gitDir).length, 0);
  } finally { cleanupFixture(f); }
});

test('verified archive permits recovery after a subset of evidence sources was already removed', async () => {
  const f = makeFixture();
  try {
    const inventory = owner.locateEvidence(f.profile, owner.commandResult, PACKET, PR);
    const common = path.join(f.control, '.git');
    const archive = owner.publishArchive(
      null, common, PACKET, PR, f.candidate, f.merge, inventory);
    assert.equal(archive.state, 'VERIFIED');

    const removed = inventory.files[0].sourcePaths[0];
    fs.unlinkSync(removed);

    const inspected = await inspect(f);
    assert.equal(inspected.receipt.result, 'PASS');
    assert.equal(inspected.report.output.archive, 'VERIFIED');
    assert.equal(inspected.report.output.fileCount, 5);
    assert.equal(inspected.report.output.sourceCount, 4);

    const result = await apply(f);
    assert.equal(result.receipt.result, 'PASS');
    const counters = Object.fromEntries(result.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(counters.archive_writes, 0);
    assert.equal(counters.evidence_source_deletes, 4);
    assert.equal(result.report.output.residue, 'NONE');
  } finally { cleanupFixture(f); }
});

test('source identity movement after archive fails closed before evidence deletion', () => {
  const f = makeFixture();
  try {
    const inventory = owner.locateEvidence(f.profile, owner.commandResult, PACKET, PR);
    const common = path.join(f.control, '.git');
    const archive = owner.publishArchive(
      null, common, PACKET, PR, f.candidate, f.merge, inventory);
    fs.appendFileSync(inventory.files[0].sourcePaths[0], 'changed\n');
    assert.throws(
      () => owner.removeEvidenceSources(inventory, archive),
      (error) => error.kind === 'CONFLICT'
        && error.reasonCodes.includes('EVIDENCE_SOURCE_IDENTITY_CONFLICT'));
  } finally { cleanupFixture(f); }
});

test('registered worktree outside the fixed root is not admitted or scanned', async () => {
  const f = makeFixture();
  try {
    const outside = path.join(f.root, 'outside-validation');
    git(f.control, ['worktree', 'add', '--detach', outside, f.merge]);
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    const roots = owner.registeredEvidenceRoots(f.profile, owner.commandResult);
    assert.equal(roots.some((row) => row.worktree === fs.realpathSync(outside)), false);
  } finally { cleanupFixture(f); }
});

test('registered worktree discovery has a fixed count bound', () => {
  const f = makeFixture();
  try {
    const blocks = [];
    for (let index = 0; index < owner.MAX_REGISTERED_WORKTREES + 1; index += 1) {
      blocks.push('worktree ' + path.join(f.worktreeRoot, 'fake-' + index) + '\nHEAD '
        + 'a'.repeat(40) + '\ndetached');
    }
    const runner = (_executable, args) => {
      if (args.join(' ') === 'worktree list --porcelain') {
        return {code: 0, stdout: blocks.join('\n\n') + '\n', stderr: ''};
      }
      throw new Error('unexpected runner call: ' + args.join(' '));
    };
    assert.throws(
      () => owner.registeredEvidenceRoots(f.profile, runner),
      (error) => error.kind === 'UNKNOWN'
        && error.reasonCodes.includes('REGISTERED_WORKTREE_COUNT_INVALID'));
  } finally { cleanupFixture(f); }
});

test('zero-sidecar terminal checkpoint profile inspects as ARCHIVE_REQUIRED', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const checkpoint = terminalCheckpointFixture(f);
    const result = await inspect(f, checkpoint);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    assert.equal(result.report.output.evidenceProfile, 'DURABLE_TERMINAL_CHECKPOINT');
    assert.equal(result.report.output.fileCount, 2);
    assert.equal(result.report.output.sourceCount, 0);
    assert.equal(result.facts.checkpointEvidence.checkpointId, checkpoint.digest);
  } finally { cleanupFixture(f); }
});

test('zero-sidecar exact merged/current main alias inspects as ARCHIVE_REQUIRED', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const checkpoint = terminalCheckpointFixture(f, {
      mergeLabel: 'merged/current main',
      requiredStateLabel: 'required UNKNOWN / conflict / blocker',
    });
    const result = await inspect(f, checkpoint);
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.facts.cleanupDisposition, 'ARCHIVE_REQUIRED');
    assert.equal(result.report.output.evidenceProfile, 'DURABLE_TERMINAL_CHECKPOINT');
    assert.equal(result.facts.checkpointEvidence.checkpointId, checkpoint.digest);
  } finally { cleanupFixture(f); }
});

test('zero-sidecar multiple recognized required-state lines remain CONFLICT', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    for (const payload of [
      [
        'State reached: EXPERIMENT_CLOSE',
        '- merged main: ' + f.merge,
        '- required EXPERIMENT_CLOSE UNKNOWN / conflict / blocker: NONE',
        '- required UNKNOWN / conflict / blocker: NONE',
      ].join('\n'),
      [
        'State reached: EXPERIMENT_CLOSE',
        '- merged main: ' + f.merge,
        '- required UNKNOWN / conflict / blocker: NONE',
        '- required UNKNOWN / conflict / blocker: NONE',
      ].join('\n'),
    ]) {
      const checkpoint = terminalCheckpointFixture(f, {payload});
      const result = await inspect(f, checkpoint);
      assert.equal(result.receipt.result, 'CONFLICT');
      assert(result.receipt.conflicts.includes('TERMINAL_CHECKPOINT_REQUIRED_STATE_CONFLICT'));
    }
  } finally { cleanupFixture(f); }
});

test('zero-sidecar required-state near-match or non-NONE remains UNKNOWN', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    for (const options of [
      {requiredStateLabel: 'required experiment_close UNKNOWN / conflict / blocker'},
      {requiredStateLabel: 'required UNKNOWN/conflict/blocker'},
      {requiredStateLabel: 'required UNKNOWN / conflict / blocker extra'},
      {requiredStateLabel: 'required UNKNOWN / conflict / blocker', requiredStateValue: 'PENDING'},
    ]) {
      const checkpoint = terminalCheckpointFixture(f, options);
      const result = await inspect(f, checkpoint);
      assert.equal(result.receipt.result, 'UNKNOWN');
      assert(result.receipt.requiredUnknowns.includes('TERMINAL_CHECKPOINT_REQUIRED_STATE_MISSING'));
    }
  } finally { cleanupFixture(f); }
});

test('zero-sidecar multiple recognized merge identity lines remain CONFLICT', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    for (const payload of [
      [
        'State reached: EXPERIMENT_CLOSE',
        '- merged main: ' + f.merge,
        '- merged/current main: ' + f.merge,
        '- required EXPERIMENT_CLOSE UNKNOWN / conflict / blocker: NONE',
      ].join('\n'),
      [
        'State reached: EXPERIMENT_CLOSE',
        '- merged main: ' + f.merge,
        '- merged main: ' + f.merge,
        '- required EXPERIMENT_CLOSE UNKNOWN / conflict / blocker: NONE',
      ].join('\n'),
    ]) {
      const checkpoint = terminalCheckpointFixture(f, {payload});
      const result = await inspect(f, checkpoint);
      assert.equal(result.receipt.result, 'CONFLICT');
      assert(result.receipt.conflicts.includes('TERMINAL_CHECKPOINT_MERGE_IDENTITY_CONFLICT'));
    }
  } finally { cleanupFixture(f); }
});

test('zero-sidecar near-match merge identity fields remain unrecognized', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    for (const options of [
      {mergeLabel: 'current/merged main'},
      {mergeLabel: 'merged current main'},
      {mergeLabel: 'merged/current main extra'},
      {mergeLabel: 'merged/current main', merge: 'not-a-40-hex-sha'},
    ]) {
      const checkpoint = terminalCheckpointFixture(f, options);
      const result = await inspect(f, checkpoint);
      assert.equal(result.receipt.result, 'UNKNOWN');
      assert(result.receipt.requiredUnknowns.includes('TERMINAL_CHECKPOINT_MERGE_IDENTITY_MISSING'));
    }
  } finally { cleanupFixture(f); }
});

test('zero-sidecar merged/current main wrong SHA remains CONFLICT', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const checkpoint = terminalCheckpointFixture(f, {
      mergeLabel: 'merged/current main',
      merge: 'd'.repeat(40),
    });
    const result = await inspect(f, checkpoint);
    assert.equal(result.receipt.result, 'CONFLICT');
    assert(result.receipt.conflicts.includes('TERMINAL_CHECKPOINT_MERGE_IDENTITY_CONFLICT'));
  } finally { cleanupFixture(f); }
});

test('zero-sidecar without terminal checkpoint remains UNKNOWN with zero effects', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const result = await inspect(f);
    assert.equal(result.receipt.result, 'UNKNOWN');
    assert(result.receipt.requiredUnknowns.includes('TERMINAL_CHECKPOINT_MISSING'));
    assert.equal(git(f.control, ['show-ref', '--verify', '--hash', 'refs/heads/' + f.branch]), f.candidate);
    assert.equal(git(f.control, ['ls-remote', '--heads', 'origin', 'refs/heads/' + f.branch])
      .split(/\s+/)[0], f.candidate);
  } finally { cleanupFixture(f); }
});

test('zero-sidecar one-sided or duplicate checkpoint fails closed', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const checkpoint = terminalCheckpointFixture(f);
    const oneSided = await inspect(f, {
      packetComments: checkpoint.packetComments,
      auditComments: [],
    });
    assert.equal(oneSided.receipt.result, 'UNKNOWN');
    assert(oneSided.receipt.requiredUnknowns.includes('TERMINAL_CHECKPOINT_MISSING'));

    const duplicate = await inspect(f, {
      packetComments: [...checkpoint.packetComments, {...checkpoint.packetComments[0], id: 91003}],
      auditComments: checkpoint.auditComments,
    });
    assert.equal(duplicate.receipt.result, 'CONFLICT');
    assert(duplicate.receipt.conflicts.includes('TERMINAL_CHECKPOINT_DUPLICATE'));
  } finally { cleanupFixture(f); }
});

test('zero-sidecar checkpoint author edit and post-close identities fail closed', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const wrongAuthor = terminalCheckpointFixture(f, {author: 'someone-else'});
    const authorResult = await inspect(f, wrongAuthor);
    assert.equal(authorResult.receipt.result, 'CONFLICT');
    assert(authorResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_AUTHOR_CONFLICT'));

    const edited = terminalCheckpointFixture(f, {updatedAt: '2026-09-25T00:06:00Z'});
    const editedResult = await inspect(f, edited);
    assert.equal(editedResult.receipt.result, 'CONFLICT');
    assert(editedResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_EDITED'));

    const late = terminalCheckpointFixture(f, {createdAt: '2026-09-25T00:11:00Z'});
    const lateResult = await inspect(f, late);
    assert.equal(lateResult.receipt.result, 'CONFLICT');
    assert(lateResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_AFTER_PACKET_CLOSE'));
  } finally { cleanupFixture(f); }
});

test('zero-sidecar checkpoint digest and payload identities fail closed', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const digestMismatch = terminalCheckpointFixture(f, {auditDigest: 'f'.repeat(64)});
    const mismatchResult = await inspect(f, digestMismatch);
    assert.equal(mismatchResult.receipt.result, 'CONFLICT');
    assert(mismatchResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_DIGEST_CONFLICT'));

    const forgedDigest = terminalCheckpointFixture(f, {digest: 'e'.repeat(64)});
    const forgedResult = await inspect(f, forgedDigest);
    assert.equal(forgedResult.receipt.result, 'CONFLICT');
    assert(forgedResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_DIGEST_RECOMPUTE_CONFLICT'));

    const wrongMerge = terminalCheckpointFixture(f, {merge: 'd'.repeat(40)});
    const mergeResult = await inspect(f, wrongMerge);
    assert.equal(mergeResult.receipt.result, 'CONFLICT');
    assert(mergeResult.receipt.conflicts.includes('TERMINAL_CHECKPOINT_MERGE_IDENTITY_CONFLICT'));
  } finally { cleanupFixture(f); }
});

test('zero-sidecar first apply snapshots checkpoint pair then cleans exact Git residue', async () => {
  const f = makeFixture({withEvidence: false});
  try {
    const checkpoint = terminalCheckpointFixture(f);
    const first = await apply(f, checkpoint);
    assert.equal(first.receipt.result, 'PASS');
    assert.equal(first.facts.cleanupDisposition, 'COMPLETE');
    assert.equal(first.report.output.archive, 'VERIFIED');
    assert.equal(first.report.output.evidenceProfile, 'DURABLE_TERMINAL_CHECKPOINT');
    assert.equal(first.report.output.fileCount, 2);
    assert.equal(first.report.output.worktree, 'ABSENT');
    assert.equal(first.report.output.localRef, 'ABSENT');
    assert.equal(first.report.output.remoteRef, 'ABSENT');
    assert.equal(first.report.output.residue, 'NONE');

    const counters = Object.fromEntries(first.receipt.counters.map((row) => [row.name, row.value]));
    assert.equal(counters.archive_writes, 1);
    assert.equal(counters.evidence_source_deletes, 0);
    assert.equal(counters.worktree_removals, 1);
    assert.equal(counters.remote_ref_deletes, 1);
    assert.equal(counters.local_ref_deletes, 1);

    const archiveRoot = owner.archivePath(path.join(f.control, '.git'), PACKET, PR);
    const verified = owner.verifyArchive(archiveRoot, PACKET, PR, f.candidate, f.merge);
    assert.equal(verified.state, 'VERIFIED');
    assert.equal(verified.manifest.schemaVersion, 2);
    assert.equal(verified.manifest.evidenceProfile, 'DURABLE_TERMINAL_CHECKPOINT');
    assert.equal(verified.manifest.checkpointId, checkpoint.digest);
    assert.equal(verified.manifest.fileCount, 2);
    assert.equal(fs.statSync(archiveRoot).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(archiveRoot, 'manifest.json')).mode & 0o777, 0o600);
    for (const row of verified.manifest.files) {
      assert.equal(fs.statSync(path.join(archiveRoot, row.path)).mode & 0o777, 0o600);
    }

    const second = await apply(f, {});
    assert.equal(second.receipt.result, 'PASS');
    assert.equal(second.facts.cleanupDisposition, 'ALREADY_CLEAN');
    const secondCounters = Object.fromEntries(
      second.receipt.counters.map((row) => [row.name, row.value]));
    for (const name of [
      'archive_writes', 'evidence_source_deletes', 'worktree_removals',
      'remote_ref_deletes', 'local_ref_deletes',
    ]) assert.equal(secondCounters[name], 0);
  } finally { cleanupFixture(f); }
});

test('ordinary local sidecars remain primary even without checkpoint comments', async () => {
  const f = makeFixture();
  try {
    const result = await inspect(f, {packetComments: [], auditComments: []});
    assert.equal(result.receipt.result, 'PASS');
    assert.equal(result.report.output.evidenceProfile, 'LOCAL_VALIDATION_SIDECARS');
    assert.equal(result.report.output.fileCount, 5);
  } finally { cleanupFixture(f); }
});

test('synthetic apply performs archive then worktree and exact-old ref cleanup', async () => {
  const f = makeFixture();
  try {
    const first = await apply(f);
    assert.equal(first.receipt.result, 'PASS');
    assert.equal(first.facts.cleanupDisposition, 'COMPLETE');
    assert.equal(first.report.output.archive, 'VERIFIED');
    assert.equal(first.report.output.worktree, 'ABSENT');
    assert.equal(first.report.output.remoteRef, 'ABSENT');
    assert.equal(first.report.output.localRef, 'ABSENT');
    assert.equal(first.report.output.residue, 'NONE');

    const counters = Object.fromEntries(first.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(counters.archive_writes, 1);
    assert.equal(counters.evidence_source_deletes, 5);
    assert.equal(counters.worktree_removals, 1);
    assert.equal(counters.remote_ref_deletes, 1);
    assert.equal(counters.local_ref_deletes, 1);

    assert.equal(fs.existsSync(f.target), false);
    const archive = owner.archivePath(path.join(f.control,'.git'), PACKET, PR);
    const verified = owner.verifyArchive(archive, PACKET, PR, f.candidate, f.merge);
    assert.equal(verified.state, 'VERIFIED');
    assert.equal(fs.statSync(archive).mode & 0o777, 0o700);
    assert.equal(fs.statSync(path.join(archive,'manifest.json')).mode & 0o777, 0o600);

    const local = childProcess.spawnSync('git', ['-C', f.control, 'show-ref', '--verify',
      '--hash', 'refs/heads/' + f.branch], {encoding:'utf8'});
    assert.notEqual(local.status, 0);
    assert.equal(git(f.control, ['ls-remote', '--heads', 'origin', 'refs/heads/' + f.branch]), '');
  } finally { cleanupFixture(f); }
});

test('second apply is idempotent ALREADY_CLEAN with zero effects', async () => {
  const f = makeFixture();
  try {
    const first = await apply(f);
    assert.equal(first.receipt.result, 'PASS');
    const second = await apply(f);
    assert.equal(second.receipt.result, 'PASS');
    assert.equal(second.facts.cleanupDisposition, 'ALREADY_CLEAN');
    const counters = Object.fromEntries(second.receipt.counters.map((x) => [x.name,x.value]));
    assert.equal(counters.archive_writes, 0);
    assert.equal(counters.worktree_removals, 0);
    assert.equal(counters.remote_ref_deletes, 0);
    assert.equal(counters.local_ref_deletes, 0);
  } finally { cleanupFixture(f); }
});

test('generic receipt and Agent Decision View stay authority-false', async () => {
  const f = makeFixture();
  try {
    const result = await inspect(f);
    assert.equal(result.receipt.mutationAuthorized, false);
    assert.equal(result.receipt.executionAuthorized, false);
    assert.equal(result.receipt.mergeAuthorized, false);
    assert.equal(result.receipt.releaseAuthorized, false);
    assert.equal(result.receipt.productionAuthorized, false);
    const view = owner.projectView(result, {
      receiptLocator:'local-artifact:/tmp/r#sha256=' + 'a'.repeat(64),
      reportLocator:'local-artifact:/tmp/p#sha256=' + 'b'.repeat(64),
    });
    assert.equal(view.validity, 'VALID');
    assert.equal(view.result, 'PASS');
  } finally { cleanupFixture(f); }
});

test('source has fixed effect primitives and no sweeper/force-worktree/product dependency', () => {
  const source = fs.readFileSync(path.join(__dirname, '../terminal-residue-cleanup-owner.cjs'), 'utf8');
  assert.doesNotMatch(source, /products\/chatgpt-mobile-coder-lab/);
  assert.doesNotMatch(source, /worktree', 'remove', '--force|worktree remove --force/);
  assert.doesNotMatch(source, /git\s+clean|reset\s+--hard|branch\s+-D|prune-all/);
  assert.doesNotMatch(source, /workflow_dispatch|releaseAuthorized:\s*true|productionAuthorized:\s*true/);
  assert.match(source, /--force-with-lease=/);
  assert.match(source, /update-ref', '-d'/);
  assert.match(source, /packetProjection\.classifyPacketProjection/);
  assert.match(source, /canonical-main-evidence-archive/);
});

test('fixed evidence registry stays bounded', () => {
  assert.deepEqual([...owner.EVIDENCE_DIRS], [
    'validation-attention-evidence',
    'validation-continuation-evidence',
    'validation-merge-evidence',
  ]);
  assert.equal(owner.MAX_EVIDENCE_FILES, 32);
  assert.equal(owner.MAX_EVIDENCE_FILE_BYTES, 65536);
  assert.equal(owner.MAX_EVIDENCE_TOTAL_BYTES, 524288);
});
