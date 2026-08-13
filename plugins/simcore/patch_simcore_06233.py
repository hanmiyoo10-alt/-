from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.33 Stable Settings Label:\n// - Fixes the PocketRisu settings-sidebar label that was still hardcoded as SimCore v0.62.20\n// - Keeps //@name simcore and //@display-name SimCore unchanged; only the registerSetting label becomes versionless SimCore\n// - UI/metadata only: no runtime prompt, state, time, lineage, storage, or generation behavior change\n//\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.32' not in text:
        raise SystemExit(f'{path}: expected v0.62.32 base')
    if "Risuai.registerSetting('SimCore v0.62.20', openPanel, '⚙️', 'html')" not in text:
        raise SystemExit(f'{path}: old settings label not found')

    text = text.replace('//@version 0.62.32', '//@version 0.62.33', 1)
    marker = '// v0.62.31 Timestamp Canonicalization Guard:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    text = text.replace(
        "Risuai.registerSetting('SimCore v0.62.20', openPanel, '⚙️', 'html')",
        "Risuai.registerSetting('SimCore', openPanel, '⚙️', 'html')",
        1,
    )

    text = text.replace('⚙️ SimCore v0.62.32 <button', '⚙️ SimCore v0.62.33 <button', 1)
    text = text.replace('[simcore/v0.62.32]', '[simcore/v0.62.33]')

    path.write_text(text, encoding='utf-8')
