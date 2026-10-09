'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
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

test('workflow candidate paths are rename-aware and include both sides', () => {
  assert.deepEqual(owner.candidatePathsFromNameStatus(
    'R100\0.github/workflows/old.yml\0docs/new.yml\0M\0docs/a.md\0'),
    ['.github/workflows/old.yml','docs/a.md','docs/new.yml']);
  assert.equal(owner.requiresWorkflowOauthScope(
    owner.candidatePathsFromNameStatus('R100\0.github/workflows/old.yml\0docs/new.yml\0')), true);
  assert.equal(owner.requiresWorkflowOauthScope(
    owner.candidatePathsFromNameStatus('R100\0docs/old.md\0docs/new.md\0')), false);
  expectReason(() => owner.candidatePathsFromNameStatus('R100\0only-one-path\0'),
    'GITHUB_WORKFLOW_DIFF_UNOBSERVED');
});

test('workflow OAuth preflight binds scope probe to exact effective push URL and fixed gh credential', () => {
  assert.equal(owner.requiresWorkflowOauthScope(['.github/workflows/a.yml']), true);
  assert.equal(owner.requiresWorkflowOauthScope(['.github/workflows/nested/a.yaml']), true);
  assert.equal(owner.requiresWorkflowOauthScope(['.github/workflow/a.yml']), false);
  assert.equal(owner.requiresWorkflowOauthScope(['docs/.github/workflows/a.yml']), false);

  const calls = [];
  const passRunner = (command, args) => {
    calls.push([command, args]);
    if (command === 'git' && args.includes('remote')) {
      assert.deepEqual(args, ['-C','/tmp/wt','remote','get-url','--push','--all','origin']);
      return {code:0, stdout:owner.FIXED_ORIGIN_URL + '\n', stderr:'', signal:null, error:null};
    }
    if (command === 'git' && args.includes('config')) {
      assert.deepEqual(args, ['-C','/tmp/wt','config','--show-origin','--name-only','--list']);
      return {code:0, stdout:'file:/tmp/config\tcredential.https://github.com.helper\n', stderr:'', signal:null, error:null};
    }
    assert.equal(command, owner.FIXED_GH);
    assert.deepEqual(args, ['api','-i','user']);
    return {
      code:0,
      stdout:'HTTP/2 200\r\nx-oauth-scopes: repo, workflow, read:org\r\n\r\n{}\n',
      stderr:'', signal:null, error:null,
    };
  };
  assert.equal(owner.requireGithubWorkflowPushCredential(
    ['.github/workflows/a.yml'], '/tmp/wt', {runner:passRunner}), true);
  assert.equal(calls.length, 3);

  const missingRunner = (command) => {
    if (command === 'git') return {code:0, stdout:owner.FIXED_ORIGIN_URL + '\n', stderr:'', signal:null, error:null};
    return {code:0, stdout:'HTTP/2 200\r\nx-oauth-scopes: repo, read:org\r\n\r\n{}\n', stderr:'', signal:null, error:null};
  };
  expectReason(() => owner.requireGithubWorkflowPushCredential(
    ['.github/workflows/a.yml'], '/tmp/wt', {runner:missingRunner}),
    'GITHUB_WORKFLOW_SCOPE_REQUIRED');

  for (const output of [
    'git@github.com:hanmiyoo10-alt/-.git\n',
    owner.FIXED_ORIGIN_URL + '\nhttps://mirror.invalid/repo.git\n',
  ]) {
    const invalidPushUrl = (command) => {
      if (command === 'git') return {code:0, stdout:output, stderr:'', signal:null, error:null};
      throw new Error('gh must not run after push URL mismatch');
    };
    expectReason(() => owner.requireGithubWorkflowPushCredential(
      ['.github/workflows/a.yml'], '/tmp/wt', {runner:invalidPushUrl}),
      'GITHUB_PUSH_CREDENTIAL_BINDING_REQUIRED');
  }

  const originUnknown = () => ({code:1, stdout:'', stderr:'withheld', signal:null, error:null});
  expectReason(() => owner.requireGithubWorkflowPushCredential(
    ['.github/workflows/a.yml'], '/tmp/wt', {runner:originUnknown}),
    'GITHUB_WORKFLOW_ORIGIN_UNOBSERVED');

  let nonWorkflowCalls = 0;
  assert.equal(owner.requireGithubWorkflowPushCredential(
    ['docs/a.md'], '/tmp/wt', {runner:() => { nonWorkflowCalls += 1; }}), false);
  assert.equal(nonWorkflowCalls, 0);
});

test('workflow HTTP auth preflight rejects URL-specific extraHeader keys without reading values', () => {
  const passRunner = () => ({
    code:0,
    stdout:'file:/tmp/config\thttp.extraheader\nfile:/tmp/config\tcredential.https://github.com.helper\n',
    stderr:'', signal:null, error:null,
  });
  assert.equal(owner.requireNoUrlSpecificHttpExtraHeaders('/tmp/wt', {runner:passRunner}), true);

  for (const name of [
    'http.https://github.com/hanmiyoo10-alt/-.git.extraheader',
    'http.https://github.com/hanmiyoo10-alt/-.git/info.extraheader',
    'http.https://github.com/hanmiyoo10-alt/-.git/info/refs.extraheader',
    'http.https://github.com/hanmiyoo10-alt/-.git/git-receive-pack.extraheader',
    'http.https://example.invalid/other.extraheader',
  ]) {
    const runner = () => ({code:0, stdout:'file:/tmp/config\t' + name + '\n', stderr:'', signal:null, error:null});
    expectReason(() => owner.requireNoUrlSpecificHttpExtraHeaders('/tmp/wt', {runner}),
      'GITHUB_HTTP_AUTH_HEADER_BINDING_REQUIRED');
  }

  const malformed = () => ({code:0, stdout:'http.https://github.com/x.extraheader\n', stderr:'', signal:null, error:null});
  expectReason(() => owner.requireNoUrlSpecificHttpExtraHeaders('/tmp/wt', {runner:malformed}),
    'GITHUB_HTTP_AUTH_HEADER_CONFIG_UNOBSERVED');
  const unavailable = () => ({code:1, stdout:'', stderr:'withheld', signal:null, error:null});
  expectReason(() => owner.requireNoUrlSpecificHttpExtraHeaders('/tmp/wt', {runner:unavailable}),
    'GITHUB_HTTP_AUTH_HEADER_CONFIG_UNOBSERVED');
});

test('workflow OAuth scope parser fails closed on ambiguous or unavailable evidence', () => {
  assert.deepEqual(owner.parseGithubOauthScopes('x-oauth-scopes: workflow, repo, workflow\n'), ['repo','workflow']);
  expectReason(() => owner.parseGithubOauthScopes('x-oauth-scopes: repo\nx-oauth-scopes: workflow\n'),
    'GITHUB_AUTH_SCOPE_UNOBSERVED');
  const runner = (command) => {
    if (command === 'git') return {code:0, stdout:owner.FIXED_ORIGIN_URL + '\n', stderr:'', signal:null, error:null};
    return {code:1, stdout:'', stderr:'withheld', signal:null, error:null};
  };
  expectReason(() => owner.requireGithubWorkflowPushCredential(
    ['.github/workflows/a.yml'], '/tmp/wt', {runner}),
    'GITHUB_AUTH_SCOPE_UNOBSERVED');
});

test('workflow push clears inherited HTTP auth and uses the same fixed gh credential helper as the scope probe', () => {
  const calls = [];
  const runner = (command, args) => {
    calls.push([command, args]);
    if (command === 'git' && args.includes('remote')) {
      return {code:0, stdout:owner.FIXED_ORIGIN_URL + '\n', stderr:'', signal:null, error:null};
    }
    if (command === owner.FIXED_GH) {
      return {code:0, stdout:'HTTP/2 200\r\nx-oauth-scopes: repo, workflow\r\n\r\n{}\n', stderr:'', signal:null, error:null};
    }
    return {code:0, stdout:'', stderr:'', signal:null, error:null};
  };
  owner.pushExactCandidate(
    runner, '/tmp/wt', 'a'.repeat(40), 'laptop/test', ['.github/workflows/a.yml']);
  const push = calls.find(([command, args]) => command === 'git' && args.includes('push'));
  assert.ok(push);
  assert.deepEqual(push[1], [
    '-C','/tmp/wt',
    '-c','http.extraHeader=',
    '-c','http.https://github.com/.extraHeader=',
    '-c','http.https://github.com/hanmiyoo10-alt/-.git.extraHeader=',
    '-c','credential.https://github.com.helper=',
    '-c','credential.https://github.com.helper=' + owner.FIXED_GITHUB_CREDENTIAL_HELPER,
    '-c','credential.https://github.com/hanmiyoo10-alt/-.git.helper=',
    '-c','credential.https://github.com/hanmiyoo10-alt/-.git.helper=' + owner.FIXED_GITHUB_CREDENTIAL_HELPER,
    'push','origin','a'.repeat(40) + ':refs/heads/laptop/test',
  ]);
  assert.equal(calls.some(([command]) => command === owner.FIXED_GH), true);

  calls.length = 0;
  owner.pushExactCandidate(runner, '/tmp/wt', 'b'.repeat(40), 'laptop/test', ['docs/a.md']);
  assert.deepEqual(calls, [[
    'git',
    ['-C','/tmp/wt','push','origin','b'.repeat(40) + ':refs/heads/laptop/test'],
  ]]);
});

test('workflow candidate path extraction uses staged or original candidate diff', () => {
  const calls = [];
  const runner = (command, args) => {
    calls.push([command, args]);
    if (args.includes('--cached')) {
      return {code:0, stdout:'R100\0.github/workflows/old.yml\0docs/new.yml\0', stderr:'', signal:null, error:null};
    }
    return {code:0, stdout:'R100\0.github/workflows/old.yml\0docs/new.yml\0', stderr:'', signal:null, error:null};
  };
  assert.deepEqual(owner.candidatePathsFromStagedDiff(runner, '/tmp/wt'),
    ['.github/workflows/old.yml','docs/new.yml']);
  assert.deepEqual(owner.candidatePathsFromCommitDiff(
    runner, '/tmp/wt', 'a'.repeat(40), 'b'.repeat(40)),
    ['.github/workflows/old.yml','docs/new.yml']);
  assert.deepEqual(calls[0][1],
    ['-C','/tmp/wt','diff','--cached','--name-status','-z','-M','--']);
  assert.deepEqual(calls[1][1],
    ['-C','/tmp/wt','diff','--name-status','-z','-M','a'.repeat(40),'b'.repeat(40),'--']);
});

test('workflow credential preflight follows staging and precedes commit/push effects', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../mcl-l-repository-owner.cjs'), 'utf8');
  const applyStart = source.indexOf('function executeApply');
  const applyEnd = source.indexOf('\nfunction inspect(', applyStart);
  const applyBlock = source.slice(applyStart, applyEnd);
  const stagedPaths = applyBlock.indexOf(
    'const candidatePaths = candidatePathsFromStagedDiff(runner, manifest.workspace.worktree);');
  const applyGate = applyBlock.indexOf(
    'requireGithubWorkflowPushCredential(candidatePaths, manifest.workspace.worktree, {runner});');
  assert.ok(stagedPaths >= 0);
  assert.ok(stagedPaths > applyBlock.indexOf("'apply', '--index'"));
  assert.ok(applyGate > stagedPaths);
  assert.ok(applyGate < applyBlock.indexOf("'commit', '-m'"));
  assert.ok(applyBlock.includes(
    'pushExactCandidate(runner, manifest.workspace.worktree, newHead, manifest.workspace.branch, candidatePaths);'));

  const contStart = source.indexOf('function executePreparedContinuation');
  const contEnd = source.indexOf('\nfunction fixedValidationChecks', contStart);
  const contBlock = source.slice(contStart, contEnd);
  const candidateGate = contBlock.indexOf("const candidatePaths = state.state === 'PUSHED' ? []");
  assert.ok(candidateGate >= 0);
  assert.ok(candidateGate < contBlock.indexOf("if (state.state === 'PREPARED')"));
  assert.ok(contBlock.includes('candidatePathsFromStagedDiff(runner, manifest.workspace.worktree)'));
  assert.ok(contBlock.includes('candidatePathsFromCommitDiff(runner, manifest.workspace.worktree,'));
  assert.ok(contBlock.includes(
    'pushExactCandidate(runner, manifest.workspace.worktree, state.finalHead, manifest.workspace.branch, candidatePaths);'));
  assert.equal(source.includes("'auth', 'refresh'"), false);
  assert.equal(source.includes('gh auth refresh'), false);
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

test('prepared continuation request binds exact immutable recovery lineage', () => {
  const value = owner.parsePreparedContinuationRequestText(JSON.stringify({
    schema:owner.CONTINUATION_REQUEST_SCHEMA,
    message:'feat: continue bounded L candidate',
    expected_paths:['z/file.md','a/file.cjs'],
    prepared_digest:'1'.repeat(64),
    prior_manifest_id:'2'.repeat(64),
    prior_blocked_receipt_id:'3'.repeat(64),
    blocker_repair_receipt:'4'.repeat(64),
  }));
  assert.deepEqual(value.expected_paths, ['a/file.cjs','z/file.md']);
  assert.equal(value.prepared_digest, '1'.repeat(64));
  expectReason(() => owner.parsePreparedContinuationRequestText(JSON.stringify({
    ...value, schema:'wrong',
  })), 'CONTINUATION_REQUEST_SCHEMA_INVALID');
});

test('prepared continuation manifest requires recovery lineage and prepared digest ref', () => {
  const request = {
    schema:owner.CONTINUATION_REQUEST_SCHEMA, message:'x', expected_paths:['a/file.cjs'],
    prepared_digest:'1'.repeat(64), prior_manifest_id:'2'.repeat(64),
    prior_blocked_receipt_id:'3'.repeat(64), blocker_repair_receipt:'4'.repeat(64),
  };
  const m = manifest({
    phaseId:'9001-recovery-rebind',
    scopes:['path:a/file.cjs','surface:mcl:test'],
    inputRefs:[
      'receipt:mcl-task-manifest:' + request.prior_manifest_id,
      'receipt:mcl-task-completion-receipt:' + request.prior_blocked_receipt_id,
      'receipt:canonical-main-stage:' + request.blocker_repair_receipt,
      'receipt:mcl-l-prepared-diff:' + request.prepared_digest,
    ],
  });
  assert.doesNotThrow(() => owner.validatePreparedContinuationManifestBinding(m, request));
  expectReason(() => owner.validatePreparedContinuationManifestBinding({...m, phaseId:'9001-normal'}, request),
    'CONTINUATION_RECOVERY_REBIND_REQUIRED');
  expectReason(() => owner.validatePreparedContinuationManifestBinding({...m, inputRefs:m.inputRefs.slice(0,3)}, request),
    'CONTINUATION_PREPARED_DIFF_REF_REQUIRED');
});

test('CLI exposes literal continue-prepared without generic patch or command selectors', () => {
  const parsed = owner.parseArgs([
    'continue-prepared','--manifest','m','--ledger','l','--packet','p',
    '--continuation-request','r','--pr-request','pr','--apply',
  ]);
  assert.equal(parsed.operation, 'continue-prepared');
  assert.equal(parsed.apply, true);
  assert.deepEqual(Object.keys(parsed.values).sort(),
    ['continuation-request','ledger','manifest','packet','pr-request']);
  expectReason(() => owner.parseArgs([
    'continue-prepared','--manifest','m','--ledger','l','--packet','p',
    '--continuation-request','r','--pr-request','pr','--patch','x','--apply',
  ]), 'ARGUMENT_UNSUPPORTED:patch');
});

function gitExec(cwd, args, options = {}) {
  const cp = childProcess.spawnSync('git', args, {cwd, encoding:'utf8', input:options.input, env:process.env});
  if (cp.status !== 0) throw new Error('git failed: ' + args.join(' ') + '\n' + (cp.stderr || cp.stdout));
  return cp.stdout || '';
}

test('prepared replay preserves identity across PREPARED COMMITTED CURRENTIZED and PUSHED', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-l-continuation-'));
  const remote = path.join(tmp, 'remote.git');
  const landing = path.join(tmp, 'landing');
  const feature = path.join(tmp, 'feature');
  try {
    gitExec(tmp, ['init','--bare',remote]);
    gitExec(tmp, ['clone',remote,landing]);
    gitExec(landing, ['config','user.name','fixture']);
    gitExec(landing, ['config','user.email','fixture@example.invalid']);
    fs.writeFileSync(path.join(landing, 'base.txt'), 'base\n');
    gitExec(landing, ['add','base.txt']);
    gitExec(landing, ['commit','-m','base']);
    gitExec(landing, ['branch','-M','main']);
    gitExec(landing, ['push','-u','origin','main']);
    const base = gitExec(landing, ['rev-parse','HEAD']).trim();
    gitExec(landing, ['worktree','add','-b','laptop/task-9001',feature,base]);
    gitExec(landing, ['push','origin',base + ':refs/heads/laptop/task-9001']);
    fs.writeFileSync(path.join(landing, 'main.txt'), 'main advance\n');
    gitExec(landing, ['add','main.txt']);
    gitExec(landing, ['commit','-m','main advance']);
    gitExec(landing, ['push','origin','main']);
    const currentMain = gitExec(landing, ['rev-parse','HEAD']).trim();
    fs.mkdirSync(path.join(feature, 'src'), {recursive:true});
    fs.writeFileSync(path.join(feature, 'src/new.cjs'), "'use strict';\nmodule.exports = 1;\n");
    gitExec(feature, ['add','src/new.cjs']);
    const prepared = gitExec(feature, ['diff','--cached','--binary','--']);
    const request = {
      schema:owner.CONTINUATION_REQUEST_SCHEMA, message:'feat: fixture candidate',
      expected_paths:['src/new.cjs'], prepared_digest:owner.sha256Bytes(Buffer.from(prepared,'utf8')),
      prior_manifest_id:'2'.repeat(64), prior_blocked_receipt_id:'3'.repeat(64),
      blocker_repair_receipt:'4'.repeat(64),
    };
    const m = manifest({
      workspace:{kind:'repository',branch:'laptop/task-9001',worktree:feature},
      observedBaseSha:base, scopes:['path:src/new.cjs','surface:mcl:test'],
    });
    const profile = {...owner.DEFAULT_PROFILE, landing, worktreeRoot:tmp};
    assert.equal(owner.classifyPreparedContinuationState(m, request, currentMain, {profile}).state, 'PREPARED');
    const replay = owner.verifyReplayAgainstCurrent(m, request, currentMain);
    assert.equal(replay.currentMain, currentMain);
    gitExec(feature, ['-c','user.name=' + owner.FIXED_BOT_NAME, '-c','user.email=' + owner.FIXED_BOT_EMAIL,
      'commit','-m',request.message]);
    const committed = owner.classifyPreparedContinuationState(m, request, currentMain, {profile});
    assert.equal(committed.state, 'COMMITTED');
    const replayAfterLostCommitAck = owner.verifyReplayAgainstCurrent(
      m, request, currentMain, {candidateHead:committed.candidateHead});
    assert.equal(replayAfterLostCommitAck.patchId, replay.patchId);
    gitExec(feature, ['-c','user.name=' + owner.FIXED_BOT_NAME, '-c','user.email=' + owner.FIXED_BOT_EMAIL,
      'merge','--no-ff','--no-edit',currentMain]);
    const currentized = owner.classifyPreparedContinuationState(m, request, currentMain, {profile});
    assert.equal(currentized.state, 'CURRENTIZED');
    gitExec(feature, ['push','origin','HEAD:refs/heads/laptop/task-9001']);
    const pushed = owner.classifyPreparedContinuationState(m, request, currentMain, {profile});
    assert.equal(pushed.state, 'PUSHED');
    assert.equal(pushed.candidateHead, committed.candidateHead);
  } finally {
    try { gitExec(landing, ['worktree','remove',feature]); } catch {}
    fs.rmSync(tmp, {recursive:true, force:true});
  }
});

console.log('ALL_TESTS_PASS', passed);
