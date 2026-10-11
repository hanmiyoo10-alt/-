'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const lease = require('../task-lease.cjs');
const handoff = require('../task-handoff.cjs');
const holder = require('../mcl-workspace-holder.cjs');

function run(args, cwd) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {cwd, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return (result.stdout || '').trim();
}

function activeState() {
  return {
    schemaVersion: 1,
    scope: 'chatgpt-mobile-coder-lab',
    mode: 'MCL_TASK_LEASE_LEDGER',
    status: 'ACTIVE',
    generation: 1,
    controllerPath: lease.CONTROLLER_PATH,
    controllerCommit: 'a'.repeat(40),
    packetRef: lease.OWNER_PACKET_REF,
    activeLeases: [],
    lastRelease: null,
  };
}

function mechanicsFixture(name, {declaredBranch = null} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `mcl-holder-${name}-`));
  const repo = path.join(root, 'repo');
  const worktreeRoot = path.join(root, 'linked-worktrees');
  fs.mkdirSync(repo);
  fs.mkdirSync(worktreeRoot);
  run(['git', 'init', '-q'], repo);
  fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
  run(['git', 'add', 'seed.txt'], repo);
  run(['git', '-c', 'user.name=test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'seed'], repo);
  const suffix = `${process.pid}-${name}-${path.basename(root).slice(-6)}`;
  const branch = `server/${suffix}`;
  const worktree = path.join(worktreeRoot, suffix);
  run(['git', 'worktree', 'add', '-q', '-b', branch, worktree, 'HEAD'], repo);
  const manifest = {
    manifestId: '1'.repeat(64),
    leaseEvidence: {leaseId: '2'.repeat(64)},
    workspace: {kind: 'repository', branch: declaredBranch || branch, worktree},
    executor: 'S',
  };
  function cleanup() {
    try {
      if (fs.existsSync(worktree) && fs.lstatSync(worktree).isDirectory()) {
        run(['git', 'worktree', 'remove', '--force', worktree], repo);
      }
    } catch (_) {}
    fs.rmSync(root, {recursive: true, force: true});
  }
  return {root, repo, branch, worktree, manifest, cleanup};
}

function evidenceFixture(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `mcl-holder-evidence-${name}-`));
  const suffix = `${process.pid}-${name}-${path.basename(root).slice(-6)}`;
  const branch = `server/${suffix}`;
  const worktree = `/root/nyang-worktrees/${suffix}`;
  const baseSha = 'b'.repeat(40);
  const packetBody = '<!-- canonical-main-work-packet:v1 -->\n**State: IN_PROGRESS**\n';
  const packetHash = lease.digest(packetBody);
  const scope = 'path:products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs';
  const request = {
    expectedGeneration: 1,
    packetRef: '#2404',
    packetBodySha256: packetHash,
    route: 'S',
    executor: 'S',
    scopes: [scope],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'repository',
    branch,
    worktree,
    observedBaseSha: baseSha,
  };
  const plan = lease.planAcquire(activeState(), request);
  assert.equal(plan.status, 'ACQUIRE_READY');
  const parsed = lease.parseLedger(plan.updatedBody);
  assert.equal(parsed.ok, true);
  const active = parsed.state.activeLeases[0];
  const manifest = handoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: '#2404',
    packetBodySha256: packetHash,
    phaseId: `test-${name}`,
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: [scope],
    workspace: {kind: 'repository', branch, worktree},
    observedBaseSha: baseSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: active.leaseId,
      acquiredGeneration: 2,
      acquireEvidenceRef: 'run:1',
    },
    sourceAuthorityRefs: ['issue:#2404'],
    inputRefs: [`commit:${baseSha}`],
    expectedOutputRefs: ['receipt:test-holder'],
    acceptanceRefs: ['issue:#2404'],
    stopCondition: 'test fixture',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
  });
  const files = {
    manifest: path.join(root, 'manifest.json'),
    ledger: path.join(root, 'ledger.txt'),
    packet: path.join(root, 'packet.txt'),
  };
  fs.writeFileSync(files.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(files.ledger, plan.updatedBody);
  fs.writeFileSync(files.packet, packetBody);
  const input = {
    manifestPath: files.manifest,
    ledgerPath: files.ledger,
    packetPath: files.packet,
  };
  return {
    root,
    manifest,
    active,
    files,
    input,
    cleanup: () => fs.rmSync(root, {recursive: true, force: true}),
  };
}

test('D-013 fixed S M and L workspace roots remain production-owned', () => {
  assert.deepEqual(lease.validateWorkspace({
    kind: 'repository',
    branch: 'server/holder-test',
    worktree: '/root/nyang-worktrees/holder-test',
  }, 'S'), []);
  assert.deepEqual(lease.validateWorkspace({
    kind: 'repository',
    branch: 'mainphone/holder-test',
    worktree: '/data/data/com.termux/files/home/nyang-worktrees/holder-test',
  }, 'M'), []);
  assert.deepEqual(lease.validateWorkspace({
    kind: 'repository',
    branch: 'laptop/holder-test',
    worktree: '/home/alsl0/nyang-worktrees/holder-test',
  }, 'L'), []);
  assert.ok(lease.validateWorkspace({
    kind: 'repository',
    branch: 'server/holder-test',
    worktree: path.join(os.tmpdir(), 'holder-test'),
  }, 'S').includes('WORKTREE_ROOT_INVALID'));
});

test('host-neutral linked worktree exposes the same bounded holder path mechanics', () => {
  const f = mechanicsFixture('inspect');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    assert.equal(inspected.ok, true);
    assert.ok(inspected.holderPath.endsWith(holder.HOLDER_FILE));
    assert.ok(inspected.holderPath.includes(`${path.sep}worktrees${path.sep}`));
  } finally {
    f.cleanup();
  }
});

test('record create is exclusive mode 0600 and keeps raw claim separate', () => {
  const f = mechanicsFixture('create');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    const secret = 'a'.repeat(64);
    const claimed = holder.createHolderRecord(inspected.holderPath, f.manifest, secret);
    assert.equal(claimed.result.status, 'CLAIMED');
    assert.equal(claimed.secret, secret);
    assert.equal('secret' in claimed.result, false);
    const record = holder.readHolder(inspected.holderPath);
    assert.equal(record.ok, true);
    assert.equal(record.value.claimDigest, holder.claimDigest(secret));
    assert.equal(fs.statSync(inspected.holderPath).mode & 0o777, 0o600);
    const raw = fs.readFileSync(inspected.holderPath, 'utf8');
    assert.equal(raw.includes(secret), false);
    assert.equal(Object.keys(JSON.parse(raw)).sort().join(','),
      'claimDigest,leaseId,manifestId,mode,schemaVersion');
  } finally {
    f.cleanup();
  }
});

test('duplicate record creation fails closed', () => {
  const f = mechanicsFixture('duplicate');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    const secret = 'a'.repeat(64);
    assert.equal(holder.createHolderRecord(inspected.holderPath, f.manifest, secret).result.status, 'CLAIMED');
    const second = holder.createHolderRecord(inspected.holderPath, f.manifest, 'b'.repeat(64));
    assert.equal(second.result.status, 'BLOCKED');
    assert.ok(second.result.reasonCodes.includes('HOLDER_ALREADY_EXISTS'));
    assert.equal(second.secret, null);
  } finally {
    f.cleanup();
  }
});

test('record check accepts exact claim and rejects wrong claim', () => {
  const f = mechanicsFixture('check');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    const secret = 'a'.repeat(64);
    holder.createHolderRecord(inspected.holderPath, f.manifest, secret);
    assert.equal(holder.checkHolderRecord(inspected.holderPath, f.manifest, secret).status, 'CHECK_PASS');
    const wrong = holder.checkHolderRecord(inspected.holderPath, f.manifest, 'f'.repeat(64));
    assert.equal(wrong.status, 'BLOCKED');
    assert.ok(wrong.reasonCodes.includes('HOLDER_CLAIM_INVALID'));
  } finally {
    f.cleanup();
  }
});

test('two disjoint linked worktrees hold independent records', () => {
  const a = mechanicsFixture('disjoint-a');
  const b = mechanicsFixture('disjoint-b');
  try {
    const ia = holder.inspectWorkspace(a.manifest);
    const ib = holder.inspectWorkspace(b.manifest);
    assert.equal(holder.createHolderRecord(ia.holderPath, a.manifest, 'a'.repeat(64)).result.status, 'CLAIMED');
    assert.equal(holder.createHolderRecord(ib.holderPath, b.manifest, 'b'.repeat(64)).result.status, 'CLAIMED');
    assert.notEqual(ia.holderPath, ib.holderPath);
  } finally {
    a.cleanup();
    b.cleanup();
  }
});

test('malformed holder record fails closed', () => {
  const f = mechanicsFixture('malformed');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    fs.writeFileSync(inspected.holderPath, 'not-json\n', {mode: 0o600});
    const checked = holder.checkHolderRecord(inspected.holderPath, f.manifest, 'a'.repeat(64));
    assert.equal(checked.status, 'BLOCKED');
    assert.ok(checked.reasonCodes.includes('HOLDER_MALFORMED'));
  } finally {
    f.cleanup();
  }
});

test('record release requires exact claim and removes only exact holder', () => {
  const f = mechanicsFixture('release');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    const secret = 'a'.repeat(64);
    holder.createHolderRecord(inspected.holderPath, f.manifest, secret);
    assert.equal(holder.releaseHolderRecord(inspected.holderPath, f.manifest, 'f'.repeat(64)).status, 'BLOCKED');
    assert.equal(fs.existsSync(inspected.holderPath), true);
    assert.equal(holder.releaseHolderRecord(inspected.holderPath, f.manifest, secret).status, 'RELEASED');
    assert.equal(fs.existsSync(inspected.holderPath), false);
  } finally {
    f.cleanup();
  }
});

test('stale cleanup accepts only exact manifest and lease identity', () => {
  const f = mechanicsFixture('stale');
  try {
    const inspected = holder.inspectWorkspace(f.manifest);
    holder.createHolderRecord(inspected.holderPath, f.manifest, 'a'.repeat(64));
    const foreign = {...f.manifest, manifestId: 'e'.repeat(64)};
    const blocked = holder.cleanupStaleHolderRecord(inspected.holderPath, foreign);
    assert.equal(blocked.status, 'BLOCKED');
    assert.ok(blocked.reasonCodes.includes('HOLDER_IDENTITY_CONFLICT'));
    assert.equal(fs.existsSync(inspected.holderPath), true);
    assert.equal(holder.cleanupStaleHolderRecord(inspected.holderPath, f.manifest).status, 'STALE_CLEANED');
    assert.equal(fs.existsSync(inspected.holderPath), false);
  } finally {
    f.cleanup();
  }
});

test('inspectWorkspace still rejects branch drift missing paths and aliases', () => {
  const branchDrift = mechanicsFixture('branch-drift', {declaredBranch: 'server/declared-other'});
  try {
    const inspected = holder.inspectWorkspace(branchDrift.manifest);
    assert.equal(inspected.ok, false);
    assert.ok(inspected.reasonCodes.includes('WORKTREE_BRANCH_CONFLICT'));
  } finally {
    branchDrift.cleanup();
  }

  const missingManifest = {
    manifestId: '1'.repeat(64),
    leaseEvidence: {leaseId: '2'.repeat(64)},
    workspace: {
      kind: 'repository',
      branch: 'server/missing',
      worktree: path.join(os.tmpdir(), `mcl-holder-missing-${process.pid}`),
    },
    executor: 'S',
  };
  const missing = holder.inspectWorkspace(missingManifest);
  assert.equal(missing.ok, false);
  assert.ok(missing.reasonCodes.includes('WORKTREE_MISSING'));

  const aliasFixture = mechanicsFixture('alias');
  const alias = aliasFixture.worktree + '-alias';
  try {
    fs.symlinkSync(aliasFixture.worktree, alias, 'dir');
    const aliasManifest = {
      ...aliasFixture.manifest,
      workspace: {...aliasFixture.manifest.workspace, worktree: alias},
    };
    const inspected = holder.inspectWorkspace(aliasManifest);
    assert.equal(inspected.ok, false);
    assert.ok(inspected.reasonCodes.includes('WORKTREE_SYMLINK_OR_ALIAS'));
  } finally {
    if (fs.lstatSync(alias, {throwIfNoEntry: false})?.isSymbolicLink()) fs.unlinkSync(alias);
    aliasFixture.cleanup();
  }
});

test('active D-013 lease blocks production release and stale cleanup before filesystem access', () => {
  const f = evidenceFixture('active');
  try {
    const released = holder.releaseHolder(f.input, 'a'.repeat(64));
    assert.equal(released.status, 'BLOCKED');
    assert.ok(released.reasonCodes.includes('LEASE_STILL_ACTIVE'));
    const cleanup = holder.cleanupStale(f.input);
    assert.equal(cleanup.status, 'BLOCKED');
    assert.ok(cleanup.reasonCodes.includes('LEASE_STILL_ACTIVE'));
  } finally {
    f.cleanup();
  }
});

test('packet drift blocks production holder reuse before filesystem access', () => {
  const f = evidenceFixture('packet-drift');
  try {
    fs.writeFileSync(f.files.packet,
      '<!-- canonical-main-work-packet:v1 -->\n**State: REVIEW**\n');
    const checked = holder.checkHolder(f.input, 'a'.repeat(64));
    assert.equal(checked.status, 'BLOCKED');
    assert.ok(checked.reasonCodes.includes('PACKET_BODY_HASH_DRIFT'));
  } finally {
    f.cleanup();
  }
});

test('production wrappers delegate only holder-file mechanics after current evidence checks', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-workspace-holder.cjs'), 'utf8');
  assert.match(source, /return createHolderRecord\(current\.workspace\.holderPath, current\.manifest,/);
  assert.match(source, /return checkHolderRecord\(current\.workspace\.holderPath, current\.manifest, secret\)/);
  assert.match(source, /return releaseHolderRecord\(current\.workspace\.holderPath, current\.manifest, secret\)/);
  assert.match(source, /return cleanupStaleHolderRecord\(workspace\.holderPath, manifest\)/);
  assert.doesNotMatch(source, /MCL_(?:TEST|HOLDER).*ROOT|--(?:root|worktree-root|holder-path)/);
});

test('CLI raw claim channel remains fd3-only and result output stays secret-free', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-workspace-holder.cjs'), 'utf8');
  assert.match(source, /fs\.fstatSync\(3\)/);
  assert.match(source, /fs\.writeSync\(3, `\$\{claimed\.secret\}\\n`\)/);
  const result = holder.output('CLAIMED', [], {
    manifestId: '1'.repeat(64),
    leaseId: '2'.repeat(64),
    claimDigest: holder.claimDigest('a'.repeat(64)),
  });
  assert.equal(JSON.stringify(result).includes('a'.repeat(64)), false);
});

test('holder output never grants mutation authority', () => {
  const result = holder.output('BLOCKED', ['TEST']);
  assert.deepEqual(result.authority, {
    repositoryMutationAuthorized: false,
    deviceMutationAuthorized: false,
    mergeAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
  });
});
