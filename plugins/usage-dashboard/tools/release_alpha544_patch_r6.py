from pathlib import Path

ROOT = Path('plugins/usage-dashboard')
SRC = ROOT / 'src'

ORDER = [
    '00-runtime-core.part.js','02-runtime-state.part.js','04-runtime-bridge-normalize.part.js',
    '06-runtime-stability.part.js','08-runtime-product.part.js',
    '10-request-normalize.part.js','12-service-tier.part.js','14-request-ledger.part.js','16-usage-analytics.part.js',
    '20-bridge-io.part.js','30-refresh-runtime.part.js','40-diagnostics.part.js',
    '50-dashboard-context.part.js','52-analytics-context.part.js','54-dashboard-markup.part.js','60-settings-runtime.part.js',
    '70-widget-render.part.js','72-widget-layout.part.js','74-widget-gestures.part.js','76-widget-runtime.part.js',
    '80-lifecycle.part.js','90-bootstrap.part.js',
]


def read(path): return path.read_text()
def write(path, text): path.write_text(text)

parts_path = SRC / 'parts.cjs'
parts_source = read(parts_path)
combined_before = ''.join(read(SRC / name) for name in ORDER)
moves = []

for index in range(len(ORDER) - 1):
    left_name = ORDER[index]
    right_name = ORDER[index + 1]
    left_path = SRC / left_name
    right_path = SRC / right_name
    left = read(left_path)
    right = read(right_path)
    moved = 0

    # A source part should end with one newline at most. Any additional newline is
    # formatting that belongs to the boundary, not to the file's EOF. Move it to the
    # next part so staged git diff does not report a blank line at EOF.
    while left.endswith('\n\n'):
        left = left[:-1]
        right = '\n' + right
        moved += 1

    if moved:
        write(left_path, left)
        write(right_path, right)

        # Every PARTS entry occupies one line. Prefix the marker's JS string literal
        # with the same escaped newlines so build/split boundary validation remains
        # exact even though the next file now starts with boundary whitespace.
        lines = parts_source.splitlines(keepends=True)
        found = False
        for line_index, line in enumerate(lines):
            if f"file:'{right_name}'" not in line:
                continue
            if "marker:'" in line:
                lines[line_index] = line.replace("marker:'", "marker:'" + ("\\n" * moved), 1)
            elif 'marker:"' in line:
                lines[line_index] = line.replace('marker:"', 'marker:"' + ("\\n" * moved), 1)
            else:
                raise SystemExit(f'no marker literal for {right_name}')
            found = True
            break
        if not found:
            raise SystemExit(f'PARTS entry not found for {right_name}')
        parts_source = ''.join(lines)
        moves.append((left_name, right_name, moved))

write(parts_path, parts_source)
combined_after = ''.join(read(SRC / name) for name in ORDER)
if combined_after != combined_before:
    raise SystemExit('EOF normalization changed concatenated runtime bytes')

# Every part except the final bootstrap part must now be free of blank EOF lines.
for name in ORDER[:-1]:
    if read(SRC / name).endswith('\n\n'):
        raise SystemExit(f'blank EOF remains in {name}')

print(f'normalized 5.44 module EOF boundaries · {len(moves)} boundaries moved · concatenated bytes unchanged')
