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
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.107.json'
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

BASE_PRODUCT = '3.0.0-alpha.5.106'
TARGET_PRODUCT = '3.0.0-alpha.5.107'
BASE_ENGINE = '1.6.40'
TARGET_ENGINE = '1.6.41'
MANAGER_VER = '1.3.6'
BASE_ENGINE_SHA = '2c44fbc01771dbdedab2bc407a090699a523feb3c0056f5b646fa773e457a427'
BASE_MANAGER_SHA = '13932ef6eeacad0014793a8f5535dcc2ec4dd525bbb71ae1cf80033f52f5e280'
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
        raise SystemExit(f'5.107 {label} anchor mismatch:{count}')
    path.write_text(text.replace(old, new, 1))


def insert_before(path: Path, anchor: str, block: str, label: str) -> None:
    text = path.read_text()
    if block.strip() in text:
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'5.107 {label} anchor mismatch:{count}')
    path.write_text(text.replace(anchor, block + anchor, 1))


def load_spec() -> dict:
    value = json.loads(SPEC.read_text())
    expected = {
        'productVersion': TARGET_PRODUCT,
        'releaseTitle': 'Credits Next-tier Unlock Limits',
        'engineVersion': TARGET_ENGINE,
        'managerVersion': MANAGER_VER,
        'managedCliVersion': '1.10.0',
        'managedModelCatalogVersion': '1.280.0',
        'materializer': 'plugins/usage-dashboard/tools/release_credits_next_tier_unlock_limits_5107.py',
        'newRegression': 'plugins/usage-dashboard/tests/p73-credits-next-tier-unlock-limits.cjs',
    }
    for key, wanted in expected.items():
        if value.get(key) != wanted:
            raise SystemExit(f'5.107 spec mismatch:{key}')
    if value.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.107 contracts changed')
    authority = value.get('authority') or {}
    if authority.get('featureIssue') != 1888 or authority.get('designPullRequest') != 1889:
        raise SystemExit('5.107 feature/design authority mismatch')
    if authority.get('releaseGeneration') != 'E13':
        raise SystemExit('5.107 durable release generation mismatch')
    return value


def release_notes(value: dict) -> str:
    notes = value.get('releaseNotes') or {}
    highlights = notes.get('highlights') or []
    hints = notes.get('diagnosticHints') or []
    if not 1 <= len(highlights) <= 5 or not 1 <= len(hints) <= 5:
        raise SystemExit('5.107 bounded notes missing')
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
        raise SystemExit('5.107 baseline Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != BASE_ENGINE or bridge.get('sha256') != BASE_ENGINE_SHA or sha(ENGINE) != BASE_ENGINE_SHA:
        raise SystemExit('5.107 baseline Engine mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != BASE_PRODUCT or manager.get('sha256') != BASE_MANAGER_SHA or sha(MANAGER) != BASE_MANAGER_SHA:
        raise SystemExit('5.107 baseline Manager mismatch')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.107 bootstrap mismatch')
    capture = CAPTURE.read_text()
    sources = SOURCES.read_text()
    product = BRIDGE_IO.read_text() + DASH.read_text() + DIAG.read_text()
    for marker in (
        'const sanitizeGatewayLimits = (value) => {',
        'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
        "cached(`gatewayLimits:${exactOrgId}`",
        "name.startsWith('gatewayLimits:') ? 300_000",
        "url.pathname === '/gateway-limits'",
        'function gatewayNextTierProgressionHtml(nextTier)',
        'function gatewayEndpointRpmLimitsHtml(endpointRates)',
        'Gateway next tier: scope credits',
        'Gateway endpoint RPM: scope credits',
    ):
        if marker not in capture + sources + product + HTTP.read_text():
            raise SystemExit(f'5.107 accepted 5.106 marker missing:{marker}')
    next_tier_sanitizer = capture[capture.find("    if (Object.prototype.hasOwnProperty.call(raw, 'nextTier')) {"):capture.find("    if (Object.prototype.hasOwnProperty.call(raw, 'endpoints')) {")]
    if "for (const key of ['daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks'])" not in next_tier_sanitizer:
        raise SystemExit('5.107 baseline nextTier sanitizer shape changed')
    if 'gatewayNextTierUnlockLimitsHtml' in product or 'Gateway next-tier limits:' in product:
        raise SystemExit('5.107 baseline already has unlock-limit surface')


def patch_core(value: dict) -> None:
    rep(CORE, '//@version 3.0.0-alpha.5.106', '//@version 3.0.0-alpha.5.107', 'Plugin header')
    rep(CORE, "const VERSION = '3.0.0-alpha.5.106';", "const VERSION = '3.0.0-alpha.5.107';", 'Plugin version')
    rep(CORE, "const REQUIRED_BRIDGE_VERSION = '1.6.40';", "const REQUIRED_BRIDGE_VERSION = '1.6.41';", 'Product required Bridge version')
    text = CORE.read_text()
    start = text.find('  const RELEASE_NOTES = Object.freeze({')
    end = text.find('  const UPDATE_URL =', start)
    if start < 0 or end <= start:
        raise SystemExit('5.107 release notes boundary missing')
    CORE.write_text(text[:start] + release_notes(value) + text[end:])


def patch_engine_capture() -> None:
    rep(
        CAPTURE,
        "for (const key of ['daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks']) {",
        "for (const key of ['daysUntilQualify','spendUsdUntilQualify','daysUntilSpendPathUnlocks','rpmMultiplier','dailyCapUsd','monthlyCapUsd','topUpDailyCapUsd']) {",
        'bounded next-tier unlock sanitizer fields',
    )


def patch_engine_sources() -> None:
    rep(
        SOURCES,
        "    nextTier: { state:'unknown', currentTier:null, tier:null, daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null },\n",
        "    nextTier: { state:'unknown', currentTier:null, tier:null, daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null, limits:{state:String(state) === 'permission-unavailable' ? 'permission-unavailable' : 'source-unavailable',rpmMultiplier:null,dailyCapUsd:null,monthlyCapUsd:null,topUpDailyCapUsd:null} },\n",
        'next-tier unlock unknown state',
    )
    old = """  const unknownNextTier = () => ({
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
    new = """  const nextTierLimitsUnknown = (state = 'source-unavailable') => ({
    state, rpmMultiplier:null, dailyCapUsd:null, monthlyCapUsd:null, topUpDailyCapUsd:null,
  });
  const nextTierLimitsFromRaw = (value) => {
    const rpmMultiplier = gatewayLimitsNumber(value?.rpmMultiplier);
    const dailyCapUsd = gatewayLimitsNumber(value?.dailyCapUsd);
    const monthlyCapUsd = gatewayLimitsNumber(value?.monthlyCapUsd);
    const topUpDailyCapUsd = gatewayLimitsNumber(value?.topUpDailyCapUsd);
    if (rpmMultiplier === null || dailyCapUsd === null || monthlyCapUsd === null || topUpDailyCapUsd === null) {
      return nextTierLimitsUnknown('invalid-next-tier-limits');
    }
    return {state:'value',rpmMultiplier,dailyCapUsd,monthlyCapUsd,topUpDailyCapUsd};
  };
  const unknownNextTier = () => ({
    state:'unknown', currentTier:null, tier:null,
    daysUntilQualify:null, spendUsdUntilQualify:null, daysUntilSpendPathUnlocks:null,
    limits:nextTierLimitsUnknown(),
  });
  let nextTier = unknownNextTier();
  if (enterprise === true || (planClass && planClass !== 'regular')) {
    nextTier = { ...unknownNextTier(), state:'not-applicable', limits:nextTierLimitsUnknown('not-applicable') };
  } else if (enterprise === false && planClass === 'regular' && tierOverridden === true && nextTierRaw === null) {
    nextTier = { ...unknownNextTier(), state:'tier-overridden', limits:nextTierLimitsUnknown('tier-overridden') };
  } else if (enterprise === false && planClass === 'regular' && tierOverridden === false && nextTierRaw === null) {
    nextTier = { ...unknownNextTier(), state:'max-tier', limits:nextTierLimitsUnknown('max-tier') };
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
        limits:nextTierLimitsFromRaw(nextTierRaw),
      };
    }
  }
"""
    rep(SOURCES, old, new, 'next-tier unlock normalization')


def patch_product_transport() -> None:
    anchor = """    const nextTier = {
      state:progressionState,
      currentTier:Number.isInteger(raw?.nextTier?.currentTier) && raw.nextTier.currentTier >= 0 ? raw.nextTier.currentTier : null,
"""
    block = """    const unlockState = ['value','max-tier','tier-overridden','not-applicable','source-unavailable','permission-unavailable','invalid-next-tier-limits'].includes(String(raw?.nextTier?.limits?.state))
      ? String(raw.nextTier.limits.state)
      : 'source-unavailable';
    const unlockNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
    const unlockLimits = {
      state:unlockState,
      rpmMultiplier:unlockNumber(raw?.nextTier?.limits?.rpmMultiplier),
      dailyCapUsd:unlockNumber(raw?.nextTier?.limits?.dailyCapUsd),
      monthlyCapUsd:unlockNumber(raw?.nextTier?.limits?.monthlyCapUsd),
      topUpDailyCapUsd:unlockNumber(raw?.nextTier?.limits?.topUpDailyCapUsd),
    };
    if (unlockState === 'value' && (
        unlockLimits.rpmMultiplier === null || unlockLimits.dailyCapUsd === null
        || unlockLimits.monthlyCapUsd === null || unlockLimits.topUpDailyCapUsd === null)) {
      unlockLimits.state = 'invalid-next-tier-limits';
      unlockLimits.rpmMultiplier = null;
      unlockLimits.dailyCapUsd = null;
      unlockLimits.monthlyCapUsd = null;
      unlockLimits.topUpDailyCapUsd = null;
    }
"""
    insert_before(BRIDGE_IO, anchor, block, 'Product next-tier unlock normalization')
    rep(
        BRIDGE_IO,
        "      daysUntilSpendPathUnlocks:progressionDay(raw?.nextTier?.daysUntilSpendPathUnlocks),\n    };",
        "      daysUntilSpendPathUnlocks:progressionDay(raw?.nextTier?.daysUntilSpendPathUnlocks),\n      limits:unlockLimits,\n    };",
        'Product next-tier unlock output',
    )
    rep(
        BRIDGE_IO,
        """      nextTier.daysUntilSpendPathUnlocks = null;
    }
""",
        """      nextTier.daysUntilSpendPathUnlocks = null;
      nextTier.limits = {state:'source-unavailable',rpmMultiplier:null,dailyCapUsd:null,monthlyCapUsd:null,topUpDailyCapUsd:null};
    }
""",
        'Product invalid progression suppresses unlock limits',
    )


def patch_product_ui() -> None:
    helper = """  function gatewayNextTierUnlockLimitsHtml(nextTier) {
    const limits = nextTier?.limits;
    const stateName = ['value','max-tier','tier-overridden','not-applicable','source-unavailable','permission-unavailable','invalid-next-tier-limits'].includes(String(limits?.state))
      ? String(limits.state)
      : 'source-unavailable';
    if (['max-tier','tier-overridden','not-applicable'].includes(stateName)) {
      return '<div class="gateway-next-tier-limits"><p><b>다음 Tier 한도 · 현재 기준</b> · 미적용</p></div>';
    }
    if (stateName !== 'value') return '<div class="gateway-next-tier-limits"><p><b>다음 Tier 한도 · 현재 기준</b> · —</p></div>';
    const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Number(value) : null;
    const daily = number(limits?.dailyCapUsd);
    const monthly = number(limits?.monthlyCapUsd);
    const topup = number(limits?.topUpDailyCapUsd);
    const multiplier = number(limits?.rpmMultiplier);
    if (daily === null || monthly === null || topup === null || multiplier === null) {
      return '<div class="gateway-next-tier-limits"><p><b>다음 Tier 한도 · 현재 기준</b> · —</p></div>';
    }
    return `<div class="gateway-next-tier-limits"><p><b>다음 Tier 한도 · 현재 기준</b></p><div class="minis">
      <div class="mini"><span>일간 spend</span><b>${esc(money(daily))}/일</b></div>
      <div class="mini"><span>월간 spend</span><b>${esc(money(monthly))}/월</b></div>
      <div class="mini"><span>24h 충전</span><b>${esc(money(topup))}/24h</b></div>
      <div class="mini cyan"><span>Rate multiplier</span><b>${esc(multiplier)}×</b></div>
    </div></div>`;
  }

"""
    insert_before(DASH, '  function gatewayNextTierProgressionHtml(nextTier) {\n', helper, 'next-tier unlock UI helper')
    rep(DASH, "    if (stateName === 'max-tier') return '<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 최고 Tier</p></div>';", "    if (stateName === 'max-tier') return `<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 최고 Tier</p>${gatewayNextTierUnlockLimitsHtml(nextTier)}</div>`;", 'max-tier unlock placement')
    rep(DASH, "    if (stateName === 'tier-overridden') return '<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 고정 Tier · 자동 승급 미적용</p></div>';", "    if (stateName === 'tier-overridden') return `<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 고정 Tier · 자동 승급 미적용</p>${gatewayNextTierUnlockLimitsHtml(nextTier)}</div>`;", 'overridden unlock placement')
    rep(DASH, "    if (stateName === 'not-applicable') return '<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 미적용</p></div>';", "    if (stateName === 'not-applicable') return `<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · 미적용</p>${gatewayNextTierUnlockLimitsHtml(nextTier)}</div>`;", 'not-applicable unlock placement')
    rep(DASH, "    if (stateName !== 'value') return '<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · —</p></div>';", "    if (stateName !== 'value') return `<div class=\"gateway-next-tier\"><p><b>다음 Tier</b> · —</p>${gatewayNextTierUnlockLimitsHtml(nextTier)}</div>`;", 'unknown unlock placement')
    rep(
        DASH,
        """      <div class="mini"><span>사용 경로 연령</span><b>${esc(spendAgeText)}</b></div>
    </div></div>`;
""",
        """      <div class="mini"><span>사용 경로 연령</span><b>${esc(spendAgeText)}</b></div>
    </div>${gatewayNextTierUnlockLimitsHtml(nextTier)}</div>`;
""",
        'value unlock placement',
    )


def patch_diagnostics() -> None:
    helper = """  function gatewayNextTierLimitsDiagnosticText(value) {
    const sourceState = ['ok','permission-unavailable','source-unavailable'].includes(String(value?.state)) ? String(value.state) : 'source-unavailable';
    if (sourceState !== 'ok') return `Gateway next-tier limits: scope credits · source org-limits · state ${sourceState}`;
    const nextTier = value?.nextTier;
    const progressionState = ['value','max-tier','tier-overridden','not-applicable','unknown'].includes(String(nextTier?.state))
      ? String(nextTier.state)
      : 'unknown';
    if (progressionState !== 'value') {
      const stateName = ['max-tier','tier-overridden','not-applicable'].includes(progressionState) ? progressionState : 'source-unavailable';
      return `Gateway next-tier limits: scope credits · source org-limits · state ${stateName}`;
    }
    const limits = nextTier?.limits;
    const stateName = ['value','max-tier','tier-overridden','not-applicable','source-unavailable','permission-unavailable','invalid-next-tier-limits'].includes(String(limits?.state))
      ? String(limits.state)
      : 'source-unavailable';
    if (stateName !== 'value') return `Gateway next-tier limits: scope credits · source org-limits · state ${stateName}`;
    const number = (candidate) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? Number(candidate) : null;
    const next = Number.isInteger(nextTier?.tier) && nextTier.tier >= 0 ? Number(nextTier.tier) : null;
    const daily = number(limits?.dailyCapUsd);
    const monthly = number(limits?.monthlyCapUsd);
    const topup24h = number(limits?.topUpDailyCapUsd);
    const multiplier = number(limits?.rpmMultiplier);
    if (next === null || daily === null || monthly === null || topup24h === null || multiplier === null) {
      return 'Gateway next-tier limits: scope credits · source org-limits · state invalid-next-tier-limits';
    }
    return `Gateway next-tier limits: scope credits · next ${next} · daily ${daily} · monthly ${monthly} · topup24h ${topup24h} · multiplier ${multiplier} · source org-limits · state ok`;
  }

"""
    insert_before(DIAG, '  function gatewayEndpointRpmDiagnosticText(value) {\n', helper, 'next-tier unlock diagnostics helper')
    old_line = "      gatewayNextTierDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n"
    rep(DIAG, old_line, old_line + "      gatewayNextTierLimitsDiagnosticText(gatewayLimitsRuntime.orgId === String(d.creditsOrganizationId || state.selectedCreditsOrgId || '') ? gatewayLimitsRuntime.value : null),\n", 'next-tier unlock diagnostics line')


def patch(value: dict) -> None:
    patch_core(value)
    rep(ECORE, "const VERSION = '1.6.40';", "const VERSION = '1.6.41';", 'Engine version')
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
        raise SystemExit('5.107 target Product mismatch')
    bridge = manifest['components']['bridge']
    manager = manifest['components']['bridgeManager']
    if bridge.get('requiredVersion') != TARGET_ENGINE or bridge.get('sha256') != engine_sha:
        raise SystemExit('5.107 target Engine manifest mismatch')
    if manager.get('version') != MANAGER_VER or manager.get('productVersion') != TARGET_PRODUCT or manager.get('sha256') != manager_sha:
        raise SystemExit('5.107 target Manager manifest mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.107 target contracts changed')
    if engine_sha == BASE_ENGINE_SHA:
        raise SystemExit('5.107 target Engine bytes did not change')
    if sha(BOOT) != BOOT_SHA:
        raise SystemExit('5.107 target bootstrap changed')

    capture = CAPTURE.read_text()
    sanitizer = capture[capture.find("    if (Object.prototype.hasOwnProperty.call(raw, 'nextTier')) {"):capture.find("    if (Object.prototype.hasOwnProperty.call(raw, 'endpoints')) {")]
    for marker in ('rpmMultiplier','dailyCapUsd','monthlyCapUsd','topUpDailyCapUsd'):
        if marker not in sanitizer:
            raise SystemExit(f'5.107 nextTier sanitizer marker missing:{marker}')
    for forbidden in ('accountAgeDays','lifetimeSpendUsd','ageDaysRequired','spendUsdRequired'):
        if forbidden in sanitizer:
            raise SystemExit(f'5.107 nextTier minimization violation:{forbidden}')

    sources = SOURCES.read_text()
    helper = sources[sources.find('function gatewayLimitsNumber(value) {'):sources.find('async function captureGatewayLimitsViaCliSession')]
    for marker in ("nextTierLimitsUnknown('invalid-next-tier-limits')", 'nextTierLimitsFromRaw(nextTierRaw)', 'topUpDailyCapUsd', 'endpointRates'):
        if marker not in helper:
            raise SystemExit(f'5.107 nextTier normalizer marker missing:{marker}')
    for marker in ("cached(`gatewayLimits:${exactOrgId}`", "name.startsWith('gatewayLimits:') ? 300_000"):
        if marker not in sources:
            raise SystemExit(f'5.107 selected-org/cache marker missing:{marker}')

    http = HTTP.read_text()
    if "url.pathname === '/gateway-limits'" not in http or '/gateway-next-tier-limits' in http:
        raise SystemExit('5.107 local route boundary changed')

    latest = LATEST.read_text()
    for marker in (
        '//@version 3.0.0-alpha.5.107',
        "const REQUIRED_BRIDGE_VERSION = '1.6.41';",
        '다음 Tier 한도 · 현재 기준',
        'Gateway next-tier limits: scope credits',
        'Endpoint RPM · 조직 한도',
        'Gateway endpoint RPM: scope credits',
    ):
        if marker not in latest:
            raise SystemExit(f'5.107 latest.js marker missing:{marker}')
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
        raise SystemExit('5.107 Engine bump expected but bytes did not change')

    rep(MANAGER, "const PRODUCT_VERSION = '3.0.0-alpha.5.106';", "const PRODUCT_VERSION = '3.0.0-alpha.5.107';", 'Manager Product')
    rep(MANAGER, "const BUNDLED_ENGINE_VERSION = '1.6.40';", "const BUNDLED_ENGINE_VERSION = '1.6.41';", 'Manager Engine')
    rep(MANAGER, f"const BUNDLED_ENGINE_SHA256 = '{BASE_ENGINE_SHA}';", f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';", 'Manager Engine hash')

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
    manager['managedCliVersion'] = '1.10.0'
    manager['managedModelCatalogVersion'] = '1.280.0'
    manifest['contracts'] = {'snapshot': 1, 'recentRequest': 1}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

    run('python3', str(T / 'sync_project_guidelines.py'))
    target()
    print(f'MATERIALIZED:{TARGET_PRODUCT} · Engine {TARGET_ENGINE} {engine_sha} · Manager {MANAGER_VER} {manager_sha} · CLI 1.10.0 · Models 1.280.0 · contracts 1/1')


if __name__ == '__main__':
    main()
