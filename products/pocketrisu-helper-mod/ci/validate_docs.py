#!/usr/bin/env python3
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]; REPO=ROOT.parents[1]
required=[ROOT/'README.md',ROOT/'CURRENT.md',ROOT/'ROUTINE.md',ROOT/'PR-LIFECYCLE.md',ROOT/'ROADMAP.md',ROOT/'SECURITY-NOTES.md',ROOT/'product.json',ROOT/'docs/history.md',ROOT/'docs/decisions.md',ROOT/'docs/features/README.md',ROOT/'templates/UPSTREAM.md',ROOT/'templates/FAILURES.md',ROOT/'templates/PR-BODY.md']
errors=[]
for p in required:
    if not p.is_file(): errors.append(f'missing required file: {p.relative_to(REPO)}')
if (ROOT/'CURRENT.md').is_file() and '다음 한 단계' not in (ROOT/'CURRENT.md').read_text(encoding='utf-8',errors='replace'): errors.append("CURRENT.md must contain at least one '다음 한 단계' checkpoint")
if (ROOT/'ROUTINE.md').is_file():
    t=(ROOT/'ROUTINE.md').read_text(encoding='utf-8',errors='replace')
    for m in ['INSPECT_ONLY','Feature-ID','UPSTREAM.md','FAILURES.md','GREEN','DEPLOY_READY','safe-updater']:
        if m not in t: errors.append(f'ROUTINE.md missing required marker: {m}')
roots=[ROOT/'docs/features/main-phone',ROOT/'docs/features/server-phone',ROOT/'docs/features/shared']; seen=set(); count=0
for base in roots:
    if not base.is_dir(): errors.append(f'missing feature category: {base.relative_to(REPO)}'); continue
    for child in sorted(base.iterdir()):
        if not child.is_dir(): continue
        count+=1; fid=child.name
        if fid in seen: errors.append(f'duplicate Feature-ID: {fid}')
        seen.add(fid)
        for fn in ['README.md','UPSTREAM.md','FAILURES.md']:
            if not (child/fn).is_file(): errors.append(f'feature missing {fn}: {child.relative_to(REPO)}')
        up=child/'UPSTREAM.md'
        if up.is_file():
            t=up.read_text(encoding='utf-8',errors='replace'); expected=f'Feature-ID: `{fid}`'
            if expected not in t: errors.append(f'{up.relative_to(REPO)} must contain {expected}')
            for m in ['PR status:','Isolation status:','Deployment status:','Minimal upstream scope','Dependencies','Verification evidence','Upstream pitch']:
                if m not in t: errors.append(f'{up.relative_to(REPO)} missing marker: {m}')
        fl=child/'FAILURES.md'
        if fl.is_file():
            t=fl.read_text(encoding='utf-8',errors='replace'); expected=f'Feature-ID: `{fid}`'
            if expected not in t: errors.append(f'{fl.relative_to(REPO)} must contain {expected}')
            if 'PR_REVIEW' not in t or 'DEPLOY' not in t: errors.append(f'{fl.relative_to(REPO)} missing failure stage vocabulary')

# Real device deployment is fail-closed. The machine-readable gate may not
# disappear accidentally, and VERIFIED must remain explicit.
safe_updater=ROOT/'docs/features/server-phone/safe-updater/UPSTREAM.md'
if safe_updater.is_file():
    t=safe_updater.read_text(encoding='utf-8',errors='replace')
    if 'AUTO_DEPLOY_GATE:' not in t: errors.append('safe-updater UPSTREAM.md missing AUTO_DEPLOY_GATE')
    if 'AUTO_DEPLOY_VERIFIED:' not in t: errors.append('safe-updater UPSTREAM.md missing AUTO_DEPLOY_VERIFIED')
    if 'AUTO_DEPLOY_GATE: `ENABLED`' in t and 'AUTO_DEPLOY_VERIFIED: `YES`' not in t:
        errors.append('AUTO_DEPLOY_GATE cannot be ENABLED unless AUTO_DEPLOY_VERIFIED is YES')

forbidden=[re.compile(r'\.log$'),re.compile(r'\.pid$'),re.compile(r'\.bak(?:-|$)'),re.compile(r'\.(?:sqlite|sqlite3|db)(?:-|$)'),re.compile(r'snapshot.*\.json$',re.I),re.compile(r'(?:^|/)\.local_usage_bridge_token$')]
for p in ROOT.rglob('*'):
    if p.is_file() and any(x.search(p.relative_to(ROOT).as_posix()) for x in forbidden): errors.append(f'forbidden runtime/secret-like file: {p.relative_to(ROOT)}')
secret=[re.compile(r'BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY'),re.compile(r'\bgh[pousr]_[A-Za-z0-9_]{20,}\b'),re.compile(r'\bsk-[A-Za-z0-9_-]{20,}\b')]
for p in ROOT.rglob('*'):
    if p.is_file() and p.suffix.lower() in {'.md','.json','.py','.yml','.yaml','.txt'}:
        t=p.read_text(encoding='utf-8',errors='replace')
        if any(x.search(t) for x in secret): errors.append(f'possible secret material in {p.relative_to(REPO)}')
link_re=re.compile(r'\[[^\]]*\]\(([^)]+)\)')
for md in ROOT.rglob('*.md'):
    t=md.read_text(encoding='utf-8',errors='replace')
    for raw in link_re.findall(t):
        target=raw.strip()
        if not target or target.startswith(('#','http://','https://','mailto:')): continue
        target=target.split('#',1)[0]; resolved=(md.parent/target).resolve()
        try: resolved.relative_to(ROOT.resolve())
        except ValueError: errors.append(f'{md.relative_to(REPO)}: link escapes product root: {raw}'); continue
        if not resolved.exists(): errors.append(f'{md.relative_to(REPO)}: broken relative link: {raw}')
if errors:
    [print(f'ERROR: {e}') for e in errors]; sys.exit(1)
print(f'PocketRisu helper docs OK: {count} feature modules + PR lifecycle + failure ledgers + deploy gate')
