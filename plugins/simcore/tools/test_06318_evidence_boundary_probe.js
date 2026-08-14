const fs = require('fs');
const vm = require('vm');

const oldSource = fs.readFileSync('/tmp/simcore-06317-baseline.js', 'utf8');
const newSource = fs.readFileSync('plugins/simcore/latest.js', 'utf8');
function fail(m){ throw new Error(m); }
function assert(c,m){ if(!c) fail(m); }
function count(s,t){ return String(s).split(t).length-1; }
function moduleBlock(source,name){
  const marker=`SimCore.define("${name}", function (require, module, exports) {`;
  const start=source.indexOf(marker); if(start<0) fail(`module missing: ${name}`);
  let end=source.indexOf('\nSimCore.define("',start+marker.length);
  if(end<0) end=source.indexOf('\n(async () => {',start+marker.length);
  if(end<0) fail(`module end missing: ${name}`); return source.slice(start,end);
}
function probeBlock(source){
  const b=source.indexOf('// EVIDENCE_MAPPING_PROBE_BEGIN');
  const e=source.indexOf('// EVIDENCE_MAPPING_PROBE_END');
  if(b<0||e<b) fail('probe block missing'); return source.slice(b,e+'// EVIDENCE_MAPPING_PROBE_END'.length);
}
function loadProbe(source){ const ctx={}; vm.runInNewContext(`${probeBlock(source)}\nthis.__probe=buildEvidenceMappingProbe;`,ctx); return ctx.__probe; }

assert(newSource.includes('//@version 0.63.18'),'version missing');
assert(newSource.includes('// v0.63.18 Evidence Boundary Probe:'),'changelog missing');
const modules=['contracts','kernel','store','lifecycle','time','frame','recurrence','lineage','handoff','community','reaction','structure','recovery','prompt','session','ops'];
for(const name of modules) assert(moduleBlock(oldSource,name)===moduleBlock(newSource,name),`internal module changed: ${name}`);
for(const t of ['Risuai.getChatFromIndex','Risuai.setChatToIndex','pluginStorage',"addRisuReplacer('beforeRequest'", "addRisuScriptHandler('output'"]) assert(count(oldSource,t)===count(newSource,t),`I/O call-site changed: ${t}`);
assert(newSource.includes('`Evidence boundary: ${evidenceMap ?'),'boundary diagnostic missing');
assert(!newSource.includes('messages[rootIndex]'),'raw index used as request index');

const probe=loadProbe(newSource); const getText=m=>m?.content??m?.data??m?.text??'';
const pending={active:true,mode:'C',requestLineageRootIndex:0,requestLineageSourceKind:'CHAIN'};
const root='Root user text with enough characters to exercise deterministic normalized boundary telemetry and anchors.';
const assistant='# 응답\n\n## 볼륨 63: 테스트\n### 챕터 9: 테스트\n#### Chatindex: 782∮\n\nSOURCE BODY ALPHA '.repeat(18)+'<Knowledge>tail marker stable enough for the ending anchor</Knowledge>';
const chat=[{role:'user',content:root},{role:'char',content:assistant},{role:'user',content:'[커뮤니티] 반응'}];
const rootNormalized='  '+root.replace(/ /g,'   ')+'  ';
const norm=s=>String(s).replace(/\r\n?/g,'\n').replace(/\s+/g,' ').trim();
const an=norm(assistant); const size=Math.min(64,Math.max(24,Math.floor(an.length/8))); const mid=Math.max(0,Math.floor((an.length-size)/2));
const start=an.slice(0,size), middle=an.slice(mid,mid+size), end=an.slice(an.length-size);
const transformed=`WRAP ${start} HOST_CHANGED_INTERNAL ${middle} HOST_CHANGED_MORE ${end} TRAILER`;
const request=[{role:'system',content:'sys'},{role:'user',content:rootNormalized},{role:'assistant',content:transformed},{role:'user',content:'[커뮤니티] 반응'}];
const r=probe(request,chat,pending,2,getText);
assert(r.status==='TRANSFORMED','combined status not transformed');
assert(r.rootUserShape==='NORMALIZED'&&r.rootUserRequestIndex===1&&r.rootUserRequestRole==='user','root normalized mapping failed');
assert(r.sourceAssistantShape==='TRANSFORMED'&&r.sourceAssistantRequestIndex===2&&r.sourceAssistantRequestRole==='assistant','assistant transformed mapping failed');
assert(r.sourceAssistantAnchorMask.includes('S')&&r.sourceAssistantAnchorMask.includes('M')&&r.sourceAssistantAnchorMask.includes('E'),'anchor survival mask incomplete');
assert(r.sourceAssistantLeadingGap>0&&r.sourceAssistantTrailingGap>0,'boundary gaps not measured');
assert(r.sourceAssistantNormChars===an.length&&r.sourceAssistantRequestNormChars===norm(transformed).length,'normalized lengths wrong');
assert(!JSON.stringify(r).includes('SOURCE BODY ALPHA'),'probe retained source body');
assert(moduleBlock(oldSource,'prompt')===moduleBlock(newSource,'prompt'),'Prompt changed');
assert(moduleBlock(oldSource,'frame')===moduleBlock(newSource,'frame'),'Frame changed');
assert(moduleBlock(oldSource,'time')===moduleBlock(newSource,'time'),'Time changed');
console.log('0.63.18 Evidence Boundary Probe OK; all 16 internal modules byte-identical to 0.63.17');
console.log('boundary semantics OK: normalized lengths + S/M/E anchor survival + leading/trailing gaps measured without source retention');
console.log('behavior freeze OK: Prompt/Frame/Time/output generation unchanged; no new host/storage call sites');
