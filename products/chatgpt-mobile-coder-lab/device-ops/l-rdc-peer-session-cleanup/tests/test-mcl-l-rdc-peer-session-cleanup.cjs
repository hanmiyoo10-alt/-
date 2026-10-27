#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-l-rdc-peer-session-cleanup.cjs');
const sessionEvidence = require('../../l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs');

const MARKER = 'node C:\\Users\\x\\AppData\\Local\\npm-cache\\node_modules\\@wonderwhy-er\\desktop-commander\\dist\\index.js remote';
const EPOCH = 116444736000000000n;
const ft = (ms, extra = 0n) => String(EPOCH + BigInt(ms) * 10000n + extra);
const row = (pid, ppid, name, commandLine = name, creationTimeMs = 1000, readable = true) => ({
  pid, ppid, name, commandLine, commandLineReadable: readable,
  creationTimeMs, creationFileTime: ft(creationTimeMs),
});
const clone = (rows) => rows.map((x) => ({...x}));
const base = () => [
  row(10, 0, 'services.exe', 'services.exe', 800),
  row(40, 10, 'node.exe', MARKER, 900),
  row(50, 40, 'node.exe', MARKER, 1000),
  row(60, 50, 'cmd.exe', 'cmd.exe /d /s /c current', 1100),
  row(61, 60, 'node.exe', 'node cleanup-owner inspect', 1200),
];
function peer(rows, pid = 70, name = 'powershell.exe', at = 1150) {
  rows.push(row(pid, 50, name, name, at), row(pid + 1, pid, 'conhost.exe', 'conhost.exe', at + 1),
    row(pid + 2, pid, 'wsl.exe', 'wsl.exe', at + 1));
  return rows;
}
const raw = (rows) => rows.map((x) => ({
  ProcessId:x.pid, ParentProcessId:x.ppid, Name:x.name,
  CommandLine:x.commandLineReadable ? x.commandLine : null,
  CreationTimeMs:x.creationTimeMs, CreationFileTime:x.creationFileTime,
}));
const runner = (getRows) => () => ({
  code:0, stdout:JSON.stringify(raw(getRows())), stderr:'', signal:null, error:null,
});
function removeTree(rows, root) {
  const gone = new Set([root]);
  for (let changed = true; changed;) {
    changed = false;
    for (const x of rows) if (gone.has(x.ppid) && !gone.has(x.pid)) {
      gone.add(x.pid); changed = true;
    }
  }
  return rows.filter((x) => !gone.has(x.pid));
}
function cleanup(rowsRef, effectRunner, extra = {}) {
  return owner.cleanupLocal({
    confirm:true, platform:'win32', arch:'x64', selfPid:61,
    runner:runner(() => rowsRef.rows), effectRunner, ...extra,
  });
}

test('CLI is fixed and exposes no target selector', () => {
  assert.deepEqual(owner.parseArgs(['inspect']), {operation:'inspect', confirm:false});
  assert.deepEqual(owner.parseArgs(['cleanup', owner.CONFIRM_FLAG]), {operation:'cleanup', confirm:true});
  for (const argv of [[], ['cleanup','--pid','70'], ['cleanup','--session','x'],
    ['cleanup','--path','x'], ['cleanup','--timeout','1'], ['taskkill']]) {
    assert.throws(() => owner.parseArgs(argv), /ARGUMENT_UNSUPPORTED/);
  }
});

test('defaultRunner has one fixed process-read timeout and no stale effect timeout reference', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','mcl-l-rdc-peer-session-cleanup.cjs'),'utf8');
  assert.match(source,/const PROCESS_READ_TIMEOUT_MS = 7000;/);
  assert.match(source,/timeout: PROCESS_READ_TIMEOUT_MS,/);
  assert.equal(source.includes('EFFECT_TIMEOUT_MS'),false);
  let result;
  assert.doesNotThrow(()=>{ result=owner.defaultRunner(); });
  assert.equal(typeof result,'object');
  assert.equal(Number.isInteger(result.code),true);
});

test('classification preserves clean, peer, benign and fail-closed cases', () => {
  let r = owner.classifyCleanupRows(base(), 61);
  assert.equal(r.effectEligibility, 'ALREADY_CLEAN');
  r = owner.classifyCleanupRows(peer(base()), 61);
  assert.equal(r.effectEligibility, 'ELIGIBLE'); assert.equal(r.cleanupCandidateCount, 1);
  r = owner.classifyCleanupRows(peer(peer(peer(base(),70),80,'cmd.exe',1160),90), 61);
  assert.equal(r.cleanupCandidateCount, 3);

  const benign = peer(base()); benign.push(row(62,50,'conhost.exe','conhost.exe',1150));
  assert.equal(owner.classifyCleanupRows(benign,61).effectEligibility, 'ELIGIBLE');
  const unexpected = peer(base()); unexpected.push(row(62,50,'calc.exe','calc.exe',1150));
  assert.equal(owner.classifyCleanupRows(unexpected,61).status, 'UNKNOWN');

  const missing = peer(base()).filter((x) => x.pid !== 72);
  assert.equal(owner.classifyCleanupRows(missing,61).status, 'BLOCKED');
  const extra = peer(base()); extra.push(row(73,70,'notepad.exe','notepad.exe',1152));
  assert.equal(owner.classifyCleanupRows(extra,61).status, 'BLOCKED');
  const stale = peer(base(),70,'powershell.exe',850);
  assert.equal(owner.classifyCleanupRows(stale,61).status, 'UNKNOWN');
  const marker = peer(base()); marker.push(row(73,72,'node.exe',MARKER,1152));
  assert.equal(owner.classifyCleanupRows(marker,61).status, 'UNKNOWN');
  const alt = peer(base()); alt.push(row(100,10,'node.exe',MARKER,1050), row(101,100,'python.exe','python.exe',1060));
  assert.equal(owner.classifyCleanupRows(alt,61).status, 'UNKNOWN');
  const unreadable = peer(base()); unreadable.push(row(100,10,'node.exe','',1050,false));
  assert.equal(owner.classifyCleanupRows(unreadable,61).status, 'UNKNOWN');

  const deepStale = peer(base()); deepStale.push(row(73,72,'python.exe','python.exe',900));
  r = owner.classifyCleanupRows(deepStale,61);
  assert.equal(r.status, 'BLOCKED'); assert.equal(r.cleanupCandidateCount, 0);
});

test('pre-effect identity/currentness failures perform zero effect', () => {
  for (const mutate of [
    (rows) => { rows.find((x) => x.pid === 70).creationFileTime = ft(1150,10n); },
    (rows) => { rows.find((x) => x.pid === 72).creationFileTime = ft(1151,10n); },
    (rows) => { const x=rows.find((y)=>y.pid===60); x.creationTimeMs=9999; x.creationFileTime=ft(9999); },
  ]) {
    const first = peer(base()), second = clone(first); mutate(second);
    let reads=0, effects=0;
    const result = owner.cleanupLocal({
      confirm:true, platform:'win32', arch:'x64', selfPid:61,
      runner:runner(() => ++reads === 1 ? first : second),
      effectRunner:() => { effects++; return {status:'COMPLETE',attemptedCount:3,terminatedCount:3}; },
    });
    assert.notEqual(result.status, 'PASS'); assert.equal(result.effectCount,0); assert.equal(effects,0);
  }

  const first = peer(base()); let reads=0, effects=0;
  const result = owner.cleanupLocal({
    confirm:true, platform:'win32', arch:'x64', selfPid:61,
    runner:() => ++reads === 1 ? runner(() => first)()
      : {code:127,stdout:'',stderr:'',signal:null,error:new Error('read')},
    effectRunner:() => { effects++; return {}; },
  });
  assert.equal(result.status,'UNKNOWN'); assert.equal(result.reasonCode,'RDC_PROCESS_READ_FAILED');
  assert.equal(result.effectCount,0); assert.equal(effects,0);
});

test('partial, late-descendant, lost-ack and success semantics stay fail closed', () => {
  let ref={rows:peer(base())};
  let result=cleanup(ref,({targets})=>{
    const root=targets.find((g)=>g.depth===0); ref.rows=ref.rows.filter((x)=>x.pid!==root.pid);
    return {status:'PARTIAL',reasonCode:'HANDLE_TERMINATE_FAILED',attemptedCount:1,terminatedCount:1};
  });
  assert.equal(result.reasonCode,'GUARDED_TREE_STILL_PRESENT'); assert.equal(result.effectCount,0);

  ref={rows:peer(base())};
  result=cleanup(ref,({targets})=>{
    const child=targets.find((g)=>g.depth===1); ref.rows=ref.rows.filter((x)=>x.pid!==child.pid);
    return {status:'PARTIAL',reasonCode:'HANDLE_TERMINATE_FAILED',attemptedCount:1,terminatedCount:1};
  });
  assert.equal(result.reasonCode,'GUARDED_TREE_STILL_PRESENT');

  ref={rows:peer(base())};
  result=cleanup(ref,()=>({status:'BLOCKED',reasonCode:'HANDLE_IDENTITY_MISMATCH',
    attemptedCount:0,terminatedCount:0}));
  assert.equal(result.reasonCode,'HANDLE_IDENTITY_MISMATCH'); assert.equal(result.effectCount,0);

  ref={rows:peer(base())};
  result=cleanup(ref,({targets})=>{
    const root=targets.find((g)=>g.depth===0); ref.rows=removeTree(ref.rows,root.pid);
    return {status:'PARTIAL',reasonCode:'LATE_DESCENDANT_OBSERVED',
      attemptedCount:targets.length,terminatedCount:targets.length,monitoringComplete:true};
  });
  assert.equal(result.reasonCode,'LATE_DESCENDANT_OBSERVED'); assert.equal(result.effectDisposition,'PARTIAL');
  assert.equal(result.effectCount,0);

  ref={rows:peer(base())};
  result=cleanup(ref,({targets})=>{
    const root=targets.find((g)=>g.depth===0); ref.rows=removeTree(ref.rows,root.pid);
    return {status:'UNKNOWN',reasonCode:'DESCENDANT_MONITORING_INCOMPLETE',
      attemptedCount:1,terminatedCount:1,monitoringComplete:false};
  });
  assert.equal(result.status,'UNKNOWN');
  assert.equal(result.reasonCode,'DESCENDANT_MONITORING_INCOMPLETE');
  assert.equal(result.effectDisposition,'PARTIAL');
  assert.equal(result.effectCount,0);

  ref={rows:peer(base())};
  result=cleanup(ref,({targets})=>{
    const root=targets.find((g)=>g.depth===0); ref.rows=removeTree(ref.rows,root.pid);
    return {status:'UNKNOWN',reasonCode:'HANDLE_HELPER_OUTPUT_INVALID',
      attemptedCount:1,terminatedCount:0,monitoringComplete:false,error:new Error('ack'),signal:null};
  });
  assert.equal(result.status,'UNKNOWN');
  assert.equal(result.reasonCode,'DESCENDANT_MONITORING_NOT_PROVEN');
  assert.equal(result.effectCount,0);

  ref={rows:peer(peer(base(),70),80,'cmd.exe',1160)}; let effects=0;
  result=cleanup(ref,({targets})=>{
    effects++; const root=targets.find((g)=>g.depth===0);
    if(effects===1){ref.rows=removeTree(ref.rows,root.pid);return {status:'COMPLETE',reasonCode:'HANDLE_TREE_TERMINATION_COMPLETE',attemptedCount:3,terminatedCount:3,monitoringComplete:true};}
    return {status:'PARTIAL',reasonCode:'HANDLE_TERMINATE_FAILED',attemptedCount:1,terminatedCount:0};
  });
  assert.equal(result.effectDisposition,'PARTIAL'); assert.equal(result.effectCount,1); assert.equal(effects,2);

  ref={rows:peer(base())};
  result=cleanup(ref,({targets})=>{
    const root=targets.find((g)=>g.depth===0); ref.rows=removeTree(ref.rows,root.pid);
    return {status:'COMPLETE',reasonCode:'HANDLE_TREE_TERMINATION_COMPLETE',
      attemptedCount:targets.length,terminatedCount:targets.length,monitoringComplete:true};
  });
  assert.equal(result.status,'PASS'); assert.equal(result.reasonCode,'PEER_SESSION_CLEANUP_COMPLETE');
  assert.deepEqual(sessionEvidence.classifyProcessTable(ref.rows,61),
    {sessionState:'ABSENT',reasonCode:'SOLE_RDC_COMMAND_SESSION'});
});

test('effect helper uses controlled temp and bounded target-scaled deadline', () => {
  const guards=[
    owner.guardFor(row(70,50,'powershell.exe','powershell.exe',1150),0),
    owner.guardFor(row(71,70,'conhost.exe','conhost.exe',1151),1),
    owner.guardFor(row(72,70,'wsl.exe','wsl.exe',1151),1),
  ];
  let options=null, removed=null;
  const result=owner.defaultEffectRunner({anchors:[],targets:guards},{
    tmpdir:()=>'/tmp',
    mkdtempSync:(prefix)=>{assert.match(prefix,/mcl-rdc-peer-cleanup-/);return '/tmp/mcl-rdc-peer-cleanup-test';},
    rmSync:(dir,opts)=>{removed={dir,opts};},
    spawnSync:(_exe,_args,opts)=>{options=opts;return {status:0,stdout:JSON.stringify({
      status:'COMPLETE',reasonCode:'HANDLE_TREE_TERMINATION_COMPLETE',
      attemptedCount:3,terminatedCount:3,monitoringComplete:true
    }),stderr:'',signal:null,error:null};},
  });
  assert.equal(result.status,'COMPLETE');
  assert.equal(result.monitoringComplete,true);
  assert.deepEqual(Object.keys(options.env).sort(),['TEMP','TMP']);
  assert.equal(options.env.TEMP,options.env.TMP);
  assert.equal(options.timeout,owner.effectTimeoutMsForTargetCount(3));
  assert.ok(options.timeout > 3*2000+10000);
  assert.deepEqual(removed.opts,{recursive:true,force:true});

  const fail=owner.defaultEffectRunner({anchors:[],targets:[guards[0]]},{
    tmpdir:()=>'/tmp',mkdtempSync:()=>{throw new Error('no temp');},
    rmSync:()=>{},spawnSync:()=>{throw new Error('must not run');},
  });
  assert.equal(fail.reasonCode,'TEMP_ENV_PREP_FAILED'); assert.equal(fail.attemptedCount,0);

  const one=owner.effectTimeoutMsForTargetCount(1), three=owner.effectTimeoutMsForTargetCount(3);
  const max=owner.effectTimeoutMsForTargetCount(owner.MAX_EFFECT_TARGETS);
  assert.ok(one<three && three<max);
  assert.throws(()=>owner.effectTimeoutMsForTargetCount(0),/EFFECT_TARGET_COUNT_INVALID/);
  assert.throws(()=>owner.effectTimeoutMsForTargetCount(owner.MAX_EFFECT_TARGETS+1),/EFFECT_TARGET_COUNT_INVALID/);
});

test('source statically binds five-P1 safety surfaces and forbids broad effects', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','mcl-l-rdc-peer-session-cleanup.cjs'),'utf8');
  for(const token of ['OpenProcess','GetProcessTimes','TerminateProcess','WaitForSingleObject','CloseHandle',
    'IsAlive','Win32_ProcessStartTrace','TARGET_TREE_EXPANDED_BEFORE_EFFECT',
    'TARGET_DESCENDANT_RELATION_INVALID','LATE_DESCENDANT_OBSERVED',
    'DESCENDANT_MONITORING_INCOMPLETE','DESCENDANT_MONITORING_NOT_PROVEN',
    '$monitoringComplete','$targetProcessId','$eventProcessId','$eventParentProcessId',
    'env: {TEMP: tempDir, TMP: tempDir}']) assert.ok(source.includes(token),token);
  assert.ok(source.indexOf('Register-WmiEvent -Class Win32_ProcessStartTrace') <
    source.indexOf('Add-Type -TypeDefinition'));
  const terminate=source.indexOf('TerminateProcess($entry.Handle,1)');
  const mandatoryDrain=source.indexOf('if($attempted -gt 0)');
  const complete=source.indexOf("reasonCode='HANDLE_TREE_TERMINATION_COMPLETE'");
  assert.ok(source.indexOf('IsAlive($entry.Handle)') < terminate);
  assert.ok(terminate >= 0 && mandatoryDrain > terminate && complete > mandatoryDrain);
  assert.equal(/\$pid\s*=/i.test(source),false);
  assert.match(source,/Get-Event -ErrorAction Stop \| Where-Object \{\$_.SourceIdentifier -eq \$sourceId\}/);
  assert.equal(source.includes('Get-Event -SourceIdentifier $sourceId -ErrorAction Stop'),false);
  assert.match(source,/effectResult\?\.monitoringComplete !== true/);
  const effect=source.slice(source.indexOf('function defaultEffectRunner'),source.indexOf('function currentIdentityMatches'));
  assert.equal(effect.includes('env: {}'),false);
  for(const forbidden of ['taskkill.exe',"'/F'",'Stop-Process','Start-Process','Restart-Service','Stop-Service',
    'childProcess.exec(','childProcess.execFile(','fetch(','http://','https://']) assert.equal(source.includes(forbidden),false,forbidden);
});

test('public inspect receipt withholds private identity and authority', () => {
  const receipt=owner.inspectLocal({platform:'win32',arch:'x64',selfPid:61,
    runner:runner(()=>peer(peer(peer(base(),70),80),90))});
  const text=JSON.stringify(receipt);
  assert.equal(receipt.status,'PASS'); assert.equal(receipt.peerShellCount,3);
  for(const forbidden of ['ProcessId','ParentProcessId','commandLine','creationTimeMs','creationFileTime',
    ft(1150),MARKER,'session id','device id']) assert.equal(text.includes(forbidden),false);
  assert.deepEqual(receipt.authority,owner.FALSE_AUTHORITY);
});
