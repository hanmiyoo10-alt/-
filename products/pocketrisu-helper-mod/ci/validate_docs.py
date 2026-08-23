#!/usr/bin/env python3
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]

required = [
    ROOT / "README.md",
    ROOT / "CURRENT.md",
    ROOT / "ROUTINE.md",
    ROOT / "ROADMAP.md",
    ROOT / "SECURITY-NOTES.md",
    ROOT / "product.json",
    ROOT / "docs" / "history.md",
    ROOT / "docs" / "decisions.md",
    ROOT / "docs" / "features" / "README.md",
]
errors = []

for path in required:
    if not path.is_file():
        errors.append(f"missing required file: {path.relative_to(REPO)}")

# CURRENT is the handoff checkpoint. It must always leave a concrete next step
# somewhere so a new chat/session can resume without reconstructing intent.
current_path = ROOT / "CURRENT.md"
if current_path.is_file():
    current_text = current_path.read_text(encoding="utf-8", errors="replace")
    if "다음 한 단계" not in current_text:
        errors.append("CURRENT.md must contain at least one '다음 한 단계' checkpoint")

# ROUTINE is the operating contract for starting and closing work.
routine_path = ROOT / "ROUTINE.md"
if routine_path.is_file():
    routine_text = routine_path.read_text(encoding="utf-8", errors="replace")
    for marker in [
        "INSPECT_ONLY",
        "CURRENT.md",
        "ROADMAP.md",
        "기능 문서",
        "검증",
    ]:
        if marker not in routine_text:
            errors.append(f"ROUTINE.md missing required routine marker: {marker}")

feature_roots = [
    ROOT / "docs" / "features" / "main-phone",
    ROOT / "docs" / "features" / "server-phone",
    ROOT / "docs" / "features" / "shared",
]
feature_count = 0
for base in feature_roots:
    if not base.is_dir():
        errors.append(f"missing feature category: {base.relative_to(REPO)}")
        continue
    for child in sorted(base.iterdir()):
        if child.is_dir():
            feature_count += 1
            if not (child / "README.md").is_file():
                errors.append(f"feature missing README.md: {child.relative_to(REPO)}")

forbidden = [
    re.compile(r"\.log$"), re.compile(r"\.pid$"), re.compile(r"\.bak(?:-|$)"),
    re.compile(r"\.(?:sqlite|sqlite3|db)(?:-|$)"), re.compile(r"snapshot.*\.json$", re.I),
    re.compile(r"(?:^|/)\.local_usage_bridge_token$")
]
for path in ROOT.rglob("*"):
    if not path.is_file():
        continue
    rel = path.relative_to(ROOT).as_posix()
    if any(p.search(rel) for p in forbidden):
        errors.append(f"forbidden runtime/secret-like file: {rel}")

secret_patterns = [
    re.compile(r"BEGIN (?:OPENSSH|RSA|EC|DSA) PRIVATE KEY"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
]
for path in ROOT.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".md", ".json", ".py", ".yml", ".yaml", ".txt"}:
        text = path.read_text(encoding="utf-8", errors="replace")
        if any(p.search(text) for p in secret_patterns):
            errors.append(f"possible secret material in {path.relative_to(REPO)}")

link_re = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
for md in ROOT.rglob("*.md"):
    text = md.read_text(encoding="utf-8", errors="replace")
    for raw in link_re.findall(text):
        target = raw.strip()
        if not target or target.startswith(("#", "http://", "https://", "mailto:")):
            continue
        target = target.split("#", 1)[0]
        resolved = (md.parent / target).resolve()
        try:
            resolved.relative_to(ROOT.resolve())
        except ValueError:
            errors.append(f"{md.relative_to(REPO)}: link escapes product root: {raw}")
            continue
        if not resolved.exists():
            errors.append(f"{md.relative_to(REPO)}: broken relative link: {raw}")

if errors:
    for err in errors:
        print(f"ERROR: {err}")
    sys.exit(1)

print(f"PocketRisu helper docs OK: {feature_count} feature modules + routine checkpoint")
