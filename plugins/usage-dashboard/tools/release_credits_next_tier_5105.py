#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SRC = UD / 'src'
ES = UD / 'runtime-src' / 'bridge-engine'
RT = UD / 'runtime'
T = UD / 'tools'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.105.json'
CORE = SRC / '00-runtime-core.part.js'
BRIDGE_IO = SRC / '20-bridge-io.part.js'
DIAG = SRC / '40-diagnostics.part.js'
DASH = SRC / '50-dashboard-context.part.js'
ECORE = ES / '00-core.part.mjs'
CAPTURE = ES / '30-cli-runtime.part.mjs'
SOURCES = ES / '40-sources.part.mjs'
HTTP = ES / '70-http-diagnostics.part.mjs'
ENGINE = RT / 'bridge-engine.mjs'
MANAGER = RT / 'bridge-manager.cjs'
BOOT = RT / 'bootstrap-bridge-manager.sh'
MANIFEST = RT / 'product-manifest.json'
LATEST = UD / 'latest.js'

BASE_PRODUCT = '3.0.0-alpha.5.104'
TARGET_PRODUCT = '3.0.0-alpha.5.105'
BASE_ENGINE = '1.6.38'
TARGET_ENGINE = '1.6.39'
MANAGER_VER = '1.3.6'
BASE_RELEASE_SHA = 'e1d1455592449bcad943e3dec6e1eb205136bd92'
BASE_ENGINE_SHA = '085273bd748b852de35cbcc7e00241f349ab0cb6ac38dd62c6c5354ad2f56fea'
BASE_MANAGER_SHA = 'f57ed5ce922120dab2a3db5bcd854d5d909efa7c02a77d690266c4cb99f73b33'
BOOT_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(*args: str) -> None:
    subprocess.run(args, cwd=ROOT, check=True)


def rep(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    if new in text and old not in text:
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.105 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.105 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Credits Next-Tier Progression',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_credits_next_tier_5105.py',
        'newRegression': 'plugins/usage-dashboard/tests/p71-credits-next-tier-progression.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.105 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.105 contracts changed')
    for role in ('acceptedBaseline', 'latestInstalled'):
        row = (value.get('releaseEvidence') or {}).get(role) or {}
        actual = (row.get('productVersion'), row.get('releaseSha'), row.get('issue'), row.get('commentId'), row.get('verdict'))
        expected_row = (BASE_PRODUCT, BASE_RELEASE_SHA, 1861, 5577292772, 'accepted')
        if actual != expected_row:
            raise SystemExit(f'5.105 evidence mismatch:{role}:{actual}')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1864 or authority.get('designPullRequest') != 1867:
        raise SystemExit('5.105 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.105 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.105 bounded notes missing')
    out = '  const RELEASE_NOTES = Object.freeze({\n'
    out += f"    title: {json.dumps(value['releaseTitle'], ensure_ascii=False)},\n"
    out += '    highlights: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in highlights)
    out += '    ]),\n'
    out += '    diagnosticHints: Object.freeze([\n'
    out += ''.join(f"    {json.dumps(item, ensure_ascii=False)},\n" for item in hints)
    out += '    ]),\n  });\n'
    return out


def baseline() -> None:
    manifest = json.loads(MANIFEST.read_text())
    if manifest.get('productVersion') == TARGET_PRODUCT:
        target()
        print(f'MATERIALIZER_IDEMPOTENT:{TARGET_PRODUCT}')
        raise SystemExit(0)
    if manifest.get('productVersion') != BASE_PRODUCT:
        raise SystemExit('5.105 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.105 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.105 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.105 bootstrap mismatch')
    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    product = BRIDGE_IO.read_text() + DASH.read_text() + DIAG.read_text()
    for marker in (
        'const sanitizeGatewayLimits = (value) => {',
        'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
        "cached(`gatewayLimits:${exactOrgId}`",
        "name.startsWith('gatewayLimits:') ? 300_000",
        "url.pathname === '/gateway-limits'",
        'function gatewayLimitsUtilizationPercent(value, cap)',
        'Gateway Limits · Credits',
        '일간 spend · UTC',
        'Gateway limits: scope credits',
    ):
        if marker not in capture + sources + product + HTTP.read_text():
            raise SystemExit(f'5.105 accepted 5.104 marker missing:{marker}')
    sanitizer = capture[capture.find('  const sanitizeGatewayLimits = (value) => {'):capture.find('  const sanitizeModel = (row) => {')]
    if 'nextTier' in sanitizer:
        raise SystemExit('5.105 baseline already retains nextTier')
    if 'nextTier:' in sources[sources.find('function gatewayLimitsUnknown'):sources.find('async function captureGatewayLimitsViaCliSession')]:
        raise SystemExit('5.105 baseline already normalizes next-tier progression')


def patch_core(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.104', '//@version 3.0.0-alpha.5.105', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.104';", "const VERSION = '3.0.0-alpha.5.105';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.38';", "const REQUIRED_BRIDGE_VERSION = '1.6.39';", 'Product required Bridge version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.105 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])


def patch_engine_capture() -> None:
    rep(
        CAPTURE,
        """    return Object.keys(safe).length ? safe : null;
  };

  const sanitizeModel = (row) => {
""",
        """    if (Object.prototype.hasOwnProperty.call(raw, 'nextTier')) {
      if (raw.nextTier === null) {
        safe.nextTier = null;
      } else if (raw.nextTier && typeof raw.nextTier === 'object' && !Array.isArray(raw.nextTier)) {
        const nextTier = {};
        if (Number.isInteger(raw.nextTier.tier) && raw.nextTier.tier >= 0) nextTier.tier = raw.nextTier.tier;
        for (const key of ['daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks']) {
          const candidate = nonNegative(raw.nextTier[key]);
          if (candidate !== null) nextTier[key] = candidate;
        }
        safe.nextTier = nextTier;
      }
    }
    return Object.keys(safe).length ? safe : null;
  };

  const sanitizeModel = (row) => {
""",
        'bounded nextTier sanitizer',
    )


def patch_engine_sources() -> None:
    rep(
        SOURCES,
        """    topUp: { state:'unknown', cap:null, windowHours:null, used:null, remaining:null },
    fetchedAt: Number(now),
""",
        """    topUp: { state:'unknown', cap:null, windowHours:null, used:null, remaining:null },
    nextTier: { state:'unknown', currentTier:null, tier:null, daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null },
    fetchedAt: Number(now),
""",
        'next-tier unknown state',
    )
    rep(
        SOURCES,
        """  const monthlyUsed = gatewayLimitsNumber(raw?.usage?.monthlySpentUsd);
  const monthlyCap = gatewayLimitsNumber(raw?.tier?.monthlyCapUsd);

  const trustTierState""",
        """  const monthlyUsed = gatewayLimitsNumber(raw?.usage?.monthlySpentUsd);
  const monthlyCap = gatewayLimitsNumber(raw?.tier?.monthlyCapUsd);
  const nextTierRaw = Object.prototype.hasOwnProperty.call(raw, 'nextTier') ? raw.nextTier : undefined;

  const trustTierState""",
        'next-tier raw source identity',
    )
    progression = """
  const unknownNextTier = () => ({
    state:'unknown', currentTier:null, tier:null,
    daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null,
  });
  let nextTier = unknownNextTier();
  if (enterprise === true || (planClass && planClass !== 'regular')) {
    nextTier = { ...unknownNextTier(), state:'not-applicable' };
  } else if (enterprise === false && planClass === 'regular' && tierOverridden === true && nextTierRaw === null) {
    nextTier = { ...unknownNextTier(), state:'tier-overridden' };
  } else if (enterprise === false && planClass === 'regular' && tierOverridden === false && nextTierRaw === null) {
    nextTier = { ...unknownNextTier(), state:'max-tier' };
  } else if (enterprise === false && planClass === 'regular' && tierOverridden === false
      && nextTierRaw && typeof nextTierRaw === 'object' && !Array.isArray(nextTierRaw)) {
    const tier = Number.isInteger(nextTierRaw.tier) && nextTierRaw.tier >= 0 ? nextTierRaw.tier : null;
    const daysUntilQualify = Number.isInteger(nextTierRaw.daysUntilQualify) && nextTierRaw.daysUntilQualify >= 0 ? nextTierRaw.daysUntilQualify : null;
    const spendUsdUntilQualify = gatewayLimitsNumber(nextTierRaw.spendUsdUntilQualify);
    const daysUntilSpendPathUnlocks = Number.isInteger(nextTierRaw.daysUntilSpendPathUnlocks) && nextTierRaw.daysUntilSpendPathUnlocks >= 0
      ? nextTierRaw.daysUntilSpendPathUnlocks
      : null;
    if (trustTier !== null && tier !== null && daysUntilQualify !== null && spendUsdUntilQualify !== null && daysUntilSpendPathUnlocks !== null) {
      nextTier = {
        state:'value', currentTier:trustTier, tier,
        daysUntilQualify, spendUsdUntilQualify, daysUntilSpendPathUnlocks,
      };
    }
  }

"""
    insert_before(
        SOURCES,
        "  return {\n    state: 'ok',\n    source: 'org-limits',\n",
        progression,
        'next-tier normalization',
    )
    rep(
        SOURCES,
        """    monthly: spendMetric(monthlyUsed, monthlyCap),
    topUp,
    fetchedAt: Number(now),
""",
        """    monthly: spendMetric(monthlyUsed, monthlyCap),
    topUp,
    nextTier,
    fetchedAt: Number(now),
""",
        'next-tier normalized output',
    )


def patch_product_transport() -> None:
    rep(
        BRIDGE_IO,
        """    const topUpState = ['value','not-applicable','unknown'].includes(String(raw?.topUp?.state)) ? String(raw.topUp.state) : 'unknown';
    return {
""",
        """    const topUpState = ['value','not-applicable','unknown'].includes(String(raw?.topUp?.state)) ? String(raw.topUp.state) : 'unknown';
    const progressionState = ['value','max-tier','tier-overridden','not-applicable','unknown'].includes(String(raw?.nextTier?.state))
      ? String(raw.nextTier.state)
      : 'unknown';
    const progressionNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
    const progressionDay = (value) => Number.isInteger(value) && value >= 0 ? Number(value) : null;
    const nextTier = {
      state:progressionState,
      currentTier:Number.isInteger(raw?.nextTier?.currentTier) && raw.nextTier.currentTier >= 0 ? raw.nextTier.currentTier : null,
      tier:Number.isInteger(raw?.nextTier?.tier) && raw.nextTier.tier >= 0 ? raw.nextTier.tier : null,
      daysUntilQualify:progressionDay(raw?.nextTier?.daysUntilQualify),
      spendUsdUntilQualify:progressionNumber(raw?.nextTier?.spendUsdUntilQualify),
      daysUntilSpendPathUnlocks:progressionDay(raw?.nextTier?.daysUntilSpendPathUnlocks),
    };
    if (progressionState === 'value' && (
        nextTier.currentTier === null || nextTier.tier === null || nextTier.daysUntilQualify === null
        || nextTier.spendUsdUntilQualify === null || nextTier.daysUntilSpendPathUnlocks === null)) {
      nextTier.state = 'unknown';
      nextTier.currentTier = null;
      nextTier.tier = null;
      nextTier.daysUntilQualify = null;
      nextTier.spendUsdUntilQualify = null;
      nextTier.daysUntilSpendPathUnlocks = null;
    }
    return {
""",
        'Product next-tier local normalization',
    )
    rep(
        BRIDGE_IO,
        """      topUp:{
        state:topUpState,
        cap:num(raw?.topUp?.cap) ? Number(raw.topUp.cap) : null,
        windowHours:num(raw?.topUp?.windowHours) ? Number(raw.topUp.windowHours) : null,
        used:num(raw?.topUp?.used) ? Number(raw.topUp.used) : null,
        remaining:num(raw?.topUp?.remaining) ? Number(raw.topUp.remaining) : null,
      },
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
""",
        """      topUp:{
        state:topUpState,
        cap:num(raw?.topUp?.cap) ? Number(raw.topUp.cap) : null,
        windowHours:num(raw?.topUp?.windowHours) ? Number(raw.topUp.windowHours) : null,
        used:num(raw?.topUp?.used) ? Number(raw.topUp.used) : null,
        remaining:num(raw?.topUp?.remaining) ? Number(raw.topUp.remaining) : null,
      },
      nextTier,
      fetchedAt:num(raw.fetchedAt) ? Number(raw.fetchedAt) : Date.now(),
""",
        'Product next-tier output',
    )


def patch_product_ui() -> None:
    helper = """  function gatewayNextTierProgressionHtml(nextTier) {
    const stateName = ['value','max-tier','tier-overridden','not-applicable','unknown'].includes(String(nextTier?.state))
      ? String(nextTier.state)
      : 'unknown';
    if (stateName === 'max-tier') return '<div class="gateway-next-tier"><p><b>다음 Tier</b> · 최고 Tier</p></div>';
    if (stateName === 'tier-overridden') return '<div class="gateway-next-tier"><p><b>다음 Tier</b> · 고정 Tier · 자동 승급 미적용</p></div>';
    if (stateName === 'not-applicable') return '<div class="gateway-next-tier"><p><b>다음 Tier</b> · 미적용</p></div>';
    if (stateName !== 'value') return '<div class="gateway-next-tier"><p><b>다음 Tier</b> · —</p></div>';
    const tier = Number.isInteger(nextTier?.tier) && nextTier.tier >= 0 ? Number(nextTier.tier) : null;
    const days = Number.isInteger(nextTier?.daysUntilQualify) && nextTier.daysUntilQualify >= 0 ? Number(nextTier.daysUntilQualify) : null;
    const spend = typeof nextTier?.spendUsdUntilQualify === 'number' && Number.isFinite(nextTier.spendUsdUntilQualify) && nextTier.spendUsdUntilQualify >= 0
      ? Number(nextTier.spendUsdUntilQualify)
      : null;
    const spendAge = Number.isInteger(nextTier?.daysUntilSpendPathUnlocks) && nextTier.daysUntilSpendPathUnlocks >= 0
      ? Number(nextTier.daysUntilSpendPathUnlocks)
      : null;
    if (tier === null || days === null || spend === null || spendAge === null) return '<div class="gateway-next-tier"><p><b>다음 Tier</b> · —</p></div>';
    const ageText = days === 0 ? '충족' : `${days}일 남음`;
    const spendText = spend === 0 ? '금액 충족' : `${money(spend)} 더`;
    const spendAgeText = spendAge === 0 ? '충족' : `${spendAge}일 남음`;
    return `<div class="gateway-next-tier"><p><b>다음 Tier · Tier ${esc(tier)}</b></p><div class="minis">
      <div class="mini"><span>나이 경로</span><b>${esc(ageText)}</b></div>
      <div class="mini"><span>사용 경로</span><b>${esc(spendText)}</b></div>
      <div class="mini"><span>사용 경로 연령</span><b>${esc(spendAgeText)}</b></div>
    </div></div>`;
  }

"""
    insert_before(DASH, '  function gatewayLimitsSectionHtml(truth) {\n', helper, 'next-tier UI helper')
    rep(
        DASH,
        """      return `<div class=\"usage-detail-box gateway-limits-card\"><div class=\"recent-head\"><h3>Gateway Limits · Credits</h3><span>source org-limits · ok</span></div><p>Enterprise · 조직 단위 Gateway rate/spend cap 없음</p></div>`;
""",
        """      return `<div class=\"usage-detail-box gateway-limits-card\"><div class=\"recent-head\"><h3>Gateway Limits · Credits</h3><span>source org-limits · ok</span></div><p>Enterprise · 조직 단위 Gateway rate/spend cap 없음</p>${gatewayNextTierProgressionHtml(truth?.nextTier)}</div>`;
""",
        'enterprise next-tier state',
    )
    rep(
        DASH,
        """      <div class=\"mini\"><span>${esc(topUpLabel)}</span><b>${esc(topUpText)}</b>${gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')}</div>
    </div></div>`;
""",
        """      <div class=\"mini\"><span>${esc(topUpLabel)}</span><b>${esc(topUpText)}</b>${gatewayLimitsUtilizationBarHtml(truth?.topUp,'remaining','Rolling top-up 남은 여유 비율')}</div>
    </div>${gatewayNextTierProgressionHtml(truth?.nextTier)}</div>`;
""",
        'regular next-tier placement',
    )


def patch_diagnostics() -> None:
    helper = """  function gatewayNextTierDiagnosticText(value) {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(value?.state)) ? String(value.state) : 'source-unavailable';
    if (sourceState !== 'ok') return `Gateway next tier: scope credits · state ${sourceState} · source org-limits`;
    const nextTier = value?.nextTier;
    const stateName = ['value','max-tier','tier-overridden','not-applicable','unknown'].includes(String(nextTier?.state))
      ? String(nextTier.state)
      : 'unknown';
    if (stateName !== 'value') return `Gateway next tier: scope credits · state ${stateName} · source org-limits`;
    const currentTier = Number.isInteger(nextTier?.currentTier) && nextTier.currentTier >= 0 ? Number(nextTier.currentTier) : null;
    const tier = Number.isInteger(nextTier?.tier) && nextTier.tier >= 0 ? Number(nextTier.tier) : null;
    const ageLeft = Number.isInteger(nextTier?.daysUntilQualify) && nextTier.daysUntilQualify >= 0 ? Number(nextTier.daysUntilQualify) : null;
    const spendLeft = typeof nextTier?.spendUsdUntilQualify === 'number' && Number.isFinite(nextTier.spendUsdUntilQualify) && nextTier.spendUsdUntilQualify >= 0
      ? Number(nextTier.spendUsdUntilQualify)
      : null;
    const spendAgeLeft = Number.isInteger(nextTier?.daysUntilSpendPathUnlocks) && nextTier.daysUntilSpendPathUnlocks >= 0
      ? Number(nextTier.daysUntilSpendPathUnlocks)
      : null;
    if (currentTier === null || tier === null || ageLeft === null || spendLeft === null || spendAgeLeft === null) {
      return 'Gateway next tier: scope credits · state unknown · source org-limits';
    }
    return `Gateway next tier: scope credits · current ${currentTier} · next ${tier} · age-left ${ageLeft}d · spend-left ${spendLeft} · spend-age-left ${spendAgeLeft}d · source org-limits · state ok`;
  }


"""
    insert_before(DIAG, '  function modelCategoryCatalogDiagnosticText(diagnostics) {\n', helper, 'next-tier diagnostics helper')
    old_line = "      gatewayLimitsDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n"
    rep(
        DIAG,
        old_line,
        old_line + "      gatewayNextTierDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n",
        'next-tier diagnostics line',
    )


def patch(value: dict) -> None:
    patch_core(value)
    rep(ECORE, "const VERSION = '1.6.38';", "const VERSION = '1.6.39';", 'Engine version')
    patch_engine_capture()
    patch_engine_sources()
    patch_product_transport()
    patch_product_ui()
    patch_diagnostics()


def target() -> None:
    manifest = json.loads(MANIFEST.read_text())
    engine_sha = sha(ENGINE)
    manager_sha = sha(MANAGER)
    if manifest.get('productVersion') != TARGET_PRODUCT:
        raise SystemExit('5.105 target Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.105 target Engine manifest mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.105 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.105 target contracts changed')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.105 bootstrap changed')

    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    product = BRIDGE_IO.read_text() + DASH.read_text() + DIAG.read_text()
    sanitizer = capture[capture.find('  const sanitizeGatewayLimits = (value) => {'):capture.find('  const sanitizeModel = (row) => {')]
    for marker in ('nextTier', 'daysUntilQualify', 'spendUsdUntilQualify', 'daysUntilSpendPathUnlocks'):
        if marker not in sanitizer:
            raise SystemExit(f'5.105 sanitizer progression field missing:{marker}')
    for forbidden in ('accountAgeDays', 'lifetimeSpendUsd', 'ageDaysRequired', 'spendUsdRequired', 'minAgeDaysRequired', 'topUpDailyCapUsd', 'endpoints'):
        if forbidden in sanitizer:
            raise SystemExit(f'5.105 sanitizer minimization violation:{forbidden}')
    for marker in (
        "state:'max-tier'", "state:'tier-overridden'", "state:'not-applicable'",
        'daysUntilQualify', 'spendUsdUntilQualify', 'daysUntilSpendPathUnlocks',
        "cached(`gatewayLimits:${exactOrgId}`", "name.startsWith('gatewayLimits:') ? 300_000",
        'function gatewayNextTierProgressionHtml(nextTier)', '다음 Tier · Tier', '사용 경로 연령',
        'function gatewayNextTierDiagnosticText(value)', 'Gateway next tier: scope credits',
    ):
        if marker not in sources + product:
            raise SystemExit(f'5.105 target marker missing:{marker}')
    if "url.pathname === '/gateway-limits'" not in HTTP.read_text():
        raise SystemExit('5.105 existing gateway-limits route missing')
    if '/gateway-next-tier' in HTTP.read_text() + sources + product:
        raise SystemExit('5.105 unauthorized next-tier endpoint')
    normalized_slice = sources[sources.find('function gatewayLimitsUnknown'):sources.find('async function captureGatewayLimitsViaCliSession')]
    for forbidden in ('accountAgeDays', 'lifetimeSpendUsd'):
        if forbidden in normalized_slice:
            raise SystemExit(f'5.105 normalized privacy field leaked:{forbidden}')

    latest = LATEST.read_text()
    for marker in ('//@version 3.0.0-alpha.5.105', "const REQUIRED_BRIDGE_VERSION = '1.6.39';", '다음 Tier · Tier', 'Gateway next tier: scope credits'):
        if marker not in latest:
            raise SystemExit(f'5.105 latest.js marker missing:{marker}')
    run('node', 'plugins/usage-dashboard/tools/build_bridge_engine.cjs', '--check')
    run('node', 'plugins/usage-dashboard/tools/build_usage_dashboard.cjs', '--check')
    run('python3', 'plugins/usage-dashboard/tools/sync_project_guidelines.py', '--check')
    run('node', '--check', str(ENGINE))
    run('node', '--check', str(MANAGER))
    run('node', '--check', str(LATEST))


def main() -> None:
    value = load_spec()
    baseline()
    patch(value)

    run('node', str(T / 'build_bridge_engine.cjs'), '--write')
    run('node', str(T / 'build_bridge_engine.cjs'), '--check')
    engine_sha = sha(ENGINE)
    if engine_sha == BASE_ENGINE_SHA:
        raise SystemExit('5.105 Engine bump expected but bytes did not change')

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.104';", "const PRODUCT_VERSION = '3.0.0-alpha.5.105';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.38';", "const BUNDLED_ENGINE_VERSION = '1.6.39';", 'Manager Engine')
    rep(
        MANAGER,
        f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';",
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        'Manager Engine hash',
    )

    run('node', str(T / 'build_usage_dashboard.cjs'), '--write')
    run('node', str(T / 'build_usage_dashboard.cjs'), '--check')
    manager_sha = sha(MANAGER)

    manifest = json.loads(MANIFEST.read_text())
    manifest['productVersion'] = TARGET_PRODUCT
    manifest['components']['plugin']['version'] = TARGET_PRODUCT
    manifest['components']['bridge']['requiredVersion'] = TARGET_ENGINE
    manifest['components']['bridge']['sha256'] = engine_sha
    manager = manifest['components']['bridgeManager']
    manager['version'] = MANAGER_VER
    manager['productVersion'] = TARGET_PRODUCT
    manager['sha256'] = manager_sha
    manager['bootstrapSha256'] = BOOT_SHA
    manager['managedCliVersion'] = '1.10.0'
    manager['managedModelCatalogVersion'] = '1.280.0'
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

    run('python3', str(T / 'sync_project_guidelines.py'))
    target()
    print(
        f'MATERIALIZED:{TARGET_PRODUCT} · Engine {TARGET_ENGINE} {engine_sha} · '
        f'Manager {MANAGER_VER} {manager_sha} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1'
    )


if __name__ == '__main__':
    main()
