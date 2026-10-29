'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const owner=require('../mcl-l-interrupted-recovery-rebind-invoke.cjs');

function parentBody({state='IN_PROGRESS',stage='EXPERIMENT_CLOSE'}={}) {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '# Parent',
    '',
    '## State',
    '\`' + state + '\`',
    '',
    '## Interaction stage',
    '',
    '\`AUTHORITY_SCOPE → IMPLEMENTATION_PR → VALIDATION_MERGE → POSTMERGE_CONVERGENCE → EXPERIMENT_CLOSE\`',
    '',
    '- Current stage: \`' + stage + '\`',
    '- Completed stage(s): \`AUTHORITY_SCOPE → IMPLEMENTATION_PR → VALIDATION_MERGE → POSTMERGE_CONVERGENCE\`',
    '- Next stage: \`EXPERIMENT_CLOSE\`',
    '',
    '## Bounded write scope',
    '',
    'Exactly:',
    '1. \`path:x/y\`',
    '2. \`surface:mcl:test\`',
  ].join('\n');
}

function parent(overrides={}) {
  return {state:'open',pull_request:null,body:parentBody(),...overrides};
}

function passOwner(overrides={}) {
  return {
    schemaVersion:1,
    mode:'MCL_L_INTERRUPTED_RECOVERY_REBIND',
    status:'PASS',
    reasonCodes:[],
    targetPacketRef:'#3473',
    recoveryState:'RECOVERY_REBOUND',
    oldLeaseId:'x'.repeat(64),
    newLeaseId:'x'.repeat(64),
    releasedGeneration:1312,
    reacquiredGeneration:1313,
    rebindManifestId:'a'.repeat(64),
    manifestCommentId:1,
    handoffCommentId:2,
    dirtyDiffSha256:'b'.repeat(64),
    dirtyPathCount:1,
    holderState:'ABSENT',
    nextLegalAction:'TARGET_PACKET_IMPLEMENTATION_CONTINUE_WITH_FRESH_HOLDER',
    authority:{...owner.FALSE_AUTHORITY},
    ...overrides,
  };
}

test('public CLI admits zero caller args only', () => {
  assert.deepEqual(owner.parseArgs([]), {});
  for (const argv of [['apply'],['--target','#3473'],['#3473'],['--apply']]) {
    assert.throws(() => owner.parseArgs(argv), /ARGUMENT_UNSUPPORTED/);
  }
});

test('parent guard requires open IN_PROGRESS EXPERIMENT_CLOSE', () => {
  assert.equal(owner.requireParentStage(parent()).lifecycle,'IN_PROGRESS');
  assert.throws(() => owner.requireParentStage(parent({state:'closed'})), /PARENT_PACKET_NOT_OPEN/);
  assert.throws(() => owner.requireParentStage(parent({body:parentBody({state:'DONE'})})), /PARENT_PACKET_NOT_IN_PROGRESS/);
  assert.throws(() => owner.requireParentStage(parent({body:parentBody({stage:'POSTMERGE_CONVERGENCE'})})), /PARENT_PACKET_STAGE_NOT_EXPERIMENT_CLOSE/);
});

test('invoker delegates only the fixed owner vector and sanitizes PASS receipt', async () => {
  let seen=null;
  const result=await owner.invokeFixed({
    readParent:()=>parent(),
    runOwner:async(args)=>{seen=args; return {code:0,text:JSON.stringify(passOwner())+'\n'};},
  });
  assert.deepEqual(seen,['apply','--target','#3473','--apply']);
  assert.equal(result.status,'PASS');
  assert.equal(result.target_packet_ref,'#3473');
  assert.equal(result.recovery_state,'RECOVERY_REBOUND');
  assert.equal(result.released_generation,1312);
  assert.equal(result.reacquired_generation,1313);
  assert.equal(result.rebind_manifest_id,'a'.repeat(64));
  assert.equal(result.holder_state,'ABSENT');
  assert.deepEqual(result.authority,owner.FALSE_AUTHORITY);
  const text=JSON.stringify(result);
  for(const forbidden of ['oldLeaseId','newLeaseId','manifestCommentId','handoffCommentId','dirtyDiffSha256']) {
    assert.equal(text.includes(forbidden),false,forbidden);
  }
});

test('non-pass owner result remains bounded and cannot manufacture success', async () => {
  const result=await owner.invokeFixed({
    readParent:()=>parent(),
    runOwner:async()=>({code:3,text:JSON.stringify({
      schemaVersion:1,mode:'MCL_L_INTERRUPTED_RECOVERY_REBIND',status:'UNKNOWN',
      reasonCodes:['X'],nextLegalAction:'TARGETED_DRILLDOWN_REQUIRED',
      authority:{...owner.FALSE_AUTHORITY},
    })+'\n'}),
  });
  assert.equal(result.status,'UNKNOWN');
  assert.equal(result.recovery_state,null);
  assert.deepEqual(result.reason_codes,['X']);
});

test('malformed or conflicting owner output fails closed', async () => {
  const malformed=await owner.runCli([],{
    readParent:()=>parent(),
    runOwner:async()=>({code:0,text:'not-json\n'}),
  });
  assert.equal(malformed.result.status,'UNKNOWN');
  assert.deepEqual(malformed.result.reason_codes,['OWNER_RESULT_JSON_INVALID']);

  const conflict=await owner.runCli([],{
    readParent:()=>parent(),
    runOwner:async()=>({code:0,text:JSON.stringify(passOwner({targetPacketRef:'#9999'}))+'\n'}),
  });
  assert.equal(conflict.result.status,'CONFLICT');
  assert.ok(conflict.result.reason_codes.includes('OWNER_TARGET_CONFLICT'));
});

test('blocked parent prevents owner invocation', async () => {
  let calls=0;
  const result=await owner.runCli([],{
    readParent:()=>parent({state:'closed'}),
    runOwner:async()=>{calls++; return {code:0,text:JSON.stringify(passOwner())+'\n'};},
  });
  assert.equal(calls,0);
  assert.equal(result.result.status,'BLOCKED');
  assert.ok(result.result.reason_codes.includes('PARENT_PACKET_NOT_OPEN'));
});

test('source exposes no generic execution or lower-level coordination effect surface', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','mcl-l-interrupted-recovery-rebind-invoke.cjs'),'utf8');
  for(const required of [
    "Object.freeze(['apply', '--target', TARGET_PACKET_REF, '--apply'])",
    "const TARGET_PACKET_REF = '#3473'",
    "const PARENT_PACKET = 3561",
    "recoveryOwner.runCli(args)",
  ]) assert.ok(source.includes(required),required);
  for(const forbidden of [
    "require('node:child_process')",'spawn(','spawnSync(','exec(','execFile(',
    'eval(','process.env','planRelease(','planAcquire(','cleanupStale(','buildManifest(',
  ]) assert.equal(source.includes(forbidden),false,forbidden);
});
