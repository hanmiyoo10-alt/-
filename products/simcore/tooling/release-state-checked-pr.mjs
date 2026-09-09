#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const HEX40=/^[0-9a-f]{40}$/;
const RELEASE_ID=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-(?:new|correction|rollback|noop)-[0-9]{2,}$/;
const SAFE_REF=/^[A-Za-z0-9._/-]{1,180}$/;

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
  if(cp.commit!==report.payloadCommit)fail('R2_8_CHECKED_PR_TERMINAL_REPORT_INVALID','payloadCommit mismatch');
  return {kind:'TERMINAL',releaseId:report.releaseId,productionCommit:report.productionCommit,changedPaths:report.changedPaths,cp,mainGateResult:report.result};
}
function assertExactPayload(root,base,commit,expected){
  cmd(root,'git',['fetch','--no-tags','origin','main']);
  cmd(root,'git',['fetch','--no-tags','origin',commit],{check:false});
  cmd(root,'git',['cat-file','-e',`${base}^{commit}`]);cmd(root,'git',['cat-file','-e',`${commit}^{commit}`]);
  const actual=cmd(root,'git',['diff','--name-only',`${base}...${commit}`]).stdout.split(/\r?\n/).filter(Boolean).sort();
  const wanted=uniqueSorted(expected);
  if(JSON.stringify(actual)!==JSON.stringify(wanted))fail('R2_6_CHECKED_PR_PATH_SET_MISMATCH',`actual=${JSON.stringify(actual)} expected=${JSON.stringify(wanted)}`);
}
function resolveOrCreatePr(root,repo,releaseId,base,commit,ref){
  const title=`SimCore checked state landing: ${releaseId}`;
  const all=ghJson(root,['api','--method','GET',`repos/${repo}/pulls`,'-f','state=open','-f','base=main','-f','per_page=100']);
  if(!Array.isArray(all))fail('R2_6_CHECKED_PR_QUERY_INVALID');
  const same=all.filter((pr)=>pr?.title===title);
  if(same.length>1)fail('R2_6_CHECKED_PR_DUPLICATE_OPEN',title);
  if(same.length===1){
    const pr=same[0];
    if(pr?.base?.sha!==base||pr?.head?.sha!==commit||pr?.head?.ref!==ref||pr?.head?.repo?.full_name!==repo)fail('R2_6_CHECKED_PR_EXISTING_MISMATCH',String(pr?.number||''));
    return {number:Number(pr.number),title,reused:true};
  }
  const body=[
    'Machine-owned SimCore protected-main state landing.','',`Release: ${releaseId}`,`Frozen base: ${base}`,`Exact checked head: ${commit}`,`Preserved ref: ${ref}`,'',
    'Created by release-state-checked-pr.mjs after repo-main-write MAIN_HEALTH / Required PASS.',
    'Merge is forbidden until PR_RECOVERY / Required PASS and frozen-base revalidation.',
  ].join('\n');
  const pr=ghJson(root,['api','--method','POST',`repos/${repo}/pulls`,'-f',`title=${title}`,'-f',`head=${ref}`,'-f','base=main','-f',`body=${body}`]);
  if(!Number.isInteger(Number(pr?.number))||pr?.base?.sha!==base||pr?.head?.sha!==commit||pr?.head?.repo?.full_name!==repo)fail('R2_6_CHECKED_PR_CREATE_INVALID');
  return {number:Number(pr.number),title,reused:false};
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
  const {kind,releaseId,productionCommit,changedPaths,cp}=input;
  const repo=requireRepo();
  assertMainBase(root,cp.base);
  if(kind==='TERMINAL')assertTerminalProduction(root,productionCommit);
  const remote=remoteHead(root,cp.ref);if(remote!==cp.commit)fail('R2_6_CHECKED_PR_REF_MOVED',`expected=${cp.commit} actual=${remote||'MISSING'}`);
  assertExactPayload(root,cp.base,cp.commit,changedPaths);
  const pr=resolveOrCreatePr(root,repo,releaseId,cp.base,cp.commit,cp.ref);
  const runId=dispatchRecoveryCi(root,repo,cp,productionCommit);
  assertMainBase(root,cp.base);
  if(kind==='TERMINAL')assertTerminalProduction(root,productionCommit);
  const mergeCommit=mergePr(root,repo,pr.number,cp);
  const durableMainCommit=verifyDurableBytes(root,cp.commit,changedPaths);
  const report={schemaVersion:1,tool:'release-state-checked-pr',result:'CHECKED_PR_MERGED',inputKind:kind,releaseId,prNumber:pr.number,prTitle:pr.title,prReused:pr.reused,validationRunId:runId,baseCommit:cp.base,checkedCommit:cp.commit,stagingRef:cp.ref,mergeCommit,durableMainCommit,changedPaths,cleanupPending:true};
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
  fail('R2_6_CHECKED_PR_ARGS_INVALID','mode');
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  try{const result=run();console.log(JSON.stringify(result));}catch(e){console.error(e.code||'R2_6_CHECKED_PR_FAIL',e.message||'');process.exit(2);}
}
