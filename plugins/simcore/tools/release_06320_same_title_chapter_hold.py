from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.20 Same-Title Chapter Hold:\n// - Extends the proven Frame Guard with one deterministic frame invariant observed in live long-chat use: an unchanged Chapter title must not advance its Chapter number\n// - Compares only normalized visible Chapter-title text (NFKC + whitespace collapse); it does not interpret story meaning, infer progression, scan history semantically, or add prompt guidance\n// - When the previous/current Chapter titles are identical and the model advances the Chapter number, restores the previous full Chapter heading while leaving Volume, Chatindex, timestamp, body, COMMUNITY and Knowledge untouched\n// - Existing backward Volume/Chapter/Chatindex floors remain unchanged, genuine Chapter-title changes may advance normally, and a Volume advance may still reset Chapter numbering\n// - Evidence Fence, Prompt, Time, Lineage, Handoff, Recurrence, Community, Reaction, Structure, Recovery, Session, storage/state schema and host/API call sites remain frozen\n//\n"""

FRAME_MODULE = r'''SimCore.define("frame", function (require, module, exports) {
const VOLUME_LINE_RE = /^[ \t]*##[ \t]+볼륨[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
const CHAPTER_LINE_RE = /^[ \t]*###[ \t]+챕터[ \t]+(\d+)[ \t]*[:：][ \t]*([^\r\n]*)$/mi;
const CHATINDEX_LINE_RE = /^[ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*(\d+)[^\r\n]*∮[ \t]*$/mi;

function headerState(raw, re) {
  const m = String(raw || '').match(re);
  return m ? { value: Number(m[1]), header: String(m[0] || '').trim() } : { value: null, header: null };
}

function normalizeChapterTitle(raw) {
  let text = String(raw || '');
  try { text = text.normalize('NFKC'); } catch { /* older JS runtime */ }
  return text.replace(/\s+/g, ' ').trim();
}

function chapterState(raw) {
  const m = String(raw || '').match(CHAPTER_LINE_RE);
  return m
    ? { value: Number(m[1]), header: String(m[0] || '').trim(), title: normalizeChapterTitle(m[2]) }
    : { value: null, header: null, title: '' };
}

function parseFrame(raw) {
  const text = String(raw || '');
  const volume = headerState(text, VOLUME_LINE_RE);
  const chapter = chapterState(text);
  const chatindex = headerState(text, CHATINDEX_LINE_RE);
  return {
    volume: Number.isFinite(volume.value) ? volume.value : null,
    volumeHeader: volume.header,
    chapter: Number.isFinite(chapter.value) ? chapter.value : null,
    chapterHeader: chapter.header,
    chapterTitle: chapter.title,
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
    } else if (Number.isFinite(previous.chapter) && Number.isFinite(observed.chapter)
        && observed.chapter > previous.chapter
        && previous.chapterTitle && observed.chapterTitle
        && previous.chapterTitle === observed.chapterTitle
        && previous.chapterHeader && observed.chapterHeader) {
      text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
      applied.push('CHAPTER_TITLE_HOLD');
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


def replace_module(text, name, replacement, path):
    marker = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'{path}: module missing: {name}')
    end = text.find('\nSimCore.define("', start + len(marker))
    if end < 0:
        end = text.find('\n(async () => {', start + len(marker))
    if end < 0:
        raise SystemExit(f'{path}: module end missing: {name}')
    return text[:start] + replacement.rstrip('\n') + text[end:]


for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.19' not in text:
        raise SystemExit(f'{path}: expected 0.63.19 baseline')
    if '// v0.63.20 Same-Title Chapter Hold:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.19', '//@version 0.63.20', 'version', path)
    text = replace_once(text, '// v0.63.19 Evidence Fence:\n', CHANGELOG + '// v0.63.19 Evidence Fence:\n', 'changelog', path)

    text = replace_once(
        text,
        '// - Frame: visible response-frame parsing + backward continuity floor only\n',
        '// - Frame: visible response-frame parsing + backward floor + same-title Chapter hold\n',
        'module list', path,
    )

    old_contract = "  frame: Object.freeze({ owns: 'visible response-frame parsing and deterministic backward continuity floor', excludes: 'progression decisions, semantic rewriting, host/storage I/O' }),\n"
    new_contract = "  frame: Object.freeze({ owns: 'visible response-frame parsing, deterministic backward continuity floor, and same-title Chapter-number hold', excludes: 'semantic title interpretation, narrative progression decisions, host/storage I/O' }),\n"
    text = replace_once(text, old_contract, new_contract, 'frame contract', path)

    text = replace_module(text, 'frame', FRAME_MODULE, path)

    text = replace_once(text, '⚙️ SimCore v0.63.19', '⚙️ SimCore v0.63.20', 'panel version', path)
    text = replace_once(text, "'Version: 0.63.19'", "'Version: 0.63.20'", 'diagnostic version', path)
    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.20 latest.js/install.js (Frame same-title Chapter-number hold only)')
