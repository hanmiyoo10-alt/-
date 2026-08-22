from pathlib import Path

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'


def read(path):
    return path.read_text()


def write(path, text):
    path.write_text(text)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# release_alpha544_patch.py first creates the 20-part layout. The bridge normalization
# tail is still >35 KiB, so split its stability/runtime snapshot responsibility once
# more without changing a single runtime byte.
bridge_path = SRC / '04-runtime-bridge-normalize.part.js'
bridge = read(bridge_path)
marker = '  function bridgeStabilitySnapshot() {'
if bridge.count(marker) != 1:
    raise SystemExit(f'bridge stability marker count={bridge.count(marker)}')
index = bridge.index(marker)
head, tail = bridge[:index], bridge[index:]
if not head or not tail or head + tail != bridge:
    raise SystemExit('bridge stability split is not byte-preserving')
write(bridge_path, head)
write(SRC / '06-runtime-stability.part.js', tail)

parts_path = SRC / 'parts.cjs'
parts = read(parts_path)
old = "  {file:'04-runtime-bridge-normalize.part.js', marker:'  function normalizeBridgeModule(name, row) {', label:'runtime/bridge normalization'},\n"
new = old + "  {file:'06-runtime-stability.part.js', marker:'  function bridgeStabilitySnapshot() {', label:'runtime/stability snapshots'},\n"
parts = replace_once(parts, old, new, 'parts runtime stability entry')
write(parts_path, parts)

# Tests that intentionally concatenate the runtime/core responsibility group should
# include the new stability fragment too. Update the generated module-layout regression
# to expect 21 parts and keep the 35 KiB guard active.
old_runtime_group = "['00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js']"
new_runtime_group = "['00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js']"
for path in TESTS.glob('*.cjs'):
    text = read(path)
    text = text.replace(old_runtime_group, new_runtime_group)
    if path.name == 'p5-module-layout.cjs':
        text = replace_once(
            text,
            "  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js',\n",
            "  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js',\n",
            'module layout runtime files',
        )
        text = replace_once(
            text,
            "/^(?:00|02|04|10|12|14|16|50|52|54|70|72|74|76)-/",
            "/^(?:00|02|04|06|10|12|14|16|50|52|54|70|72|74|76)-/",
            'module layout size guard group',
        )
    write(path, text)

print('refined Local Usage Dashboard 5.44 structural layout · 21 parts · runtime bytes unchanged')
