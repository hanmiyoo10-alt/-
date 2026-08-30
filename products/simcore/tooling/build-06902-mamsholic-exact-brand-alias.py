#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.69.1'
TARGET_VERSION = '0.69.2'

RELEASE_NOTE = '''// v0.69.2 MamsHolic Exact Brand Alias Repair:\n// - Recognizes anchored 맘스홀릭 headers as the existing canonical 맘카페 family so generic descriptors such as 자유게시판 retain 학부모/지역 classification\n// - Keeps the broad 맘 substring guard narrow and preserves existing exact-family precedence plus unrelated negative controls\n// - Keeps COMMUNITY_CLASSIFIER_VERSION 3, bounded migration caps, Structure diversity semantics, Reaction grammar and M2-6 architecture unchanged\n// - Keeps v0.70 Current Task Primacy Guard work completely separate from this Community classifier mini\n//\n'''

BRAND_ANCHOR = """  const text = String(shown || '').trim();\n  if (!text) return null;"""
BRAND_PATCH = """  const text = String(shown || '').trim();\n  if (!text) return null;\n  if (/^맘스홀릭(?=$|[\\s\\-–—/:|·])/i.test(text)) {\n    return { shown, key: '맘카페', group: '학부모/지역', source: 'alias-parent-local' };\n  }"""


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('06902_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('06902_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
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
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.69.1';", "const SIMCORE_RUNTIME_VERSION = '0.69.2';", 'runtime-version')
    text = one(text, "const HOST_COMPAT_VERSION = '0.69.1';", "const HOST_COMPAT_VERSION = '0.69.2';", 'host-version')
    text = one(text, '// v0.69.1 Refreshless Targeted Update Liveness Repair:', RELEASE_NOTE + '// v0.69.1 Refreshless Targeted Update Liveness Repair:', 'release-note')

    community = module_text(text, 'community')
    community = one(community, BRAND_ANCHOR, BRAND_PATCH, 'mamsholic-brand-alias')
    text = replace_module(text, 'community', community)

    text = one(
        text,
        "    version: '0.69.1',\n    name: 'Refreshless Targeted Update Liveness Repair',",
        "    version: '0.69.2',\n    name: 'MamsHolic Exact Brand Alias Repair',",
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
        fail('06902_RUNTIME_IDENTITY_SPLIT', repr(values))

    before_community = module_text(before, 'community')
    after_community = module_text(after, 'community')
    expected_community = before_community.replace(BRAND_ANCHOR, BRAND_PATCH, 1)
    if after_community != expected_community:
        fail('06902_COMMUNITY_DIFF_OUT_OF_SCOPE')

    if after_community.count("/^맘스홀릭(?=$|[\\s\\-–—/:|·])/i") != 1:
        fail('06902_BRAND_ALIAS_COUNT_INVALID')
    if after.count('const COMMUNITY_CLASSIFIER_VERSION = 3;') != before.count('const COMMUNITY_CLASSIFIER_VERSION = 3;'):
        fail('06902_CLASSIFIER_VERSION_CHANGED')
    for marker in (
        'const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;',
        'const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;',
        'SimCore.define("state-reconcile"',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
    ):
        if after.count(marker) != before.count(marker):
            fail('06902_FROZEN_MARKER_CHANGED', marker)

    if after.count("includes('맘')") != before.count("includes('맘')"):
        fail('06902_BROAD_MOM_MATCHING_ADDED')


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('06902_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('06902_PARENT_LATEST_INSTALL_DIVERGED')
    if f'//@version {FROM_VERSION}' not in originals[0]:
        fail('06902_PARENT_VERSION_MISMATCH')

    candidate = patch(originals[0])
    verify(originals[0], candidate)
    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('06902_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('06902_BUILD_PASS')


if __name__ == '__main__':
    main()
