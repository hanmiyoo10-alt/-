#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.69.2'
TARGET_VERSION = '0.70.0'

RELEASE_NOTE = '''// v0.70.0 Current Task Primacy Guard:\n// - Makes the current user input the primary generation-task authority while keeping prior assistant output as continuity/reference context rather than automatic current-task authority\n// - Prevents replay of a completed prior response frame/task unless the current input explicitly requests continuation, recap, comparison or reuse\n// - Advances PROMPT_COMPILER_VERSION 3 -> 4 in the stable Prompt tier only; request ordering, TAIL_AFTER_CURRENT_USER placement, history mutation disposition and persistent schemas remain unchanged\n// - Preserves v0.69.2 MamsHolic exact-brand alias behavior, COMMUNITY_CLASSIFIER_VERSION 3 and the M2-6 architecture graph\n//\n'''

PROMPT_ANCHOR = """    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',\n    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',\n    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',"""
PROMPT_PATCH = """    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',\n    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',\n    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',\n    'current_input_task=primary_generation_authority',\n    'prior_assistant_output=continuity_reference_context_not_current_task_authority',\n    'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',"""


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('07000_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('07000_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def replace_module(text, name, module):
    s, e = module_bounds(text, name)
    return text[:s] + module.rstrip() + '\n' + text[e:]


def patch(text):
    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.69.2';", "const SIMCORE_RUNTIME_VERSION = '0.70.0';", 'runtime-version')
    text = one(text, "const HOST_COMPAT_VERSION = '0.69.2';", "const HOST_COMPAT_VERSION = '0.70.0';", 'host-version')
    text = one(text, '// v0.69.2 MamsHolic Exact Brand Alias Repair:', RELEASE_NOTE + '// v0.69.2 MamsHolic Exact Brand Alias Repair:', 'release-note')

    prompt = module_text(text, 'prompt')
    prompt = one(prompt, 'const PROMPT_COMPILER_VERSION = 3;', 'const PROMPT_COMPILER_VERSION = 4;', 'prompt-compiler-version')
    prompt = one(prompt, PROMPT_ANCHOR, PROMPT_PATCH, 'current-task-primacy-stable-rules')
    text = replace_module(text, 'prompt', prompt)

    text = one(
        text,
        "    version: '0.69.2',\n    name: 'MamsHolic Exact Brand Alias Repair',",
        "    version: '0.70.0',\n    name: 'Current Task Primacy Guard',",
        'operator-card-identity',
    )
    return text


def verify(before, after):
    ids = [
        re.search(r'^//@version\s+([^\s]+)\s*$', after, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", after),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", after),
    ]
    values = [m.group(1) if m else None for m in ids]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('07000_RUNTIME_IDENTITY_SPLIT', repr(values))

    before_prompt = module_text(before, 'prompt')
    after_prompt = module_text(after, 'prompt')
    expected_prompt = before_prompt.replace('const PROMPT_COMPILER_VERSION = 3;', 'const PROMPT_COMPILER_VERSION = 4;', 1)
    expected_prompt = expected_prompt.replace(PROMPT_ANCHOR, PROMPT_PATCH, 1)
    if after_prompt != expected_prompt:
        fail('07000_PROMPT_DIFF_OUT_OF_SCOPE')

    required_once = (
        'current_input_task=primary_generation_authority',
        'prior_assistant_output=continuity_reference_context_not_current_task_authority',
        'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',
        'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
        'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
        'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',
    )
    for marker in required_once:
        if after_prompt.count(marker) != 1:
            fail('07000_PROMPT_RULE_COUNT_INVALID', f'{marker} count={after_prompt.count(marker)}')

    if after_prompt.count('const PROMPT_COMPILER_VERSION = 4;') != 1:
        fail('07000_PROMPT_COMPILER_VERSION_INVALID')

    before_community = module_text(before, 'community')
    after_community = module_text(after, 'community')
    if after_community != before_community:
        fail('07000_COMMUNITY_CHANGED')

    frozen_markers = (
        'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;',
        'const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;',
        'SimCore.define("state-reconcile"',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
        "/^맘스홀릭(?=$|[\\s\\-–—/:|·])/i",
    )
    for marker in frozen_markers:
        if after.count(marker) != before.count(marker):
            fail('07000_FROZEN_MARKER_CHANGED', marker)

    forbidden = (
        'history.splice(',
        'messages.splice(',
        'semantic similarity',
        'embedding',
    )
    for marker in forbidden:
        if after.count(marker) != before.count(marker):
            fail('07000_FORBIDDEN_SURFACE_DELTA', marker)


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('07000_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('07000_PARENT_LATEST_INSTALL_DIVERGED')
    if f'//@version {FROM_VERSION}' not in originals[0]:
        fail('07000_PARENT_VERSION_MISMATCH')

    candidate = patch(originals[0])
    verify(originals[0], candidate)
    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('07000_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('07000_BUILD_PASS')


if __name__ == '__main__':
    main()
