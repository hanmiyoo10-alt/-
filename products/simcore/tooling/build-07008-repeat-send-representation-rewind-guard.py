#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
LATEST = ROOT / 'plugins' / 'simcore' / 'latest.js'
INSTALL = ROOT / 'plugins' / 'simcore' / 'install.js'

RELEASE_NOTE = """// v0.70.8 Repeat-Send Representation Rewind Guard:
// - Recognizes one exact same-session repeat-send rewind geometry for a proven prior OUTPUT_MISMATCH whose current visible body is the recorded Fresh representation
// - Keeps the existing same-slot Fresh carryover authority unchanged and adds a separate conjunctive rewind authority using existing send/session/provenance indices only
// - Routes the proven rewind through REPRESENTATION_FAST_RECONCILED with snapshot UNCHANGED and fresh-exact-repeat-send-rewind provenance
// - Adds no Host read, storage/network/timer work, persistent schema, raw-body retention, retry, polling, or release-system change
//
"""


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'07008_BUILD_BLOCK {label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def module_names(text: str):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text: str, name: str) -> str:
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        raise SystemExit(f'07008_BUILD_BLOCK module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(token))
    return text[start:nxt if nxt >= 0 else len(text)]


def require_lines(text: str, name: str):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", module_text(text, name), re.M)


def count(text: str, marker: str) -> int:
    return text.count(marker)


source = LATEST.read_text(encoding='utf-8')
install_source = INSTALL.read_text(encoding='utf-8')
if source != install_source:
    raise SystemExit('07008_BUILD_BLOCK predecessor latest/install differ')
if not re.search(r'^//@version\s+0\.70\.7\s*$', source, re.M):
    raise SystemExit('07008_BUILD_BLOCK predecessor metadata is not 0.70.7')
if "const SIMCORE_RUNTIME_VERSION = '0.70.7';" not in source:
    raise SystemExit('07008_BUILD_BLOCK predecessor runtime identity missing')
if "const HOST_COMPAT_VERSION = '0.70.7';" not in source:
    raise SystemExit('07008_BUILD_BLOCK predecessor host identity missing')
if "version: '0.70.7',\n    name: 'Output Snapshot Set Cost Attribution'," not in source:
    raise SystemExit('07008_BUILD_BLOCK predecessor release-card identity missing')
if source.count('// v0.70.7 Output Snapshot Set Cost Attribution:') != 1:
    raise SystemExit('07008_BUILD_BLOCK predecessor release-note identity missing')

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
]
before_counts = {marker: count(source, marker) for marker in protected_markers}

out = source
out = one(out, '//@version 0.70.7', '//@version 0.70.8', 'metadata version')
out = one(out, "const SIMCORE_RUNTIME_VERSION = '0.70.7';", "const SIMCORE_RUNTIME_VERSION = '0.70.8';", 'runtime version')
out = one(out, "const HOST_COMPAT_VERSION = '0.70.7';", "const HOST_COMPAT_VERSION = '0.70.8';", 'host compatibility version')
out = one(
    out,
    '// v0.70.7 Output Snapshot Set Cost Attribution:\n',
    RELEASE_NOTE + '// v0.70.7 Output Snapshot Set Cost Attribution:\n',
    'release-note source identity',
)
out = one(
    out,
    "version: '0.70.7',\n    name: 'Output Snapshot Set Cost Attribution',",
    "version: '0.70.8',\n    name: 'Repeat-Send Representation Rewind Guard',",
    'operator release-card identity',
)

out = one(
    out,
    "const { coreRules, textMessageContent, representationRegistry, representationRules, coreLocationKey, SIMCORE_LOG_PREFIX, reconcileSession } = deps;",
    "const { coreRules, textMessageContent, representationRegistry, representationRules, coreLocationKey, SIMCORE_LOG_PREFIX, reconcileSession, sendIndex } = deps;",
    'edit-reconcile bounded sendIndex context',
)

old_guard = """    const representationFastEligible = !!(
      priorProvenance
      && priorRepresentation === 'OUTPUT_MISMATCH'
      && currentMatch === 'FRESH_CHAT'
      && !!priorCanonical
      && !!priorFresh
      && priorCanonical !== priorFresh
      && visibleFingerprint === priorFresh
      && Number(cs.currentOutputIndex) === lastAssistant
      && String(cs.current?.outputFingerprint || '') === priorCanonical
      && String(cs.trustedOutputFingerprint || '') === priorCanonical
    );"""
new_guard = """    const commonFreshAliasFacts = !!(
      priorProvenance
      && priorRepresentation === 'OUTPUT_MISMATCH'
      && currentMatch === 'FRESH_CHAT'
      && !!priorCanonical
      && !!priorFresh
      && priorCanonical !== priorFresh
      && visibleFingerprint === priorFresh
    );
    const sameSlotAuthority = !!(
      Number(cs.currentOutputIndex) === lastAssistant
      && String(cs.current?.outputFingerprint || '') === priorCanonical
      && String(cs.trustedOutputFingerprint || '') === priorCanonical
    );
    const repeatSendRewindAuthority = !!(
      Number.isInteger(sendIndex)
      && sendIndex >= 0
      && Number(cs.lastPreparedSendIndex) === sendIndex
      && Number(cs.currentOutputIndex) === sendIndex + 1
      && lastAssistant === sendIndex - 1
      && Number(priorProvenance?.outIndex) === lastAssistant
      && (!coreLocationKey || String(priorProvenance?.locationKey || '') === String(coreLocationKey))
    );
    const representationFastEligible = !!(
      commonFreshAliasFacts && (sameSlotAuthority || repeatSendRewindAuthority)
    );"""
out = one(out, old_guard, new_guard, 'representation fast authorities')

out = one(
    out,
    "        perfDetail.compatibilitySource = 'fresh-exact-carryover';",
    "        perfDetail.compatibilitySource = repeatSendRewindAuthority ? 'fresh-exact-repeat-send-rewind' : 'fresh-exact-carryover';",
    'repeat-send rewind diagnostic provenance',
)

out = one(
    out,
    '  async function reconcileManualEdit(cs, chat, perfDetail = null) {',
    '  async function reconcileManualEdit(cs, chat, perfDetail = null, sendIndex = null) {',
    'outer bounded sendIndex signature',
)
out = one(
    out,
    '      coreLocationKey, SIMCORE_LOG_PREFIX,\n      reconcileSession:',
    '      coreLocationKey, SIMCORE_LOG_PREFIX, sendIndex,\n      reconcileSession:',
    'outer bounded sendIndex forwarding',
)
out = one(
    out,
    '    await reconcileManualEdit(cs, chat, editDetail);',
    '    await reconcileManualEdit(cs, chat, editDetail, sendIndex);',
    'prepare request sendIndex handoff',
)

if module_names(out) != before_modules:
    raise SystemExit('07008_BUILD_BLOCK module inventory/order changed')
for name in before_modules:
    if require_lines(out, name) != before_requires[name]:
        raise SystemExit(f'07008_BUILD_BLOCK require graph changed: {name}')
for marker, expected in before_counts.items():
    actual = count(out, marker)
    if actual != expected:
        raise SystemExit(f'07008_BUILD_BLOCK protected marker changed {marker}: {expected} -> {actual}')

if count(out, '// v0.70.8 Repeat-Send Representation Rewind Guard:') != 1:
    raise SystemExit('07008_BUILD_BLOCK release-note source identity cardinality unexpected')
if count(out, 'fresh-exact-repeat-send-rewind') != 1:
    raise SystemExit('07008_BUILD_BLOCK rewind diagnostic provenance cardinality unexpected')
if count(out, 'const repeatSendRewindAuthority = !!(') != 1:
    raise SystemExit('07008_BUILD_BLOCK rewind authority cardinality unexpected')
if count(out, 'const sameSlotAuthority = !!(') != 1:
    raise SystemExit('07008_BUILD_BLOCK same-slot authority cardinality unexpected')
if count(out, 'const commonFreshAliasFacts = !!(') != 1:
    raise SystemExit('07008_BUILD_BLOCK common Fresh facts cardinality unexpected')
if 'Number.isInteger(sendIndex)' not in out:
    raise SystemExit('07008_BUILD_BLOCK sendIndex integer guard missing')
if 'Number(cs.lastPreparedSendIndex) === sendIndex' not in out:
    raise SystemExit('07008_BUILD_BLOCK lastPreparedSendIndex guard missing')
if 'Number(cs.currentOutputIndex) === sendIndex + 1' not in out:
    raise SystemExit('07008_BUILD_BLOCK currentOutputIndex rewind guard missing')
if 'lastAssistant === sendIndex - 1' not in out:
    raise SystemExit('07008_BUILD_BLOCK visible rewind guard missing')
if 'Number(priorProvenance?.outIndex) === lastAssistant' not in out:
    raise SystemExit('07008_BUILD_BLOCK provenance outIndex guard missing')
if "(!coreLocationKey || String(priorProvenance?.locationKey || '') === String(coreLocationKey))" not in out:
    raise SystemExit('07008_BUILD_BLOCK provenance location guard missing')
if 'await reconcileManualEdit(cs, chat, editDetail, sendIndex);' not in out:
    raise SystemExit('07008_BUILD_BLOCK outer sendIndex handoff missing')

LATEST.write_text(out, encoding='utf-8')
INSTALL.write_text(out, encoding='utf-8')
print('07008_BUILD_PASS')
