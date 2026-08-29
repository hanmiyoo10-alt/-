#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path("plugins/simcore/latest.js"), Path("plugins/simcore/install.js")]
FROM_VERSION = "0.67.0"
TARGET_VERSION = "0.68.0"

RELEASE_NOTE = """// v0.68.0 Community Parent-Local Alias Classification Repair:
// - Repairs the recurrent Community classifier miss for parent/local descriptors that appear after a bounded platform-header separator
// - Keeps exact PLATFORM_FAMILIES authoritative and adds descriptor evidence only when one descriptor contains both a strong parent/audience token and a community-shaped token
// - Advances COMMUNITY_CLASSIFIER_VERSION from 2 to 3 so the existing bounded 12-assistant / 48-message migration can reconstruct recent reaction maxima under canonical key 맘카페
// - Keeps Structure judge semantics, Reaction grammar, persistent schema, provider/cache policy and all unrelated runtime owners unchanged
// - Keeps latest.js and install.js byte-identical and uses deterministic classifier/migration regression as authority for the nondeterministic target label, with ordinary real long-chat continuity after publication
//
"""

OLD_ALIAS = r'''function parentLocalAliasInfo(shown) {
  // Exact family rules above stay authoritative. This fallback runs only after all exact matches fail.
  // Keep it deliberately narrow: require both a parent/local identity and a community-shaped signal.
  const text = String(shown || '').trim();
  if (!text) return null;
  const namePart = text.split(/[\/|｜]/, 1)[0].trim();
  const compactName = namePart.replace(/\s+/g, '');

  const regionalMom = /^[가-힣A-Za-z0-9]{1,16}맘(?:$|[\s_\-–—])/i.test(namePart);
  const regionalParentWord = /^[가-힣A-Za-z0-9]{1,16}(?:엄마들?|어머님들?|학부모들?)$/i.test(compactName);
  const explicitParentWord = /(?:^|[\s_\-–—])(?:맘|엄마들?|어머님들?|학부모들?|육아맘)(?:$|[\s_\-–—])/i.test(namePart);
  const attachedMomCommunity = /(?:^|[가-힣A-Za-z0-9])맘(?:모여라|모임|소통|수다|커뮤니티|게시판|정보방|사랑방|놀이터|라운지|톡|방)(?:$|[^가-힣])/i.test(namePart);
  const communitySignal = /(?:모여라|모임|카페|소통|수다|커뮤니티|게시판|자유게시판|정보방|사랑방|놀이터|라운지|톡|방)/i.test(text);

  if ((regionalMom || regionalParentWord || explicitParentWord || attachedMomCommunity) && communitySignal) {
    return { shown, key: '맘카페', group: '학부모/지역', source: 'alias-parent-local' };
  }
  return null;
}'''

NEW_ALIAS = r'''function parentLocalAliasInfo(shown) {
  // Exact family rules above stay authoritative. This fallback runs only after all exact matches fail.
  // Keep it deliberately narrow: require both a parent/local identity and a community-shaped signal.
  const text = String(shown || '').trim();
  if (!text) return null;
  const segments = text.split(/[\/|｜]/).map((part) => part.trim()).filter(Boolean);
  const namePart = segments[0] || '';
  const descriptorParts = segments.slice(1);
  const compactName = namePart.replace(/\s+/g, '');

  const regionalMom = /^[가-힣A-Za-z0-9]{1,16}맘(?:$|[\s_\-–—])/i.test(namePart);
  const regionalParentWord = /^[가-힣A-Za-z0-9]{1,16}(?:엄마들?|어머님들?|학부모들?)$/i.test(compactName);
  const explicitParentWord = /(?:^|[\s_\-–—])(?:맘|엄마들?|어머님들?|학부모들?|육아맘)(?:$|[\s_\-–—])/i.test(namePart);
  const attachedMomCommunity = /(?:^|[가-힣A-Za-z0-9])맘(?:모여라|모임|소통|수다|커뮤니티|게시판|정보방|사랑방|놀이터|라운지|톡|방)(?:$|[^가-힣])/i.test(namePart);
  const communityShapeRe = /(?:모여라|모임|카페|소통|수다(?:방)?|커뮤니티|게시판|자유게시판|정보방|사랑방|놀이터|라운지|톡|방)/i;
  const descriptorParentRe = /(?:^|[^가-힣A-Za-z0-9])(?:예비맘|육아맘|엄마들?|어머님들?|학부모들?|맘들?)(?:$|[^가-힣A-Za-z0-9])/i;
  const descriptorParentCommunity = descriptorParts.some((descriptor) => descriptorParentRe.test(descriptor) && communityShapeRe.test(descriptor));
  const communitySignal = communityShapeRe.test(text);

  if ((regionalMom || regionalParentWord || explicitParentWord || attachedMomCommunity || descriptorParentCommunity) && communitySignal) {
    return { shown, key: '맘카페', group: '학부모/지역', source: 'alias-parent-local' };
  }
  return null;
}'''

CARD = r'''  const OPERATOR_RELEASE_CARD = Object.freeze({
    version: '0.68.0',
    name: 'Community Parent-Local Alias Classification Repair',
    scenario: '06800_COMMUNITY_PARENT_LOCAL_ALIAS_CLASSIFICATION_REPAIR_REAL_LONG_CHAT',
    summary: Object.freeze([
      'Community - separator 뒤 parent/local descriptor를 bounded evidence로 판정해 recurrent platform-family miss를 수리',
      'exact PLATFORM_FAMILIES와 Structure diversity 규칙은 그대로 유지하고 classifier만 좁게 보강',
      'classifier v2→v3 기존 bounded migration으로 최근 alias reaction_max를 canonical 맘카페 key에 복원',
      '이상 징후는 현재 진단을 먼저 보존하고 WATCH / DEFER / FIX / BLOCKER로 분류',
    ]),
    recent: Object.freeze([
      Object.freeze({ version: '0.68.0', name: 'Community Parent-Local Alias Repair', bullets: Object.freeze(['descriptor-aware bounded parent/local alias classification', 'classifier v3 bounded reaction-max backfill']) }),
      Object.freeze({ version: '0.67.0', name: 'M2-5 Recovery Debt Retirement', bullets: Object.freeze(['zero-caller Recovery facade physical retirement', 'direct owner topology retained']) }),
      Object.freeze({ version: '0.66.0', name: 'M2-4 Boundary Completion', bullets: Object.freeze(['Session finalization/housekeeping ownership 축소', 'Mirror Observe→Interpret→Apply→Record 경계 완성']) }),
    ]),
  });

  function buildOperatorReleaseCardHtml() {
    const card = OPERATOR_RELEASE_CARD;
    const bullets = card.summary.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const recent = card.recent.map((item) => `<li><b>v${escapeHtml(item.version)} · ${escapeHtml(item.name)}</b><br>${item.bullets.map((bullet) => `• ${escapeHtml(bullet)}`).join('<br>')}</li>`).join('');
    return `<section id="operator-release-card" class="card" style="display:none;margin-bottom:10px;padding:13px">
<div style="font-weight:800;margin-bottom:6px">📦 업데이트 내역 · v${escapeHtml(card.version)}</div>
<div style="color:#9fb3d7;margin-bottom:8px">${escapeHtml(card.name)}</div>
<ul style="margin:0 0 12px 18px;padding:0">${bullets}</ul>
<div style="font-weight:700;margin:8px 0 5px">실전 확인</div>
<ol style="margin:7px 0 10px 18px;padding:0"><li>자연 Mode C/COMMUNITY 요청에서 Version 0.68.0 · Runtime ACTIVE · output COMMITTED 확인</li><li>Structure/Frame continuity와 mirror commit이 기존 안전 규칙대로 유지되는지 확인</li><li>자연 출력에 맘스홀릭 / 예비맘·육아 수다방이 나오면 unknown-platform/diversity warning이 사라졌는지 증거 보존</li><li>pre-v3 state에서 migration receipt가 보이면 classifierVersion 3과 bounded scan을 확인</li><li>target label을 얻기 위한 반복 생성은 하지 말고 deterministic regression을 exact branch authority로 사용</li></ol>
<div style="font-weight:700;margin:8px 0 5px">중지 조건</div>
<div>exact-family precedence 변화, false-positive parent/local 분류, Structure diversity 완화, reaction grammar 변화, migration bound/schema 변화 또는 예상 밖 state 손상이 보이면 <b>다음 acceptance로 진행하지 말고 현재 진단을 먼저 보존</b></div>
<div style="font-weight:700;margin:10px 0 5px">이번 버전 실험</div><div><code>${escapeHtml(card.scenario)}</code></div>
<div style="font-weight:700;margin:10px 0 5px">최근 업데이트</div>
<ul style="margin:0 0 0 18px;padding:0">${recent}</ul>
<div style="margin-top:10px;color:#9fb3d7">이 카드는 운영 가이드이며 release PASS/FAIL authority가 아닙니다.</div>
</section>`;
  }'''


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"06800_PATCH_ANCHOR_INVALID {label} count={count}")
    return text.replace(old, new, 1)


def module_bounds(text, name):
    start_token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(start_token), text)]
    if len(starts) != 1:
        raise SystemExit(f"06800_MODULE_BOUNDARY_INVALID {name} count={len(starts)}")
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(start_token))
    end = next_start if next_start >= 0 else len(text)
    return start, end


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def replace_module(text, name, new_module):
    s, e = module_bounds(text, name)
    return text[:s] + new_module.rstrip() + "\n" + text[e:]


def module_names(text):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{', text)


def patch_header(text):
    text = one(text, f"//@version {FROM_VERSION}", f"//@version {TARGET_VERSION}", "metadata-version")
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.67.0';", "const SIMCORE_RUNTIME_VERSION = '0.68.0';", "runtime-version")
    text = one(text, "const HOST_COMPAT_VERSION = '0.67.0';", "const HOST_COMPAT_VERSION = '0.68.0';", "host-version")
    text = one(
        text,
        "// v0.67.0 M2-5 Recovery Transition Debt Retirement:",
        RELEASE_NOTE + "// v0.67.0 M2-5 Recovery Transition Debt Retirement:",
        "release-note",
    )
    return text


def patch_community(text):
    mod = module_text(text, "community")
    mod = one(mod, "const COMMUNITY_CLASSIFIER_VERSION = 2;", "const COMMUNITY_CLASSIFIER_VERSION = 3;", "classifier-version")
    mod = one(mod, OLD_ALIAS, NEW_ALIAS, "parent-local-alias")
    return replace_module(text, "community", mod)


def patch_runtime_probe(text):
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s = text.find(start)
    e = text.find(end, s + len(start)) if s >= 0 else -1
    if s < 0 or e < 0:
        raise SystemExit(f"06800_PATCH_ANCHOR_INVALID operator-release-card start={s} end={e}")
    text = text[:s] + CARD + text[e:]
    text = one(text, " (already v2)", " (already v3)", "classifier-diagnostic-version")
    return text


def assert_identity(text):
    metadata = re.search(r"^//@version\s+([^\s]+)\s*$", text, re.M)
    runtime = re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", text)
    host = re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", text)
    values = [metadata.group(1) if metadata else None, runtime.group(1) if runtime else None, host.group(1) if host else None]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        raise SystemExit(f"06800_RUNTIME_IDENTITY_SPLIT values={values}")


def assert_preconditions(original):
    if f"//@version {FROM_VERSION}" not in original:
        raise SystemExit("06800_UNEXPECTED_SOURCE_VERSION")
    if original.count("const COMMUNITY_CLASSIFIER_VERSION = 2;") != 1:
        raise SystemExit("06800_CLASSIFIER_VERSION_PRECONDITION_INVALID")
    if original.count(OLD_ALIAS) != 1:
        raise SystemExit("06800_ALIAS_SHAPE_PRECONDITION_INVALID")
    for marker in (
        "const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;",
        "const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;",
        "migrateCommunityClassifierIfNeeded(messages, lastCompletedOutIndex = -1)",
        "state.community.classifierVersion = community.COMMUNITY_CLASSIFIER_VERSION;",
        "this.communityAliasRepairStats = {",
    ):
        if marker not in original:
            raise SystemExit(f"06800_MIGRATION_PRECONDITION_MISSING {marker}")


def expected_runtime_probe(original_probe):
    start = "  const OPERATOR_RELEASE_CARD = Object.freeze({"
    end = "\n\n\n  async function openPanel() {"
    s = original_probe.find(start)
    e = original_probe.find(end, s + len(start)) if s >= 0 else -1
    if s < 0 or e < 0:
        raise SystemExit("06800_RUNTIME_PROBE_EXPECTED_CARD_BOUNDS_MISSING")
    expected = original_probe[:s] + CARD + original_probe[e:]
    return expected.replace(" (already v2)", " (already v3)", 1)


def assert_candidate(original, updated):
    assert_identity(updated)
    if module_names(original) != module_names(updated):
        raise SystemExit("06800_MODULE_INVENTORY_CHANGED")

    before_community = module_text(original, "community")
    expected_community = before_community.replace("const COMMUNITY_CLASSIFIER_VERSION = 2;", "const COMMUNITY_CLASSIFIER_VERSION = 3;", 1).replace(OLD_ALIAS, NEW_ALIAS, 1)
    if module_text(updated, "community") != expected_community:
        raise SystemExit("06800_COMMUNITY_DELTA_NOT_EXACT")

    expected_telemetry = module_text(original, "runtime-telemetry").replace(
        "const HOST_COMPAT_VERSION = '0.67.0';",
        "const HOST_COMPAT_VERSION = '0.68.0';",
        1,
    )
    if module_text(updated, "runtime-telemetry") != expected_telemetry:
        raise SystemExit("06800_RUNTIME_TELEMETRY_DELTA_NOT_VERSION_ONLY")

    if module_text(updated, "runtime-probe") != expected_runtime_probe(module_text(original, "runtime-probe")):
        raise SystemExit("06800_RUNTIME_PROBE_DELTA_NOT_CARD_AND_DIAGNOSTIC_ONLY")

    for name in module_names(original):
        if name in ("community", "runtime-telemetry", "runtime-probe"):
            continue
        if module_text(original, name) != module_text(updated, name):
            raise SystemExit(f"06800_UNEXPECTED_MODULE_BODY_CHANGE {name}")

    for required in (
        "const COMMUNITY_CLASSIFIER_VERSION = 3;",
        "descriptorParentCommunity",
        "예비맘|육아맘",
        "source: 'alias-parent-local'",
        "version: '0.68.0'",
        "Community Parent-Local Alias Classification Repair",
        "06800_COMMUNITY_PARENT_LOCAL_ALIAS_CLASSIFICATION_REPAIR_REAL_LONG_CHAT",
        " (already v3)",
    ):
        if required not in updated:
            raise SystemExit(f"06800_REQUIRED_MARKER_MISSING {required}")

    for forbidden in (" (already v2)", "const COMMUNITY_CLASSIFIER_VERSION = 2;"):
        if forbidden in updated:
            raise SystemExit(f"06800_STALE_MARKER_REMAINS {forbidden}")

    if "const ALIAS_BACKFILL_ASSISTANT_LIMIT = 12;" not in updated or "const ALIAS_BACKFILL_MESSAGE_LIMIT = 48;" not in updated:
        raise SystemExit("06800_MIGRATION_BOUNDS_CHANGED")

    for token in ("fetch(", "XMLHttpRequest", "setInterval(", "setTimeout(", "pluginStorage", "Risuai.registerButton(", "Risuai.registerSetting("):
        before = original.count(token)
        after = updated.count(token)
        if after > before:
            raise SystemExit(f"06800_RUNTIME_SURFACE_GREW token={token} before={before} after={after}")


def patch(original):
    assert_preconditions(original)
    updated = patch_header(original)
    updated = patch_community(updated)
    updated = patch_runtime_probe(updated)
    assert_candidate(original, updated)
    return updated


for target in FILES:
    original = target.read_text(encoding="utf-8")
    updated = patch(original)
    target.write_text(updated, encoding="utf-8")

latest = FILES[0].read_text(encoding="utf-8")
install = FILES[1].read_text(encoding="utf-8")
if latest != install:
    raise SystemExit("06800_LATEST_INSTALL_MISMATCH")

print("06800_BUILD_PASS")
print(f"version={TARGET_VERSION}")
print(f"bytes={len(latest.encode('utf-8'))}")
