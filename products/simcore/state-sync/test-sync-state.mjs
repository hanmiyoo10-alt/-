#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { run } from '../tooling/sync-state.mjs';

function assert(v,m){if(!v)throw new Error(m);}
const blob=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex');
function write(p,s){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);}
function setup(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'simcore-rs22-'));
  const source=Buffer.from('//@name simcore\n//@version 0.64.6\n// v0.64.6 Post-B_END C Clock Handoff Authority:\n');
  const b=blob(source), commit='1'.repeat(40);
  write(path.join(root,'.prod/latest.js'),source);write(path.join(root,'.prod/install.js'),source);
  const manifest={schema_version:1,product:'SimCore',production_version:'0.64.6',release_name:'Post-B_END C Clock Handoff Authority',release_branch:'release-simcore',release_commit:commit,release_blob:b,production_files:{latest:'plugins/simcore/latest.js',install:'plugins/simcore/install.js',expected_identical:true},validation_status:'PENDING_REAL_LONG_CHAT',major_update_milestone:'2.0M',major_update_phase:'M2',major_update_checkpoint:'M2-2'};
  const identity={schemaVersion:1,product:'SimCore',resolvedBranch:'release-simcore',resolvedCommit:commit,latest:{path:'.prod/latest.js',blob:b},install:{path:'.prod/install.js',blob:b}};
  const registry={registryVersion:1,targets:[{id:'current-development-production-snapshot',path:'docs/CURRENT_DEVELOPMENT.md',blockId:'PRODUCTION_SNAPSHOT',renderer:'current-development-production-snapshot-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['product','production_version','release_name','release_branch','release_commit','release_blob','validation_status','major_update_milestone','major_update_phase','major_update_checkpoint']},{id:'guidelines-production-baseline',path:'docs/SIMCORE_GUIDELINES.md',blockId:'PRODUCTION_BASELINE',renderer:'guidelines-production-baseline-v1',markerProfile:'canonical-v1',lineEnding:'LF',sourceFields:['production_version','release_name','release_commit']}]};
  write(path.join(root,'product-manifest.json'),JSON.stringify(manifest,null,2)+'\n');write(path.join(root,'identity.json'),JSON.stringify(identity,null,2)+'\n');write(path.join(root,'registry.json'),JSON.stringify(registry,null,2)+'\n');
  write(path.join(root,'probes.json'),JSON.stringify({probeVersion:1,probes:[{id:'verdict',path:'docs/CURRENT_DEVELOPMENT.md',parser:'current-production-sentence-v1',severity:'OBSERVATION'},{id:'heading',path:'docs/CURRENT_DEVELOPMENT.md',parser:'current-validation-release-heading-v1',severity:'OBSERVATION'}]},null,2));
  write(path.join(root,'policy.json'),JSON.stringify({policyVersion:1,surfaces:{legacyScript:'scripts/simcore-sync-memory.py',stateSyncWorkflow:'.github/workflows/simcore-release-state-sync.yml',mainWriter:'scripts/repo-main-write.py'}},null,2));
  write(path.join(root,'scripts/simcore-sync-memory.py'),'# --manifest-only --legacy-full explicit mode required\n');
  write(path.join(root,'.github/workflows/simcore-release-state-sync.yml'),'python3 scripts/simcore-sync-memory.py --manifest-only\nnode products/simcore/tooling/sync-state.mjs --write\npython3 scripts/repo-main-write.py\n');
  write(path.join(root,'scripts/repo-main-write.py'),'# safe main writer\n');
  const dev=`# SimCore Current Development Memory\n\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->\n## Current Production Snapshot\n\n- Product: SimCore\n- Version: \`0.64.6\`\n- Release: \`Post-B_END C Clock Handoff Authority\`\n- Release branch: \`release-simcore\`\n- Release commit: \`${commit}\`\n- Release blob: \`${b}\`\n- Declared validation status: \`PENDING_REAL_LONG_CHAT\`\n- Major update milestone: \`2.0M\`\n- Major update phase: \`M2\`\n- Major update checkpoint: \`M2-2\`\n\nThis block is machine-managed from verified declared release state. It does not determine the immediate next action.\n<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->\n\n# 1. Current Operational State\n\n## Production verdict\n\n\`v0.64.6\` is the current production release.\n\n---\n\n# 2. Current Validation Release\n\n## v0.64.6 — Post-B_END C Clock Handoff Authority\n`;
  const guide=`# guide\n\n## 44. Current Production Baseline\n\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->\n\`\`\`text\nSimCore v0.64.6 — Post-B_END C Clock Handoff Authority\nRelease commit: ${commit}\n\`\`\`\n<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->\n\n## 45. Next\n`;
  write(path.join(root,'docs/CURRENT_DEVELOPMENT.md'),dev);write(path.join(root,'docs/SIMCORE_GUIDELINES.md'),guide);
  return {root,manifest,identity,b,commit};
}
function args(root,mode='--check',extra=[]){return [mode,'--root',root,'--manifest','product-manifest.json','--production-identity','identity.json','--targets','registry.json','--probes','probes.json','--writer-policy','policy.json',...extra];}
const checks=[];
{
  const x=setup(), r=run(args(x.root)); assert(r.result==='CHECK_CLEAN','clean check'); checks.push('clean');
  const before=fs.readFileSync(path.join(x.root,'product-manifest.json'));
  const dev=path.join(x.root,'docs/CURRENT_DEVELOPMENT.md');fs.writeFileSync(dev,fs.readFileSync(dev,'utf8').replace('`v0.64.6` is the current production release.','`v0.64.5` is the current production release.'));
  const o=run(args(x.root));assert(o.result==='CHECK_CLEAN_WITH_OBSERVATIONS'&&o.counts.observations===1,'human observation');assert(fs.readFileSync(path.join(x.root,'product-manifest.json')).equals(before),'manifest read-only');checks.push('observation');
}
{
  const x=setup();const m={...x.manifest,release_commit:'2'.repeat(40)};fs.writeFileSync(path.join(x.root,'product-manifest.json'),JSON.stringify(m));const r=run(args(x.root));assert(r.result==='CHECK_BLOCKED'&&r.findings.some(f=>f.code==='RELEASE_COMMIT_DRIFT'),'same-version correction drift');checks.push('same-version-drift');
}
{
  const x=setup();const p=path.join(x.root,'docs/CURRENT_DEVELOPMENT.md');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('Declared validation status: `PENDING_REAL_LONG_CHAT`','Declared validation status: `VALIDATED_REAL_LONG_CHAT`'));const r=run(args(x.root));assert(r.result==='CHECK_DRIFT'&&r.exitCode===1,'managed stale');run(args(x.root,'--write'));assert(run(args(x.root)).result==='CHECK_CLEAN','write idempotence');checks.push('stale-write-idempotent');
}
{
  const x=setup();const p=path.join(x.root,'docs/CURRENT_DEVELOPMENT.md');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->','<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->').replace('<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->','<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->'));const r=run(args(x.root));assert(r.result==='CHECK_BLOCKED'&&r.findings.some(f=>f.code==='LEGACY_MARKER_RESURRECTED'),'legacy resurrection');checks.push('legacy-marker');
}
{
  const x=setup();const w=path.join(x.root,'.github/workflows/simcore-release-state-sync.yml');fs.appendFileSync(w,'python3 scripts/simcore-sync-memory.py --legacy-full\n');const r=run(args(x.root));assert(r.result==='CHECK_BLOCKED'&&r.findings.some(f=>f.code==='DUAL_WRITER_CONFIGURED'),'dual writer');checks.push('writer-policy');
}
{
  const x=setup(), out=path.join(x.root,'preview');const r=run(args(x.root,'--render',['--output-dir',out]));assert(r.exitCode===0&&fs.existsSync(path.join(out,'current-development-production-snapshot.managed.txt')),'render preview');checks.push('render');
}
console.log(`RS2-2 sync-state self-test PASS (${checks.length}): ${checks.join(', ')}`);
