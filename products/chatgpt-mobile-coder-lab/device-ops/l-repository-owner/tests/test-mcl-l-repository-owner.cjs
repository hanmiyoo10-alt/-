'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const owner = require('../mcl-l-repository-owner.cjs');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('PASS', name);
  } catch (error) {
    console.error('FAIL', name);
    throw error;
  }
}

function expectReason(fn, reason) {
  assert.throws(fn, (error) => error instanceof owner.OwnerError
    && error.reasonCodes.includes(reason));
}

function manifest(overrides = {}) {
  return {
    schemaVersion:1,
    mode:'MCL_TASK_MANIFEST',
    packetRef:'#9001',
    packetBodySha256:'a'.repeat(64),
    phaseId:'9001-implementation-pr-effect',
    phaseClass:'REPOSITORY_MUTATION',
    route:'L',
    executor:'L',
    scopes:[
      'path:products/chatgpt-mobile-coder-lab/docs/example.md',
      'surface:mcl:l-owner-proof',
    ],
    workspace:{
      kind:'repository',
      branch:'laptop/task-9001',
      worktree:'/home/alsl0/nyang-worktrees/task-9001',
    },
    observedBaseSha:'b'.repeat(40),
    leaseRequirement:'REQUIRED',
    leaseEvidence:{
      ledgerRef:'#2352',
      leaseId:'c'.repeat(64),
      acquiredGeneration:1,
      acquireEvidenceRef:'receipt:mcl-task-lease:' + 'c'.repeat(64) + ':generation:1',
    },
    sourceAuthorityRefs:['#9001'],
    inputRefs:['commit:' + 'b'.repeat(40)],
    expectedOutputRefs:['path:products/chatgpt-mobile-coder-lab/docs/example.md'],
    acceptanceRefs:['#9001'],
    stopCondition:'bounded test',
    authority:{...owner.FALSE_AUTHORITY},
    manifestId:'d'.repeat(64),
    payloadSha256:'e'.repeat(64),
    ...overrides,
  };
}

test('fixed public identity is L-only', () => {
  assert.equal(owner.FIXED_ROUTE, 'L');
  assert.equal(owner.FIXED_EXECUTOR, 'L');
  assert.equal(owner.FIXED_LANDING, '/home/alsl0/nyang-repo');
  assert.equal(owner.FIXED_WORKTREE_ROOT, '/home/alsl0/nyang-worktrees');
});

test('branch contract accepts laptop namespace only', () => {
  assert.doesNotThrow(() => owner.validateBranch('laptop/task-1'));
  for (const value of ['main','server/task','laptop/work','laptop/../x','laptop//x','laptop/x/','laptop/x@{1}']) {
    expectReason(() => owner.validateBranch(value), 'WORKSPACE_BRANCH_INVALID');
  }
});

test('worktree contract rejects landing root aliases and outside paths', () => {
  assert.doesNotThrow(() => owner.validateWorktreePath('/home/alsl0/nyang-worktrees/task-1'));
  for (const value of [
    '/home/alsl0/nyang-worktrees',
    '/home/alsl0/nyang-repo',
    '/home/alsl0/other/task-1',
    '/home/alsl0/nyang-worktrees/../task-1',
    'relative/task-1',
  ]) {
    expectReason(() => owner.validateWorktreePath(value), 'WORKTREE_PATH_INVALID');
  }
});

test('manifest contract accepts exact L/L repository identity', () => {
  assert.equal(owner.validateManifestShape(manifest()).route, 'L');
});

test('manifest contract rejects route executor and workspace substitution', () => {
  for (const value of [
    manifest({route:'S'}),
    manifest({executor:'S'}),
    manifest({workspace:{kind:'repository',branch:'server/task',worktree:'/home/alsl0/nyang-worktrees/task'}}),
    manifest({workspace:{kind:'not_applicable',branch:'not_applicable',worktree:'not_applicable'}}),
  ]) {
    assert.throws(() => owner.validateManifestShape(value), owner.OwnerError);
  }
});
function landingRunner({landing, base, head = base, branch = 'main', dirty = '', objectPresent = true, ancestor = true, remoteMain = base, protectedMain = base}) {
  return (command, args) => {
    if (command === 'gh') return {code:0, stdout:protectedMain + '\n', stderr:'', signal:null, error:null};
    assert.equal(command, 'git');
    assert.deepEqual(args.slice(0, 2), ['-C', landing]);
    const rest = args.slice(2);
    if (rest.join(' ') === 'branch --show-current') return {code:0, stdout:branch + '\n', stderr:'', signal:null, error:null};
    if (rest.join(' ') === 'rev-parse HEAD') return {code:0, stdout:head + '\n', stderr:'', signal:null, error:null};
    if (rest.join(' ') === 'status --porcelain=v1 -uall') return {code:0, stdout:dirty, stderr:'', signal:null, error:null};
    if (rest.join(' ') === 'ls-remote --heads origin refs/heads/main') return {code:0, stdout:remoteMain + '\trefs/heads/main\n', stderr:'', signal:null, error:null};
    if (rest[0] === 'cat-file' && rest[1] === '-e') return {code:objectPresent ? 0 : 1, stdout:'', stderr:'', signal:null, error:null};
    if (rest[0] === 'merge-base' && rest[1] === '--is-ancestor') return {code:ancestor ? 0 : 1, stdout:'', stderr:'', signal:null, error:null};
    throw new Error('unexpected runner call: ' + rest.join(' '));
  };
}

test('landing currentness accepts exact-current and clean fast-forward-behind main', () => {
  const landing = fs.mkdtempSync('/tmp/mcl-l-owner-');
  const base = 'b'.repeat(40);
  const old = 'a'.repeat(40);
  const profile = {...owner.DEFAULT_PROFILE, landing};
  try {
    assert.equal(owner.inspectLanding(manifest({observedBaseSha:base}), {profile, runner:landingRunner({landing, base})}).landingRelation, 'equal');
    assert.equal(owner.inspectLanding(manifest({observedBaseSha:base}), {profile, runner:landingRunner({landing, base, head:old, ancestor:true})}).landingRelation, 'behind_ff');
  } finally { fs.rmSync(landing, {recursive:true, force:true}); }
});

test('landing currentness rejects non-ancestor dirty mismatch and missing-base states', () => {
  const landing = fs.mkdtempSync('/tmp/mcl-l-owner-');
  const base = 'b'.repeat(40);
  const old = 'a'.repeat(40);
  const profile = {...owner.DEFAULT_PROFILE, landing};
  const m = manifest({observedBaseSha:base});
  try {
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, head:old, ancestor:false})}), 'LANDING_HEAD_NOT_ANCESTOR_OF_BASE');
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, dirty:'x'})}), 'LANDING_DIRTY');
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, branch:'other'})}), 'LANDING_BRANCH_INVALID');
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, remoteMain:'c'.repeat(40)})}), 'REMOTE_MAIN_STALE');
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, protectedMain:'c'.repeat(40)})}), 'PROTECTED_MAIN_STALE');
    expectReason(() => owner.inspectLanding(m, {profile, runner:landingRunner({landing, base, objectPresent:false})}), 'BASE_OBJECT_MISSING');
  } finally { fs.rmSync(landing, {recursive:true, force:true}); }
});

test('request parser binds packet paths message and patch hash', () => {
  const value = owner.parseRequestText(JSON.stringify({
    schema:owner.REQUEST_SCHEMA,
    packet_ref:'#9001',
    message:'test: L bounded owner',
    expected_paths:['z/file.md','a/file.cjs'],
    patch_sha256:'f'.repeat(64),
  }));
  assert.deepEqual(value.expected_paths, ['a/file.cjs','z/file.md']);
  assert.equal(value.packet_ref, '#9001');
});

test('request parser fails closed on duplicate unsafe or malformed paths', () => {
  for (const paths of [
    ['a','a'],
    ['../a'],
    ['/abs'],
    ['a//b'],
    ['a/./b'],
  ]) {
    expectReason(() => owner.parseRequestText(JSON.stringify({
      schema:owner.REQUEST_SCHEMA,
      packet_ref:'#9001',
      message:'x',
      expected_paths:paths,
      patch_sha256:'f'.repeat(64),
    })), paths[0] === 'a' && paths[1] === 'a' ? 'REQUEST_PATHS_INVALID' : 'REQUEST_PATH_INVALID');
  }
});

test('request parser rejects wrong schema packet and patch hash', () => {
  for (const patch of [
    {schema:'wrong',packet_ref:'#9001',message:'x',expected_paths:['a'],patch_sha256:'f'.repeat(64)},
    {schema:owner.REQUEST_SCHEMA,packet_ref:'9001',message:'x',expected_paths:['a'],patch_sha256:'f'.repeat(64)},
    {schema:owner.REQUEST_SCHEMA,packet_ref:'#9001',message:'x',expected_paths:['a'],patch_sha256:'bad'},
  ]) {
    assert.throws(() => owner.parseRequestText(JSON.stringify(patch)), owner.OwnerError);
  }
});

test('PR request requires non-closing Refs linkage', () => {
  const ok = owner.parsePrRequestText(JSON.stringify({
    schema:owner.PR_REQUEST_SCHEMA,
    title:'test: bounded L proof',
    body:'Implements bounded proof.\n\nRefs #9001',
  }), '#9001');
  assert.equal(ok.title, 'test: bounded L proof');
  expectReason(() => owner.parsePrRequestText(JSON.stringify({
    schema:owner.PR_REQUEST_SCHEMA,title:'x',body:'No packet link',
  }), '#9001'), 'PR_BODY_REFS_REQUIRED');
  expectReason(() => owner.parsePrRequestText(JSON.stringify({
    schema:owner.PR_REQUEST_SCHEMA,title:'x',body:'Refs #9001\n\nCloses #9001',
  }), '#9001'), 'PR_CLOSING_LINK_FORBIDDEN');
});

test('manifest path scopes ignore semantic surfaces and remain sorted', () => {
  const value = manifest({
    scopes:['surface:z','path:z/file','path:a/file','path:z/file'],
  });
  assert.deepEqual(owner.manifestPathScopes(value), ['a/file','z/file']);
});

test('fixed validation plan contains no caller command surface', () => {
  const checks = owner.fixedValidationChecks({
    expected_paths:['docs/a.md','src/a.cjs'],
  });
  assert.ok(checks.some((row) => row[0] === 'owner-contract'));
  assert.ok(checks.some((row) => row[0] === 'task-lease-contract'));
  assert.ok(checks.some((row) => row[0] === 'task-handoff-contract'));
  assert.ok(checks.some((row) => row[0] === 'workspace-holder-contract'));
  const dynamic = checks.find((row) => row[0] === 'changed-cjs-syntax:src/a.cjs');
  assert.deepEqual(dynamic[1], ['--check','src/a.cjs']);
  assert.equal(checks.some((row) => row[1].includes('docs/a.md')), false);
});

test('outward results never grant stronger authority', () => {
  const value = owner.output('PASS');
  assert.deepEqual(value.authority, owner.FALSE_AUTHORITY);
  assert.equal(value.details, 'withheld');
});
test('CLI grammar separates inspect from explicit apply effects', () => {
  assert.deepEqual(owner.parseArgs(['inspect','--manifest','m','--ledger','l','--packet','p']), {
    operation:'inspect',
    values:{manifest:'m',ledger:'l',packet:'p'},
    apply:false,
  });
  assert.equal(owner.parseArgs(['prepare-workspace','--manifest','m','--ledger','l','--packet','p','--apply']).apply, true);
  assert.equal(owner.parseArgs(['apply','--manifest','m','--ledger','l','--packet','p','--apply']).apply, true);
});

test('source uses create-only workspace and ordinary push/PR surfaces', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../mcl-l-repository-owner.cjs'), 'utf8');
  for (const required of [
    "'worktree', 'add', '-b'",
    "'/git/refs', '--method', 'POST'",
    "'apply', '--check'",
    "'apply', '--index'",
    "'push', 'origin'",
    "'pr', 'create'",
    'holderCheck(context, env)',
    'RELEASE_D013_THEN_RELEASE_HOLDER_THEN_D014_COMPLETE',
  ]) {
    assert.ok(source.includes(required), required);
  }
});

test('source contains no reset rebase stash clean force-push or arbitrary shell execution', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../mcl-l-repository-owner.cjs'), 'utf8');
  for (const forbidden of [
    "'reset'", '"reset"',
    "'rebase'", '"rebase"',
    "'stash'", '"stash"',
    "'clean'", '"clean"',
    '--force', 'force-with-lease',
    'shell: true',
    'execSync(',
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test('commit identity is fixed and command-local', () => {
  assert.equal(owner.FIXED_BOT_NAME, 'mcl-repository-patch[bot]');
  assert.equal(owner.FIXED_BOT_EMAIL, 'mcl-repository-patch@users.noreply.github.com');
  const source = fs.readFileSync(path.resolve(__dirname, '../mcl-l-repository-owner.cjs'), 'utf8');
  assert.ok(source.includes("'-c', 'user.name=' + FIXED_BOT_NAME"));
  assert.ok(source.includes("'-c', 'user.email=' + FIXED_BOT_EMAIL"));
  assert.equal(source.includes('git config --global'), false);
});

test('public CLI does not accept generic repo route executor or shell selectors', () => {
  const parsed = owner.parseArgs(['inspect','--manifest','m','--ledger','l','--packet','p']);
  assert.deepEqual(Object.keys(parsed.values).sort(), ['ledger','manifest','packet']);
  const source = fs.readFileSync(path.resolve(__dirname, '../mcl-l-repository-owner.cjs'), 'utf8');
  assert.equal(source.includes("values.repo"), false);
  assert.equal(source.includes("values.route"), false);
  assert.equal(source.includes("values.executor"), false);
  assert.equal(source.includes("values.command"), false);
});

console.log('ALL_TESTS_PASS', passed);
