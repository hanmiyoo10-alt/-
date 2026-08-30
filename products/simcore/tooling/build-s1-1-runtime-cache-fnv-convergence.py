#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.70.1'
TARGET_VERSION = '0.70.3'
RELEASE_NAME = 'Runtime Cache Hash Primitive Convergence'

RELEASE_NOTE = '''// v0.70.3 Runtime Cache Hash Primitive Convergence:\n// - Converges the three complete-string FNV-1a 32-bit loops inside runtime-cache onto one private local fnv1a32 helper\n// - Keeps both rolling-prefix FNV loops byte-for-byte unchanged and does not create a runtime-cache -> runtime-topology dependency\n// - Adds no export, require edge, await/yield, timer, storage/network/chat I/O, persistent state/schema or prompt/output semantic change\n// - Preserves v0.70.1 cold-tail attribution, v0.70.0 Current Task Primacy Guard, COMMUNITY_CLASSIFIER_VERSION 3 and the frozen M2-6 architecture graph\n//\n'''

OLD_CACHE_HASH = '''function cacheHash(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return (h >>> 0).toString(16).padStart(8, '0');\n}'''

NEW_CACHE_HASH = '''function fnv1a32(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return h >>> 0;\n}\n\nfunction cacheHash(text) {\n  return fnv1a32(text).toString(16).padStart(8, '0');\n}'''

OLD_LINE_HASHES = '''  const lineHashes = lines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_LINE_HASHES = '''  const lineHashes = lines.map(fnv1a32);'''

OLD_CURRENT_LINE_HASHES = '''  const currentLineHashes = currentLines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_CURRENT_LINE_HASHES = '''  const currentLineHashes = currentLines.map(fnv1a32);'''

ROLLING_PREFIX_1 = '''  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n    prefixHashes[i] = h >>> 0;\n  }'''

ROLLING_PREFIX_2 = '''  let h = 0x811c9dc5;\n  let prefixChars = 0;\n  for (let i = 0; i < limit; i++) {\n    h ^= current.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n    if ((h >>> 0) !== Number(sketch.prefixHashes[i])) break;\n    prefixChars = i + 1;\n  }'''

EXPORTS = 'module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };'


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('S1_1_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('S1_1_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    start, end = module_bounds(text, name)
    return text[start:end]


def verify_reference_equivalence():
    script = r'''
function oldF(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function nextF(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function hex(h) { return h.toString(16).padStart(8, '0'); }
const samples = [
  null,
  undefined,
  '',
  'abc',
  'SimCore runtime cache',
  '한글 테스트',
  'line1\nline2\nline3',
  'line1\r\nline2',
  'emoji 😀 rocket 🚀',
  ('가😀\n').repeat(4096),
];
for (const sample of samples) {
  const a = oldF(sample), b = nextF(sample);
  if (a !== b || hex(a) !== hex(b)) throw new Error('FNV_DIFF');
}
const multi = 'alpha\n한글\n😀\n\nlast';
const lines = multi.split('\n');
const oldLines = lines.map((line) => oldF(line));
const nextLines = lines.map(nextF);
if (JSON.stringify(oldLines) !== JSON.stringify(nextLines)) throw new Error('LINE_HASH_DIFF');
console.log('S1_1_FNV_REFERENCE_EQUIVALENCE_PASS');
'''
    result = subprocess.run(['node', '-e', script], text=True, capture_output=True)
    if result.returncode != 0 or 'S1_1_FNV_REFERENCE_EQUIVALENCE_PASS' not in result.stdout:
        fail('S1_1_FNV_REFERENCE_EQUIVALENCE_FAIL', (result.stderr or result.stdout).strip())


def patch(text):
    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    text = one(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", 'runtime-version')
    text = one(text, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", 'host-compat-version')
    text = one(text, '// v0.70.1 Cold First-Turn Tail Attribution:', RELEASE_NOTE + '// v0.70.1 Cold First-Turn Tail Attribution:', 'release-note')

    text = one(text, OLD_CACHE_HASH, NEW_CACHE_HASH, 'cache-hash')
    text = one(text, OLD_LINE_HASHES, NEW_LINE_HASHES, 'sketch-line-hashes')
    text = one(text, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, 'current-line-hashes')
    text = one(
        text,
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',",
        'operator-card-identity',
    )
    return text


def verify(before, after):
    identities = [
        re.search(r'^//@version\s+([^\s]+)\s*$', after, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", after),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", after),
    ]
    values = [m.group(1) if m else None for m in identities]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('S1_1_RUNTIME_IDENTITY_SPLIT', repr(values))

    if after.count("version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',") != 1:
        fail('S1_1_OPERATOR_CARD_IDENTITY_INVALID')

    for name in ('prompt', 'community', 'runtime-topology', 'runtime-session', 'state-reconcile', 'representation', 'edit-reconcile', 'runtime-mirror'):
        if module_text(after, name) != module_text(before, name):
            fail('S1_1_FROZEN_MODULE_CHANGED', name)

    before_cache = module_text(before, 'runtime-cache')
    after_cache = module_text(after, 'runtime-cache')
    if before_cache.count('0x811c9dc5') != 5 or before_cache.count('0x01000193') != 5:
        fail('S1_1_PARENT_FNV_SHAPE_UNEXPECTED')
    if after_cache.count('0x811c9dc5') != 3 or after_cache.count('0x01000193') != 3:
        fail('S1_1_CANDIDATE_FNV_SHAPE_INVALID')
    if after_cache.count('function fnv1a32(text)') != 1:
        fail('S1_1_FNV_HELPER_COUNT_INVALID')
    if after_cache.count('lines.map(fnv1a32)') != 1 or after_cache.count('currentLines.map(fnv1a32)') != 1:
        fail('S1_1_LINE_HASH_DELEGATION_INVALID')
    if after_cache.count(ROLLING_PREFIX_1) != 1 or after_cache.count(ROLLING_PREFIX_2) != 1:
        fail('S1_1_ROLLING_PREFIX_CHANGED')
    if before_cache.count(EXPORTS) != 1 or after_cache.count(EXPORTS) != 1:
        fail('S1_1_EXPORT_SURFACE_CHANGED')

    require_before = re.findall(r"require\(['\"]([^'\"]+)['\"]\)", before_cache)
    require_after = re.findall(r"require\(['\"]([^'\"]+)['\"]\)", after_cache)
    if require_before != require_after:
        fail('S1_1_REQUIRE_SURFACE_CHANGED', f'{require_before!r} -> {require_after!r}')

    protected_markers = (
        'const PROMPT_COMPILER_VERSION = 4;',
        'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
        'TAIL_AFTER_CURRENT_USER',
        'provider cache UNVERIFIED',
        'Post-onSend attribution:',
    )
    for marker in protected_markers:
        if before.count(marker) != after.count(marker):
            fail('S1_1_PROTECTED_MARKER_CHANGED', marker)

    side_effect_markers = (
        'await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest',
        'history.splice(', 'messages.splice(',
    )
    for marker in side_effect_markers:
        if before.count(marker) != after.count(marker):
            fail('S1_1_SIDE_EFFECT_SURFACE_CHANGED', f'{marker}: {before.count(marker)} -> {after.count(marker)}')

    if after.count("messages.push({ role: 'system', content: result.promptBlock });") != before.count("messages.push({ role: 'system', content: result.promptBlock });"):
        fail('S1_1_REQUEST_MESSAGE_ORDER_MARKER_CHANGED')

    verify_reference_equivalence()


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('S1_1_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('S1_1_PARENT_LATEST_INSTALL_DIVERGED')
    if originals[0].count(f'//@version {FROM_VERSION}') != 1:
        fail('S1_1_PARENT_VERSION_MISMATCH')

    candidate = patch(originals[0])
    verify(originals[0], candidate)
    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('S1_1_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('S1_1_BUILD_PASS')


if __name__ == '__main__':
    main()
