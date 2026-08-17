from pathlib import Path

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'


def read(path): return path.read_text()
def write(path, text): path.write_text(text)

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

left_path = SRC / '00-runtime-core.part.js'
right_path = SRC / '02-runtime-state.part.js'
parts_path = SRC / 'parts.cjs'
left = read(left_path)
right = read(right_path)
parts = read(parts_path)
combined_before = left + right

# The byte-preserving split originally left an intentional blank line at the EOF of
# the first part. git diff --check rejects that as a blank line at EOF. Move exactly
# one newline across the file boundary and include it in the next part's declared
# marker. Concatenation remains byte-for-byte identical.
if not left.endswith('\n\n'):
    raise SystemExit('00-runtime-core no longer has the expected double-newline boundary')
if not right.startswith('  function hydrateState(saved) {'):
    raise SystemExit('02-runtime-state boundary marker drifted')
left = left[:-1]
right = '\n' + right
if left + right != combined_before:
    raise SystemExit('boundary move changed concatenated runtime bytes')
write(left_path, left)
write(right_path, right)

old = "  {file:'02-runtime-state.part.js', marker:'  function hydrateState(saved) {', label:'runtime/state + helpers'},\n"
new = "  {file:'02-runtime-state.part.js', marker:'\\n  function hydrateState(saved) {', label:'runtime/state + helpers'},\n"
parts = replace_once(parts, old, new, 'runtime state marker with boundary newline')
write(parts_path, parts)

print('cleaned 5.44 module EOF boundary · concatenated runtime bytes unchanged')
