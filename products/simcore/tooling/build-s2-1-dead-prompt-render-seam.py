#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.70.1'
TARGET_VERSION = '0.70.3'

S1_RELEASE_NOTE = '''// v0.70.3 Runtime Cache Hash Primitive Convergence:\n// - Converges the three complete-string FNV-1a 32-bit loops inside runtime-cache onto one private local fnv1a32 helper\n// - Keeps both rolling-prefix FNV loops byte-for-byte unchanged and does not create a runtime-cache -> runtime-topology dependency\n// - Adds no export, require edge, await/yield, timer, storage/network/chat I/O, persistent state/schema or prompt/output semantic change\n// - Preserves v0.70.1 cold-tail attribution, v0.70.0 Current Task Primacy Guard, COMMUNITY_CLASSIFIER_VERSION 3 and the frozen M2-6 architecture graph\n//\n'''

OLD_CACHE_HASH = '''function cacheHash(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return (h >>> 0).toString(16).padStart(8, '0');\n}'''
NEW_CACHE_HASH = '''function fnv1a32(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return h >>> 0;\n}\n\nfunction cacheHash(text) {\n  return fnv1a32(text).toString(16).padStart(8, '0');\n}'''
OLD_LINE_HASHES = '''  const lineHashes = lines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_LINE_HASHES = '''  const lineHashes = lines.map(fnv1a32);'''
OLD_CURRENT_LINE_HASHES = '''  const currentLineHashes = currentLines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_CURRENT_LINE_HASHES = '''  const currentLineHashes = currentLines.map(fnv1a32);'''
ROLLING_PREFIX_1 = '''  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n    prefixHashes[i] = h >>> 0;\n  }'''
ROLLING_PREFIX_2 = '''  let h = 0x811c9dc5;\n  let prefixChars = 0;\n  for (let i = 0; i < limit; i++) {\n    h ^= current.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n    if ((h >>> 0) !== Number(sketch.prefixHashes[i])) break;\n    prefixChars = i + 1;\n  }'''
CACHE_EXPORTS = 'module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };'

OLD_PROMPT_TAIL = '''function compileRuntimePrompt(state) {\n  return compileRuntimePromptParts(state).text;\n}\n\nfunction renderRuntimePrompt(state) {\n  return compileRuntimePrompt(state);\n}\n\nmodule.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };'''
NEW_PROMPT_TAIL = '''module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts };'''
SESSION_RENDER_ALIAS = '''const renderRuntimePrompt = prompt.renderRuntimePrompt;\n'''
SESSION_RENDER_EXPORT = '''  renderRuntimePrompt,\n'''
SESSION_PARTS_ALIAS = 'const compileRuntimePromptParts = prompt.compileRuntimePromptParts;'
SESSION_PARTS_CALL = '    const promptCompiled = compileRuntimePromptParts(state);'


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('S2_1_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('S2_1_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    start, end = module_bounds(text, name)
    return text[start:end]


def require_surface(module_source):
    return re.findall(r"require\(['\"]([^'\"]+)['\"]\)", module_source)


def reference_fnv_equivalence():
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
const samples = [null, undefined, '', 'abc', '한글 테스트', 'line1\nline2', 'line1\r\nline2', 'emoji 😀 🚀', ('가😀\n').repeat(4096)];
for (const sample of samples) if (oldF(sample) !== nextF(sample)) throw new Error('FNV_DIFF');
const lines = 'alpha\n한글\n😀\n\nlast'.split('\n');
if (JSON.stringify(lines.map(oldF)) !== JSON.stringify(lines.map(nextF))) throw new Error('LINE_HASH_DIFF');
console.log('S1_EQ_PASS');
'''
    result = subprocess.run(['node', '-e', script], text=True, capture_output=True)
    if result.returncode != 0 or 'S1_EQ_PASS' not in result.stdout:
        fail('S2_1_S1_FNV_EQUIVALENCE_FAIL', (result.stderr or result.stdout).strip())


def apply_s1(text):
    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 's1-metadata-version')
    text = one(text, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", 's1-runtime-version')
    text = one(text, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", 's1-host-compat-version')
    text = one(text, '// v0.70.1 Cold First-Turn Tail Attribution:', S1_RELEASE_NOTE + '// v0.70.1 Cold First-Turn Tail Attribution:', 's1-release-note')
    text = one(text, OLD_CACHE_HASH, NEW_CACHE_HASH, 's1-cache-hash')
    text = one(text, OLD_LINE_HASHES, NEW_LINE_HASHES, 's1-sketch-line-hashes')
    text = one(text, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, 's1-current-line-hashes')
    text = one(
        text,
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',",
        's1-operator-card-identity',
    )
    return text


def verify_s1(parent, s1):
    cache_before = module_text(parent, 'runtime-cache')
    cache_after = module_text(s1, 'runtime-cache')
    if cache_before.count('0x811c9dc5') != 5 or cache_after.count('0x811c9dc5') != 3:
        fail('S2_1_S1_FNV_SHAPE_INVALID')
    if cache_before.count('0x01000193') != 5 or cache_after.count('0x01000193') != 3:
        fail('S2_1_S1_FNV_PRIME_SHAPE_INVALID')
    if cache_after.count('function fnv1a32(text)') != 1:
        fail('S2_1_S1_FNV_HELPER_INVALID')
    if cache_after.count('lines.map(fnv1a32)') != 1 or cache_after.count('currentLines.map(fnv1a32)') != 1:
        fail('S2_1_S1_LINE_HASH_DELEGATION_INVALID')
    if cache_after.count(ROLLING_PREFIX_1) != 1 or cache_after.count(ROLLING_PREFIX_2) != 1:
        fail('S2_1_S1_ROLLING_PREFIX_CHANGED')
    if cache_before.count(CACHE_EXPORTS) != 1 or cache_after.count(CACHE_EXPORTS) != 1:
        fail('S2_1_S1_CACHE_EXPORTS_CHANGED')
    if require_surface(cache_before) != require_surface(cache_after):
        fail('S2_1_S1_CACHE_REQUIRES_CHANGED')
    for name in ('prompt', 'community', 'runtime-topology', 'runtime-session', 'state-reconcile', 'representation', 'edit-reconcile', 'runtime-mirror'):
        if module_text(parent, name) != module_text(s1, name):
            fail('S2_1_S1_FROZEN_MODULE_CHANGED', name)
    reference_fnv_equivalence()


def apply_s2(s1):
    out = one(s1, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, 's2-prompt-dead-full-text-chain')
    out = one(out, SESSION_RENDER_ALIAS, '', 's2-session-render-alias')
    out = one(out, SESSION_RENDER_EXPORT, '', 's2-session-render-export')
    return out


def verify_s2(s1, candidate):
    if s1.count('function compileRuntimePrompt(state)') != 1 or s1.count('function renderRuntimePrompt(state)') != 1:
        fail('S2_1_PARENT_PROMPT_COMPAT_SHAPE_INVALID')
    if s1.count(SESSION_RENDER_ALIAS) != 1 or s1.count(SESSION_RENDER_EXPORT) != 1:
        fail('S2_1_PARENT_SESSION_COMPAT_SHAPE_INVALID')
    for marker in ('function compileRuntimePrompt(state)', 'function renderRuntimePrompt(state)', SESSION_RENDER_ALIAS, SESSION_RENDER_EXPORT):
        if marker in candidate:
            fail('S2_1_DEAD_SEAM_SURVIVED', marker.strip())

    before_prompt = module_text(s1, 'prompt')
    after_prompt = module_text(candidate, 'prompt')
    before_session = module_text(s1, 'session')
    after_session = module_text(candidate, 'session')

    parts_start = before_prompt.index('function compileRuntimePromptParts(state) {')
    parts_end = before_prompt.index('\nfunction compileRuntimePrompt(state)', parts_start)
    exact_parts = before_prompt[parts_start:parts_end]
    if exact_parts not in after_prompt:
        fail('S2_1_LIVE_PROMPT_COMPILER_CHANGED')
    if after_prompt.count(NEW_PROMPT_TAIL) != 1:
        fail('S2_1_PROMPT_EXPORT_SURFACE_INVALID')
    if after_session.count(SESSION_PARTS_ALIAS) != 1 or after_session.count(SESSION_PARTS_CALL) != 1:
        fail('S2_1_LIVE_SESSION_PROMPT_PATH_CHANGED')
    if require_surface(before_prompt) != require_surface(after_prompt) or require_surface(before_session) != require_surface(after_session):
        fail('S2_1_REQUIRE_SURFACE_CHANGED')

    for name in (
        'community', 'runtime-cache', 'runtime-topology', 'runtime-cache-candidates',
        'runtime-telemetry', 'runtime-session', 'runtime-mirror', 'state-reconcile',
        'representation', 'edit-reconcile', 'output-compat', 'output-finalize',
    ):
        if module_text(s1, name) != module_text(candidate, name):
            fail('S2_1_FROZEN_MODULE_CHANGED', name)

    protected = (
        'const PROMPT_COMPILER_VERSION = 4;', 'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;', 'const CORE_STATE_VERSION = 10;',
        'TAIL_AFTER_CURRENT_USER', 'provider cache UNVERIFIED', 'Post-onSend attribution:',
    )
    for marker in protected:
        if s1.count(marker) != candidate.count(marker):
            fail('S2_1_PROTECTED_MARKER_CHANGED', marker)

    side_effects = (
        'await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(',
        'XMLHttpRequest', 'history.splice(', 'messages.splice(',
        "messages.push({ role: 'system', content: result.promptBlock });",
    )
    for marker in side_effects:
        if s1.count(marker) != candidate.count(marker):
            fail('S2_1_SIDE_EFFECT_SURFACE_CHANGED', f'{marker}: {s1.count(marker)} -> {candidate.count(marker)}')


def verify_identity(text):
    metadata = re.search(r'^//@version\s+([^\s]+)\s*$', text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [x.group(1) if x else None for x in (metadata, runtime, host)]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('S2_1_CUMULATIVE_IDENTITY_INVALID', repr(values))


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('S2_1_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('S2_1_PARENT_LATEST_INSTALL_DIVERGED')
    if originals[0].count(f'//@version {FROM_VERSION}') != 1:
        fail('S2_1_PARENT_VERSION_MISMATCH')

    s1 = apply_s1(originals[0])
    verify_s1(originals[0], s1)
    candidate = apply_s2(s1)
    verify_s2(s1, candidate)
    verify_identity(candidate)

    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('S2_1_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('S2_1_BUILD_PASS')


if __name__ == '__main__':
    main()
