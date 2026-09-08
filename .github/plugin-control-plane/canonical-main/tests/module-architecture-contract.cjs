'use strict';

const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../..'),base=path.join(root,'.github/plugin-control-plane/canonical-main');
const boundary=JSON.parse(fs.readFileSync(path.join(base,'module-boundaries.json'),'utf8')),architectureDirs=boundary.managedDirectories;
function listCjs(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...listCjs(full));else if(entry.isFile()&&entry.name.endsWith('.cjs'))out.push(full);}return out;}
const files=architectureDirs.flatMap((name)=>listCjs(path.join(base,name)));assert(files.length>=20,'modular architecture should contain explicit small modules');
assert.equal(boundary.schemaVersion,1);assert.equal(boundary.policy,'split-before-merge');assert.equal(boundary.failureCode,'MODULE_SPLIT_REQUIRED');
const overrides=new Map(Object.entries(boundary.overrides||{}));
for(const file of files){const rel=path.relative(base,file).replace(/\\/g,'/'),source=fs.readFileSync(file,'utf8'),lines=source.split(/\r?\n/).length,budget=overrides.get(rel)||boundary.defaultMaxLines;assert(lines<=budget,`MODULE_SPLIT_REQUIRED:${rel}:${lines}>${budget} — extract responsibilities instead of growing the module`);}
for(const layer of ['core','domains','surfaces'])for(const file of listCjs(path.join(base,layer))){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/https:\/\/api\.github\.com|process\.env|(?:^|[^\w])fetch\s*\(/,`${layer} must remain side-effect free`);}
for(const file of listCjs(path.join(base,'surfaces'))){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/\basync\b|\bawait\b|method:\s*['"](?:POST|PUT|PATCH|DELETE)/,'surface modules must be pure renderers');}
for(const file of listCjs(path.join(base,'observers'))){const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/method:\s*['"](?:POST|PUT|PATCH|DELETE)|replaceLabels\(|updateIssue\(|createIssue\(/,'observers must remain read-only');assert.doesNotMatch(source,/https:\/\/api\.github\.com|process\.env/,'observers must use injected infrastructure');}

const fileSet=new Set(files.map((file)=>path.resolve(file)));
function relativeRequires(file){const source=fs.readFileSync(file,'utf8'),targets=[];for(const match of source.matchAll(/require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)){const raw=path.resolve(path.dirname(file),match[1]),candidates=[raw,`${raw}.cjs`,path.join(raw,'index.cjs')],target=candidates.find((candidate)=>fileSet.has(path.resolve(candidate)));if(target)targets.push(path.resolve(target));}return [...new Set(targets)];}
const graph=new Map(files.map((file)=>[path.resolve(file),relativeRequires(file)])),dependency=boundary.dependencyPolicy||{},allowed=dependency.allowedLayers||{};
const layerFor=(file)=>path.relative(base,file).replace(/\\/g,'/').split('/')[0];
for(const [source,targets] of graph){const sourceLayer=layerFor(source),allowedTargets=allowed[sourceLayer]||[];for(const target of targets){const targetLayer=layerFor(target);assert(allowedTargets.includes(targetLayer),`MODULE_SPLIT_REQUIRED:MODULE_LAYER_VIOLATION:${path.relative(base,source)}->${path.relative(base,target)}`);}assert(targets.length<=(dependency.defaultMaxFanOut||12),`MODULE_SPLIT_REQUIRED:MODULE_COUPLING_EXCEEDED:fan-out:${path.relative(base,source)}:${targets.length}`);}
const fanIn=new Map(files.map((file)=>[path.resolve(file),0]));for(const targets of graph.values())for(const target of targets)fanIn.set(target,(fanIn.get(target)||0)+1);for(const [file,count] of fanIn)assert(count<=(dependency.defaultMaxFanIn||12),`MODULE_SPLIT_REQUIRED:MODULE_COUPLING_EXCEEDED:fan-in:${path.relative(base,file)}:${count}`);
const state=new Map(),stack=[];function visit(file){const mark=state.get(file)||0;if(mark===2)return;if(mark===1){const start=stack.indexOf(file),cycle=[...stack.slice(start),file].map((row)=>path.relative(base,row)).join(' -> ');assert.fail(`MODULE_SPLIT_REQUIRED:MODULE_DEPENDENCY_CYCLE:${cycle}`);}state.set(file,1);stack.push(file);for(const target of graph.get(file)||[])visit(target);stack.pop();state.set(file,2);}for(const file of graph.keys())visit(file);

const registry=fs.readFileSync(path.join(base,'modules/registry.cjs'),'utf8');for(const id of ['requiredCi','productionAuthority','writers','bootstrap','protection','projectStatus','delivery'])assert.match(registry,new RegExp(`descriptor\\('${id}'`),`static module registry missing ${id}`);assert.match(registry,/modulesWithCapability/);assert.match(registry,/requiredCoverage/);assert.match(registry,/post-incidents/);assert.doesNotMatch(registry,/readdirSync|require\s*\(\s*[^'"]/,'dynamic plugin loading is forbidden');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/canonical-main-ops.yml'),'utf8');assert.match(workflow,/orchestrator\/refresh\.cjs refresh/);assert.equal((workflow.match(/orchestrator\/refresh\.cjs refresh/g)||[]).length,1,'ops workflow must invoke exactly one canonical #485 orchestrator');const runLines=workflow.split(/\r?\n/).filter((line)=>/^\s*run:\s*/.test(line)).join('\n');assert.doesNotMatch(runLines,/ops-controller\.cjs refresh|protected-main-surface\.cjs refresh|bootstrap-surface\.cjs refresh/);assert.match(workflow,/workflow_run:[\s\S]*branches:\s*\[main\]/);assert.match(workflow,/cron:\s*'17 \* \* \* \*'/);assert.equal((workflow.match(/cron:/g)||[]).length,1,'ops self-heal fallback should run once per hour');
for(const legacy of ['ops-controller.cjs','protected-main-surface.cjs','bootstrap-surface.cjs']){const source=fs.readFileSync(path.join(base,legacy),'utf8');assert.doesNotMatch(source,/https:\/\/api\.github\.com/,`${legacy} must be compatibility-only`);}
const orchestrator=fs.readFileSync(path.join(base,'orchestrator/refresh.cjs'),'utf8');assert.match(orchestrator,/issueStore\.updateIssue\(opsIssue\.number/);assert.match(orchestrator,/renderOpsView\(snapshot\)/);assert.match(orchestrator,/schemaVersion:\s*1/);assert.match(orchestrator,/Object\.freeze/);assert.match(orchestrator,/modulesWithCapability\('events'\)/);assert.match(orchestrator,/repairIncidentConsistency/);assert.match(orchestrator,/resolveOpsIssue/);assert.match(orchestrator,/writeOpsSurface/);assert.doesNotMatch(orchestrator,/createIssue\(\{title:\s*policy\.operations\.issueTitle/,'ops singleton must never be recreated from title discovery');
const issueStoreSource=fs.readFileSync(path.join(base,'infra/issue-store.cjs'),'utf8');assert.match(issueStoreSource,/const getIssue = \(issueNumber\) => client\.api\(`\/issues\/\$\{issueNumber\}`/);assert.match(issueStoreSource,/listIssues\(state = 'open', maxPages = 5\)/,'broad issue enumeration must remain bounded');
const policy=JSON.parse(fs.readFileSync(path.join(base,'policy.json'),'utf8'));assert.equal(policy.operations.issueNumber,485);assert.equal(policy.operations.issueTitle,'[repo-ops:main]');assert.equal(policy.operations.manualActionRequired,false);assert.equal(policy.operations.automationMode,'event-plus-hourly-self-heal');assert.equal(policy.operations.incidentHistoryLimit,6);
const {OPS_VIEW_MARKER,resolveOpsIssue,writeOpsSurface}=require('../orchestrator/refresh.cjs');
(async()=>{
  const canonicalIssue={number:485,title:policy.operations.issueTitle,body:`current\n${OPS_VIEW_MARKER}`,state:'closed'};
  let listCalls=0,createCalls=0;const updates=[],labels=[];
  const store={
    getIssue:async(number)=>{assert.equal(number,485);return canonicalIssue;},
    listIssues:async()=>{listCalls+=1;throw new Error('singleton resolution must not list issues');},
    createIssue:async()=>{createCalls+=1;throw new Error('singleton replacement forbidden');},
    updateIssue:async(number,patch)=>{updates.push({number,patch});return {...canonicalIssue,...patch};},
    replaceLabels:async(number,next)=>{labels.push({number,next});},
  };
  assert.strictEqual(await resolveOpsIssue(store,policy),canonicalIssue);
  await writeOpsSurface(store,policy,'fresh body');
  assert.equal(listCalls,0,'#485 identity resolution must not depend on bounded issue enumeration');
  assert.equal(createCalls,0,'valid #485 update must never create a replacement singleton');
  assert.deepEqual(updates,[{number:485,patch:{body:'fresh body',state:'open'}}]);
  assert.deepEqual(labels,[{number:485,next:['scope:repo','control-plane:operations']}]);

  for(const [name,issue,pattern] of [
    ['missing',null,/configured operations issue missing: #485/],
    ['wrong-title',{...canonicalIssue,title:'[repo-ops:other]'},/title mismatch/],
    ['wrong-marker',{...canonicalIssue,body:'no canonical marker'},/marker missing/],
  ]){
    let forbiddenCreates=0;
    const failingStore={getIssue:async()=>issue,createIssue:async()=>{forbiddenCreates+=1;}};
    await assert.rejects(()=>writeOpsSurface(failingStore,policy,'fresh body'),pattern,`${name} configured identity must fail closed`);
    assert.equal(forbiddenCreates,0,`${name} configured identity must not create a replacement ops issue`);
  }
  console.log('CANONICAL_MAIN_MODULE_ARCHITECTURE:OK');
})().catch((error)=>{console.error(error.stack||String(error));process.exitCode=1;});
