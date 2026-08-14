from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.15 Frame Guard:\n// - Adds a dedicated Frame module after repeated live regressions proved Volume/Chapter/Chatindex continuity is independent from Short-C source/provenance behavior\n// - Captures only the immediately previous visible assistant frame from the already-loaded request history; adds no host/storage read, history semantic scan, prompt line, or creative decision\n// - Enforces a deterministic backward-only floor: same-volume Chapter and Chatindex may not decrease, Volume may not decrease, and Chapter reset remains allowed after a genuine Volume advance\n// - A regressed heading is restored as the prior full heading rather than rewriting only its number, preventing mixed-number/mixed-title Frankenstein headers\n// - Keeps Prompt, Time, Recovery, Structure, Lineage, Handoff, Recurrence, Community, Reaction, storage paths, provenance policy, and diagnostics UI behavior otherwise frozen\n//\n"""

FRAME_MODULE = r'''SimCore.define("frame", function (require, module, exports) {
const VOLUME_LINE_RE = /^[ \t]*##[ \t]+볼륨[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
const CHAPTER_LINE_RE = /^[ \t]*###[ \t]+챕터[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
const CHATINDEX_LINE_RE = /^[ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*(\d+)[^\r\n]*∮[ \t]*$/mi;

function headerState(raw, re) {
  const m = String(raw || '').match(re);
  return m ? { value: Number(m[1]), header: String(m[0] || '').trim() } : { value: null, header: null };
}

function parseFrame(raw) {
  const text = String(raw || '');
  const volume = headerState(text, VOLUME_LINE_RE);
  const chapter = headerState(text, CHAPTER_LINE_RE);
  const chatindex = headerState(text, CHATINDEX_LINE_RE);
  return {
    volume: Number.isFinite(volume.value) ? volume.value : null,
    volumeHeader: volume.header,
    chapter: Number.isFinite(chapter.value) ? chapter.value : null,
    chapterHeader: chapter.header,
    chatindex: Number.isFinite(chatindex.value) ? chatindex.value : null,
    chatindexHeader: chatindex.header,
  };
}

function assistantRole(message) {
  return message?.role === 'assistant' || message?.role === 'char';
}

function capturePreviousFrame(messages, sendIndex, textOfMessage) {
  const rows = Array.isArray(messages) ? messages : [];
  const parsedSend = Number(sendIndex);
  const before = Number.isInteger(parsedSend) && parsedSend >= 0 ? Math.min(parsedSend, rows.length) : rows.length;
  for (let i = before - 1; i >= 0; i--) {
    if (!assistantRole(rows[i])) continue;
    const raw = typeof textOfMessage === 'function'
      ? textOfMessage(rows[i])
      : (rows[i]?.content ?? rows[i]?.data ?? rows[i]?.text ?? '');
    const frame = parseFrame(raw);
    if ([frame.volume, frame.chapter, frame.chatindex].some(Number.isFinite)) {
      return { ...frame, sourceAssistantIndex: i };
    }
    return null;
  }
  return null;
}

function numericFrame(frame) {
  return {
    volume: Number.isFinite(frame?.volume) ? Number(frame.volume) : null,
    chapter: Number.isFinite(frame?.chapter) ? Number(frame.chapter) : null,
    chatindex: Number.isFinite(frame?.chatindex) ? Number(frame.chatindex) : null,
  };
}

function replaceHeader(text, re, header) {
  return header ? String(text || '').replace(re, header) : String(text || '');
}

function enforceContinuity(content, floor) {
  let text = String(content || '');
  const observed = parseFrame(text);
  const previous = floor && typeof floor === 'object' ? floor : null;
  const applied = [];

  if (previous) {
    const volumeComparable = Number.isFinite(previous.volume) && Number.isFinite(observed.volume);
    const volumeRegressed = volumeComparable && observed.volume < previous.volume;
    const sameVolume = volumeComparable && observed.volume === previous.volume;

    if (volumeRegressed) {
      if (previous.volumeHeader && observed.volumeHeader) {
        text = replaceHeader(text, VOLUME_LINE_RE, previous.volumeHeader);
        applied.push('VOLUME');
      }
      if (previous.chapterHeader && observed.chapterHeader) {
        text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
        applied.push('CHAPTER');
      }
    } else if (sameVolume
        && Number.isFinite(previous.chapter) && Number.isFinite(observed.chapter)
        && observed.chapter < previous.chapter
        && previous.chapterHeader && observed.chapterHeader) {
      text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
      applied.push('CHAPTER');
    }

    if (Number.isFinite(previous.chatindex) && Number.isFinite(observed.chatindex)
        && observed.chatindex < previous.chatindex
        && previous.chatindexHeader && observed.chatindexHeader) {
      text = replaceHeader(text, CHATINDEX_LINE_RE, previous.chatindexHeader);
      applied.push('CHATINDEX');
    }
  }

  const output = parseFrame(text);
  return {
    content: text,
    probe: {
      applied: applied.length > 0,
      regression: applied.length ? applied.join('+') : 'NONE',
      previous: numericFrame(previous),
      observed: numericFrame(observed),
      output: numericFrame(output),
    },
  };
}

module.exports = {
  parseFrame,
  capturePreviousFrame,
  enforceContinuity,
};
});

'''


def replace_once(text, old, new, label, path):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} anchor drift ({count})')
    return text.replace(old, new, 1)


for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.14' not in text:
        raise SystemExit(f'{path}: expected 0.63.14 baseline')
    if '// v0.63.15 Frame Guard:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.14', '//@version 0.63.15', 'version', path)
    text = replace_once(text, '// v0.63.14 Short-C Example Provenance Lock:\n', CHANGELOG + '// v0.63.14 Short-C Example Provenance Lock:\n', 'changelog', path)

    text = replace_once(
        text,
        '// - Time: timestamp syntax + narrative/broadcast clock primitives + world-year/age synchronization\n',
        '// - Time: timestamp syntax + narrative/broadcast clock primitives + world-year/age synchronization\n// - Frame: visible response-frame parsing + backward continuity floor only\n',
        'module list', path,
    )

    contract_anchor = "  time: Object.freeze({ owns: 'timestamp syntax, narrative/broadcast clocks, world-year and age-offset primitives', excludes: 'scene meaning or mode classification' }),\n"
    contract_add = contract_anchor + "  frame: Object.freeze({ owns: 'visible response-frame parsing and deterministic backward continuity floor', excludes: 'progression decisions, semantic rewriting, host/storage I/O' }),\n"
    text = replace_once(text, contract_anchor, contract_add, 'frame contract', path)

    structure_anchor = 'SimCore.define("structure", function (require, module, exports) {\n'
    text = replace_once(text, structure_anchor, FRAME_MODULE + structure_anchor, 'frame module insertion', path)

    session_require_anchor = "const kernel = require('./kernel');\nconst lifecycle = require('./lifecycle');\nconst time = require('./time');\nconst community = require('./community');\nconst reaction = require('./reaction');\nconst structure = require('./structure');\nconst recovery = require('./recovery');\nconst recurrence = require('./recurrence');\nconst prompt = require('./prompt');\n"
    session_require_new = "const kernel = require('./kernel');\nconst lifecycle = require('./lifecycle');\nconst time = require('./time');\nconst frame = require('./frame');\nconst community = require('./community');\nconst reaction = require('./reaction');\nconst structure = require('./structure');\nconst recovery = require('./recovery');\nconst recurrence = require('./recurrence');\nconst prompt = require('./prompt');\n"
    text = replace_once(text, session_require_anchor, session_require_new, 'session frame require', path)

    on_send_anchor = "    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);\n    if (detail) {\n"
    on_send_new = "    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);\n    if (state.pending?.active) {\n      state.pending.frameFloor = frame.capturePreviousFrame(historyMessages, sendIndex, kernel.textOfMessage);\n    }\n    if (detail) {\n"
    text = replace_once(text, on_send_anchor, on_send_new, 'frame floor capture', path)

    finalize_anchor = "  let finalText = String(prepared?.content || '');\n  const timestampCanonicalization = time.canonicalizeTimestampSyntax(finalText);\n"
    finalize_new = "  let finalText = String(prepared?.content || '');\n  const frameGuard = frame.enforceContinuity(finalText, p.frameFloor || null);\n  finalText = frameGuard.content;\n  const timestampCanonicalization = time.canonicalizeTimestampSyntax(finalText);\n"
    text = replace_once(text, finalize_anchor, finalize_new, 'frame enforcement', path)

    return_anchor = "    stateCommit: commit,\n    narrativeClockProbe,\n    timestampCanonicalization,\n"
    return_new = "    stateCommit: commit,\n    frameGuardProbe: frameGuard.probe,\n    narrativeClockProbe,\n    timestampCanonicalization,\n"
    text = replace_once(text, return_anchor, return_new, 'frame probe return', path)

    global_anchor = "  let lastHistoryRestore = null;\n  let lastNarrativeClockProbe = null;\n"
    global_new = "  let lastHistoryRestore = null;\n  let lastFrameGuardProbe = null;\n  let lastNarrativeClockProbe = null;\n"
    text = replace_once(text, global_anchor, global_new, 'frame probe global', path)

    output_probe_anchor = "    if (normalizationIssues.length) console.log('[simcore/v0.63.4] reaction normalization:', normalizationIssues.join(' / '));\n    if (result.narrativeClockProbe) {\n"
    output_probe_new = "    if (normalizationIssues.length) console.log('[simcore/v0.63.4] reaction normalization:', normalizationIssues.join(' / '));\n    lastFrameGuardProbe = result.frameGuardProbe || null;\n    if (result.narrativeClockProbe) {\n"
    text = replace_once(text, output_probe_anchor, output_probe_new, 'frame probe capture', path)

    diagnostic_vars_anchor = "    const recurrenceProbe = lastTemplateRecurrenceProbe || null;\n    const narrative = lastNarrativeClockProbe || null;\n"
    diagnostic_vars_new = "    const recurrenceProbe = lastTemplateRecurrenceProbe || null;\n    const frameGuard = lastFrameGuardProbe || null;\n    const narrative = lastNarrativeClockProbe || null;\n"
    text = replace_once(text, diagnostic_vars_anchor, diagnostic_vars_new, 'diagnostic frame variable', path)

    diagnostic_line_anchor = "      `Frame regression: ${frameProbe.regression}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n"
    diagnostic_line_new = "      `Frame regression: ${frameProbe.regression}`,\n      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'CLAMPED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,\n      `Narrative clock: ${probeFresh && narrative ? `${narrative.commitStatus || 'n/a'} · previous ${narrative.previousAnchor || 'n/a'} · output ${narrative.outputTimestamp || 'n/a'}` : 'n/a'}`,\n"
    text = replace_once(text, diagnostic_line_anchor, diagnostic_line_new, 'diagnostic frame guard line', path)

    text = replace_once(text, '⚙️ SimCore v0.63.14', '⚙️ SimCore v0.63.15', 'panel version', path)
    text = replace_once(text, "'Version: 0.63.14'", "'Version: 0.63.15'", 'diagnostic version', path)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.15 latest.js/install.js (dedicated Frame module + backward-only runtime frame floor)')
