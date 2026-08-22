from pathlib import Path

TESTS = Path('plugins/usage-dashboard/tests')


def read(path): return path.read_text()
def write(path, text): path.write_text(text)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

path = TESTS / 'p5-bridge-control-sync.cjs'
text = read(path)
text = replace_once(
    text,
    "assert.ok(ui.startsWith('  function settingsHtml() {'), 'settings UI modular boundary drifted');",
    "assert.ok(ui.trimStart().startsWith('function settingsHtml() {'), 'settings UI modular boundary drifted');",
    'settings UI whitespace-tolerant boundary test',
)
text = replace_once(
    text,
    "assert.ok(runtime.startsWith('  function renderSettings() {'), 'settings runtime modular boundary drifted');",
    "assert.ok(runtime.trimStart().startsWith('function renderSettings() {'), 'settings runtime modular boundary drifted');",
    'settings runtime whitespace-tolerant boundary test',
)
write(path, text)

print('updated 5.44 source-boundary regression to ignore boundary-only whitespace')
