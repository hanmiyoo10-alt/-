from pathlib import Path

TESTS = Path('plugins/usage-dashboard/tests')


def read(path): return path.read_text()
def write(path, text): path.write_text(text)
def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# Foundation used to deliberately reject every non-alpha build. RC/stable are now
# valid 3.0 product stages, while beta remains supported for the existing pipeline.
foundation_path = TESTS / 'foundation.cjs'
foundation = read(foundation_path)
foundation = replace_once(
    foundation,
    "assert.match(source, /^\\/\\/@version 3\\.0\\.0-alpha\\./m);\nassert.match(source, /const VERSION = '3\\.0\\.0-alpha\\.[^']+';/);",
    "assert.match(source, /^\\/\\/@version 3\\.0\\.0(?:-alpha\\.[^\\s]+|-beta\\.[^\\s]+|-rc\\.\\d+)?$/m);\nassert.match(source, /const VERSION = '3\\.0\\.0(?:-alpha\\.[^']+|-beta\\.[^']+|-rc\\.\\d+)?';/);",
    'foundation RC version acceptance',
)
write(foundation_path, foundation)

# P1 is the long-lived contract gate and must understand the RC stage too.
p1_path = TESTS / 'p1-contract.cjs'
p1 = read(p1_path)
p1 = replace_once(
    p1,
    "assert.match(source, /^\\/\\/@version (?:3\\.0\\.0-alpha\\.\\d+\\.\\d+|3\\.0\\.0-beta\\.\\d+|3\\.0\\.0)$/m);",
    "assert.match(source, /^\\/\\/@version (?:3\\.0\\.0-alpha\\.\\d+\\.\\d+|3\\.0\\.0-beta\\.\\d+|3\\.0\\.0-rc\\.\\d+|3\\.0\\.0)$/m);",
    'P1 RC version acceptance',
)
write(p1_path, p1)

# Feature regressions that were introduced during alpha must continue to run in RC
# and stable. Teach all common historical version gates that RC is newer than alpha.
generic_version_assert = "assert.match(source, /^\\/\\/@version 3\\.0\\.0(?:-alpha\\.[^\\s]+|-beta\\.[^\\s]+|-rc\\.\\d+)?$/m);"
for path in TESTS.glob('*.cjs'):
    text = read(path)
    text = text.replace(
        "assert.ok(source.includes('//@version 3.0.0-alpha.5.44'));",
        generic_version_assert,
    )
    text = text.replace(
        "|| version === '3.0.0';",
        "|| /^3\\.0\\.0-rc\\./.test(version) || version === '3.0.0';",
    )
    text = text.replace(
        ": /^(3\\.0\\.0-beta\\.|3\\.0\\.0$)/.test(version);",
        ": /^(3\\.0\\.0-beta\\.|3\\.0\\.0-rc\\.|3\\.0\\.0$)/.test(version);",
    )
    write(path, text)

# P3 UI uses an inline assert rather than the common `enabled` form.
p3_ui_path = TESTS / 'p3-ui.cjs'
p3_ui = read(p3_ui_path)
p3_ui = replace_once(
    p3_ui,
    "assert.ok(alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 3)) : /^(3\\.0\\.0-beta\\.|3\\.0\\.0$)/.test(version), `P3 UI requires alpha.4.3+; got ${version}`);",
    "assert.ok(alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= 3)) : /^(3\\.0\\.0-beta\\.|3\\.0\\.0-rc\\.|3\\.0\\.0$)/.test(version), `P3 UI requires alpha.4.3+/RC/stable; got ${version}`);",
    'P3 UI RC version gate',
)
p3_ui = p3_ui.replace(
    '<summary><b>Runtime Diagnostics</b><span>성능 · 진단</span></summary>',
    '<summary><b>Runtime Diagnostics</b><span>요약 · 전체 진단</span></summary>',
)
write(p3_ui_path, p3_ui)

# Unified runtime first shipped before the bundled-engine architecture. RC/stable
# inherit the current managed-bundled contract instead of falling through to the
# historical managed-adoption expectation.
unified_path = TESTS / 'p5-unified-runtime.cjs'
unified = read(unified_path)
unified = replace_once(
    unified,
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version)) assert.equal(manifest.components.bridge.state, 'managed-bundled');",
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0') assert.equal(manifest.components.bridge.state, 'managed-bundled');",
    'unified runtime bundled state for RC',
)
unified = replace_once(
    unified,
    "if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version)) {\n  assert.ok(String(manifest.components.bridge.artifact || '').endsWith('/runtime/bridge-engine.mjs'));\n  assert.equal(manifest.components.bridge.sourceBundled, true);\n} else assert.equal(manifest.components.bridge.artifact, null);",
    "if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0') {\n  assert.ok(String(manifest.components.bridge.artifact || '').endsWith('/runtime/bridge-engine.mjs'));\n  assert.equal(manifest.components.bridge.sourceBundled, true);\n} else assert.equal(manifest.components.bridge.artifact, null);",
    'unified runtime bundled artifact for RC',
)
write(unified_path, unified)

# Two newer guards encode a minimum alpha build numerically instead of the common
# enabled expression. Preserve the minimum-alpha rule while treating RC/stable as newer.
lifecycle_path = TESTS / 'p5-lifecycle-race.cjs'
lifecycle = read(lifecycle_path)
lifecycle = replace_once(
    lifecycle,
    "const alpha539Plus = version.match(/^3\\.0\\.0-alpha\\.5\\.(\\d+)$/);\nassert.ok(alpha539Plus && Number(alpha539Plus[1]) >= 39, `lifecycle race guard requires alpha.5.39+, got ${version}`);",
    "const alpha539Plus = version.match(/^3\\.0\\.0-alpha\\.5\\.(\\d+)$/);\nconst lifecycleVersionOk = Boolean(alpha539Plus && Number(alpha539Plus[1]) >= 39) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0';\nassert.ok(lifecycleVersionOk, `lifecycle race guard requires alpha.5.39+/RC/stable, got ${version}`);",
    'lifecycle RC version guard',
)
write(lifecycle_path, lifecycle)

control_path = TESTS / 'p5-bridge-control-sync.cjs'
control = read(control_path)
control = replace_once(
    control,
    "const alpha540Plus = version.match(/^3\\.0\\.0-alpha\\.5\\.(\\d+)$/);\nassert.ok(alpha540Plus && Number(alpha540Plus[1]) >= 40, `bridge control sync requires alpha.5.40+, got ${version}`);",
    "const alpha540Plus = version.match(/^3\\.0\\.0-alpha\\.5\\.(\\d+)$/);\nconst bridgeControlVersionOk = Boolean(alpha540Plus && Number(alpha540Plus[1]) >= 40) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0';\nassert.ok(bridgeControlVersionOk, `bridge control sync requires alpha.5.40+/RC/stable, got ${version}`);",
    'bridge control RC version guard',
)
write(control_path, control)

bundled_path = TESTS / 'p5-bundled-engine.cjs'
bundled = read(bundled_path)
bundled = replace_once(
    bundled,
    "if (!/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version)) { console.log(`usage-dashboard P5 bundled engine regression: skipped · ${version}`); process.exit(0); }",
    "if (!( /^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0' )) { console.log(`usage-dashboard P5 bundled engine regression: skipped · ${version}`); process.exit(0); }",
    'bundled engine RC version guard',
)
write(bundled_path, bundled)

print('updated Usage Dashboard regression suite for RC/stable version stages')
