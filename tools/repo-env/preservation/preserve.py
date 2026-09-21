#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import pathlib
import re
import stat
import sys
import tempfile

SPEC_SCHEMA = "repo-preservation-spec.v1"
SNAPSHOT_SCHEMA = "repo-preservation-snapshot.v1"
DIFF_SCHEMA = "repo-preservation-diff.v1"

MAX_SPEC_BYTES = 64 * 1024
MAX_SNAPSHOT_BYTES = 256 * 1024
MAX_ENTRIES = 64
MAX_FILES = 4096
MAX_TOTAL_BYTES = 512 * 1024 * 1024

LABEL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
KINDS = {"file_sha256", "tree_sha256", "exists_type"}


class Blocked(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def blocked(code: str) -> None:
    raise Blocked(code)


def executable_class(mode: int) -> bool:
    return bool(mode & 0o111)


def bounded_regular_bytes(path: pathlib.Path, limit: int, code: str) -> bytes:
    try:
        info = path.lstat()
    except OSError:
        blocked(code)
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode):
        blocked(code)
    if info.st_size > limit:
        blocked(code)
    try:
        data = path.read_bytes()
    except OSError:
        blocked(code)
    if len(data) > limit:
        blocked(code)
    return data


def load_json_file(path: pathlib.Path, limit: int, read_code: str, json_code: str):
    raw = bounded_regular_bytes(path, limit, read_code)
    try:
        return json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        blocked(json_code)


def validate_label(label) -> str:
    if not isinstance(label, str) or not LABEL_RE.fullmatch(label):
        blocked("INVALID_LABEL")
    return label


def validate_spec(data) -> list[dict[str, str]]:
    if not isinstance(data, dict) or set(data) != {"schema", "entries"}:
        blocked("INVALID_SPEC")
    if data["schema"] != SPEC_SCHEMA or not isinstance(data["entries"], list):
        blocked("INVALID_SPEC")
    if not 1 <= len(data["entries"]) <= MAX_ENTRIES:
        blocked("SPEC_ENTRY_LIMIT")
    seen = set()
    entries = []
    for item in data["entries"]:
        if not isinstance(item, dict) or set(item) != {"label", "kind", "path"}:
            blocked("INVALID_SPEC_ENTRY")
        label = validate_label(item["label"])
        kind = item["kind"]
        path = item["path"]
        if label in seen:
            blocked("DUPLICATE_LABEL")
        if kind not in KINDS or not isinstance(path, str):
            blocked("INVALID_SPEC_ENTRY")
        seen.add(label)
        entries.append({"label": label, "kind": kind, "path": path})
    return sorted(entries, key=lambda entry: entry["label"])


def parse_relative_path(raw: str) -> tuple[str, ...]:
    if not raw or "\x00" in raw or "\\" in raw:
        blocked("INVALID_PATH")
    posix = pathlib.PurePosixPath(raw)
    windows = pathlib.PureWindowsPath(raw)
    if posix.is_absolute() or windows.is_absolute() or windows.drive:
        blocked("INVALID_PATH")
    if raw != posix.as_posix():
        blocked("INVALID_PATH")
    if any(part == ".." for part in posix.parts):
        blocked("INVALID_PATH")
    return tuple(part for part in posix.parts if part != ".")


def inspect_declared_path(root: pathlib.Path, raw: str):
    try:
        root_info = root.lstat()
    except OSError:
        blocked("INVALID_ROOT")
    if stat.S_ISLNK(root_info.st_mode) or not stat.S_ISDIR(root_info.st_mode):
        blocked("INVALID_ROOT")
    current = root
    parts = parse_relative_path(raw)
    if not parts:
        return root, root_info
    for index, part in enumerate(parts):
        current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            return current, None
        except OSError:
            blocked("PATH_READ_FAILED")
        if stat.S_ISLNK(info.st_mode):
            blocked("SYMLINK_BLOCKED")
        if index < len(parts) - 1 and not stat.S_ISDIR(info.st_mode):
            blocked("INVALID_PATH_COMPONENT")
    return current, info


def hash_regular_file(path: pathlib.Path, tracker: dict[str, int]):
    try:
        before = path.lstat()
    except OSError:
        blocked("FILE_READ_FAILED")
    if stat.S_ISLNK(before.st_mode) or not stat.S_ISREG(before.st_mode):
        blocked("UNSUPPORTED_FILE_TYPE")
    if tracker["files"] + 1 > MAX_FILES:
        blocked("FILE_COUNT_LIMIT")
    if tracker["bytes"] + before.st_size > MAX_TOTAL_BYTES:
        blocked("BYTE_LIMIT")
    flags = os.O_RDONLY | getattr(os, "O_BINARY", 0) | getattr(os, "O_NOFOLLOW", 0)
    try:
        fd = os.open(path, flags)
    except OSError:
        blocked("FILE_READ_FAILED")
    digest = hashlib.sha256()
    actual = 0
    try:
        with os.fdopen(fd, "rb") as handle:
            opened = os.fstat(handle.fileno())
            if not stat.S_ISREG(opened.st_mode):
                blocked("UNSUPPORTED_FILE_TYPE")
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                actual += len(chunk)
                if tracker["bytes"] + actual > MAX_TOTAL_BYTES:
                    blocked("BYTE_LIMIT")
                digest.update(chunk)
    except OSError:
        blocked("FILE_READ_FAILED")
    try:
        after = path.lstat()
    except OSError:
        blocked("FILE_CHANGED_DURING_CAPTURE")
    before_identity = (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_mode)
    opened_identity = (opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns, opened.st_mode)
    after_identity = (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_mode)
    if before_identity != opened_identity or opened_identity != after_identity or actual != opened.st_size:
        blocked("FILE_CHANGED_DURING_CAPTURE")
    tracker["files"] += 1
    tracker["bytes"] += actual
    return digest.hexdigest(), actual, executable_class(opened.st_mode)


def digest_record(digest, record: str) -> None:
    encoded = record.encode("utf-8", "surrogateescape")
    digest.update(len(encoded).to_bytes(8, "big"))
    digest.update(encoded)


def hash_tree(root: pathlib.Path, tracker: dict[str, int]) -> dict[str, object]:
    digest = hashlib.sha256()
    dirs = 1
    nodes = 0
    tree_files = 0
    tree_bytes = 0
    digest_record(digest, "D\0.")

    def walk(directory: pathlib.Path, prefix: str) -> None:
        nonlocal dirs, nodes, tree_files, tree_bytes
        try:
            with os.scandir(directory) as scan:
                items = sorted(list(scan), key=lambda item: item.name)
        except OSError:
            blocked("TREE_READ_FAILED")
        for item in items:
            nodes += 1
            if nodes > MAX_FILES * 2:
                blocked("TREE_NODE_LIMIT")
            rel = item.name if not prefix else f"{prefix}/{item.name}"
            try:
                info = item.stat(follow_symlinks=False)
            except OSError:
                blocked("TREE_READ_FAILED")
            if stat.S_ISLNK(info.st_mode):
                blocked("SYMLINK_BLOCKED")
            path = directory / item.name
            if stat.S_ISDIR(info.st_mode):
                dirs += 1
                if dirs > MAX_FILES:
                    blocked("TREE_NODE_LIMIT")
                digest_record(digest, f"D\0{rel}")
                walk(path, rel)
                continue
            if not stat.S_ISREG(info.st_mode):
                blocked("UNSUPPORTED_FILE_TYPE")
            file_sha, size, executable = hash_regular_file(path, tracker)
            tree_files += 1
            tree_bytes += size
            digest_record(digest, f"F\0{rel}\0{size}\0{int(executable)}\0{file_sha}")

    walk(root, "")
    return {
        "state": "directory",
        "sha256": digest.hexdigest(),
        "files": tree_files,
        "dirs": dirs,
        "bytes": tree_bytes,
    }


def capture_entry(root: pathlib.Path, item: dict[str, str], tracker: dict[str, int]):
    path, info = inspect_declared_path(root, item["path"])
    label = item["label"]
    kind = item["kind"]
    if kind == "exists_type":
        if info is None:
            state = "missing"
        elif stat.S_ISREG(info.st_mode):
            state = "file"
        elif stat.S_ISDIR(info.st_mode):
            state = "directory"
        else:
            blocked("UNSUPPORTED_FILE_TYPE")
        return {"label": label, "kind": kind, "state": state}
    if info is None:
        blocked("TARGET_MISSING")
    if kind == "file_sha256":
        file_sha, size, executable = hash_regular_file(path, tracker)
        return {
            "label": label,
            "kind": kind,
            "state": "file",
            "sha256": file_sha,
            "size": size,
            "executable": executable,
        }
    if not stat.S_ISDIR(info.st_mode):
        blocked("TARGET_TYPE_MISMATCH")
    tree = hash_tree(path, tracker)
    return {"label": label, "kind": kind, **tree}


def serialize_json(data) -> bytes:
    return (json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("utf-8")


def safe_write(path: pathlib.Path, payload: bytes) -> None:
    if len(payload) > MAX_SNAPSHOT_BYTES:
        blocked("SNAPSHOT_SIZE_LIMIT")
    temp_name = None
    try:
        parent = path.parent
        parent_info = parent.lstat()
        if stat.S_ISLNK(parent_info.st_mode) or not stat.S_ISDIR(parent_info.st_mode):
            blocked("OUTPUT_PARENT_INVALID")
        if path.exists() or path.is_symlink():
            info = path.lstat()
            if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
                blocked("OUTPUT_INVALID")
        with tempfile.NamedTemporaryFile("wb", dir=parent, prefix=".preserve.", delete=False) as handle:
            temp_name = pathlib.Path(handle.name)
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
        temp_name = None
    except Blocked:
        raise
    except OSError:
        blocked("OUTPUT_WRITE_FAILED")
    finally:
        if temp_name is not None:
            try:
                temp_name.unlink(missing_ok=True)
            except OSError:
                pass


def capture(root: pathlib.Path, spec_path: pathlib.Path, output: pathlib.Path) -> None:
    spec = load_json_file(spec_path, MAX_SPEC_BYTES, "SPEC_READ_FAILED", "INVALID_SPEC_JSON")
    entries = validate_spec(spec)
    tracker = {"files": 0, "bytes": 0}
    captured = [capture_entry(root, item, tracker) for item in entries]
    snapshot = {"schema": SNAPSHOT_SCHEMA, "entries": captured}
    safe_write(output, serialize_json(snapshot))
    print(f"result=CAPTURED entries={len(captured)}")


def valid_nonnegative_int(value) -> bool:
    return type(value) is int and value >= 0


def validate_snapshot_entry(entry) -> dict:
    if not isinstance(entry, dict):
        blocked("INVALID_SNAPSHOT_ENTRY")
    label = validate_label(entry.get("label"))
    kind = entry.get("kind")
    if kind == "exists_type":
        if set(entry) != {"label", "kind", "state"}:
            blocked("INVALID_SNAPSHOT_ENTRY")
        if entry["state"] not in {"missing", "file", "directory"}:
            blocked("INVALID_SNAPSHOT_ENTRY")
    elif kind == "file_sha256":
        expected = {"label", "kind", "state", "sha256", "size", "executable"}
        if set(entry) != expected or entry.get("state") != "file":
            blocked("INVALID_SNAPSHOT_ENTRY")
        if not isinstance(entry.get("sha256"), str) or not SHA256_RE.fullmatch(entry["sha256"]):
            blocked("INVALID_SNAPSHOT_ENTRY")
        if not valid_nonnegative_int(entry.get("size")) or type(entry.get("executable")) is not bool:
            blocked("INVALID_SNAPSHOT_ENTRY")
    elif kind == "tree_sha256":
        expected = {"label", "kind", "state", "sha256", "files", "dirs", "bytes"}
        if set(entry) != expected or entry.get("state") != "directory":
            blocked("INVALID_SNAPSHOT_ENTRY")
        if not isinstance(entry.get("sha256"), str) or not SHA256_RE.fullmatch(entry["sha256"]):
            blocked("INVALID_SNAPSHOT_ENTRY")
        if not all(valid_nonnegative_int(entry.get(key)) for key in ("files", "dirs", "bytes")):
            blocked("INVALID_SNAPSHOT_ENTRY")
        if entry["dirs"] < 1:
            blocked("INVALID_SNAPSHOT_ENTRY")
    else:
        blocked("INVALID_SNAPSHOT_ENTRY")
    return dict(entry)


def validate_snapshot(data) -> list[dict]:
    if not isinstance(data, dict) or set(data) != {"schema", "entries"}:
        blocked("INVALID_SNAPSHOT")
    if data["schema"] != SNAPSHOT_SCHEMA or not isinstance(data["entries"], list):
        blocked("INVALID_SNAPSHOT")
    if not 1 <= len(data["entries"]) <= MAX_ENTRIES:
        blocked("SNAPSHOT_ENTRY_LIMIT")
    entries = [validate_snapshot_entry(entry) for entry in data["entries"]]
    labels = [entry["label"] for entry in entries]
    if labels != sorted(labels) or len(labels) != len(set(labels)):
        blocked("INVALID_SNAPSHOT_ORDER")
    return entries


def load_snapshot(path: pathlib.Path) -> list[dict]:
    data = load_json_file(path, MAX_SNAPSHOT_BYTES, "SNAPSHOT_READ_FAILED", "INVALID_SNAPSHOT_JSON")
    return validate_snapshot(data)


def compare(before_path: pathlib.Path, after_path: pathlib.Path) -> int:
    before_entries = {entry["label"]: entry for entry in load_snapshot(before_path)}
    after_entries = {entry["label"]: entry for entry in load_snapshot(after_path)}
    rows = []
    changed = False
    for label in sorted(before_entries.keys() | after_entries.keys()):
        before = before_entries.get(label)
        after = after_entries.get(label)
        if before is None:
            status = "added"
        elif after is None:
            status = "missing"
        elif before == after:
            status = "same"
        else:
            status = "changed"
        changed = changed or status != "same"
        rows.append({"label": label, "status": status})
    result = "CHANGED" if changed else "SAME"
    payload = {"schema": DIFF_SCHEMA, "result": result, "entries": rows}
    encoded = serialize_json(payload)
    if len(encoded) > MAX_SNAPSHOT_BYTES:
        blocked("DIFF_SIZE_LIMIT")
    sys.stdout.buffer.write(encoded)
    return 1 if changed else 0


def parser() -> argparse.ArgumentParser:
    argp = argparse.ArgumentParser(description="Bounded preservation snapshot + diff")
    sub = argp.add_subparsers(dest="command", required=True)
    capture_p = sub.add_parser("capture")
    capture_p.add_argument("--root", required=True)
    capture_p.add_argument("--spec", required=True)
    capture_p.add_argument("--output", required=True)
    compare_p = sub.add_parser("compare")
    compare_p.add_argument("--before", required=True)
    compare_p.add_argument("--after", required=True)
    return argp


def main(argv=None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "capture":
            capture(pathlib.Path(args.root), pathlib.Path(args.spec), pathlib.Path(args.output))
            return 0
        return compare(pathlib.Path(args.before), pathlib.Path(args.after))
    except Blocked as exc:
        if args.command == "compare":
            payload = {"schema": DIFF_SCHEMA, "result": "BLOCKED", "error": exc.code}
            sys.stdout.buffer.write(serialize_json(payload))
        else:
            print(f"result=BLOCKED error={exc.code}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
