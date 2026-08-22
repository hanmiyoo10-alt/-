from pathlib import Path

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'
TESTS = ROOT / 'tests'


def read(path): return path.read_text()
def write(path, text): path.write_text(text)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

stability_path = SRC / '06-runtime-stability.part.js'
stability = read(stability_path)
marker = '  function bridgeRuntimeSnapshot() {'
if stability.count(marker) != 1:
    raise SystemExit(f'bridge runtime snapshot marker count={stability.count(marker)}')
idx = stability.index(marker)
head, tail = stability[:idx], stability[idx:]
if not head or not tail or head + tail != stability:
    raise SystemExit('runtime snapshot split is not byte-preserving')
write(stability_path, head)
write(SRC / '08-runtime-product.part.js', tail)

parts_path = SRC / 'parts.cjs'
parts = read(parts_path)
old = "  {file:'06-runtime-stability.part.js', marker:'  function bridgeStabilitySnapshot() {', label:'runtime/stability snapshots'},\n"
new = old + "  {file:'08-runtime-product.part.js', marker:'  function bridgeRuntimeSnapshot() {', label:'runtime/product snapshots'},\n"
parts = replace_once(parts, old, new, 'parts runtime product entry')
write(parts_path, parts)

old_group = "['00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js']"
new_group = "['00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js','08-runtime-product.part.js']"
for path in TESTS.glob('*.cjs'):
    text = read(path).replace(old_group, new_group)
    if path.name == 'p5-module-layout.cjs':
        text = replace_once(
            text,
            "  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js',\n",
            "  '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js','06-runtime-stability.part.js','08-runtime-product.part.js',\n",
            'module layout runtime product file',
        )
        text = replace_once(
            text,
            "/^(?:00|02|04|06|10|12|14|16|50|52|54|70|72|74|76)-/",
            "/^(?:00|02|04|06|08|10|12|14|16|50|52|54|70|72|74|76)-/",
            'module layout size guard product group',
        )
    write(path, text)

print('finished Local Usage Dashboard 5.44 structural layout · 22 parts · runtime bytes unchanged')
