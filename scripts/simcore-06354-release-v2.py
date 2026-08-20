import subprocess

source = subprocess.check_output(
    ['git', 'show', 'origin/main:scripts/simcore-06354-release.py'],
    text=True,
)
old = """    old_prior = r'''      : ((priorMatch === 'CANONICAL' || priorMatch === 'FRESH_CONFIRMED_SUFFIX')
        ? 'EXACT' '''
    new_prior = r'''      : ((['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(priorMatch))
        ? 'EXACT' '''
"""
new = """    old_prior = \"      : ((priorMatch === 'CANONICAL' || priorMatch === 'FRESH_CONFIRMED_SUFFIX')\\n        ? 'EXACT'\\n        : (priorMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'OUTPUT_MISMATCH'));\"
    new_prior = \"      : ((['CANONICAL', 'FRESH_CONFIRMED_SUFFIX', 'BOUNDARY_CONFIRMED_SUFFIX', 'SAFE_BOUNDARY_CONFIRMED'].includes(priorMatch))\\n        ? 'EXACT'\\n        : (priorMatch === 'HOST_RAW' ? 'HOST_RAW_MATCH' : 'OUTPUT_MISMATCH'));\"
"""
if source.count(old) != 1:
    raise SystemExit(f'wrapper prior matcher: expected one source match, got {source.count(old)}')
source = source.replace(old, new, 1)
exec(compile(source, 'simcore-06354-release.py', 'exec'), {'__name__': '__main__'})
