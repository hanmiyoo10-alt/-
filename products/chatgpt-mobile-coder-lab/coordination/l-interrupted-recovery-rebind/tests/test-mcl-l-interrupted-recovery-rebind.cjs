'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),o=require('../mcl-l-interrupted-recovery-rebind.cjs');
const H=n=>String(n).repeat(64),S=n=>String(n).repeat(40),id=H('a'),ph=o.sha256('p'),main=S('2'),base=S('3'),sc=['path:x/y','surface:mcl:x'],ws={kind:'repository',branch:'laptop/x',worktree:'/home/alsl0/nyang-worktrees/x'},lease=()=>({leaseId:id,packetRef:'#3473',packetBodySha256:ph,route:'L',executor:'L',scopes:sc,workspace:ws,observedBaseSha:base});
const blobs=()=>Object.fromEntries(o.OWNER_BLOB_PATHS.map((p,i)=>[p,S((i%8)+1)]));
function A(x={}){let v={schemaVersion:1,mode:'MCL_L_INTERRUPTED_RECOVERY_REBIND_ACTIVATION',targetPacketRef:'#3473',packetBodySha256:ph,admissionMainSha:main,ownerBlobs:blobs(),scopes:sc,workspace:ws,observedBaseSha:base,leaseId:id,oldAcquiredGeneration:10,oldManifestId:H('b'),oldManifestPayloadSha256:H('c'),classificationDigest:H('f'),coreReceiptDigest:H('1'),dirtyDisposition:'UNSTAGED_ONLY',dirtyDiffSha256:H('e'),dirtyPaths:['x/y'],releasePlanGeneration:null,releaseExpectedGeneration:null,releaseDispatchStarted:false,releaseGeneration:21,releaseEvidenceRef:'run:21',acquirePlanGeneration:null,acquireExpectedGeneration:null,acquireDispatchStarted:false,reacquireGeneration:22,reacquireEvidenceRef:'run:22',rebindManifestId:null,rebindManifestPayloadSha256:null,manifestCommentId:null,handoffCommentId:null,...x};return {...v,recordDigest:o.sha256(v)}}
function P(v=A(),x={}){return {activation:v,authority:{mainSha:main},packet:{packetNumber:3473,packetRef:'#3473',packetBodySha256:ph,scopes:sc,issue:{body:'p'}},ledger:{issue:{body:x.l||'l'},state:{generation:x.g||22}},currentLease:x.off?null:lease(),oldManifest:{manifestId:H('b')},holder:{state:x.h||'PRESENT_EXACT'},workspace:{dirtyDisposition:v.dirtyDisposition,dirtyDiffSha256:H('e'),dirtyPaths:['x/y']},rebindManifest:null}}
function U(v,p){let n={...v,...p};delete n.recordDigest;return o.normalizeActivation({...n,recordDigest:o.sha256(n)})}

test('flock and current-lineage discovery',()=>{const s=fs.readFileSync(path.resolve(__dirname,'../mcl-l-interrupted-recovery-rebind.cjs'),'utf8');for(const q of ['/usr/bin/flock','/usr/bin/cat','await deps.acquireActivationLock(workspace)','deps.assertActivationLock(lock)'])a.ok(s.includes(q));a.ok(!s.includes("fs.openSync(file, 'wx'"));const v=A(),pkt={packetRef:'#3473',packetBodySha256:ph,scopes:sc};let seen=[];a.equal(o.findActivation('#3473',[{manifest:{packetRef:'#3473',packetBodySha256:H('9'),route:'L',executor:'L',scopes:sc,workspace:{...ws,worktree:'/gone'}}},{manifest:{packetRef:'#3473',packetBodySha256:ph,route:'L',executor:'L',scopes:sc,workspace:ws}}],pkt,w=>(seen.push(w.worktree),v)).recordDigest,v.recordDigest);a.deepEqual(seen,[ws.worktree])});

test('fresh ledger gates stale-holder cleanup',()=>{const v=A(),st=P(v,{off:true});let n=0;a.throws(()=>o.cleanupStep(st,{cleanupStale:()=>n++},()=>P(v)),/D013_REACQUIRED_BEFORE_HOLDER_CLEANUP/);o.cleanupStep(st,{cleanupStale:(_m,l)=>{n++;a.equal(l,'fresh');return {status:'STALE_CLEANED'}}},()=>P(v,{off:true,l:'fresh'}));a.equal(n,1)});

test('rebind publication binds final reacquire evidence',()=>{let v=A(),m=o.buildRebindManifest({activation:v,issueBody:'p',lease:lease(),acquiredGeneration:22,acquireEvidenceRef:'run:22',mainSha:main});a.ok(m.phaseId.endsWith('-g22'));v=A({rebindManifestId:m.manifestId,rebindManifestPayloadSha256:m.payloadSha256});a.equal(o.findRebindManifest(v,[{manifest:m}]).manifest.manifestId,m.manifestId);a.throws(()=>o.findRebindManifest(v,[{manifest:{...m,leaseEvidence:{...m.leaseEvidence,acquiredGeneration:23}}}]),/REBIND_MANIFEST_ACQUISITION_CONFLICT/);let cap,c=[];const d={buildManifest:x=>(cap=x,{manifestId:H('4'),payloadSha256:H('5'),phaseId:'3473-implementation-pr-recovery-rebind-g22'}),renderManifest:()=> 'm',renderHandoff:()=> 'h',readComments:()=>c,postComment:(_i,b)=>{let z=c.length+1;c.push({id:z,body:b});return z},updateActivation:U},fresh=P(v,{h:'ABSENT'});fresh.authority.mainSha=S('8');o.publishRebind(fresh,d,()=>fresh);a.equal(cap.acquiredGeneration,22);a.equal(cap.acquireEvidenceRef,'run:22');a.equal(cap.mainSha,main);a.equal(o.expectedGenerationForPlan({ledgerGeneration:9,reasonCodes:['LEASE_ALREADY_RELEASED']},'LEASE_ALREADY_RELEASED'),9);const s=fs.readFileSync(path.resolve(__dirname,'../mcl-l-interrupted-recovery-rebind.cjs'),'utf8');for(const q of ["'commit'","'push'","'reset'","'stash'","'rebase'"])a.ok(!s.includes(q))});


test('session admission uses native WSL node and fixed inspect only',()=>{
  const calls=[];
  const receipt={schema:'mcl-l-rdc-session-evidence.v2',status:'PASS',executor:'L',
    sessionState:'ABSENT',reasonCode:'SOLE_RDC_COMMAND_SESSION',
    owner:'mcl-l-rdc-session-evidence',details:'withheld',
    authority:{repositoryMutationAuthorized:false,deviceMutationAuthorized:false,
      mergeAuthorized:false,releaseAuthorized:false,productionAuthorized:false}};
  const deps=o.defaultDeps({client:{},binaryRunner:(args)=>{
    calls.push(args);
    return {code:0,stdout:JSON.stringify(receipt),stderr:''};
  }});
  a.deepEqual(deps.readSession(),receipt);
  a.equal(calls.length,1);
  a.equal(calls[0][0],process.execPath);
  a.equal(calls[0][2],'inspect');
  a.ok(calls[0][1].endsWith('/products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs'));
  const source=fs.readFileSync(path.resolve(__dirname,'../mcl-l-interrupted-recovery-rebind.cjs'),'utf8');
  a.equal(source.includes("runner(['wslpath', '-w', source])"),false);
  a.equal(source.includes("/mnt/c/Program Files/nodejs/node.exe"),false);
});

test('session admission preserves bounded semantic UNKNOWN exit 3',()=>{
  const receipt={schema:'mcl-l-rdc-session-evidence.v2',status:'UNKNOWN',executor:'L',
    sessionState:'UNKNOWN',reasonCode:'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
    owner:'mcl-l-rdc-session-evidence',details:'withheld',
    authority:{repositoryMutationAuthorized:false,deviceMutationAuthorized:false,
      mergeAuthorized:false,releaseAuthorized:false,productionAuthorized:false}};
  const deps=o.defaultDeps({client:{},binaryRunner:()=>({
    code:3,stdout:JSON.stringify(receipt),stderr:''
  })});
  a.deepEqual(deps.readSession(),receipt);
});

test('session admission rejects execution failure and invalid JSON',()=>{
  let deps=o.defaultDeps({client:{},binaryRunner:()=>({
    code:64,stdout:'{}',stderr:''
  })});
  a.throws(()=>deps.readSession(),/SESSION_OWNER_EXECUTION_FAILED/);
  deps=o.defaultDeps({client:{},binaryRunner:()=>({
    code:0,stdout:'not-json',stderr:''
  })});
  a.throws(()=>deps.readSession(),/SESSION_OWNER_EXECUTION_FAILED/);
});


test('packet-activity evidence file is parsed with the stage-entry validator',()=>{
  const root=fs.mkdtempSync('/tmp/mcl-rebind-activity-');
  const file=path.join(root,'activity.json');
  const evidence={
    schemaVersion:1,
    mode:'MCL_STAGE_ENTRY_PACKET_ACTIVITY_EVIDENCE_SET',
    requesterRef:'#3473',
    candidates:[{
      candidateRef:'#3762',
      evidence:{
        schemaVersion:1,
        mode:'WORK_SYSTEM_PACKET_ACTIVITY_EVIDENCE',
        candidateRef:'#3762',
        requesterRef:'#3473',
        relationship:'PARENT_WAITING_ON_SUCCESSOR',
        repositoryMutationActive:false,
        activeLease:false,
        overlappingOpenPr:false,
        sequencingExplicit:true,
        sourceRefs:['issue:#3762','issue:#3473'],
      },
    }],
  };
  try{
    fs.writeFileSync(file,JSON.stringify(evidence));
    const parsed=o.readPacketActivityEvidenceFile(file,3473);
    a.equal(parsed.requesterRef,'#3473');
    a.equal(parsed.candidates[0].candidateRef,'#3762');
    a.throws(()=>o.readPacketActivityEvidenceFile(file,3474),/PACKET_ACTIVITY_EVIDENCE_REQUESTER_CONFLICT/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('rebind CLI accepts one packet-activity evidence file and rejects duplicates',()=>{
  const parsed=o.parseArgs(['inspect','--target','#3473','--packet-activity-evidence-file','/tmp/activity.json']);
  a.equal(parsed.packetActivityEvidenceFile,'/tmp/activity.json');
  a.throws(()=>o.parseArgs([
    'inspect','--target','#3473',
    '--packet-activity-evidence-file','/tmp/a.json',
    '--packet-activity-evidence-file','/tmp/b.json',
  ]),/ARGUMENT_DUPLICATE:packet-activity-evidence-file/);
});

test('target overlap receives validated packet-activity evidence',()=>{
  const packetBody=[
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    '`IN_PROGRESS`',
    '## Bounded write scope',
    '1. `path:x/y`',
    '2. `surface:mcl:x`',
    '## Interaction stage',
    '- Current stage: `IMPLEMENTATION_PR`',
    '- Completed stage(s): `AUTHORITY_SCOPE`',
    '- Next stage: `VALIDATION_MERGE`',
    '## Handoff',
    'fixture',
  ].join('\n');
  const activity={
    schemaVersion:1,
    mode:'MCL_STAGE_ENTRY_PACKET_ACTIVITY_EVIDENCE_SET',
    requesterRef:'#3473',
    candidates:[],
  };
  let seen=null;
  const deps=o.defaultDeps({
    client:{},
    packetActivityEvidence:activity,
    readIssue:()=>({state:'open',body:packetBody}),
    discoverOverlap:(input)=>(seen=input,{state:'DISJOINT',discovery:'COMPLETE'}),
  });
  const packet=o.readPacketContext(3473,deps);
  a.equal(packet.packetRef,'#3473');
  a.equal(seen.packetActivityEvidence,activity);
});


test('workspace capture distinguishes staged-only and unstaged-only state',()=>{
  const run=(staged,unstaged)=>((args,opts={})=>{
    const key=args.slice(3).join(' ');
    const out=(text)=>({code:0,stdout:opts.binary?Buffer.from(text):text,stderr:opts.binary?Buffer.alloc(0):''});
    if(key==='branch --show-current') return out(ws.branch+'\n');
    if(key==='rev-parse HEAD') return out(base+'\n');
    if(key==='diff --name-only --diff-filter=U -z') return out('');
    if(key==='diff --cached --name-only -z') return out(staged?'x/y\0':'');
    if(key==='diff --name-only -z') return out(unstaged?'x/y\0':'');
    if(key==='ls-files --others --exclude-standard -z') return out('');
    if(key==='diff --cached --binary --no-ext-diff --no-renames') return out('staged-diff');
    if(key==='diff --binary --no-ext-diff --no-renames') return out('unstaged-diff');
    throw new Error('unexpected git read '+key);
  });
  const staged=o.captureWorkspace({lease:lease(),runner:run(true,false)});
  a.equal(staged.dirtyDisposition,'STAGED_ONLY');
  a.equal(staged.dirtyDiffSha256,o.sha256(Buffer.from('staged-diff')));
  const unstaged=o.captureWorkspace({lease:lease(),runner:run(false,true)});
  a.equal(unstaged.dirtyDisposition,'UNSTAGED_ONLY');
  a.equal(unstaged.dirtyDiffSha256,o.sha256(Buffer.from('unstaged-diff')));
  a.throws(()=>o.captureWorkspace({lease:lease(),runner:run(true,true)}),/WORKSPACE_MIXED_OR_UNSUPPORTED_RESIDUE/);
  const drift=A({dirtyDisposition:'STAGED_ONLY'}), p=P(drift);
  p.workspace.dirtyDisposition='UNSTAGED_ONLY';
  a.throws(()=>o.verifyPreservedState(drift,lease(),{captureWorkspace:()=>p.workspace,readRemoteHead:()=>base,readPrState:()=>null}),/DIRTY_DIFF_IDENTITY_DRIFT/);
});
