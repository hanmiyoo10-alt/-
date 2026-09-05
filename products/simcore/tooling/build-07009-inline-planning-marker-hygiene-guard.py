#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
LATEST = ROOT / 'plugins' / 'simcore' / 'latest.js'
INSTALL = ROOT / 'plugins' / 'simcore' / 'install.js'

RELEASE_NOTE = """// v0.70.9 Inline Planning Marker Hygiene Guard:
// - Removes only the reserved standalone INLINE_INTERNAL_MEMO_V1 planning-control line outside Markdown fenced code before output envelope canonicalization
// - Preserves prose, inline/quoted/fenced examples, malformed or wrong-key markers, empty payloads and payloads over 512 UTF-16 code units
// - Emits bounded non-payload Output Compat provenance with marker count and removed-character count when cleanup occurs
// - Adds no Host read, storage/network/timer work, persistent schema, raw-body retention, retry, polling, or release-system change
//
"""

INLINE_HELPER = r'''const INLINE_PLANNING_GRAMMAR = 'INLINE_INTERNAL_MEMO_V1';

function parseMarkdownFenceLine(line) {
  const text = String(line || '').replace(/^[ \t]+/, '');
  const char = text[0];
  if (char !== '`' && char !== '~') return null;
  let length = 0;
  while (text[length] === char) length += 1;
  if (length < 3) return null;
  return { char, length, rest: text.slice(length) };
}

function isInlinePlanningMarkerLine(line) {
  const outer = String(line || '').replace(/^[ \t]+|[ \t]+$/g, '');
  if (!outer.startsWith('┣') || !outer.endsWith('┫')) return false;
  const inner = outer.slice(1, -1);
  if (inner.includes('┫')) return false;
  const match = /^[ \t]*internal_memo:[ \t]*(.*?)[ \t]*$/.exec(inner);
  if (!match) return false;
  const payload = String(match[1] || '').replace(/^[ \t]+|[ \t]+$/g, '');
  return !!payload && payload.length <= 512 && !/[\r\n┫]/.test(payload);
}

function stripBoundedInlinePlanningMarkers(content) {
  const raw = String(content || '');
  const lines = raw.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) || [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const kept = [];
  let fence = null;
  let markers = 0;
  let removedChars = 0;

  for (const physical of lines) {
    const ending = /(?:\r\n|\r|\n)$/.exec(physical)?.[0] || '';
    const line = ending ? physical.slice(0, -ending.length) : physical;
    const token = parseMarkdownFenceLine(line);

    if (fence) {
      kept.push(physical);
      if (token
          && token.char === fence.char
          && token.length >= fence.length
          && /^[ \t]*$/.test(token.rest)) fence = null;
      continue;
    }

    if (token) {
      fence = { char: token.char, length: token.length };
      kept.push(physical);
      continue;
    }

    if (isInlinePlanningMarkerLine(line)) {
      markers += 1;
      removedChars += physical.length;
      continue;
    }
    kept.push(physical);
  }

  return Object.freeze({
    content: kept.join(''),
    markers,
    removedChars,
    grammar: INLINE_PLANNING_GRAMMAR,
  });
}

function inlinePlanningDiagnostic(provenance) {
  return `Inline planning compat = STRIPPED · Grammar = ${provenance.grammar} · Markers = ${provenance.markers} · Removed chars = ${provenance.removedChars} · Raw payload = NOT RETAINED`;
}

'''

OLD_PREPARE = """function prepareOutput(content, pending) {
  let text = kernel.stripControlTags(content);
  const envelope = canonicalizeResponseEnvelope(text, pending);
  text = normalizeTailPlacement(envelope.content, pending);
  return { content: text, envelope };
}"""

NEW_PREPARE = """function prepareOutput(content, pending) {
  let text = kernel.stripControlTags(content);
  const inlinePlanning = stripBoundedInlinePlanningMarkers(text);
  text = inlinePlanning.content;
  const envelope = canonicalizeResponseEnvelope(text, pending);
  if (inlinePlanning.markers > 0) {
    const diagnostics = Array.isArray(envelope.diagnostics) ? envelope.diagnostics : [];
    envelope.diagnostics = diagnostics.concat(inlinePlanningDiagnostic(inlinePlanning));
    envelope.inlinePlanningProvenance = Object.freeze({
      status: 'STRIPPED',
      grammar: inlinePlanning.grammar,
      markers: inlinePlanning.markers,
      removedChars: inlinePlanning.removedChars,
      rawPayload: 'NOT_RETAINED',
    });
  }
  text = normalizeTailPlacement(envelope.content, pending);
  return { content: text, envelope };
}"""


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'07009_BUILD_BLOCK {label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def module_names(text: str):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text: str, name: str) -> str:
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        raise SystemExit(f'07009_BUILD_BLOCK module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(token))
    return text[start:nxt if nxt >= 0 else len(text)]


def require_lines(text: str, name: str):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", module_text(text, name), re.M)


def count(text: str, marker: str) -> int:
    return text.count(marker)


source = LATEST.read_text(encoding='utf-8')
install_source = INSTALL.read_text(encoding='utf-8')
if source != install_source:
    raise SystemExit('07009_BUILD_BLOCK predecessor latest/install differ')
if not re.search(r'^//@version\s+0\.70\.8\s*$', source, re.M):
    raise SystemExit('07009_BUILD_BLOCK predecessor metadata is not 0.70.8')
if "const SIMCORE_RUNTIME_VERSION = '0.70.8';" not in source:
    raise SystemExit('07009_BUILD_BLOCK predecessor runtime identity missing')
if "const HOST_COMPAT_VERSION = '0.70.8';" not in source:
    raise SystemExit('07009_BUILD_BLOCK predecessor host identity missing')
if "version: '0.70.8',\n    name: 'Repeat-Send Representation Rewind Guard'," not in source:
    raise SystemExit('07009_BUILD_BLOCK predecessor release-card identity missing')
if source.count('// v0.70.8 Repeat-Send Representation Rewind Guard:') != 1:
    raise SystemExit('07009_BUILD_BLOCK predecessor release-note identity missing')
if source.count(OLD_PREPARE) != 1:
    raise SystemExit('07009_BUILD_BLOCK Output Compat prepareOutput anchor missing or ambiguous')

before_modules = module_names(source)
before_requires = {name: require_lines(source, name) for name in before_modules}
protected_markers = [
    'JSON.stringify(state)',
    'await this.b.set(',
    'pluginStorage',
    'setChat(',
    'fetch(',
    'XMLHttpRequest',
    'setTimeout(',
    'setInterval(',
    'history.splice(',
    'messages.splice(',
    'const PROMPT_COMPILER_VERSION = 4;',
    'const COMMUNITY_CLASSIFIER_VERSION = 3;',
    'const STATE_VERSION = 5;',
    'const CORE_STATE_VERSION = 10;',
    "['OUT_STORAGE', n(detail.outSetMs)]",
    'fresh-exact-repeat-send-rewind',
]
before_counts = {marker: count(source, marker) for marker in protected_markers}

out = source
out = one(out, '//@version 0.70.8', '//@version 0.70.9', 'metadata version')
out = one(out, "const SIMCORE_RUNTIME_VERSION = '0.70.8';", "const SIMCORE_RUNTIME_VERSION = '0.70.9';", 'runtime version')
out = one(out, "const HOST_COMPAT_VERSION = '0.70.8';", "const HOST_COMPAT_VERSION = '0.70.9';", 'host compatibility version')
out = one(
    out,
    '// v0.70.8 Repeat-Send Representation Rewind Guard:\n',
    RELEASE_NOTE + '// v0.70.8 Repeat-Send Representation Rewind Guard:\n',
    'release-note source identity',
)
out = one(
    out,
    "version: '0.70.8',\n    name: 'Repeat-Send Representation Rewind Guard',",
    "version: '0.70.9',\n    name: 'Inline Planning Marker Hygiene Guard',",
    'operator release-card identity',
)
out = one(out, OLD_PREPARE, INLINE_HELPER + NEW_PREPARE, 'Output Compat bounded inline planning hygiene')

if module_names(out) != before_modules:
    raise SystemExit('07009_BUILD_BLOCK module inventory/order changed')
for name in before_modules:
    if require_lines(out, name) != before_requires[name]:
        raise SystemExit(f'07009_BUILD_BLOCK require graph changed: {name}')
for marker, expected in before_counts.items():
    actual = count(out, marker)
    if actual != expected:
        raise SystemExit(f'07009_BUILD_BLOCK protected marker changed {marker}: {expected} -> {actual}')

required = {
    '// v0.70.9 Inline Planning Marker Hygiene Guard:': 1,
    "const INLINE_PLANNING_GRAMMAR = 'INLINE_INTERNAL_MEMO_V1';": 1,
    'function stripBoundedInlinePlanningMarkers(content)': 1,
    'function isInlinePlanningMarkerLine(line)': 1,
    'function parseMarkdownFenceLine(line)': 1,
    'function inlinePlanningDiagnostic(provenance)': 1,
    'Inline planning compat = STRIPPED': 1,
    "rawPayload: 'NOT_RETAINED'": 1,
    'payload.length <= 512': 1,
}
for marker, expected in required.items():
    actual = count(out, marker)
    if actual != expected:
        raise SystemExit(f'07009_BUILD_BLOCK required marker cardinality {marker}: expected {expected}, found {actual}')

if 'const inlinePlanning = stripBoundedInlinePlanningMarkers(text);\n  text = inlinePlanning.content;\n  const envelope = canonicalizeResponseEnvelope(text, pending);' not in out:
    raise SystemExit('07009_BUILD_BLOCK hygiene sequencing missing')
if "char !== '`' && char !== '~'" not in out:
    raise SystemExit('07009_BUILD_BLOCK fence character guard missing')
if 'token.length >= fence.length' not in out:
    raise SystemExit('07009_BUILD_BLOCK fence close length guard missing')
if "const match = /^[ \\t]*internal_memo:" not in out:
    raise SystemExit('07009_BUILD_BLOCK exact internal_memo grammar missing')
if 'inner.includes(\'┫\')' not in out:
    raise SystemExit('07009_BUILD_BLOCK embedded right delimiter guard missing')

LATEST.write_text(out, encoding='utf-8')
INSTALL.write_text(out, encoding='utf-8')
print('07009_BUILD_PASS')
