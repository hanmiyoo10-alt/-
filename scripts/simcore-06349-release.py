from pathlib import Path
import re

FILES = [
    Path('plugins/simcore/latest.js'),
    Path('plugins/simcore/install.js'),
]

OLD_VERSION = '0.63.48'
NEW_VERSION = '0.63.49'

CHANGELOG = '''// v0.63.49 Cache Effect Verification:
// - Retires request-history repair attempts after v0.63.48 real long-chat validation showed the exact compact assistant frontier continuing to advance while externally observed caching still occurred on distinct natural B_START/B_CONTINUE/B_END turns; the known compact signature remains diagnostic evidence only
// - Converts History stabilization to OBSERVE_ONLY: it scans only the already-built request for the frozen assistant/text 21:4a852496 signature, reports candidate positions/cost, and performs no request, visible-chat, persistent-state, raw-body, network, timer, or provider-routing mutation
// - Adds a local Cache effect summary that classifies the observed reusable request-prefix window as BASELINE / REUSE_WINDOW_GROWING / REUSE_WINDOW_STABLE / REUSE_WINDOW_SHRINKING / PREFIX_COLLAPSE using existing topology/frontier telemetry; the summary never claims a provider cache hit or miss
// - Reframes frontier movement as representation-boundary telemetry rather than cache-failure proof: common-prefix size/ratio, frontier position/movement and PRE_SIMCORE break ownership are reported together while provider cache remains explicitly UNVERIFIED
// - Verification scope only: TAIL_AFTER_CURRENT_USER, Broadcast End Authority, Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery, compiler tiers, Deferred Mirror, persistent schema, storage/API/network/timer policy and provider-cache policy remain frozen
//
'''

OBSERVE_ONLY_FUNCTION = '''  function stabilizeHistoryProjection(messages, rawMessages, sendIndex) {
    const started = perfNow();
    const request = Array.isArray(messages) ? messages : [];
    const targetPositions = [];
    for (let i = 0; i < request.length; i += 1) {
      if (isKnownCompactAssistant(request[i])) targetPositions.push(i);
    }
    return stabilizationResult('OBSERVE_ONLY', {
      source: 'REQUEST_SIGNATURE_OBSERVER',
      candidates: targetPositions.length,
      applied: 0,
      firstIndex: targetPositions.length ? targetPositions[0] : null,
      lastIndex: targetPositions.length ? targetPositions[targetPositions.length - 1] : null,
      alignmentStatus: 'OBSERVE_ONLY',
      requestSpine: 0,
      hostSpine: 0,
      endpointSource: 'NOT_USED',
      roleMatches: 0,
      roleExpected: 0,
      mappedTargets: 0,
      bodyEquality: 'NOT_USED',
      spineOffset: null,
      addedChars: 0,
      persistentMutation: 'NONE',
    }, started);
  }

  function correlateHistoryMutation'''

CACHE_EFFECT_FORMATTER = '''function cacheEffect(probe, movementProbe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE · provider UNVERIFIED';
  const commonMessages = Number(probe.commonMessages || 0);
  const messages = Number(probe.messages || 0);
  const commonChars = Number(probe.commonChars || 0);
  const totalChars = Number(probe.totalChars || 0);
  const ratio = Number(probe.commonRatio || 0);
  let status = 'REUSE_WINDOW_STABLE';
  if (probe.stable) {
    status = 'REUSE_WINDOW_STABLE';
  } else if (commonMessages <= 0 || commonChars <= 0) {
    status = 'PREFIX_COLLAPSE';
  } else if (movementProbe?.status === 'MOVED') {
    const dm = Number(movementProbe.deltaMessages || 0);
    const dc = Number(movementProbe.deltaChars || 0);
    if (dm > 0 || (dm === 0 && dc > 0)) status = 'REUSE_WINDOW_GROWING';
    else if (dm < 0 || (dm === 0 && dc < 0)) status = 'REUSE_WINDOW_SHRINKING';
  }
  const frontier = probe.firstChangeIndex == null ? 'none' : `@${Number(probe.firstChangeIndex)}`;
  let movement = movementProbe?.status || 'n/a';
  if (movementProbe?.status === 'MOVED') {
    const dm = Number(movementProbe.deltaMessages || 0);
    const dc = Number(movementProbe.deltaChars || 0);
    movement = `${dm >= 0 ? '+' : ''}${dm} msgs / ${dc >= 0 ? '+' : ''}${dc.toLocaleString('en-US')} chars`;
  }
  const breakKind = probe.stable ? 'NONE' : `${probe.breakOwner || 'UNKNOWN'} · ${probe.breakZone || 'UNKNOWN'}`;
  return `${status} · common ${commonMessages}/${messages} msgs · ${commonChars.toLocaleString('en-US')}/${totalChars.toLocaleString('en-US')} chars · ratio ${ratio.toFixed(1)}% · frontier ${frontier} · movement ${movement} · break ${breakKind} · provider UNVERIFIED`;
}
function historyAlignment(probe) {
  if (!probe) return 'n/a';
  if (probe.alignmentStatus === 'OBSERVE_ONLY') return `OBSERVE_ONLY · target assistant/text 21:4a852496 · candidates ${Number(probe.candidates || 0)} · request mutation NONE`;
'''

for path in FILES:
    text = path.read_text(encoding='utf-8')

    if f'//@version {OLD_VERSION}' not in text:
        raise SystemExit(f'{path}: expected metadata version {OLD_VERSION}')
    if f"const SIMCORE_RUNTIME_VERSION = '{OLD_VERSION}';" not in text:
        raise SystemExit(f'{path}: expected runtime version {OLD_VERSION}')
    if '// v0.63.48 History Turn-Ordinal Alignment:' not in text:
        raise SystemExit(f'{path}: expected v0.63.48 changelog anchor')

    text = text.replace(f'//@version {OLD_VERSION}', f'//@version {NEW_VERSION}', 1)
    text = text.replace(
        f"const SIMCORE_RUNTIME_VERSION = '{OLD_VERSION}';",
        f"const SIMCORE_RUNTIME_VERSION = '{NEW_VERSION}';",
        1,
    )
    text = text.replace('// v0.63.48 History Turn-Ordinal Alignment:\n', CHANGELOG + '// v0.63.48 History Turn-Ordinal Alignment:\n', 1)

    text, count = re.subn(
        r'  function stabilizeHistoryProjection\(messages, rawMessages, sendIndex\) \{.*?\n  \}\n\n  function correlateHistoryMutation',
        OBSERVE_ONLY_FUNCTION,
        text,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise SystemExit(f'{path}: stabilizeHistoryProjection replacement count={count}')

    old_alignment_head = "function historyAlignment(probe) {\n  if (!probe) return 'n/a';\n"
    if old_alignment_head not in text:
        raise SystemExit(f'{path}: historyAlignment formatter anchor missing')
    text = text.replace(old_alignment_head, CACHE_EFFECT_FORMATTER, 1)

    old_exports = 'module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };'
    new_exports = 'module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, cacheEffect, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };'
    if old_exports not in text:
        raise SystemExit(f'{path}: runtime probe exports anchor missing')
    text = text.replace(old_exports, new_exports, 1)

    old_diag = "      `Cache break: ${probeFresh ? runtimeProbeRules.breakInfo(topologyProbe) : 'n/a'}`,\n      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,"
    new_diag = "      `Cache break: ${probeFresh ? runtimeProbeRules.breakInfo(topologyProbe) : 'n/a'}`,\n      `Cache effect: ${probeFresh ? runtimeProbeRules.cacheEffect(topologyProbe, lastFrontierMovementProbe) : 'n/a'}`,\n      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,"
    if old_diag not in text:
        raise SystemExit(f'{path}: diagnostic cache-break anchor missing')
    text = text.replace(old_diag, new_diag, 1)

    if "slot.content = replacement.canonicalRaw" in text:
        raise SystemExit(f'{path}: active request-history mutator assignment remains')
    if "return stabilizationResult('APPLIED'" in text:
        raise SystemExit(f'{path}: active APPLIED stabilization path remains')

    path.write_text(text, encoding='utf-8')

latest = FILES[0].read_text(encoding='utf-8')
install = FILES[1].read_text(encoding='utf-8')
if latest != install:
    raise SystemExit('production pair diverged after patch')

required = [
    'v0.63.49 Cache Effect Verification',
    "return stabilizationResult('OBSERVE_ONLY'",
    "source: 'REQUEST_SIGNATURE_OBSERVER'",
    "alignmentStatus: 'OBSERVE_ONLY'",
    'function cacheEffect(probe, movementProbe)',
    'REUSE_WINDOW_GROWING',
    'REUSE_WINDOW_STABLE',
    'REUSE_WINDOW_SHRINKING',
    'PREFIX_COLLAPSE',
    'Cache effect:',
    'provider UNVERIFIED',
]
for needle in required:
    if needle not in latest:
        raise SystemExit(f'missing post-patch marker: {needle}')

print('SimCore v0.63.49 patch prepared successfully')
