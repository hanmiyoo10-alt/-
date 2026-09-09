#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const ADAPTER=path.join(ROOT,'products/simcore/tooling/release-terminal-main-write.mjs');
function sh(cwd,cmd,args,{check=true,env=process.env}={}){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',env,maxBuffer:8*1024*1024});if(check&&r.status!==0)throw new Error(`${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);return r;}
function git(cwd,...args){return sh(cwd,'git',args).stdout.trim();}
function fixture(base,name){
  const remote=path.join(base,`${name}.git`);sh(base,'git',['init','--bare',remote]);
  const work=path.join(base,`${name}-work`);sh(base,'git',['clone',remote,work]);
  git(work,'config','user.name','test');git(work,'config','user.email','test@example.com');
  fs.mkdirSync(path.join(work,'docs'),{recursive:true});
  fs.writeFileSync(path.join(work,'product-manifest.json'),'base manifest\n');
  fs.writeFileSync(path.join(work,'docs/CURRENT_DEVELOPMENT.md'),'base development\n');
  git(work,'add','.');git(work,'commit','-m','base');git(work,'branch','-M','main');git(work,'push','origin','main');
  const baseSha=git(work,'rev-parse','HEAD');
  fs.writeFileSync(path.join(work,'product-manifest.json'),'terminal manifest\n');
  fs.writeFileSync(path.join(work,'docs/CURRENT_DEVELOPMENT.md'),'terminal development\n');
  git(work,'add','.');git(work,'commit','-m','terminal payload');const payload=git(work,'rev-parse','HEAD');
  const scripts=path.join(work,'scripts');fs.mkdirSync(scripts,{recursive:true});
  const fake=path.join(scripts,'repo-main-write.py');
  fs.writeFileSync(fake,`#!/usr/bin/python3
import json,os,subprocess,sys
mode=os.environ['FAKE_WRITER_MODE'];base=os.environ['FAKE_BASE'];payload=os.environ['FAKE_PAYLOAD'];ref=os.environ['FAKE_REF']
json.dump(sys.argv[1:],open(os.environ['FAKE_CALL_LOG'],'w'))
if mode=='landed':
    subprocess.check_call(['git','push','origin',payload+':refs/heads/main'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    sys.exit(0)
if mode=='checked':
    print('MAIN_WRITE_NATIVE_PROTECTION_ACTIVE: Required enforced')
    print(f'MAIN_WRITE_CHECKED_PR_REQUIRED: base={base} commit={payload} ref={ref}')
    sys.exit(9)
if mode=='malformed':
    print(f'MAIN_WRITE_CHECKED_PR_REQUIRED: base={base} commit={payload} ref={ref}')
    sys.exit(9)
sys.exit(3)
`);fs.chmodSync(fake,0o755);
  return {remote,work,baseSha,payload,ref:`simcore-r2-8-test/${name}`,callLog:path.join(base,`${name}-call.json`)};
}
function runAdapter(f,mode){
  const env={...process.env,FAKE_WRITER_MODE:mode,FAKE_BASE:f.baseSha,FAKE_PAYLOAD:f.payload,FAKE_REF:f.ref,FAKE_CALL_LOG:f.callLog};
  return sh(f.work,process.execPath,[ADAPTER,'--root','.', '--release-id','simcore-v9.9.9-new-91','--production-commit',f.baseSha,'--payload-commit',f.payload,'--report','report.json'],{check:false,env});
}
function testDirectLanding(base){
  const f=fixture(base,'landed');const r=runAdapter(f,'landed');if(r.status!==0)throw new Error(`direct landing failed ${r.stderr}`);
  const report=JSON.parse(fs.readFileSync(path.join(f.work,'report.json')));if(report.result!=='MAIN_GATE_PASS'||report.changedPaths.length!==2)throw new Error('direct report invalid');
  const args=JSON.parse(fs.readFileSync(f.callLog));for(const token of ['--required-workflow','simcore-ci.yml','--required-profile','MAIN_HEALTH','--required-job','Required'])if(!args.includes(token))throw new Error(`writer arg missing ${token}`);
  const allows=args.filter((x,i)=>i>0&&args[i-1]==='--allow').sort();if(JSON.stringify(allows)!==JSON.stringify(['docs/CURRENT_DEVELOPMENT.md','product-manifest.json']))throw new Error(`allow mismatch ${JSON.stringify(allows)}`);
}
function testCheckedHandoff(base){
  const f=fixture(base,'checked');const r=runAdapter(f,'checked');if(r.status!==9)throw new Error(`checked handoff status ${r.status} ${r.stderr}`);
  const report=JSON.parse(fs.readFileSync(path.join(f.work,'report.json')));if(report.result!=='CHECKED_PR_REQUIRED'||report.checkedPr.base!==f.baseSha||report.checkedPr.commit!==f.payload||report.checkedPr.ref!==f.ref)throw new Error('checked report invalid');
}
function testMalformedHandoff(base){const f=fixture(base,'malformed');const r=runAdapter(f,'malformed');if(r.status===0||!r.stderr.includes('R2_6_MAIN_GATE_CHECKED_PR_INVALID'))throw new Error(`malformed handoff not blocked ${r.stderr}`);}
const base=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-r2-8-main-write-'));
try{testDirectLanding(base);testCheckedHandoff(base);testMalformedHandoff(base);console.log('R2_8_TERMINAL_MAIN_WRITE_INTEGRATION_PASS direct + checked + malformed');}finally{fs.rmSync(base,{recursive:true,force:true});}
