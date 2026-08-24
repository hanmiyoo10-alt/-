#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const REPO=path.resolve(HERE,'../../..');
const SCRIPT=path.join(REPO,'scripts/simcore-sync-memory.py');

function writeJson(root,value){fs.writeFileSync(path.join(root,'product-manifest.json'),`${JSON.stringify(value,null,2)}\n`,'utf8');}
function read(root){return JSON.parse(fs.readFileSync(path.join(root,'product-manifest.json'),'utf8'));}
function run(root,{version,name,commit,blob}){
  return spawnSync('python3',[SCRIPT,'--manifest-only'],{
    cwd:root,
    encoding:'utf8',
    env:{...process.env,VERSION:version,RELEASE_NAME:name,RELEASE_COMMIT:commit,RELEASE_BLOB:blob},
  });
}
function base(commit='a'.repeat(40),status='LIVE_PASS'){
  return {schema_version:1,product:'SimCore',production_version:'1.0.0',release_name:'Old',release_branch:'release-simcore',release_commit:commit,release_blob:'b'.repeat(40),validation_status:status,provider_cache_status:'UNVERIFIED'};
}

const root=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-declaration-transition-'));
try{
  writeJson(root,base());
  let r=run(root,{version:'2.0.0',name:'New',commit:'c'.repeat(40),blob:'d'.repeat(40)});
  if(r.status!==0) throw new Error(`new identity run failed ${r.stderr}`);
  let m=read(root);
  if(m.release_commit!=='c'.repeat(40)||m.validation_status!=='PENDING_REAL_LONG_CHAT') throw new Error(`new identity did not reset validation ${JSON.stringify(m)}`);

  m.validation_status='LIVE_PASS';
  writeJson(root,m);
  r=run(root,{version:'2.0.0',name:'New',commit:'c'.repeat(40),blob:'d'.repeat(40)});
  if(r.status!==0) throw new Error(`same identity run failed ${r.stderr}`);
  m=read(root);
  if(m.validation_status!=='LIVE_PASS') throw new Error(`same identity unexpectedly reset validation ${JSON.stringify(m)}`);

  writeJson(root,{...m,release_commit:'c'.repeat(40),validation_status:'LIVE_PASS'});
  r=run(root,{version:'1.5.0',name:'Rollback Safe',commit:'e'.repeat(40),blob:'f'.repeat(40)});
  if(r.status!==0) throw new Error(`rollback identity run failed ${r.stderr}`);
  m=read(root);
  if(m.production_version!=='1.5.0'||m.validation_status!=='PENDING_REAL_LONG_CHAT') throw new Error(`rollback identity did not reset validation ${JSON.stringify(m)}`);

  console.log('RS2_4E_RELEASE_DECLARATION_TRANSITION_TEST_PASS NEW SAME ROLLBACK');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
