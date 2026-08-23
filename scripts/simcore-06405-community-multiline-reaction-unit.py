from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')

text = LATEST.read_text(encoding='utf-8')

expected = [
    '//@version 0.64.4',
    "const SIMCORE_RUNTIME_VERSION = '0.64.4';",
    '// v0.64.4 COMMUNITY Reaction Validator Attribution:',
    'function inspectCommentReactionLine(line)',
    'const commentLines = commentScope.split(/\\r?\\n/).filter((line) => /^\\s*(?:-\\s+|ㄴ\\s+)/.test(line));',
    'const inspection = reaction.inspectCommentReactionLine(line);',
    'REPRESENTATION_FAST_RECONCILED',
    'USER_EDIT_CANDIDATE',
    'MANUAL_EDIT_REBUILT',
]
for marker in expected:
    if marker not in text:
        raise SystemExit(f'missing expected v0.64.4 marker: {marker}')

if '// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:' in text:
    raise SystemExit('v0.64.5 release note already present')
if 'function commentUnits(commentScope)' in text:
    raise SystemExit('Community logical-unit helper already present')

release_note = """// v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair:
// - Follows v0.64.4 natural B_CONTINUE/B_END evidence where bilingual X(EN) comments repeatedly attributed missing 5: each logical comment/reply had its valid [RT N] tag on a translation continuation line while Structure inspected only the physical starter line
// - Adds Community.commentUnits() as a pure structural grouping helper and makes Structure inspect each complete logical comment/reply unit; 4-top + 1-reply cardinality checks remain byte-equivalent and Structure stays judge-only
// - Reuses the existing Reaction grammar and inspectCommentReactionLine() unchanged: one valid tag at logical-unit end passes, while missing, multiple, and visible trailing content continue to fail
// - Adds no output repair, reaction synthesis, grammar tolerance, normalization change, Broadcast/Time/Frame semantic change, persistent state, host/storage/network/timer call, or Edit Reconcile ownership movement
// - Preserves the v0.64.4 bounded warning attribution fields so future malformed units remain diagnosable without retaining raw comment text
//
"""

text = text.replace('//@version 0.64.4', '//@version 0.64.5', 1)
text = text.replace("const SIMCORE_RUNTIME_VERSION = '0.64.4';", "const SIMCORE_RUNTIME_VERSION = '0.64.5';", 1)
text = text.replace('// v0.64.4 COMMUNITY Reaction Validator Attribution:', release_note + '// v0.64.4 COMMUNITY Reaction Validator Attribution:', 1)

community_anchor = """function sectionCommunityParts(section) {
  const text = String(section || '');
  const titleMatch = text.match(/^\\s*제목\\s*[:：]\\s*(\\S.*)$/m);
  const markers = [...text.matchAll(/^\\s*\\[베댓\\]\\s*$/gm)];
  let body = '';
  let commentsStart = -1;
  if (titleMatch && markers.length === 1) {
    const marker = markers[0];
    const titleEnd = titleMatch.index + titleMatch[0].length;
    body = text.slice(titleEnd, marker.index).trim();
    body = body.replace(/^내용\\s*[:：]\\s*/i, '').trim();
    commentsStart = marker.index + marker[0].length;
  }
  return {
    text,
    titleMatch,
    markerCount: markers.length,
    body,
    commentsStart,
    comments: commentsStart >= 0 ? text.slice(commentsStart) : text,
  };
}


module.exports = {"""
community_replacement = """function sectionCommunityParts(section) {
  const text = String(section || '');
  const titleMatch = text.match(/^\\s*제목\\s*[:：]\\s*(\\S.*)$/m);
  const markers = [...text.matchAll(/^\\s*\\[베댓\\]\\s*$/gm)];
  let body = '';
  let commentsStart = -1;
  if (titleMatch && markers.length === 1) {
    const marker = markers[0];
    const titleEnd = titleMatch.index + titleMatch[0].length;
    body = text.slice(titleEnd, marker.index).trim();
    body = body.replace(/^내용\\s*[:：]\\s*/i, '').trim();
    commentsStart = marker.index + marker[0].length;
  }
  return {
    text,
    titleMatch,
    markerCount: markers.length,
    body,
    commentsStart,
    comments: commentsStart >= 0 ? text.slice(commentsStart) : text,
  };
}

function commentUnits(commentScope) {
  const lines = String(commentScope || '').split(/\\r?\\n/);
  const units = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    units.push({ kind: current.kind, text: current.lines.join('\\n') });
    current = null;
  };

  for (const line of lines) {
    const top = /^\\s*-\\s+/.test(line);
    const reply = !top && /^\\s*ㄴ\\s+/.test(line);
    if (top || reply) {
      flush();
      current = { kind: top ? 'TOP' : 'REPLY', lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return units;
}


module.exports = {"""
if text.count(community_anchor) != 1:
    raise SystemExit(f'unexpected Community insertion anchor count: {text.count(community_anchor)}')
text = text.replace(community_anchor, community_replacement, 1)

export_anchor = """  splitCommunity,
  sectionHeader,
  sectionCommunityParts,
};"""
export_replacement = """  splitCommunity,
  sectionHeader,
  sectionCommunityParts,
  commentUnits,
};"""
if text.count(export_anchor) != 1:
    raise SystemExit(f'unexpected Community export anchor count: {text.count(export_anchor)}')
text = text.replace(export_anchor, export_replacement, 1)

old_structure = """      const commentLines = commentScope.split(/\\r?\\n/).filter((line) => /^\\s*(?:-\\s+|ㄴ\\s+)/.test(line));
      let reactionLineErrors = 0;"""
new_structure = """      const commentUnits = community.commentUnits(commentScope);
      let reactionLineErrors = 0;"""
if text.count(old_structure) != 1:
    raise SystemExit(f'unexpected Structure comment-line framing count: {text.count(old_structure)}')
text = text.replace(old_structure, new_structure, 1)

old_loop = """      for (const line of commentLines) {
        const inspection = reaction.inspectCommentReactionLine(line);"""
new_loop = """      for (const unit of commentUnits) {
        const inspection = reaction.inspectCommentReactionLine(unit.text);"""
if text.count(old_loop) != 1:
    raise SystemExit(f'unexpected Structure inspection loop count: {text.count(old_loop)}')
text = text.replace(old_loop, new_loop, 1)

if text.count('function commentUnits(commentScope)') != 1:
    raise SystemExit('Community logical-unit helper count is not exactly one')
if text.count('  commentUnits,') != 1:
    raise SystemExit('Community logical-unit export count is not exactly one')
if text.count('community.commentUnits(commentScope)') != 1:
    raise SystemExit('Structure logical-unit consumer count is not exactly one')
if 'reaction.inspectCommentReactionLine(line)' in text:
    raise SystemExit('legacy physical-line Reaction inspection still present')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('SimCore v0.64.5 multiline reaction-unit patch applied')
