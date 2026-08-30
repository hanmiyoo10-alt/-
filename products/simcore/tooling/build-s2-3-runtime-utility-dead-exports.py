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
CACHE_EXPORTS_P0_P3 = 'module.exports = { promptChangeReason, buildRuntimePromptCacheProbe, runtimeLineTier, runtimeIdentity, createRuntimePromptCacheTracker };'
CACHE_EXPORTS_P4 = 'module.exports = { createRuntimePromptCacheTracker };'

OLD_PROMPT_TAIL = '''function compileRuntimePrompt(state) {\n  return compileRuntimePromptParts(state).text;\n}\n\nfunction renderRuntimePrompt(state) {\n  return compileRuntimePrompt(state);\n}\n\nmodule.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };'''
NEW_PROMPT_TAIL = '''module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts };'''
S2_1_SESSION_ALIAS = 'const renderRuntimePrompt = prompt.renderRuntimePrompt;\n'
S2_1_SESSION_EXPORT = '  renderRuntimePrompt,\n'
SESSION_PARTS_ALIAS = 'const compileRuntimePromptParts = prompt.compileRuntimePromptParts;'
SESSION_PARTS_CALL = '    const promptCompiled = compileRuntimePromptParts(state);'

S2_2_EXPORTS = (
    '  inspectPreviousBEndOutput,\n',
    '  validateStructure: structure.validateStructure,\n',
    '  communityBlocks: community.communityBlocks,\n',
    '  prepareTurn: lifecycle.prepareTurn,\n',
)

TOPO_EXPORTS_P0_P3 = 'module.exports = { exactHash, messageSignature, leadingSystemCount, breakAttribution, createRequestTopologyTracker };'
TOPO_EXPORTS_P4 = 'module.exports = { messageSignature, breakAttribution, createRequestTopologyTracker };'

SIDE_EFFECT_MARKERS = (
    'await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(',
    'XMLHttpRequest', 'history.splice(', 'messages.splice(',
    "messages.push({ role: 'system', content: result.promptBlock });",
)


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('S2_3_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('S2_3_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    start, end = module_bounds(text, name)
    return text[start:end]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)", function \(require, module, exports\) \{', text)


def require_surface(module_source):
    return re.findall(r"require\(['\"]([^'\"]+)['\"]\)", module_source)


def verify_side_effect_counts(before, after, stage):
    for marker in SIDE_EFFECT_MARKERS:
        if before.count(marker) != after.count(marker):
            fail(f'{stage}_SIDE_EFFECT_SURFACE_CHANGED', f'{marker}: {before.count(marker)} -> {after.count(marker)}')


def reference_fnv_equivalence():
    script = r'''
function oldRaw(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function fnv1a32(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const samples = [null, undefined, '', 'abc', '한글 테스트', 'line1\nline2', 'line1\r\nline2', 'emoji 😀 🚀', ('가😀\n').repeat(4096)];
for (const sample of samples) {
  const oldValue = oldRaw(sample);
  if (oldValue !== fnv1a32(sample)) throw new Error('FNV_RAW_DIFF');
  if (oldValue.toString(16).padStart(8, '0') !== fnv1a32(sample).toString(16).padStart(8, '0')) throw new Error('FNV_FORMAT_DIFF');
}
const lines = 'alpha\n한글\n😀\n\nlast'.split('\n');
if (JSON.stringify(lines.map(oldRaw)) !== JSON.stringify(lines.map(fnv1a32))) throw new Error('LINE_HASH_DIFF');
console.log('S2_3_FNV_EQ_PASS');
'''
    result = subprocess.run(['node', '-e', script], text=True, capture_output=True)
    if result.returncode != 0 or 'S2_3_FNV_EQ_PASS' not in result.stdout:
        fail('S2_3_S1_FNV_EQUIVALENCE_FAIL', (result.stderr or result.stdout).strip())


def apply_s1(p0):
    out = one(p0, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 's1-metadata-version')
    out = one(out, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", 's1-runtime-version')
    out = one(out, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", 's1-host-compat-version')
    out = one(out, '// v0.70.1 Cold First-Turn Tail Attribution:', S1_RELEASE_NOTE + '// v0.70.1 Cold First-Turn Tail Attribution:', 's1-release-note')
    out = one(out, OLD_CACHE_HASH, NEW_CACHE_HASH, 's1-cache-hash')
    out = one(out, OLD_LINE_HASHES, NEW_LINE_HASHES, 's1-sketch-line-hashes')
    out = one(out, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, 's1-current-line-hashes')
    out = one(out,
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',",
        's1-operator-card-identity')
    return out


def verify_s1(p0, p1):
    before = module_text(p0, 'runtime-cache')
    after = module_text(p1, 'runtime-cache')
    if before.count('0x811c9dc5') != 5 or after.count('0x811c9dc5') != 3:
        fail('S2_3_S1_FNV_SHAPE_INVALID')
    if after.count('function fnv1a32(text)') != 1:
        fail('S2_3_S1_FNV_HELPER_INVALID')
    if after.count('lines.map(fnv1a32)') != 1 or after.count('currentLines.map(fnv1a32)') != 1:
        fail('S2_3_S1_LINE_HASH_DELEGATION_INVALID')
    if after.count(ROLLING_PREFIX_1) != 1 or after.count(ROLLING_PREFIX_2) != 1:
        fail('S2_3_S1_ROLLING_PREFIX_CHANGED')
    if before.count(CACHE_EXPORTS_P0_P3) != 1 or after.count(CACHE_EXPORTS_P0_P3) != 1:
        fail('S2_3_S1_CACHE_EXPORTS_CHANGED')
    if require_surface(before) != require_surface(after):
        fail('S2_3_S1_CACHE_REQUIRES_CHANGED')
    for name in ('prompt', 'community', 'runtime-topology', 'runtime-session', 'state-reconcile', 'representation', 'edit-reconcile', 'runtime-mirror'):
        if module_text(p0, name) != module_text(p1, name):
            fail('S2_3_S1_FROZEN_MODULE_CHANGED', name)
    verify_side_effect_counts(p0, p1, 'S2_3_S1')
    reference_fnv_equivalence()


def apply_s2_1(p1):
    out = one(p1, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, 's2-1-prompt-dead-full-text-chain')
    out = one(out, S2_1_SESSION_ALIAS, '', 's2-1-session-render-alias')
    out = one(out, S2_1_SESSION_EXPORT, '', 's2-1-session-render-export')
    return out


def verify_s2_1(p1, p2):
    before_prompt = module_text(p1, 'prompt')
    after_prompt = module_text(p2, 'prompt')
    before_session = module_text(p1, 'session')
    after_session = module_text(p2, 'session')
    if before_prompt.count(OLD_PROMPT_TAIL) != 1 or after_prompt.count(NEW_PROMPT_TAIL) != 1:
        fail('S2_3_S2_1_PROMPT_SHAPE_INVALID')
    for marker in ('function compileRuntimePrompt(state)', 'function renderRuntimePrompt(state)', S2_1_SESSION_ALIAS, S2_1_SESSION_EXPORT):
        if marker in p2:
            fail('S2_3_S2_1_DEAD_SEAM_SURVIVED', marker.strip())
    parts_start = before_prompt.index('function compileRuntimePromptParts(state) {')
    parts_end = before_prompt.index('\nfunction compileRuntimePrompt(state)', parts_start)
    if before_prompt[parts_start:parts_end] not in after_prompt:
        fail('S2_3_S2_1_LIVE_PROMPT_COMPILER_CHANGED')
    if after_session.count(SESSION_PARTS_ALIAS) != 1 or after_session.count(SESSION_PARTS_CALL) != 1:
        fail('S2_3_S2_1_LIVE_SESSION_PROMPT_PATH_CHANGED')
    if require_surface(before_prompt) != require_surface(after_prompt) or require_surface(before_session) != require_surface(after_session):
        fail('S2_3_S2_1_REQUIRE_SURFACE_CHANGED')
    for name in ('community', 'runtime-cache', 'runtime-topology', 'runtime-cache-candidates', 'runtime-telemetry', 'runtime-session', 'runtime-mirror', 'state-reconcile', 'representation', 'edit-reconcile', 'output-compat', 'output-finalize'):
        if module_text(p1, name) != module_text(p2, name):
            fail('S2_3_S2_1_FROZEN_MODULE_CHANGED', name)
    verify_side_effect_counts(p1, p2, 'S2_3_S2_1')


def apply_s2_2(p2):
    out = p2
    for marker in S2_2_EXPORTS:
        out = one(out, marker, '', f's2-2-session-export-{marker.strip()}')
    return out


def verify_s2_2(p2, p3):
    if module_names(p2) != module_names(p3):
        fail('S2_3_S2_2_MODULE_GRAPH_CHANGED')
    for name in module_names(p2):
        if name != 'session' and module_text(p2, name) != module_text(p3, name):
            fail('S2_3_S2_2_NON_SESSION_MODULE_CHANGED', name)
    before = module_text(p2, 'session')
    after = module_text(p3, 'session')
    if require_surface(before) != require_surface(after):
        fail('S2_3_S2_2_SESSION_REQUIRE_SURFACE_CHANGED')
    expected = before
    for marker in S2_2_EXPORTS:
        if expected.count(marker) != 1:
            fail('S2_3_S2_2_PARENT_EXPORT_SHAPE_INVALID', marker.strip())
        expected = expected.replace(marker, '', 1)
    if expected != after:
        fail('S2_3_S2_2_SESSION_DELTA_WIDENED')
    live = (
        'function inspectPreviousBEndOutput(historyMessages, sendIndex) {',
        "base?.lastMode === 'B_END'\n      ? inspectPreviousBEndOutput(historyMessages, sendIndex)",
        'const compileRuntimePromptParts = prompt.compileRuntimePromptParts;',
        'const promptCompiled = compileRuntimePromptParts(state);',
        'structure.validateStructure(prepared.content, base.pending)',
        'lifecycle.prepareTurn(base, userText, promptProbe, sendIndex, previousOutputFacts)',
        'CoreRulesetSession,', 'latestUserIndex: kernel.latestUserIndex,', 'latestUserText: kernel.latestUserText,',
        'inspectPromptMessages: kernel.inspectPromptMessages,', 'fingerprintText: kernel.fingerprintText,',
    )
    for marker in live:
        if marker not in after:
            fail('S2_3_S2_2_LIVE_SESSION_PATH_MISSING', marker)
    verify_side_effect_counts(p2, p3, 'S2_3_S2_2')


def apply_s2_3(p3):
    out = one(p3, CACHE_EXPORTS_P0_P3, CACHE_EXPORTS_P4, 's2-3-runtime-cache-export-surface')
    out = one(out, TOPO_EXPORTS_P0_P3, TOPO_EXPORTS_P4, 's2-3-runtime-topology-export-surface')
    return out


def verify_s2_3(p3, p4):
    if module_names(p3) != module_names(p4):
        fail('S2_3_MODULE_GRAPH_CHANGED')
    for name in module_names(p3):
        if name not in ('runtime-cache', 'runtime-topology') and module_text(p3, name) != module_text(p4, name):
            fail('S2_3_NON_TARGET_MODULE_CHANGED', name)

    cache_before = module_text(p3, 'runtime-cache')
    cache_after = module_text(p4, 'runtime-cache')
    topo_before = module_text(p3, 'runtime-topology')
    topo_after = module_text(p4, 'runtime-topology')
    if require_surface(cache_before) != require_surface(cache_after) or require_surface(topo_before) != require_surface(topo_after):
        fail('S2_3_REQUIRE_SURFACE_CHANGED')
    if cache_before.replace(CACHE_EXPORTS_P0_P3, CACHE_EXPORTS_P4, 1) != cache_after:
        fail('S2_3_RUNTIME_CACHE_DELTA_WIDENED')
    if topo_before.replace(TOPO_EXPORTS_P0_P3, TOPO_EXPORTS_P4, 1) != topo_after:
        fail('S2_3_RUNTIME_TOPOLOGY_DELTA_WIDENED')

    dead_cache = ('promptChangeReason', 'buildRuntimePromptCacheProbe', 'runtimeLineTier', 'runtimeIdentity')
    dead_topo = ('exactHash', 'leadingSystemCount')
    for name in dead_cache:
        if re.search(rf'\b{name}\b', CACHE_EXPORTS_P4):
            fail('S2_3_DEAD_CACHE_EXPORT_SURVIVED', name)
        if f'function {name}(' not in cache_after:
            fail('S2_3_CACHE_HELPER_BODY_MISSING', name)
    for name in dead_topo:
        if re.search(rf'\b{name}\b', TOPO_EXPORTS_P4):
            fail('S2_3_DEAD_TOPO_EXPORT_SURVIVED', name)
        if f'function {name}(' not in topo_after:
            fail('S2_3_TOPO_HELPER_BODY_MISSING', name)

    live_exports = (
        CACHE_EXPORTS_P4,
        TOPO_EXPORTS_P4,
        "const createPrompt = cacheRules.createRuntimePromptCacheTracker;",
        'const runtimePromptCache = runtimeCacheRules.createRuntimePromptCacheTracker(runtimeContracts.cache);',
        'runtimeTopologyRules.messageSignature(list[i])',
        'runtimeTopologyRules.messageSignature(list[index])',
        'topoRules.breakAttribution(first,',
        'const requestTopology = runtimeTopologyRules.createRequestTopologyTracker();',
    )
    for marker in live_exports:
        if marker not in p4:
            fail('S2_3_LIVE_EXPORT_OR_CALL_MISSING', marker)

    protected = (
        'const PROMPT_COMPILER_VERSION = 4;', 'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;', 'const CORE_STATE_VERSION = 10;',
        'TAIL_AFTER_CURRENT_USER', 'provider cache UNVERIFIED', 'Post-onSend attribution:',
        'claimHostLocalOnce',
    )
    for marker in protected:
        if p3.count(marker) != p4.count(marker):
            fail('S2_3_PROTECTED_MARKER_CHANGED', marker)
    verify_side_effect_counts(p3, p4, 'S2_3')


def verify_module_loading(path):
    script = r'''
import fs from 'node:fs';
import { BundleLoader } from './products/simcore/tooling/bundle-loader.mjs';
const source = fs.readFileSync(process.argv[1], 'utf8');
const loader = new BundleLoader(source);
const cache = loader.load('runtime-cache');
const topo = loader.load('runtime-topology');
const session = loader.load('session');
for (const name of ['promptChangeReason','buildRuntimePromptCacheProbe','runtimeLineTier','runtimeIdentity']) {
  if (name in cache) throw new Error('DEAD_CACHE_EXPORT_SURVIVED:' + name);
}
for (const name of ['exactHash','leadingSystemCount']) {
  if (name in topo) throw new Error('DEAD_TOPO_EXPORT_SURVIVED:' + name);
}
if (typeof cache.createRuntimePromptCacheTracker !== 'function') throw new Error('CACHE_TRACKER_MISSING');
if (typeof topo.messageSignature !== 'function') throw new Error('MESSAGE_SIGNATURE_MISSING');
if (typeof topo.breakAttribution !== 'function') throw new Error('BREAK_ATTRIBUTION_MISSING');
if (typeof topo.createRequestTopologyTracker !== 'function') throw new Error('TOPO_TRACKER_MISSING');
if (typeof session.CoreRulesetSession !== 'function') throw new Error('SESSION_FACTORY_MISSING');
console.log('S2_3_MODULE_LOAD_PASS');
'''
    result = subprocess.run(['node', '--input-type=module', '-e', script, str(path)], text=True, capture_output=True)
    if result.returncode != 0 or 'S2_3_MODULE_LOAD_PASS' not in result.stdout:
        fail('S2_3_MODULE_LOAD_FAIL', (result.stderr or result.stdout).strip())


def verify_identity(text):
    metadata = re.search(r'^//@version\s+([^\s]+)\s*$', text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [x.group(1) if x else None for x in (metadata, runtime, host)]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('S2_3_CUMULATIVE_IDENTITY_INVALID', repr(values))


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('S2_3_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('S2_3_PARENT_LATEST_INSTALL_DIVERGED')
    if originals[0].count(f'//@version {FROM_VERSION}') != 1:
        fail('S2_3_PARENT_VERSION_MISMATCH')

    p0 = originals[0]
    p1 = apply_s1(p0); verify_s1(p0, p1)
    p2 = apply_s2_1(p1); verify_s2_1(p1, p2)
    p3 = apply_s2_2(p2); verify_s2_2(p2, p3)
    p4 = apply_s2_3(p3); verify_s2_3(p3, p4)
    verify_identity(p4)

    for path in FILES:
        path.write_text(p4, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('S2_3_OUTPUT_LATEST_INSTALL_DIVERGED')
    verify_module_loading(FILES[0])
    print('S2_3_BUILD_PASS')


if __name__ == '__main__':
    main()
