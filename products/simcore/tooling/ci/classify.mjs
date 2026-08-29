#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LABELS = Object.freeze(['CI_SELF','HARNESS','ARCH_CONTRACT','STATE_SYNC','LEGACY_VERIFICATION','SIMCORE_DOC_ONLY','SHARED_MAIN_COORDINATION']);
const permanentReleaseWorkflows=Object.freeze(['.github/workflows/simcore-release-permanent.yml','.github/workflows/simcore-release-required.yml','.github/workflows/simcore-release-pr-activation.yml']);
const exact=Object.freeze({
  '.github/workflows/simcore-ci.yml':['CI_SELF'],
  '.github/workflows/simcore-release.yml':['CI_SELF','HARNESS','STATE_SYNC'],
  '.github/workflows/simcore-release-permanent.yml':['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION'],
  '.github/workflows/simcore-release-required.yml':['CI_SELF','HARNESS'],
  '.github/workflows/simcore-release-pr-activation.yml':['CI_SELF','HARNESS'],
  '.github/workflows/product-simcore-candidate-materialize.yml':['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION'],
  'products/simcore/tooling/check.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/test.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/release-shadow.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/release-authority.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/release-publish.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/candidate-materialize.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/candidate-receipt.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-approval-resolve.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/release-approval-package.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tooling/declare-production.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/post-publish-state-shadow.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/post-publish-state.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-state-converge.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-state-preplay.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-state-main-gate.mjs':['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION'],
  'products/simcore/tooling/release-state-reobserve.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/root-path.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-recovery-decision.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/release-operational-proof.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/admin-state-transition.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tooling/build-06407-reload-cache-continuity.py':['CI_SELF','HARNESS'],
  'products/simcore/tests/release-shadow.test.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tests/release-controller-qualification.test.mjs':['CI_SELF','HARNESS'],
  'products/simcore/tests/post-publish-state-shadow.test.mjs':['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION'],
  'products/simcore/tests/post-publish-state-permanent.test.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tests/release-declaration-transition.test.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/tests/admin-state-transition.test.mjs':['CI_SELF','HARNESS','STATE_SYNC'],
  'products/simcore/releases/release-schema-v1.json':['CI_SELF','HARNESS'],
  'products/simcore/releases/release-approval-schema-v1.json':['CI_SELF','HARNESS'],
  'products/simcore/tests/registry.mjs':['CI_SELF','HARNESS'],
  'products/simcore/contracts/frozen-surfaces-v1.json':['CI_SELF','HARNESS','ARCH_CONTRACT'],
  'config/simcore-architecture-v2.json':['ARCH_CONTRACT'],
  'scripts/simcore-architecture-check.py':['ARCH_CONTRACT'],
  'docs/SIMCORE_CONTRACTS_V2.md':['ARCH_CONTRACT'],
  'product-manifest.json':['STATE_SYNC'],
  'docs/CURRENT_DEVELOPMENT.md':['STATE_SYNC'],
  'docs/SIMCORE_GUIDELINES.md':['STATE_SYNC'],
  'products/simcore/tooling/sync-state.mjs':['STATE_SYNC'],
  'scripts/simcore-sync-memory.py':['STATE_SYNC'],
  '.github/workflows/simcore-release-state-sync.yml':['CI_SELF','HARNESS','STATE_SYNC','SHARED_MAIN_COORDINATION'],
  'scripts/repo-main-write.py':['SHARED_MAIN_COORDINATION'],
  'scripts/test-repo-main-write.py':['SHARED_MAIN_COORDINATION'],
  'docs/REPO_MAIN_WRITE_COORDINATION.md':['SHARED_MAIN_COORDINATION'],
});
function add(set,values){for(const value of values)set.add(value);}
export function classifyPath(input){
  const p=String(input||'').replaceAll('\\','/').replace(/^\.\//,'');
  const out=new Set(exact[p]||[]);
  if(p==='.github/workflows/simcore-ci.yml'||p.startsWith('products/simcore/tooling/ci/')||p.startsWith('products/simcore/ci/'))out.add('CI_SELF');
  if(p.startsWith('products/simcore/tests/'))add(out,['CI_SELF','HARNESS']);
  if(p.startsWith('products/simcore/releases/'))add(out,['CI_SELF','HARNESS']);
  if(p.startsWith('products/simcore/contracts/'))add(out,['CI_SELF','HARNESS','ARCH_CONTRACT']);
  if(/^products\/simcore\/tooling\/test-[^/]+\.mjs$/.test(p))add(out,['CI_SELF','HARNESS']);
  if(p.startsWith('products/simcore/state-sync/'))out.add('STATE_SYNC');
  const permanentWorkflowSet=new Set(permanentReleaseWorkflows);
  if(p.startsWith('.github/workflows/simcore-')&&!['.github/workflows/simcore-ci.yml','.github/workflows/simcore-release.yml','.github/workflows/simcore-release-state-sync.yml',...permanentWorkflowSet].includes(p))out.add('LEGACY_VERIFICATION');
  if(/^scripts\/simcore-0.*(?:\.py|-test\.mjs)$/.test(p)||/^scripts\/simcore-m2-.*\.py$/.test(p))out.add('LEGACY_VERIFICATION');
  if(p.startsWith('docs/SIMCORE_RELEASE_SYSTEM_V2_')||p.startsWith('docs/SIMCORE_')){const higher=['STATE_SYNC','ARCH_CONTRACT'].some((x)=>out.has(x));if(!higher)out.add('SIMCORE_DOC_ONLY');}
  return [...out].sort((a,b)=>LABELS.indexOf(a)-LABELS.indexOf(b));
}
export function classifyPaths(paths){const labels=new Set();const rows=[];for(const raw of paths){const p=String(raw).trim();if(!p)continue;const pathLabels=classifyPath(p);add(labels,pathLabels);rows.push({path:p,labels:pathLabels});}return{schemaVersion:1,labels:[...labels].sort((a,b)=>LABELS.indexOf(a)-LABELS.indexOf(b)),unrelated:labels.size===0,docOnly:labels.size>0&&[...labels].every((x)=>x==='SIMCORE_DOC_ONLY'),paths:rows};}
function parseArgs(argv){const out={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(!arg.startsWith('--')||i+1>=argv.length)throw new Error(`invalid argument ${arg}`);out[arg.slice(2)]=argv[++i];}if(!out['paths-file'])throw new Error('--paths-file required');return out;}
function main(){const args=parseArgs(process.argv.slice(2));const paths=fs.readFileSync(path.resolve(args['paths-file']),'utf8').split(/\r?\n/);const result=classifyPaths(paths);if(args.report)fs.writeFileSync(path.resolve(args.report),`${JSON.stringify(result,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify(result)}\n`);}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{main();}catch(error){console.error(`CI_CLASSIFIER_ERROR: ${error?.message||error}`);process.exit(2);}}
