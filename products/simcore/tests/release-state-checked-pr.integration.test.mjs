#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const HELPER=path.join(ROOT,'products/simcore/tooling/release-state-checked-pr.mjs');
function sh(cwd,cmd,args,{check=true,env=process.env,input=null}={}){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',env,input,maxBuffer:8*1024*1024});if(check&&r.status!==0)throw new Error(`${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);return r;}
function git(cwd,...args){return sh(cwd,'git',args).stdout.trim();}
function writeJson(root,rel,v){const p=path.join(root,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');}
function fakeGh(root){
  const bin=path.join(root,'bin');fs.mkdirSync(bin,{recursive:true});const p=path.join(bin,'gh');
  fs.writeFileSync(p,`#!/usr/bin/env python3
import datetime,json,os,subprocess,sys
args=sys.argv[1:]
base=os.environ['FAKE_MAIN_BASE']; head=os.environ['FAKE_HEAD']; ref=os.environ['FAKE_REF']; repo=os.environ['GITHUB_REPOSITORY']; remote=os.environ['FAKE_REMOTE']; state=os.environ['FAKE_STATE']
def load():
    try:return json.load(open(state))
    except:return {'pr':None,'merge_calls':0,'moved':False,'get_calls':0,'post_calls':0}
def save(x):json.dump(x,open(state,'w'))
def pr_obj(number=77):
    pbase=os.environ.get('FAKE_PR_BASE',base);phead=os.environ.get('FAKE_PR_HEAD',head);pref=os.environ.get('FAKE_PR_REF',ref);prepo=os.environ.get('FAKE_PR_REPO',repo)
    return {'number':number,'title':os.environ['FAKE_TITLE'],'state':'open','base':{'sha':pbase},'head':{'sha':phead,'ref':pref,'repo':{'full_name':prepo}}}
def gitbare(*xs,input=None):
    env=os.environ.copy();env.update({'GIT_AUTHOR_NAME':'test','GIT_AUTHOR_EMAIL':'test@example.com','GIT_COMMITTER_NAME':'test','GIT_COMMITTER_EMAIL':'test@example.com'})
    return subprocess.check_output(['git','--git-dir',remote,*xs],input=input,text=True,env=env).strip()
def move_main():
    st=load()
    if st.get('moved'):return
    tree=gitbare('rev-parse',base+'^{tree}')
    drift=gitbare('commit-tree',tree,'-p',base,input='drift\\n')
    subprocess.check_call(['git','--git-dir',remote,'update-ref','refs/heads/main',drift,base])
    st['moved']=True;save(st)
if args[:4]==['api','--method','GET',f'repos/{repo}/pulls']:
    st=load();st['get_calls']=st.get('get_calls',0)+1
    after=int(os.environ.get('FAKE_EXTERNAL_PR_AFTER_GET','0') or '0')
    if after and st['get_calls']>=after and not st.get('pr'):st['pr']=pr_obj()
    save(st);rows=[st['pr']] if st.get('pr') else []
    if rows and os.environ.get('FAKE_DUPLICATE_PR')=='1':rows.append(pr_obj(78))
    print(json.dumps(rows));sys.exit(0)
if len(args)>=3 and args[0]=='api' and args[1]=='--method' and args[2]=='POST':
    st=load();st['post_calls']=st.get('post_calls',0)+1;save(st)
    if os.environ.get('FAKE_CREATE_POLICY_DENIED')=='1':
        print('gh: GitHub Actions is not permitted to create or approve pull requests. (HTTP 403)',file=sys.stderr);sys.exit(1)
    if os.environ.get('FAKE_CREATE_OTHER_FAIL')=='1':
        print('gh: unrelated create failure (HTTP 500)',file=sys.stderr);sys.exit(1)
    st=load();st['pr']=pr_obj();save(st);print(json.dumps(st['pr']));sys.exit(0)
if len(args)==2 and args[0]=='api' and args[1]==f'repos/{repo}/pulls/77':
    print(json.dumps(load()['pr'] or pr_obj()));sys.exit(0)
if len(args)>=3 and args[0]=='api' and args[1]=='--method' and args[2]=='PUT':
    st=load();st['merge_calls']=st.get('merge_calls',0)+1;save(st)
    current=gitbare('rev-parse','refs/heads/main')
    if current!=base: print(json.dumps({'merged':False,'message':'base moved'}));sys.exit(0)
    tree=gitbare('rev-parse',head+'^{tree}')
    merge=gitbare('commit-tree',tree,'-p',base,'-p',head,input='merge checked state\\n')
    subprocess.check_call(['git','--git-dir',remote,'update-ref','refs/heads/main',merge,base])
    st=load();st['pr']['state']='closed';save(st);print(json.dumps({'merged':True,'sha':merge}));sys.exit(0)
if args[:2]==['workflow','run']: sys.exit(0)
if args[:2]==['run','list']:
    now=datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z')
    print(json.dumps([{'databaseId':101,'createdAt':now,'headSha':head,'status':'completed','conclusion':'success'}]));sys.exit(0)
if args[:2]==['run','watch']:
    sys.exit(1 if os.environ.get('FAKE_REQUIRED_FAIL')=='1' else 0)
if args[:2]==['run','view']:
    if os.environ.get('FAKE_MOVE_MAIN_ON_RUN_VIEW')=='1': move_main()
    bad=os.environ.get('FAKE_REQUIRED_FAIL')=='1'
    print(json.dumps({'databaseId':101,'headSha':head,'status':'completed','conclusion':'failure' if bad else 'success','jobs':[{'name':'Required','conclusion':'failure' if bad else 'success'}]}));sys.exit(0)
print('unexpected fake gh '+repr(args),file=sys.stderr);sys.exit(64)
`);fs.chmodSync(p,0o755);
  const sleeper=path.join(bin,'sleep');fs.writeFileSync(sleeper,'#!/bin/sh\nexit 0\n');fs.chmodSync(sleeper,0o755);
  return bin;
}
function fixture(base,name){
  const remote=path.join(base,`${name}.git`);sh(base,'git',['init','--bare',remote]);
  const work=path.join(base,`${name}-work`);sh(base,'git',['clone',remote,work]);
  git(work,'config','user.name','test');git(work,'config','user.email','test@example.com');
  fs.writeFileSync(path.join(work,'state.txt'),'base\n');git(work,'add','state.txt');git(work,'commit','-m','base');git(work,'branch','-M','main');git(work,'push','origin','main');
  const baseSha=git(work,'rev-parse','HEAD');git(work,'push','origin',`${baseSha}:refs/heads/release-simcore`);fs.writeFileSync(path.join(work,'state.txt'),'checked\n');git(work,'add','state.txt');git(work,'commit','-m','checked payload');const head=git(work,'rev-parse','HEAD');
  const ref=`simcore-test/${name}`;git(work,'push','origin',`HEAD:refs/heads/${ref}`);git(work,'reset','--hard',baseSha);
  const suffix={success:'91',moved:'92',required:'93',terminal:'94',terminalcleanup:'95',terminaldrift:'96',terminalfallback:'97',terminaltimeout:'98'}[name]||'99';
  const releaseId=`simcore-v9.9.9-new-${suffix}`;
  writeJson(work,'gate.json',{schemaVersion:1,tool:'release-state-main-gate',mode:'PERMANENT',releaseId,result:'CHECKED_PR_REQUIRED',changedPaths:['state.txt'],productionMutation:'ALREADY_PUBLISHED_UPSTREAM',mainMutation:'CHECKED_PR_PENDING',payloadCommit:head,durableMainCommit:null,gateway:'scripts/repo-main-write.py',checkedPr:{base:baseSha,commit:head,ref,workflow:'simcore-ci.yml',profile:'PR_RECOVERY',job:'Required'}});
  writeJson(work,'envelope.json',{releaseId,productionCommit:'a'.repeat(40),changedPaths:['state.txt']});
  const state=path.join(base,`${name}-gh.json`);fs.writeFileSync(state,JSON.stringify({pr:null,merge_calls:0,moved:false,get_calls:0,post_calls:0}));
  const bin=fakeGh(path.join(base,`${name}-fake`));
  const env={...process.env,PATH:`${bin}${path.delimiter}${process.env.PATH}`,GH_TOKEN:'test',GITHUB_REPOSITORY:'owner/repo',FAKE_MAIN_BASE:baseSha,FAKE_HEAD:head,FAKE_REF:ref,FAKE_REMOTE:remote,FAKE_STATE:state,FAKE_TITLE:`SimCore checked state landing: ${releaseId}`};
  return {remote,work,baseSha,head,ref,state,env,releaseId};
}
function runConsume(f,extra={}){return sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','consume','--main-gate-report','gate.json','--envelope','envelope.json','--report','consume.json'],{check:false,env:{...f.env,...extra}});}
function writeTerminalReport(f){
  writeJson(f.work,'terminal-write.json',{schemaVersion:1,tool:'release-terminal-main-write',releaseId:f.releaseId,productionCommit:f.baseSha,payloadCommit:f.head,changedPaths:['state.txt'],gateway:'scripts/repo-main-write.py',result:'CHECKED_PR_REQUIRED',mainMutation:'CHECKED_PR_PENDING',durableMainCommit:null,checkedPr:{base:f.baseSha,commit:f.head,ref:f.ref,workflow:'simcore-ci.yml',profile:'PR_RECOVERY',job:'Required'}});
}
function runTerminalConsume(f,extra={}){writeTerminalReport(f);return sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','consume-terminal','--terminal-write-report','terminal-write.json','--report','consume.json'],{check:false,env:{...f.env,...extra}});}
function terminalDurable(f,disposition='ALREADY_DURABLE'){
  return {schemaVersion:1,product:'SimCore',disposition,code:disposition==='ALREADY_DURABLE'?'R2_8_TERMINAL_ALREADY_DURABLE':'R2_8_TERMINAL_ELIGIBLE',productionMutation:'NONE',mainMutation:disposition==='ALREADY_DURABLE'?'NONE':'LOCAL_TERMINAL_STATE_PENDING_GATEWAY',evidencePath:`products/simcore/releases/live-evidence/${f.releaseId}.json`};
}
function readState(f){return JSON.parse(fs.readFileSync(f.state,'utf8'));}
function testSuccess(base){
  const f=fixture(base,'success');const r=runConsume(f);if(r.status!==0)throw new Error(`success consume failed ${r.stderr}`);const report=JSON.parse(fs.readFileSync(path.join(f.work,'consume.json')));if(report.result!=='CHECKED_PR_MERGED'||report.validationRunId!==101||report.prNumber!==77)throw new Error('success report invalid');
  const main=sh(base,'git',['--git-dir',f.remote,'rev-parse','refs/heads/main']).stdout.trim();const want=sh(base,'git',['--git-dir',f.remote,'rev-parse',`${f.head}:state.txt`]).stdout.trim();const got=sh(base,'git',['--git-dir',f.remote,'rev-parse',`${main}:state.txt`]).stdout.trim();if(want!==got)throw new Error('durable bytes mismatch');
  writeJson(f.work,'durable.json',{result:'RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS'});const c=sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','cleanup','--consume-report','consume.json','--durable-report','durable.json','--report','cleanup.json'],{check:false,env:f.env});if(c.status!==0)throw new Error(`cleanup failed ${c.stderr}`);const ls=sh(base,'git',['--git-dir',f.remote,'show-ref',`refs/heads/${f.ref}`],{check:false});if(ls.status===0)throw new Error('staging ref not deleted');
}
function testMainMoveBlocksMerge(base){const f=fixture(base,'moved');const r=runConsume(f,{FAKE_MOVE_MAIN_ON_RUN_VIEW:'1'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_MAIN_MOVED'))throw new Error(`main move not blocked ${r.stderr}`);const st=readState(f);if(st.merge_calls!==0)throw new Error('merge called after main moved');}
function testRequiredFailureBlocksMerge(base){const f=fixture(base,'required');const r=runConsume(f,{FAKE_REQUIRED_FAIL:'1'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_CI_FAIL'))throw new Error(`Required failure not blocked ${r.stderr}`);const st=readState(f);if(st.merge_calls!==0)throw new Error('merge called after Required failure');}
function testTerminalSuccess(base){
  const f=fixture(base,'terminal');const r=runTerminalConsume(f);if(r.status!==0)throw new Error(`terminal consume failed ${r.stderr}`);
  const report=JSON.parse(fs.readFileSync(path.join(f.work,'consume.json')));if(report.result!=='CHECKED_PR_MERGED'||report.inputKind!=='TERMINAL')throw new Error('terminal consume report invalid');
  writeJson(f.work,'durable.json',terminalDurable(f));
  const c=sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','cleanup-terminal','--consume-report','consume.json','--durable-report','durable.json','--report','cleanup.json'],{check:false,env:f.env});if(c.status!==0)throw new Error(`terminal cleanup failed ${c.stderr}`);
  const ls=sh(base,'git',['--git-dir',f.remote,'show-ref',`refs/heads/${f.ref}`],{check:false});if(ls.status===0)throw new Error('terminal staging ref not deleted');
}
function testTerminalExistingPrReuse(base){
  const f=fixture(base,'terminalreuse');const r=runTerminalConsume(f,{FAKE_EXTERNAL_PR_AFTER_GET:'1'});if(r.status!==0)throw new Error(`terminal exact PR reuse failed ${r.stderr}`);
  const report=JSON.parse(fs.readFileSync(path.join(f.work,'consume.json')));if(report.prReused!==true)throw new Error('terminal exact PR was not reused');const st=readState(f);if(st.post_calls!==0)throw new Error('terminal exact PR reuse attempted create');
}
function testTerminalPolicyDeniedAssistantFallback(base){
  const f=fixture(base,'terminalfallback');const r=runTerminalConsume(f,{FAKE_CREATE_POLICY_DENIED:'1',FAKE_EXTERNAL_PR_AFTER_GET:'2'});if(r.status!==0)throw new Error(`terminal assistant fallback failed ${r.stderr}`);
  if(!r.stdout.includes('R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED:'))throw new Error('assistant-create handoff line missing');
  const report=JSON.parse(fs.readFileSync(path.join(f.work,'consume.json')));if(report.result!=='CHECKED_PR_MERGED'||report.prReused!==true||report.validationRunId!==101)throw new Error('assistant fallback did not resume checked transport');
  const st=readState(f);if(st.post_calls!==1||st.merge_calls!==1)throw new Error(`assistant fallback call counts invalid ${JSON.stringify(st)}`);
}
function testTerminalPolicyDeniedTimeout(base){
  const f=fixture(base,'terminaltimeout');const r=runTerminalConsume(f,{FAKE_CREATE_POLICY_DENIED:'1'});if(r.status===0||!r.stderr.includes('R2_8_CHECKED_PR_ASSISTANT_PR_MISSING'))throw new Error(`terminal policy timeout not bounded ${r.stderr}`);
  if(!r.stdout.includes('R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED:'))throw new Error('timeout handoff line missing');const st=readState(f);if(st.post_calls!==1||st.merge_calls!==0)throw new Error('timeout mutated merge path');
}
function testTerminalPolicyDeniedMismatchFailsClosed(base){
  const f=fixture(base,'terminalmismatch');const r=runTerminalConsume(f,{FAKE_CREATE_POLICY_DENIED:'1',FAKE_EXTERNAL_PR_AFTER_GET:'2',FAKE_PR_REF:'simcore-test/wrong-ref'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_EXISTING_MISMATCH'))throw new Error(`terminal external mismatch not blocked ${r.stderr}`);if(readState(f).merge_calls!==0)throw new Error('mismatched external PR merged');
}
function testTerminalPolicyDeniedDuplicateFailsClosed(base){
  const f=fixture(base,'terminalduplicate');const r=runTerminalConsume(f,{FAKE_CREATE_POLICY_DENIED:'1',FAKE_EXTERNAL_PR_AFTER_GET:'2',FAKE_DUPLICATE_PR:'1'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_DUPLICATE_OPEN'))throw new Error(`terminal duplicate external PR not blocked ${r.stderr}`);if(readState(f).merge_calls!==0)throw new Error('duplicate external PR merged');
}
function testTerminalNonPolicyCreateFailureDoesNotFallback(base){
  const f=fixture(base,'terminalotherfail');const r=runTerminalConsume(f,{FAKE_CREATE_OTHER_FAIL:'1',FAKE_EXTERNAL_PR_AFTER_GET:'2'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_COMMAND_FAIL'))throw new Error(`non-policy create failure changed contract ${r.stderr}`);if(r.stdout.includes('R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED:'))throw new Error('non-policy failure entered assistant fallback');const st=readState(f);if(st.post_calls!==1||st.merge_calls!==0)throw new Error('non-policy failure mutated transport');
}
function testPostPublishPolicyDenialDoesNotGainFallback(base){
  const f=fixture(base,'postpublishpolicy');const r=runConsume(f,{FAKE_CREATE_POLICY_DENIED:'1',FAKE_EXTERNAL_PR_AFTER_GET:'2'});if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_COMMAND_FAIL'))throw new Error(`post-publish policy denial gained terminal fallback ${r.stderr}`);if(r.stdout.includes('R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED:'))throw new Error('post-publish emitted terminal assistant handoff');const st=readState(f);if(st.post_calls!==1||st.merge_calls!==0)throw new Error('post-publish policy denial mutated transport');
}
function testTerminalCleanupRequiresDurable(base){
  const f=fixture(base,'terminalcleanup');const r=runTerminalConsume(f);if(r.status!==0)throw new Error(`terminal cleanup fixture consume failed ${r.stderr}`);
  writeJson(f.work,'durable.json',terminalDurable(f,'ELIGIBLE_TO_PROJECT'));
  const c=sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','cleanup-terminal','--consume-report','consume.json','--durable-report','durable.json','--report','cleanup.json'],{check:false,env:f.env});if(c.status===0||!c.stderr.includes('R2_8_CHECKED_PR_TERMINAL_DURABLE_NOT_PASS'))throw new Error(`terminal premature cleanup not blocked ${c.stderr}`);
  const ls=sh(base,'git',['--git-dir',f.remote,'show-ref',`refs/heads/${f.ref}`],{check:false});if(ls.status!==0)throw new Error('terminal ref deleted before durable proof');
}
function testTerminalProductionMoveBlocksMerge(base){
  const f=fixture(base,'terminaldrift');sh(base,'git',['--git-dir',f.remote,'update-ref','refs/heads/release-simcore',f.head,f.baseSha]);
  const r=runTerminalConsume(f);if(r.status===0||!r.stderr.includes('R2_8_CHECKED_PR_PRODUCTION_MOVED'))throw new Error(`terminal production drift not blocked ${r.stderr}`);
  const st=readState(f);if(st.merge_calls!==0)throw new Error('merge called after terminal production drift');
}
function testTerminalCannotMasqueradeAsPostPublish(base){
  const f=fixture(base,'terminalmask');writeTerminalReport(f);
  const r=sh(f.work,process.execPath,[HELPER,'--root','.', '--mode','consume','--main-gate-report','terminal-write.json','--envelope','envelope.json','--report','consume.json'],{check:false,env:f.env});
  if(r.status===0||!r.stderr.includes('R2_6_CHECKED_PR_GATE_REPORT_INVALID'))throw new Error(`terminal input masquerade not blocked ${r.stderr}`);
  const st=readState(f);if(st.merge_calls!==0)throw new Error('merge called for terminal masquerade');
}
const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-checked-pr-'));
try{
  testSuccess(base);
  testMainMoveBlocksMerge(base);
  testRequiredFailureBlocksMerge(base);
  testTerminalSuccess(base);
  testTerminalExistingPrReuse(base);
  testTerminalPolicyDeniedAssistantFallback(base);
  testTerminalPolicyDeniedTimeout(base);
  testTerminalPolicyDeniedMismatchFailsClosed(base);
  testTerminalPolicyDeniedDuplicateFailsClosed(base);
  testTerminalNonPolicyCreateFailureDoesNotFallback(base);
  testPostPublishPolicyDenialDoesNotGainFallback(base);
  testTerminalCleanupRequiresDurable(base);
  testTerminalProductionMoveBlocksMerge(base);
  testTerminalCannotMasqueradeAsPostPublish(base);
  console.log('R2_6_CHECKED_PR_INTEGRATION_PASS post-publish + terminal + assistant-policy-fallback + timeout + mismatch + duplicate + non-policy + Required-fail + durable-cleanup + production-drift');
}finally{fs.rmSync(base,{recursive:true,force:true});}
