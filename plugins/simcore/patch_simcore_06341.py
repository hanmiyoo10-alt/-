from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    assert count == 1, f'{label}: expected 1 anchor, got {count}'
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    assert count == 1, f'{label}: expected 1 regex match, got {count}'
    return out


TIME_HELPERS = r'''
function validDateMs(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || y < 1900 || y > 2199) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const date = new Date(ms);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return ms;
}

function pad2(value) { return String(Math.max(0, Number(value) || 0)).padStart(2, '0'); }
function dateString(year, month, day) { return `${Number(year)}-${pad2(month)}-${pad2(day)}`; }
function weekdayLabel(year, month, day) {
  const ms = validDateMs(year, month, day);
  return ms == null ? null : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(ms).getUTCDay()];
}

function resolveCalendarTransition(userText, previousTimestamp, fallbackYear = null) {
  const head = String(userText || '').trim().slice(0, 420);
  const m = head.match(/^(?:한편\s+)?(?:그리고\s+)?(?:(?:((?:19|20|21)\d{2})년)\s*)?(\d{1,2})월\s*(\d{1,2})일(?:\s*(?:\([^)]+\)|(?:월|화|수|목|금|토|일)요일))?\s*(?:이|가)?\s*(?:되고|되어|되면서|되었다|됐다)(?:\s|$)/i);
  if (!m) return { eligible: false, reason: 'INELIGIBLE', targetDate: null };

  const explicitYear = m[1] ? Number(m[1]) : null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const previous = parseTimestamp(previousTimestamp);
  const fallback = Number(fallbackYear);
  const anchorYear = explicitYear || previous?.year || (Number.isFinite(fallback) ? fallback : null);
  if (!anchorYear) return { eligible: false, reason: 'UNRESOLVED_YEAR', targetDate: null, month, day };

  let resolvedYear = null;
  if (explicitYear) {
    const candidate = validDateMs(explicitYear, month, day);
    if (candidate == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, year: explicitYear, month, day };
    const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
    if (previousDay != null && candidate < previousDay) {
      return { eligible: false, reason: 'EXPLICIT_BACKWARD', targetDate: null, year: explicitYear, month, day };
    }
    resolvedYear = explicitYear;
  } else {
    const previousDay = previous ? validDateMs(previous.year, previous.month, previous.day) : null;
    for (let y = anchorYear; y <= anchorYear + 8; y++) {
      const candidate = validDateMs(y, month, day);
      if (candidate == null) continue;
      if (previousDay != null && candidate < previousDay) continue;
      resolvedYear = y;
      break;
    }
    if (resolvedYear == null) return { eligible: false, reason: 'INVALID_DATE', targetDate: null, month, day };
  }

  const targetDate = dateString(resolvedYear, month, day);
  const rollover = !explicitYear && resolvedYear > anchorYear;
  return {
    eligible: true,
    reason: explicitYear ? 'EXPLICIT_YEAR' : (rollover ? 'YEAR_ROLLOVER' : 'SAME_YEAR'),
    year: resolvedYear,
    month,
    day,
    targetDate,
    weekday: weekdayLabel(resolvedYear, month, day),
    previousDate: previous ? dateString(previous.year, previous.month, previous.day) : null,
    anchorYear,
    yearRollover: rollover,
    singleYearRollover: rollover && resolvedYear === anchorYear + 1,
  };
}

function formatTimestampForDate(parsed, year, month, day) {
  if (!parsed || validDateMs(year, month, day) == null) return null;
  const weekday = weekdayLabel(year, month, day);
  if (!weekday) return null;
  return `⏱️[${dateString(year, month, day)} (${weekday}) ${parsed.hour12}:${pad2(parsed.minute)} ${parsed.ampm}]`;
}

function enforceNarrativeCalendarTarget(content, target) {
  const text = String(content || '');
  if (!target?.eligible || !target?.targetDate) {
    return { content: text, changed: false, reason: 'ineligible', observedTimestamp: null, outputTimestamp: null, dateChanged: false, weekdayChanged: false };
  }
  const parsed = parseTimestamp(text);
  if (!parsed) {
    return { content: text, changed: false, reason: 'missing-or-invalid', observedTimestamp: null, outputTimestamp: null, dateChanged: false, weekdayChanged: false };
  }
  const expected = formatTimestampForDate(parsed, target.year, target.month, target.day);
  if (!expected) {
    return { content: text, changed: false, reason: 'invalid-target', observedTimestamp: parsed.raw, outputTimestamp: parsed.raw, dateChanged: false, weekdayChanged: false };
  }
  const observedDate = dateString(parsed.year, parsed.month, parsed.day);
  const dateChanged = observedDate !== target.targetDate;
  const weekdayChanged = String(parsed.dayLabel || '') !== String(target.weekday || '');
  const changed = expected !== parsed.raw;
  return {
    content: changed ? text.replace(parsed.raw, expected) : text,
    changed,
    reason: changed ? (dateChanged ? 'date-repaired' : 'weekday-repaired') : 'pass',
    observedTimestamp: parsed.raw,
    outputTimestamp: expected,
    dateChanged,
    weekdayChanged,
  };
}

function repairNarrativeYearRolloverSequence(content, target) {
  const text = String(content || '');
  if (!target?.eligible || !target?.singleYearRollover) return { content: text, changed: false, count: 0, reason: 'ineligible' };
  let previous = null;
  let index = 0;
  let count = 0;
  const lineRe = new RegExp(NARRATIVE_TIMESTAMP_LINE_RE.source, NARRATIVE_TIMESTAMP_LINE_RE.flags);
  const repaired = text.replace(lineRe, (whole, raw) => {
    const parsed = parseTimestamp(raw);
    if (!parsed) { index += 1; return whole; }
    let outputRaw = raw;
    let outputParsed = parsed;
    if (index > 0 && previous && parsed.minuteKey < previous.minuteKey && parsed.year === target.year - 1) {
      const candidateRaw = formatTimestampForDate(parsed, target.year, parsed.month, parsed.day);
      const candidate = candidateRaw ? parseTimestamp(candidateRaw) : null;
      if (candidate && candidate.minuteKey >= previous.minuteKey) {
        outputRaw = candidateRaw;
        outputParsed = candidate;
        count += 1;
      }
    }
    previous = outputParsed;
    index += 1;
    return outputRaw === raw ? whole : whole.replace(raw, outputRaw);
  });
  return { content: repaired, changed: count > 0, count, reason: count > 0 ? 'year-rollover-repaired' : 'pass' };
}
'''

FRAME_MODULE = r'''SimCore.define("frame", function (require, module, exports) {
const VOLUME_LINE_RE = /^[ \t]*##[ \t]+볼륨[ \t]+(\d+)[ \t]*[:：][^\r\n]*$/mi;
const CHAPTER_LINE_RE = /^[ \t]*###[ \t]+챕터[ \t]+(\d+)[ \t]*[:：][ \t]*([^\r\n]*)$/mi;
const CHATINDEX_LINE_RE = /^[ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*(\d+)[^\r\n]*∮[ \t]*$/mi;
const VOLUME_NUMBER_RE = /^([ \t]*##[ \t]+볼륨[ \t]+)\d+([ \t]*[:：][^\r\n]*)$/mi;
const CHAPTER_NUMBER_RE = /^([ \t]*###[ \t]+챕터[ \t]+)\d+([ \t]*[:：][ \t]*[^\r\n]*)$/mi;
const CHATINDEX_NUMBER_RE = /^([ \t]*####[ \t]+Chatindex[ \t]*[:：][ \t]*)\d+([^\r\n]*∮[ \t]*)$/mi;

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

function assistantRole(message) { return message?.role === 'assistant' || message?.role === 'char'; }

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
    if ([frame.volume, frame.chapter, frame.chatindex].some(Number.isFinite)) return { ...frame, sourceAssistantIndex: i };
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

function replaceHeader(text, re, header) { return header ? String(text || '').replace(re, header) : String(text || ''); }
function rewriteNumber(text, re, value) {
  if (!Number.isFinite(Number(value))) return String(text || '');
  return String(text || '').replace(re, (_m, prefix, suffix) => `${prefix}${Number(value)}${suffix}`);
}
function rewriteVolumeNumber(text, value) { return rewriteNumber(text, VOLUME_NUMBER_RE, value); }
function rewriteChapterNumber(text, value) { return rewriteNumber(text, CHAPTER_NUMBER_RE, value); }
function rewriteChatindexNumber(text, value) { return rewriteNumber(text, CHATINDEX_NUMBER_RE, value); }

function enforceContinuity(content, floor) {
  let text = String(content || '');
  const observed = parseFrame(text);
  const previous = floor && typeof floor === 'object' ? floor : null;
  const repairs = [];
  const expected = numericFrame(observed);
  let volumeSignal = 'NO_BASELINE';
  let chapterSignal = 'NO_BASELINE';

  if (previous) {
    const volumeComparable = Number.isFinite(previous.volume) && Number.isFinite(observed.volume);
    if (volumeComparable) {
      if (observed.volume < previous.volume) {
        volumeSignal = 'BACKWARD';
        expected.volume = previous.volume;
        if (previous.volumeHeader && observed.volumeHeader) {
          text = replaceHeader(text, VOLUME_LINE_RE, previous.volumeHeader);
          repairs.push('VOLUME_BACKWARD');
        }
        if (previous.chapterHeader && observed.chapterHeader) {
          text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
          repairs.push('CHAPTER_WITH_VOLUME_BACKWARD');
          expected.chapter = previous.chapter;
        }
      } else if (observed.volume === previous.volume) {
        volumeSignal = 'SAME';
        expected.volume = previous.volume;
      } else {
        volumeSignal = 'ADVANCED';
        expected.volume = previous.volume + 1;
        if (observed.volume !== expected.volume) {
          text = rewriteVolumeNumber(text, expected.volume);
          repairs.push('VOLUME_JUMP');
        }
      }
    }

    if (Number.isFinite(previous.chapter) && Number.isFinite(observed.chapter)) {
      if (volumeSignal === 'ADVANCED') {
        chapterSignal = 'RESET_AFTER_VOLUME_ADVANCE';
        expected.chapter = 1;
        if (observed.chapter !== 1) {
          text = rewriteChapterNumber(text, 1);
          repairs.push('CHAPTER_RESET');
        }
      } else if (volumeSignal === 'SAME') {
        const comparableTitles = !!(previous.chapterTitle && observed.chapterTitle);
        if (comparableTitles && previous.chapterTitle === observed.chapterTitle) {
          chapterSignal = 'SAME_TITLE_HOLD';
          expected.chapter = previous.chapter;
          if (observed.chapter !== expected.chapter) {
            text = rewriteChapterNumber(text, expected.chapter);
            repairs.push('CHAPTER_TITLE_HOLD');
          }
        } else if (comparableTitles && previous.chapterTitle !== observed.chapterTitle) {
          chapterSignal = 'TITLE_CHANGED_ADVANCE';
          expected.chapter = previous.chapter + 1;
          if (observed.chapter !== expected.chapter) {
            text = rewriteChapterNumber(text, expected.chapter);
            repairs.push('CHAPTER_TITLE_ADVANCE');
          }
        } else if (observed.chapter < previous.chapter) {
          chapterSignal = 'BACKWARD';
          expected.chapter = previous.chapter;
          if (previous.chapterHeader && observed.chapterHeader) {
            text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
            repairs.push('CHAPTER_BACKWARD');
          }
        } else {
          chapterSignal = 'UNRESOLVED_TITLE';
        }
      } else if (volumeSignal === 'BACKWARD') {
        chapterSignal = 'HELD_WITH_VOLUME';
        expected.chapter = previous.chapter;
      } else if (observed.chapter < previous.chapter) {
        chapterSignal = 'BACKWARD';
        expected.chapter = previous.chapter;
        if (previous.chapterHeader && observed.chapterHeader) {
          text = replaceHeader(text, CHAPTER_LINE_RE, previous.chapterHeader);
          repairs.push('CHAPTER_BACKWARD');
        }
      }
    }

    if (Number.isFinite(previous.chatindex) && Number.isFinite(observed.chatindex)) {
      expected.chatindex = previous.chatindex + 1;
      if (observed.chatindex !== expected.chatindex) {
        text = rewriteChatindexNumber(text, expected.chatindex);
        repairs.push(observed.chatindex === previous.chatindex
          ? 'CHATINDEX_SAME'
          : (observed.chatindex < expected.chatindex ? 'CHATINDEX_BACKWARD' : 'CHATINDEX_JUMP'));
      }
    }
  }

  const output = parseFrame(text);
  return {
    content: text,
    probe: {
      applied: repairs.length > 0,
      regression: repairs.length ? repairs.join('+') : 'NONE',
      sequenceStatus: previous ? (repairs.length ? 'REPAIRED' : 'PASS') : 'BASELINE',
      volumeSignal,
      chapterSignal,
      repairs,
      previous: numericFrame(previous),
      observed: numericFrame(observed),
      expected,
      output: numericFrame(output),
    },
  };
}

module.exports = { parseFrame, capturePreviousFrame, enforceContinuity, rewriteVolumeNumber, rewriteChapterNumber, rewriteChatindexNumber };
});'''

for path in FILES:
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '//@version 0.63.40', '//@version 0.63.41', f'{path}: metadata')
    text = replace_once(text, "const SIMCORE_RUNTIME_VERSION = '0.63.40';", "const SIMCORE_RUNTIME_VERSION = '0.63.41';", f'{path}: runtime version')

    release_note = '''// v0.63.41 Deterministic Continuity Consolidation:\n// - Resolves explicit opening month/day current-time transitions against the persisted narrative clock, including deterministic year rollover, calendar-valid dates, weekday normalization and pre-generation worldYear/age-offset advancement\n// - Repairs only deterministic timestamp components: the frame date/weekday must match a resolved current-date target, while later canonical scene timestamps retain fail-closed monotonic validation with a narrow one-year rollover repair when that same rollover is already proven by the current user transition\n// - Upgrades Frame continuity from backward-only floors to deterministic sequencing: Chatindex is exactly previous visible +1, Volume jumps normalize to previous +1 only when the model already advances Volume, same-title Chapters hold, changed-title Chapters advance by one, and a Volume advance resets Chapter to 1\n// - Preserves visible-user edits as the next continuity baseline and uses number-only rewrites for new sequencing repairs while retaining the proven full-header rollback for true backward Volume/Chapter regressions\n// - Keeps v0.63.40 Evidence, v0.63.39 trajectory/retry/EMA, provider-cache policy, request order, mirror/edit acceptance, Reaction/Recurrence/Lineage/Handoff and storage/API/timer/network surfaces frozen\n//\n'''
    text = replace_once(text, '// v0.63.40 Current Source Integrity & Runtime Surface Consolidation:\n', release_note + '// v0.63.40 Current Source Integrity & Runtime Surface Consolidation:\n', f'{path}: release note')

    text = replace_once(text,
        "time: Object.freeze({ owns: 'timestamp syntax, narrative/broadcast clocks, world-year and age-offset primitives', excludes: 'scene meaning or mode classification' }),",
        "time: Object.freeze({ owns: 'timestamp syntax, deterministic calendar transitions, narrative/broadcast clocks, world-year and age-offset primitives', excludes: 'scene meaning or mode classification' }),",
        f'{path}: time contract')
    text = replace_once(text,
        "frame: Object.freeze({ owns: 'visible response-frame parsing, deterministic backward continuity floor, and same-title Chapter-number hold', excludes: 'semantic title interpretation, narrative progression decisions, host/storage I/O' }),",
        "frame: Object.freeze({ owns: 'visible response-frame parsing and deterministic Volume/Chapter/Chatindex sequencing', excludes: 'semantic title interpretation, narrative progression decisions, host/storage I/O' }),",
        f'{path}: frame contract')

    elapsed_anchor = '''function elapsedMinutes(start, current) {\n  const a = parseTimestamp(start);\n  const b = parseTimestamp(current);\n  if (!a || !b) return null;\n  return b.minuteKey - a.minuteKey;\n}\n\nfunction narrativeEnvelopeText(content) {'''
    elapsed_replacement = '''function elapsedMinutes(start, current) {\n  const a = parseTimestamp(start);\n  const b = parseTimestamp(current);\n  if (!a || !b) return null;\n  return b.minuteKey - a.minuteKey;\n}\n''' + TIME_HELPERS + '''\nfunction narrativeEnvelopeText(content) {'''
    text = replace_once(text, elapsed_anchor, elapsed_replacement, f'{path}: time helpers')

    text = replace_once(text,
        '''  compareTimestamps,\n  elapsedMinutes,\n  narrativeTimestampSequence,''',
        '''  compareTimestamps,\n  elapsedMinutes,\n  resolveCalendarTransition,\n  enforceNarrativeCalendarTarget,\n  repairNarrativeYearRolloverSequence,\n  narrativeTimestampSequence,''',
        f'{path}: time exports')

    text = sub_once(text,
        r'SimCore\.define\("frame", function \(require, module, exports\) \{.*?\n\}\);\nSimCore\.define\("structure"',
        FRAME_MODULE + '\nSimCore.define("structure"',
        f'{path}: frame module')

    old_lifecycle = '''  const secondaryConfigured = !!(config.secondaryName && config.secondaryKeyword);\n  const secondaryActive = secondaryConfigured && input.includes(config.secondaryKeyword);\n  const narrativeProgression = /^B_/.test(c.mode) ? { active: false, reason: 'broadcast' } : time.narrativeProgressionHint(input);\n  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);\n  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);\n  const templateRecurrence = recurrence.observe(state, input, c.mode);'''
    new_lifecycle = '''  const secondaryConfigured = !!(config.secondaryName && config.secondaryKeyword);\n  const secondaryActive = secondaryConfigured && input.includes(config.secondaryKeyword);\n  const narrativeTimestampPrevious = /^B_/.test(c.mode) ? null : (state.narrativeTimestamp || null);\n  const narrativeCalendarTarget = /^B_/.test(c.mode)\n    ? { eligible: false, reason: 'BROADCAST', targetDate: null }\n    : time.resolveCalendarTransition(input, narrativeTimestampPrevious, state.worldYear);\n  const narrativeProgression = /^B_/.test(c.mode)\n    ? { active: false, reason: 'broadcast' }\n    : (narrativeCalendarTarget.eligible ? { active: true, reason: 'calendar-resolved' } : time.narrativeProgressionHint(input));\n  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);\n  const templateRecurrence = recurrence.observe(state, input, c.mode);'''
    text = replace_once(text, old_lifecycle, new_lifecycle, f'{path}: lifecycle resolver')

    text = replace_once(text,
        '''  // Explicit user dates can advance world year before generation in every mode.\n  time.applyWorldYear(state, time.explicitWorldYear(input));''',
        '''  // Explicit current-date transitions advance world year before generation without inventing time-of-day.\n  time.applyWorldYear(state, narrativeCalendarTarget.eligible ? narrativeCalendarTarget.year : time.explicitWorldYear(input));''',
        f'{path}: lifecycle world year')

    text = replace_once(text,
        '''    narrativeProgressionReason: narrativeProgression.reason || 'none',\n    narrativeTimestampPrevious,\n    narrativeClockGuard,''',
        '''    narrativeProgressionReason: narrativeProgression.reason || 'none',\n    narrativeTimestampPrevious,\n    narrativeClockGuard,\n    narrativeCalendarTarget,''',
        f'{path}: pending calendar')

    text = replace_once(text,
        '''    lines.push(`narrative_progression_hint=${p.narrativeProgressionReason || 'forward'}`);\n    if (p.narrativeClockGuard && p.narrativeTimestampPrevious) {''',
        '''    lines.push(`narrative_progression_hint=${p.narrativeProgressionReason || 'forward'}`);\n    if (p.narrativeCalendarTarget?.eligible && p.narrativeCalendarTarget?.targetDate) {\n      lines.push(`narrative_calendar_target=${p.narrativeCalendarTarget.targetDate}`);\n      lines.push(`narrative_calendar_weekday=${p.narrativeCalendarTarget.weekday || 'unknown'}`);\n      lines.push('narrative_calendar_target_is_current_date=1;time_of_day_unspecified_by_calendar_target=1');\n    }\n    if (p.narrativeClockGuard && p.narrativeTimestampPrevious) {''',
        f'{path}: prompt calendar')

    final_anchor = '''  let narrativeFloor = null;\n  if (!/^B_/.test(String(p.mode || ''))) {\n    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(\n      finalText,\n      p.narrativeTimestampPrevious || state.narrativeTimestamp || null,\n    );\n    finalText = narrativeFloor.content;\n  }'''
    final_replacement = '''  let calendarRepair = null;\n  let sceneRolloverRepair = null;\n  let narrativeFloor = null;\n  if (!/^B_/.test(String(p.mode || ''))) {\n    calendarRepair = time.enforceNarrativeCalendarTarget(finalText, p.narrativeCalendarTarget || null);\n    finalText = calendarRepair.content;\n    sceneRolloverRepair = time.repairNarrativeYearRolloverSequence(finalText, p.narrativeCalendarTarget || null);\n    finalText = sceneRolloverRepair.content;\n    narrativeFloor = time.enforceNarrativeCurrentTimeFloor(\n      finalText,\n      p.narrativeTimestampPrevious || state.narrativeTimestamp || null,\n    );\n    finalText = narrativeFloor.content;\n  }'''
    text = replace_once(text, final_anchor, final_replacement, f'{path}: final calendar')

    text = replace_once(text,
        '''      trigger: p.narrativeProgressionReason || 'none',\n      previousAnchor: previousNarrative,''',
        '''      trigger: p.narrativeProgressionReason || 'none',\n      calendarEligible: !!p.narrativeCalendarTarget?.eligible,\n      calendarReason: p.narrativeCalendarTarget?.reason || 'INELIGIBLE',\n      calendarPreviousDate: p.narrativeCalendarTarget?.previousDate || null,\n      calendarTargetDate: p.narrativeCalendarTarget?.targetDate || null,\n      calendarWeekday: p.narrativeCalendarTarget?.weekday || null,\n      calendarObservedTimestamp: calendarRepair?.observedTimestamp || null,\n      calendarOutputTimestamp: calendarRepair?.outputTimestamp || null,\n      calendarFrameChanged: !!calendarRepair?.changed,\n      calendarDateChanged: !!calendarRepair?.dateChanged,\n      calendarWeekdayChanged: !!calendarRepair?.weekdayChanged,\n      sceneRolloverCount: Number(sceneRolloverRepair?.count || 0),\n      previousAnchor: previousNarrative,''',
        f'{path}: clock diagnostics')

    text = replace_once(text,
        '''      `RAW frame regression: ${frameProbe.regression}`,\n      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'CLAMPED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,''',
        '''      `RAW frame regression: ${frameProbe.regression}`,\n      `Continuity summary: ${probeFresh ? ((frameGuard?.applied || narrative?.calendarFrameChanged || Number(narrative?.sceneRolloverCount || 0) > 0 || narrative?.floorApplied) ? 'REPAIRED' : 'PASS') : 'n/a'}`,\n      `Calendar transition: ${probeFresh && narrative ? (narrative.calendarEligible ? `${narrative.calendarReason || 'RESOLVED'} · previous ${narrative.calendarPreviousDate || 'n/a'} · target ${narrative.calendarTargetDate || 'n/a'} · weekday ${narrative.calendarWeekday || 'n/a'}${narrative.calendarFrameChanged ? ' · FRAME_REPAIRED' : ''}${Number(narrative.sceneRolloverCount || 0) > 0 ? ` · scene-year repairs ${Number(narrative.sceneRolloverCount || 0)}` : ''}` : `INELIGIBLE · ${narrative.calendarReason || 'none'}`) : 'n/a'}`,\n      `Frame sequence: ${frameGuard ? `${frameGuard.sequenceStatus || (frameGuard.applied ? 'REPAIRED' : 'PASS')} · volume ${frameGuard.observed?.volume ?? 'n/a'}→${frameGuard.output?.volume ?? 'n/a'} expected ${frameGuard.expected?.volume ?? 'n/a'} · chapter ${frameGuard.observed?.chapter ?? 'n/a'}→${frameGuard.output?.chapter ?? 'n/a'} expected ${frameGuard.expected?.chapter ?? 'n/a'} · Chatindex ${frameGuard.observed?.chatindex ?? 'n/a'}→${frameGuard.output?.chatindex ?? 'n/a'} expected ${frameGuard.expected?.chatindex ?? 'n/a'}` : 'n/a'}`,\n      `Frame guard: ${frameGuard ? `${frameGuard.applied ? 'REPAIRED' : 'PASS'} · ${frameGuard.regression || 'NONE'}` : 'n/a'}`,''',
        f'{path}: continuity report')

    path.write_text(text, encoding='utf-8')
    print(f'patched {path}: {len(text)} chars')
