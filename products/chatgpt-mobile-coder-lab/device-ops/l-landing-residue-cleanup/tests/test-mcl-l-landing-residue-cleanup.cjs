#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');

const taskLease = require('../../../coordination/task-lease.cjs');
const handoff = require('../../../coordination/task-handoff.cjs');
const owner = require('../mcl-l-landing-residue-cleanup.cjs');

let count = 0;
function test(name, fn) {
  try {
    fn();
    count += 1;
    process.stdout.write(`ok ${count} - ${name}\n`);
  } catch (error) {
    process.stderr.write(`not ok ${count + 1} - ${name}\n${error.stack}\n`);
    throw error;
  }
}
function sh(cwd, args) {
  const r = childProcess.spawnSync(args[0], args.slice(1), {
    cwd, encoding:'utf8', shell:false, maxBuffer:1024*1024,
  });
  if (r.status !== 0) throw new Error(`${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout;
}
function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-l-residue-'));
  const repo = path.join(root, 'repo');
  const remote = path.join(root, 'remote.git');
  fs.mkdirSync(repo);
  sh(root, ['git','init','--bare','-q',remote]);
  sh(repo, ['git','init','-q','-b','main']);
  sh(repo, ['git','config','user.name','fixture']);
  sh(repo, ['git','config','user.email','fixture@example.invalid']);
  fs.writeFileSync(path.join(repo,'README.md'), 'fixture\n');
  sh(repo, ['git','add','README.md']);
  sh(repo, ['git','commit','-qm','baseline']);
  sh(repo, ['git','remote','add','origin',remote]);
  const head = sh(repo, ['git','rev-parse','HEAD']).trim();

  const target = path.join(repo, owner.FIXED_PATH);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, Buffer.from('fixture-pyc-v1'));
  fs.chmodSync(target, 0o644);
  const residueSha = digest(fs.readFileSync(target));

  const packetText = [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '## State',
    '`IN_PROGRESS`',
    '',
    '## Interaction stage',
    '- Current stage: `EXPERIMENT_CLOSE`',
    '- Completed stage(s): `AUTHORITY_SCOPE / IMPLEMENTATION_PR / VALIDATION_MERGE / POSTMERGE_CONVERGENCE`',
    '- Next stage: `EXPERIMENT_CLOSE`',
  ].join('\n');
  const packetBodySha256 = taskLease.digest(packetText);
  const normalized = taskLease.normalizeAcquireRequest({
    expectedGeneration: 1,
    packetRef: '#3734',
    packetBodySha256,
    route: 'L',
    executor: 'L',
    scopes: [...owner.FIXED_SCOPES],
    scopeDisposition: 'DISJOINT',
    workspaceKind: 'landing_residue_cleanup',
    branch: 'main',
    worktree: '/home/alsl0/nyang-repo',
    observedBaseSha: head,
  });
  assert.equal(normalized.ok, true);
  const lease = normalized.lease;
  const ledgerText = taskLease.renderLedger({
    schemaVersion:1,
    scope:'chatgpt-mobile-coder-lab',
    mode:'MCL_TASK_LEASE_LEDGER',
    status:'ACTIVE',
    generation:2,
    controllerPath:taskLease.CONTROLLER_PATH,
    controllerCommit:'a'.repeat(40),
    packetRef:taskLease.OWNER_PACKET_REF,
    activeLeases:[lease],
    lastRelease:null,
  });
  const manifest = handoff.buildManifest({
    schemaVersion:1,
    mode:'MCL_TASK_MANIFEST',
    packetRef:'#3734',
    packetBodySha256,
    phaseId:'3734-experiment-close-cleanup',
    phaseClass:'REPOSITORY_MUTATION',
    route:'L',
    executor:'L',
    scopes:[...owner.FIXED_SCOPES],
    workspace:{kind:'landing_residue_cleanup',branch:'main',worktree:'/home/alsl0/nyang-repo'},
    observedBaseSha:head,
    leaseRequirement:'REQUIRED',
    leaseEvidence:{ledgerRef:'#2352',leaseId:lease.leaseId,acquiredGeneration:2,acquireEvidenceRef:'run:1'},
    sourceAuthorityRefs:['#3734','issue:#2352'],
    inputRefs:['receipt:mcl-l-landing-residue-sha256:' + residueSha],
    expectedOutputRefs:[owner.FIXED_PATH_SCOPE],
    acceptanceRefs:['#3734'],
    stopCondition:'Remove only the fixed generated residue and preserve every repository identity.',
    authority:{
      repositoryMutationAuthorized:false,
      deviceMutationAuthorized:false,
      mergeAuthorized:false,
      releaseAuthorized:false,
      productionAuthorized:false,
    },
  });
  const manifestText = handoff.renderManifest(manifest);
  return {
    root, repo, remote, target, residueSha, packetText, ledgerText, manifest, manifestText,
    profile:{landing:repo,allowedOrigins:[remote]},
    input(){return {manifestText:this.manifestText,ledgerText:this.ledgerText,packetText:this.packetText};},
    cleanup(){fs.rmSync(root,{recursive:true,force:true});},
  };
}
function withFixture(fn) {
  const f=fixture();
  try { fn(f); } finally { f.cleanup(); }
}
function mutateManifest(f, mutate) {
  const keys = [
    'schemaVersion','mode','packetRef','packetBodySha256','phaseId','phaseClass','route','executor',
    'scopes','workspace','observedBaseSha','leaseRequirement','leaseEvidence','sourceAuthorityRefs',
    'inputRefs','expectedOutputRefs','acceptanceRefs','stopCondition','authority',
  ];
  const core=Object.fromEntries(keys.map((key)=>[key,f.manifest[key]]));
  mutate(core);
  f.manifestText=handoff.renderManifest(handoff.buildManifest(core));
}

test('inspect accepts exact residue without mutation', () => withFixture((f) => {
  const before=fs.readFileSync(f.target);
  const r=owner.inspectEvidence(f.input(),{profile:f.profile});
  assert.equal(r.status,'ELIGIBLE');
  assert.equal(r.stateChanged,false);
  assert.equal(r.expectedResidueSha256,f.residueSha);
  assert.deepEqual(fs.readFileSync(f.target),before);
}));
test('apply removes exact residue and preserves Git identity', () => withFixture((f) => {
  const before=owner.repositorySnapshot(f.profile);
  const r=owner.applyEvidence(f.input(),{profile:f.profile});
  assert.equal(r.status,'PASS');
  assert.equal(r.stateChanged,true);
  assert.equal(fs.existsSync(f.target),false);
  assert.equal(fs.existsSync(path.dirname(f.target)),false);
  assert.equal(sh(f.repo,['git','status','--porcelain=v1','-uall']),'');
  assert.deepEqual(owner.repositorySnapshot(f.profile),before);
}));
test('wrong manifest residue hash blocks', () => withFixture((f) => {
  mutateManifest(f,(m)=>{m.inputRefs=['receipt:mcl-l-landing-residue-sha256:'+'0'.repeat(64)];});
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/RESIDUE_HASH_MISMATCH/);
}));
test('second parent entry blocks', () => withFixture((f) => {
  fs.writeFileSync(path.join(path.dirname(f.target),'other.pyc'),'x');
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/WORKTREE_STATUS_NOT_EXACT_RESIDUE|PARENT_DIR_NOT_EXACT/);
}));
test('extra dirty path blocks', () => withFixture((f) => {
  fs.writeFileSync(path.join(f.repo,'extra.tmp'),'x');
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/WORKTREE_STATUS_NOT_EXACT_RESIDUE/);
}));
test('tracked dirty blocks', () => withFixture((f) => {
  fs.appendFileSync(path.join(f.repo,'README.md'),'dirty\n');
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/WORKTREE_STATUS_NOT_EXACT_RESIDUE|TRACKED_DIFF_PRESENT/);
}));
test('staged dirty blocks', () => withFixture((f) => {
  fs.appendFileSync(path.join(f.repo,'README.md'),'dirty\n');
  sh(f.repo,['git','add','README.md']);
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/WORKTREE_STATUS_NOT_EXACT_RESIDUE|STAGED_DIFF_PRESENT/);
}));
test('symlink residue blocks', () => withFixture((f) => {
  fs.unlinkSync(f.target);
  fs.symlinkSync(path.join(f.repo,'README.md'),f.target);
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/RESIDUE_TYPE_INVALID|WORKTREE_STATUS_NOT_EXACT_RESIDUE/);
}));
test('packet outside EXPERIMENT_CLOSE blocks', () => withFixture((f) => {
  f.packetText=f.packetText.replace('`EXPERIMENT_CLOSE`','`IMPLEMENTATION_PR`');
  const sha=taskLease.digest(f.packetText);
  mutateManifest(f,(m)=>{m.packetBodySha256=sha;});
  const parsed=taskLease.parseLedger(f.ledgerText);
  parsed.state.activeLeases[0].packetBodySha256=sha;
  f.ledgerText=taskLease.renderLedger(parsed.state);
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/PACKET_STAGE_NOT_EXPERIMENT_CLOSE/);
}));
test('released lease blocks', () => withFixture((f) => {
  const parsed=taskLease.parseLedger(f.ledgerText);
  parsed.state.activeLeases=[];
  f.ledgerText=taskLease.renderLedger(parsed.state);
  assert.throws(()=>owner.inspectEvidence(f.input(),{profile:f.profile}),/ACTIVE_LEASE_NOT_EXACT/);
}));
test('apply CLI requires explicit flag', () => {
  assert.throws(()=>owner.parseArgs(['apply','--manifest','a','--ledger','b','--packet','c']),/APPLY_FLAG_REQUIRED/);
});
test('source has only exact unlink and empty-parent removal', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','mcl-l-landing-residue-cleanup.cjs'),'utf8');
  for (const forbidden of [
    'rmSync(', 'git clean', "'clean'", '"clean"', 'reset', 'stash', 'checkout', 'switch',
    'execSync(', 'shell: true', '--path', '--repo', '--worktree', '--hash', '--glob', '--force',
  ]) assert.equal(source.includes(forbidden),false,forbidden);
  assert.equal(source.includes('fs.unlinkSync(physical.target)'),true);
  assert.equal(source.includes('fs.rmdirSync(physical.parent)'),true);
});

process.stdout.write(`PASS mcl-l-landing-residue-cleanup ${count} tests\n`);
