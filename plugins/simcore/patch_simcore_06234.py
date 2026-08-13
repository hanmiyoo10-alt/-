from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.34 UI Label Consolidation:\n// - Finishes the versionless SimCore UI cleanup by renaming the chat button from SimCore Lite to SimCore\n// - Removes the stale v0.62.29 version prefix from the panel footer while keeping the Short Community Lineage Anchor status text\n// - Keeps the panel header as the single human-facing place that shows the current runtime version\n// - UI-only: no runtime prompt, state, time, lineage, storage, snapshot, lore, or generation behavior change\n//\n'''

old_footer = 'v0.62.29 Short Community Lineage Anchor · FIRST/SAME SOURCE seeded short-C gets one current-lineage hint'
new_footer = 'Short Community Lineage Anchor · FIRST/SAME SOURCE seeded short-C gets one current-lineage hint'

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.33' not in text:
        raise SystemExit(f'{path}: expected v0.62.33 base')
    if "Risuai.registerButton({ name: 'SimCore Lite', icon: '⚙️', iconType: 'html', location: 'chat' }, openPanel)" not in text:
        raise SystemExit(f'{path}: SimCore Lite chat button not found')
    if old_footer not in text:
        raise SystemExit(f'{path}: stale footer not found')

    text = text.replace('//@version 0.62.33', '//@version 0.62.34', 1)
    marker = '// v0.62.33 Stable Settings Label:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    text = text.replace(
        "Risuai.registerButton({ name: 'SimCore Lite', icon: '⚙️', iconType: 'html', location: 'chat' }, openPanel)",
        "Risuai.registerButton({ name: 'SimCore', icon: '⚙️', iconType: 'html', location: 'chat' }, openPanel)",
        1,
    )
    text = text.replace(old_footer, new_footer, 1)
    text = text.replace('⚙️ SimCore v0.62.33 <button', '⚙️ SimCore v0.62.34 <button', 1)
    text = text.replace('[simcore/v0.62.33]', '[simcore/v0.62.34]')

    path.write_text(text, encoding='utf-8')
