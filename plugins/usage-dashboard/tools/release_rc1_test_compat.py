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

# Feature regressions that were introduced during alpha must continue to run in RC
# and stable. Replace only the exact historical version assertion where present.
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
    write(path, text)

# Two older guards encode a minimum alpha build numerically instead of an enabled
# expression. Preserve the minimum-alpha rule while treating RC/stable as newer.
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
