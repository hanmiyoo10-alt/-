from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RELEASE_NOTES = """// v0.63.50 Host Prefix Reset Attribution:
// - Follows v0.63.49 real long-chat validation where externally observed cache hits coexisted with rolling CHAT_HISTORY frontier movement, while the one externally observed cache miss coincided with a PRE_SIMCORE HOST_PREFIX break at system @0, 0% local common prefix and a cache-family reset
// - Adds a memory-only system @0 block sketch using 512-character FNV-1a hashes from both the head and tail so message-level HOST_PREFIX resets can be localized without retaining raw system bodies or changing request bytes/order
// - Classifies system @0 changes as STABLE / DELTA_LOCALIZED / WIDESPREAD / UNAVAILABLE and reports bounded head/tail agreement, changed-span upper bounds, size delta, insertion/removal/replacement-like shape and family-reset correlation; block bounds are diagnostic approximations, not semantic source attribution
// - Keeps v0.63.49 History stabilization OBSERVE_ONLY and provider cache UNVERIFIED: no request/chat/persistent-state mutation, provider hit/miss inference, network/timer/storage call, prompt relocation, or cache directive is added
// - Attribution scope only: TAIL_AFTER_CURRENT_USER, Broadcast End Authority, Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery, compiler tiers, Deferred Mirror, persistent schema and all generation semantics remain frozen
//
"""

TOPOLOGY_HELPERS = r'''const HOST_PREFIX_BLOCK_CHARS = 512;

function comparableMessageText(message) {
  const content = message?.content;
  if (typeof content === 'string') return content;
  try { return JSON.stringify(content == null ? '' : content); }
  catch (_) { return String(content == null ? '' : content); }
}

function buildSystem0Sketch(message) {
  if (String(message?.role || '') !== 'system') return null;
  const text = comparableMessageText(message);
  const headBlocks = [];
  const tailBlocks = [];
  for (let start = 0; start < text.length; start += HOST_PREFIX_BLOCK_CHARS) {
    headBlocks.push(exactHash(text.slice(start, Math.min(text.length, start + HOST_PREFIX_BLOCK_CHARS))));
  }
  for (let end = text.length; end > 0; end -= HOST_PREFIX_BLOCK_CHARS) {
    tailBlocks.push(exactHash(text.slice(Math.max(0, end - HOST_PREFIX_BLOCK_CHARS), end)));
  }
  return Object.freeze({
    version: 1,
    chars: text.length,
    blockChars: HOST_PREFIX_BLOCK_CHARS,
    headBlocks: Object.freeze(headBlocks),
    tailBlocks: Object.freeze(tailBlocks),
  });
}

function cloneSystem0Sketch(sketch) {
  if (!sketch || Number(sketch.version) !== 1) return null;
  return {
    version: 1,
    chars: Number(sketch.chars || 0),
    blockChars: Number(sketch.blockChars || HOST_PREFIX_BLOCK_CHARS),
    headBlocks: Array.isArray(sketch.headBlocks) ? sketch.headBlocks.map(String) : [],
    tailBlocks: Array.isArray(sketch.tailBlocks) ? sketch.tailBlocks.map(String) : [],
  };
}

function buildHostPrefixProbe(previousSketch, currentSketch, previousSignature, currentSignature, previousFamilyId, currentFamilyId, baseline) {
  const familyChanged = !!previousFamilyId && !!currentFamilyId && String(previousFamilyId) !== String(currentFamilyId);
  const base = {
    previousSignature: compactSignature(previousSignature),
    currentSignature: compactSignature(currentSignature),
    previousFamilyId: previousFamilyId || null,
    currentFamilyId: currentFamilyId || null,
    familyChanged,
    blockChars: Number(currentSketch?.blockChars || previousSketch?.blockChars || HOST_PREFIX_BLOCK_CHARS),
    retainedBodies: false,
  };
  if (!currentSketch) return Object.freeze({ ...base, status: 'UNAVAILABLE', shape: 'NO_SYSTEM0', confidence: 'NONE', deltaChars: 0, commonHeadChars: 0, commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  if (baseline || !previousSketch) return Object.freeze({ ...base, status: 'BASELINE', shape: 'BASELINE', confidence: 'NONE', deltaChars: 0, commonHeadChars: 0, commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  if (sameSignature(previousSignature, currentSignature)) {
    return Object.freeze({ ...base, status: 'STABLE', shape: 'NONE', confidence: 'HIGH', deltaChars: 0, commonHeadChars: Number(currentSketch.chars || 0), commonTailChars: 0, previousChangedChars: 0, currentChangedChars: 0 });
  }

  const block = Math.max(1, Number(currentSketch.blockChars || previousSketch.blockChars || HOST_PREFIX_BLOCK_CHARS));
  const previousChars = Math.max(0, Number(previousSketch.chars || 0));
  const currentChars = Math.max(0, Number(currentSketch.chars || 0));
  const minChars = Math.min(previousChars, currentChars);
  const previousHead = Array.isArray(previousSketch.headBlocks) ? previousSketch.headBlocks : [];
  const currentHead = Array.isArray(currentSketch.headBlocks) ? currentSketch.headBlocks : [];
  const previousTail = Array.isArray(previousSketch.tailBlocks) ? previousSketch.tailBlocks : [];
  const currentTail = Array.isArray(currentSketch.tailBlocks) ? currentSketch.tailBlocks : [];

  let headBlocks = 0;
  const headLimit = Math.min(previousHead.length, currentHead.length);
  while (headBlocks < headLimit && String(previousHead[headBlocks]) === String(currentHead[headBlocks])) headBlocks += 1;
  let tailBlocks = 0;
  const tailLimit = Math.min(previousTail.length, currentTail.length);
  while (tailBlocks < tailLimit && String(previousTail[tailBlocks]) === String(currentTail[tailBlocks])) tailBlocks += 1;

  const commonHeadChars = Math.min(minChars, headBlocks * block);
  const commonTailChars = Math.min(Math.max(0, minChars - commonHeadChars), tailBlocks * block);
  const previousChangedChars = Math.max(0, previousChars - commonHeadChars - commonTailChars);
  const currentChangedChars = Math.max(0, currentChars - commonHeadChars - commonTailChars);
  const deltaChars = currentChars - previousChars;
  const coverage = minChars > 0 ? (commonHeadChars + commonTailChars) / minChars : 0;
  const status = coverage >= 0.75 ? 'DELTA_LOCALIZED' : 'WIDESPREAD';
  const spanDelta = currentChangedChars - previousChangedChars;
  let shape = status === 'DELTA_LOCALIZED' ? 'LOCALIZED_CHANGE' : 'WIDESPREAD_CHANGE';
  if (status === 'DELTA_LOCALIZED' && deltaChars > 0 && previousChangedChars <= block * 2 && Math.abs(spanDelta - deltaChars) <= block * 2) shape = 'INSERTION_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars < 0 && currentChangedChars <= block * 2 && Math.abs(spanDelta - deltaChars) <= block * 2) shape = 'REMOVAL_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars === 0) shape = 'REPLACEMENT_LIKE';
  else if (status === 'DELTA_LOCALIZED' && deltaChars !== 0) shape = 'SIZE_SHIFT_LOCALIZED';
  const confidence = status === 'DELTA_LOCALIZED' && commonHeadChars >= block * 2 && commonTailChars >= block * 2
    ? 'HIGH'
    : (status === 'DELTA_LOCALIZED' ? 'MEDIUM' : 'LOW');
  return Object.freeze({ ...base, status, shape, confidence, deltaChars, commonHeadChars, commonTailChars, previousChangedChars, currentChangedChars });
}

'''

PROBE_HELPERS = r'''function hostPrefixAttribution(probe) {
  const hp = probe?.hostPrefixProbe;
  if (!hp) return 'n/a';
  if (hp.status === 'BASELINE') return `BASELINE · system0 ${hp.currentSignature || 'n/a'} · block ${Number(hp.blockChars || 0)}c · raw bodies NOT RETAINED`;
  if (hp.status === 'UNAVAILABLE') return 'UNAVAILABLE · system @0 absent · raw bodies NOT RETAINED';
  return `${hp.status || 'n/a'} · shape ${hp.shape || 'n/a'} · confidence ${hp.confidence || 'NONE'} · block ${Number(hp.blockChars || 0)}c · raw bodies NOT RETAINED`;
}
function hostPrefixDelta(probe) {
  const hp = probe?.hostPrefixProbe;
  if (!hp) return 'n/a';
  const familyCurrent = hp.currentFamilyId ? String(hp.currentFamilyId).slice(0, 8) : 'n/a';
  const familyPrevious = hp.previousFamilyId ? String(hp.previousFamilyId).slice(0, 8) : 'n/a';
  const family = hp.previousFamilyId
    ? `${familyPrevious}→${familyCurrent} · ${hp.familyChanged ? 'RESET_CORRELATED' : 'SAME_FAMILY'}`
    : `${familyCurrent} · BASELINE`;
  if (hp.status === 'BASELINE') return `system0 ${hp.currentSignature || 'n/a'} · family ${family}`;
  if (hp.status === 'UNAVAILABLE') return `system0 unavailable · family ${family}`;
  const delta = Number(hp.deltaChars || 0);
  return `prev ${hp.previousSignature || 'n/a'} → current ${hp.currentSignature || 'n/a'} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · head ≥${Number(hp.commonHeadChars || 0).toLocaleString('en-US')} · tail ≥${Number(hp.commonTailChars || 0).toLocaleString('en-US')} · changed prev ≤${Number(hp.previousChangedChars || 0).toLocaleString('en-US')} · current ≤${Number(hp.currentChangedChars || 0).toLocaleString('en-US')} · family ${family}`;
}
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def patch(text: str) -> str:
    text = replace_once(text, '//@version 0.63.49', '//@version 0.63.50', 'metadata version')
    text = replace_once(text, "const SIMCORE_RUNTIME_VERSION = '0.63.49';", "const SIMCORE_RUNTIME_VERSION = '0.63.50';", 'runtime version')
    text = replace_once(text, '// v0.63.49 Cache Effect Verification:', RELEASE_NOTES + '// v0.63.49 Cache Effect Verification:', 'release notes')

    text = replace_once(text, 'function outputCompatibleFingerprint(message) {', TOPOLOGY_HELPERS + 'function outputCompatibleFingerprint(message) {', 'topology helpers')

    clone_anchor = """    runtimeIndex: Number(previous.runtimeIndex ?? -1),
    leadingSystemMessages: Number(previous.leadingSystemMessages || 0),
  };
}"""
    clone_replacement = """    runtimeIndex: Number(previous.runtimeIndex ?? -1),
    leadingSystemMessages: Number(previous.leadingSystemMessages || 0),
    system0Sketch: cloneSystem0Sketch(previous.system0Sketch),
  };
}"""
    text = replace_once(text, clone_anchor, clone_replacement, 'clone system0 sketch')

    text = replace_once(text,
        '      const leadingSystemMessages = leadingSystemCount(signatures);\n',
        '      const leadingSystemMessages = leadingSystemCount(signatures);\n      const currentSystem0Sketch = leadingSystemMessages > 0 ? buildSystem0Sketch(list[0]) : null;\n',
        'current system0 sketch')

    attribution_anchor = """      const exposureChars = baseline ? null : Math.max(0, totalChars - commonChars);
      const exposureRatio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (exposureChars / totalChars) * 100)) : 0);
      const probe = Object.freeze({"""
    attribution_replacement = """      const exposureChars = baseline ? null : Math.max(0, totalChars - commonChars);
      const exposureRatio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (exposureChars / totalChars) * 100)) : 0);
      const currentFamilyId = familyFingerprint(signatures);
      const previousFamilyId = prior ? familyFingerprint(prior.signatures) : null;
      const hostPrefixProbe = buildHostPrefixProbe(
        prior?.system0Sketch || null,
        currentSystem0Sketch,
        prior?.signatures?.[0] || null,
        signatures[0] || null,
        previousFamilyId,
        currentFamilyId,
        baseline,
      );
      const probe = Object.freeze({"""
    text = replace_once(text, attribution_anchor, attribution_replacement, 'host prefix probe construction')

    text = replace_once(text,
        "        requestFingerprint: requestFingerprint(signatures),\n        familyId: familyFingerprint(signatures),\n",
        "        requestFingerprint: requestFingerprint(signatures),\n        familyId: currentFamilyId,\n        previousFamilyId, hostPrefixProbe,\n",
        'host prefix probe fields')

    text = replace_once(text,
        '      previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex, leadingSystemMessages };\n',
        '      previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex, leadingSystemMessages, system0Sketch: currentSystem0Sketch };\n',
        'remember system0 sketch')

    text = replace_once(text,
        '      return { version: 1, key: previousKey, previous: clonePrevious(previous) };\n',
        '      return { version: 2, key: previousKey, previous: clonePrevious(previous) };\n',
        'topology handoff export version')
    text = replace_once(text,
        "      if (!state || Number(state.version) !== 1 || typeof state.key !== 'string' || !state.key) return false;\n",
        "      if (!state || ![1, 2].includes(Number(state.version)) || typeof state.key !== 'string' || !state.key) return false;\n",
        'topology handoff import compatibility')

    text = replace_once(text, 'function historyAlignment(probe) {', PROBE_HELPERS + 'function historyAlignment(probe) {', 'diagnostic formatter helpers')
    text = replace_once(text,
        'module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, cacheEffect, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };',
        'module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, cacheEffect, hostPrefixAttribution, hostPrefixDelta, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };',
        'runtime probe exports')

    diagnostic_anchor = """      `Cache effect: ${probeFresh ? runtimeProbeRules.cacheEffect(topologyProbe, lastFrontierMovementProbe) : 'n/a'}`,
      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,"""
    diagnostic_replacement = """      `Cache effect: ${probeFresh ? runtimeProbeRules.cacheEffect(topologyProbe, lastFrontierMovementProbe) : 'n/a'}`,
      `Host prefix attribution: ${probeFresh ? runtimeProbeRules.hostPrefixAttribution(topologyProbe) : 'n/a'}`,
      `Host prefix delta: ${probeFresh ? runtimeProbeRules.hostPrefixDelta(topologyProbe) : 'n/a'}`,
      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,"""
    text = replace_once(text, diagnostic_anchor, diagnostic_replacement, 'diagnostic lines')

    return text


patched = []
for path in FILES:
    source = path.read_text(encoding='utf-8')
    if '//@version 0.63.50' in source:
        result = source
    elif '//@version 0.63.49' in source:
        result = patch(source)
    else:
        raise SystemExit(f'{path}: expected SimCore 0.63.49 source')
    path.write_text(result, encoding='utf-8')
    patched.append(result)

if patched[0] != patched[1]:
    raise SystemExit('latest.js and install.js diverged after patch')

print('SimCore v0.63.50 Host Prefix Reset Attribution patch ready')
