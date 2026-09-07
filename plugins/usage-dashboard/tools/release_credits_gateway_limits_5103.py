#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
IMPL = ROOT / 'plugins' / 'usage-dashboard' / 'tests' / 'fixtures' / 'release_credits_gateway_limits_5103_impl.py'
MARKUP = ROOT / 'plugins' / 'usage-dashboard' / 'src' / '54-dashboard-markup.part.js'
EXPECTED_IMPL_BLOB = '2aae183a3f47ded8ff4217b1878dc867d27ae1d3'

# P69 keeps these as a bounded source-intent compatibility contract. The adapter
# verifies every marker against the immutable implementation blob before execution.
LEGACY_CONTRACT_MARKERS = (
    "BASE_PRODUCT = '3.0.0-alpha.5.102'",
    "TARGET_PRODUCT = '3.0.0-alpha.5.103'",
    "BASE_ENGINE = '1.6.37'",
    "TARGET_ENGINE = '1.6.38'",
    "BASE_RELEASE_SHA = 'd0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77'",
    "BASE_ENGINE_SHA = 'ec0af46fe89005c1fcafd95bd18468bb223906745a2b836cd9514dcbfa3e093c'",
    "BASE_MANAGER_SHA = 'a000d9915206b60b18adad6db4ce99f25c9dda283f62818ff25c96844e81f057'",
    'DEVPASS_BRIDGE_LIMITS_ORG_ID',
    'function normalizeGatewayLimitsCapture(capture, now = Date.now())',
    "cached(`gatewayLimits:${exactOrgId}`",
    "name.startsWith('gatewayLimits:') ? 300_000",
    "url.pathname === '/gateway-limits'",
    'GATEWAY_LIMITS_UI_TTL_MS = 5 * 60_000',
    'Gateway Limits · Credits',
    '일간 spend · UTC',
    'Gateway limits: scope credits',
    'MATERIALIZER_IDEMPOTENT:',
)


def git_blob_sha(path: Path) -> str:
    raw = path.read_bytes()
    return hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest()


def load_impl() -> dict:
    if git_blob_sha(IMPL) != EXPECTED_IMPL_BLOB:
        raise SystemExit('5.103 immutable materializer implementation blob mismatch')
    text = IMPL.read_text()
    for marker in LEGACY_CONTRACT_MARKERS:
        if marker not in text:
            raise SystemExit(f'5.103 immutable materializer contract marker missing:{marker}')

    namespace = {
        '__name__': 'usage_dashboard_5103_immutable_impl',
        '__file__': str(Path(__file__).resolve()),
    }
    exec(compile(text, str(Path(__file__).resolve()), 'exec'), namespace)
    legacy_rep = namespace['rep']
    legacy_insert_before = namespace['insert_before']

    def owner_aware_rep(path: Path, old: str, new: str, label: str) -> None:
        if label == 'Gateway Limits Credits section placement':
            path = MARKUP
        legacy_rep(path, old, new, label)

    def owner_aware_insert_before(path: Path, anchor: str, block: str, label: str) -> None:
        if label != 'Gateway Limits Credits UI helper':
            legacy_insert_before(path, anchor, block, label)
            return
        text_value = path.read_text()
        if block.strip() in text_value:
            return
        boundary = "\n  function settingsHtml() {\n"
        count = text_value.count(boundary)
        if count != 1:
            raise SystemExit(f'5.103 {label} boundary mismatch:{count}')
        # Current modular source requires 50-dashboard-context to start with
        # settingsHtml(). Keep that exact boundary and nest the helper inside it.
        path.write_text(text_value.replace(boundary, boundary + block, 1))

    namespace['rep'] = owner_aware_rep
    namespace['insert_before'] = owner_aware_insert_before
    return namespace


def main() -> None:
    namespace = load_impl()
    namespace['main']()


if __name__ == '__main__':
    main()
