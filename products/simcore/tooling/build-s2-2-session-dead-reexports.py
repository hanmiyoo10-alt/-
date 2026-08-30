#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.70.1'
TARGET_VERSION = '0.70.3'

RELEASE_NOTE = '''// v0.70.3 Runtime Cache Hash Primitive Convergence:\n// - Converges complete-string runtime-cache FNV-1a hashing onto one private helper\n// - Retires dead Prompt full-text render compatibility wrappers and dead Session re-export seams\n// - Preserves live compileRuntimePromptParts, Session orchestration, rolling-prefix hashes and all semantic owners\n// - Adds no persistent schema, provider routing, network, timer or runtime ownership change\n//\n'''

OLD_CACHE_HASH = '''function cacheHash(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return (h >>> 0).toString(16).padStart(8, '0');\n}'''
NEW_CACHE_HASH = '''function fnv1a32(text) {\n  const value = String(text == null ? '' : text);\n  let h = 0x811c9dc5;\n  for (let i = 0; i < value.length; i++) {\n    h ^= value.charCodeAt(i);\n    h = Math.imul(h, 0x01000193);\n  }\n  return h >>> 0;\n}\n\nfunction cacheHash(text) {\n  return fnv1a32(text).toString(16).padStart(8, '0');\n}'''
OLD_LINE_HASHES = '''  const lineHashes = lines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_LINE_HASHES = '  const lineHashes = lines.map(fnv1a32);'
OLD_CURRENT_LINE_HASHES = '''  const currentLineHashes = currentLines.map((line) => {\n    let x = 0x811c9dc5;\n    for (let i = 0; i < line.length; i++) {\n      x ^= line.charCodeAt(i);\n      x = Math.imul(x, 0x01000193);\n    }\n    return x >>> 0;\n  });'''
NEW_CURRENT_LINE_HASHES = '  const currentLineHashes = currentLines.map(fnv1a32);'

OLD_PROMPT_TAIL = '''function compileRuntimePrompt(state) {\n  return compileRuntimePromptParts(state).text;\n}\n\nfunction renderRuntimePrompt(state) {\n  return compileRuntimePrompt(state);\n}\n\nmodule.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };'''
NEW_PROMPT_TAIL = 'module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts };'

S2_1_SESSION_ALIAS = 'const renderRuntimePrompt = prompt.renderRuntimePrompt;\n'
S2_1_SESSION_EXPORT = '  renderRuntimePrompt,\n'
S2_2_EXPORTS = (
    '  inspectPreviousBEndOutput,\n',
    '  validateStructure: structure.validateStructure,\n',
    '  communityBlocks: community.communityBlocks,\n',
    '  prepareTurn: lifecycle.prepareTurn,\n',
)


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('S2_2_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_text(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0 or text.find(token, start + 1) >= 0:
        fail('S2_2_MODULE_BOUNDARY_INVALID', name)
    end = text.find('\nSimCore.define("', start + len(token))
    return text[start:end if end >= 0 else len(text)]


def fnv_reference_check():
    script = r'''
function f(text) {
  const value = String(text == null ? '' : text);
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
const samples = [null, undefined, '', 'abc', '한글', 'a\r\nb', '😀🚀', ('가😀\n').repeat(2048)];
for (const x of samples) {
  const a = f(x), b = f(x);
  if (a !== b) throw new Error('FNV_DIFF');
}
console.log('S2_2_FNV_PASS');
'''
    r = subprocess.run(['node', '-e', script], text=True, capture_output=True)
    if r.returncode != 0 or 'S2_2_FNV_PASS' not in r.stdout:
        fail('S2_2_FNV_REFERENCE_FAIL', (r.stderr or r.stdout).strip())


def build(parent):
    out = parent

    # S1-1 cumulative transform.
    out = one(out, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    out = one(out, f"const SIMCORE_RUNTIME_VERSION = '{FROM_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{TARGET_VERSION}';", 'runtime-version')
    out = one(out, f"const HOST_COMPAT_VERSION = '{FROM_VERSION}';", f"const HOST_COMPAT_VERSION = '{TARGET_VERSION}';", 'host-version')
    out = one(out, '// v0.70.1 Cold First-Turn Tail Attribution:', RELEASE_NOTE + '// v0.70.1 Cold First-Turn Tail Attribution:', 'release-note')
    out = one(out, OLD_CACHE_HASH, NEW_CACHE_HASH, 'cache-hash')
    out = one(out, OLD_LINE_HASHES, NEW_LINE_HASHES, 'line-hashes')
    out = one(out, OLD_CURRENT_LINE_HASHES, NEW_CURRENT_LINE_HASHES, 'current-line-hashes')
    out = one(out,
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        "    version: '0.70.3',\n    name: 'Runtime Cache Hash Primitive Convergence',",
        'operator-card')

    # S2-1 cumulative transform.
    out = one(out, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, 'prompt-dead-render-chain')
    out = one(out, S2_1_SESSION_ALIAS, '', 'session-render-alias')
    out = one(out, S2_1_SESSION_EXPORT, '', 'session-render-export')

    # S2-2 cumulative transform: export surface only.
    for marker in S2_2_EXPORTS:
        out = one(out, marker, '', f'session-export-{marker.strip()}')

    return out


def verify(parent, out):
    if parent.count('0x811c9dc5') < 5 or module_text(out, 'runtime-cache').count('0x811c9dc5') != 3:
        fail('S2_2_S1_FNV_SHAPE_INVALID')
    if module_text(out, 'runtime-cache').count('function fnv1a32(text)') != 1:
        fail('S2_2_S1_HELPER_INVALID')
    if module_text(out, 'runtime-cache').count('lines.map(fnv1a32)') != 1 or module_text(out, 'runtime-cache').count('currentLines.map(fnv1a32)') != 1:
        fail('S2_2_S1_DELEGATION_INVALID')

    for dead in (
        'function compileRuntimePrompt(state)',
        'function renderRuntimePrompt(state)',
        S2_1_SESSION_ALIAS.strip(),
        '  renderRuntimePrompt,',
        *[x.strip() for x in S2_2_EXPORTS],
    ):
        if dead and dead in out:
            fail('S2_2_DEAD_SEAM_SURVIVED', dead)

    session = module_text(out, 'session')
    for live in (
        'function inspectPreviousBEndOutput(historyMessages, sendIndex) {',
        '? inspectPreviousBEndOutput(historyMessages, sendIndex)',
        'const compileRuntimePromptParts = prompt.compileRuntimePromptParts;',
        'const promptCompiled = compileRuntimePromptParts(state);',
        'CoreRulesetSession,',
        'latestUserIndex: kernel.latestUserIndex,',
        'latestUserText: kernel.latestUserText,',
        'inspectPromptMessages: kernel.inspectPromptMessages,',
        'fingerprintText: kernel.fingerprintText,',
    ):
        if live not in session:
            fail('S2_2_LIVE_SESSION_SURFACE_MISSING', live)

    prompt = module_text(out, 'prompt')
    if 'function compileRuntimePromptParts(state) {' not in prompt or NEW_PROMPT_TAIL not in prompt:
        fail('S2_2_LIVE_PROMPT_PATH_INVALID')

    for name in ('community', 'runtime-topology', 'runtime-telemetry', 'runtime-session', 'runtime-mirror', 'state-reconcile', 'representation', 'edit-reconcile'):
        if module_text(parent, name) != module_text(out, name):
            fail('S2_2_FROZEN_MODULE_CHANGED', name)

    for marker in (
        'const PROMPT_COMPILER_VERSION = 4;',
        'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
        'TAIL_AFTER_CURRENT_USER',
        'provider cache UNVERIFIED',
        'Post-onSend attribution:',
    ):
        if parent.count(marker) != out.count(marker):
            fail('S2_2_PROTECTED_MARKER_CHANGED', marker)

    for marker in ('await ', 'setTimeout(', 'setInterval(', 'setChat(', 'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice('):
        if parent.count(marker) != out.count(marker):
            fail('S2_2_SIDE_EFFECT_COUNT_CHANGED', marker)

    values = [
        re.search(r'^//@version\s+([^\s]+)\s*$', out, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", out),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", out),
    ]
    if [m.group(1) if m else None for m in values] != [TARGET_VERSION] * 3:
        fail('S2_2_IDENTITY_INVALID')
    fnv_reference_check()


def main():
    sources = [p.read_text(encoding='utf-8') for p in FILES]
    if sources[0] != sources[1]:
        fail('S2_2_PARENT_LATEST_INSTALL_DIVERGED')
    if sources[0].count(f'//@version {FROM_VERSION}') != 1:
        fail('S2_2_PARENT_VERSION_MISMATCH')
    out = build(sources[0])
    verify(sources[0], out)
    for p in FILES:
        p.write_text(out, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('S2_2_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('S2_2_BUILD_PASS')


if __name__ == '__main__':
    main()
