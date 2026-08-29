#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CANON = (id, side) => `<!-- SIMCORE_SYNC:${id}:${side} -->`;
const LEGACY_DEV_BEGIN = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->';
const LEGACY_DEV_END = '<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->';
const SHA40 = /^[0-9a-f]{40}$/;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const TOKEN = /^[A-Za-z0-9_.-]+$/;

function die(code, message, findings = []) {
  const err = new Error(message);
  err.syncCode = code;
  err.findings = findings;
  throw err;
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { die(code, `${code}: ${e.name}`); }
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function gitBlobSha1(bytes) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
}
function safeText(name, value, max, pattern = null) {
  if (typeof value !== 'string' || Buffer.byteLength(value) > max || /[\r\n\0-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value) || (pattern && !pattern.test(value))) {
    die('RENDER_INPUT_INVALID', `unsafe ${name}`);
  }
  if (name === 'release_name' && value.includes('`')) die('RENDER_INPUT_INVALID', 'release_name contains backtick');
  return value;
}
function resolveUnder(root, rel, kind = 'INPUT') {
  if (typeof rel !== 'string' || !rel || path.isAbsolute(rel)) die(`${kind}_PATH_INVALID`, `${kind} path must be relative`);
  const out = path.resolve(root, rel);
  if (out !== root && !out.startsWith(root + path.sep)) die('PATH_OUTSIDE_ROOT', rel);
  return out;
}
function parseArgs(argv) {
  const out = { check:false, render:false, write:false };
  const valueFlags = new Set(['root','manifest','production-identity','targets','probes','writer-policy','output-dir','report']);
  for (let i=0;i<argv.length;i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) die('INVOCATION_ERROR', `unexpected argument ${arg}`);
    const key = arg.slice(2);
    if (['check','render','write'].includes(key)) { out[key] = true; continue; }
    if (!valueFlags.has(key) || i+1 >= argv.length) die('INVOCATION_ERROR', `invalid flag --${key}`);
    out[key] = argv[++i];
  }
  if ([out.check,out.render,out.write].filter(Boolean).length !== 1) die('MODE_INVALID', 'exactly one mode required');
  for (const key of ['root','manifest','production-identity','targets']) if (!out[key]) die('INVOCATION_ERROR', `--${key} required`);
  if (out.render && !out['output-dir']) die('INVOCATION_ERROR', '--output-dir required for --render');
  return out;
}
function validateManifest(m) {
  const required = ['schema_version','product','production_version','release_name','release_branch','release_commit','release_blob','production_files','validation_status'];
  for (const k of required) if (!(k in m)) die('MANIFEST_INVALID', `missing ${k}`);
  if (m.schema_version !== 1 || m.product !== 'SimCore' || m.release_branch !== 'release-simcore') die('MANIFEST_INVALID', 'unsupported manifest authority');
  safeText('production_version', m.production_version, 64, VERSION);
  safeText('release_name', m.release_name, 160);
  if (!SHA40.test(m.release_commit) || !SHA40.test(m.release_blob)) die('MANIFEST_INVALID', 'invalid release object id');
  if (!m.production_files || typeof m.production_files.latest !== 'string' || typeof m.production_files.install !== 'string' || m.production_files.expected_identical !== true) die('MANIFEST_INVALID', 'invalid production_files');
  safeText('validation_status', m.validation_status, 80, /^[A-Z0-9_]+$/);
  for (const k of ['major_update_milestone','major_update_phase','major_update_checkpoint']) if (k in m) safeText(k, m[k], 80, TOKEN);
}
function validateIdentity(x) {
  if (!x || x.schemaVersion !== 1 || x.product !== 'SimCore' || x.resolvedBranch !== 'release-simcore' || !SHA40.test(x.resolvedCommit || '')) die('PRODUCTION_IDENTITY_RECORD_INVALID', 'invalid identity record');
  for (const k of ['latest','install']) if (!x[k] || typeof x[k].path !== 'string' || !SHA40.test(x[k].blob || '')) die('PRODUCTION_IDENTITY_RECORD_INVALID', `invalid identity ${k}`);
}
function parseSourceIdentity(bytes, expectedVersion) {
  const text = bytes.toString('utf8');
  const vm = text.match(/^\/\/@version\s+([^\r\n]+)$/m);
  if (!vm) die('SOURCE_FORMAT_UNSUPPORTED', 'version marker missing');
  const version = vm[1].trim();
  const rm = text.match(new RegExp(`^// v${expectedVersion.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+(.+?):\\s*$`, 'm'));
  if (!rm) die('SOURCE_FORMAT_UNSUPPORTED', 'release name marker missing');
  return { version, releaseName: rm[1].trim() };
}
function verifySource(root, manifest, identity) {
  const findings = [];
  const latestPath = resolveUnder(root, identity.latest.path, 'INPUT');
  const installPath = resolveUnder(root, identity.install.path, 'INPUT');
  let latest, install;
  try { latest = fs.readFileSync(latestPath); install = fs.readFileSync(installPath); }
  catch { return { status:'SOURCE_UNAVAILABLE', findings:[{code:'PRODUCTION_PATH_MISSING',severity:'BLOCKER'}] }; }
  const latestBlob = gitBlobSha1(latest), installBlob = gitBlobSha1(install);
  if (latestBlob !== identity.latest.blob || installBlob !== identity.install.blob) findings.push({code:'MATERIALIZED_BLOB_MISMATCH',severity:'BLOCKER'});
  if (identity.resolvedBranch !== manifest.release_branch) findings.push({code:'RELEASE_BRANCH_DRIFT',severity:'BLOCKER'});
  if (identity.resolvedCommit !== manifest.release_commit) findings.push({code:'RELEASE_COMMIT_DRIFT',severity:'BLOCKER'});
  if (latestBlob !== manifest.release_blob) findings.push({code:'RELEASE_BLOB_DRIFT',severity:'BLOCKER'});
  if (identity.latest.blob !== identity.install.blob || latestBlob !== installBlob || !latest.equals(install)) findings.push({code:'LATEST_INSTALL_DIVERGED',severity:'BLOCKER'});
  let parsed;
  try { parsed = parseSourceIdentity(latest, manifest.production_version); }
  catch (e) { findings.push({code:e.syncCode || 'SOURCE_FORMAT_UNSUPPORTED',severity:'BLOCKER'}); return {status:'SOURCE_FORMAT_UNSUPPORTED',findings}; }
  if (parsed.version !== manifest.production_version) findings.push({code:'VERSION_DRIFT',severity:'BLOCKER'});
  if (parsed.releaseName !== manifest.release_name) findings.push({code:'RELEASE_NAME_DRIFT',severity:'BLOCKER'});
  return {
    status: findings.length ? 'SOURCE_IDENTITY_DRIFT' : 'IDENTITY_VERIFIED', findings,
    identity:{resolvedBranch:identity.resolvedBranch,resolvedCommit:identity.resolvedCommit,latestBlob,installBlob,version:parsed.version,releaseName:parsed.releaseName,latestSha256:sha256(latest)}
  };
}
function validateRegistry(r) {
  if (!r || r.registryVersion !== 1 || !Array.isArray(r.targets) || r.targets.length !== 2) die('TARGET_REGISTRY_INVALID','initial registry must contain exactly two targets');
  const ids = new Set(), auth = new Set();
  const knownRenderers = new Set(['current-development-production-snapshot-v1','guidelines-production-baseline-v1']);
  for (const t of r.targets) {
    if (!t || typeof t.id !== 'string' || ids.has(t.id)) die('DUPLICATE_TARGET_ID', String(t?.id)); ids.add(t.id);
    const key = `${t.path}\0${t.blockId}`; if (auth.has(key)) die('DUPLICATE_BLOCK_AUTHORITY', key); auth.add(key);
    if (t.markerProfile !== 'canonical-v1') die('MARKER_PROFILE_UNREGISTERED', t.markerProfile);
    if (!knownRenderers.has(t.renderer)) die('RENDERER_UNREGISTERED', t.renderer);
    if (!Array.isArray(t.sourceFields) || !t.sourceFields.length) die('TARGET_REGISTRY_INVALID','sourceFields');
  }
}
function renderTarget(t, m) {
  const context = {}; for (const f of t.sourceFields) { if (!(f in m)) die('RENDER_INPUT_INVALID', `missing ${f}`); context[f]=m[f]; }
  if (t.renderer === 'current-development-production-snapshot-v1') {
    safeText('production_version',context.production_version,64,VERSION); safeText('release_name',context.release_name,160);
    for (const f of ['major_update_milestone','major_update_phase','major_update_checkpoint']) safeText(f,context[f],80,TOKEN);
    return [CANON(t.blockId,'BEGIN'),'## Current Production Snapshot','',`- Product: ${context.product}`,`- Version: \`${context.production_version}\``,`- Release: \`${context.release_name}\``,`- Release branch: \`${context.release_branch}\``,`- Release commit: \`${context.release_commit}\``,`- Release blob: \`${context.release_blob}\``,`- Declared validation status: \`${context.validation_status}\``,`- Major update milestone: \`${context.major_update_milestone}\``,`- Major update phase: \`${context.major_update_phase}\``,`- Major update checkpoint: \`${context.major_update_checkpoint}\``,'','This block is machine-managed from verified declared release state. It does not determine the immediate next action.',CANON(t.blockId,'END')].join('\n');
  }
  if (t.renderer === 'guidelines-production-baseline-v1') return [CANON(t.blockId,'BEGIN'),'```text',`SimCore v${context.production_version} — ${context.release_name}`,`Release commit: ${context.release_commit}`,'```',CANON(t.blockId,'END')].join('\n');
  die('RENDERER_UNREGISTERED', t.renderer);
}
function locateCanonical(text, t) {
  const begin = CANON(t.blockId,'BEGIN'), end = CANON(t.blockId,'END');
  const bc = text.split(begin).length-1, ec = text.split(end).length-1;
  if (t.blockId === 'PRODUCTION_SNAPSHOT' && (text.includes(LEGACY_DEV_BEGIN) || text.includes(LEGACY_DEV_END))) return {invalid:'LEGACY_MARKER_RESURRECTED'};
  if (bc !== 1 || ec !== 1) return {invalid:bc>1||ec>1?'MARKER_DUPLICATE':'MARKER_MISSING'};
  const bi=text.indexOf(begin), ei=text.indexOf(end); if (bi>ei) return {invalid:'MARKER_REVERSED'};
  return {begin,end,start:bi,finish:ei+end.length,current:text.slice(bi,ei+end.length),prefix:text.slice(0,bi),suffix:text.slice(ei+end.length)};
}
function writerPolicy(root, policyPath) {
  if (!policyPath) return {status:'NOT_EVALUATED',findings:[]};
  const p=readJson(resolveUnder(root,policyPath),'WRITER_POLICY_INVALID');
  const script=fs.readFileSync(resolveUnder(root,p.surfaces.legacyScript),'utf8');
  const workflow=fs.readFileSync(resolveUnder(root,p.surfaces.stateSyncWorkflow),'utf8');
  const findings=[];
  if (!script.includes('--manifest-only') || !script.includes('--legacy-full') || !script.includes('explicit mode required')) findings.push({code:'LEGACY_FULL_WRITER_ACTIVE_AFTER_CUTOVER',severity:'BLOCKER'});
  if (!workflow.includes('simcore-sync-memory.py --manifest-only') || !workflow.includes('sync-state.mjs') || workflow.includes('simcore-sync-memory.py --legacy-full')) findings.push({code:'DUAL_WRITER_CONFIGURED',severity:'BLOCKER'});
  if (!workflow.includes('repo-main-write.py') || /git\s+push[^\n]*\bmain\b/.test(workflow)) findings.push({code:'REPO_MAIN_WRITE_BYPASS_CONFIGURED',severity:'BLOCKER'});
  return {status:findings.length?'BLOCKED':'WRITER_POLICY_CLEAN',findings};
}
function humanObservations(root, probesPath, manifest) {
  if (!probesPath) return [];
  const cfg=readJson(resolveUnder(root,probesPath),'PROBE_CONFIG_INVALID'); if (cfg.probeVersion!==1 || !Array.isArray(cfg.probes)) die('PROBE_CONFIG_INVALID','unsupported probes');
  const findings=[];
  for (const p of cfg.probes) {
    const text=fs.readFileSync(resolveUnder(root,p.path),'utf8');
    if (p.parser==='current-production-sentence-v1') {
      const section=text.match(/# 1\. Current Operational State[\s\S]*?## Production verdict\s*\n([\s\S]*?)(?=\n## |\n---)/);
      const m=section?.[1]?.match(/`v([^`]+)` is the current production release\./);
      if (m && m[1]!==manifest.production_version) findings.push({code:'HUMAN_CURRENT_PRODUCTION_CLAIM_STALE',severity:'OBSERVATION',probeId:p.id,path:p.path});
    } else if (p.parser==='current-validation-release-heading-v1') {
      const section=text.match(/# 2\. Current Validation Release\s*\n([\s\S]*?)(?=\n# 3\.|\n# Part|\z)/);
      const m=section?.[1]?.match(/^## v([^ ]+) — (.+)$/m);
      if (m && (m[1]!==manifest.production_version || m[2].trim()!==manifest.release_name)) findings.push({code:'HUMAN_CURRENT_RELEASE_SECTION_STALE',severity:'OBSERVATION',probeId:p.id,path:p.path});
    }
  }
  return findings;
}
function targetPlan(root, registry, manifest) {
  const results=[];
  for (const t of registry.targets) {
    const file=resolveUnder(root,t.path,'TARGET');
    if (!fs.existsSync(file)) { results.push({id:t.id,path:t.path,state:'INVALID',finding:{code:'TARGET_PATH_INVALID',severity:'BLOCKER'}}); continue; }
    const st=fs.lstatSync(file); if (st.isSymbolicLink()) { results.push({id:t.id,path:t.path,state:'INVALID',finding:{code:'TARGET_SYMLINK_DENIED',severity:'BLOCKER'}}); continue; }
    const text=fs.readFileSync(file,'utf8'), loc=locateCanonical(text,t), expected=renderTarget(t,manifest);
    if (loc.invalid) { results.push({id:t.id,path:t.path,state:'INVALID',finding:{code:loc.invalid,severity:'BLOCKER'}}); continue; }
    const state=loc.current===expected?'CLEAN':'STALE';
    results.push({id:t.id,path:t.path,blockId:t.blockId,renderer:t.renderer,state,file,beforeHash:sha256(Buffer.from(text)),currentHash:sha256(Buffer.from(loc.current)),expectedHash:sha256(Buffer.from(expected)),currentLength:Buffer.byteLength(loc.current),expectedLength:Buffer.byteLength(expected),loc,expected,text,finding:state==='STALE'?{code:'MANAGED_BLOCK_STALE',severity:'DRIFT'}:null});
  }
  return results;
}
function boundedTarget(x) { return {id:x.id,path:x.path,blockId:x.blockId,renderer:x.renderer,state:x.state,currentHash:x.currentHash,expectedHash:x.expectedHash,currentLength:x.currentLength,expectedLength:x.expectedLength,finding:x.finding}; }
function summarize(source, targets, writer, observations) {
  const findings=[...(source.findings||[]),...targets.map(x=>x.finding).filter(Boolean),...(writer.findings||[]),...observations];
  const blockers=findings.filter(x=>x.severity==='BLOCKER'), drifts=findings.filter(x=>x.severity==='DRIFT'), obs=findings.filter(x=>x.severity==='OBSERVATION');
  const result=blockers.length?'CHECK_BLOCKED':drifts.length?'CHECK_DRIFT':obs.length?'CHECK_CLEAN_WITH_OBSERVATIONS':'CHECK_CLEAN';
  return {result,exitCode:blockers.length?2:drifts.length?1:0,findings,counts:{blockers:blockers.length,drifts:drifts.length,observations:obs.length}};
}
function atomicReplace(target) {
  const now=fs.readFileSync(target.file); if (sha256(now)!==target.beforeHash) die('TARGET_CHANGED_DURING_RUN',target.path);
  const next=Buffer.from(target.loc.prefix+target.expected+target.loc.suffix,'utf8');
  const tmp=`${target.file}.simcore-sync-${process.pid}.tmp`; fs.writeFileSync(tmp,next,{mode:fs.statSync(target.file).mode});
  if (sha256(fs.readFileSync(target.file))!==target.beforeHash) { fs.rmSync(tmp,{force:true}); die('TARGET_CHANGED_DURING_RUN',target.path); }
  fs.renameSync(tmp,target.file); return {path:target.path,beforeHash:target.beforeHash,afterHash:sha256(next)};
}
function writeReport(reportPath, report) {
  if (!reportPath) return;
  fs.mkdirSync(path.dirname(reportPath), { recursive:true });
  fs.writeFileSync(reportPath, JSON.stringify(report,null,2)+'\n','utf8');
}

export function run(argv=process.argv.slice(2)) {
  const args=parseArgs(argv); const root=path.resolve(args.root);
  const manifestPath=resolveUnder(root,args.manifest); const manifestBefore=fs.readFileSync(manifestPath); const manifest=JSON.parse(manifestBefore.toString('utf8')); validateManifest(manifest);
  const identity=readJson(resolveUnder(root,args['production-identity']),'PRODUCTION_IDENTITY_RECORD_INVALID'); validateIdentity(identity);
  const registry=readJson(resolveUnder(root,args.targets),'TARGET_REGISTRY_INVALID'); validateRegistry(registry);
  const source=verifySource(root,manifest,identity);
  let targets=[]; let writer={status:'NOT_EVALUATED',findings:[]}; let observations=[];
  if (source.status==='IDENTITY_VERIFIED') {
    targets=targetPlan(root,registry,manifest);
    writer=writerPolicy(root,args['writer-policy']);
    observations=humanObservations(root,args.probes,manifest);
  } else targets=registry.targets.map(t=>({id:t.id,path:t.path,blockId:t.blockId,renderer:t.renderer,state:'NOT_EVALUATED',finding:null}));
  let summary=summarize(source,targets,writer,observations); const mode=args.check?'check':args.render?'render':'write'; const applied=[];
  if (mode==='render' && summary.counts.blockers===0) {
    const out=path.resolve(args['output-dir']); fs.mkdirSync(out,{recursive:true});
    for (const t of targets) if (t.expected) fs.writeFileSync(path.join(out,`${t.id}.managed.txt`),t.expected+'\n','utf8');
  }
  if (mode==='write') {
    if (summary.counts.blockers) { /* no write */ }
    else {
      for (const t of targets) if (t.state==='STALE') applied.push(atomicReplace(t));
      const after=targetPlan(root,registry,manifest); summary=summarize(source,after,writer,observations); targets=after;
      if (summary.counts.blockers || summary.counts.drifts) die('WRITE_PARTIAL_FAILURE','post-write verification failed',summary.findings);
    }
  }
  if (!fs.readFileSync(manifestPath).equals(manifestBefore)) die('MANIFEST_MUTATION_DETECTED','sync-state mutated manifest');
  const report={schemaVersion:1,tool:'sync-state',mode,result:summary.result,exitCode:summary.exitCode,source:{status:source.status,identity:source.identity,findings:source.findings},registry:{version:registry.registryVersion,status:'VALID'},writerPolicy:writer.status,targets:targets.map(boundedTarget),findings:summary.findings,counts:summary.counts,writes:applied};
  writeReport(args.report?resolveUnder(root,args.report,'REPORT'):null,report); return report;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try { const r=run(); console.log(JSON.stringify(r,null,2)); process.exitCode=r.exitCode; }
  catch (e) {
    const result={schemaVersion:1,tool:'sync-state',result:'CHECK_BLOCKED',exitCode:2,findings:[...(e.findings||[]),{code:e.syncCode||'HARNESS_ERROR',severity:'BLOCKER'}]};
    try {
      const reportIx=process.argv.indexOf('--report');
      const rootIx=process.argv.indexOf('--root');
      if (reportIx>=0 && process.argv[reportIx+1] && rootIx>=0 && process.argv[rootIx+1]) {
        const reportRoot=path.resolve(process.argv[rootIx+1]);
        writeReport(resolveUnder(reportRoot,process.argv[reportIx+1],'REPORT'),result);
      }
    } catch {}
    console.error(`${e.syncCode||'HARNESS_ERROR'}: ${e.message}`); process.exitCode=2;
  }
}
