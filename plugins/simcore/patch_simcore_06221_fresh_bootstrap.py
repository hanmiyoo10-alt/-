from pathlib import Path

for name in ('latest.js', 'install.js'):
    p = Path('plugins/simcore') / name
    s = p.read_text(encoding='utf-8')
    old = '    templateRecurrenceVersion: recurrence.TEMPLATE_RECURRENCE_VERSION,\n    templateRegistry: [],'
    new = '    templateRecurrenceVersion: 0,\n    templateRegistry: [],'
    if s.count(old) != 1:
        raise SystemExit(f'{name}: expected one fresh recurrence-version anchor, found {s.count(old)}')
    s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')
