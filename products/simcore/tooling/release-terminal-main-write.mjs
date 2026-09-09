#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCheckedPrHandoff } from './release-state-main-gate.mjs';

const HEX40=/^[0-9a-f]{40}$/;
const RELEASE_ID=/^simcore-v[0-9]+\.[0-9]+\.[0-9]+-(?:new|correction|rollback|noop)-[0-9]{2,}$/;
const SAFE_PREFIX=/^[A-Za-z0-9_.-]{1,96}$/;
const TERMINAL_PATHS=new Set(['product-manifest.json','docs/CURRENT_DEVELOPMENT.md','docs/SIMCORE_GUIDELINES.md']);

function fail(code,detail=''){const e=new Error(detail?`${code}: ${detail}`:code);e.code=code;throw e;}
function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i+=1){
    const arg=argv[i];
    if(!arg.startsWith('--'))fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID',arg);
    const key=arg.slice(2),value=argv[++i];
    if(value==null||value.startsWith('--'))fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID',key);
    out[key]=value;
  }
  return out;
}
function under(root,rel){
  if(!rel||typeof rel!=='string'||path.isAbsolute(rel))fail('R2_8_TERMINAL_MAIN_WRITE_PATH_INVALID',String(rel));
  const resolved=path.resolve(root,rel);
  if(resolved!==root&&!resolved.startsWith(root+path.sep))fail('R2_8_TERMINAL_MAIN_WRITE_PATH_INVALID',rel);
  return resolved;
}
function cmd(root,command,args,{check=true}={}){
  const r=spawnSync(command,args,{cwd:root,encoding:'utf8',env:process.env,maxBuffer:8*1024*1024});
  if(check&&r.status!==0)fail('R2_8_TERMINAL_MAIN_WRITE_COMMAND_FAIL',`${command} ${args.join(' ')}\n${r.stdout||''}\n${r.stderr||''}`.trim());
  return r;
}
function out(root,command,args){const r=cmd(root,command,args);const value=(r.stdout||'').trim();if(!value)fail('R2_8_TERMINAL_MAIN_WRITE_COMMAND_FAIL',`${command} empty output`);return value;}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');}
function uniqueSorted(values){return [...new Set(values)].sort();}
function payloadPaths(root,payloadCommit){
  const parent=out(root,'git',['rev-parse',`${payloadCommit}^`]);
  const paths=uniqueSorted(cmd(root,'git',['diff','--name-only',parent,payloadCommit]).stdout.split(/\r?\n/).filter(Boolean));
  if(paths.length<2)fail('R2_8_TERMINAL_MAIN_WRITE_PATH_SET_INVALID',`count=${paths.length}`);
  for(const rel of paths)if(!TERMINAL_PATHS.has(rel))fail('R2_8_TERMINAL_MAIN_WRITE_PATH_SET_INVALID',rel);
  return paths;
}
function verifyDurableBytes(root,payloadCommit,paths){
  cmd(root,'git',['fetch','--no-tags','origin','main']);
  const main=out(root,'git',['rev-parse','origin/main']);
  for(const rel of paths){
    const wanted=out(root,'git',['rev-parse',`${payloadCommit}:${rel}`]);
    const actual=out(root,'git',['rev-parse',`${main}:${rel}`]);
    if(wanted!==actual)fail('R2_8_TERMINAL_MAIN_WRITE_DURABLE_BYTES_MISMATCH',rel);
  }
  return main;
}
export function interpretWriterResult(status,stdout='',stderr=''){
  if(status===0)return {result:'MAIN_GATE_PASS',checkedPr:null};
  const checkedPr=parseCheckedPrHandoff(status,stdout,stderr);
  if(checkedPr)return {result:'CHECKED_PR_REQUIRED',checkedPr};
  fail('R2_8_TERMINAL_MAIN_WRITE_FAIL',`status=${status}\n${stdout||''}\n${stderr||''}`.trim());
}
export function run(argv=process.argv.slice(2)){
  const a=parseArgs(argv);
  for(const key of ['root','release-id','production-commit','payload-commit','report'])if(!a[key])fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID',key);
  if(!RELEASE_ID.test(a['release-id']))fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID','release-id');
  if(!HEX40.test(a['production-commit'])||!HEX40.test(a['payload-commit']))fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID','commit');
  const stagingPrefix=a['staging-prefix']||'simcore-r2-8-terminal-convergence';
  if(!SAFE_PREFIX.test(stagingPrefix))fail('R2_8_TERMINAL_MAIN_WRITE_ARGS_INVALID','staging-prefix');
  const root=path.resolve(a.root),reportPath=under(root,a.report);
  const changedPaths=payloadPaths(root,a['payload-commit']);
  const writerArgs=[
    'scripts/repo-main-write.py','--commit',a['payload-commit'],
    ...changedPaths.flatMap((rel)=>['--allow',rel]),
    '--required-workflow','simcore-ci.yml','--required-profile','MAIN_HEALTH','--required-job','Required',
    '--staging-prefix',stagingPrefix,
  ];
  const writer=spawnSync('python3',writerArgs,{cwd:root,encoding:'utf8',env:process.env,maxBuffer:8*1024*1024});
  const interpreted=interpretWriterResult(writer.status,writer.stdout,writer.stderr);
  const base={
    schemaVersion:1,tool:'release-terminal-main-write',releaseId:a['release-id'],productionCommit:a['production-commit'],
    payloadCommit:a['payload-commit'],changedPaths,gateway:'scripts/repo-main-write.py',result:interpreted.result,
  };
  const report=interpreted.result==='CHECKED_PR_REQUIRED'
    ? {...base,mainMutation:'CHECKED_PR_PENDING',durableMainCommit:null,checkedPr:{...interpreted.checkedPr,workflow:'simcore-ci.yml',profile:'PR_RECOVERY',job:'Required'}}
    : {...base,mainMutation:'GATEWAY_LANDED',durableMainCommit:verifyDurableBytes(root,a['payload-commit'],changedPaths)};
  writeJson(reportPath,report);
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=run();
    console.log(JSON.stringify(result));
    if(result.result==='CHECKED_PR_REQUIRED')process.exitCode=9;
  }catch(e){console.error(e.code||'R2_8_TERMINAL_MAIN_WRITE_FAIL',e.message||'');process.exit(2);}
}
