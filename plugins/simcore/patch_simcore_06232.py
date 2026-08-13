from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.32 Stable Menu Label:\n// - UI/metadata only: changes //@display-name to a stable versionless "SimCore" label so future installs do not pin a stale version number in the PocketRisu sidebar\n// - Keeps //@name simcore unchanged for plugin identity/storage namespace\n// - Panel/runtime diagnostics still show the actual plugin version internally\n// - No runtime prompt, state, timing, storage, lore, snapshot, output, or semantic behavior change\n//\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.31' not in text:
        raise SystemExit(f'{path}: expected v0.62.31 base')
    if '//@display-name SimCore v0.62.31 Timestamp Canonicalization Guard' not in text:
        raise SystemExit(f'{path}: expected v0.62.31 display-name')

    text = text.replace('//@version 0.62.31', '//@version 0.62.32', 1)
    text = text.replace('//@display-name SimCore v0.62.31 Timestamp Canonicalization Guard', '//@display-name SimCore', 1)

    marker = '// v0.62.31 Timestamp Canonicalization Guard:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog insertion marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    if 'SimCore v0.62.31 <button' not in text:
        raise SystemExit(f'{path}: panel title marker missing')
    text = text.replace('SimCore v0.62.31 <button', 'SimCore v0.62.32 <button', 1)
    text = text.replace('[simcore/v0.62.31]', '[simcore/v0.62.32]')

    path.write_text(text, encoding='utf-8')
