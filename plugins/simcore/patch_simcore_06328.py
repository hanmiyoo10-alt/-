from pathlib import Path

targets = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

def patch_one(path):
    s = path.read_text(encoding='utf-8')

    def repl(old, new, label):
        nonlocal s
        n = s.count(old)
        if n != 1:
            raise SystemExit(f'{path}: {label}: expected 1 anchor, found {n}')
        s = s.replace(old, new, 1)

    repl('//@version 0.63.27', '//@version 0.63.28', 'version')

    repl(
'''// v0.63.27 Response Envelope Scope:
''',
'''// v0.63.28 Multi-scene Narrative Clock Commit:
// - Promotes the final line-level scene timestamp to the persisted narrative clock only when every canonical timestamp in the current # 응답 envelope is valid and monotonically non-decreasing
// - Falls back to the frame timestamp for malformed or non-monotonic timestamp sequences; no semantic inference about flashbacks/montages is attempted and no quarantine/warning is introduced for a skipped tail
// - Keeps broadcast airtime semantics first-timestamp based; synchronizes worldYear/age offset to the safely committed narrative tail when that tail crosses a year boundary
// - Keeps Structure v0.63.27, Frame, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; only Time plus minimal Session commit/diagnostic wiring changes
//
// v0.63.27 Response Envelope Scope:
''', 'release note')

    repl(
'''const BROADCAST_TIMESTAMP_RE = /⏱️\\[((?:19|20|21)\\d{2})-(\\d{2})-(\\d{2})\\s+\\(([^)]+)\\)\\s+(\\d{1,2}):(\\d{2})\\s+(AM|PM)\\]/i;
const ZERO_HOUR_TIMESTAMP_RE = /(⏱️\\[(?:19|20|21)\\d{2}-\\d{2}-\\d{2}\\s+\\([^)]+\\)\\s+)00:(\\d{2})\\s+(AM|PM)\\]/gi;
''',
'''const BROADCAST_TIMESTAMP_RE = /⏱️\\[((?:19|20|21)\\d{2})-(\\d{2})-(\\d{2})\\s+\\(([^)]+)\\)\\s+(\\d{1,2}):(\\d{2})\\s+(AM|PM)\\]/i;
const ZERO_HOUR_TIMESTAMP_RE = /(⏱️\\[(?:19|20|21)\\d{2}-\\d{2}-\\d{2}\\s+\\([^)]+\\)\\s+)00:(\\d{2})\\s+(AM|PM)\\]/gi;
const NARRATIVE_RESPONSE_HEADER_RE = /^[ \\t]*#[ \\t]+응답[ \\t]*$/mi;
const NARRATIVE_TIMESTAMP_LINE_RE = /^[ \\t]*(⏱️\\[((?:19|20|21)\\d{2})-(\\d{2})-(\\d{2})\\s+\\(([^)]+)\\)\\s+(\\d{1,2}):(\\d{2})\\s+(AM|PM)\\])[ \\t]*$/gmi;
const NARRATIVE_TIMESTAMP_LINE_MARKER_RE = /^[ \\t]*⏱️\\[[^\\r\\n]*$/gmi;
''', 'time sequence regexes')

    repl(
'''function elapsedMinutes(start, current) {
  const a = parseTimestamp(start);
  const b = parseTimestamp(current);
  if (!a || !b) return null;
  return b.minuteKey - a.minuteKey;
}

function resetBroadcastAirtime(state) {
''',
'''function elapsedMinutes(start, current) {
  const a = parseTimestamp(start);
  const b = parseTimestamp(current);
  if (!a || !b) return null;
  return b.minuteKey - a.minuteKey;
}

function narrativeEnvelopeText(content) {
  const text = String(content || '');
  const header = text.match(NARRATIVE_RESPONSE_HEADER_RE);
  return header && Number.isInteger(header.index) ? text.slice(header.index) : text;
}

function narrativeTimestampSequence(content) {
  const text = narrativeEnvelopeText(content);
  const markers = text.match(new RegExp(NARRATIVE_TIMESTAMP_LINE_MARKER_RE.source, NARRATIVE_TIMESTAMP_LINE_MARKER_RE.flags)) || [];
  const parsed = [];
  const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
  let m;
  while ((m = lineRe.exec(text))) {
    const ts = parseTimestamp(m[1]);
    if (ts) parsed.push(ts);
  }

  if (!parsed.length) {
    const fallback = parseTimestamp(text);
    if (!fallback) {
      return {
        frameTimestamp: null,
        candidate: null,
        sequenceCount: 0,
        sceneCount: 0,
        markerCount: markers.length,
        tailStatus: 'MISSING',
        tailPromoted: false,
      };
    }
    return {
      frameTimestamp: fallback.raw,
      candidate: fallback.raw,
      sequenceCount: 1,
      sceneCount: 0,
      markerCount: markers.length || 1,
      tailStatus: 'FRAME_ONLY_FALLBACK',
      tailPromoted: false,
    };
  }

  const frameTimestamp = parsed[0].raw;
  const sceneCount = Math.max(0, parsed.length - 1);
  if (markers.length !== parsed.length) {
    return {
      frameTimestamp,
      candidate: frameTimestamp,
      sequenceCount: parsed.length,
      sceneCount,
      markerCount: markers.length,
      tailStatus: 'SKIPPED_MALFORMED',
      tailPromoted: false,
    };
  }

  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i].minuteKey < parsed[i - 1].minuteKey) {
      return {
        frameTimestamp,
        candidate: frameTimestamp,
        sequenceCount: parsed.length,
        sceneCount,
        markerCount: markers.length,
        tailStatus: 'SKIPPED_NON_MONOTONIC',
        tailPromoted: false,
      };
    }
  }

  const candidate = parsed[parsed.length - 1].raw;
  return {
    frameTimestamp,
    candidate,
    sequenceCount: parsed.length,
    sceneCount,
    markerCount: markers.length,
    tailStatus: sceneCount > 0 ? 'MONOTONIC' : 'FRAME_ONLY',
    tailPromoted: sceneCount > 0 && candidate !== frameTimestamp,
  };
}

function resetBroadcastAirtime(state) {
''', 'sequence collector')

    repl(
'''function commitNarrativeTimestamp(state, pending, content) {
  if (/^B_/.test(String(pending?.mode || ''))) return { changed: false, reason: 'broadcast', timestamp: null };
  const parsed = parseTimestamp(content);
  if (!parsed) return { changed: false, reason: 'missing-or-invalid', timestamp: null };
  const current = parsed.raw;
  const previous = pending?.narrativeTimestampPrevious || state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous };
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return { changed, reason: 'committed', timestamp: current, previous };
}

function syncNarrativeTimestamp(state, content, mode) {
  if (/^B_/.test(String(mode || ''))) return false;
  const parsed = parseTimestamp(content);
  if (!parsed) return false;
  const previous = state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(parsed.raw, previous);
    if (cmp != null && cmp < 0) return false;
  }
  const changed = state.narrativeTimestamp !== parsed.raw;
  state.narrativeTimestamp = parsed.raw;
  return changed;
}
''',
'''function commitNarrativeTimestamp(state, pending, content) {
  if (/^B_/.test(String(pending?.mode || ''))) {
    return {
      changed: false, reason: 'broadcast', timestamp: null, previous: null,
      frameTimestamp: null, sequenceCount: 0, sceneCount: 0, markerCount: 0,
      tailStatus: 'INELIGIBLE_BROADCAST', tailPromoted: false,
    };
  }
  const sequence = narrativeTimestampSequence(content);
  const current = sequence.candidate || sequence.frameTimestamp || null;
  if (!current) return { changed: false, reason: 'missing-or-invalid', timestamp: null, previous: null, ...sequence };
  const previous = pending?.narrativeTimestampPrevious || state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return { changed: false, reason: 'backward', timestamp: current, previous, ...sequence };
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return { changed, reason: 'committed', timestamp: current, previous, ...sequence };
}

function syncNarrativeTimestamp(state, content, mode) {
  if (/^B_/.test(String(mode || ''))) return false;
  const sequence = narrativeTimestampSequence(content);
  const current = sequence.candidate || sequence.frameTimestamp || null;
  if (!current) return false;
  const previous = state.narrativeTimestamp || null;
  if (previous) {
    const cmp = compareTimestamps(current, previous);
    if (cmp != null && cmp < 0) return false;
  }
  const changed = state.narrativeTimestamp !== current;
  state.narrativeTimestamp = current;
  return changed;
}
''', 'narrative commit/sync')

    repl(
'''  elapsedMinutes,
  resetBroadcastAirtime,
''',
'''  elapsedMinutes,
  narrativeTimestampSequence,
  resetBroadcastAirtime,
''', 'time exports')

    repl(
'''    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);
    const previousNarrative = narrativeCommit.previous || p.narrativeTimestampPrevious || null;
''',
'''    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);
    time.applyWorldYear(state, time.timestampYear(narrativeCommit.timestamp));
    const previousNarrative = narrativeCommit.previous || p.narrativeTimestampPrevious || null;
''', 'tail world year sync')

    repl(
'''      observedTimestamp: narrativeFloor?.observed || narrativeCommit.timestamp || null,
      outputTimestamp: narrativeCommit.timestamp || null,
      floorApplied: !!narrativeFloor?.changed,
''',
'''      observedTimestamp: narrativeFloor?.observed || narrativeCommit.frameTimestamp || narrativeCommit.timestamp || null,
      frameTimestamp: narrativeCommit.frameTimestamp || narrativeFloor?.observed || narrativeCommit.timestamp || null,
      outputTimestamp: narrativeCommit.timestamp || null,
      sceneCount: Number(narrativeCommit.sceneCount || 0),
      sequenceCount: Number(narrativeCommit.sequenceCount || 0),
      tailStatus: narrativeCommit.tailStatus || 'n/a',
      tailPromoted: !!narrativeCommit.tailPromoted,
      floorApplied: !!narrativeFloor?.changed,
''', 'clock probe tail fields')

    repl(
'''  seedNarrativeTimestampFromVisible(content) {
    if (!this.current || this.current.narrativeTimestamp) return false;
    if (/^B_/.test(String(this.current.lastMode || ''))) return false;
    const parsed = time.parseTimestamp(content);
    if (!parsed) return false;
    this.current.narrativeTimestamp = parsed.raw;
    return true;
  }
''',
'''  seedNarrativeTimestampFromVisible(content) {
    if (!this.current || this.current.narrativeTimestamp) return false;
    if (/^B_/.test(String(this.current.lastMode || ''))) return false;
    const sequence = time.narrativeTimestampSequence(content);
    const parsed = time.parseTimestamp(sequence.candidate || sequence.frameTimestamp || '');
    if (!parsed) return false;
    this.current.narrativeTimestamp = parsed.raw;
    time.applyWorldYear(this.current, parsed.year);
    return true;
  }
''', 'visible seed tail-safe')

    repl("'Version: 0.63.27',", "'Version: 0.63.28',", 'diagnostic version')
    repl(
'''      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,
''',
'''      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · frame ${narrative.frameTimestamp || narrative.observedTimestamp || 'n/a'} · committed ${narrative.outputTimestamp || 'n/a'} · scenes ${Number(narrative.sceneCount || 0)} · tail ${narrative.tailStatus || 'n/a'}` : 'n/a'}`,
''', 'diagnostic narrative line')
    repl('⚙️ SimCore v0.63.27', '⚙️ SimCore v0.63.28', 'panel version')

    path.write_text(s, encoding='utf-8')

for target in targets:
    patch_one(target)

if targets[0].read_bytes() != targets[1].read_bytes():
    raise SystemExit('artifact parity failed after patch')
print('patched SimCore 0.63.28 Multi-scene Narrative Clock Commit')
