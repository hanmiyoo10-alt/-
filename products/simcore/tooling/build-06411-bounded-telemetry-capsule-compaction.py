#!/usr/bin/env python3
from pathlib import Path
import base64,zlib
FILES=[Path('plugins/simcore/latest.js'),Path('plugins/simcore/install.js')]
def rep(text,old,new,label):
    expected=2 if label=='prepared' else 1
    n=text.count(old)
    if n!=expected: raise SystemExit(f'06411_PATCH_ANCHOR_INVALID {label} count={n}')
    return text.replace(old,new,expected)
NOTE='// v0.64.11 Bounded Telemetry Capsule Compaction:\n// - Repairs real v0.64.10 long-chat capsules of 44,660 / 40,291 / 59,965 chars that exceeded the frozen 16,384-character durable handoff cap before Host-local setItem\n// - Keeps rich same-generation prompt/topology observers and adds bounded reload-only exports: prompt <=64 line summaries, topology <=64 signatures, system0 <=8 head + 8 tail hashes\n// - Keeps prompt/topology/trajectory component budgets 4,096 / 6,144 / 2,048 chars, 2,048 envelope reserve, and the authoritative whole-capsule 16,384-char hard cap\n// - Makes reload precision explicit as EXACT_IDENTITY / LINE_BOUND / COMPLETE_PREFIX / PREFIX_FLOOR / BOUNDED and never renders a floor as false exactness\n// - Skips cache-trajectory mutation once on a first-post-reload topology PREFIX_FLOOR, then returns to the existing exact same-generation path\n// - Preserves MEMORY -> SESSION -> HOST_LOCAL, one Host-local key, 10-minute TTL, exact location, consume-before-adopt, output failure isolation, and provider cache UNVERIFIED\n// - M2-3 remains frozen until 06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT closes with HUMAN_EVIDENCE\n//\n'
PATCH_LAYER=zlib.decompress(base64.b64decode('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')).decode('utf-8')
def patch(text):
    if '//@version 0.64.10' not in text: raise SystemExit('06411_PARENT_VERSION_MISMATCH')
    text=rep(text,'//@version 0.64.10','//@version 0.64.11','version')
    text=rep(text,'// v0.64.10 Host-Local One-Shot Telemetry Handoff:',NOTE+'// v0.64.10 Host-Local One-Shot Telemetry Handoff:','note')
    text=rep(text,"const HOST_COMPAT_VERSION = '0.64.10';","const HOST_COMPAT_VERSION = '0.64.11';",'host-version')
    text=rep(text,"  const prepared = serializeCapsule(capsule);\n  const base = publishPrepared(root, windowLike, capsule, prepared);","  const prepared = capsule?.__simcorePreparedSerialized || serializeCapsule(capsule);\n  const base = publishPrepared(root, windowLike, capsule, prepared);",'prepared')
    outer="(async () => {\n  const kernel = SimCore.require('kernel');"
    text=rep(text,outer,PATCH_LAYER+'\n'+outer,'patch-layer')
    old="""      const capsule = runtimeTelemetryRules.capture({
        sourceVersion: SIMCORE_RUNTIME_VERSION,
        locationKey,
        capturedAt: Date.now(),
        runtimePromptCache: runtimePromptCache.exportState(),
        requestTopology: requestTopology.exportState(),
        cacheCandidates: cacheCandidates.exportState(),
      });
      if (!capsule) return null;"""
    new="""      const capsule = runtimeTelemetryRules.captureCompact({
        sourceVersion: SIMCORE_RUNTIME_VERSION,
        locationKey,
        capturedAt: Date.now(),
        runtimePromptCache: runtimePromptCache.exportHandoffState(),
        requestTopology: requestTopology.exportHandoffState(),
        cacheCandidates: cacheCandidates.exportState(),
      });
      if (!capsule) {
        const compact = runtimeTelemetryRules.diagnostics().compaction || null;
        const probe = Object.freeze({ trigger: normalizedTrigger, memory: 'COMPACTION_FAILED', session: 'NOT_ATTEMPTED', sessionRoot: 'NONE', fallbackFrom: null, attempted: '', surface: runtimeTelemetryRules.diagnostics().surface || null, hostLocal: 'NOT_ATTEMPTED', hostElapsedMs: 0, host: runtimeTelemetryRules.diagnostics().host || null, serialization: 'COMPACTION_FAILED', serializedChars: Number(compact?.wholeChars || 0), compaction: compact, elapsedMs: perfMs(startedAt), retainedBodies: false });
        lastTelemetryCheckpointProbe = probe;
        return probe;
      }"""
    text=rep(text,old,new,'checkpoint')
    text=rep(text,"        serializedChars: Number(write?.serializedChars || 0),","        serializedChars: Number(write?.serializedChars || 0),\n        compaction: runtimeTelemetryRules.diagnostics().compaction || null,",'checkpoint-probe')
    text=rep(text,"          restoredRuntimePrefix = runtimePromptCache.importState(adoption.capsule.runtimePromptCache);\n          restoredTopology = requestTopology.importState(adoption.capsule.requestTopology);","          restoredRuntimePrefix = runtimePromptCache.importHandoffState(adoption.capsule.runtimePromptCache);\n          restoredTopology = requestTopology.importHandoffState(adoption.capsule.requestTopology);",'adopt-import')
    text=rep(text,"          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,","          runtimePrefix: restoredRuntimePrefix, topology: restoredTopology, trajectory: restoredTrajectory,\n          handoffPrecision: adoption.capsule?.handoff?.precision || null,",'adopt-precision')
    old="""    const prefixLabel = !probeFresh || !cacheProbe
      ? 'n/a'
      : (cacheProbe.baseline
        ? 'BASELINE'
        : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`);"""
    new="""    const prefixLabel = !probeFresh || !cacheProbe
      ? 'n/a'
      : (cacheProbe.baseline
        ? 'BASELINE'
        : ((cacheProbe.precision === 'PREFIX_FLOOR' || cacheProbe.precision === 'LINE_BOUND')
          ? `>=${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · HANDOFF_${cacheProbe.precision}`
          : `${Number(cacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${cacheProbe.reason || 'other'}`));"""
    text=rep(text,old,new,'prefix-label')
    old="  return `ADOPTED · via ${probe.transport || 'memory'}${probe.transport === 'session' && probe.sessionRoot ? ` · root ${probe.sessionRoot}` : ''} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}`;"
    new="  return `ADOPTED · via ${probe.transport || 'memory'}${probe.transport === 'session' && probe.sessionRoot ? ` · root ${probe.sessionRoot}` : ''} · from ${probe.sourceVersion || '?'} · age ${cadence(probe.ageMs)} · topology ${probe.topology ? 'RESTORED' : 'FRESH'} · runtime-prefix ${probe.runtimePrefix ? 'RESTORED' : 'FRESH'} · trajectory ${probe.trajectory ? 'RESTORED' : 'FRESH'}${probe.handoffPrecision ? ` · handoff prompt ${probe.handoffPrecision.prompt || 'FRESH'} · topology ${probe.handoffPrecision.topology || 'FRESH'}` : ''}`;"
    text=rep(text,old,new,'continuity')
    marker="      `Telemetry continuity: ${runtimeProbeRules.continuity(lastTelemetryContinuityProbe)}`,\n"
    add=marker+"      `Telemetry capsule: ${lastTelemetryCheckpointProbe?.compaction ? `${lastTelemetryCheckpointProbe.compaction.format || 'COMPACT_V2'} · ${Number(lastTelemetryCheckpointProbe.compaction.wholeChars || 0).toLocaleString('en-US')}/16,384 chars · prompt ${Number(lastTelemetryCheckpointProbe.compaction.components?.prompt?.chars || 0).toLocaleString('en-US')}/4,096 · topology ${Number(lastTelemetryCheckpointProbe.compaction.components?.topology?.chars || 0).toLocaleString('en-US')}/6,144 · trajectory ${Number(lastTelemetryCheckpointProbe.compaction.components?.trajectory?.chars || 0).toLocaleString('en-US')}/2,048 · prompt precision ${lastTelemetryCheckpointProbe.compaction.precision?.prompt || 'FRESH'} · topology precision ${lastTelemetryCheckpointProbe.compaction.precision?.topology || 'FRESH'} · ${lastTelemetryCheckpointProbe.compaction.status || 'UNKNOWN'}` : 'n/a'}`,\n      `Handoff precision: ${lastTelemetryContinuityProbe?.handoffPrecision ? `prompt ${lastTelemetryContinuityProbe.handoffPrecision.prompt || 'FRESH'} · topology ${lastTelemetryContinuityProbe.handoffPrecision.topology || 'FRESH'}` : 'n/a'}`,\n"
    text=rep(text,marker,add,'diag')
    old="""  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.64.10',
    name: 'Host-Local One-Shot Telemetry Handoff',
    scenario: '06410_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',
    summary: Object.freeze([
      '브라우저 sessionStorage를 쓸 수 없을 때 Host 로컬 저장소를 telemetry handoff 대체 경로로 사용',
      '저장 내용은 10분 TTL / location 일치 / 16KB 이하의 메타데이터-only capsule으로 제한',
      '같은 location의 capsule은 안전하게 지운 뒤에만 한 번 채택',
      'SESSION 또는 HOST_LOCAL이 실제 WRITTEN일 때만 새로고침 실험 진행',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.64.10', name: 'Host-Local One-Shot Telemetry Handoff', bullets: Object.freeze(['sessionStorage 불가 시 Host 로컬 one-shot fallback', 'matching location은 consume-before-adopt']) }),
      Object.freeze({ version: '0.64.9', name: 'Session Transport Root Resolution', bullets: Object.freeze(['WINDOW / GLOBAL_THIS sessionStorage surface를 분리 진단', '실제 checkpoint/claim root를 표시']) }),
      Object.freeze({ version: '0.64.8', name: 'Output-Complete Telemetry Checkpoint Repair', bullets: Object.freeze(['정상 출력 완료 뒤 telemetry checkpoint 추가', 'checkpoint 결과를 Last Turn Diagnostic에 표시']) }),
    ]),
  });"""
    new="""  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.64.11',
    name: 'Bounded Telemetry Capsule Compaction',
    scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT',
    summary: Object.freeze([
      '같은 generation의 정밀 관측은 유지하고 새로고침 handoff만 bounded compact metadata로 분리',
      'prompt 4KB / topology 6KB / trajectory 2KB component budget과 전체 16KB hard cap을 동시에 유지',
      'LINE_BOUND / PREFIX_FLOOR 결과는 >= / BOUNDED로 표시해 false exactness를 금지',
      'COMPACT_V2가 16KB 이하이고 HOST_LOCAL WRITTEN일 때만 새로고침 실험 진행',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.64.11', name: 'Bounded Telemetry Capsule Compaction', bullets: Object.freeze(['reload handoff export를 bounded compact shape로 분리', '첫 bounded reobserve에서 false cache regression 방지']) }),
      Object.freeze({ version: '0.64.10', name: 'Host-Local One-Shot Telemetry Handoff', bullets: Object.freeze(['sessionStorage 불가 시 Host 로컬 one-shot fallback', 'matching location은 consume-before-adopt']) }),
      Object.freeze({ version: '0.64.9', name: 'Session Transport Root Resolution', bullets: Object.freeze(['WINDOW / GLOBAL_THIS sessionStorage surface를 분리 진단', '실제 checkpoint/claim root를 표시']) }),
    ]),
  });"""
    text=rep(text,old,new,'card')
    text=rep(text,'<ol style="margin:7px 0 10px 18px;padding:0"><li>업데이트 뒤 새로고침 없이 자연 요청 1회 후 진단 확인</li><li><b>SESSION WRITTEN 또는 HOST_LOCAL WRITTEN</b>이면 pre-refresh 진단 전체 복사 후 같은 탭 새로고침</li><li>첫 post-refresh 자연 요청 후 진단 전체 복사</li><li>재생성/손수정 없이 자연 요청 1회 더 하고 두 번째 post-refresh 진단 전체 복사</li></ol>','<ol style="margin:7px 0 10px 18px;padding:0"><li>업데이트 뒤 새로고침 없이 자연 요청 1회 후 진단 확인</li><li><b>Telemetry capsule COMPACT_V2 · 16,384 chars 이하 + HOST_LOCAL WRITTEN</b>이면 pre-refresh 진단 전체 복사 후 같은 탭 새로고침</li><li>첫 post-refresh 자연 요청 후 ADOPTED / handoff precision 진단 전체 복사</li><li>재생성/손수정 없이 자연 요청 1회 더 하고 exact same-generation 관측 복귀 여부와 함께 두 번째 post-refresh 진단 전체 복사</li></ol>','steps')
    text=rep(text,'<div>HOST_LOCAL UNAVAILABLE / FAILED / OVERSIZE, 공통 serialization 실패 또는 예상 밖 semantic/runtime 이상이면 <b>새로고침하지 말고 현재 진단 전체를 먼저 보존</b></div>','<div>COMPACTION_FAILED / component oversize / HOST_LOCAL UNAVAILABLE·FAILED·OVERSIZE / 전체 16KB 초과 또는 예상 밖 semantic/runtime 이상이면 <b>새로고침하지 말고 현재 진단 전체를 먼저 보존</b></div>','stop')
    for m in ['captureCompact','exportHandoffState','importHandoffState','SKIPPED_BOUNDED_REOBSERVE','PREFIX_FLOOR','Telemetry capsule:','Handoff precision:',"version: '0.64.11'"]:
        if m not in text: raise SystemExit(f'06411_POSTCONDITION_MISSING {m}')
    if "const MAX_SERIALIZED_CHARS = 16384;" not in text: raise SystemExit('06411_CAP_DRIFT')
    return text

def main():
    src=[p.read_text(encoding='utf-8') for p in FILES]
    if src[0]!=src[1]: raise SystemExit('06411_PARENT_LATEST_INSTALL_MISMATCH')
    out=patch(src[0])
    for p in FILES: p.write_text(out,encoding='utf-8')
if __name__=='__main__': main()
