from pathlib import Path

p = Path('plugins/simcore/latest.js')
s = p.read_text()

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)

rep('//@version 0.63.41', '//@version 0.63.42', 'metadata version')
rep("const SIMCORE_RUNTIME_VERSION = '0.63.41';", "const SIMCORE_RUNTIME_VERSION = '0.63.42';", 'runtime version')

rep('// v0.63.41 Deterministic Continuity Consolidation:', '''// v0.63.42 Cache Integrity & Cost Stabilization:
// - Adds deterministic request-prefix break attribution (HOST_PREFIX / CHAT_HISTORY / CURRENT_USER / SIMCORE_RUNTIME / POST_CURRENT_USER) and PRE_SIMCORE / SIMCORE_RUNTIME / POST_SIMCORE ownership without retaining request bodies
// - Adds a local uncached-exposure proxy from already-computed common-prefix characters; it is explicitly not provider billing or proof of a provider-cache hit/miss
// - Adds stable/slow/volatile runtime-prompt identity fingerprints so byte drift is attributable while preserving TAIL_AFTER_CURRENT_USER request placement and all generation semantics
// - Canonicalizes reaction_max top-level key order before JSON serialization to remove self-inflicted equivalent-state byte drift
// - Keeps v0.63.41 Continuity, v0.63.40 Evidence, v0.63.39 retry/trajectory/EMA, provider-cache policy, request order, mirror/recovery/lifecycle semantics and storage/API/timer/network surfaces frozen
//
// v0.63.41 Deterministic Continuity Consolidation:''', 'release notes')

rep("  return 'other';\n}\n\nfunction buildRuntimePromptCacheProbe", '''  return 'other';
}

function cacheHash(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function runtimeLineTier(line) {
  const value = String(line || '');
  if (/^(?:korean_age_offset|current_korean_age|world_year|secondary_configured|secondary_active|episode_no)=/.test(value)) return 'slow';
  if (/^(?:mode_c_|embedded_preview_|current_root_evidence=|current_source_evidence=|event_fact_precedence=|source_event_identity_and_facts=|abstract_generalization_from_current_root_allowed=|specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support|outside_root_specific_event_evidence_only_if_|platform_group_reuse_forbidden=|community_placement=|knowledge_after_last_community=)/.test(value)) return 'volatile';
  if (promptChangeReason('', value) !== 'other') return 'volatile';
  return 'stable';
}

function runtimeIdentity(text, previous = null) {
  const value = String(text == null ? '' : text);
  const buckets = { stable: [], slow: [], volatile: [] };
  for (const line of (value ? value.split('\\n') : [])) buckets[runtimeLineTier(line)].push(line);
  const build = (name, joined) => {
    const chars = joined.length;
    const hash = cacheHash(joined);
    const prior = previous?.[name];
    const status = !prior ? 'BASELINE' : (Number(prior.chars) === chars && String(prior.hash || '') === hash ? 'SAME' : 'CHANGED');
    return Object.freeze({ chars, hash, status });
  };
  return Object.freeze({
    stable: build('stable', buckets.stable.join('\\n')),
    slow: build('slow', buckets.slow.join('\\n')),
    volatile: build('volatile', buckets.volatile.join('\\n')),
    full: build('full', value),
  });
}

function buildRuntimePromptCacheProbe''', 'runtime cache identity helpers')

rep('''function createRuntimePromptCacheTracker(contract = null) {
  let previousText = null;
  let previousKey = null;
  let previousSketch = null;''', '''function createRuntimePromptCacheTracker(contract = null) {
  let previousText = null;
  let previousKey = null;
  let previousSketch = null;
  let previousIdentity = null;''', 'runtime cache tracker state')

rep('''      probe = Object.freeze({
        ...probe,
        requestOrder:''', '''      const identity = runtimeIdentity(currentText, previousKey === currentKey ? previousIdentity : null);
      probe = Object.freeze({
        ...probe,
        identity,
        requestOrder:''', 'runtime cache identity observe')

rep('''      previousText = String(currentText || '');
      previousSketch = cacheSketch(previousText);
      previousKey = currentKey;''', '''      previousText = String(currentText || '');
      previousSketch = cacheSketch(previousText);
      previousIdentity = identity;
      previousKey = currentKey;''', 'runtime cache identity save')

rep('return { version: 1, key: previousKey, sketch: previousSketch };', 'return { version: 1, key: previousKey, sketch: previousSketch, identity: previousIdentity };', 'runtime cache export identity')

rep('''      previousKey = state.key;
      previousText = null;
      previousSketch = state.sketch;
      return true;''', '''      previousKey = state.key;
      previousText = null;
      previousSketch = state.sketch;
      previousIdentity = state.identity || null;
      return true;''', 'runtime cache import identity')

rep('''      previousText = null;
      previousKey = null;
      previousSketch = null;''', '''      previousText = null;
      previousKey = null;
      previousSketch = null;
      previousIdentity = null;''', 'runtime cache reset identity')

rep('module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, createRuntimePromptCacheTracker };', 'module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };', 'runtime cache exports')

rep('''function clonePrevious(previous) {
  if (!previous || !Array.isArray(previous.signatures)) return null;
  return {''', '''function leadingSystemCount(signatures) {
  let count = 0;
  while (count < signatures.length && signatures[count]?.role === 'system') count += 1;
  return count;
}

function breakAttribution(firstChangeIndex, currentUserIndex, runtimeIndex, leadingSystemMessages, priorLeadingSystemMessages, baseline, stable) {
  if (baseline) return Object.freeze({ owner: 'BASELINE', zone: 'BASELINE' });
  if (stable || firstChangeIndex == null) return Object.freeze({ owner: 'NONE', zone: 'NONE' });
  const index = Number(firstChangeIndex);
  const owner = index < runtimeIndex ? 'PRE_SIMCORE' : (index === runtimeIndex ? 'SIMCORE_RUNTIME' : 'POST_SIMCORE');
  const sharedLeadingSystem = Math.min(Number(leadingSystemMessages || 0), Number(priorLeadingSystemMessages ?? leadingSystemMessages ?? 0));
  let zone;
  if (index < sharedLeadingSystem) zone = 'HOST_PREFIX';
  else if (index < currentUserIndex) zone = 'CHAT_HISTORY';
  else if (index === currentUserIndex) zone = 'CURRENT_USER';
  else if (index === runtimeIndex) zone = 'SIMCORE_RUNTIME';
  else zone = 'POST_CURRENT_USER';
  return Object.freeze({ owner, zone });
}

function clonePrevious(previous) {
  if (!previous || !Array.isArray(previous.signatures)) return null;
  return {''', 'topology attribution helpers')

rep('''    runtimeIndex: Number(previous.runtimeIndex ?? -1),
  };''', '''    runtimeIndex: Number(previous.runtimeIndex ?? -1),
    leadingSystemMessages: Number(previous.leadingSystemMessages || 0),
  };''', 'topology clone leading systems')

rep('''      const runtimeIndex = Number.isInteger(Number(extra?.runtimeIndex)) ? Number(extra.runtimeIndex) : (list.length ? list.length - 1 : -1);
      const at =''', '''      const runtimeIndex = Number.isInteger(Number(extra?.runtimeIndex)) ? Number(extra.runtimeIndex) : (list.length ? list.length - 1 : -1);
      const leadingSystemMessages = leadingSystemCount(signatures);
      const at =''', 'topology leading systems observe')

rep('''      const ratio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (commonChars / totalChars) * 100)) : 100);
      const probe = Object.freeze({''', '''      const ratio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (commonChars / totalChars) * 100)) : 100);
      const attribution = breakAttribution(firstChangeIndex, currentUserIndex, runtimeIndex, leadingSystemMessages, prior?.leadingSystemMessages, baseline, stable);
      const exposureChars = baseline ? null : Math.max(0, totalChars - commonChars);
      const exposureRatio = baseline ? null : (totalChars > 0 ? Math.max(0, Math.min(100, (exposureChars / totalChars) * 100)) : 0);
      const probe = Object.freeze({''', 'topology attribution observe')

rep('''        currentUserIndex, runtimeIndex,
        currentUserPosition:''', '''        currentUserIndex, runtimeIndex, leadingSystemMessages,
        breakOwner: attribution.owner, breakZone: attribution.zone,
        exposureChars, exposureRatio,
        currentUserPosition:''', 'topology probe fields')

rep('previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex };', 'previous = { at, signatures, totalChars, currentUserIndex, runtimeIndex, leadingSystemMessages };', 'topology save fields')
rep('module.exports = { exactHash, messageSignature, createRequestTopologyTracker };', 'module.exports = { exactHash, messageSignature, leadingSystemCount, breakAttribution, createRequestTopologyTracker };', 'topology exports')

rep('''function compileHotState(s, communityExpected) {
  return communityExpected > 0
    ? [`reaction_max=${JSON.stringify(s.community.platformMax)}`]
    : [];
}''', '''function stableRecordJson(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const ordered = {};
  for (const key of Object.keys(source).sort()) ordered[key] = source[key];
  return JSON.stringify(ordered);
}

function compileHotState(s, communityExpected) {
  return communityExpected > 0
    ? [`reaction_max=${stableRecordJson(s.community.platformMax)}`]
    : [];
}''', 'canonical reaction serialization')

rep('function trajectory(probe) {', '''function cacheIntegrity(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  return probe.stable ? 'STABLE' : 'DEGRADED';
}
function breakInfo(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  if (probe.stable) return 'NONE';
  const first = probe.firstChangeIndex == null ? 'n/a' : `@${Number(probe.firstChangeIndex)} ${probe.previousRole || '?'}→${probe.currentRole || '?'}`;
  return `${probe.breakOwner || 'UNKNOWN'} · ${probe.breakZone || 'UNKNOWN'} · ${first}`;
}
function exposure(probe) {
  if (!probe || probe.baseline) return 'BASELINE';
  return `${Number(probe.exposureChars || 0).toLocaleString('en-US')}/${Number(probe.totalChars || 0).toLocaleString('en-US')} chars · ${Number(probe.exposureRatio || 0).toFixed(1)}% · local proxy only`;
}
function runtimeIdentity(probe) {
  const id = probe?.identity;
  if (!id) return 'n/a';
  const part = (name) => {
    const x = id[name];
    return `${name} ${x?.status || 'n/a'} ${String(x?.hash || 'n/a').slice(0, 8)} ${Number(x?.chars || 0)}c`;
  };
  return `${part('stable')} · ${part('slow')} · ${part('volatile')} · ${part('full')}`;
}
function simcoreContribution(probe) {
  if (!probe) return 'n/a';
  if (probe.baseline) return 'BASELINE';
  if (probe.stable) return 'NO_BREAK';
  return probe.breakOwner === 'SIMCORE_RUNTIME' ? 'FIRST_BREAK' : 'NOT_FIRST_BREAK';
}

function trajectory(probe) {''', 'runtime probe cache formatters')

rep('module.exports = { cachePosture, cadence, topology, trajectory, continuity, representation };', 'module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };', 'runtime probe exports')

rep("""      `Cache topology: ${probeFresh ? runtimeProbeRules.topology(topologyProbe) : 'n/a'}`,
      `Cache placement:""", """      `Cache topology: ${probeFresh ? runtimeProbeRules.topology(topologyProbe) : 'n/a'}`,
      `Cache integrity: ${probeFresh ? runtimeProbeRules.cacheIntegrity(topologyProbe) : 'n/a'}`,
      `Cache break: ${probeFresh ? runtimeProbeRules.breakInfo(topologyProbe) : 'n/a'}`,
      `Local exposure proxy: ${probeFresh ? runtimeProbeRules.exposure(topologyProbe) : 'n/a'}`,
      `Runtime identity: ${probeFresh ? runtimeProbeRules.runtimeIdentity(cacheProbe) : 'n/a'}`,
      `SimCore contribution: ${probeFresh ? runtimeProbeRules.simcoreContribution(topologyProbe) : 'n/a'}`,
      `Cache placement:""", 'diagnostic cache lines')

p.write_text(s)
Path('plugins/simcore/install.js').write_text(s)
print('patched chars', len(s))
