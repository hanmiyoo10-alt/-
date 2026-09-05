#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[3]
UD=ROOT/'plugins'/'usage-dashboard'; SRC=UD/'src'; ES=UD/'runtime-src'/'bridge-engine'; RT=UD/'runtime'; T=UD/'tools'; TEST=UD/'tests'
SPEC=ROOT/'.github'/'usage-dashboard'/'releases'/'5.100.json'
CORE=SRC/'00-runtime-core.part.js'; LEDGER=SRC/'14-request-ledger.part.js'; PROV=SRC/'15-request-provenance.part.js'; DIAG=SRC/'40-diagnostics.part.js'
ECORE=ES/'00-core.part.mjs'; CATEGORY=ES/'45-model-category.part.mjs'; ENGINE=RT/'bridge-engine.mjs'; MANAGER=RT/'bridge-manager.cjs'
BOOT=RT/'bootstrap-bridge-manager.sh'; MANIFEST=RT/'product-manifest.json'; LATEST=UD/'latest.js'; P65=TEST/'p65-daily-server-request-count-breakdown.cjs'
BASE_PRODUCT = '3.0.0-alpha.5.99'
TARGET_PRODUCT = '3.0.0-alpha.5.100'
TARGET_ENGINE = '1.6.35'
MANAGER_VER='1.3.6'
BASE=BASE_PRODUCT; TARGET=TARGET_PRODUCT; ENGINE_VER=TARGET_ENGINE
BASE_ENGINE_SHA='19386785b8756ac34bc6e88ee9d9471ea219d27a16a6ed4632a11d33a8ac6b58'
BASE_MANAGER_SHA='8f58d3d7a418ff7c8bb5b39d4a4a92b9d80053b4f108f64037b9715b5053c31c'
BOOT_SHA='4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
BASE_RELEASE_SHA = '91c3d11d6aa7d5299b701ff94956a230a07d4be2'

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(*a): subprocess.run(a,cwd=ROOT,check=True)
def rep(p,old,new,label):
    s=p.read_text()
    if new in s and old not in s: return
    if s.count(old)!=1: raise SystemExit(f'5.100 {label} anchor mismatch:{s.count(old)}')
    p.write_text(s.replace(old,new,1))
def repn(p,old,new,n,label):
    s=p.read_text()
    if new in s and old not in s: return
    if s.count(old)!=n: raise SystemExit(f'5.100 {label} anchor mismatch:{s.count(old)}')
    p.write_text(s.replace(old,new))

def load_spec():
    v=json.loads(SPEC.read_text())
    exp={'productVersion':TARGET,'releaseTitle':'Request Model Lifecycle Fidelity','engineVersion':ENGINE_VER,'managerVersion':MANAGER_VER,
         'managedCliVersion':'1.10.0','managedModelCatalogVersion':'1.280.0',
         'materializer':'plugins/usage-dashboard/tools/release_request_model_lifecycle_5100.py',
         'newRegression':'plugins/usage-dashboard/tests/p66-request-model-lifecycle-fidelity.cjs'}
    for k,x in exp.items():
        if v.get(k)!=x: raise SystemExit(f'5.100 spec mismatch:{k}')
    if v.get('contracts')!={'snapshot':1,'recentRequest':1}: raise SystemExit('5.100 contracts changed')
    m=v.get('managedModelCatalogAuthority') or {}
    if (m.get('package'),m.get('version'),m.get('exact'),m.get('upstreamCommit')) != ('@llmgateway/models','1.280.0',True,'fbb40efa41c379db5223dff708509b6dd82e05a9'):
        raise SystemExit('5.100 models authority mismatch')
    for role in ('acceptedBaseline','latestInstalled'):
        r=(v.get('releaseEvidence') or {}).get(role) or {}
        if (r.get('productVersion'),r.get('releaseSha'),r.get('issue'),r.get('commentId'),r.get('verdict')) != (BASE,BASE_RELEASE_SHA,1487,5552058215,'accepted'):
            raise SystemExit(f'5.100 evidence mismatch:{role}')
    return v

def notes(v):
    n=v.get('releaseNotes') or {}; hs=n.get('highlights') or []; ds=n.get('diagnosticHints') or []
    if not 1<=len(hs)<=5 or not 1<=len(ds)<=5: raise SystemExit('5.100 bounded notes missing')
    out='  const RELEASE_NOTES = Object.freeze({\n'+f"    title: {json.dumps(v['releaseTitle'],ensure_ascii=False)},\n"
    out+='    highlights: Object.freeze([\n'+''.join(f"    {json.dumps(x,ensure_ascii=False)},\n" for x in hs)+'    ]),\n'
    out+='    diagnosticHints: Object.freeze([\n'+''.join(f"    {json.dumps(x,ensure_ascii=False)},\n" for x in ds)+'    ]),\n  });\n'
    return out

def baseline():
    m=json.loads(MANIFEST.read_text())
    if m.get('productVersion')==TARGET:
        target(); print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}'); raise SystemExit(0)
    if m.get('productVersion')!=BASE: raise SystemExit('5.100 baseline Product mismatch')
    b=m['components']['bridge']; g=m['components']['bridgeManager']
    if b.get('requiredVersion')!='1.6.34' or b.get('sha256')!=BASE_ENGINE_SHA or sha(ENGINE)!=BASE_ENGINE_SHA: raise SystemExit('5.100 baseline Engine mismatch')
    if g.get('version')!=MANAGER_VER or g.get('productVersion')!=BASE or g.get('sha256')!=BASE_MANAGER_SHA or sha(MANAGER)!=BASE_MANAGER_SHA: raise SystemExit('5.100 baseline Manager mismatch')
    if sha(BOOT)!=BOOT_SHA: raise SystemExit('5.100 bootstrap mismatch')
    for x in ('function classifyModelLifecycleFromMap(usedModel, usedProvider, catalogMap, now = Date.now())','mapping?.providerId === providerId'):
        if x not in CATEGORY.read_text(): raise SystemExit(f'5.100 source lifecycle missing:{x}')
    for x in ('function requestModelLifecycleValue(value)','function mergeLifecycle(row, current)','void current;'):
        if x not in PROV.read_text(): raise SystemExit(f'5.100 source provenance missing:{x}')

def patch(v):
    rep(CORE,'//@version 3.0.0-alpha.5.99','//@version 3.0.0-alpha.5.100','header')
    rep(CORE,"const VERSION = '3.0.0-alpha.5.99';","const VERSION = '3.0.0-alpha.5.100';",'Plugin version')
    rep(CORE,"const REQUIRED_BRIDGE_VERSION = '1.6.34';","const REQUIRED_BRIDGE_VERSION = '1.6.35';",'Plugin Engine')
    s=CORE.read_text(); a=s.find('  const RELEASE_NOTES = Object.freeze({'); b=s.find('  const UPDATE_URL =',a)
    if a<0 or b<=a: raise SystemExit('5.100 notes boundary missing')
    CORE.write_text(s[:a]+notes(v)+s[b:])
    rep(ECORE,"const VERSION = '1.6.34';","const VERSION = '1.6.35';",'Engine version')

    rep(LEDGER,
      "      const cat=categoryPair(row);\n      const costRaw = recentRequestValue(row, ['cost','usage.cost','inferenceCost','inference_cost','totalCost','total_cost','usage.cost_details.total_cost','cost_details.total_cost'], null);",
      "      const cat=categoryPair(row);\n      const lifecycle=lifecyclePair(row);\n      const costRaw = recentRequestValue(row, ['cost','usage.cost','inferenceCost','inference_cost','totalCost','total_cost','usage.cost_details.total_cost','cost_details.total_cost'], null);",'ledger pair')
    rep(LEDGER,'        model,modelCategory:cat.modelCategory,modelCategorySource:cat.modelCategorySource,\n        cost:num(costRaw)?Number(costRaw):null,',
      '        model,modelCategory:cat.modelCategory,modelCategorySource:cat.modelCategorySource,\n        modelLifecycleStatus:lifecycle.modelLifecycleStatus,modelLifecycleSource:lifecycle.modelLifecycleSource,modelLifecycleDeprecatedAt:lifecycle.modelLifecycleDeprecatedAt,modelLifecycleDeactivatedAt:lifecycle.modelLifecycleDeactivatedAt,\n        cost:num(costRaw)?Number(costRaw):null,','ledger normalize')
    rep(LEDGER,'        const modelCategoryTruth=mergeCategory(row,current);\n        byKey.set(key, {',
      '        const modelCategoryTruth=mergeCategory(row,current);\n        const modelLifecycleTruth=mergeLifecycle(row,current);\n        byKey.set(key, {','ledger merge')
    rep(LEDGER,'          modelCategory:modelCategoryTruth.modelCategory,\n          modelCategorySource:modelCategoryTruth.modelCategorySource,\n          timestampPrecision:',
      '          modelCategory:modelCategoryTruth.modelCategory,\n          modelCategorySource:modelCategoryTruth.modelCategorySource,\n          modelLifecycleStatus:modelLifecycleTruth.modelLifecycleStatus,\n          modelLifecycleSource:modelLifecycleTruth.modelLifecycleSource,\n          modelLifecycleDeprecatedAt:modelLifecycleTruth.modelLifecycleDeprecatedAt,\n          modelLifecycleDeactivatedAt:modelLifecycleTruth.modelLifecycleDeactivatedAt,\n          timestampPrecision:','ledger store')
    repn(LEDGER,'[resultText, requestModelCategoryText(row), httpStatusText,','[resultText, requestModelCategoryText(row), requestModelLifecycleText(row), httpStatusText,',2,'lifecycle UI')

    d=DIAG.read_text()
    helper='\n  function modelLifecycleFidelityDiagnosticText(rows) {\n    const stats = requestModelLifecycleStats(rows);\n    const source = (stats.active + stats.scheduled + stats.deprecated + stats.deactivated) > 0 ? \'llmgateway-model-catalog\' : \'unknown\';\n    return `Active ${stats.active} · Scheduled ${stats.scheduled} · Deprecated ${stats.deprecated} · Deactivated ${stats.deactivated} · Unknown ${stats.unknown} · source ${source}`;\n  }\n'
    if 'function modelLifecycleFidelityDiagnosticText(rows)' not in d:
        anchor='\n  function bridgeCreditsEarlyStartText(performance) {'
        if d.count(anchor)!=1: raise SystemExit('5.100 diagnostics helper anchor mismatch')
        DIAG.write_text(d.replace(anchor,helper+anchor,1))
    rep(DIAG,"      `Model category fidelity: ${modelCategoryFidelityDiagnosticText(requestLedgerRowsForScope('all'))}`,\n      `Bridge CLI launcher:",
      "      `Model category fidelity: ${modelCategoryFidelityDiagnosticText(requestLedgerRowsForScope('all'))}`,\n      `Model lifecycle fidelity: ${modelLifecycleFidelityDiagnosticText(requestLedgerRowsForScope('all'))}`,\n      `Bridge CLI launcher:",'diagnostics line')

    q=P65.read_text(); anchor='const release = loadCurrentRelease();\n'
    guard="if (release.productVersion !== '3.0.0-alpha.5.99') {\n  console.log(`P65 Daily Server Request Count Breakdown: SKIP · candidate ${release.productVersion} is not 3.0.0-alpha.5.99`);\n  process.exit(0);\n}\n// UD_HISTORICAL_VERSION_LOCK\n"
    if guard not in q:
        if q.count(anchor)!=1: raise SystemExit('5.100 P65 guard anchor mismatch')
        q=q.replace(anchor,anchor+guard,1)
    ma="assert.equal(manifest.productVersion, '3.0.0-alpha.5.99');\n"
    if '// UD_HISTORICAL_VERSION_LOCK\n'+ma not in q:
        if q.count(ma)!=1: raise SystemExit('5.100 P65 manifest anchor mismatch')
        q=q.replace(ma,'// UD_HISTORICAL_VERSION_LOCK\n'+ma,1)
    P65.write_text(q)

def target():
    m=json.loads(MANIFEST.read_text()); e=sha(ENGINE); g=sha(MANAGER)
    if m.get('productVersion')!=TARGET or m['components']['bridge'].get('requiredVersion')!=ENGINE_VER or m['components']['bridge'].get('sha256')!=e: raise SystemExit('5.100 target manifest mismatch')
    if m['components']['bridgeManager'].get('productVersion')!=TARGET or m['components']['bridgeManager'].get('sha256')!=g: raise SystemExit('5.100 target manager manifest mismatch')
    l=LEDGER.read_text(); a=l.index('function requestLedgerKey(row)'); b=l.index('function collectRecentRequestLedger(data)',a)
    if any(x in l[a:b] for x in ('modelLifecycleStatus','modelLifecycleSource','modelLifecycleDeprecatedAt','modelLifecycleDeactivatedAt')): raise SystemExit('5.100 lifecycle must not enter request identity')
    if len(LEDGER.read_bytes())>37*1024: raise SystemExit('5.100 ledger ceiling exceeded')
    if sha(BOOT)!=BOOT_SHA: raise SystemExit('5.100 bootstrap changed')
    run('node','plugins/usage-dashboard/tools/build_bridge_engine.cjs','--check')
    run('node','plugins/usage-dashboard/tools/build_usage_dashboard.cjs','--check')
    run('python3','plugins/usage-dashboard/tools/sync_project_guidelines.py','--check')
    run('node','--check',str(ENGINE)); run('node','--check',str(MANAGER)); run('node','--check',str(LATEST))

def main():
    v=load_spec(); baseline(); patch(v)
    run('node',str(T/'build_bridge_engine.cjs'),'--write'); run('node',str(T/'build_bridge_engine.cjs'),'--check')
    e=sha(ENGINE)
    rep(MANAGER,"const PRODUCT_VERSION = '3.0.0-alpha.5.99';","const PRODUCT_VERSION = '3.0.0-alpha.5.100';",'Manager Product')
    rep(MANAGER,"const BUNDLED_ENGINE_VERSION = '1.6.34';","const BUNDLED_ENGINE_VERSION = '1.6.35';",'Manager Engine')
    s=MANAGER.read_text(); s,n=re.subn(r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",f"const BUNDLED_ENGINE_SHA256 = '{e}';",s,count=1)
    if n!=1: raise SystemExit('5.100 Manager hash anchor mismatch')
    MANAGER.write_text(s)
    run('node',str(T/'build_usage_dashboard.cjs'),'--write'); run('node',str(T/'build_usage_dashboard.cjs'),'--check')
    g=sha(MANAGER); m=json.loads(MANIFEST.read_text())
    m['productVersion']=TARGET; m['components']['plugin']['version']=TARGET; m['components']['bridge']['requiredVersion']=ENGINE_VER; m['components']['bridge']['sha256']=e
    bm=m['components']['bridgeManager']; bm['version']=MANAGER_VER; bm['productVersion']=TARGET; bm['sha256']=g; bm['bootstrapSha256']=BOOT_SHA; bm['managedCliVersion']='1.10.0'; bm['managedModelCatalogVersion']='1.280.0'
    m['contracts']={'snapshot':1,'recentRequest':1}; MANIFEST.write_text(json.dumps(m,indent=2)+'\n')
    run('python3',str(T/'sync_project_guidelines.py')); target()
    print(f'MATERIALIZED:{TARGET} · Engine {ENGINE_VER} {e} · Manager {MANAGER_VER} {g} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1')

if __name__=='__main__': main()
