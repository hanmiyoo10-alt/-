'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const lease = require('../task-lease.cjs');
const handoff = require('../task-handoff.cjs');
const holder = require('../mcl-workspace-holder.cjs');

let count = 0;
function ok(name, fn) {
  fn(); count += 1; process.stdout.write(`ok ${count} - ${name}\n`);
}
async function okAsync(name, fn) {
  await fn(); count += 1; process.stdout.write(`ok ${count} - ${name}\n`);
}
function run(args, cwd) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {cwd, encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return (result.stdout || '').trim();
}
function activeState() {
  return {schemaVersion:1, scope:'chatgpt-mobile-coder-lab', mode:'MCL_TASK_LEASE_LEDGER', status:'ACTIVE',
    generation:1, controllerPath:lease.CONTROLLER_PATH, controllerCommit:'a'.repeat(40), packetRef:lease.OWNER_PACKET_REF,
    activeLeases:[], lastRelease:null};
}
function fixture(name, {actualBranch = null, manifestBranch = null, createWorktree = true} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `mcl-holder-${name}-`));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  run(['git','init','-q'], repo);
  fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
  run(['git','add','seed.txt'], repo);
  run(['git','-c','user.name=test','-c','user.email=test@example.invalid','commit','-qm','seed'], repo);
  const suffix = `${process.pid}-${name}-${path.basename(root).slice(-6)}`;
  const branch = actualBranch || `server/${suffix}`;
  const declaredBranch = manifestBranch || branch;
  const worktree = `/root/nyang-worktrees/${suffix}`;
  if (createWorktree) run(['git','worktree','add','-q','-b',branch,worktree,'HEAD'], repo);
  const baseSha = run(['git','rev-parse','HEAD'], repo);
  const packetBody = '<!-- canonical-main-work-packet:v1 -->\n**State: IN_PROGRESS**\n';
  const packetHash = lease.digest(packetBody);
  const scope = 'path:products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs';
  const request = {expectedGeneration:1, packetRef:'#2404', packetBodySha256:packetHash, route:'S', executor:'S',
    scopes:[scope], scopeDisposition:'DISJOINT', workspaceKind:'repository', branch:declaredBranch, worktree, observedBaseSha:baseSha};
  const plan = lease.planAcquire(activeState(), request);
  assert.equal(plan.status, 'ACQUIRE_READY');
  const parsed = lease.parseLedger(plan.updatedBody);
  assert.equal(parsed.ok, true);
  const active = parsed.state.activeLeases[0];
  const manifest = handoff.buildManifest({schemaVersion:1, mode:'MCL_TASK_MANIFEST', packetRef:'#2404', packetBodySha256:packetHash,
    phaseId:`test-${name}`, phaseClass:'REPOSITORY_MUTATION', route:'S', executor:'S', scopes:[scope],
    workspace:{kind:'repository', branch:declaredBranch, worktree}, observedBaseSha:baseSha, leaseRequirement:'REQUIRED',
    leaseEvidence:{ledgerRef:'#2352', leaseId:active.leaseId, acquiredGeneration:2, acquireEvidenceRef:'run:1'},
    sourceAuthorityRefs:['issue:#2404'], inputRefs:[`commit:${baseSha}`], expectedOutputRefs:['receipt:test-holder'],
    acceptanceRefs:['issue:#2404'], stopCondition:'test fixture', authority:{repositoryMutationAuthorized:false,
      deviceMutationAuthorized:false, mergeAuthorized:false, releaseAuthorized:false, productionAuthorized:false}});
  const files = {manifest:path.join(root,'manifest.json'), ledger:path.join(root,'ledger.txt'), packet:path.join(root,'packet.txt')};
  fs.writeFileSync(files.manifest, `${JSON.stringify(manifest,null,2)}\n`);
  fs.writeFileSync(files.ledger, plan.updatedBody);
  fs.writeFileSync(files.packet, packetBody);
  const release = lease.planRelease(parsed.state, {expectedGeneration:2, leaseId:active.leaseId, packetRef:'#2404'});
  assert.equal(release.status, 'RELEASE_READY');
  const releasedLedger = path.join(root,'ledger-released.txt');
  fs.writeFileSync(releasedLedger, release.updatedBody);
  const input = {manifestPath:files.manifest, ledgerPath:files.ledger, packetPath:files.packet};
  function cleanup() {
    if (createWorktree && fs.existsSync(worktree)) {
      const inspected = holder.inspectWorkspace(manifest);
      if (inspected.holderPath && fs.existsSync(inspected.holderPath)) fs.unlinkSync(inspected.holderPath);
      run(['git','worktree','remove',worktree], repo);
    }
    fs.rmSync(root,{recursive:true,force:true});
  }
  return {root,repo,branch,declaredBranch,worktree,manifest,active,input,releasedLedger,files,cleanup};
}
function releasedInput(f) { return {...f.input, ledgerPath:f.releasedLedger}; }
function spawnClaim(f) {
  const helperPath = path.resolve(__dirname,'..','mcl-workspace-holder.cjs');
  return new Promise((resolve) => {
    const child = childProcess.spawn(process.execPath,[helperPath,'claim','--manifest',f.files.manifest,'--ledger',f.files.ledger,'--packet',f.files.packet],
      {stdio:['ignore','pipe','pipe','pipe']});
    let stdout='', stderr='', secret='';
    child.stdout.on('data',(d)=>{stdout+=d;});
    child.stderr.on('data',(d)=>{stderr+=d;});
    child.stdio[3].on('data',(d)=>{secret+=d;});
    child.on('close',(code)=>resolve({code,stdout,stderr,secret:secret.trim(),result:JSON.parse(stdout)}));
  });
}

(async () => {
  ok('M repository workspace shape remains valid without claiming it', () => {
    assert.deepEqual(lease.validateWorkspace({kind:'repository',branch:'mainphone/holder-test',
      worktree:'/data/data/com.termux/files/home/nyang-worktrees/holder-test'},'M'),[]);
  });

  ok('first claim creates only bounded holder state and returns secret separately', () => {
    const f=fixture('first');
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'CLAIMED');
      assert.match(claimed.secret,/^[0-9a-f]{64}$/);
      assert.equal('secret' in claimed.result,false);
      const inspected=holder.inspectWorkspace(f.manifest);
      const record=holder.readHolder(inspected.holderPath);
      assert.equal(record.ok,true);
      assert.equal(record.value.claimDigest,holder.claimDigest(claimed.secret));
      assert.equal(fs.statSync(inspected.holderPath).mode & 0o777,0o600);
    } finally { f.cleanup(); }
  });

  await okAsync('second independent process fails closed on the same held worktree', async () => {
    const f=fixture('second');
    try {
      const first=holder.claimHolder(f.input);
      assert.equal(first.result.status,'CLAIMED');
      const second=await spawnClaim(f);
      assert.equal(second.code,2);
      assert.equal(second.result.status,'BLOCKED');
      assert.ok(second.result.reasonCodes.includes('HOLDER_ALREADY_EXISTS'));
      assert.equal(second.secret,'');
      assert.equal(second.stdout.includes(first.secret),false);
    } finally { f.cleanup(); }
  });

  ok('correct claim checks pass and a wrong claim fails closed', () => {
    const f=fixture('check');
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(holder.checkHolder(f.input,claimed.secret).status,'CHECK_PASS');
      const wrong=holder.checkHolder(f.input,'f'.repeat(64));
      assert.equal(wrong.status,'BLOCKED');
      assert.ok(wrong.reasonCodes.includes('HOLDER_CLAIM_INVALID'));
    } finally { f.cleanup(); }
  });

  ok('two disjoint leased worktrees can hold independent guards', () => {
    const a=fixture('disjoint-a');
    const b=fixture('disjoint-b');
    try {
      const ca=holder.claimHolder(a.input);
      const cb=holder.claimHolder(b.input);
      assert.equal(ca.result.status,'CLAIMED');
      assert.equal(cb.result.status,'CLAIMED');
      assert.notEqual(holder.inspectWorkspace(a.manifest).holderPath,holder.inspectWorkspace(b.manifest).holderPath);
    } finally { a.cleanup(); b.cleanup(); }
  });

  ok('packet-body drift blocks holder reuse', () => {
    const f=fixture('packet-drift');
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'CLAIMED');
      fs.writeFileSync(f.files.packet,'<!-- canonical-main-work-packet:v1 -->\n**State: REVIEW**\n');
      const checked=holder.checkHolder(f.input,claimed.secret);
      assert.equal(checked.status,'BLOCKED');
      assert.ok(checked.reasonCodes.includes('PACKET_BODY_HASH_DRIFT'));
    } finally { f.cleanup(); }
  });

  ok('branch identity drift blocks before holder use', () => {
    const f=fixture('branch-drift',{manifestBranch:'server/declared-holder-branch'});
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'BLOCKED');
      assert.ok(claimed.result.reasonCodes.includes('WORKTREE_BRANCH_CONFLICT'));
    } finally { f.cleanup(); }
  });

  ok('missing worktree blocks before holder creation', () => {
    const f=fixture('missing',{createWorktree:false});
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'BLOCKED');
      assert.ok(claimed.result.reasonCodes.includes('WORKTREE_MISSING'));
    } finally { f.cleanup(); }
  });

  ok('malformed holder state fails closed', () => {
    const f=fixture('malformed');
    try {
      const inspected=holder.inspectWorkspace(f.manifest);
      fs.writeFileSync(inspected.holderPath,'not-json\n',{mode:0o600});
      const checked=holder.checkHolder(f.input,'a'.repeat(64));
      assert.equal(checked.status,'BLOCKED');
      assert.ok(checked.reasonCodes.includes('HOLDER_MALFORMED'));
    } finally { f.cleanup(); }
  });

  ok('active lease forbids holder release and stale cleanup', () => {
    const f=fixture('active-release');
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'CLAIMED');
      const release=holder.releaseHolder(f.input,claimed.secret);
      assert.equal(release.status,'BLOCKED');
      assert.ok(release.reasonCodes.includes('LEASE_STILL_ACTIVE'));
      const cleanup=holder.cleanupStale({...f.input,ledgerPath:f.files.ledger});
      assert.equal(cleanup.status,'BLOCKED');
      assert.ok(cleanup.reasonCodes.includes('LEASE_STILL_ACTIVE'));
    } finally { f.cleanup(); }
  });

  ok('matching holder releases only after the D-013 lease is absent', () => {
    const f=fixture('released');
    try {
      const claimed=holder.claimHolder(f.input);
      const result=holder.releaseHolder(releasedInput(f),claimed.secret);
      assert.equal(result.status,'RELEASED');
      assert.equal(fs.existsSync(holder.inspectWorkspace(f.manifest).holderPath),false);
    } finally { f.cleanup(); }
  });

  ok('stale cleanup after lease absence removes only exact matching holder', () => {
    const f=fixture('stale');
    try {
      assert.equal(holder.claimHolder(f.input).result.status,'CLAIMED');
      const result=holder.cleanupStale(releasedInput(f));
      assert.equal(result.status,'STALE_CLEANED');
      assert.equal(fs.existsSync(holder.inspectWorkspace(f.manifest).holderPath),false);
    } finally { f.cleanup(); }
  });

  ok('foreign valid-looking holder identity cannot be stale-cleaned', () => {
    const f=fixture('foreign');
    try {
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'CLAIMED');
      const inspected=holder.inspectWorkspace(f.manifest);
      const record=holder.readHolder(inspected.holderPath).value;
      fs.writeFileSync(inspected.holderPath,`${JSON.stringify({...record,manifestId:'e'.repeat(64)})}\n`);
      const result=holder.cleanupStale(releasedInput(f));
      assert.equal(result.status,'BLOCKED');
      assert.ok(result.reasonCodes.includes('HOLDER_IDENTITY_CONFLICT'));
    } finally { f.cleanup(); }
  });

  ok('symlinked workspace path fails closed', () => {
    const f=fixture('symlink',{createWorktree:false});
    try {
      fs.symlinkSync(f.repo,f.worktree,'dir');
      const claimed=holder.claimHolder(f.input);
      assert.equal(claimed.result.status,'BLOCKED');
      assert.ok(claimed.result.reasonCodes.includes('WORKTREE_SYMLINK_OR_ALIAS'));
    } finally {
      if (fs.lstatSync(f.worktree,{throwIfNoEntry:false})?.isSymbolicLink()) fs.unlinkSync(f.worktree);
      f.cleanup();
    }
  });

  await okAsync('CLI claim keeps raw holder claim off stdout and durable holder state', async () => {
    const f=fixture('cli-secret');
    try {
      const claimed=await spawnClaim(f);
      assert.equal(claimed.code,0);
      assert.equal(claimed.result.status,'CLAIMED');
      assert.match(claimed.secret,/^[0-9a-f]{64}$/);
      assert.equal(claimed.stdout.includes(claimed.secret),false);
      const inspected=holder.inspectWorkspace(f.manifest);
      const raw=fs.readFileSync(inspected.holderPath,'utf8');
      assert.equal(raw.includes(claimed.secret),false);
      assert.equal(Object.keys(JSON.parse(raw)).sort().join(','),'claimDigest,leaseId,manifestId,mode,schemaVersion');
    } finally { f.cleanup(); }
  });

  ok('holder output never grants repository or other mutation authority', () => {
    const result=holder.output('BLOCKED',['TEST']);
    assert.deepEqual(result.authority,{
      repositoryMutationAuthorized:false, deviceMutationAuthorized:false,
      mergeAuthorized:false, releaseAuthorized:false, productionAuthorized:false,
    });
  });

  process.stdout.write(`# workspace-holder contract: ${count}/${count} PASS\n`);
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode=1;
});
