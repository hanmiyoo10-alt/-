#!/usr/bin/env python3
from pathlib import Path
import re
import subprocess
import sys

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
S1_BUILDER = Path('products/simcore/tooling/build-s1-1-runtime-cache-fnv-convergence.py')
TARGET_VERSION = '0.70.3'

OLD_PROMPT_TAIL = '''function compileRuntimePrompt(state) {\n  return compileRuntimePromptParts(state).text;\n}\n\nfunction renderRuntimePrompt(state) {\n  return compileRuntimePrompt(state);\n}\n\nmodule.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts, compileRuntimePrompt, renderRuntimePrompt };'''
NEW_PROMPT_TAIL = '''module.exports = { PROMPT_COMPILER_VERSION, broadcastEndAuthority, compileRuntimePromptParts };'''

SESSION_RENDER_ALIAS = '''const renderRuntimePrompt = prompt.renderRuntimePrompt;\n'''
SESSION_RENDER_EXPORT = '''  renderRuntimePrompt,\n'''
SESSION_PARTS_ALIAS = '''const compileRuntimePromptParts = prompt.compileRuntimePromptParts;'''
SESSION_PARTS_CALL = '''    const promptCompiled = compileRuntimePromptParts(state);'''


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


def run_s1_builder():
    if not S1_BUILDER.exists():
        fail('S2_1_S1_BUILDER_MISSING', str(S1_BUILDER))
    result = subprocess.run([sys.executable, str(S1_BUILDER)], text=True, capture_output=True)
    if result.returncode != 0 or 'S1_1_BUILD_PASS' not in result.stdout:
        fail('S2_1_S1_BUILDER_FAILED', (result.stderr or result.stdout).strip())


def patch(text):
    text = one(text, OLD_PROMPT_TAIL, NEW_PROMPT_TAIL, 'prompt-dead-full-text-chain')
    text = one(text, SESSION_RENDER_ALIAS, '', 'session-render-alias')
    text = one(text, SESSION_RENDER_EXPORT, '', 'session-render-export')
    return text


def verify_module_loading(candidate_path):
    script = r'''
import fs from 'node:fs';
import { BundleLoader } from './products/simcore/tooling/bundle-loader.mjs';
const source = fs.readFileSync(process.argv[1], 'utf8');
const loader = new BundleLoader(source);
const prompt = loader.load('prompt');
const session = loader.load('session');
if (typeof prompt.compileRuntimePromptParts !== 'function') throw new Error('PROMPT_PARTS_MISSING');
if ('compileRuntimePrompt' in prompt) throw new Error('DEAD_COMPILE_EXPORT_SURVIVED');
if ('renderRuntimePrompt' in prompt) throw new Error('DEAD_RENDER_EXPORT_SURVIVED');
if ('renderRuntimePrompt' in session) throw new Error('SESSION_RENDER_REEXPORT_SURVIVED');
if (typeof session.CoreRulesetSession !== 'function') throw new Error('SESSION_FACTORY_LOAD_FAILED');
console.log('S2_1_MODULE_LOAD_PASS');
'''
    result = subprocess.run(
        ['node', '--input-type=module', '-e', script, str(candidate_path)],
        text=True,
        capture_output=True,
    )
    if result.returncode != 0 or 'S2_1_MODULE_LOAD_PASS' not in result.stdout:
        fail('S2_1_MODULE_LOAD_FAIL', (result.stderr or result.stdout).strip())


def verify(before, after):
    if before.count('function compileRuntimePrompt(state)') != 1:
        fail('S2_1_PARENT_COMPILE_WRAPPER_SHAPE_INVALID')
    if before.count('function renderRuntimePrompt(state)') != 1:
        fail('S2_1_PARENT_RENDER_WRAPPER_SHAPE_INVALID')
    if before.count(SESSION_RENDER_ALIAS) != 1 or before.count(SESSION_RENDER_EXPORT) != 1:
        fail('S2_1_PARENT_SESSION_COMPAT_SHAPE_INVALID')

    if 'function compileRuntimePrompt(state)' in after:
        fail('S2_1_DEAD_COMPILE_WRAPPER_SURVIVED')
    if 'function renderRuntimePrompt(state)' in after:
        fail('S2_1_DEAD_RENDER_WRAPPER_SURVIVED')
    if SESSION_RENDER_ALIAS in after or SESSION_RENDER_EXPORT in after:
        fail('S2_1_SESSION_RENDER_SEAM_SURVIVED')

    before_prompt = module_text(before, 'prompt')
    after_prompt = module_text(after, 'prompt')
    before_session = module_text(before, 'session')
    after_session = module_text(after, 'session')

    parts_start = before_prompt.index('function compileRuntimePromptParts(state) {')
    parts_end = before_prompt.index('\nfunction compileRuntimePrompt(state)', parts_start)
    exact_parts = before_prompt[parts_start:parts_end]
    if exact_parts not in after_prompt:
        fail('S2_1_LIVE_PROMPT_COMPILER_CHANGED')

    if after_prompt.count(NEW_PROMPT_TAIL) != 1:
        fail('S2_1_PROMPT_EXPORT_SURFACE_INVALID')
    if after_session.count(SESSION_PARTS_ALIAS) != 1 or after_session.count(SESSION_PARTS_CALL) != 1:
        fail('S2_1_LIVE_SESSION_PROMPT_PATH_CHANGED')

    if require_surface(before_prompt) != require_surface(after_prompt):
        fail('S2_1_PROMPT_REQUIRE_SURFACE_CHANGED')
    if require_surface(before_session) != require_surface(after_session):
        fail('S2_1_SESSION_REQUIRE_SURFACE_CHANGED')

    frozen_modules = (
        'community', 'runtime-cache', 'runtime-topology', 'runtime-cache-candidates',
        'runtime-telemetry', 'runtime-session', 'runtime-mirror', 'state-reconcile',
        'representation', 'edit-reconcile', 'output-compat', 'output-finalize',
    )
    for name in frozen_modules:
        if module_text(before, name) != module_text(after, name):
            fail('S2_1_FROZEN_MODULE_CHANGED', name)

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
            fail('S2_1_PROTECTED_MARKER_CHANGED', marker)

    side_effect_markers = (
        'await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(',
        'fetch(', 'XMLHttpRequest', 'history.splice(', 'messages.splice(',
        "messages.push({ role: 'system', content: result.promptBlock });",
    )
    for marker in side_effect_markers:
        if before.count(marker) != after.count(marker):
            fail('S2_1_SIDE_EFFECT_SURFACE_CHANGED', f'{marker}: {before.count(marker)} -> {after.count(marker)}')

    identity = re.search(r'^//@version\s+([^\s]+)\s*$', after, re.M)
    if not identity or identity.group(1) != TARGET_VERSION:
        fail('S2_1_CUMULATIVE_IDENTITY_INVALID')


def main():
    run_s1_builder()

    built = []
    for path in FILES:
        if not path.exists():
            fail('S2_1_SOURCE_MISSING', str(path))
        built.append(path.read_text(encoding='utf-8'))
    if built[0] != built[1]:
        fail('S2_1_S1_LATEST_INSTALL_DIVERGED')

    candidate = patch(built[0])
    verify(built[0], candidate)

    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('S2_1_OUTPUT_LATEST_INSTALL_DIVERGED')

    verify_module_loading(FILES[0])
    print('S2_1_BUILD_PASS')


if __name__ == '__main__':
    main()
