#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseCheckedPrHandoff } from './release-state-main-gate.mjs';

const HEX40=/^[0-9a-f]{40}$/;
const RELEASE_ID=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-(?:new|correction|rollback|noop)-[0-9]{2,}$/;
const SAFE_REF=/^[A-Za-z0-9._/-]{1,180}$/;
const CANDIDATE_INTENT=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-intent-[0-9]{2,}$/;
const CANDIDATE_RELEASE_ID=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-(?:new|correction|rollback)-[0-9]{2,}$/;
const ACTIONS_PR_CREATE_POLICY_DENIAL='GitHub Actions is not permitted to create or approve pull requests.';
const TERMINAL_ASSISTANT_PR_WAIT_ATTEMPTS=60;
const TERMINAL_ASSISTANT_PR_WAIT_SECONDS='2';

function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(!arg.startsWith('--'))fail('R2_6_CHECKED_PR_ARGS_INVALID',arg);
    const key=arg.slice(2),value=argv[++i];
    if(value==null||value.startsWith('--'))fail('R2_6_CHECKED_PR_ARGS_INVALID',key);
    out[key]=value;
  }
  return out;
}
function under(root,rel){
  if(!rel||typeof rel!=='string'||path.isAbsolute(rel))fail('R2_6_CHECKED_PR_PATH_INVALID',String(rel));
  const resolved=path.resolve(root,rel);
  if(resolved!==root&&!resolved.startsWith(root+path.sep))fail('R2_6_CHECKED_PR_PATH_INVALID',rel);
  return resolved;
}
function readJson(file,code){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){fail(code,e.message);}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function cmd(root,command,args,{check=true,env=process.env}={}){
  const r=spawnSync(command,args,{cwd:root,encoding:'utf8',env,maxBuffer:8*1024*1024});
  if(check&&r.status!==0)fail('R2_6_CHECKED_PR_COMMAND_FAIL',`${command} ${args.join(' ')}\n${r.stdout||''}\n${r.stderr||''}`.trim());
  return r;
}
function out(root,command,args,code='R2_6_CHECKED_PR_COMMAND_FAIL'){const r=cmd(root,command,args);const value=(r.stdout||'').trim();if(!value)fail(code,`${command} empty output`);return value;}
function safeRef(ref){return typeof ref==='string'&&SAFE_REF.test(ref)&&!ref.includes('..')&&!ref.includes('@{')&&!ref.startsWith('/')&&!ref.endsWith('/');}
function uniqueSorted(values){return [...new Set(values)].sort();}
function requireRepo(){const repo=String(process.env.GITHUB_REPOSITORY||'');if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))fail('R2_6_CHECKED_PR_REPOSITORY_INVALID');if(!process.env.GH_TOKEN)fail('R2_6_CHECKED_PR_TOKEN_MISSING');return repo;}
function ghJson(root,args){const raw=out(root,'gh',args);try{return JSON.parse(raw);}catch(e){fail('R2_6_CHECKED_PR_GH_JSON_INVALID',e.message);}}
function parseGhResult(result){
  const raw=String(result?.stdout||'').trim();
  if(!raw)fail('R2_6_CHECKED_PR_GH_JSON_INVALID','empty output');
  try{return JSON.parse(raw);}catch(e){fail('R2_6_CHECKED_PR_GH_JSON_INVALID',e.message);}
}
function remoteHead(root,ref){
  const raw=cmd(root,'git',['ls-remote','origin',`refs/heads/${ref}`]).stdout.trim();
  if(!raw)return null;
  const rows=raw.split(/\r?\n/).filter(Boolean);if(rows.length!==1)fail('R2_6_CHECKED_PR_REF_AMBIGUOUS',ref);
  const sha=rows[0].split(/\s+/)[0];if(!HEX40.test(sha))fail('R2_6_CHECKED_PR_REF_INVALID',ref);return sha;
}
function validateCheckedPr(cp,code){
  for(const key of ['base','commit'])if(!HEX40.test(String(cp?.[key]||'')))fail(code,key);
  if(!safeRef(cp?.ref))fail(code,'ref');
  if(cp.workflow!=='simcore-ci.yml'||cp.profile!=='PR_RECOVERY'||cp.job!=='Required')fail(code,'validation contract');
  return cp;
}
function validatePostPublishInputs(gate,envelope){
  if(!gate||gate.schemaVersion!==1||gate.tool!=='release-state-main-gate')fail('R2_6_CHECKED_PR_GATE_REPORT_INVALID');
  if(gate.result!=='CHECKED_PR_REQUIRED')return null;
  const cp=validateCheckedPr(gate.checkedPr,'R2_6_CHECKED_PR_GATE_REPORT_INVALID');
  if(!envelope||envelope.releaseId!==gate.releaseId||!Array.isArray(envelope.changedPaths)||envelope.changedPaths.length===0)fail('R2_6_CHECKED_PR_ENVELOPE_INVALID');
  if(!HEX40.test(String(envelope.productionCommit||'')))fail('R2_6_CHECKED_PR_ENVELOPE_INVALID','productionCommit');
  return {kind:'POST_PUBLISH',releaseId:gate.releaseId,productionCommit:envelope.productionCommit,changedPaths:envelope.changedPaths,cp,mainGateResult:gate.result};
}
function validateTerminalInputs(report){
  if(!report||report.schemaVersion!==1||report.tool!=='release-terminal-main-write')fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID');
  if(report.result!=='CHECKED_PR_REQUIRED')return null;
  if(!RELEASE_ID.test(String(report.releaseId||'')))fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID','releaseId');
  if(!HEX40.test(String(report.productionCommit||''))||!HEX40.test(String(report.payloadCommit||'')))fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID','commit');
  if(!Array.isArray(report.changedPaths)||report.changedPaths.length===0)fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID','changedPaths');
  if(report.gateway!=='scripts/repo-main-write.py'||report.mainMutation!=='CHECKED_PR_PENDING')fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID','gateway');
  const cp=validateCheckedPr(report.checkedPr,'R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID');
  return {kind:'TERMINAL',releaseId:report.releaseId,productionCommit:report.productionCommit,payloadCommit:report.payloadCommit,changedPaths:report.changedPaths,cp,mainGateResult:report.result};
}
function validateCandidateInputs(root,a){
  const status=Number(a['main-write-status']);
  if(status!==9)fail('CANDIDATE_CHECKED_PR_HANDOFF_INVALID','status');
  const stdout=fs.readFileSync(under(root,a['main-write-stdout']),'utf8');
  const stderr=fs.readFileSync(under(root,a['main-write-stderr']),'utf8');
  const handoff=parseCheckedPrHandoff(status,stdout,stderr);
  if(!handoff)fail('CANDIDATE_CHECKED_PR_HANDOFF_INVALID','missing checked PR handoff');
  const cp=validateCheckedPr({...handoff,workflow:'simcore-ci.yml',profile:'PR_RECOVERY',job:'Required'},'CANDIDATE_CHECKED_PR_HANDOFF_INVALID');
  const candidate=readJson(under(root,a['candidate-report']),'CANDIDATE_CHECKED_PR_REPORT_INVALID');
  const receipt=readJson(under(root,a.receipt),'CANDIDATE_CHECKED_PR_RECEIPT_INVALID');
  const shadow=readJson(under(root,a['spec-shadow']),'CANDIDATE_CHECKED_PR_SHADOW_INVALID');
  const payloadCommit=String(a['payload-commit']||'');
  if(!HEX40.test(payloadCommit))fail('CANDIDATE_CHECKED_PR_PAYLOAD_INVALID','commit');
  if(!candidate||candidate.schemaVersion!==1||candidate.product!=='SimCore'||candidate.result!=='PASS'||candidate.productionMutation!=='NONE'||candidate.releaseAuthority!=='CANDIDATE_TRANSPORT_ONLY')fail('CANDIDATE_CHECKED_PR_REPORT_INVALID','authority');
  if(!CANDIDATE_INTENT.test(String(candidate.intentId||''))||!HEX40.test(String(candidate.expectedProductionCommit||''))||!HEX40.test(String(candidate.candidateCommit||'')))fail('CANDIDATE_CHECKED_PR_REPORT_INVALID','identity');
  const receiptPath=`products/simcore/releases/candidate-receipts/${candidate.intentId}.json`;
  if(a.receipt!==receiptPath)fail('CANDIDATE_CHECKED_PR_PATH_INVALID',`receipt=${a.receipt}`);
  if(!receipt||receipt.schemaVersion!==1||receipt.product!=='SimCore'||receipt.intentId!==candidate.intentId||!CANDIDATE_RELEASE_ID.test(String(receipt.releaseId||''))||receipt.result!=='PASS'||receipt.productionMutation!=='NONE'||receipt.releaseAuthority!=='CANDIDATE_RECEIPT_ONLY'||receipt.expectedProductionCommit!==candidate.expectedProductionCommit||receipt.candidateCommit!==candidate.candidateCommit)fail('CANDIDATE_CHECKED_PR_RECEIPT_INVALID');
  const shadowPath=`products/simcore/releases/spec-shadows/${receipt.releaseId}.json`;
  if(a['spec-shadow']!==shadowPath)fail('CANDIDATE_CHECKED_PR_PATH_INVALID',`shadow=${a['spec-shadow']}`);
  if(!shadow||shadow.schemaVersion!==1||shadow.product!=='SimCore'||shadow.authority!=='SHADOW_ONLY'||shadow.intentId!==candidate.intentId||shadow.releaseId!==receipt.releaseId||shadow.candidateReceiptPath!==receiptPath||shadow?.derivedSpec?.candidateCommit!==candidate.candidateCommit||shadow?.derivedSpec?.expectedProductionCommit!==candidate.expectedProductionCommit)fail('CANDIDATE_CHECKED_PR_SHADOW_INVALID');
  return {kind:'CANDIDATE',releaseId:receipt.releaseId,productionCommit:candidate.expectedProductionCommit,payloadCommit,candidateCommit:candidate.candidateCommit,changedPaths:[receiptPath,shadowPath],cp,mainGateResult:'CHECKED_PR_REQUIRED'};
}
function assertCandidateSemanticPayload(root,payloadCommit,base,expected){
  const exists=cmd(root,'git',['cat-file','-e',`${payloadCommit}^{commit}`],{check:false});
  if(exists.status!==0)fail('CANDIDATE_CHECKED_PR_PAYLOAD_INVALID',payloadCommit);
  const parent=out(root,'git',['rev-parse',`${payloadCommit}^`],'CANDIDATE_CHECKED_PR_PAYLOAD_INVALID');
  if(parent!==base)fail('CANDIDATE_CHECKED_PR_PAYLOAD_BASE_MISMATCH',`expected=${base} actual=${parent}`);
  const actual=cmd(root,'git',['diff','--name-only',parent,payloadCommit]).stdout.split(/\r?\n/).filter(Boolean).sort();
  const wanted=uniqueSorted(expected);
  if(JSON.stringify(actual)!==JSON.stringify(wanted))fail('CANDIDATE_CHECKED_PR_PAYLOAD_PATH_SET_MISMATCH',`actual=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)}`);
}
function assertCandidateReplayParity(root,payloadCommit,checkedCommit,expected){
  const wanted=uniqueSorted(expected);
  const parity=cmd(root,'git',['diff','--quiet',payloadCommit,checkedCommit,'--',...wanted],{check:false});
  if(parity.status===1)fail('CANDIDATE_CHECKED_PR_REPLAY_PARITY_MISMATCH',`payload=${payloadCommit} checked=${checkedCommit}`);
  if(parity.status!==0)fail('CANDIDATE_CHECKED_PR_REPLAY_PARITY_CHECK_FAIL',`status=${parity.status}`);
}
function assertExactPayload(root,base,commit,expected){
  cmd(root,'git',['fetch','--no-tags','origin','main']);
  cmd(root,'git',['fetch','--no-tags','origin',commit],{check:false});
  cmd(root,'git',['cat-file','-e',`${base}^{commit}`]);cmd(root,'git',['cat-file','-e',`${commit}^{commit}`]);
  const actual=cmd(root,'git',['diff','--name-only',`${base}...${commit}`]).stdout.split(/\r?\n/).filter(Boolean).sort();
  const wanted=uniqueSorted(expected);
  if(JSON.stringify(actual)!==JSON.stringify(wanted))fail('R2_6_CHECKED_PR_PATH_SET_MISMATCH',`actual=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)}`);
}
function assertTerminalSemanticPayload(root,payloadCommit,expected){
  const exists=cmd(root,'git',['cat-file','-e',`${payloadCommit}^{commit}`],{check:false});
  if(exists.status!==0)fail('R2_8_CHECKED_PR_PAYLOAD_INVALID',payloadCommit);
  const parent=out(root,'git',['rev-parse',`${payloadCommit}^`],'R2_8_CHECKED_PR_PAYLOAD_INVALID');
  const actual=cmd(root,'git',['diff','--name-only',parent,payloadCommit]).stdout.split(/\r?\n/).filter(Boolean).sort();
  const wanted=uniqueSorted(expected);
  if(JSON.stringify(actual)!==JSON.stringify(wanted))fail('R2_8_CHECKED_PR_PAYLOAD_PATH_SET_MISMATCH',`actual=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)}`);
}
function assertTerminalReplayParity(root,payloadCommit,checkedCommit,expected){
  const wanted=uniqueSorted(expected);
  const parity=cmd(root,'git',['diff','--quiet',payloadCommit,checkedCommit,'--',...wanted],{check:false});
  if(parity.status===1)fail('R2_8_CHECKED_PR_REPLAY_PARITY_MISMATCH',`payload=${payloadCommit} checked=${checkedCommit}`);
  if(parity.status!==0)fail('R2_8_CHECKED_PR_REPLAY_PARITY_CHECK_FAIL',`status=${parity.status}`);
}
function queryExactOpenPr(root,repo,title,base,commit,ref){
  const all=ghJson(root,['api','--method','GET',`repos/${repo}/pulls`,'-f','state=open','-f','base=main','-f','per_page=100']);
  if(!Array.isArray(all))fail('R2_6_CHECKED_PR_QUERY_INVALID');
  const same=all.filter((pr)=>pr?.title===title);
  if(same.length>1)fail('R2_6_CHECKED_PR_DUPLICATE_OPEN',title);
  if(same.length===0)return null;
  const pr=same[0];
  if(pr?.base?.sha!==base||pr?.head?.sha!==commit||pr?.head?.ref!==ref||pr?.head?.repo?.full_name!==repo)fail('R2_6_CHECKED_PR_EXISTING_MISMATCH',String(pr?.number||''));
  if(!Number.isInteger(Number(pr?.number))||Number(pr.number)<=0)fail('R2_6_CHECKED_PR_QUERY_INVALID','number');
  return pr;
}
function checkedPrBody(releaseId,base,commit,ref){
  return [
    'Machine-owned SimCore protected-main state landing.','',`Release: ${releaseId}`,`Frozen base: ${base}`,`Exact checked head: ${commit}`,`Preserved ref: ${ref}`,'',
    'Created by release-state-checked-pr.mjs after repo-main-write MAIN_HEALTH / Required PASS.',
    'Merge is forbidden until PR_RECOVERY / Required PASS and frozen-base revalidation.',
  ].join('\n');
}
function isActionsPrCreatePolicyDenial(result){
  const text=`${result?.stdout||''}\n${result?.stderr||''}`;
  return result?.status!==0&&text.includes(ACTIONS_PR_CREATE_POLICY_DENIAL)&&text.includes('HTTP 403');
}
function commandFailure(command,args,result){
  fail('R2_6_CHECKED_PR_COMMAND_FAIL',`${command} ${args.join(' ')}\n${result?.stdout||''}\n${result?.stderr||''}`.trim());
}
function resolveOrCreatePr(root,repo,releaseId,base,commit,ref,{assistantCreateFallback=false}={}){
  const title=`SimCore checked state landing: ${releaseId}`;
  const existing=queryExactOpenPr(root,repo,title,base,commit,ref);
  if(existing)return {number:Number(existing.number),title,reused:true};
  const body=checkedPrBody(releaseId,base,commit,ref);
  const args=['api','--method','POST',`repos/${repo}/pulls`,'-f',`title=${title}`,'-f',`head=${ref}`,'-f','base=main','-f',`body=${body}`];
  const created=cmd(root,'gh',args,{check:false});
  if(created.status===0){
    const pr=parseGhResult(created);
    if(!Number.isInteger(Number(pr?.number))||pr?.base?.sha!==base||pr?.head?.sha!==commit||pr?.head?.ref!==ref||pr?.head?.repo?.full_name!==repo)fail('R2_6_CHECKED_PR_CREATE_INVALID');
    return {number:Number(pr.number),title,reused:false};
  }
  if(!assistantCreateFallback||!isActionsPrCreatePolicyDenial(created))commandFailure('gh',args,created);
  console.log(`R2_8_CHECKED_PR_ASSISTANT_CREATE_REQUIRED: title=${title} base=${base} commit=${commit} ref=${ref}`);
  for(let i=0;i<TERMINAL_ASSISTANT_PR_WAIT_ATTEMPTS;i+=1){
    const external=queryExactOpenPr(root,repo,title,base,commit,ref);
    if(external)return {number:Number(external.number),title,reused:true};
    if(i+1<TERMINAL_ASSISTANT_PR_WAIT_ATTEMPTS)cmd(root,'sleep',[TERMINAL_ASSISTANT_PR_WAIT_SECONDS]);
  }
  fail('R2_8_CHECKED_PR_ASSISTANT_PR_MISSING',title);
}
function dispatchRecoveryCi(root,repo,cp,productionCommit){
  const started=Math.floor(Date.now()/1000);
  cmd(root,'gh',['workflow','run',cp.workflow,'--repo',repo,'--ref',cp.ref,'-f',`profile=${cp.profile}`,'-f',`pr_base_commit=${cp.base}`,'-f',`pr_head_commit=${cp.commit}`,'-f',`expected_production_commit=${productionCommit}`]);
  let runId=null;
  for(let i=0;i<40;i+=1){
    const rows=ghJson(root,['run','list','--repo',repo,'--workflow',cp.workflow,'--branch',cp.ref,'--event','workflow_dispatch','--limit','30','--json','databaseId,createdAt,headSha,status,conclusion']);
    const matches=(Array.isArray(rows)?rows:[]).filter((row)=>{
      if(String(row.headSha||'')!==cp.commit)return false;
      const time=Date.parse(String(row.createdAt||''));return Number.isFinite(time)&&Math.floor(time/1000)>=started-5;
    });
    if(matches.length>1)fail('R2_6_CHECKED_PR_CI_RUN_AMBIGUOUS',String(matches.length));
    if(matches.length===1){runId=Number(matches[0].databaseId);break;}
    cmd(root,'sleep',['2']);
  }
  if(!Number.isInteger(runId)||runId<=0)fail('R2_6_CHECKED_PR_CI_RUN_MISSING');
  const watched=cmd(root,'gh',['run','watch',String(runId),'--repo',repo,'--exit-status','--interval','3'],{check:false});
  const view=ghJson(root,['run','view',String(runId),'--repo',repo,'--json','databaseId,headSha,status,conclusion,jobs']);
  if(watched.status!==0||Number(view.databaseId)!==runId||view.headSha!==cp.commit||view.status!=='completed'||view.conclusion!=='success')fail('R2_6_CHECKED_PR_CI_FAIL',String(runId));
  const required=(Array.isArray(view.jobs)?view.jobs:[]).filter((job)=>job?.name==='Required');
  if(required.length!==1||required[0].conclusion!=='success')fail('R2_6_CHECKED_PR_REQUIRED_FAIL',String(runId));
  return runId;
}
function assertMainBase(root,base){cmd(root,'git',['fetch','--no-tags','origin','main']);const current=out(root,'git',['rev-parse','origin/main']);if(current!==base)fail('R2_6_CHECKED_PR_MAIN_MOVED',`expected=${base} actual=${current}`);return current;}
function assertTerminalProduction(root,expected){
  cmd(root,'git',['fetch','--no-tags','origin','refs/heads/release-simcore:refs/remotes/origin/release-simcore']);
  const current=out(root,'git',['rev-parse','origin/release-simcore']);
  if(current!==expected)fail('R2_8_CHECKED_PR_PRODUCTION_MOVED',`expected=${expected} actual=${current}`);
  return current;
}
function assertCandidateProduction(root,expected){
  cmd(root,'git',['fetch','--no-tags','origin','refs/heads/release-simcore:refs/remotes/origin/release-simcore']);
  const current=out(root,'git',['rev-parse','origin/release-simcore']);
  if(current!==expected)fail('CANDIDATE_CHECKED_PR_PRODUCTION_MOVED',`expected=${expected} actual=${current}`);
  return current;
}
function mergePr(root,repo,prNumber,cp){
  const pr=ghJson(root,['api',`repos/${repo}/pulls/${prNumber}`]);
  if(pr?.state!=='open'||pr?.base?.sha!==cp.base||pr?.head?.sha!==cp.commit||pr?.head?.ref!==cp.ref)fail('R2_6_CHECKED_PR_PREMERGE_INVALID',String(prNumber));
  const merged=ghJson(root,['api','--method','PUT',`repos/${repo}/pulls/${prNumber}/merge`,'-f',`sha=${cp.commit}`,'-f','merge_method=merge']);
  if(merged?.merged!==true||!HEX40.test(String(merged?.sha||'')))fail('R2_6_CHECKED_PR_MERGE_FAIL',JSON.stringify(merged));
  return merged.sha;
}
function verifyDurableBytes(root,commit,paths){
  cmd(root,'git',['fetch','--no-tags','origin','main']);const main=out(root,'git',['rev-parse','origin/main']);
  for(const rel of paths){const wanted=out(root,'git',['rev-parse',`${commit}:${rel}`]);const actual=out(root,'git',['rev-parse',`${main}:${rel}`]);if(wanted!==actual)fail('R2_6_CHECKED_PR_DURABLE_BYTES_MISMATCH',rel);}
  return main;
}
function consumeNormalized(root,input,reportPath){
  const {kind,releaseId,productionCommit,payloadCommit,changedPaths,cp}=input;
  const repo=requireRepo();
  assertMainBase(root,cp.base);
  if(kind==='TERMINAL')assertTerminalProduction(root,productionCommit);
  if(kind==='CANDIDATE')assertCandidateProduction(root,productionCommit);
  const remote=remoteHead(root,cp.ref);if(remote!==cp.commit)fail('R2_6_CHECKED_PR_REF_MOVED',`expected=${cp.commit} actual=${remote||'MISSING'}`);
  assertExactPayload(root,cp.base,cp.commit,changedPaths);
  if(kind==='TERMINAL'){
    assertTerminalSemanticPayload(root,payloadCommit,changedPaths);
    assertTerminalReplayParity(root,payloadCommit,cp.commit,changedPaths);
  }
  if(kind==='CANDIDATE'){
    assertCandidateSemanticPayload(root,payloadCommit,cp.base,changedPaths);
    assertCandidateReplayParity(root,payloadCommit,cp.commit,changedPaths);
  }
  const pr=resolveOrCreatePr(root,repo,releaseId,cp.base,cp.commit,cp.ref,{assistantCreateFallback:kind==='TERMINAL'||kind==='CANDIDATE'});
  const runId=dispatchRecoveryCi(root,repo,cp,productionCommit);
  assertMainBase(root,cp.base);
  if(kind==='TERMINAL')assertTerminalProduction(root,productionCommit);
  if(kind==='CANDIDATE')assertCandidateProduction(root,productionCommit);
  const mergeCommit=mergePr(root,repo,pr.number,cp);
  const durableMainCommit=verifyDurableBytes(root,cp.commit,changedPaths);
  const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CHECKED_PR_MERGED',inputKind:kind,releaseId,prNumber:pr.number,prTitle:pr.title,prReused:pr.reused,validationRunId:runId,baseCommit:cp.base,checkedCommit:cp.commit,stagingRef:cp.ref,mergeCommit,durableMainCommit,changedPaths,cleanupPending:true,...(kind==='CANDIDATE'?{candidateCommit:input.candidateCommit}:{})};
  writeJson(reportPath,report);return report;
}
function consume(root,a){
  const gate=readJson(under(root,a['main-gate-report']),'R2_6_CHECKED_PR_GATE_REPORT_INVALID');
  const envelope=readJson(under(root,a.envelope),'R2_6_CHECKED_PR_ENVELOPE_INVALID');
  const reportPath=under(root,a.report),input=validatePostPublishInputs(gate,envelope);
  if(!input){const report={schemaVersion:1,tool:'release-state-checked-pr',result:'NOT_REQUIRED',mainGateResult:gate.result};writeJson(reportPath,report);return report;}
  return consumeNormalized(root,input,reportPath);
}
function consumeTerminal(root,a){
  const terminal=readJson(under(root,a['terminal-write-report']),'R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID');
  const reportPath=under(root,a.report),input=validateTerminalInputs(terminal);
  if(!input){const report={schemaVersion:1,tool:'release-state-checked-pr',result:'NOT_REQUIRED',mainGateResult:terminal.result,inputKind:'TERMINAL'};writeJson(reportPath,report);return report;}
  return consumeNormalized(root,input,reportPath);
}
function consumeCandidate(root,a){
  const reportPath=under(root,a.report),input=validateCandidateInputs(root,a);
  return consumeNormalized(root,input,reportPath);
}
function cleanupRef(root,consumeReport,reportPath){
  const ref=consumeReport.stagingRef,commit=consumeReport.checkedCommit;
  if(!safeRef(ref)||!HEX40.test(String(commit||'')))fail('R2_6_CHECKED_PR_REPORT_INVALID');
  cmd(root,'git',['fetch','--no-tags','origin','main']);const current=out(root,'git',['rev-parse','origin/main']);
  const ancestor=cmd(root,'git',['merge-base','--is-ancestor',consumeReport.durableMainCommit,current],{check:false});if(ancestor.status!==0)fail('R2_6_CHECKED_PR_DURABLE_MAIN_NOT_ANCESTOR');
  const observed=remoteHead(root,ref);if(observed&&observed!==commit)fail('R2_6_CHECKED_PR_REF_MOVED',`cleanup expected=${commit} actual=${observed}`);
  if(observed)cmd(root,'git',['push','origin','--delete',ref]);
  const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CHECKED_PR_CLEANUP_PASS',inputKind:consumeReport.inputKind||'POST_PUBLISH',stagingRef:ref,deleted:!!observed};writeJson(reportPath,report);return report;
}
function cleanup(root,a){
  const consumeReport=readJson(under(root,a['consume-report']),'R2_6_CHECKED_PR_REPORT_INVALID');
  const durable=readJson(under(root,a['durable-report']),'R2_6_CHECKED_PR_DURABLE_REPORT_INVALID');
  const reportPath=under(root,a.report);
  if(consumeReport.result!=='CHECKED_PR_MERGED'){const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CLEANUP_NOT_REQUIRED'};writeJson(reportPath,report);return report;}
  if(durable?.result!=='RS2_6_POST_PUBLISH_DURABLE_MAIN_PASS')fail('R2_6_CHECKED_PR_DURABLE_NOT_PASS');
  return cleanupRef(root,consumeReport,reportPath);
}
function cleanupCandidate(root,a){
  const consumeReport=readJson(under(root,a['consume-report']),'CANDIDATE_CHECKED_PR_REPORT_INVALID');
  const durable=readJson(under(root,a['durable-report']),'CANDIDATE_CHECKED_PR_DURABLE_REPORT_INVALID');
  const reportPath=under(root,a.report);
  if(consumeReport.result!=='CHECKED_PR_MERGED'){const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CLEANUP_NOT_REQUIRED',inputKind:'CANDIDATE'};writeJson(reportPath,report);return report;}
  const expected=uniqueSorted(consumeReport.changedPaths||[]);
  const observed=uniqueSorted([durable?.receiptPath,durable?.shadowPath].filter(Boolean));
  if(consumeReport.inputKind!=='CANDIDATE'||durable?.schemaVersion!==1||durable?.product!=='SimCore'||durable?.result!=='SIMCORE_CANDIDATE_RECEIPT_DURABLE_PASS'||durable?.candidateCommit!==consumeReport.candidateCommit||JSON.stringify(observed)!==JSON.stringify(expected))fail('CANDIDATE_CHECKED_PR_DURABLE_NOT_PASS');
  return cleanupRef(root,consumeReport,reportPath);
}
function cleanupTerminal(root,a){
  const consumeReport=readJson(under(root,a['consume-report']),'R2_6_CHECKED_PR_REPORT_INVALID');
  const durable=readJson(under(root,a['durable-report']),'R2_8_CHECKED_PR_TERMINAL_DURABLE_REPORT_INVALID');
  const reportPath=under(root,a.report);
  if(consumeReport.result!=='CHECKED_PR_MERGED'){const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CLEANUP_NOT_REQUIRED',inputKind:'TERMINAL'};writeJson(reportPath,report);return report;}
  const expectedEvidence=`products/simcore/releases/live-evidence/${consumeReport.releaseId}.json`;
  if(consumeReport.inputKind!=='TERMINAL'||durable?.schemaVersion!==1||durable?.product!=='SimCore'||durable?.disposition!=='ALREADY_DURABLE'||durable?.code!=='R2_8_TERMINAL_ALREADY_DURABLE'||durable?.productionMutation!=='NONE'||durable?.mainMutation!=='NONE'||durable?.evidencePath!==expectedEvidence)fail('R2_8_CHECKED_PR_TERMINAL_DURABLE_NOT_PASS');
  return cleanupRef(root,consumeReport,reportPath);
}
export function run(argv=process.argv.slice(2)){
  const a=parseArgs(argv);if(!a.root||!a.mode||!a.report)fail('R2_6_CHECKED_PR_ARGS_INVALID');const root=path.resolve(a.root);
  if(a.mode==='consume'){for(const key of ['main-gate-report','envelope'])if(!a[key])fail('R2_6_CHECKED_PR_ARGS_INVALID',key);return consume(root,a);}
  if(a.mode==='cleanup'){for(const key of ['consume-report','durable-report'])if(!a[key])fail('R2_6_CHECKED_PR_ARGS_INVALID',key);return cleanup(root,a);}
  if(a.mode==='consume-terminal'){if(!a['terminal-write-report'])fail('R2_6_CHECKED_PR_ARGS_INVALID','terminal-write-report');return consumeTerminal(root,a);}
  if(a.mode==='cleanup-terminal'){for(const key of ['consume-report','durable-report'])if(!a[key])fail('R2_6_CHECKED_PR_ARGS_INVALID',key);return cleanupTerminal(root,a);}
  if(a.mode==='consume-candidate'){for(const key of ['main-write-status','main-write-stdout','main-write-stderr','candidate-report','receipt','spec-shadow','payload-commit'])if(!a[key])fail('R2_6_CHECKED_PR_ARGS_INVALID',key);return consumeCandidate(root,a);}
  if(a.mode==='cleanup-candidate'){for(const key of ['consume-report','durable-report'])if(!a[key])fail('R2_6_CHECKED_PR_ARGS_INVALID',key);return cleanupCandidate(root,a);}
  fail('R2_6_CHECKED_PR_ARGS_INVALID','mode');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  try{const result=run();console.log(JSON.stringify(result));}catch(e){console.error(e.code||'R2_6_CHECKED_PR_FAIL',e.message||'');process.exit(2);}
}
